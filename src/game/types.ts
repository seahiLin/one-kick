/* 《一脚封神》核心类型定义。
   逻辑层完全独立于界面：这里只有纯数据，没有 React 与 Three.js。 */

export type Role = 'GK' | 'DF' | 'MF' | 'W' | 'ST'

export interface Player {
  name: string
  role: Role
  number: number
  /** 身高（厘米），用于头球判定 */
  height: number
}

export interface TeamColors {
  shirt: string
  trim: string
  shorts: string
  keeper: string
}

export interface Team {
  id: string
  name: string
  tagline: string
  /** 打法流派说明，开局选队时展示 */
  style: string
  colors: TeamColors
  players: Player[]
  starterTrait: string
  /** 解锁条件说明；null 表示初始可用 */
  unlock: UnlockRule | null
}

export type UnlockRule =
  | { kind: 'always' }
  | { kind: 'champion' }
  | { kind: 'championStyle'; style: TraitCategory }
  | { kind: 'championWithTrait'; traitId: string }
  | { kind: 'totalWins'; wins: number }

/* ---------------- 关键瞬间 ---------------- */

export type MomentKind = 'oneOnOne' | 'freeKick' | 'corner' | 'counter' | 'penalty'

export type SceneTag =
  | 'keeperRushed'
  | 'keeperOnLine'
  | 'nearPostCovered'
  | 'farPostCovered'
  | 'defenderClosing'
  | 'teammateOpen'
  | 'wallTight'
  | 'wallLoose'
  | 'crowdedBox'
  | 'outnumbered'
  | 'keeperDeep'
  | 'keeperLeansLeft'
  | 'keeperLeansRight'
  | 'keeperCentred'

export interface ScenePlayer {
  id: string
  team: 'us' | 'them'
  role: Role
  number: number
  /** 球场坐标：x 沿球场长度 0→100（我方进攻方向），y 横向 0→68 */
  x: number
  y: number
}

export interface Scene {
  kind: MomentKind
  ball: { x: number; y: number }
  /** 被攻击的门将（进攻瞬间是对方门将，防守瞬间是我方门将） */
  keeper: { x: number; y: number }
  players: ScenePlayer[]
  tags: SceneTag[]
}

export interface MomentOption {
  id: string
  label: string
  action: 'shot' | 'pass' | 'cross' | 'foul' | 'rush' | 'track'
  /** 高难度动作，打进算世界波 */
  worldie?: boolean
}

export type OutcomeKind =
  | 'goal'
  | 'saved'
  | 'wide'
  | 'blocked'
  | 'card'
  | 'conceded'
  | 'defended'
  | 'post'

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface MomentResult {
  optionId: string
  kind: MomentKind
  outcome: OutcomeKind
  /** 谁进球；没有进球为 null */
  scoredBy: 'us' | 'them' | null
  worldie: boolean
  card?: 'yellow' | 'red'
  headline: string
  line: string
  traitsFired: string[]
  minute: number
  /** 球的落点，供 3D 播放动画 */
  target: Vec3
  /** 进球者姓名，用于简报 */
  scorer?: string
}

export interface MatchMoment {
  minute: number
  kind: MomentKind
  /** 'us' 表示我方进攻；'them' 表示我方防守 */
  attacker: 'us' | 'them'
  scene: Scene
  options: MomentOption[]
  result: MomentResult | null
}

export interface CommentaryLine {
  minute: number
  text: string
  tone: 'neutral' | 'good' | 'bad' | 'epic'
}

export interface ShootoutState {
  /** 每轮：我方是否罚进、对方是否罚进 */
  rounds: { ours: boolean | null; theirs: boolean | null }[]
  ourGoals: number
  theirGoals: number
  turn: 'us' | 'them'
  active: { scene: Scene; options: MomentOption[] } | null
  suddenDeath: boolean
  finished: boolean
}

export interface MatchStats {
  shots: number
  goals: number
  worldies: number
  saves: number
  cards: number
  keyMoments: number
}

export interface MatchState {
  stageIndex: number
  opponentId: string
  clock: number
  score: { us: number; them: number }
  moments: MatchMoment[]
  /** 当前等待选择的关键瞬间下标 */
  activeIndex: number | null
  finished: boolean
  shootout: ShootoutState | null
  stats: MatchStats
  commentary: CommentaryLine[]
  vars: Record<string, number>
  lastResult: MomentResult | null
  /** 本场进球者（我方），用于赛后简报 */
  scorers: string[]
}

/* ---------------- 特性 ---------------- */

export type Rarity = 'common' | 'rare' | 'legendary'

export type TraitCategory =
  | 'success'
  | 'chance'
  | 'condition'
  | 'rule'
  | 'defense'
  | 'risk'

export interface Trait {
  id: string
  name: string
  rarity: Rarity
  category: TraitCategory
  icon: string
  text: string
  /** 默认解锁；false 需要局外解锁 */
  base?: boolean
}

/* ---------------- 修正值 ---------------- */

export interface Modifiers {
  shot: number
  placed: number
  chip: number
  power: number
  header: number
  freeKick: number
  penalty: number
  cross: number
  pass: number
  worldie: number
  /** 对方门将扑救加成（负值削弱对方） */
  theirKeeper: number
  theirAttack: number
  ourKeeper: number
  ourDefense: number
  extraMoments: Partial<Record<MomentKind, number>>
  weights: Partial<Record<MomentKind, number>>
  momentCount: number
  foulSafe: boolean
  keeperJoinsCorner: boolean
  /** 我方门将也参与点球（点球大战可罚） */
  keeperTakesPenalty: boolean
}

export interface TraitContext {
  minute: number
  scoreDiff: number
  kind: MomentKind
  isShootout: boolean
  match: MatchState
  run: RunState
}

/* ---------------- 对手 ---------------- */

export interface Opponent {
  id: string
  name: string
  short: string
  /** 赛前提示的对手特点 */
  note: string
  colors: TeamColors
  strength: number
  /** 对手的修正（写入我方 Modifiers） */
  traits: string[]
  /** 决赛 Boss 专属规则说明 */
  bossRule?: string
}

/* ---------------- 局 ---------------- */

export interface DraftState {
  offers: string[]
  rerolled: boolean
  replacing: boolean
}

export interface MatchRecord {
  stageIndex: number
  opponentId: string
  score: { us: number; them: number }
  won: boolean
  shootout: boolean
  highlight: string
}

export type RunStatus = 'playing' | 'champion' | 'eliminated'

export interface RunState {
  seed: number
  teamId: string
  difficulty: number
  stageIndex: number
  traits: string[]
  /** 本局可用的特性池（局外解锁 + 默认） */
  availableTraits: string[]
  wins: number
  history: MatchRecord[]
  status: RunStatus
  reward: number
  draft: DraftState | null
  match: MatchState | null
  /** 本局统计，用于结算解锁 */
  totals: {
    worldies: number
    goals: number
    cleanSheets: number
    comebacks: number
    lateWinners: number
    keeperGoals: number
    corners: number
    maxTraits: number
  }
}

/* ---------------- 局外存档 ---------------- */

export interface ClassicMoment {
  id: string
  title: string
  detail: string
  at: number
}

export interface MetaSave {
  version: number
  teams: string[]
  traits: string[]
  difficulty: number
  achievements: string[]
  classic: ClassicMoment[]
  stats: {
    runs: number
    wins: number
    titles: number
    worldies: number
    bestStage: number
  }
}

export type Screen =
  | 'title'
  | 'teamSelect'
  | 'draft'
  | 'preview'
  | 'match'
  | 'matchEnd'
  | 'eliminated'
  | 'champion'
  | 'collection'
