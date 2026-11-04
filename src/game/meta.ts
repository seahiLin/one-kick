import { BASE_TRAIT_IDS, TRAITS, getTrait } from './traits'
import { TEAMS } from './teams'
import { STAGES } from './opponents'
import type { ClassicMoment, MetaSave, RunState, TraitCategory } from './types'

const STORAGE_KEY = 'one-kick.save.v1'

export interface Achievement {
  id: string
  name: string
  detail: string
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_win', name: '首胜', detail: '赢下第一场杯赛比赛' },
  { id: 'champion', name: '一脚封神', detail: '捧起杯赛冠军' },
  { id: 'worldie', name: '世界波', detail: '打进一记世界波' },
  { id: 'keeper_goal', name: '门将也疯狂', detail: '门将头球破门' },
  { id: 'shootout', name: '点球心跳', detail: '在点球大战中胜出' },
  { id: 'clean_sheet', name: '零封', detail: '一场比赛不丢球' },
  { id: 'late_winner', name: '补时绝杀', detail: '在 85 分钟之后打进制胜球' },
  { id: 'comeback', name: '大逆转', detail: '落后两球后完成逆转' },
  { id: 'streak5', name: '五连胜', detail: '一局里连赢 5 场' },
  { id: 'six_traits', name: '满格特性', detail: '凑齐 6 个特性' },
  { id: 'boss_down', name: '黑曜石终结者', detail: '击败决赛 Boss' },
  { id: 'hard_run', name: '硬核', detail: '在难度 2 以上赢下一场' },
]

export const ACHIEVEMENT_MAP: Record<string, Achievement> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
)

export function defaultSave(): MetaSave {
  return {
    version: 1,
    teams: [],
    traits: [],
    difficulty: 0,
    achievements: [],
    classic: [],
    stats: { runs: 0, wins: 0, titles: 0, worldies: 0, bestStage: 0 },
  }
}

export function loadSave(): MetaSave {
  if (typeof localStorage === 'undefined') return defaultSave()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultSave()
    const parsed = JSON.parse(raw) as Partial<MetaSave>
    const base = defaultSave()
    return {
      ...base,
      ...parsed,
      teams: Array.isArray(parsed.teams) ? parsed.teams : [],
      traits: Array.isArray(parsed.traits) ? parsed.traits : [],
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
      classic: Array.isArray(parsed.classic) ? parsed.classic : [],
      stats: { ...base.stats, ...(parsed.stats ?? {}) },
    }
  } catch {
    return defaultSave()
  }
}

export function writeSave(save: MetaSave): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save))
  } catch {
    /* 存不了就算了，游戏本身仍然可玩 */
  }
}

export function resetSave(): MetaSave {
  const fresh = defaultSave()
  writeSave(fresh)
  return fresh
}

/* ---------------- 解锁池 ---------------- */

/** 当前局可用的特性 id（默认解锁 + 已解锁） */
export function availableTraitIds(save: MetaSave): string[] {
  const set = new Set(BASE_TRAIT_IDS)
  for (const id of save.traits) if (getTrait(id)) set.add(id)
  return [...set]
}

export function lockedTraits(save: MetaSave): string[] {
  const unlocked = new Set(availableTraitIds(save))
  return TRAITS.filter((t) => !unlocked.has(t.id)).map((t) => t.id)
}

export function unlockedTeams(save: MetaSave): string[] {
  return TEAMS.filter((t) => t.unlock?.kind === 'always' || save.teams.includes(t.id)).map((t) => t.id)
}

export const MAX_DIFFICULTY = 3

export const DIFFICULTY_INFO = [
  { level: 0, name: '常规', note: '标准对手强度' },
  { level: 1, name: '强硬', note: '对手门将更稳，刷新次数减少为 1 次' },
  { level: 2, name: '残酷', note: '对手每场多一次反击，特性池更少' },
  { level: 3, name: '神话', note: '对手强度全面上升，奖励刷新取消' },
]

export function difficultyModifiers(level: number): {
  keeperBonus: number
  attackBonus: number
  rerolls: number
} {
  return {
    keeperBonus: level * 0.06,
    attackBonus: level * 0.05,
    rerolls: level >= 3 ? 0 : level >= 1 ? 1 : 1,
  }
}

/* ---------------- 结算与解锁 ---------------- */

export interface RunSummary {
  save: MetaSave
  newTraits: string[]
  newTeams: string[]
  newAchievements: string[]
  unlockedDifficulty: number | null
  classic: ClassicMoment[]
}

function addUnique(list: string[], id: string): boolean {
  if (list.includes(id)) return false
  list.push(id)
  return true
}

/** 一局结束（出局或夺冠）后调用，返回更新后的存档与本次新解锁的内容 */
export function settleRun(run: RunState, saveIn: MetaSave): RunSummary {
  const save: MetaSave = {
    ...saveIn,
    teams: [...saveIn.teams],
    traits: [...saveIn.traits],
    achievements: [...saveIn.achievements],
    classic: [...saveIn.classic],
    stats: { ...saveIn.stats },
  }
  const newTraits: string[] = []
  const newTeams: string[] = []
  const newAchievements: string[] = []
  const classic: ClassicMoment[] = []

  save.stats.runs += 1
  save.stats.wins += run.wins
  save.stats.worldies += run.totals.worldies
  save.stats.bestStage = Math.max(save.stats.bestStage, run.history.length)

  const champion = run.status === 'champion'
  if (champion) save.stats.titles += 1

  const unlockAch = (id: string) => {
    if (addUnique(save.achievements, id)) newAchievements.push(id)
  }

  if (run.wins >= 1) unlockAch('first_win')
  if (champion) unlockAch('champion')
  if (run.totals.worldies > 0) unlockAch('worldie')
  if (run.totals.keeperGoals > 0) unlockAch('keeper_goal')
  if (run.history.some((h) => h.shootout && h.won)) unlockAch('shootout')
  if (run.totals.cleanSheets > 0) unlockAch('clean_sheet')
  if (run.totals.lateWinners > 0) unlockAch('late_winner')
  if (run.totals.comebacks > 0) unlockAch('comeback')
  if (run.wins >= 5) unlockAch('streak5')
  if (run.traits.length >= 6) unlockAch('six_traits')
  if (run.history.some((h) => h.opponentId === 'boss' && h.won)) unlockAch('boss_down')
  if (run.difficulty >= 2 && run.wins >= 1) unlockAch('hard_run')

  /* 新特性：每赢 2 场随机解锁 1 个未解锁特性；夺冠额外解锁 2 个 */
  const locked = lockedTraits(save)
  const unlockCount = Math.floor(run.wins / 2) + (champion ? 2 : 0)
  for (let i = 0; i < unlockCount && locked.length > 0; i += 1) {
    const pick = locked.splice(Math.floor(Math.random() * locked.length), 1)[0]
    if (addUnique(save.traits, pick)) newTraits.push(pick)
  }

  /* 新球队 */
  for (const team of TEAMS) {
    if (!team.unlock || team.unlock.kind === 'always') continue
    if (save.teams.includes(team.id)) continue
    if (teamUnlockSatisfied(team.unlock, run, save)) {
      if (addUnique(save.teams, team.id)) newTeams.push(team.id)
    }
  }

  /* 难度解锁：夺冠后开放下一档 */
  let unlockedDifficulty: number | null = null
  if (champion && save.difficulty < MAX_DIFFICULTY) {
    save.difficulty += 1
    unlockedDifficulty = save.difficulty
  }

  /* 经典时刻：从本局里挑出最有故事性的瞬间 */
  const moments = collectClassicMoments(run)
  for (const m of moments) {
    if (save.classic.some((c) => c.id === m.id)) continue
    save.classic.push(m)
    classic.push(m)
  }
  save.classic = save.classic.slice(-40)

  writeSave(save)
  return { save, newTraits, newTeams, newAchievements, unlockedDifficulty, classic }
}

function teamUnlockSatisfied(
  rule: NonNullable<(typeof TEAMS)[number]['unlock']>,
  run: RunState,
  save: MetaSave,
): boolean {
  switch (rule.kind) {
    case 'champion':
      return run.status === 'champion'
    case 'championStyle': {
      if (run.status !== 'champion') return false
      return run.traits.some((id) => getTrait(id)?.category === (rule.style as TraitCategory))
    }
    case 'championWithTrait':
      return run.status === 'champion' && run.traits.includes(rule.traitId)
    case 'totalWins':
      return save.stats.wins >= rule.wins
    default:
      return false
  }
}

function collectClassicMoments(run: RunState): ClassicMoment[] {
  const out: ClassicMoment[] = []
  const now = Date.now()
  const stamp = `${run.seed}`
  const match = run.match
  if (match) {
    const results = match.moments
      .map((m) => m.result)
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
    const ours = results.filter((r) => r.scoredBy === 'us')
    const late = ours.filter((r) => r.minute >= 85)
    if (late.length >= 2) {
      out.push({
        id: `late-double-${stamp}`,
        title: '补时连进',
        detail: `${late.map((r) => `${r.minute}'`).join(' / ')} 连续破门`,
        at: now,
      })
    }
    const worldie = ours.find((r) => r.worldie)
    if (worldie) {
      out.push({
        id: `worldie-${stamp}`,
        title: '世界波',
        detail: `${worldie.minute}' ${worldie.scorer ?? '队友'} ${worldie.headline}`,
        at: now,
      })
    }
    const keeper = ours.find((r) => r.kind === 'corner' && r.scorer?.includes('门将'))
    if (keeper) {
      out.push({
        id: `keeper-goal-${stamp}`,
        title: '门将破门',
        detail: `${keeper.minute}' ${keeper.scorer} 头球破门`,
        at: now,
      })
    }
    if (match.shootout?.finished && run.status !== 'eliminated') {
      out.push({
        id: `shootout-${stamp}`,
        title: '点球大战过关',
        detail: `点球 ${match.shootout.ourGoals}:${match.shootout.theirGoals}`,
        at: now,
      })
    }
  }
  if (run.status === 'champion') {
    out.push({
      id: `champion-${stamp}`,
      title: '一脚封神',
      detail: `用 ${run.traits.length} 个特性捧起冠军`,
      at: now,
    })
  }
  return out
}

/* ---------------- 总览统计 ---------------- */

export function collectionProgress(save: MetaSave): {
  traits: { unlocked: number; total: number }
  teams: { unlocked: number; total: number }
  achievements: { unlocked: number; total: number }
  stages: { unlocked: number; total: number }
} {
  const teamsUnlocked = TEAMS.filter((t) => t.unlock?.kind === 'always' || save.teams.includes(t.id)).length
  return {
    traits: { unlocked: availableTraitIds(save).length, total: TRAITS.length },
    teams: { unlocked: teamsUnlocked, total: TEAMS.length },
    achievements: { unlocked: save.achievements.length, total: ACHIEVEMENTS.length },
    stages: { unlocked: Math.min(STAGES.length, save.stats.bestStage + 1), total: STAGES.length },
  }
}
