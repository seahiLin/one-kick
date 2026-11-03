import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { availableTraitIds, loadSave, resetSave, settleRun, writeSave, type RunSummary } from './meta'
import {
  REROLL_COST,
  TRAIT_SLOTS,
  pickTrait,
  playMoment,
  playShootoutKick,
  rerollDraft,
  startRun,
} from './run'
import { getOpponent } from './opponents'
import type { MetaSave, MomentResult, RunState, Screen } from './types'

export interface GameApi {
  screen: Screen
  save: MetaSave
  run: RunState | null
  opponentName: string
  summary: RunSummary | null
  lastResult: MomentResult | null
  busy: boolean
  goTitle: () => void
  goTeamSelect: () => void
  goCollection: () => void
  beginRun: (teamId: string) => void
  choose: (optionId: string) => void
  pickShootout: (optionId: string) => void
  chooseTrait: (traitId: string, replaceId?: string) => void
  reroll: () => void
  requestReplace: () => void
  cancelReplace: () => void
  toPreview: () => void
  toMatch: () => void
  finishAndSettle: () => void
  hardReset: () => void
  clearResult: () => void
  rerollCost: number
  traitSlots: number
}

export function useGame(): GameApi {
  const [save, setSave] = useState<MetaSave>(() => loadSave())
  const [run, setRun] = useState<RunState | null>(null)
  const [screen, setScreen] = useState<Screen>('title')
  const [summary, setSummary] = useState<RunSummary | null>(null)
  const [lastResult, setLastResult] = useState<MomentResult | null>(null)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)

  /* 客户端首次挂载时再读一次，避免 SSR 与浏览器不一致 */
  useEffect(() => {
    setSave(loadSave())
  }, [])

  const lock = useCallback((ms: number) => {
    busyRef.current = true
    setBusy(true)
    window.setTimeout(() => {
      busyRef.current = false
      setBusy(false)
    }, ms)
  }, [])

  const goTitle = useCallback(() => {
    setScreen('title')
    setSummary(null)
  }, [])

  const goTeamSelect = useCallback(() => setScreen('teamSelect'), [])
  const goCollection = useCallback(() => setScreen('collection'), [])

  const beginRun = useCallback(
    (teamId: string) => {
      const fresh = startRun(teamId, save.difficulty, availableTraitIds(save))
      setRun(fresh)
      setSummary(null)
      setLastResult(null)
      setScreen('preview')
    },
    [save],
  )

  const toPreview = useCallback(() => setScreen('preview'), [])

  const toMatch = useCallback(() => {
    setScreen('match')
    setLastResult(null)
  }, [])

  const choose = useCallback(
    (optionId: string) => {
      if (!run || !run.match || busyRef.current) return
      if (run.match.shootout) {
        const outcome = playShootoutKick(run, run.match, optionId)
        setRun(outcome.run)
        setLastResult(outcome.result)
        if (outcome.run.status !== 'playing') {
          lock(1400)
          window.setTimeout(() => {
            const result = settleRun(outcome.run, save)
            setSave(result.save)
            setSummary(result)
            setScreen(outcome.run.status === 'champion' ? 'champion' : 'eliminated')
          }, 1500)
        } else {
          lock(700)
        }
        return
      }
      const outcome = playMoment(run, run.match, optionId)
      setRun(outcome.run)
      setLastResult(outcome.result)
      if (outcome.run.status !== 'playing') {
        const finalStatus = outcome.run.status
        lock(1500)
        window.setTimeout(() => {
          const result = settleRun(outcome.run, save)
          setSave(result.save)
          setSummary(result)
          setScreen(finalStatus === 'champion' ? 'champion' : 'eliminated')
        }, 1700)
        return
      }
      if (outcome.run.draft) {
        lock(1600)
        window.setTimeout(() => setScreen('draft'), 1700)
        return
      }
      lock(520)
    },
    [run, save, lock],
  )

  const pickShootout = choose

  const pickTraitAndAdvance = useCallback(
    (traitId: string, replaceId?: string) => {
      if (!run || !run.draft) return
      if (run.traits.length >= TRAIT_SLOTS && !replaceId) {
        setRun({ ...run, draft: { ...run.draft, replacing: true } })
        return
      }
      const next = pickTrait(run, traitId, replaceId)
      setRun(next)
      setLastResult(null)
      setScreen('preview')
    },
    [run],
  )

  const reroll = useCallback(() => {
    if (!run) return
    const next = rerollDraft(run)
    if (next !== run) setRun(next)
  }, [run])

  const requestReplace = useCallback(() => {
    if (!run || !run.draft) return
    setRun({ ...run, draft: { ...run.draft, replacing: true } })
  }, [run])

  const cancelReplace = useCallback(() => {
    if (!run || !run.draft) return
    setRun({ ...run, draft: { ...run.draft, replacing: false } })
  }, [run])

  const finishAndSettle = useCallback(() => {
    if (!run) return
    const result = settleRun(run, save)
    setSave(result.save)
    setSummary(result)
    setScreen(run.status === 'champion' ? 'champion' : 'eliminated')
  }, [run, save])

  const hardReset = useCallback(() => {
    const fresh = resetSave()
    setSave(fresh)
    setRun(null)
    setSummary(null)
    setScreen('title')
  }, [])

  const clearResult = useCallback(() => setLastResult(null), [])

  /* 存档变更后立即落盘（settleRun 内部已经写过一次，这里兜底） */
  useEffect(() => {
    writeSave(save)
  }, [save])

  const opponentName = useMemo(() => {
    const id = run?.match?.opponentId
    return id ? getOpponent(id).name : ''
  }, [run?.match?.opponentId])

  return {
    screen,
    save,
    run,
    opponentName,
    summary,
    lastResult,
    busy,
    goTitle,
    goTeamSelect,
    goCollection,
    beginRun,
    choose,
    pickShootout,
    chooseTrait: pickTraitAndAdvance,
    reroll,
    requestReplace,
    cancelReplace,
    toPreview,
    toMatch,
    finishAndSettle,
    hardReset,
    clearResult,
    rerollCost: REROLL_COST,
    traitSlots: TRAIT_SLOTS,
  }
}
