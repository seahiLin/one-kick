import { buildMatch, chooseOption, highlightOf, shootoutKick, startShootout } from './match'
import { STAGES, opponentForStage } from './opponents'
import { mulberry32, newSeed, shuffle, weightedPick } from './rng'
import { BASE_TRAIT_IDS, TRAITS } from './traits'
import { getTeam } from './teams'
import type { MatchState, MomentResult, RunState, Trait } from './types'

export const TRAIT_SLOTS = 6
export const REROLL_COST = 8
export const STAGE_COUNT = 8

export function stageLabel(index: number): string {
  return STAGES[index]?.label ?? `第 ${index + 1} 场`
}

/* ---------------- 开新局 ---------------- */

export function startRun(teamId: string, difficulty: number, availableTraits: string[]): RunState {
  const team = getTeam(teamId)
  const seed = newSeed()
  const run: RunState = {
    seed,
    teamId,
    difficulty,
    stageIndex: 0,
    traits: [team.starterTrait],
    availableTraits,
    wins: 0,
    history: [],
    status: 'playing',
    reward: 0,
    draft: null,
    match: null,
    totals: {
      worldies: 0,
      goals: 0,
      cleanSheets: 0,
      comebacks: 0,
      lateWinners: 0,
      keeperGoals: 0,
      corners: 0,
      maxTraits: 1,
    },
  }
  run.match = advanceToNextStop(run, buildMatch(run, 0, opponentForStage(0)))
  return run
}

/* ---------------- 推进 ---------------- */

export function advanceToNextStop(run: RunState, matchIn: MatchState): MatchState {
  const next = { ...matchIn }
  if (next.shootout) return next
  if (next.activeIndex !== null) return next
  const pendingIdx = next.moments.findIndex((m) => m.result === null)
  if (pendingIdx === -1) {
    next.clock = 90
    if (next.score.us === next.score.them) {
      return startShootout(run, next)
    }
    return { ...next, finished: true }
  }
  next.activeIndex = pendingIdx
  next.clock = next.moments[pendingIdx].minute
  return next
}

export interface PlayOutcome {
  run: RunState
  result: MomentResult
  match: MatchState
}

/** 玩家在关键瞬间做选择 */
export function playMoment(run: RunState, match: MatchState, optionId: string): PlayOutcome {
  const step = chooseOption(run, match, optionId)
  let nextRun = accumulate(run, step.result)
  const nextMatch = advanceToNextStop(nextRun, step.state)
  nextRun = { ...nextRun, match: nextMatch }
  if (nextMatch.finished && !nextMatch.shootout) {
    nextRun = finishMatch(nextRun, nextMatch, nextMatch.score.us > nextMatch.score.them)
    return { run: nextRun, result: step.result, match: nextRun.match ?? nextMatch }
  }
  return { run: nextRun, result: step.result, match: nextMatch }
}
export function playShootoutKick(run: RunState, match: MatchState, optionId: string): PlayOutcome {
  const step = shootoutKick(run, match, optionId)
  let nextRun = accumulate(run, step.result)
  const nextMatch = step.state
  nextRun = { ...nextRun, match: nextMatch }
  if (step.finished) {
    nextRun = finishMatch(nextRun, nextMatch, step.winner === 'us')
  }
  return { run: nextRun, result: step.result, match: nextMatch }
}

function accumulate(run: RunState, result: MomentResult): RunState {
  const totals = { ...run.totals }
  if (result.scoredBy === 'us') {
    totals.goals += 1
    if (result.kind === 'corner' && result.scorer && result.scorer === keeperName(run)) {
      totals.keeperGoals += 1
    }
  }
  if (result.worldie) totals.worldies += 1
  if (result.kind === 'corner') totals.corners += 1
  if (result.minute >= 85 && result.scoredBy === 'us') totals.lateWinners += 1
  return { ...run, totals }
}

function keeperName(run: RunState): string | null {
  const team = getTeam(run.teamId)
  return team.players.find((p) => p.role === 'GK')?.name ?? null
}

/** 90 分钟结束：判定胜负，胜利则进入特性三选一 */
export function finishMatch(run: RunState, match: MatchState, won: boolean): RunState {
  const record = {
    stageIndex: run.stageIndex,
    opponentId: match.opponentId,
    score: { ...match.score },
    won,
    shootout: Boolean(match.shootout),
    highlight: highlightOf(match),
  }
  const history = [...run.history, record]
  const totals = { ...run.totals }
  if (match.score.them === 0) totals.cleanSheets += 1
  /* 大逆转：本场曾经落后 2 球以上却赢下比赛 */
  if (won) {
    let us = 0
    let them = 0
    let maxDeficit = 0
    for (const m of match.moments) {
      const r = m.result
      if (!r) continue
      if (r.scoredBy === 'us') us += 1
      if (r.scoredBy === 'them') them += 1
      maxDeficit = Math.max(maxDeficit, them - us)
    }
    if (maxDeficit >= 2) totals.comebacks += 1
  }

  if (!won) {
    const out: RunState = {
      ...run,
      history,
      totals,
      status: 'eliminated',
      match: { ...match, finished: true },
    }
    return { ...out, reward: computeReward(out, false) }
  }

  const isFinal = run.stageIndex >= STAGE_COUNT - 1
  if (isFinal) {
    const out: RunState = {
      ...run,
      history,
      totals,
      wins: run.wins + 1,
      status: 'champion',
      match: { ...match, finished: true },
    }
    return { ...out, reward: computeReward(out, true) }
  }

  const nextIndex = run.stageIndex + 1
  const advanced: RunState = {
    ...run,
    history,
    totals,
    wins: run.wins + 1,
    stageIndex: nextIndex,
    status: 'playing',
    match: { ...match, finished: true },
  }
  return { ...advanced, reward: computeReward(advanced, false), draft: makeDraft(advanced) }
}

export function computeReward(run: RunState, champion: boolean): number {
  let reward = run.history.filter((h) => h.won).length * 10
  reward += run.totals.goals * 2
  reward += run.totals.worldies * 5
  if (champion) reward += 40
  return reward
}

/* ---------------- 特性三选一 ---------------- */

export function rarityWeights(
  stageIndex: number,
  difficulty: number,
): Record<Trait['rarity'], number> {
  const t = Math.min(1, stageIndex / (STAGE_COUNT - 1)) + difficulty * 0.12
  return {
    common: Math.max(6, 62 - t * 44),
    rare: 28 + t * 20,
    legendary: 6 + t * 30,
  }
}

function draftPool(run: RunState, exclude: readonly string[] = []): Trait[] {
  const allowed = new Set(run.availableTraits.length ? run.availableTraits : BASE_TRAIT_IDS)
  return TRAITS.filter((t) => allowed.has(t.id) && !run.traits.includes(t.id) && !exclude.includes(t.id))
}

function drawOffers(run: RunState, seed: number, exclude: readonly string[] = []): string[] {
  const rng = mulberry32(seed)
  const pool = draftPool(run, exclude)
  const weights = rarityWeights(run.stageIndex, run.difficulty)
  const offers: string[] = []
  let guard = 0
  while (offers.length < 3 && guard < 120) {
    guard += 1
    if (pool.length === 0) break
    const candidate = weightedPick(
      rng,
      pool.map((t) => [t.id, weights[t.rarity]] as const),
    )
    if (!offers.includes(candidate)) offers.push(candidate)
  }
  if (offers.length < 3) {
    for (const t of shuffle(rng, pool)) {
      if (offers.length >= 3) break
      if (!offers.includes(t.id)) offers.push(t.id)
    }
  }
  return offers
}

export function makeDraft(run: RunState): RunState['draft'] {
  const offers = drawOffers(run, run.seed + run.stageIndex * 977 + 5)
  return { offers, rerolled: false, replacing: false }
}

export function rerollDraft(run: RunState): RunState {
  if (!run.draft || run.draft.rerolled) return run
  if (run.reward < REROLL_COST) return run
  const offers = drawOffers(
    run,
    run.seed + run.stageIndex * 31 + run.traits.length * 7 + 991,
    run.draft.offers,
  )
  return {
    ...run,
    reward: run.reward - REROLL_COST,
    draft: {
      ...run.draft,
      offers: offers.length ? offers : run.draft.offers,
      rerolled: true,
    },
  }
}

export function pickTrait(run: RunState, traitId: string, replaceTraitId?: string): RunState {
  if (!run.draft) return run
  let traits = [...run.traits]
  if (traits.length >= TRAIT_SLOTS) {
    if (!replaceTraitId) {
      return { ...run, draft: { ...run.draft, replacing: true } }
    }
    traits = traits.filter((t) => t !== replaceTraitId)
  }
  traits.push(traitId)
  const withTrait: RunState = {
    ...run,
    traits,
    totals: { ...run.totals, maxTraits: Math.max(run.totals.maxTraits, traits.length) },
    draft: null,
    match: null,
  }
  return {
    ...withTrait,
    match: advanceToNextStop(withTrait, buildMatch(withTrait, run.stageIndex, opponentForStage(run.stageIndex))),
  }
}

export function stageOpponentName(index: number): string {
  return opponentForStage(index).name
}
