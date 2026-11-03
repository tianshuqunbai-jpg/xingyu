function hexToRgba(hex, alpha) {
  const h = String(hex || '#8b5cf6').replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) || 139
  const g = parseInt(h.slice(2, 4), 16) || 92
  const b = parseInt(h.slice(4, 6), 16) || 246
  return `rgba(${r},${g},${b},${alpha})`
}

// 单只眼睛。
// 两层动画叠在一起：
//   .va-eye-gaze  —— 眼神缓慢游移（像在注视，而不是画上去的贴纸）
//   .va-eye-blink —— 眨眼：把整只眼睛垂直压扁到 7%，配合轻微淡出。
//     只淡出不压扁会像"眼睛凭空消失"，压扁才有眼睑落下的感觉
function Eye({ cx, variant }) {
  const inner = (() => {
    switch (variant) {
    case 'happy':
      return (
        <path
          d={`M${cx - 13} ${92 + 7} Q ${cx} ${92 - 8} ${cx + 13} ${92 + 7}`}
          fill="none"
          stroke="#232a55"
          strokeWidth="4"
          strokeLinecap="round"
        />
      )
    case 'shy':
      return (
        <path
          d={`M${cx - 13} ${92 + 6} Q ${cx} ${92 - 6} ${cx + 13} ${92 + 6}`}
          fill="none"
          stroke="#232a55"
          strokeWidth="4"
          strokeLinecap="round"
        />
      )
    case 'sad':
      return (
        <g>
          <path
            d={`M${cx - 13} ${92} Q ${cx} ${92 + 10} ${cx + 13} ${92}`}
            fill="none"
            stroke="#232a55"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d={`M${cx - 13} ${81} Q ${cx - 6} ${78} ${cx + 2} ${80}`}
            fill="none"
            stroke="#232a55"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      )
    case 'flat':
      return (
        <path
          d={`M${cx - 12} ${92} L ${cx + 12} ${92}`}
          stroke="#232a55"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      )
    case 'angry':
      return (
        <g>
          <ellipse cx={cx} cy="92" rx="11" ry="13" fill="#f4f6ff" />
          <circle cx={cx} cy="92" r="6.5" fill="#1d2450" />
          <circle cx={cx + 2.5} cy="89" r="2.3" fill="#fff" />
          <path
            d={`M${cx - 14} 80 L ${cx + 3} 86`}
            stroke="#232a55"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>
      )
    case 'wide':
      return (
        <g>
          <ellipse cx={cx} cy="92" rx="15" ry="17" fill="#f4f6ff" />
          <circle cx={cx} cy="93" r="5" fill="#1d2450" />
          <circle cx={cx + 2} cy="90" r="2" fill="#fff" />
        </g>
      )
    case 'tear':
      return (
        <g>
          <ellipse cx={cx} cy="92" rx="12" ry="14" fill="#f4f6ff" />
          <circle cx={cx} cy="92" r="6" fill="#1d2450" />
          <circle cx={cx + 2.5} cy="89" r="2.2" fill="#fff" />
          <path
            d={`M${cx - 12} 102 q -4 7 0 9 q 4 -2 0 -9 Z`}
            fill="#9bd8ff"
          />
        </g>
      )
    case 'side':
      return (
        <g>
          <ellipse cx={cx} cy="92" rx="12" ry="14" fill="#f4f6ff" />
          <circle cx={cx + 4.5} cy="92" r="5.5" fill="#1d2450" />
          <circle cx={cx + 6} cy="89.5" r="2" fill="#fff" />
          <path
            d={`M${cx - 14} 90 Q ${cx} 82 ${cx + 14} 90 L ${cx + 14} 93 Q ${cx} 85 ${cx - 14} 93 Z`}
            fill="#171f4e"
          />
        </g>
      )
    case 'heart':
      return (
        <g>
          <ellipse cx={cx} cy="92" rx="13" ry="14" fill="#f4f6ff" />
          <path
            d={`M${cx - 6} 90 Q ${cx} 98 ${cx + 6} 90 Q ${cx} 83 ${cx - 6} 90 Z`}
            fill="#ff4d7d"
          />
          <circle cx={cx} cy="87.5" r="1.7" fill="#fff" />
        </g>
      )
    default:
      return (
        <g>
          <ellipse cx={cx} cy="92" rx="12" ry="14" fill="#f4f6ff" />
          <circle cx={cx} cy="92" r="6.2" fill="#1d2450" />
          <circle cx={cx + 2.5} cy="89" r="2.3" fill="#fff" />
          <path
            d={`M${cx - 10} 78 l 5 -4`}
            stroke="#171f4e"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.6"
          />
        </g>
      )
    }
  })()

  return (
    <g className="va-eye-gaze">
      <g
        className="va-eye-blink"
        // 每只眼用自己的中心当缩放原点，压扁时朝各自中心收，两只眼不会互相拉偏
        style={{ transformOrigin: `${cx}px 92px` }}
      >
        {inner}
      </g>
    </g>
  )
}

// 嘴。
// 外面这层 .va-mouth 让嘴角有极轻微的起伏（呼吸感），
// 静止不动的嘴会让整张脸立刻露出"这是个图标"的破绽
function Mouth({ variant }) {
  const inner = (() => {
    switch (variant) {
    case 'open':
      return (
        <g>
          <ellipse cx="100" cy="149" rx="9" ry="7" fill="#3d2b56" />
          <path d="M 91 149 Q 100 153 109 149" fill="none" stroke="#b98ac9" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )
    case 'grin':
      return (
        <g>
          <path
            d="M 84 143 Q 100 161 116 143 Q 100 150 84 143 Z"
            fill="#3d2b56"
          />
          <rect x="94" y="141" width="12" height="6" rx="2.5" fill="#fff" opacity="0.92" />
        </g>
      )
    case 'pout':
      return <ellipse cx="100" cy="147" rx="4.5" ry="5" fill="#1d2450" />
    case 'frown':
      return (
        <path
          d="M 85 151 Q 100 137 115 151"
          fill="none"
          stroke="#232a55"
          strokeWidth="4"
          strokeLinecap="round"
        />
      )
    case 'neutral':
      return (
        <path
          d="M 91 146 L 109 146"
          stroke="#232a55"
          strokeWidth="4"
          strokeLinecap="round"
        />
      )
    case 'grit':
      return (
        <g>
          <ellipse cx="100" cy="149" rx="8.5" ry="6.5" fill="#3d2b56" />
          <rect x="93.5" y="145.5" width="13" height="5" rx="2" fill="#fff" opacity="0.9" />
        </g>
      )
    case 'tremble':
      return (
        <path
          d="M 88 149 L 93 144 L 98 150 L 103 144 L 108 150 L 112 146"
          fill="none"
          stroke="#232a55"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )
    default:
      return (
        <path
          d="M 84 142 Q 100 158 116 142"
          fill="none"
          stroke="#232a55"
          strokeWidth="4"
          strokeLinecap="round"
        />
      )
    }
  })()

  return (
    <g className="va-mouth" style={{ transformOrigin: '100px 148px' }}>
      {inner}
    </g>
  )
}

export default function VirtualAvatar({
  expression = { eyes: 'normal', mouth: 'smile' },
  color = '#8b5cf6',
  spark = true,
  className = ''
}) {
  const { eyes, mouth } = expression
  const blush = ['happy', 'shy', 'heart'].includes(eyes)

  return (
    <div
      className={`va-wrap ${className}`}
      style={{ '--va-glow': hexToRgba(color, 0.45), '--va-spark-color': color }}
    >
      <div className="va-halo" />
      <div className="va-orb" />
      {spark && (
        <>
          <span className="va-spark" style={{ top: '15%', left: '21%' }} />
          <span className="va-spark" style={{ top: '23%', right: '15%', animationDelay: '1.1s' }} />
          <span className="va-spark" style={{ bottom: '19%', left: '29%', animationDelay: '2.1s' }} />
          <span className="va-spark" style={{ bottom: '27%', right: '26%', animationDelay: '0.6s' }} />
        </>
      )}
      <div className="va-face">
        {/*
          viewBox 必须罩住所有表情的全部五官，否则 SVG 会把它裁掉。
          五官的实际范围（11 种眼睛 × 8 种嘴全量测量）：x 48~152，y 74~156。
          之前写的是 "0 0 200 140"：高度只到 140，而咧嘴能到 156 ——
          下半张脸（嘴、腮红）直接被裁在框外，脸还因为左右各 48 单位空白显得很小。
          现在按内容取框并留 4 单位余量，比例与 width/height 一致，缩放为 1:1 不失真
        */}
        <svg width="172" height="141" viewBox="44 70 112 92" aria-hidden="true">
          <Eye cx={73} variant={eyes} />
          <Eye cx={127} variant={eyes} />
          {blush && (
            <g opacity="0.55">
              <ellipse cx="58" cy="123" rx="10" ry="5" fill="#ff7a96" />
              <ellipse cx="142" cy="123" rx="10" ry="5" fill="#ff7a96" />
            </g>
          )}
          <Mouth variant={mouth} />
        </svg>
      </div>
    </div>
  )
}
