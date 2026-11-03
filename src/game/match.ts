import { buildScene, optionsFor, resolveMoment } from './moments'
import { bossGiftMinutes, buildModifiers } from './modifiers'
import { getOpponent } from './opponents'
import { mulberry32, randomInt, weightedPick, type Rng } from './rng'
import { getTeam } from './teams'
import type {
  CommentaryLine,
  MatchMoment,
  MatchState,
  Modifiers,
  MomentKind,
  MomentOption,
  MomentResult,
  Opponent,
  RunState,
  TraitContext,
} from './types'

const ATTACK_KINDS: MomentKind[] = ['oneOnOne', 'freeKick', 'corner', 'penalty']
const DEFEND_KINDS: MomentKind[] = ['counter', 'oneOnOne', 'corner', 'freeKick']

const BASE_WEIGHTS: Record<MomentKind, number> = {
  oneOnOne: 3,
  freeKick: 2,
  corner: 3,
  counter: 2,
  penalty: 1,
}

export const MATCH_MINUTES = 90

function pickMomentKind(rng: Rng, mods: Modifiers, attacking: boolean): MomentKind {
  const pool = attacking ? ATTACK_KINDS : DEFEND_KINDS
  const entries = pool.map((kind) => [kind, BASE_WEIGHTS[kind] + (mods.weights[kind] ?? 0)] as const)
  return weightedPick(rng, entries)
}

function scheduleMinutes(rng: Rng, count: number, forced: number[]): number[] {
  const minutes = new Set<number>(forced)
  let guard = 0
  while (minutes.size < count && guard < 500) {
    guard += 1
    const m = randomInt(rng, 4, 92)
    let tooClose = false
    for (const existing of minutes) if (Math.abs(existing - m) < 5) tooClose = true
    if (!tooClose) minutes.add(m)
  }
  return [...minutes].sort((a, b) => a - b)
}

const NEUTRAL_LINES = ['中场绞肉战，谁先犯错谁吃亏', '双方互相试探，球权来回交换', '一次长传被门将没收']
const AHEAD_LINES = ['我方控住节奏，倒脚消耗时间', '对手压上，后场留出大片空当', '边路连续传递，等待机会']
const BEHIND_LINES = ['比分落后，全队向前压', '中场抢断，需要更快的转换', '看台上开始躁动']

export function commentate(rng: Rng, minute: number, score: { us: number; them: number }): CommentaryLine {
  const diff = score.us - score.them
  const pool = diff > 0 ? AHEAD_LINES : diff < 0 ? BEHIND_LINES : NEUTRAL_LINES
  return { minute, text: pool[Math.floor(rng() * pool.length)], tone: 'neutral' }
}

export function buildMatch(run: RunState, stageIndex: number, opponent: Opponent): MatchState {
  const rng = mulberry32(run.seed + stageIndex * 7919 + 17)
  const mods = buildModifiers(run.traits, opponent, run.difficulty)
  const traitIds = run.traits

  const extraCount = Object.values(mods.extraMoments).reduce((s, n) => s + (n ?? 0), 0)
  const baseCount = randomInt(rng, 5, 7) + mods.momentCount
  const count = Math.min(11, baseCount + Math.min(3, Math.ceil(extraCount / 2)))
  const forced = bossGiftMinutes(opponent).filter((m) => m <= 88)
  const minutes = scheduleMinutes(rng, count, forced)

  const moments: MatchMoment[] = []
  let defensiveCount = 0

  minutes.forEach((minute, i) => {
    const isBossGift = forced.includes(minute)
    /* 每三个瞬间至少一个防守瞬间 */
    const attacking = isBossGift ? false : i % 3 !== 2
    if (!attacking) defensiveCount += 1
    const kind = isBossGift ? 'oneOnOne' : pickMomentKind(rng, mods, attacking)
    const attacker: 'us' | 'them' = attacking ? 'us' : 'them'
    const { scene } = buildScene(kind, attacker, rng)
    moments.push({
      minute,
      kind,
      attacker,
      scene,
      options: optionsFor(kind, attacker, traitIds),
      result: null,
    })
  })

  if (defensiveCount === 0 && moments.length > 2) {
    const idx = Math.floor(moments.length / 2)
    const { scene } = buildScene('counter', 'them', rng)
    moments[idx] = {
      minute: moments[idx].minute,
      kind: 'counter',
      attacker: 'them',
      scene,
      options: optionsFor('counter', 'them', traitIds),
      result: null,
    }
  }

  return {
    stageIndex,
    opponentId: opponent.id,
    clock: 0,
    score: { us: 0, them: 0 },
    moments,
    activeIndex: null,
    finished: false,
    shootout: null,
    stats: {
      shots: 0,
      goals: 0,
      worldies: 0,
      saves: 0,
      cards: 0,
      keyMoments: moments.length,
    },
    commentary: [{ minute: 0, text: `比赛开始：${opponent.name}`, tone: 'neutral' }],
    vars: {},
    lastResult: null,
    scorers: [],
  }
}

export function modifiersFor(run: RunState, opponentId: string): Modifiers {
  return buildModifiers(run.traits, getOpponent(opponentId), run.difficulty)
}

function makeContext(
  match: MatchState,
  kind: MomentKind,
  minute: number,
  isShootout: boolean,
  run: RunState,
): TraitContext {
  return {
    minute,
    scoreDiff: match.score.us - match.score.them,
    kind,
    isShootout,
    match,
    run,
  }
}

function cloneMatch(match: MatchState): MatchState {
  return {
    ...match,
    score: { ...match.score },
    stats: { ...match.stats },
    vars: { ...match.vars },
    commentary: [...match.commentary],
    moments: [...match.moments],
    scorers: [...match.scorers],
  }
}

export interface StepResult {
  state: MatchState
  result: MomentResult
}

export function chooseOption(run: RunState, match: MatchState, optionId: string): StepResult {
  if (match.activeIndex === null) throw new Error('没有等待中的关键瞬间')
  const moment = match.moments[match.activeIndex]
  const option = moment.options.find((o) => o.id === optionId) ?? moment.options[0]
  const opponent = getOpponent(match.opponentId)
  const mods = buildModifiers(run.traits, opponent, run.difficulty)
  const attacking = moment.attacker === 'us'

  const out = resolveMoment({
    kind: moment.kind,
    scene: moment.scene,
    attacker: moment.attacker,
    option,
    mods,
    traitIds: run.traits,
    ctx: makeContext(match, moment.kind, moment.minute, false, run),
  })

  const next = cloneMatch(match)
  next.activeIndex = null
  const result = applyOutcome(run, next, moment, option, out)
  next.moments[match.activeIndex] = { ...moment, result }
  next.lastResult = result
  return { state: next, result }
}

function applyOutcome(
  run: RunState,
  state: MatchState,
  moment: MatchMoment,
  option: MomentOption,
  out: ReturnType<typeof resolveMoment>,
): MomentResult {
  const team = getTeam(run.teamId)
  const minute = moment.minute
  let headline = ''
  let line = ''
  let scoredBy: 'us' | 'them' | null = null
  let outcome = out.outcome
  let scorer: string | undefined

  if (moment.attacker === 'us') {
    state.stats.shots += 1
    if (outcome === 'goal') {
      scoredBy = 'us'
      state.score.us += 1
      state.stats.goals += 1
      if (out.worldie) state.stats.worldies += 1
      scorer = scorerName(team, moment.kind, option, run)
      state.scorers.push(scorer)
      headline = out.worldie ? '世界波！' : '进球！'
      line = `${minute}' ${scorer} 把球送进网窝`
      state.commentary.push({ minute, text: `${scorer} 进球！`, tone: out.worldie ? 'epic' : 'good' })
      if (minute >= 85) state.vars.lateGoal = 1
      if (out.worldie) state.vars.crowdRoar = (state.vars.crowdRoar ?? 0) + 1
    } else if (outcome === 'saved') {
      headline = '被扑出'
      line = `${minute}' 门将把球挡出，看台一片叹息`
      state.commentary.push({ minute, text: '门将扑出了这一脚！', tone: 'bad' })
    } else if (outcome === 'post') {
      headline = '中柱！'
      line = `${minute}' 皮球砸在门柱上弹出`
      state.commentary.push({ minute, text: '门柱！差之毫厘', tone: 'bad' })
    } else {
      outcome = 'wide'
      headline = '射偏了'
      line = `${minute}' 球高出横梁，机会溜走`
      state.commentary.push({ minute, text: '打偏了', tone: 'bad' })
    }
  } else if (outcome === 'conceded') {
    scoredBy = 'them'
    state.score.them += 1
    headline = '丢球了'
    line = `${minute}' 对手把握住了这次机会`
    state.commentary.push({ minute, text: '对手进球了……', tone: 'bad' })
  } else if (option.action === 'foul') {
    state.stats.cards += 1
    headline = '战术犯规'
    line = out.card
      ? `${minute}' 你放倒了对手，${out.card === 'red' ? '红牌！' : '吃了一张黄牌'}`
      : `${minute}' 战术犯规成功打断反击，裁判没有出牌`
    outcome = 'card'
    state.commentary.push({ minute, text: '战术犯规，哨响了', tone: 'neutral' })
  } else {
    headline = '防下来了！'
    line = `${minute}' 你选择了正确的方式，反击被化解`
    state.stats.saves += 1
    state.commentary.push({ minute, text: '漂亮的防守！', tone: 'good' })
  }

  return {
    optionId: option.id,
    kind: moment.kind,
    outcome,
    scoredBy,
    worldie: out.worldie,
    card: out.card,
    headline,
    line,
    traitsFired: out.fired,
    minute,
    target: out.target,
    scorer,
  }
}

function scorerName(
  team: ReturnType<typeof getTeam>,
  kind: MomentKind,
  option: MomentOption,
  run: RunState,
): string {
  const keeper = team.players.find((p) => p.role === 'GK')
  if (kind === 'corner' && run.traits.includes('keeper_forward') && Math.random() < 0.25 && keeper) {
    return keeper.name
  }
  if (kind === 'corner' || (kind === 'freeKick' && option.id === 'cross')) {
    const tall = [...team.players].sort((a, b) => b.height - a.height)[0]
    return tall?.name ?? '队友'
  }
  const st = team.players.find((p) => p.role === 'ST' || p.role === 'W')
  return st?.name ?? '前锋'
}

/* ---------------- 点球大战 ---------------- */

export function startShootout(run: RunState, match: MatchState): MatchState {
  const next = cloneMatch(match)
  next.shootout = {
    rounds: Array.from({ length: 5 }, () => ({ ours: null, theirs: null })),
    ourGoals: 0,
    theirGoals: 0,
    turn: 'us',
    active: null,
    suddenDeath: false,
    finished: false,
  }
  next.activeIndex = null
  return prepareShootoutTurn(run, next)
}

function prepareShootoutTurn(run: RunState, match: MatchState): MatchState {
  if (!match.shootout) return match
  const shooter = match.shootout.turn
  const rng = mulberry32(run.seed + match.stageIndex * 13 + match.shootout.rounds.filter((r) => r.ours !== null || r.theirs !== null).length * 97)
  const { scene } = buildScene('penalty', shooter, rng)
  return {
    ...match,
    shootout: {
      ...match.shootout,
      active: { scene, options: optionsFor('penalty', shooter, run.traits) },
    },
  }
}

export interface ShootoutStep {
  state: MatchState
  result: MomentResult
  finished: boolean
  winner: 'us' | 'them' | null
}

export function shootoutKick(run: RunState, match: MatchState, optionId: string): ShootoutStep {
  if (!match.shootout || !match.shootout.active) throw new Error('点球大战未就绪')
  const shooter = match.shootout.turn
  const option =
    match.shootout.active.options.find((o) => o.id === optionId) ?? match.shootout.active.options[0]
  const opponent = getOpponent(match.opponentId)
  const mods = buildModifiers(run.traits, opponent, run.difficulty)
  const out = resolveMoment({
    kind: 'penalty',
    scene: match.shootout.active.scene,
    attacker: shooter,
    option,
    mods,
    traitIds: run.traits,
    ctx: makeContext(match, 'penalty', 120, true, run),
  })

  const state = cloneMatch(match)
  if (!state.shootout) throw new Error('点球大战未就绪')
  state.shootout = {
    ...state.shootout,
    rounds: state.shootout.rounds.map((r) => ({ ...r })),
    active: null,
  }
  const so = state.shootout
  const idx = so.rounds.findIndex((r) => (shooter === 'us' ? r.ours === null : r.theirs === null))
  const round = idx >= 0 ? idx : so.rounds.length - 1
  const kept = out.success
  if (shooter === 'us') {
    so.rounds[round].ours = kept
    if (kept) so.ourGoals += 1
  } else {
    so.rounds[round].theirs = !kept
    if (!kept) so.theirGoals += 1
  }
  if (round >= 5) so.suddenDeath = true

  const text =
    shooter === 'us' ? (kept ? '罚进！' : '被扑出了！') : kept ? '扑出来了！' : '对手罚进'
  state.commentary = [...state.commentary, { minute: 120, text, tone: kept ? 'good' : 'bad' }]

  const result: MomentResult = {
    optionId: option.id,
    kind: 'penalty',
    outcome:
      shooter === 'us' ? (kept ? 'goal' : 'saved') : kept ? 'defended' : 'conceded',
    scoredBy: shooter === 'us' && kept ? 'us' : shooter === 'them' && !kept ? 'them' : null,
    worldie: false,
    headline: shooter === 'us' ? (kept ? '罚进！' : '罚丢了') : kept ? '扑出来了！' : '被罚进',
    line: `点球大战 第 ${round + 1} 轮`,
    traitsFired: out.fired,
    minute: 120,
    target: out.target,
  }
  state.lastResult = result

  const decision = shootoutDecision(state)
  if (decision.finished) {
    so.finished = true
    state.finished = true
    return { state, result, finished: true, winner: decision.winner }
  }
  so.turn = shooter === 'us' ? 'them' : 'us'
  /* 五轮踢完仍未分胜负则进入突然死亡：继续加轮 */
  if (round >= 4 && so.turn === 'us') so.rounds.push({ ours: null, theirs: null })
  return { state: prepareShootoutTurn(run, state), result, finished: false, winner: null }
}

function shootoutDecision(match: MatchState): { finished: boolean; winner: 'us' | 'them' | null } {
  const so = match.shootout
  if (!so) return { finished: false, winner: null }
  const ourKicks = so.rounds.filter((r) => r.ours !== null).length
  const theirKicks = so.rounds.filter((r) => r.theirs !== null).length
  const remainingOurs = Math.max(0, 5 - ourKicks)
  const remainingTheirs = Math.max(0, 5 - theirKicks)

  if (ourKicks <= 5 && theirKicks <= 5) {
    if (so.ourGoals > so.theirGoals + remainingTheirs) return { finished: true, winner: 'us' }
    if (so.theirGoals > so.ourGoals + remainingOurs) return { finished: true, winner: 'them' }
  }
  if (ourKicks >= 5 && theirKicks >= 5 && ourKicks === theirKicks && so.ourGoals !== so.theirGoals) {
    return { finished: true, winner: so.ourGoals > so.theirGoals ? 'us' : 'them' }
  }
  return { finished: false, winner: null }
}

/* ---------------- 终场与简报 ---------------- */

export function highlightOf(match: MatchState): string {
  const results = match.moments.map((m) => m.result).filter((r): r is MomentResult => Boolean(r))
  if (results.length === 0) return '一场闷战，谁也没能创造出机会。'
  const worldie = results.find((r) => r.worldie && r.scoredBy === 'us')
  if (worldie) return `${worldie.minute}'，${worldie.scorer ?? '队友'} 用一记世界波点燃全场。`
  const dramatic = [...results].sort((a, b) => dramaScore(b) - dramaScore(a))[0]
  return dramatic.line
}

function dramaScore(r: MomentResult): number {
  let score = 0
  if (r.scoredBy === 'us') score += 10
  if (r.worldie) score += 8
  if (r.minute >= 85) score += 6
  if (r.scoredBy === 'them') score += 4
  if (r.outcome === 'post') score += 3
  return score
}
