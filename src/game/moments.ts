import { clamp, chance as roll, pickOne, randomInt, type Rng } from './rng'
import { dynamicBonus, defensiveBonus } from './modifiers'
import type {
  Modifiers,
  MomentKind,
  MomentOption,
  Scene,
  ScenePlayer,
  SceneTag,
  TraitContext,
} from './types'

/* 场景坐标：x 0→100 沿球场长度（我方进攻方向是 +x），y 0→68 横向。
   球门中心在 (100, 34)。高度用米。 */

export const GOAL = { x: 100, y: 34, halfWidth: 3.66, height: 2.44 }

const ROLE_NUMBERS = { GK: 1, DF: 4, MF: 8, W: 11, ST: 9 } as const

function p(
  team: 'us' | 'them',
  role: ScenePlayer['role'],
  n: number,
  x: number,
  y: number,
): ScenePlayer {
  return { id: `${team}-${role}-${n}`, team, role, number: ROLE_NUMBERS[role] + n, x, y }
}

/** 两队的阵型（场景坐标）。attack=true 表示我方压上进攻。 */
function formation(attack: boolean): { us: ScenePlayer[]; them: ScenePlayer[] } {
  const us: ScenePlayer[] = [
    p('us', 'GK', 0, attack ? 40 : 5, 34),
    p('us', 'DF', 0, attack ? 62 : 20, 12),
    p('us', 'DF', 1, attack ? 60 : 17, 28),
    p('us', 'DF', 2, attack ? 61 : 16, 42),
    p('us', 'DF', 3, attack ? 63 : 21, 56),
    p('us', 'MF', 0, attack ? 74 : 38, 22),
    p('us', 'MF', 1, attack ? 72 : 36, 44),
    p('us', 'W', 0, attack ? 82 : 46, 10),
    p('us', 'W', 1, attack ? 80 : 44, 58),
    p('us', 'ST', 0, attack ? 84 : 52, 34),
  ]
  const them: ScenePlayer[] = [
    p('them', 'GK', 0, attack ? 95 : 92, 34),
    p('them', 'DF', 0, attack ? 88 : 80, 16),
    p('them', 'DF', 1, attack ? 90 : 82, 30),
    p('them', 'DF', 2, attack ? 89 : 81, 40),
    p('them', 'DF', 3, attack ? 87 : 79, 54),
    p('them', 'MF', 0, attack ? 80 : 70, 24),
    p('them', 'MF', 1, attack ? 78 : 68, 46),
    p('them', 'MF', 2, attack ? 74 : 62, 34),
    p('them', 'W', 0, attack ? 66 : 54, 14),
    p('them', 'ST', 0, attack ? 60 : 46, 38),
  ]
  return { us, them }
}

function withTag(tags: SceneTag[], tag: SceneTag, on = true) {
  if (on && !tags.includes(tag)) tags.push(tag)
}

export interface SceneResult {
  scene: Scene
  /** 本次瞬间的进攻方（'us' 或 'them'） */
  attacker: 'us' | 'them'
}

export function buildScene(kind: MomentKind, attacker: 'us' | 'them', rng: Rng): SceneResult {
  const attack = attacker === 'us'
  const { us, them } = formation(attack)
  const tags: SceneTag[] = []
  let ball = { x: 50, y: 34 }
  let keeper = { x: 100, y: 34 }
  let players = [...us, ...them]

  switch (kind) {
    case 'oneOnOne': {
      /* 单刀：进攻方前锋与门将一对一。门将站位是核心信息。 */
      const lane = randomInt(rng, 18, 50)
      const rushed = roll(rng, 0.45)
      const keeperX = rushed ? 88 : 96
      if (attack) {
        players = players.map((pl) =>
          pl.id === 'us-ST-9' ? { ...pl, x: 76, y: lane } : pl,
        )
        keeper = { x: keeperX, y: 34 + randomInt(rng, -2, 2) }
        withTag(tags, rushed ? 'keeperRushed' : 'keeperOnLine', true)
        withTag(tags, 'keeperOnLine', !rushed)
        withTag(tags, 'defenderClosing', true)
        withTag(tags, 'teammateOpen', roll(rng, 0.6))
        players.push(p('us', 'MF', 2, 74, lane < 34 ? lane + 16 : lane - 16))
        players.push(p('them', 'DF', 4, 82, lane + randomInt(rng, -4, 4)))
      } else {
        players = players.map((pl) =>
          pl.id === 'them-ST-9' ? { ...pl, x: 24, y: lane } : pl,
        )
        keeper = { x: rushed ? 12 : 5, y: 34 }
        withTag(tags, rushed ? 'keeperRushed' : 'keeperOnLine', true)
        withTag(tags, 'defenderClosing', true)
        players.push(p('them', 'MF', 2, 26, lane < 34 ? lane + 16 : lane - 16))
        players.push(p('us', 'DF', 4, 18, lane + randomInt(rng, -4, 4)))
      }
      ball = { x: attack ? 76 : 24, y: lane }
      break
    }

    case 'freeKick': {
      /* 禁区前任意球：人墙紧密度与门将站位是信息 */
      const tight = roll(rng, 0.55)
      const lane = randomInt(rng, 26, 42)
      if (attack) {
        ball = { x: 76, y: lane }
        keeper = { x: 97, y: 34 }
        const wallCount = tight ? 5 : 3
        for (let i = 0; i < wallCount; i += 1) {
          players.push(p('them', 'MF', 10 + i, 84, lane - 3 + i * 1.6))
        }
        players.push(p('us', 'ST', 1, 90, 34))
        players.push(p('us', 'DF', 5, 88, 24))
        withTag(tags, tight ? 'wallTight' : 'wallLoose')
        withTag(tags, 'crowdedBox', roll(rng, 0.5))
      } else {
        ball = { x: 24, y: lane }
        keeper = { x: 3, y: 34 }
        const wallCount = tight ? 5 : 3
        for (let i = 0; i < wallCount; i += 1) {
          players.push(p('us', 'MF', 10 + i, 16, lane - 3 + i * 1.6))
        }
        withTag(tags, tight ? 'wallTight' : 'wallLoose')
      }
      break
    }

    case 'corner': {
      /* 角球：前后点是否被盯死是信息 */
      const left = roll(rng, 0.5)
      const cornerY = left ? 2 : 66
      ball = { x: attack ? 99 : 1, y: cornerY }
      const nearY = left ? 8 : 60
      const farY = left ? 58 : 10
      const nearCovered = roll(rng, 0.55)
      const farCovered = roll(rng, 0.45)
      if (attack) {
        keeper = { x: 96, y: left ? 28 : 40 }
        players.push(p('us', 'DF', 6, 92, nearY))
        players.push(p('us', 'ST', 2, 90, farY))
        players.push(p('us', 'MF', 3, 94, 34))
        players.push(p('them', 'DF', 6, 91, nearY))
        players.push(p('them', 'DF', 7, 89, farY))
        players.push(p('them', 'MF', 8, 95, left ? 14 : 54))
        withTag(tags, 'nearPostCovered', nearCovered)
        withTag(tags, 'farPostCovered', farCovered)
        withTag(tags, 'crowdedBox', true)
      } else {
        keeper = { x: 4, y: left ? 28 : 40 }
        players.push(p('them', 'DF', 6, 8, nearY))
        players.push(p('them', 'ST', 2, 10, farY))
        players.push(p('us', 'DF', 6, 9, nearY))
        players.push(p('us', 'DF', 7, 11, farY))
        withTag(tags, 'nearPostCovered', nearCovered)
        withTag(tags, 'farPostCovered', farCovered)
        withTag(tags, 'crowdedBox', true)
      }
      break
    }

    case 'counter': {
      /* 防守反击：我方以少防多。门将是否出击、回追人数是信息 */
      const lane = randomInt(rng, 20, 48)
      const deep = roll(rng, 0.6)
      ball = { x: 34, y: lane }
      keeper = { x: deep ? 5 : 14, y: 34 }
      withTag(tags, 'outnumbered', true)
      withTag(tags, deep ? 'keeperDeep' : 'keeperRushed')
      players = players.filter((pl) => !(pl.team === 'us' && pl.role === 'W'))
      players.push(p('them', 'ST', 3, 30, lane))
      players.push(p('them', 'W', 2, 26, lane < 34 ? lane + 14 : lane - 14))
      players.push(p('them', 'MF', 5, 40, 34))
      players.push(p('us', 'DF', 8, 24, lane + 3))
      if (roll(rng, 0.5)) players.push(p('us', 'DF', 9, 18, lane - 8))
      break
    }

    case 'penalty': {
      /* 点球：门将重心偏向是唯一的信息 */
      const lean = pickOne(rng, ['keeperLeansLeft', 'keeperLeansRight', 'keeperCentred'] as const)
      if (attack) {
        ball = { x: 88, y: 34 }
        keeper = { x: 100, y: 34 }
        withTag(tags, lean)
        players = players.filter((pl) => pl.role !== 'GK' || pl.team === 'them')
        players.push(p('us', 'ST', 4, 86, 34))
        players.forEach((pl) => {
          if (pl.team === 'us' && pl.role !== 'ST') pl.x = 60
          if (pl.team === 'them') pl.x = 96
        })
      } else {
        ball = { x: 12, y: 34 }
        keeper = { x: 0, y: 34 }
        withTag(tags, lean)
        players = players.filter((pl) => pl.role !== 'GK' || pl.team === 'us')
        players.push(p('them', 'ST', 4, 14, 34))
        players.forEach((pl) => {
          if (pl.team === 'them' && pl.role !== 'ST') pl.x = 40
          if (pl.team === 'us') pl.x = 6
        })
      }
      break
    }
  }

  return {
    scene: { kind, ball, keeper, players, tags },
    attacker,
  }
}

/* ---------------- 选项 ---------------- */

const OPTION_SETS: Record<MomentKind, MomentOption[]> = {
  oneOnOne: [
    { id: 'placed', label: '推远角', action: 'shot' },
    { id: 'chip', label: '挑射', action: 'shot', worldie: true },
    { id: 'square', label: '回传队友', action: 'pass' },
  ],
  freeKick: [
    { id: 'direct', label: '直接打门', action: 'shot', worldie: true },
    { id: 'tactic', label: '战术配合', action: 'pass' },
    { id: 'cross', label: '传中找头球', action: 'cross' },
  ],
  corner: [
    { id: 'near', label: '传前点', action: 'cross' },
    { id: 'far', label: '传后点', action: 'cross' },
    { id: 'short', label: '短角球配合', action: 'pass' },
  ],
  counter: [
    { id: 'foul', label: '战术犯规', action: 'foul' },
    { id: 'rush', label: '门将出击', action: 'rush' },
    { id: 'track', label: '回追夹防', action: 'track' },
  ],
  penalty: [
    { id: 'left', label: '罚左', action: 'shot' },
    { id: 'centre', label: '罚中', action: 'shot' },
    { id: 'right', label: '罚右', action: 'shot' },
  ],
}

/** 我方防守时的动作：同样只写动作，不给提示 */
const DEFENSIVE_SETS: Record<MomentKind, MomentOption[]> = {
  oneOnOne: [
    { id: 'rush', label: '门将出击', action: 'rush' },
    { id: 'track', label: '回追封堵', action: 'track' },
    { id: 'foul', label: '战术犯规', action: 'foul' },
  ],
  counter: [
    { id: 'foul', label: '战术犯规', action: 'foul' },
    { id: 'rush', label: '门将出击', action: 'rush' },
    { id: 'track', label: '回追夹防', action: 'track' },
  ],
  corner: [
    { id: 'near', label: '盯住前点', action: 'track' },
    { id: 'far', label: '盯住后点', action: 'track' },
    { id: 'rush', label: '门将摘球', action: 'rush' },
  ],
  freeKick: [
    { id: 'track', label: '人墙封堵', action: 'track' },
    { id: 'rush', label: '门将出击', action: 'rush' },
    { id: 'foul', label: '上抢犯规', action: 'foul' },
  ],
  penalty: [
    { id: 'saveLeft', label: '扑向左下角', action: 'track' },
    { id: 'saveCentre', label: '守中路', action: 'track' },
    { id: 'saveRight', label: '扑向右下角', action: 'track' },
  ],
}

export function optionsFor(
  kind: MomentKind,
  attacker: 'us' | 'them',
  traitIds: readonly string[],
): MomentOption[] {
  const options = attacker === 'us' ? OPTION_SETS[kind] : DEFENSIVE_SETS[kind]

  /* 一击制胜：只给一个选项，但成功率大幅提升 */
  if (attacker === 'us' && traitIds.includes('one_kick_win') && options.length > 1) {
    const aggressive = options.find((o) => o.action === 'shot') ?? options[0]
    return [aggressive]
  }
  return options
}

/* ---------------- 成功率与结果 ---------------- */

export interface ResolveInput {
  kind: MomentKind
  scene: Scene
  attacker: 'us' | 'them'
  option: MomentOption
  mods: Modifiers
  traitIds: readonly string[]
  ctx: TraitContext
}

export interface ResolveOutput {
  chance: number
  success: boolean
  worldie: boolean
  fired: string[]
  /** 球最终落点（场景坐标 + 高度） */
  target: { x: number; y: number; z: number }
  outcome: 'goal' | 'saved' | 'wide' | 'post' | 'blocked' | 'card' | 'defended'
  card?: 'yellow' | 'red'
}

interface Acc {
  base: number
  fired: string[]
}

function traitBonus(
  acc: Acc,
  traitIds: readonly string[],
  id: string,
  amount: number,
) {
  if (amount === 0) return
  if (!traitIds.includes(id)) return
  acc.base += amount
  if (!acc.fired.includes(id)) acc.fired.push(id)
}

export function resolveMoment(input: ResolveInput): ResolveOutput {
  const { kind, scene, attacker, option, mods, traitIds, ctx } = input
  const tags = new Set(scene.tags)
  const acc: Acc = { base: 0, fired: [] }
  const attacking = attacker === 'us'
  const isShootout = ctx.isShootout

  const shotMods = (worldie: boolean) => mods.shot + (worldie ? mods.worldie : 0)
  const isRush = option.action === 'rush'
  const isTrack = option.action === 'track'
  const isFoul = option.action === 'foul'

  if (attacking) {
    switch (kind) {
      case 'oneOnOne': {
        if (option.id === 'placed') {
          acc.base = 0.42
          if (tags.has('keeperOnLine')) acc.base += 0.22
          if (tags.has('keeperRushed')) acc.base -= 0.12
          traitBonus(acc, traitIds, 'one_on_one_king', 0.18)
          acc.base += mods.placed + shotMods(false)
        } else if (option.id === 'chip') {
          acc.base = 0.3
          if (tags.has('keeperRushed')) acc.base += 0.3
          if (tags.has('keeperOnLine')) acc.base -= 0.14
          traitBonus(acc, traitIds, 'one_on_one_king', 0.18)
          acc.base += mods.chip + shotMods(true)
        } else {
          acc.base = 0.38
          if (tags.has('teammateOpen') && tags.has('defenderClosing')) acc.base += 0.26
          if (!tags.has('teammateOpen')) acc.base -= 0.08
          traitBonus(acc, traitIds, 'one_on_one_king', 0.18)
          traitBonus(acc, traitIds, 'tiki_taka', 0.3)
          acc.base += mods.pass + mods.shot * 0.5
        }
        break
      }
      case 'freeKick': {
        if (option.id === 'direct') {
          acc.base = 0.22
          if (tags.has('wallLoose')) acc.base += 0.16
          if (tags.has('wallTight')) acc.base -= 0.1
          traitBonus(acc, traitIds, 'free_kick_artist', 0.3)
          acc.base += mods.freeKick + shotMods(true)
        } else if (option.id === 'tactic') {
          acc.base = 0.36
          if (tags.has('wallTight')) acc.base += 0.16
          traitBonus(acc, traitIds, 'tiki_taka', 0.3)
          acc.base += mods.pass + mods.freeKick * 0.4
        } else {
          acc.base = 0.34
          if (tags.has('crowdedBox')) acc.base += 0.12
          if (tags.has('keeperRushed')) acc.base -= 0.1
          traitBonus(acc, traitIds, 'header_expert', 0.2)
          traitBonus(acc, traitIds, 'tall_centre_back', 0.15)
          acc.base += mods.header + mods.cross + mods.freeKick * 0.3
        }
        break
      }
      case 'corner': {
        if (option.id === 'near') {
          acc.base = 0.3
          acc.base += tags.has('nearPostCovered') ? -0.18 : 0.24
          traitBonus(acc, traitIds, 'header_expert', 0.2)
          traitBonus(acc, traitIds, 'tall_centre_back', 0.15)
          traitBonus(acc, traitIds, 'keeper_forward', 0.25)
          acc.base += mods.header + mods.cross
        } else if (option.id === 'far') {
          acc.base = 0.3
          acc.base += tags.has('farPostCovered') ? -0.18 : 0.24
          traitBonus(acc, traitIds, 'header_expert', 0.2)
          traitBonus(acc, traitIds, 'far_post_specialist', 0.35)
          traitBonus(acc, traitIds, 'keeper_forward', 0.25)
          acc.base += mods.header + mods.cross
        } else {
          acc.base = 0.3
          if (tags.has('crowdedBox')) acc.base += 0.14
          traitBonus(acc, traitIds, 'tiki_taka', 0.3)
          acc.base += mods.pass + mods.cross * 0.5
        }
        break
      }
      case 'penalty': {
        const leanLeft = tags.has('keeperLeansLeft')
        const leanRight = tags.has('keeperLeansRight')
        const leanCentre = tags.has('keeperCentred')
        acc.base = option.id === 'centre' ? 0.6 : 0.66
        if (option.id === 'left') {
          if (leanLeft) acc.base -= 0.3
          if (leanRight) acc.base += 0.14
        } else if (option.id === 'right') {
          if (leanRight) acc.base -= 0.3
          if (leanLeft) acc.base += 0.14
        } else if (leanCentre) {
          acc.base -= 0.22
        } else {
          acc.base += 0.1
        }
        traitBonus(acc, traitIds, 'penalty_cold', 0.25)
        if (isShootout) traitBonus(acc, traitIds, 'shootout_nerve', 0.3)
        acc.base += mods.penalty + mods.shot * 0.6
        break
      }
      default:
        acc.base = 0.3
        break
    }
  } else {
    /* 防守瞬间：成功率 = 成功阻止对手得分 */
    switch (kind) {
      case 'counter': {
        if (isFoul) {
          acc.base = 0.66
          traitBonus(acc, traitIds, 'defence_first', 0.12)
          acc.base += mods.ourDefense * 0.4
        } else if (isRush) {
          acc.base = 0.5
          if (tags.has('keeperRushed')) acc.base += 0.18
          if (tags.has('keeperDeep')) acc.base -= 0.08
          traitBonus(acc, traitIds, 'keeper_saint', 0.2)
          acc.base += mods.ourKeeper
        } else {
          acc.base = 0.44
          if (!tags.has('outnumbered')) acc.base += 0.1
          traitBonus(acc, traitIds, 'defence_first', 0.2)
          acc.base += mods.ourDefense
        }
        acc.base -= mods.theirAttack * 0.6
        break
      }
      case 'oneOnOne': {
        /* 对手单刀：出击赌一把，回追靠站位 */
        if (isRush) {
          acc.base = 0.46
          if (tags.has('keeperRushed')) acc.base -= 0.14
          if (tags.has('keeperOnLine')) acc.base += 0.16
          traitBonus(acc, traitIds, 'keeper_saint', 0.2)
          acc.base += mods.ourKeeper
        } else if (isTrack) {
          acc.base = 0.42
          if (tags.has('defenderClosing')) acc.base += 0.1
          traitBonus(acc, traitIds, 'defence_first', 0.2)
          acc.base += mods.ourDefense
        } else {
          acc.base = 0.58
          traitBonus(acc, traitIds, 'defence_first', 0.12)
          acc.base += mods.ourDefense * 0.4
        }
        acc.base -= mods.theirAttack * 0.6
        break
      }
      case 'corner': {
        /* 对手角球：盯前点 / 盯后点 / 门将摘球 */
        if (option.id === 'near') {
          acc.base = 0.48
          acc.base += tags.has('nearPostCovered') ? 0.18 : -0.12
          acc.base += mods.ourDefense * 0.5
        } else if (option.id === 'far') {
          acc.base = 0.48
          acc.base += tags.has('farPostCovered') ? 0.18 : -0.12
          acc.base += mods.ourDefense * 0.5
        } else {
          acc.base = 0.44
          if (tags.has('crowdedBox')) acc.base -= 0.1
          traitBonus(acc, traitIds, 'keeper_saint', 0.2)
          acc.base += mods.ourKeeper
        }
        acc.base -= mods.theirAttack * 0.5
        break
      }
      case 'freeKick': {
        if (isTrack) {
          acc.base = 0.5
          if (tags.has('wallTight')) acc.base += 0.16
          if (tags.has('wallLoose')) acc.base -= 0.1
          acc.base += mods.ourDefense * 0.5
        } else if (isRush) {
          acc.base = 0.42
          traitBonus(acc, traitIds, 'keeper_saint', 0.2)
          acc.base += mods.ourKeeper
        } else {
          acc.base = 0.58
          acc.base += mods.ourDefense * 0.3
        }
        acc.base -= mods.theirAttack * 0.5
        break
      }
      case 'penalty': {
        acc.base = 0.32
        if (option.id === 'saveLeft') {
          if (tags.has('keeperLeansLeft')) acc.base += 0.18
          if (tags.has('keeperLeansRight')) acc.base -= 0.1
        } else if (option.id === 'saveRight') {
          if (tags.has('keeperLeansRight')) acc.base += 0.18
          if (tags.has('keeperLeansLeft')) acc.base -= 0.1
        } else if (tags.has('keeperCentred')) {
          acc.base += 0.14
        }
        traitBonus(acc, traitIds, 'keeper_saint', 0.2)
        if (isShootout) traitBonus(acc, traitIds, 'shootout_nerve', 0.2)
        acc.base += mods.ourKeeper * 0.7
        break
      }
      default:
        acc.base = 0.45
        break
    }
  }

  /* 局内动态条件（压哨、落后反扑、观众沸腾……） */
  const dyn = attacking
    ? dynamicBonus(traitIds, ctx, acc.base)
    : defensiveBonus(traitIds, ctx, acc.base)
  let raw = dyn.total
  /* 对方门将的稳健度会压缩我方进攻的成功率 */
  if (attacking) raw -= mods.theirKeeper
  const chance = clamp(raw, 0.05, 0.95)
  for (const id of dyn.fired) if (!acc.fired.includes(id)) acc.fired.push(id)

  const success = Math.random() < chance
  const worldie = Boolean(option.worldie) && success && attacking
  const outcome = pickOutcome(kind, attacker, option, success)
  const target = ballTarget(kind, attacker, option, outcome)

  let card: 'yellow' | 'red' | undefined
  if (isFoul && !mods.foulSafe) {
    card = Math.random() < 0.12 ? 'red' : 'yellow'
  }

  return { chance, success, worldie, fired: acc.fired, target, outcome, card }
}

function pickOutcome(
  kind: MomentKind,
  attacker: 'us' | 'them',
  option: MomentOption,
  success: boolean,
): ResolveOutput['outcome'] {
  const defending = attacker === 'them'
  if (defending) {
    if (kind === 'penalty') return success ? 'defended' : 'conceded'
    if (!success) return 'conceded'
    return option.action === 'foul' ? 'card' : 'defended'
  }
  if (!success) {
    const r = Math.random()
    if (r < 0.12) return 'post'
    if (r < 0.28) return 'blocked'
    return 'saved'
  }
  return 'goal'
}

function ballTarget(
  kind: MomentKind,
  attacker: 'us' | 'them',
  option: MomentOption,
  outcome: ResolveOutput['outcome'],
): { x: number; y: number; z: number } {
  /* 球门在场景坐标的固定一侧，落点用绝对坐标表示 */
  const goalX = attacker === 'us' ? 100 : 0
  const sideOf = (which: 'left' | 'right' | 'centre'): number => {
    /* 站在球门前看球门：左 = y 增大还是减小取决于进攻方向 */
    const sign = attacker === 'us' ? -1 : 1
    if (which === 'left') return 34 + 2.8 * sign
    if (which === 'right') return 34 - 2.8 * sign
    return 34
  }
  if (outcome === 'goal') {
    let which: 'left' | 'right' | 'centre' = 'centre'
    if (option.id === 'left' || option.id === 'near') which = 'left'
    else if (option.id === 'right' || option.id === 'far') which = 'right'
    return { x: goalX, y: sideOf(which), z: kind === 'corner' ? 1.9 : 0.9 }
  }
  if (outcome === 'post') return { x: goalX, y: 34 + 3.66, z: 2.3 }
  if (outcome === 'wide') return { x: goalX, y: 34 + 6.5, z: 3.2 }
  if (outcome === 'saved') {
    return { x: goalX - (attacker === 'us' ? 1.2 : -1.2), y: 34 + randomInt(Math.random, -3, 3), z: 1.4 }
  }
  return { x: goalX - (attacker === 'us' ? 6 : -6), y: 34 + randomInt(Math.random, -6, 6), z: 1 }
}
