import { getTrait } from './traits'
import type { Modifiers, MomentKind, Opponent, RunState, TraitContext } from './types'

export function emptyModifiers(): Modifiers {
  return {
    shot: 0,
    placed: 0,
    chip: 0,
    power: 0,
    header: 0,
    freeKick: 0,
    penalty: 0,
    cross: 0,
    pass: 0,
    worldie: 0,
    theirKeeper: 0,
    theirAttack: 0,
    ourKeeper: 0,
    ourDefense: 0,
    extraMoments: {},
    weights: {},
    momentCount: 0,
    foulSafe: false,
    keeperJoinsCorner: false,
    keeperTakesPenalty: false,
  }
}

function addExtra(mods: Modifiers, kind: MomentKind, n: number) {
  mods.extraMoments[kind] = (mods.extraMoments[kind] ?? 0) + n
}

function addWeight(mods: Modifiers, kind: MomentKind, w: number) {
  mods.weights[kind] = (mods.weights[kind] ?? 0) + w
}

/**
 * 把特性 id 列表折算成一组静态修正值。
 * 只在开局、选完特性后调用一次；局内动态条件由 dynamicBonus 处理。
 */
export function buildModifiers(
  traitIds: readonly string[],
  opponent: Opponent,
  difficulty = 0,
): Modifiers {
  const mods = emptyModifiers()

  for (const id of traitIds) {
    const trait = getTrait(id)
    if (!trait) continue
    switch (id) {
      case 'header_expert':
        mods.header += 0.2
        break
      case 'corner_master':
        addExtra(mods, 'corner', 2)
        addWeight(mods, 'corner', 0.8)
        break
      case 'far_post_specialist':
        mods.header += 0.1
        mods.cross += 0.2
        break
      case 'free_kick_artist':
        mods.freeKick += 0.3
        break
      case 'one_on_one_king':
        mods.placed += 0.18
        mods.chip += 0.18
        mods.pass += 0.18
        break
      case 'penalty_cold':
        mods.penalty += 0.25
        break
      case 'long_shot_expert':
        mods.worldie += 0.25
        mods.power += 0.1
        break
      case 'tall_centre_back':
        mods.header += 0.15
        addExtra(mods, 'corner', 1)
        break
      case 'press_high':
        addExtra(mods, 'oneOnOne', 1)
        break
      case 'counter_hunter':
        addExtra(mods, 'penalty', 1)
        break
      case 'wing_back_overload':
        addExtra(mods, 'freeKick', 2)
        mods.freeKick += 0.1
        break
      case 'comeback_fighter':
        mods.shot += 0.05
        break
      case 'crowd_roar':
        mods.shot += 0.02
        break
      case 'leading_shield':
        mods.ourKeeper += 0.06
        break
      case 'shootout_nerve':
        mods.penalty += 0.1
        mods.ourKeeper += 0.08
        break
      case 'keeper_forward':
        mods.keeperJoinsCorner = true
        mods.header += 0.25
        break
      case 'keeper_penalty_taker':
        mods.keeperTakesPenalty = true
        break
      case 'tiki_taka':
        mods.pass += 0.3
        mods.momentCount += 1
        break
      case 'keeper_saint':
        mods.ourKeeper += 0.2
        break
      case 'defence_first':
        mods.ourDefense += 0.2
        break
      case 'tactical_foul_license':
        mods.foulSafe = true
        break
      case 'all_out':
        mods.shot += 0.25
        mods.theirAttack += 0.15
        break
      case 'gamble_offside':
        mods.ourDefense += 0.25
        mods.theirAttack -= 0.25
        mods.placed += 0.1
        break
      case 'one_kick_win':
        mods.shot += 0.35
        mods.theirKeeper -= 0.05
        break
      case 'stoppage_king':
      case 'first_blood':
        break
      default:
        break
    }
  }

  /* 对手特性：削弱我方、增强对方 */
  for (const id of opponent.traits) {
    switch (id) {
      case 'press_high':
        addExtra(mods, 'oneOnOne', 1)
        break
      case 'counter_hunter':
        addExtra(mods, 'counter', 1)
        break
      case 'gamble_offside':
        mods.ourDefense += 0.15
        break
      case 'tall_centre_back':
        mods.theirKeeper += 0.05
        break
      case 'corner_master':
        addExtra(mods, 'corner', 1)
        mods.theirKeeper += 0.08
        break
      case 'header_expert':
        mods.theirKeeper += 0.1
        break
      case 'keeper_saint':
        mods.theirKeeper += 0.2
        break
      case 'leading_shield':
        mods.theirKeeper += 0.05
        break
      case 'iron_wall':
        mods.shot -= 0.05
        break
      case 'stoppage_king':
        mods.theirAttack += 0.08
        break
      default:
        break
    }
  }

  /* 对手整体强度与难度：对方门将更稳、我方门将更吃力 */
  const gap = (opponent.strength - 1) * 0.4
  mods.theirKeeper += gap + difficulty * 0.06
  mods.theirAttack += gap * 0.6 + difficulty * 0.05

  return mods
}

/** 决赛 Boss 专属规则：每 20 分钟自动送一次单刀 */
export function bossGiftMinutes(opponent: Opponent): number[] {
  return opponent.bossRule ? [20, 40, 60, 80] : []
}

/** 局内动态条件加成（依赖分钟、比分、本场状态） */
export function dynamicBonus(
  traitIds: readonly string[],
  ctx: TraitContext,
  base: number,
): { total: number; fired: string[] } {
  let bonus = 0
  const fired: string[] = []

  const add = (id: string, amount: number) => {
    if (amount === 0) return
    bonus += amount
    if (!fired.includes(id)) fired.push(id)
  }

  for (const id of traitIds) {
    switch (id) {
      case 'stoppage_king':
        if (ctx.minute >= 80) add(id, base)
        break
      case 'comeback_fighter': {
        const behind = Math.max(0, -ctx.scoreDiff)
        if (behind > 0) add(id, base * 0.1 * behind)
        break
      }
      case 'crowd_roar': {
        const stack = ctx.match.vars.crowdRoar ?? 0
        if (stack > 0) add(id, base * 0.15 * stack)
        break
      }
      case 'first_blood':
        if (ctx.scoreDiff === 0 && ctx.match.stats.goals === 0) add(id, base * 0.2)
        break
      case 'shootout_nerve':
        if (ctx.isShootout) add(id, base * 0.3)
        break
      default:
        break
    }
  }

  return { total: base + bonus, fired }
}

/** 防守瞬间专用：判断我方扑救/封堵成功率 */
export function defensiveBonus(
  traitIds: readonly string[],
  ctx: TraitContext,
  base: number,
): { total: number; fired: string[] } {
  let bonus = 0
  const fired: string[] = []

  const add = (id: string, amount: number) => {
    if (amount === 0) return
    bonus += amount
    if (!fired.includes(id)) fired.push(id)
  }

  for (const id of traitIds) {
    switch (id) {
      case 'iron_wall':
        if (ctx.scoreDiff > 0) add(id, base * 0.15)
        break
      case 'leading_shield':
        if (ctx.scoreDiff > 0) add(id, base * 0.12)
        break
      case 'shootout_nerve':
        if (ctx.isShootout) add(id, base * 0.2)
        break
      default:
        break
    }
  }

  return { total: Math.min(0.95, base + bonus), fired }
}

export function activeTraitIds(run: RunState): string[] {
  return run.traits
}
