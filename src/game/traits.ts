import type { Trait, TraitCategory } from './types'

/* 特性池。稀有度只影响出现概率与强度，不影响解锁。
   base: true 的特性开局就在池里；其余需要局外解锁。 */

export const TRAITS: Trait[] = [
  /* ---------- 提升成功率 ---------- */
  {
    id: 'header_expert',
    name: '头球专家',
    rarity: 'common',
    category: 'success',
    icon: '🗿',
    text: '角球与传中的头球进球率 +20%',
    base: true,
  },
  {
    id: 'corner_master',
    name: '角球大师',
    rarity: 'common',
    category: 'chance',
    icon: '🚩',
    text: '每场多 2 次角球',
    base: true,
  },
  {
    id: 'far_post_specialist',
    name: '后点之王',
    rarity: 'rare',
    category: 'success',
    icon: '🎯',
    text: '角球传后点的进球率 +35%',
  },
  {
    id: 'free_kick_artist',
    name: '任意球艺术家',
    rarity: 'rare',
    category: 'success',
    icon: '🌀',
    text: '任意球直接打门进球率 +30%',
  },
  {
    id: 'one_on_one_king',
    name: '单刀之王',
    rarity: 'common',
    category: 'success',
    icon: '⚡',
    text: '单刀瞬间所有选择进球率 +18%',
    base: true,
  },
  {
    id: 'penalty_cold',
    name: '大心脏',
    rarity: 'common',
    category: 'success',
    icon: '🫀',
    text: '点球进球率 +25%',
    base: true,
  },
  {
    id: 'long_shot_expert',
    name: '远射专家',
    rarity: 'rare',
    category: 'success',
    icon: '💥',
    text: '世界波（挑射、远射）进球率 +25%',
    base: true,
  },
  {
    id: 'tall_centre_back',
    name: '高个中卫',
    rarity: 'rare',
    category: 'rule',
    icon: '📏',
    text: '角球时禁区里多一个高点：头球 +15%，多 1 次角球',
  },

  /* ---------- 增加机会 ---------- */
  {
    id: 'press_high',
    name: '高位逼抢',
    rarity: 'common',
    category: 'chance',
    icon: '🐝',
    text: '每场多 1 次单刀机会',
    base: true,
  },
  {
    id: 'counter_hunter',
    name: '反击猎手',
    rarity: 'common',
    category: 'chance',
    icon: '🏹',
    text: '每场多 1 次点球机会',
  },
  {
    id: 'wing_back_overload',
    name: '边路超载',
    rarity: 'rare',
    category: 'chance',
    icon: '🛰️',
    text: '每场多 2 次任意球机会，任意球 +10%',
  },

  /* ---------- 条件触发 ---------- */
  {
    id: 'stoppage_king',
    name: '压哨之王',
    rarity: 'legendary',
    category: 'condition',
    icon: '⏱️',
    text: '最后 10 分钟射门进球率翻倍',
    base: true,
  },
  {
    id: 'comeback_fighter',
    name: '落后反扑',
    rarity: 'rare',
    category: 'condition',
    icon: '🔥',
    text: '每落后 1 球，全队进球率 +10%',
    base: true,
  },
  {
    id: 'crowd_roar',
    name: '观众沸腾',
    rarity: 'rare',
    category: 'condition',
    icon: '📣',
    text: '每进一个世界波，下一次射门进球率 +15%',
  },
  {
    id: 'leading_shield',
    name: '领先专家',
    rarity: 'common',
    category: 'condition',
    icon: '🛡️',
    text: '领先时我方门将扑救率 +12%',
  },
  {
    id: 'first_blood',
    name: '首开纪录',
    rarity: 'common',
    category: 'condition',
    icon: '🥇',
    text: '0:0 时的射门进球率 +20%',
  },
  {
    id: 'shootout_nerve',
    name: '点球大战老手',
    rarity: 'rare',
    category: 'condition',
    icon: '🧊',
    text: '点球大战中进球率 +30%，扑救率 +20%',
  },

  /* ---------- 规则改变 ---------- */
  {
    id: 'keeper_forward',
    name: '门将前锋',
    rarity: 'legendary',
    category: 'rule',
    icon: '🧤',
    text: '门将参与角球争顶：角球进球率 +25%，并可由门将顶进',
    base: true,
  },
  {
    id: 'keeper_penalty_taker',
    name: '门将主罚',
    rarity: 'legendary',
    category: 'rule',
    icon: '🎪',
    text: '点球大战中门将亲自罚球，进球率 +20%',
  },
  {
    id: 'tiki_taka',
    name: '传控足球',
    rarity: 'rare',
    category: 'rule',
    icon: '🧩',
    text: '回传与配合类选择进球率 +30%，每场多 1 次关键瞬间',
  },

  /* ---------- 防守 ---------- */
  {
    id: 'iron_wall',
    name: '铁桶阵',
    rarity: 'common',
    category: 'defense',
    icon: '🧱',
    text: '领先时对手进球率 -15%',
    base: true,
  },
  {
    id: 'keeper_saint',
    name: '门将神扑',
    rarity: 'rare',
    category: 'defense',
    icon: '🙌',
    text: '我方门将扑救率 +20%',
    base: true,
  },
  {
    id: 'defence_first',
    name: '防守至上',
    rarity: 'common',
    category: 'defense',
    icon: '🧯',
    text: '防守瞬间的封堵成功率 +20%',
  },
  {
    id: 'tactical_foul_license',
    name: '犯规豁免',
    rarity: 'rare',
    category: 'defense',
    icon: '🟨',
    text: '战术犯规不会吃牌',
  },

  /* ---------- 风险换收益 ---------- */
  {
    id: 'all_out',
    name: '全攻全守',
    rarity: 'rare',
    category: 'risk',
    icon: '⚔️',
    text: '我方进球率 +25%，对手进球率也 +15%',
    base: true,
  },
  {
    id: 'gamble_offside',
    name: '造越位',
    rarity: 'common',
    category: 'risk',
    icon: '📐',
    text: '对手单刀与反击进球率 -25%，我方单刀进球率 +10%',
  },
  {
    id: 'one_kick_win',
    name: '一击制胜',
    rarity: 'legendary',
    category: 'risk',
    icon: '👑',
    text: '每次关键瞬间只有一脚机会，但进球率 +35%，1:0 取胜时额外奖励',
  },
]

export const TRAIT_MAP: Record<string, Trait> = Object.fromEntries(TRAITS.map((t) => [t.id, t]))

export function getTrait(id: string): Trait | undefined {
  return TRAIT_MAP[id]
}

export const RARITY_LABEL: Record<Trait['rarity'], string> = {
  common: '普通',
  rare: '稀有',
  legendary: '传奇',
}

export const RARITY_COLOR: Record<Trait['rarity'], string> = {
  common: 'text-stone-200 border-stone-500/60',
  rare: 'text-sky-200 border-sky-400/70',
  legendary: 'text-amber-200 border-amber-400/80',
}

export const CATEGORY_LABEL: Record<TraitCategory, string> = {
  success: '提升成功率',
  chance: '增加机会',
  condition: '条件触发',
  rule: '规则改变',
  defense: '防守',
  risk: '风险换收益',
}

export const BASE_TRAIT_IDS = TRAITS.filter((t) => t.base).map((t) => t.id)
