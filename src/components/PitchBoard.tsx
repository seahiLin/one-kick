import type { Scene, TeamColors } from '../game/types'

/* 角标雷达图：只画进攻三分之一区域，作为 3D 画面的补充信息，
   绝不再整块盖住球场。坐标与 3D 场景一致：x 0→100，y 0→68。 */

const W = 100
const H = 68

interface Props {
  scene: Scene
  us: TeamColors
  them: TeamColors
}

export function PitchBoard({ scene, us, them }: Props) {
  const attack = scene.ball.x > 50
  /* 进攻时看 60→104 的球门区域，防守时看 −4→40 */
  const minX = attack ? 58 : -4
  const viewW = 46
  const minY = Math.max(-2, Math.min(H - viewW * 1.2 + 2, scene.ball.y - (viewW * 1.2) / 2))
  const viewH = viewW * 1.2

  const keeperTeam: 'us' | 'them' = attack ? 'them' : 'us'
  const keeperColor = keeperTeam === 'us' ? us.keeper : them.keeper
  const visible = scene.players.filter((p) => p.x > minX - 4 && p.x < minX + viewW + 4)

  return (
    <svg
      viewBox={`${minX} ${minY} ${viewW} ${viewH}`}
      className="h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-label="场上站位"
    >
      <rect x={minX} y={minY} width={viewW} height={viewH} fill="#0b2b1d" fillOpacity="0.9" />

      {/* 条纹草皮 */}
      {Array.from({ length: 9 }).map((_, i) => (
        <rect
          key={i}
          x={i * 6}
          y={-10}
          width={3}
          height={H + 20}
          fill="#ffffff"
          opacity={i % 2 === 0 ? 0.04 : 0}
        />
      ))}

      {/* 场地线 */}
      <g stroke="#9fe6bf" strokeOpacity="0.35" strokeWidth="0.35" fill="none">
        <line x1={50} y1={0} x2={50} y2={H} />
        <rect x={W - 16} y={H / 2 - 20} width={16} height={40} />
        <rect x={W - 6} y={H / 2 - 9} width={6} height={18} />
        <rect x={0} y={H / 2 - 20} width={16} height={40} />
        <rect x={0} y={H / 2 - 9} width={6} height={18} />
      </g>

      {/* 球门 */}
      <rect x={W} y={H / 2 - 3.66} width={1.8} height={7.32} fill="#eaf7f0" fillOpacity="0.8" />
      <rect x={-1.8} y={H / 2 - 3.66} width={1.8} height={7.32} fill="#eaf7f0" fillOpacity="0.8" />

      {/* 门将站位（出击时加一圈虚线圈） */}
      {scene.tags.includes('keeperRushed') && (
        <circle
          cx={scene.keeper.x}
          cy={scene.keeper.y}
          r={4}
          fill="none"
          stroke="#ffd76a"
          strokeWidth="0.3"
          strokeDasharray="1 1"
          opacity="0.9"
        />
      )}
      <circle cx={scene.keeper.x} cy={scene.keeper.y} r={1.7} fill={keeperColor} stroke="#04120c" strokeWidth="0.3" />

      {/* 球员 */}
      {visible.map((p) => {
        const c = p.team === 'us' ? us : them
        return (
          <circle
            key={p.id}
            cx={p.x}
            cy={p.y}
            r={p.role === 'GK' ? 1.6 : 1.5}
            fill={p.role === 'GK' ? c.keeper : c.shirt}
            stroke="#04120c"
            strokeWidth="0.3"
          />
        )
      })}

      {/* 球 */}
      <circle cx={scene.ball.x} cy={scene.ball.y} r={1.1} fill="#fff" stroke="#0a1a12" strokeWidth="0.25" />
      <circle cx={scene.ball.x} cy={scene.ball.y} r={2.6} fill="none" stroke="#ffd76a" strokeWidth="0.22" opacity="0.6" />
    </svg>
  )
}
