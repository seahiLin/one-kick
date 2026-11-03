import { useState } from 'react'
import { Btn, Panel, Stat, TraitCard } from './ui'
import { ACHIEVEMENTS, DIFFICULTY_INFO, MAX_DIFFICULTY, availableTraitIds, collectionProgress } from '../game/meta'
import { TEAMS, teamUnlockText, teamUnlocked } from '../game/teams'
import { TRAITS, getTrait } from '../game/traits'
import { STAGES } from '../game/opponents'
import type { GameApi } from '../game/useGame'

export function TitleScreen({ game }: { game: GameApi }) {
  const save = game.save
  const progress = collectionProgress(save)
  const [rulesOpen, setRulesOpen] = useState(false)
  return (
    <div className="relative flex min-h-screen flex-col stadium-bg">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-emerald-500/20 blur-[90px]" />
        <div className="absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-amber-400/15 blur-[100px]" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-5 px-5 py-10">
        <div className="text-center">
          <div className="text-[11px] font-bold uppercase tracking-[0.5em] text-emerald-300/60">
            One Kick
          </div>
          <h1 className="onekick-display mt-2 text-6xl leading-none text-emerald-50 drop-shadow-[0_6px_0_rgba(4,40,26,0.9)] sm:text-7xl">
            一脚
            <span className="text-amber-300">封神</span>
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-xs leading-relaxed text-emerald-100/55">
            比赛自动进行，你只在关键瞬间做一次选择。
            <br />
            每赢一场，从三个特性里挑一个 —— 靠联动越踢越强，最后捧起杯赛冠军。
          </p>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <Stat label="特性" value={`${progress.traits.unlocked}/${progress.traits.total}`} />
          <Stat label="球队" value={`${progress.teams.unlocked}/${progress.teams.total}`} />
          <Stat label="成就" value={`${progress.achievements.unlocked}/${progress.achievements.total}`} />
          <Stat label="冠军" value={`${save.stats.titles}`} accent="text-amber-300" />
        </div>

        <div className="flex flex-col gap-2">
          <Btn size="lg" onClick={game.goTeamSelect} className="w-full">
            开始一局杯赛
          </Btn>
          <div className="grid grid-cols-2 gap-2">
            <Btn variant="ghost" onClick={game.goCollection}>
              图鉴与解锁
            </Btn>
            <Btn variant="ghost" onClick={() => setRulesOpen(true)}>
              玩法说明
            </Btn>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-200/10 bg-black/25 px-3 py-2.5 text-center text-[10px] leading-relaxed text-emerald-100/45">
          8 场比赛 · 输一场即出局 · 90 分钟打平进入点球大战
          <br />
          当前难度：{DIFFICULTY_INFO[save.difficulty]?.name ?? '常规'}
          {save.stats.runs > 0 && ` · 已玩 ${save.stats.runs} 局 / 累计 ${save.stats.wins} 胜`}
        </div>
      </main>
      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
  )
}

export function RulesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" onClick={onClose}>
      <Panel className="ok-pop max-h-[85vh] w-full max-w-lg overflow-y-auto ok-scroll p-5">
        <h2 className="onekick-display text-xl text-amber-200">玩法说明</h2>
        <ol className="mt-3 space-y-2 text-xs leading-relaxed text-emerald-50/75">
          <li>
            <b className="text-emerald-200">1. 选球队。</b>每支球队有 3 名核心球员和 1 个初始特性，决定这局的方向。
          </li>
          <li>
            <b className="text-emerald-200">2. 比赛自动进行。</b>只在 5–8 个关键瞬间暂停，画面定格，你从 2–3 个动作里挑一个。
          </li>
          <li>
            <b className="text-emerald-200">3. 看画面，不要看概率。</b>门将站位、人墙紧不紧、队友有没有空位 —— 同一个动作，局势不同结果就不同。
          </li>
          <li>
            <b className="text-emerald-200">4. 赢了就选特性。</b>三选一，特性之间会联动（角球流、世界波流、铁桶流……）。共 6 格。
          </li>
          <li>
            <b className="text-emerald-200">5. 输一场就出局。</b>8 场全胜即夺冠，之后解锁新球队、新特性、更高难度。
          </li>
        </ol>
        <div className="mt-4 rounded-lg bg-emerald-950/60 p-3 text-[11px] leading-relaxed text-emerald-100/60">
          小提示：挑射、远射等高难度动作打进了算「世界波」，会触发相关特性。
          落后时别慌 —— 有些特性专门靠落后吃饭。
        </div>
        <Btn className="mt-4 w-full" onClick={onClose}>
          知道了
        </Btn>
      </Panel>
    </div>
  )
}

export function TeamSelectScreen({ game }: { game: GameApi }) {
  const save = game.save
  return (
    <div className="min-h-screen stadium-bg px-4 py-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center justify-between">
          <Btn variant="ghost" size="sm" onClick={game.goTitle}>
            ← 返回
          </Btn>
          <div className="text-[10px] uppercase tracking-[0.24em] text-emerald-200/45">
            难度 {DIFFICULTY_INFO[save.difficulty]?.name ?? '常规'}
          </div>
        </div>
        <h2 className="onekick-display mt-4 text-2xl text-emerald-50">选择你的球队</h2>
        <p className="mt-1 text-xs text-emerald-100/50">
          {DIFFICULTY_INFO[save.difficulty]?.note ?? '标准对手强度'} · 8 场杯赛，输一场即出局
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {TEAMS.map((team) => {
            const unlocked = teamUnlocked(team, save)
            const starter = getTrait(team.starterTrait)
            return (
              <button
                key={team.id}
                type="button"
                disabled={!unlocked}
                onClick={() => game.beginRun(team.id)}
                className={[
                  'onekick group relative overflow-hidden rounded-2xl border p-4 text-left transition',
                  unlocked
                    ? 'border-emerald-200/20 bg-gradient-to-br from-emerald-950/80 to-black/50 hover:-translate-y-1 hover:border-amber-200/50'
                    : 'cursor-not-allowed border-white/5 bg-black/40 opacity-55',
                ].join(' ')}
              >
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    {[team.colors.shirt, team.colors.trim, team.colors.keeper].map((c, i) => (
                      <span
                        key={i}
                        className="h-5 w-5 rounded-full border border-black/40"
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                  <span className="onekick-display text-base text-emerald-50">{team.name}</span>
                  {!unlocked && <span className="text-xs">🔒</span>}
                </div>
                <div className="mt-0.5 text-[11px] text-amber-200/70">{team.style}</div>
                <div className="mt-2 space-y-0.5">
                  {team.players.map((p) => (
                    <div key={p.name} className="flex items-center gap-1.5 text-[10px] text-emerald-100/55">
                      <span className="w-8 shrink-0 rounded bg-emerald-900/70 px-1 text-center text-[9px] text-emerald-200/70">
                        {p.role}
                      </span>
                      <span className="truncate">{p.name}</span>
                      <span className="text-emerald-200/30">{p.height}cm</span>
                    </div>
                  ))}
                </div>
                {starter && (
                  <div className="mt-2.5">
                    <div className="text-[9px] uppercase tracking-[0.16em] text-emerald-200/40">
                      初始特性
                    </div>
                    <TraitCard trait={starter} compact />
                  </div>
                )}
                {!unlocked && (
                  <div className="mt-2 rounded-lg bg-black/50 px-2 py-1.5 text-[10px] text-amber-200/80">
                    解锁条件：{teamUnlockText(team)}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <Panel className="mt-4 p-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-200/40">赛程</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {STAGES.map((s, i) => (
              <span
                key={s.index}
                className={[
                  'rounded-md px-2 py-1 text-[10px]',
                  s.phase === 'final'
                    ? 'bg-rose-900/60 text-rose-100'
                    : s.phase === 'semi'
                      ? 'bg-amber-900/50 text-amber-100'
                      : 'bg-emerald-900/50 text-emerald-100/80',
                ].join(' ')}
              >
                {i + 1}. {s.label}
              </span>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}

export function CollectionScreen({ game }: { game: GameApi }) {
  const save = game.save
  const unlocked = new Set(availableTraitIds(save))
  const teamsUnlocked = new Set(save.teams)
  return (
    <div className="min-h-screen stadium-bg px-4 py-6">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <Btn variant="ghost" size="sm" onClick={game.goTitle}>
            ← 返回
          </Btn>
          <div className="text-[10px] uppercase tracking-[0.24em] text-emerald-200/45">图鉴</div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <Stat label="局数" value={`${save.stats.runs}`} />
          <Stat label="累计胜场" value={`${save.stats.wins}`} />
          <Stat label="世界波" value={`${save.stats.worldies}`} accent="text-fuchsia-300" />
          <Stat label="最高难度" value={`${DIFFICULTY_INFO[save.difficulty]?.name ?? '常规'}`} accent="text-amber-300" />
        </div>

        <Panel className="p-4">
          <SectionTitle>难度</SectionTitle>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {DIFFICULTY_INFO.map((d) => (
              <div
                key={d.level}
                className={[
                  'rounded-lg border px-2.5 py-2 text-[11px]',
                  save.difficulty >= d.level
                    ? 'border-amber-300/40 bg-amber-950/30 text-amber-100'
                    : 'border-white/5 bg-black/30 text-emerald-100/35',
                ].join(' ')}
              >
                <div className="font-bold">
                  {d.level > 0 ? `难度 ${d.level} · ` : ''}
                  {d.name}
                </div>
                <div className="opacity-70">{d.name === '常规' && d.level === 0 ? '标准对手强度' : d.note}</div>
              </div>
            ))}
          </div>
          <div className="mt-1.5 text-[10px] text-emerald-200/35">
            夺冠后自动解锁下一档（最高 {MAX_DIFFICULTY}）
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle>
            特性池 {unlocked.size}/{TRAITS.length}
          </SectionTitle>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {TRAITS.map((t) => {
              const has = unlocked.has(t.id)
              return <TraitCard key={t.id} trait={t} compact dimmed={!has} />
            })}
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle>球队</SectionTitle>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {TEAMS.map((t) => {
              const has = t.unlock?.kind === 'always' || teamsUnlocked.has(t.id)
              return (
                <div
                  key={t.id}
                  className={[
                    'rounded-lg border px-2.5 py-2',
                    has ? 'border-emerald-300/30 bg-emerald-950/40' : 'border-white/5 bg-black/30 opacity-55',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full" style={{ background: t.colors.shirt }} />
                    <span className="onekick-display text-xs text-emerald-50">{t.name}</span>
                    {!has && <span className="text-[10px]">🔒</span>}
                  </div>
                  <div className="mt-0.5 text-[10px] text-emerald-100/50">
                    {has ? t.style : teamUnlockText(t)}
                  </div>
                </div>
              )
            })}
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle>成就</SectionTitle>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {ACHIEVEMENTS.map((a) => {
              const has = save.achievements.includes(a.id)
              return (
                <div
                  key={a.id}
                  className={[
                    'rounded-lg border px-2.5 py-1.5 text-[11px]',
                    has ? 'border-amber-300/40 bg-amber-950/25 text-amber-100' : 'border-white/5 bg-black/30 text-emerald-100/35',
                  ].join(' ')}
                >
                  <div className="font-bold">
                    {has ? '🏅' : '·'} {a.name}
                  </div>
                  <div className="opacity-70">{a.detail}</div>
                </div>
              )
            })}
          </div>
        </Panel>

        <Panel className="p-4">
          <SectionTitle>经典时刻</SectionTitle>
          {save.classic.length === 0 ? (
            <div className="mt-2 text-[11px] text-emerald-100/35">还没有记录。打出补时绝杀、世界波、门将破门试试。</div>
          ) : (
            <div className="mt-2 space-y-1">
              {[...save.classic].reverse().slice(0, 20).map((c) => (
                <div key={c.id} className="rounded-lg border border-emerald-200/10 bg-black/30 px-2.5 py-1.5">
                  <div className="text-[11px] font-bold text-amber-200">{c.title}</div>
                  <div className="text-[10px] text-emerald-100/55">{c.detail}</div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Btn variant="danger" className="w-full" onClick={game.hardReset}>
          清除全部进度
        </Btn>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/45">{children}</div>
  )
}
