import { useEffect, useMemo, useRef, useState } from 'react'
import { Pitch3D } from './Pitch3D'
import { PitchBoard } from './PitchBoard'
import { TraitChip } from './ui'
import {
  isMuted,
  playConceded,
  playGoal,
  playMiss,
  playTension,
  playTrait,
  playWhistle,
  playWorldie,
  setMuted,
  unlockAudio,
} from '../game/audio'
import { getOpponent } from '../game/opponents'
import { getTeam } from '../game/teams'
import { getTrait } from '../game/traits'
import { stageLabel } from '../game/run'
import type { GameApi } from '../game/useGame'
import type { MatchMoment, MatchState, MomentKind, MomentResult, Scene } from '../game/types'

const KIND_LABEL: Record<MomentKind, string> = {
  oneOnOne: '单刀',
  freeKick: '禁区前任意球',
  corner: '角球',
  counter: '防守反击',
  penalty: '点球',
}

export function MatchScreen({ game }: { game: GameApi }) {
  const run = game.run
  const match = run?.match ?? null
  const [resultKey, setResultKey] = useState(0)
  const [flash, setFlash] = useState<'goal' | 'bad' | 'stop' | null>(null)
  const lastResultRef = useRef<MomentResult | null>(null)

  const team = run ? getTeam(run.teamId) : null
  const opponent = match ? getOpponent(match.opponentId) : null

  const activeMoment: MatchMoment | null = useMemo(() => {
    if (!match) return null
    if (match.shootout?.active) {
      const so = match.shootout
      return {
        minute: 120,
        kind: 'penalty',
        attacker: so.turn,
        scene: so.active.scene,
        options: so.active.options,
        result: null,
      }
    }
    if (match.activeIndex === null) return null
    return match.moments[match.activeIndex] ?? null
  }, [match])

  /* 结果动画期间画面必须定在刚才那一帧，所以只在空闲时更新展示场景 */
  const busy = game.busy
  const [shownScene, setShownScene] = useState<Scene | null>(null)
  useEffect(() => {
    if (!activeMoment || busy) return
    setShownScene(activeMoment.scene)
  }, [activeMoment, busy])
  const displayScene = shownScene
  /* 结果还在播的时候，下一个瞬间先不上屏 */
  const currentMoment = busy ? null : activeMoment

  useEffect(() => {
    const r = game.lastResult
    if (!r || r === lastResultRef.current) return
    lastResultRef.current = r
    setResultKey((k) => k + 1)
    setFlash(
      r.scoredBy === 'us'
        ? 'goal'
        : r.scoredBy === 'them'
          ? 'bad'
          : r.outcome === 'defended' || r.outcome === 'card'
            ? 'stop'
            : 'bad',
    )
    if (r.scoredBy === 'us') {
      if (r.worldie) playWorldie()
      else playGoal()
    } else if (r.scoredBy === 'them') {
      playConceded()
    } else if (r.outcome === 'post' || r.outcome === 'saved') {
      playMiss()
    } else if (r.outcome === 'card') {
      playWhistle()
    }
    if (r.traitsFired.length > 0) window.setTimeout(playTrait, 260)
    const t = window.setTimeout(() => setFlash(null), 1100)
    return () => window.clearTimeout(t)
  }, [game.lastResult])

  /* 关键瞬间出现时的心跳 */
  const activeKey = activeMoment ? `${activeMoment.minute}-${activeMoment.kind}` : null
  const tensionRef = useRef<string | null>(null)
  useEffect(() => {
    if (!activeKey || tensionRef.current === activeKey) return
    tensionRef.current = activeKey
    playTension()
  }, [activeKey])

  const [muted, setMutedState] = useState(isMuted())

  if (!run || !match || !team || !opponent) return null

  const shootout = match.shootout
  const minute = shootout ? 120 : match.clock
  const attacking = currentMoment?.attacker === 'us'
  const defensive = currentMoment?.attacker === 'them'
  const revealOptions = Boolean(currentMoment)

  const handlePick = (optionId: string) => {
    if (busy) return
    unlockAudio()
    game.choose(optionId)
  }

  return (
    <div className="relative flex min-h-screen flex-col stadium-bg">
      {/* 顶部记分牌 */}
      <header className="relative z-20 flex items-center gap-2 px-3 pt-3 sm:px-5">
        <div className="glass flex flex-1 items-center gap-2 rounded-xl px-3 py-2">
          <div className="min-w-0 flex-1">
            <div className="text-[9px] uppercase tracking-[0.2em] text-emerald-200/45">
              {stageLabel(run.stageIndex)} · {run.difficulty > 0 ? `难度 ${run.difficulty}` : '常规'}
            </div>
            <div className="truncate text-xs font-semibold text-emerald-50/90">
              {team.name} <span className="text-emerald-200/40">vs</span> {opponent.name}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="onekick-display text-2xl text-emerald-50 tabular-nums">{match.score.us}</span>
            <span className="text-emerald-200/40">:</span>
            <span className="onekick-display text-2xl text-rose-200 tabular-nums">{match.score.them}</span>
          </div>
          <div className="ml-1 rounded-lg bg-black/40 px-2 py-1 text-center">
            <div className="onekick-display text-sm text-amber-200 tabular-nums">
              {shootout ? 'PK' : `${minute}'`}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !muted
              setMuted(next)
              setMutedState(next)
              if (!next) unlockAudio()
            }}
            className="rounded-lg border border-emerald-200/20 bg-black/40 px-2 py-1 text-xs text-emerald-100/70 hover:border-emerald-200/50"
            aria-label={muted ? '开启音效' : '关闭音效'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </header>

      {/* 时间轴 */}
      <Timeline match={match} />

      {/* 3D 场景 + 定格信息 */}
      <div className="relative flex-1 px-3 pt-2 sm:px-5">
        <div className="relative h-[38vh] min-h-[200px] overflow-hidden rounded-2xl border border-emerald-200/15 shadow-2xl sm:h-[42vh]">
          <Pitch3D
            scene={displayScene}
            us={team.colors}
            them={opponent.colors}
            result={game.lastResult}
            resultKey={resultKey}
            paused={false}
            className="absolute inset-0"
          />
          {currentMoment && (
            <PitchBoard scene={currentMoment.scene} us={team.colors} them={opponent.colors} />
          )}

          {/* 定格时压暗 + 心跳 */}
          {currentMoment && (
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(2,8,6,0.78)_100%)]" />
          )}

          {/* 关键瞬间标题 */}
          {currentMoment && (
            <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center gap-1 p-3 ok-pop">
              <span className="rounded-full bg-rose-500/90 px-3 py-1 text-[10px] font-black tracking-[0.24em] text-white shadow-lg">
                关 键 瞬 间
              </span>
              <span className="onekick-display text-base text-amber-200 drop-shadow-lg sm:text-lg">
                {shootout
                  ? `点球大战 · ${shootout.turn === 'us' ? '我方主罚' : '我方扑救'}`
                  : `${KIND_LABEL[currentMoment.kind]} · ${attacking ? '我方进攻' : '我方防守'}`}
              </span>
            </div>
          )}

          {/* 结果横幅 */}
          {flash && game.lastResult && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div
                className={`ok-pop rounded-2xl px-6 py-3 text-center backdrop-blur-sm ${
                  flash === 'goal'
                    ? 'bg-amber-300/95 text-amber-950'
                    : flash === 'stop'
                      ? 'bg-emerald-300/95 text-emerald-950'
                      : 'bg-rose-900/85 text-rose-50'
                }`}
              >
                <div className="onekick-display text-2xl sm:text-3xl">{game.lastResult.headline}</div>
                <div className="mt-0.5 text-[11px] font-semibold opacity-80">{game.lastResult.line}</div>
              </div>
            </div>
          )}

          {/* 进球全屏闪光 */}
          {flash === 'goal' && (
            <div className="pointer-events-none absolute inset-0 ok-flash bg-[radial-gradient(circle,rgba(255,215,106,0.55),transparent_70%)]" />
          )}

          {/* 特性触发提示 */}
          {game.lastResult && game.lastResult.traitsFired.length > 0 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap justify-center gap-1 p-2">
              {game.lastResult.traitsFired.map((id) => (
                <TraitChip key={id} id={id} />
              ))}
            </div>
          )}

          {/* 终场 */}
          {match.finished && !currentMoment && (
            <div className="absolute inset-0 grid place-items-center bg-black/55 backdrop-blur-[2px]">
              <div className="ok-pop text-center">
                <div className="text-[10px] uppercase tracking-[0.4em] text-emerald-200/60">
                  Full Time
                </div>
                <div className="onekick-display mt-1 text-4xl text-emerald-50 tabular-nums">
                  {match.score.us} : {match.score.them}
                </div>
                {match.shootout && (
                  <div className="mt-1 text-xs text-amber-200">
                    点球 {match.shootout.ourGoals} : {match.shootout.theirGoals}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 等待中的呼吸提示 */}
          {currentMoment && (
            <div className="pointer-events-none absolute bottom-2 right-3 text-[10px] font-semibold tracking-widest text-amber-200/70">
              看准局势 →
            </div>
          )}
        </div>
      </div>

      {/* 选项区 */}
      <div className="relative z-20 px-3 pb-4 pt-3 sm:px-5">
        {revealOptions && currentMoment ? (
          <div className="ok-rise">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/45">
                {shootout
                  ? `点球大战 ${shootout.ourGoals} : ${shootout.theirGoals}`
                  : defensive
                    ? '对手压上来了 · 你只有一次机会'
                    : '你的这一脚'}
              </span>
              <span className="text-[10px] text-emerald-200/35">
                {currentMoment.options.length === 1 ? '一击制胜' : `${currentMoment.options.length} 个选择`}
              </span>
            </div>
            <div
              className={`grid gap-2 ${currentMoment.options.length > 2 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2'}`}
            >
              {currentMoment.options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={busy}
                  onClick={() => handlePick(opt.id)}
                  className={[
                    'onekick group relative overflow-hidden rounded-xl border px-4 py-3.5 text-left transition active:scale-[0.98] disabled:opacity-50',
                    defensive
                      ? 'border-rose-300/30 bg-rose-950/40 hover:border-rose-200/70 hover:bg-rose-900/50'
                      : 'border-amber-200/30 bg-amber-950/25 hover:border-amber-200/70 hover:bg-amber-900/35',
                  ].join(' ')}
                >
                  <span className="onekick-display block text-sm text-amber-50">{opt.label}</span>
                  {opt.worldie && (
                    <span className="mt-1 inline-block rounded bg-fuchsia-500/25 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-fuchsia-200">
                      世界波
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200/10 bg-black/30 px-3 py-2.5">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-200/45">
                比赛快进中
              </div>
              <div className="truncate text-xs text-emerald-50/70">
                {match.commentary[match.commentary.length - 1]?.text ?? '等待下一个关键瞬间'}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300 [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300 [animation-delay:300ms]" />
            </div>
          </div>
        )}

        {/* 特性栏 */}
        <div className="mt-3 flex flex-wrap items-center gap-1">
          <span className="text-[9px] uppercase tracking-[0.18em] text-emerald-200/35">
            特性 {run.traits.length}/6
          </span>
          {run.traits.map((id) => (
            <TraitChip key={id} id={id} />
          ))}
        </div>
      </div>
    </div>
  )
}

function Timeline({ match }: { match: MatchState }) {
  const minute = match.shootout ? 90 : match.clock
  const pct = Math.min(100, (minute / 90) * 100)
  return (
    <div className="relative z-10 px-3 pt-2 sm:px-5">
      <div className="relative h-6">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-emerald-950/80" />
        <div
          className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-emerald-500 to-amber-300 transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
        {match.moments.map((m, i) => {
          const left = Math.min(100, (m.minute / 90) * 100)
          const done = m.result !== null
          const isActive = match.activeIndex === i
          return (
            <div
              key={i}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${left}%` }}
            >
              <div
                className={[
                  'h-2.5 w-2.5 rounded-full border transition',
                  isActive
                    ? 'scale-150 border-amber-200 bg-amber-300 ok-ring'
                    : done
                      ? m.result?.scoredBy === 'us'
                        ? 'border-emerald-200 bg-emerald-400'
                        : m.result?.scoredBy === 'them'
                          ? 'border-rose-200 bg-rose-500'
                          : 'border-emerald-200/40 bg-emerald-900'
                      : 'border-emerald-200/25 bg-emerald-950',
                ].join(' ')}
              />
            </div>
          )
        })}
        <div className="absolute inset-x-0 top-1/2 flex justify-between text-[8px] text-emerald-200/30">
          <span>0'</span>
          <span>45'</span>
          <span>90'</span>
        </div>
      </div>
    </div>
  )
}

export function traitName(id: string): string {
  return getTrait(id)?.name ?? id
}
