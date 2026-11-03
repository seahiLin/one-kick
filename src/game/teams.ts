import type { Team } from './types'

/* 四支起始球队。每支 3 名核心球员 + 1 个初始特性，决定这局的方向。
   所有球员均为原创虚构形象。 */

export const TEAMS: Team[] = [
  {
    id: 'tower',
    name: '铁塔联',
    tagline: '把球吊进去就完事了',
    style: '高中锋 · 角球流',
    colors: { shirt: '#c8412f', trim: '#f4e3c8', shorts: '#2a1b16', keeper: '#3d6b4f' },
    starterTrait: 'header_expert',
    unlock: { kind: 'always' },
    players: [
      { name: '铁塔·老石', role: 'ST', number: 9, height: 198 },
      { name: '塔顶·阿岩', role: 'DF', number: 5, height: 193 },
      { name: '弧线·齐布', role: 'W', number: 7, height: 178 },
    ],
  },
  {
    id: 'gale',
    name: '疾风竞技',
    tagline: '远射，是唯一的语言',
    style: '技术流 · 世界波流',
    colors: { shirt: '#1f6feb', trim: '#eaf2ff', shorts: '#10203a', keeper: '#e0a92b' },
    starterTrait: 'long_shot_expert',
    unlock: { kind: 'always' },
    players: [
      { name: '弧光·里德', role: 'MF', number: 10, height: 176 },
      { name: '疾步·卡洛', role: 'W', number: 11, height: 174 },
      { name: '铁肺·丹', role: 'MF', number: 8, height: 182 },
    ],
  },
  {
    id: 'stonewall',
    name: '石墙城',
    tagline: '一球不丢，就赢了',
    style: '铁桶流 · 防守反击',
    colors: { shirt: '#4a4f57', trim: '#d9dde3', shorts: '#23262b', keeper: '#8f5ad6' },
    starterTrait: 'iron_wall',
    unlock: { kind: 'totalWins', wins: 3 },
    players: [
      { name: '墙·巴尔', role: 'DF', number: 4, height: 190 },
      { name: '石缝·金', role: 'GK', number: 1, height: 191 },
      { name: '暗刃·索尔', role: 'ST', number: 19, height: 181 },
    ],
  },
  {
    id: 'rangers',
    name: '浪人十一人',
    tagline: '进球比对手多就行',
    style: '全攻全守 · 疯狗流',
    colors: { shirt: '#e0a92b', trim: '#2a1b16', shorts: '#7a4a12', keeper: '#2f7f6f' },
    starterTrait: 'all_out',
    unlock: { kind: 'championStyle', style: 'chance' },
    players: [
      { name: '浪人·凯', role: 'ST', number: 7, height: 179 },
      { name: '风眼·墨', role: 'MF', number: 6, height: 177 },
      { name: '孤影·雷', role: 'DF', number: 3, height: 185 },
    ],
  },
]

export const TEAM_MAP: Record<string, Team> = Object.fromEntries(TEAMS.map((t) => [t.id, t]))

export function getTeam(id: string): Team {
  return TEAM_MAP[id] ?? TEAMS[0]
}

export function teamUnlocked(team: Team, meta: { teams: string[] }): boolean {
  return team.unlock?.kind === 'always' || meta.teams.includes(team.id)
}

export function teamUnlockText(team: Team): string {
  const rule = team.unlock
  if (!rule || rule.kind === 'always') return '初始可用'
  switch (rule.kind) {
    case 'champion':
      return '夺冠后解锁'
    case 'championStyle':
      return '用「增加机会」流派夺冠后解锁'
    case 'championWithTrait':
      return '带着指定特性夺冠后解锁'
    case 'totalWins':
      return `累计赢下 ${rule.wins} 场杯赛比赛后解锁`
  }
}
