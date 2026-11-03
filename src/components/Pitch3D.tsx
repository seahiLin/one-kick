import { useEffect, useRef } from 'react'
import { MatchRenderer } from '../game/render/renderer'
import type { MomentResult, Scene, TeamColors } from '../game/types'

interface Props {
  scene: Scene | null
  us: TeamColors
  them: TeamColors
  result: MomentResult | null
  /** 变化时强制刷新结果播放 */
  resultKey: number
  paused: boolean
  className?: string
}

export function Pitch3D({ scene, us, them, result, resultKey, paused, className = '' }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<MatchRenderer | null>(null)

  /* 初始化一次；颜色变化时重建 */
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const renderer = new MatchRenderer(host)
    rendererRef.current = renderer
    renderer.idlePlayers(us, them)

    const onResize = () => renderer.resize()
    window.addEventListener('resize', onResize)
    const ro = new ResizeObserver(() => renderer.resize())
    ro.observe(host)

    return () => {
      window.removeEventListener('resize', onResize)
      ro.disconnect()
      renderer.dispose()
      rendererRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [us.shirt, them.shirt])

  useEffect(() => {
    const renderer = rendererRef.current
    if (!renderer) return
    if (scene) {
      renderer.showScene(scene, us, them)
    } else {
      renderer.setWide()
      renderer.idlePlayers(us, them)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, us.shirt, them.shirt])

  useEffect(() => {
    const renderer = rendererRef.current
    if (!renderer || !result) return
    renderer.playResult(result)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultKey])

  useEffect(() => {
    rendererRef.current?.setPaused(paused)
  }, [paused])
  return <div ref={hostRef} className={`relative overflow-hidden ${className}`} />
}
