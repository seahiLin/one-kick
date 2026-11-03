import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { MatchScreen } from '../components/MatchScreen'
import { CollectionScreen, TeamSelectScreen, TitleScreen } from '../components/Screens'
import { DraftScreen, EndScreen, PreviewScreen } from '../components/FlowScreens'
import { useGame } from '../game/useGame'

export const Route = createFileRoute('/game')({
  head: () => ({
    meta: [
      { title: '一脚封神 · One Kick' },
      { name: 'description', content: '足球 roguelike：比赛自动进行，你只在关键瞬间做一次选择。' },
      { name: 'theme-color', content: '#07110e' },
    ],
  }),
  component: GamePage,
})

function GamePage() {
  const game = useGame()
  /* 3D 场景只能在浏览器里跑 */
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div className="onekick grid min-h-screen place-items-center stadium-bg">
        <div className="text-center">
          <div className="onekick-display text-3xl text-emerald-50">
            一脚<span className="text-amber-300">封神</span>
          </div>
          <div className="mt-2 text-[10px] uppercase tracking-[0.4em] text-emerald-300/50">loading</div>
        </div>
      </div>
    )
  }

  return (
    <div className="onekick min-h-screen text-emerald-50">
      {game.screen === 'title' && <TitleScreen game={game} />}
      {game.screen === 'teamSelect' && <TeamSelectScreen game={game} />}
      {game.screen === 'collection' && <CollectionScreen game={game} />}
      {game.screen === 'preview' && <PreviewScreen game={game} />}
      {game.screen === 'draft' && <DraftScreen game={game} />}
      {game.screen === 'match' && <MatchScreen game={game} />}
      {game.screen === 'eliminated' && <EndScreen game={game} champion={false} />}
      {game.screen === 'champion' && <EndScreen game={game} champion />}
    </div>
  )
}
