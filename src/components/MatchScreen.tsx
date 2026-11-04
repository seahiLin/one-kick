import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

/* 一段比赛的时间线：结果 → 快进 → 下一个关键瞬间 */
type Phase = 'moment' | 'result' | 'ff'

export function MatchScreen({ game }: { game: GameApi }) {
  const run = game.run
  const match = run?.match ?? null
  const team = run ? getTeam(run.teamId) : null
  const opponent = match ? getOpponent(match.opponentId) : null

  const [phase, setPhase] = useState<Phase>('moment')
  const [frozen, setFrozen] = useState<MatchMoment | null>(null)
  const [flash, setFlash] = useState<'goal' | 'bad' | 'stop' | null>(null)
  const [resultKey, setResultKey] = useState(0)
  const [displayMinute, setDisplayMinute] = useState(0)
  const lastResultRef = useRef<MomentResult | null>(null)
  const timers = useRef<number[]>([])

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

  const shownMoment = phase === 'moment' ? activeMoment : frozen
  const scene: Scene | null = shownMoment?.scene ?? null
  const shootout = match?.shootout ?? null

  /* 上一段比赛的结果：播放动画，然后快进到下一个瞬间 */
  useEffect(() => {
    const r = game.lastResult
    if (!r || r === lastResultRef.current) return
    lastResultRef.current = r
    setResultKey((k) => k + 1)
    setPhase('result')
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
    if (r.traitsFired.length > 0) window.setTimeout(playTrait, 300)

    const from = r.minute
    const to = game.run?.match?.clock ?? from
    const resultMs = r.scoredBy ? 1250 : 950
    const ffMs = 850

    const t1 = window.setTimeout(() => {
      setFlash(null)
      setPhase('ff')
    }, resultMs)
    const t2 = window.setTimeout(() => {
      setPhase('moment')
      setFrozen(null)
    }, resultMs + ffMs)

    /* 快进时把分钟数滚过去 */
    const startedAt = performance.now() + resultMs
    let raf = 0
    const tick = () => {
      const now = performance.now()
      const k = Math.min(1, Math.max(0, (now - startedAt) / ffMs))
      setDisplayMinute(Math.round(from + (to - from) * k))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    timers.current.push(t1, t2)
    return () => {
      cancelAnimationFrame(raf)
    }
  }, [game.lastResult, game.run?.match?.clock])

  useEffect(() => {
    return () => {
      for (const t of timers.current) window.clearTimeout(t)
    }
  }, [])

  /* 关键瞬间出现时的心跳 */
  const activeKey = shownMoment ? `${shownMoment.minute}-${shownMoment.kind}-${phase}` : null
  const tensionRef = useRef<string | null>(null)
  useEffect(() => {
    if (!activeKey || phase !== 'moment') return
    if (tensionRef.current === activeKey) return
    tensionRef.current = activeKey
    playTension()
  }, [activeKey, phase])

  const [muted, setMutedState] = useState(false)
  useEffect(() => setMutedState(isMuted()), [])

  const pick = useCallback(
    (optionId: string) => {
      if (!activeMoment || phase !== 'moment') return
      unlockAudio()
      setFrozen(activeMoment)
      game.choose(optionId)
    },
    [activeMoment, phase, game],
  )

  if (!run || !match || !team || !opponent) return null

  const minute = phase === 'moment' ? (shootout ? 120 : match.clock) : displayMinute || match.clock
  const attacking = shownMoment?.attacker === 'us'
  const defensive = shownMoment?.attacker === 'them'
  const showOptions = phase === 'moment' && Boolean(activeMoment)
  const last = game.lastResult

  return (
    <div className="flex min-h-screen flex-col stadium-bg">
      {/* 记分牌 */}
      <header className="flex items-center gap-2 px-3 pt-3 sm:px-5">
        <div className="glass flex flex-1 items-center gap-2 rounded-xl px-3 py-2">
          <div className="min-w-0 flex-1">
            <div className="text-[9px] uppercase tracking-[0.2em] text-emerald-200/45">
              {stageLabel(run.stageIndex)}
              {run.difficulty > 0 ? ` · 难度 ${run.difficulty}` : ''}
            </div>
            <div className="truncate text-xs font-semibold text-emerald-50/90">
              {team.name} <span className="text-emerald-200/40">vs</span> {opponent.name}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="onekick-display text-2xl text-emerald-50 tabular-nums">
              {match.score.us}
            </span>
            <span className="text-emerald-200/40">:</span>
            <span className="onekick-display text-2xl text-rose-200 tabular-nums">
              {match.score.them}
            </span>
          </div>
          <div className="ml-1 min-w-[46px] rounded-lg bg-black/40 px-2 py-1 text-center">
            <div className="onekick-display text-sm text-amber-200 tabular-nums">
              {shootout && phase === 'moment' ? 'PK' : `${minute}'`}
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

      <Timeline match={match} />

      {/* 舞台 + 操作区 */}
      <div className="flex flex-1 flex-col gap-3 px-3 pb-4 pt-2 sm:px-5 lg:flex-row">
        {/* 3D 球场 */}
        <div className="relative min-h-[240px] flex-1 overflow-hidden rounded-2xl border border-emerald-200/15 shadow-[0_20px_60px_rgba(0,0,0,0.55)] sm:min-h-[300px]">
          <Pitch3D
            scene={scene}
            us={team.colors}
            them={opponent.colors}
            result={last}
            resultKey={resultKey}
            paused={false}
            className="absolute inset-0"
          />

          {/* 定格时压暗四周，把注意力收到中间 */}
          {shownMoment && phase === 'moment' && (
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_58%,transparent_38%,rgba(2,8,6,0.72)_100%)]" />
          )}

          {/* 关键瞬间标题 */}
          {shownMoment && phase === 'moment' && (
            <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center gap-1 p-3 ok-pop">
              <span className="rounded-full bg-rose-500/90 px-3 py-1 text-[10px] font-black tracking-[0.24em] text-white shadow-lg">
                关 键 瞬 间
              </span>
              <span className="onekick-display text-base text-amber-200 drop-shadow-lg sm:text-lg">
                {shootout
                  ? `点球大战 · ${shootout.turn === 'us' ? '我方主罚' : '我方扑救'}`
                  : `${KIND_LABEL[shownMoment.kind]} · ${attacking ? '我方进攻' : '我方防守'}`}
              </span>
            </div>
          )}

          {/* 结果横幅 */}
          {flash && last && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div
                className={`ok-pop rounded-2xl px-6 py-3 text-center shadow-2xl ${
                  flash === 'goal'
                    ? 'bg-amber-300 text-amber-950'
                    : flash === 'stop'
                      ? 'bg-emerald-300 text-emerald-950'
                      : 'bg-rose-900/90 text-rose-50'
                }`}
              >
                <div className="onekick-display text-2xl sm:text-3xl">{last.headline}</div>
                <div className="mt-0.5 text-[11px] font-semibold opacity-80">{last.line}</div>
              </div>
            </div>
          )}

          {flash === 'goal' && (
            <div className="pointer-events-none absolute inset-0 ok-flash bg-[radial-gradient(circle,rgba(255,215,106,0.6),transparent_70%)]" />
          )}

          {/* 快进：时间在走，解说在飘 */}
          {phase === 'ff' && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 p-3">
              <span className="rounded-full bg-black/60 px-3 py-1 text-[10px] font-bold tracking-[0.28em] text-emerald-200/80">
                快 进 中
              </span>
              <span className="truncate rounded-full bg-black/50 px-3 py-1 text-[11px] text-emerald-100/70">
                {match.commentary[match.commentary.length - 1]?.text ?? '球权来回交换'}
              </span>
            </div>
          )}

          {/* 角落雷达图：只做补充，不遮球场 */}
          {shownMoment && (
            <div className="pointer-events-none absolute bottom-2 left-2 h-20 w-28 overflow-hidden rounded-lg border border-emerald-200/25 bg-black/40 shadow-lg sm:h-24 sm:w-36">
              <PitchBoard scene={shownMoment.scene} us={team.colors} them={opponent.colors} />
            </div>
          )}

          {/* 特性触发 */}
          {last && phase === 'result' && last.traitsFired.length > 0 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-2 flex flex-wrap justify-center gap-1 px-2">
              {last.traitsFired.map((id) => (
                <span key={id} className="ok-pop">
                  <TraitChip id={id} />
                </span>
              ))}
            </div>
          )}

          {/* 终场 */}
          {match.finished && phase === 'moment' && !activeMoment && (
            <div className="absolute inset-0 grid place-items-center bg-black/60">
              <div className="ok-pop text-center">
                <div className="text-[10px] uppercase tracking-[0.4em] text-emerald-200/60">
                  Full Time
                </div>
                <div className="onekick-display mt-1 text-4xl text-emerald-50 tabular-nums">
                  {match.score.us} : {match.score.them}
                </div>
                {shootout && (
                  <div className="mt-1 text-xs text-amber-200">
                    点球 {shootout.ourGoals} : {shootout.theirGoals}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 选项区 */}
        <div className="flex flex-col gap-2 lg:w-[360px] lg:justify-end">
          {showOptions && activeMoment ? (
            <div key={activeMoment.minute} className="ok-rise flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <span className="onekick-display text-xs text-emerald-100/80">
                  {shootout
                    ? `点球大战 ${shootout.ourGoals} : ${shootout.theirGoals}`
                    : defensive
                      ? '对手压上来了'
                      : '你的这一脚'}
                </span>
                <span className="text-[10px] text-emerald-200/35">
                  {activeMoment.options.length === 1
                    ? '一击制胜'
                    : `${activeMoment.options.length} 个选择`}
                </span>
              </div>
              <div className="grid gap-2">
                {activeMoment.options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => pick(opt.id)}
                    className={[
                      'onekick group relative w-full overflow-hidden rounded-xl border px-4 py-3.5 text-left transition active:scale-[0.98]',
                      defensive
                        ? 'border-rose-300/35 bg-rose-950/50 hover:border-rose-200/80 hover:bg-rose-900/60'
                        : 'border-amber-200/35 bg-amber-950/30 hover:border-amber-200/80 hover:bg-amber-900/40',
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
            <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200/10 bg-black/30 px-3 py-3">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-200/45">
                  {phase === 'ff' ? '比赛快进中' : '场上局面'}
                </div>
                <div className="truncate text-xs text-emerald-50/70">
                  {match.commentary[match.commentary.length - 1]?.text ?? '等待下一个关键瞬间'}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300 [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[9px] uppercase tracking-[0.18em] text-emerald-200/35">
              特性 {run.traits.length}/6
            </span>
            {run.traits.map((id) => (
              <TraitChip key={id} id={id} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Timeline({ match }: { match: MatchState }) {
  const minute = match.shootout ? 90 : match.clock
  const pct = Math.min(100, (minute / 90) * 100)
  return (
    <div className="px-3 pt-3 sm:px-5">
      <div className="relative h-5">
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
      </div>
    </div>
  )
}
