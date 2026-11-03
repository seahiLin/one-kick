import type { ReactNode } from 'react'
import { RARITY_COLOR, RARITY_LABEL, getTrait } from '../game/traits'
import type { Trait } from '../game/types'

export function Panel({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`glass rounded-2xl ${className}`}>{children}</div>
}

export function Btn({
  children,
  onClick,
  variant = 'primary',
  disabled,
  className = '',
  size = 'md',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'danger' | 'gold'
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const base =
    'onekick inline-flex select-none items-center justify-center gap-2 rounded-xl font-bold transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40'
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base',
  }
  const variants = {
    primary:
      'bg-emerald-400 text-emerald-950 hover:bg-emerald-300 shadow-[0_6px_0_#0b6b45] hover:shadow-[0_4px_0_#0b6b45] hover:translate-y-[2px]',
    gold: 'bg-amber-300 text-amber-950 hover:bg-amber-200 shadow-[0_6px_0_#8a5a0a] hover:shadow-[0_4px_0_#8a5a0a] hover:translate-y-[2px]',
    ghost:
      'border border-emerald-200/25 bg-emerald-950/40 text-emerald-100 hover:border-emerald-200/50 hover:bg-emerald-900/50',
    danger: 'border border-rose-400/40 bg-rose-950/40 text-rose-100 hover:bg-rose-900/50',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function TraitCard({
  trait,
  onClick,
  selected,
  compact,
  dimmed,
}: {
  trait: Trait
  onClick?: () => void
  selected?: boolean
  compact?: boolean
  dimmed?: boolean
}) {
  const interactive = Boolean(onClick)
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      className={[
        'onekick group relative w-full overflow-hidden rounded-xl border text-left transition',
        compact ? 'p-2.5' : 'p-3.5',
        RARITY_COLOR[trait.rarity],
        interactive ? 'cursor-pointer hover:-translate-y-0.5 hover:brightness-125' : 'cursor-default',
        selected ? 'ring-2 ring-amber-300' : '',
        dimmed ? 'opacity-40' : '',
        'bg-gradient-to-br from-black/50 to-black/20',
      ].join(' ')}
    >
      <div className="flex items-start gap-2.5">
        <span className={compact ? 'text-lg leading-none' : 'text-2xl leading-none'}>{trait.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className={`onekick-display ${compact ? 'text-xs' : 'text-sm'} text-current`}>
              {trait.name}
            </span>
            <span className="text-[10px] uppercase tracking-widest opacity-70">
              {RARITY_LABEL[trait.rarity]}
            </span>
          </div>
          <p className={`mt-0.5 leading-snug text-emerald-50/75 ${compact ? 'text-[10px]' : 'text-xs'}`}>
            {trait.text}
          </p>
        </div>
      </div>
    </button>
  )
}

export function TraitChip({ id, onClick }: { id: string; onClick?: () => void }) {
  const trait = getTrait(id)
  if (!trait) return null
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`onekick flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${RARITY_COLOR[trait.rarity]} bg-black/40 ${
        onClick ? 'hover:brightness-125' : ''
      }`}
      title={trait.text}
    >
      <span>{trait.icon}</span>
      <span className="whitespace-nowrap">{trait.name}</span>
    </button>
  )
}

export function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-emerald-200/10 bg-black/25 px-2.5 py-1.5">
      <div className="text-[9px] uppercase tracking-[0.16em] text-emerald-200/45">{label}</div>
      <div className={`onekick-display text-sm ${accent ?? 'text-emerald-50'}`}>{value}</div>
    </div>
  )
}
