import type { Scene, TeamColors } from '../game/types'

/* 俯视战术板：把定格局面的站位如实画出来。
   坐标与 3D 场景一致：x 0→100（我方进攻方向），y 0→68。
   为了看得清，只画进攻半场附近的区域，并按球的位置裁剪。 */

const W = 100
const H = 68

interface Props {
  scene: Scene
  us: TeamColors
  them: TeamColors
}

export function PitchBoard({ scene, us, them }: Props) {
  const attack = scene.ball.x > 50
  /* 视野窗口：以球为中心，往球门方向多留空间 */
  const goalX = attack ? 100 : 0
  const centerX = (scene.ball.x + goalX) / 2
  const viewW = 74
  const viewH = 52
  const minX = Math.max(-6, Math.min(106 - viewW, centerX - viewW / 2))
  const minY = Math.max(-8, Math.min(H + 8 - viewH, scene.ball.y - viewH / 2))

  const players = [...scene.players]
  const hasKeeper = players.some(
    (p) => p.role === 'GK' && p.team === (attack ? 'them' : 'us'),
  )

  return (
    <svg
      viewBox={`${minX} ${minY} ${viewW} ${viewH}`}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-label="定格局面"
    >
      <defs>
        <radialGradient id="boardGlow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#2e8f5f" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#0d2a1e" stopOpacity="0.95" />
        </radialGradient>
      </defs>
      <rect x={minX} y={minY} width={viewW} height={viewH} fill="url(#boardGlow)" />

      {/* 草皮条纹 */}
      {Array.from({ length: 16 }).map((_, i) => (
        <rect
          key={i}
          x={i * 7}
          y={-10}
          width={3.5}
          height={H + 20}
          fill="#ffffff"
          opacity={i % 2 === 0 ? 0.025 : 0}
        />
      ))}

      {/* 场地线 */}
      <g stroke="#dff6ea" strokeOpacity="0.45" strokeWidth="0.4" fill="none">
        <rect x={0} y={0} width={W} height={H} />
        <line x1={50} y1={0} x2={50} y2={H} />
        <circle cx={50} cy={H / 2} r={9} />
        {/* 两侧禁区 */}
        <rect x={0} y={H / 2 - 20} width={16} height={40} />
        <rect x={W - 16} y={H / 2 - 20} width={16} height={40} />
        <rect x={0} y={H / 2 - 9} width={6} height={18} />
        <rect x={W - 6} y={H / 2 - 9} width={6} height={18} />
      </g>

      {/* 球门 */}
      <g>
        <rect x={-1.6} y={H / 2 - 3.66} width={1.6} height={7.32} fill="#eaf7f0" fillOpacity="0.75" />
        <rect x={W} y={H / 2 - 3.66} width={1.6} height={7.32} fill="#eaf7f0" fillOpacity="0.75" />
      </g>

      {/* 门将 */}
      {!hasKeeper && (
        <g>
          <circle
            cx={scene.keeper.x}
            cy={scene.keeper.y}
            r={1.9}
            fill={attack ? them.keeper : us.keeper}
            stroke="#04120c"
            strokeWidth="0.4"
          />
          <text
            x={scene.keeper.x}
            y={scene.keeper.y + 0.7}
            textAnchor="middle"
            fontSize="1.6"
            fill="#04120c"
            fontWeight="700"
          >
            1
          </text>
        </g>
      )}

      {/* 门将站位提示：出击 / 重心偏移 —— 只画事实，不写概率 */}
      {scene.tags.includes('keeperRushed') && (
        <circle
          cx={scene.keeper.x}
          cy={scene.keeper.y}
          r={4.2}
          fill="none"
          stroke="#ffd76a"
          strokeWidth="0.35"
          strokeDasharray="1.2 1.2"
          opacity="0.8"
        />
      )}
      {scene.tags.includes('keeperLeansLeft') && (
        <path
          d={`M${scene.keeper.x - 4} ${scene.keeper.y} L${scene.keeper.x - 1} ${scene.keeper.y - 2} M${scene.keeper.x - 4} ${scene.keeper.y} L${scene.keeper.x - 1} ${scene.keeper.y + 2}`}
          stroke="#ffd76a"
          strokeWidth="0.4"
          fill="none"
          opacity="0.85"
        />
      )}
      {scene.tags.includes('keeperLeansRight') && (
        <path
          d={`M${scene.keeper.x + 4} ${scene.keeper.y} L${scene.keeper.x + 1} ${scene.keeper.y - 2} M${scene.keeper.x + 4} ${scene.keeper.y} L${scene.keeper.x + 1} ${scene.keeper.y + 2}`}
          stroke="#ffd76a"
          strokeWidth="0.4"
          fill="none"
          opacity="0.85"
        />
      )}

      {/* 球员 */}
      {players.map((p) => {
        const colors = p.team === 'us' ? us : them
        const fill = p.role === 'GK' ? colors.keeper : colors.shirt
        const isBallOwner = Math.abs(p.x - scene.ball.x) < 3 && Math.abs(p.y - scene.ball.y) < 3
        return (
          <g key={p.id}>
            {isBallOwner && (
              <circle cx={p.x} cy={p.y} r={3.1} fill="none" stroke="#ffd76a" strokeWidth="0.5" opacity="0.9" />
            )}
            <circle cx={p.x} cy={p.y} r={1.9} fill={fill} stroke="#04120c" strokeWidth="0.45" />
            <text
              x={p.x}
              y={p.y + 0.65}
              textAnchor="middle"
              fontSize="1.6"
              fill={p.team === 'us' ? '#062a1a' : '#f4f8f5'}
              fontWeight="700"
            >
              {p.number}
            </text>
          </g>
        )
      })}

      {/* 球 */}
      <g>
        <circle cx={scene.ball.x} cy={scene.ball.y} r={1.15} fill="#ffffff" stroke="#0a1a12" strokeWidth="0.35" />
        <circle cx={scene.ball.x} cy={scene.ball.y} r={2.6} fill="none" stroke="#ffd76a" strokeWidth="0.28" opacity="0.55" />
      </g>

      {/* 跑动箭头：队友跑位 */}
      {scene.players
        .filter((p) => p.team === 'us')
        .slice(0, 3)
        .map((p) => {
          const dx = attack ? 5 : -5
          return (
            <line
              key={`arrow-${p.id}`}
              x1={p.x}
              y1={p.y}
              x2={p.x + dx}
              y2={p.y + (p.y > H / 2 ? -3 : 3)}
              stroke="#9ef0c4"
              strokeWidth="0.35"
              strokeDasharray="1 1"
              opacity="0.5"
              markerEnd="url(#arrowHead)"
            />
          )
        })}
      <defs>
        <marker id="arrowHead" markerWidth="3" markerHeight="3" refX="1.5" refY="1.5" orient="auto">
          <path d="M0,0 L3,1.5 L0,3 Z" fill="#9ef0c4" opacity="0.6" />
        </marker>
      </defs>
    </svg>
  )
}
