import type { Opponent } from './types'

/* 8 场杯赛的对手。强度随阶段上升，决赛 Boss 带专属规则。 */

export interface Stage {
  index: number
  label: string
  phase: 'group' | 'knockout' | 'semi' | 'final'
  note: string
}

export const STAGES: Stage[] = [
  { index: 0, label: '小组赛 第 1 轮', phase: 'group', note: '热身' },
  { index: 1, label: '小组赛 第 2 轮', phase: 'group', note: '找节奏' },
  { index: 2, label: '小组赛 第 3 轮', phase: 'group', note: '出线' },
  { index: 3, label: '十六强', phase: 'knockout', note: '淘汰赛开始' },
  { index: 4, label: '八强', phase: 'knockout', note: '强度提升' },
  { index: 5, label: '四分之一决赛', phase: 'knockout', note: '硬仗' },
  { index: 6, label: '半决赛', phase: 'semi', note: '针对性极强' },
  { index: 7, label: '决赛', phase: 'final', note: 'Boss 级对手' },
]

export const OPPONENTS: Opponent[] = [
  {
    id: 'village',
    name: '麦田村队',
    short: '麦田村',
    note: '后防线站位很平，最怕被打身后',
    colors: { shirt: '#8aa44f', trim: '#f3f0df', shorts: '#4c5a2c', keeper: '#c9683f' },
    strength: 0.9,
    traits: [],
  },
  {
    id: 'harbor',
    name: '港湾工人',
    short: '港湾',
    note: '全队体能好，喜欢把人逼到边线',
    colors: { shirt: '#2b6f8f', trim: '#dfe9ef', shorts: '#173a4b', keeper: '#d4a13a' },
    strength: 1.0,
    traits: ['press_high'],
  },
  {
    id: 'coal',
    name: '煤矿铁人',
    short: '煤矿',
    note: '门将出击凶，禁区里人堆得密',
    colors: { shirt: '#3a3a3a', trim: '#c9a227', shorts: '#1c1c1c', keeper: '#7d4fb3' },
    strength: 1.08,
    traits: ['tall_centre_back'],
  },
  {
    id: 'counter',
    name: '反击学院',
    short: '反击学院',
    note: '擅长防反：一旦断球就是三打二',
    colors: { shirt: '#b03030', trim: '#f0e6d8', shorts: '#3b1414', keeper: '#3f8f6b' },
    strength: 1.16,
    traits: ['counter_hunter', 'gamble_offside'],
  },
  {
    id: 'machine',
    name: '钢铁机器',
    short: '钢铁机器',
    note: '定位球很强，角球几乎次次有威胁',
    colors: { shirt: '#5b6470', trim: '#e8edf2', shorts: '#2b3138', keeper: '#c8643a' },
    strength: 1.24,
    traits: ['corner_master', 'header_expert'],
  },
  {
    id: 'island',
    name: '孤岛海燕',
    short: '孤岛',
    note: '门将超强，近距离射门常被扑出',
    colors: { shirt: '#f0f0f0', trim: '#1f6feb', shorts: '#12203a', keeper: '#f0a92b' },
    strength: 1.32,
    traits: ['keeper_saint', 'leading_shield'],
  },
  {
    id: 'dynasty',
    name: '王朝旧部',
    short: '王朝',
    note: '半决赛对手：压迫与反击都精通，越到补时越狠',
    colors: { shirt: '#6b1f4f', trim: '#e8d3a0', shorts: '#2c0e21', keeper: '#3fa88f' },
    strength: 1.42,
    traits: ['press_high', 'counter_hunter', 'stoppage_king'],
  },
  {
    id: 'boss',
    name: '黑曜石俱乐部',
    short: '黑曜石',
    note: '决赛 Boss：门将如墙，且每 20 分钟自动获得一次单刀',
    colors: { shirt: '#141418', trim: '#c9a227', shorts: '#0a0a0c', keeper: '#b03a3a' },
    strength: 1.55,
    traits: ['keeper_saint', 'iron_wall', 'press_high'],
    bossRule: '门将扑救率 +30%；每 20 分钟对手自动获得一次单刀',
  },
]

export const OPPONENT_MAP: Record<string, Opponent> = Object.fromEntries(
  OPPONENTS.map((o) => [o.id, o]),
)

export function getOpponent(id: string): Opponent {
  return OPPONENT_MAP[id] ?? OPPONENTS[0]
}

export function opponentForStage(stageIndex: number): Opponent {
  return OPPONENTS[Math.min(stageIndex, OPPONENTS.length - 1)]
}
