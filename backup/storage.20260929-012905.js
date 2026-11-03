import { STORAGE_KEYS } from './constants.js'
import { readSecure, writeSecure } from './crypto.js'
import { cancelPendingExtraction, loadMemory, sanitizeMemory, setMemoryScope } from './memory.js'

// 浏览器 localStorage 每个源大约 5MB；保留一点余量，超了就裁最旧的消息
const STORAGE_BUDGET = 4500000

function loadJSONFrom(store, key, fallback) {
  try {
    const raw = store.getItem(key)
    if (!raw) return fallback
    return { ...fallback, ...JSON.parse(raw) }
  } catch {
    return fallback
  }
}

export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or blocked */
  }
}

// 配置分级存储：
// - 勾选「记住密钥」→ localStorage（长期保存在本机浏览器）
// - 未勾选 → sessionStorage（同一标签页刷新仍在，关闭标签页即失效）
export function loadConfig(fallback) {
  const rememberedRaw = readSecure(STORAGE_KEYS.config)
  if (rememberedRaw) {
    try {
      const remembered = JSON.parse(rememberedRaw)
      if (remembered && typeof remembered.apiKey === 'string' && remembered.apiKey) return remembered
    } catch {
      /* 损坏的配置直接忽略 */
    }
  }
  const session = loadJSONFrom(sessionStorage, STORAGE_KEYS.configSession, null)
  if (session && typeof session.apiKey === 'string' && session.apiKey) return session
  return fallback
}

export function saveConfig(config) {
  const remember = Boolean(config?.rememberKey)
  try {
    if (remember) {
      writeSecure(STORAGE_KEYS.config, JSON.stringify(config))
      sessionStorage.removeItem(STORAGE_KEYS.configSession)
    } else {
      sessionStorage.setItem(STORAGE_KEYS.configSession, JSON.stringify(config))
      localStorage.removeItem(STORAGE_KEYS.config)
    }
  } catch {
    /* storage full or blocked */
  }
}

// 一键彻底清除：对话记录 + 长期记忆 + 密钥配置（含会话级与长期两级）
// 注意：不清 xingyu.uid —— 它只是随机匿名标识，留着才能保持缓存隔离/调度隔离的连续性
export function clearAllData() {
  // 先取消排队中的记忆提炼：否则清空之后定时器仍会把"已删除的对话"提炼成记忆写回来
  cancelPendingExtraction()
  try {
    localStorage.removeItem(STORAGE_KEYS.config)
    localStorage.removeItem(STORAGE_KEYS.session)
    localStorage.removeItem(STORAGE_KEYS.memory)
    localStorage.removeItem(STORAGE_KEYS.memoryMigrated)
    localStorage.removeItem(STORAGE_KEYS.crypto)
    sessionStorage.removeItem(STORAGE_KEYS.configSession)
    // 长期记忆按人格分区（xingyu.memory.v1::<人格id>），是动态 key，必须逐个清掉
    const prefix = `${STORAGE_KEYS.memory}::`
    const doomed = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(prefix)) doomed.push(k)
    }
    for (const k of doomed) localStorage.removeItem(k)
  } catch {
    /* ignore */
  }
}

// 用量统计的一致性校验：usage.turns 必须和存档里实际的对话轮数一致。
// 对不上说明它是被清空/换人格之前的残留值（早期版本清空时没重置），直接作废。
// 这是"一句话没说却显示 13 万 tokens"的根治点。
export function normalizeUsage(session) {
  const u = session?.usage
  if (!u || typeof u !== 'object') return null
  const msgs = Array.isArray(session.messages) ? session.messages : []
  let actual = 0
  for (const m of msgs) {
    if (m && m.role === 'assistant' && !m.pending && m.content) actual++
  }
  const claimed = Number(u.turns) || 0
  if (actual === 0 || claimed !== actual) return null
  return u
}

export function loadSession(fallback) {
  const raw = readSecure(STORAGE_KEYS.session)
  if (!raw) return fallback
  try {
    const session = { ...fallback, ...JSON.parse(raw) }
    // 存档里的人格决定记忆作用域：在读任何记忆之前就定好，避免读到上一个人格的分区
    setMemoryScope(session.personalityId)
    // 读进来就校验用量，别让残留值继续显示
    session.usage = normalizeUsage(session)
    return session
  } catch {
    return fallback
  }
}

// 预算内裁剪消息数组（至少留 1 条）；估算包含数组逗号/括号开销，尽量贴近真实序列化长度
export function fitMessagesToBudget(messages, overhead, budget) {
  if (!Array.isArray(messages) || messages.length === 0) return { messages, trimmed: 0 }
  const sizes = messages.map((m) => JSON.stringify(m).length)
  let total = overhead + sizes.reduce((a, b) => a + b, 0) + sizes.length + 2
  let trimmed = 0
  while (trimmed < messages.length - 1 && total > budget) {
    total -= sizes[trimmed] + 1
    trimmed++
  }
  if (trimmed === 0) return { messages, trimmed: 0 }
  return { messages: messages.slice(trimmed), trimmed }
}

// 会话预算裁剪：超出 4.5MB 时只保留最新消息，返回裁剪数量
export function trimSessionToBudget(session, budget = STORAGE_BUDGET) {
  if (!session || !Array.isArray(session.messages)) return { session, trimmed: 0 }
  const overhead = JSON.stringify({ ...session, messages: [] }).length
  const fit = fitMessagesToBudget(session.messages, overhead, budget)
  if (fit.trimmed === 0) return { session, trimmed: 0 }
  return { session: { ...session, messages: fit.messages }, trimmed: fit.trimmed }
}

// 安全保存：先预算裁剪，仍失败则硬裁剪到最近 20 条再试一次
export function saveSessionSafe(session) {
  const first = trimSessionToBudget(session)
  try {
    writeSecure(STORAGE_KEYS.session, JSON.stringify(first.session))
    return { saved: true, session: first.session, trimmed: first.trimmed }
  } catch {
    const hard = { ...first.session, messages: first.session.messages.slice(-20) }
    try {
      writeSecure(STORAGE_KEYS.session, JSON.stringify(hard))
      return {
        saved: true,
        session: hard,
        trimmed: first.session.messages.length - hard.messages.length
      }
    } catch {
      return { saved: false, session: first.session, trimmed: first.trimmed }
    }
  }
}

function clampNum(v, min, max, fallback) {
  const n = Number(v)
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback
}

function sanitizeEmotion(e) {
  const base = { aff: 20, sec: 30, aro: 10, dom: -5 }
  if (!e || typeof e !== 'object') return { ...base }
  const out = {}
  for (const k of ['aff', 'sec', 'aro', 'dom']) {
    out[k] = clampNum(e[k], -100, 100, base[k])
  }
  return out
}

function sanitizeMessages(msgs) {
  if (!Array.isArray(msgs)) return []
  return msgs
    .filter(
      (m) =>
        m &&
        typeof m === 'object' &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim() !== ''
    )
    .map((m) => ({
      id: typeof m.id === 'string' ? m.id : `m-${Math.random().toString(36).slice(2, 9)}`,
      role: m.role,
      content: m.content,
      local: Boolean(m.local),
      sensitive: Boolean(m.sensitive)
    }))
}

function sanitizeOverride(o) {
  if (!o || typeof o !== 'object') return null
  const out = {}
  const traits = o.traits && typeof o.traits === 'object' ? o.traits : null
  if (traits) {
    out.traits = {}
    for (const k of ['T', 'I', 'O', 'S', 'R']) {
      out.traits[k] = clampNum(traits[k], 0, 100, 50)
    }
  }
  const baseline = o.baseline && typeof o.baseline === 'object' ? o.baseline : null
  if (baseline) {
    out.baseline = {}
    for (const k of ['aff', 'sec', 'aro', 'dom']) {
      out.baseline[k] = clampNum(baseline[k], -100, 100, 0)
    }
  }
  return Object.keys(out).length > 0 ? out : null
}

export function buildBackup({ session, config, includeConfig }) {
  // 记忆按人格分区：导出前把作用域切到被导出会话的人格，否则会导错人的记忆
  if (session?.personalityId) setMemoryScope(session.personalityId)
  const payload = {
    app: 'xingyu',
    appName: '星语 StarVox',
    version: 2,
    exportedAt: new Date().toISOString(),
    session,
    memory: loadMemory()
  }
  if (includeConfig && config) payload.config = config
  return JSON.stringify(payload, null, 2)
}

export function parseBackup(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, reason: '文件不是有效的 JSON，可能已损坏' }
  }
  if (!data || typeof data !== 'object') {
    return { ok: false, reason: '备份文件格式不正确' }
  }
  if (!data.session || typeof data.session !== 'object') {
    return { ok: false, reason: '备份文件里没有会话数据' }
  }
  if (!Array.isArray(data.session.messages)) {
    return { ok: false, reason: '备份文件里没有聊天记录（messages 缺失）' }
  }

  const s = data.session
  const sanitized = {
    personalityId: typeof s.personalityId === 'string' ? s.personalityId : 'boy_next_door',
    adultOn: Boolean(s.adultOn),
    ageConfirmed: Boolean(s.ageConfirmed),
    // 旧备份没有这个字段：默认按"你演女生"处理，与产品默认一致
    userGender: s.userGender === 'male' ? 'male' : 'female',
    override: sanitizeOverride(s.override),
    emotion: sanitizeEmotion(s.emotion),
    messages: sanitizeMessages(s.messages),
    // 从备份恢复的会话不继承用量：那份统计跟被导入的对话未必对得上，宁可不显示
    usage: null
  }

  // Browser localStorage budgets are roughly 5MB per origin. If a restored
  // session would exceed a safe budget, drop the oldest messages instead of
  // silently failing to save, and report how many were trimmed.
  const overhead = JSON.stringify({ ...sanitized, messages: [] }).length
  const fit = fitMessagesToBudget(sanitized.messages, overhead, STORAGE_BUDGET)
  const trimmed = fit.trimmed
  sanitized.messages = fit.messages

  const config =
    data.config && typeof data.config === 'object' && typeof data.config.apiKey === 'string'
      ? data.config
      : null

  // 备份里的记忆属于被导入会话的那个人格：先把作用域切过去，
  // 这样调用方紧接着的 saveMemory() 会写进正确的分区，而不会写串
  setMemoryScope(sanitized.personalityId)
  const memory = data.memory ? sanitizeMemory(data.memory) : null

  return { ok: true, session: sanitized, config, trimmed, memory }
}
