# 核心请求与记忆修复（第一阶段）

已修复以下路径：

- `turn.js` 从已含当前用户和 `pending: true` 助手的会话快照中剔除本轮，再把当前输入提交一次；历史只发送可用消息。文本和有效的 `data:image/...;base64` 附件按标准多模态结构构造，拒绝超长或无效 data URL。
- `runTurn` 在记忆检索期间收到停止信号时仍调用一次 `onDone`。终态统一为 `{ status: 'completed' | 'stopped' | 'failed', ok, text, emotion, sensitive, userStop, error? }`；失败和停止保留已收到的文本，但不提交新的关系情绪。
- `deepseek.js` 的流式空闲超时会中断请求并取消 reader；所有终态只结算一次，晚到内容被忽略。消费者回调抛错不会阻止流清理。`testKey` 与 `fetchModels` 均支持 `signal` 取消。
- 提炼队列在入队时固定人格、会话、隐私类别和消息 ID，串行排空。清空人格记忆增加世代号，旧网络结果不再写回。失败任务保留，可显式重试，存储失败通过 `xingyu:memory-error` 事件通知。
- 事实、摘要、档案与出处采用一致的敏感过滤；旧摘要缺少敏感标记时保守隐藏。出处优先用 `sessionId` 和 `messageId` 定位，旧数字 `turn` 仅以短片段兼容，且首段也必须遵守字数预算。`null` 出处不再误指向第 0 条。
- 记忆检索可显式指定人格，异步语义检索期间切换人格也不会把关键词或最近使用时间写进另一个分区。

## 接口

- `runTurn({ session, content, attachments?, config, signal, onDelta, onReasoning, onUsage, onDone, onError, onPrompt })`：`onDone` 恰好一次，结果见上；`session.messages` 应含当前用户消息和待回复占位。
- `queueExtraction` 新增 `personalityId`, `sessionId`, `messageId`, `onStatus`, `onError`；原 `turn` 继续作旧数据兼容。`queueTurnExtraction` 同步透传这些字段。
- `getExtractionStatus(personalityId?)` 返回 `{ pending, running, failed }`；`retryFailedExtraction({ personalityId? })` 返回重试任务数；`subscribeExtractionStatus(listener)` 返回取消订阅函数。状态事件包含 `personalityId`, `sessionId`, `messageId`, `status`, 可选 `error`。
- `cancelPendingExtraction(personalityId?)` 默认只取消当前人格；`clearMemory` 和 `clearMemoryPartition` 都会使该人格在途任务失效。
- `retrieveMemories(userText, adultOn, limit?, history?, personalityId?)` 最后一个参数可固定人格分区。
- `rebuildMemoryFromMessages` 可接收 `personalityId` 与 `sessionId`，把重建出的记忆写入指定分区并保留稳定出处。
- 记忆写入失败派发 `window` 事件 `xingyu:memory-error`，`detail = { message, personalityId }`，并抛出错误。

## 验证

`node --experimental-vm-modules --test tests/core*.mjs`：9/9 通过。测试使用内存存储、模拟请求与 VM 模块替身，未读取浏览器数据，也未调用真实模型接口。`node --check` 对三个改动模块通过。

本次第一次运行 `npm run build` 时，`ChatPage.jsx` 已引用尚未落地的 `listConversations` 存储接口而失败；这是并行集成中的暂时状态，待 `storage.js` 接口完成后需重跑生产构建。
