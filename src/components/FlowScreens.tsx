import { useState } from 'react'
import { Btn, Panel, Stat, TraitCard, TraitChip } from './ui'
import { Pitch3D } from './Pitch3D'
import { getOpponent, opponentForStage } from '../game/opponents'
import { getTeam } from '../game/teams'
import { RARITY_LABEL, getTrait } from '../game/traits'
import { STAGE_COUNT, TRAIT_SLOTS, stageLabel } from '../game/run'
import { ACHIEVEMENT_MAP, DIFFICULTY_INFO } from '../game/meta'
import type { GameApi } from '../game/useGame'

/* ---------------- 特性三选一 ---------------- */

export function DraftScreen({ game }: { game: GameApi }) {
  const run = game.run
  const [picked, setPicked] = useState<string | null>(null)
  const [replaceTarget, setReplaceTarget] = useState<string | null>(null)
  if (!run || !run.draft) return null

  const full = run.traits.length >= TRAIT_SLOTS
  const replacing = run.draft.replacing || full

  const onPick = (id: string) => {
    if (full && !replaceTarget) {
      setPicked(id)
      return
    }
    game.chooseTrait(id, replaceTarget ?? undefined)
  }

  return (
    <div className="min-h-screen stadium-bg px-4 py-6">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.32em] text-emerald-300/50">
            第 {run.stageIndex} 场 · 胜利奖励
          </div>
          <h2 className="onekick-display mt-1 text-2xl text-amber-200">选择一个特性</h2>
          <p className="mt-1 text-[11px] text-emerald-100/50">
            {full ? `特性栏已满（${TRAIT_SLOTS} 格），选择要替换掉的旧特性` : `特性 ${run.traits.length}/${TRAIT_SLOTS}`}
          </p>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-3">
          {run.draft.offers.map((id, i) => {
            const trait = getTrait(id)
            if (!trait) return null
            return (
              <div key={id} className="ok-pop" style={{ animationDelay: `${i * 70}ms` }}>
                <TraitCard
                  trait={trait}
                  onClick={() => onPick(id)}
                  selected={picked === id}
                />
                <div className="mt-1 text-center text-[9px] uppercase tracking-widest text-emerald-200/30">
                  {RARITY_LABEL[trait.rarity]}
                </div>
              </div>
            )
          })}
        </div>

        {picked && full && (
          <Panel className="ok-rise p-3">
            <div className="text-[11px] font-bold text-amber-200">
              已选：{getTrait(picked)?.name} —— 要替换掉哪个旧特性？
            </div>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {run.traits.map((id) => (
                <TraitCard
                  key={id}
                  trait={getTrait(id)!}
                  compact
                  selected={replaceTarget === id}
                  onClick={() => {
                    setReplaceTarget(id)
                    game.chooseTrait(picked, id)
                  }}
                />
              ))}
            </div>
            <Btn variant="ghost" size="sm" className="mt-2 w-full" onClick={() => setPicked(null)}>
              算了，重新选新特性
            </Btn>
          </Panel>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] text-emerald-200/40">
            奖励 {run.reward} · 刷新花费 {game.rerollCost}
          </div>
          <Btn
            variant="ghost"
            size="sm"
            disabled={run.draft.rerolled || run.reward < game.rerollCost}
            onClick={game.reroll}
          >
            {run.draft.rerolled ? '已刷新' : `刷新三选一（-${game.rerollCost}）`}
          </Btn>
        </div>

        <Panel className="p-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-200/40">当前特性</div>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {run.traits.map((id) => (
              <TraitChip key={id} id={id} />
            ))}
            {run.traits.length === 0 && (
              <span className="text-[10px] text-emerald-100/30">还没有特性</span>
            )}
          </div>
        </Panel>

        {replacing && !picked && (
          <div className="text-center text-[10px] text-rose-200/60">
            先点一个新特性，再点要替换的旧特性
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------------- 赛前简报 ---------------- */

export function PreviewScreen({ game }: { game: GameApi }) {
  const run = game.run
  if (!run) return null
  const team = getTeam(run.teamId)
  const opponent = getOpponent(opponentForStage(run.stageIndex).id)
  const stage = opponentForStage(run.stageIndex)

  return (
    <div className="min-h-screen stadium-bg px-4 py-6">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.32em] text-emerald-300/50">
            {stageLabel(run.stageIndex)} · 第 {run.stageIndex + 1}/{STAGE_COUNT} 场
          </div>
          <h2 className="onekick-display mt-1 text-xl text-emerald-50">
            {team.name} <span className="text-emerald-200/35">vs</span> {opponent.name}
          </h2>
        </div>

        <div className="relative h-48 overflow-hidden rounded-2xl border border-emerald-200/15 sm:h-60">
          <Pitch3D
            scene={null}
            us={team.colors}
            them={opponent.colors}
            result={null}
            resultKey={0}
            paused={false}
            className="absolute inset-0"
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(3,12,9,0.92),transparent_60%)]" />
          <div className="absolute inset-x-0 bottom-0 p-3">
            <div className="flex items-center gap-2">
              {[team.colors.shirt, team.colors.trim].map((c, i) => (
                <span key={i} className="h-4 w-4 rounded-full border border-black/40" style={{ background: c }} />
              ))}
              <span className="text-xs font-bold text-emerald-50">{team.name}</span>
              <span className="text-emerald-200/35">—</span>
              <span className="text-xs font-bold text-emerald-50">{opponent.name}</span>
              {[opponent.colors.shirt, opponent.colors.trim].map((c, i) => (
                <span key={i} className="h-4 w-4 rounded-full border border-black/40" style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>

        <Panel className="p-3.5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-amber-200/60">对手特点</div>
          <p className="mt-1 text-xs leading-relaxed text-emerald-50/80">{opponent.note}</p>
          {opponent.bossRule && (
            <div className="mt-2 rounded-lg border border-rose-400/40 bg-rose-950/40 px-2.5 py-2 text-[11px] text-rose-100">
              <b className="text-rose-200">Boss 规则：</b>
              {opponent.bossRule}
            </div>
          )}
          {opponent.traits.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              <span className="text-[9px] uppercase tracking-widest text-emerald-200/35">对手特性</span>
              {opponent.traits.map((id) => (
                <TraitChip key={id} id={id} />
              ))}
            </div>
          )}
        </Panel>

        <div className="grid gap-2 sm:grid-cols-2">
          <Panel className="p-3.5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-200/45">我方阵容</div>
            <div className="mt-1.5 space-y-1">
              {team.players.map((p) => (
                <div key={p.name} className="flex items-center gap-2 text-[11px] text-emerald-50/80">
                  <span className="w-8 shrink-0 rounded bg-emerald-900/70 px-1 text-center text-[9px] text-emerald-200/70">
                    {p.role}
                  </span>
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="text-emerald-200/30">{p.height}cm</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {run.traits.map((id) => (
                <TraitChip key={id} id={id} />
              ))}
            </div>
          </Panel>

          <Panel className="p-3.5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-200/45">本局进度</div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <Stat label="已胜" value={`${run.wins}`} />
              <Stat label="进球" value={`${run.totals.goals}`} />
              <Stat label="世界波" value={`${run.totals.worldies}`} accent="text-fuchsia-300" />
              <Stat label="难度" value={DIFFICULTY_INFO[run.difficulty]?.name ?? '常规'} accent="text-amber-300" />
            </div>
            <div className="mt-2 text-[10px] leading-relaxed text-emerald-100/40">
              {run.history.length === 0
                ? '小组赛首战，先摸清节奏。'
                : `上一场：${run.history[run.history.length - 1].score.us}:${run.history[run.history.length - 1].score.them} ${
                    run.history[run.history.length - 1].won ? '胜' : '负'
                  }`}
            </div>
          </Panel>
        </div>

        <Btn size="lg" className="w-full" onClick={game.toMatch}>
          开球 →
        </Btn>
      </div>
    </div>
  )
}

/* ---------------- 出局 / 夺冠 ---------------- */

export function EndScreen({ game, champion }: { game: GameApi; champion: boolean }) {
  const run = game.run
  const summary = game.summary
  if (!run) return null
  const team = getTeam(run.teamId)
  const last = run.history[run.history.length - 1]

  return (
    <div className="min-h-screen stadium-bg px-4 py-6">
      <div className="mx-auto w-full max-w-2xl space-y-3.5">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.32em] text-emerald-300/50">
            {champion ? '杯赛结束' : '出局'}
          </div>
          <h2
            className={`onekick-display mt-1 text-4xl ${
              champion ? 'text-amber-300 drop-shadow-[0_4px_0_rgba(80,40,0,0.8)]' : 'text-rose-200'
            }`}
          >
            {champion ? '一脚封神！' : '止步于此'}
          </h2>
          <p className="mt-1 text-xs text-emerald-100/55">
            {team.name} · {champion ? '8 场全胜捧杯' : `第 ${run.stageIndex + 1} 场被淘汰`}
          </p>
        </div>

        {last && (
          <Panel className="p-3.5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-200/40">最后一战</div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-emerald-50/80">{stageLabel(last.stageIndex)}</span>
              <span className="onekick-display text-lg text-emerald-50 tabular-nums">
                {last.score.us} : {last.score.them}
                {last.shootout && <span className="ml-1 text-[10px] text-amber-200">PK</span>}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-amber-100/70">{last.highlight}</p>
          </Panel>
        )}

        <div className="grid grid-cols-4 gap-2">
          <Stat label="胜场" value={`${run.wins}`} />
          <Stat label="进球" value={`${run.totals.goals}`} />
          <Stat label="世界波" value={`${run.totals.worldies}`} accent="text-fuchsia-300" />
          <Stat label="奖励" value={`${run.reward}`} accent="text-amber-300" />
        </div>

        {run.history.length > 1 && (
          <Panel className="p-3.5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-200/40">本局历程</div>
            <div className="mt-1.5 space-y-1">
              {run.history.map((h, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  <span className="w-4 text-emerald-200/30">{i + 1}</span>
                  <span className="w-24 shrink-0 truncate text-emerald-100/60">
                    {getOpponent(h.opponentId).short}
                  </span>
                  <span
                    className={`onekick-display tabular-nums ${h.won ? 'text-emerald-300' : 'text-rose-300'}`}
                  >
                    {h.score.us}:{h.score.them}
                    {h.shootout && ' PK'}
                  </span>
                  <span className="flex-1 truncate text-[10px] text-emerald-100/35">{h.highlight}</span>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {summary && (
          <Panel className="p-3.5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-amber-200/60">局外解锁</div>
            <div className="mt-2 space-y-1.5 text-[11px]">
              {summary.newTraits.length === 0 &&
                summary.newTeams.length === 0 &&
                summary.newAchievements.length === 0 &&
                !summary.unlockedDifficulty && (
                  <div className="text-emerald-100/35">这一局没有新的解锁，但经验留在了手上。</div>
                )}
              {summary.newTraits.length > 0 && (
                <div className="text-emerald-200">
                  新特性加入池：{summary.newTraits.map((id) => getTrait(id)?.name).join('、')}
                </div>
              )}
              {summary.newTeams.length > 0 && (
                <div className="text-amber-200">
                  解锁新球队：{summary.newTeams.map((id) => getTeam(id).name).join('、')}
                </div>
              )}
              {summary.newAchievements.length > 0 && (
                <div className="text-sky-200">
                  成就：{summary.newAchievements.map((id) => ACHIEVEMENT_MAP[id]?.name ?? id).join('、')}
                </div>
              )}
              {summary.unlockedDifficulty !== null && (
                <div className="text-rose-200">
                  解锁难度 {summary.unlockedDifficulty} · {DIFFICULTY_INFO[summary.unlockedDifficulty]?.name}
                </div>
              )}
            </div>
          </Panel>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Btn variant="ghost" onClick={game.goCollection}>
            查看图鉴
          </Btn>
          <Btn onClick={game.goTeamSelect}>再来一局</Btn>
        </div>
      </div>
    </div>
  )
}
