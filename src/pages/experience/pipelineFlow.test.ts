import { describe, expect, it, vi } from 'vitest'
import {
  COMMON_SEQUENCE,
  DEFAULT_PAUSE_MS,
  FAILURE_SEQUENCE,
  REDRIVE_SEQUENCE,
  SUCCESS_SEQUENCE,
  getFinalPhase,
  getFlow,
  runFlowLegs,
  runSequence,
  type StepRunner,
} from './pipelineFlow'

/** A StepRunner that finishes each segment immediately (synchronously),
 * so tests can assert on ordering/timing without a real animation. */
function immediateRunner(): { runner: StepRunner; calls: string[] } {
  const calls: string[] = []
  const runner: StepRunner = (segment, arrival, onDone) => {
    calls.push(`${segment}->${arrival}`)
    onDone()
  }
  return { runner, calls }
}

describe('getFlow', () => {
  it('routes a success outcome through the common sequence, then the success sequence', () => {
    const legs = getFlow('success')
    expect(legs).toEqual([
      { phase: 'traveling-common', sequence: COMMON_SEQUENCE },
      { phase: 'traveling-success', sequence: SUCCESS_SEQUENCE },
    ])
  })

  it('routes a failure outcome through the common sequence, then the failure sequence', () => {
    const legs = getFlow('failure')
    expect(legs).toEqual([
      { phase: 'traveling-common', sequence: COMMON_SEQUENCE },
      { phase: 'traveling-failure', sequence: FAILURE_SEQUENCE },
    ])
  })

  it('routes a redrive through the redrive sequence, then re-announces traveling-success for the trip back through the success sequence', () => {
    // The redrive's second leg reuses SUCCESS_SEQUENCE but must switch the
    // announced phase to 'traveling-success' rather than leaving it on
    // 'traveling-redrive' — otherwise the aria-live status text and the
    // telemetry preview panel go stale for the whole back half of the trip.
    const legs = getFlow('redrive')
    expect(legs).toEqual([
      { phase: 'traveling-redrive', sequence: REDRIVE_SEQUENCE },
      { phase: 'traveling-success', sequence: SUCCESS_SEQUENCE },
    ])
  })
})

describe('getFinalPhase', () => {
  it('lands success and redrive on done-success, and failure on in-dlq', () => {
    expect(getFinalPhase('success')).toBe('done-success')
    expect(getFinalPhase('failure')).toBe('in-dlq')
    expect(getFinalPhase('redrive')).toBe('done-success')
  })
})

describe('runSequence', () => {
  it('runs every step in order and calls onAllDone once', () => {
    const { runner, calls } = immediateRunner()
    const onAllDone = vi.fn()
    const schedule = (cb: () => void) => cb() // run "later" work immediately

    runSequence(COMMON_SEQUENCE, runner, onAllDone, schedule)

    expect(calls).toEqual(
      COMMON_SEQUENCE.map((step) => `${step.segment}->${step.arrival}`),
    )
    expect(onAllDone).toHaveBeenCalledTimes(1)
  })

  it('calls onAllDone with no steps run for an empty sequence', () => {
    const { runner, calls } = immediateRunner()
    const onAllDone = vi.fn()

    runSequence([], runner, onAllDone)

    expect(calls).toEqual([])
    expect(onAllDone).toHaveBeenCalledTimes(1)
  })

  it("schedules the pause between steps using each step's pauseMs, defaulting when unset", () => {
    const { runner } = immediateRunner()
    const schedule = vi.fn((cb: () => void, _delayMs: number) => cb())

    runSequence(COMMON_SEQUENCE, runner, vi.fn(), schedule)

    const delays = schedule.mock.calls.map((call) => call[1])
    expect(delays).toEqual(
      COMMON_SEQUENCE.map((step) => step.pauseMs ?? DEFAULT_PAUSE_MS),
    )
  })

  it('does not run the next step until the scheduled callback fires', () => {
    const { runner, calls } = immediateRunner()
    let releasePause: (() => void) | undefined
    const schedule = (cb: () => void) => {
      releasePause = cb
    }

    runSequence(COMMON_SEQUENCE, runner, vi.fn(), schedule)
    expect(calls).toHaveLength(1) // first step ran; its pause is pending

    releasePause?.()
    expect(calls).toHaveLength(2) // releasing the pause advances to step 2
  })
})

describe('runFlowLegs', () => {
  it("announces each leg's phase before running its segments, then calls onAllDone", () => {
    const { runner, calls } = immediateRunner()
    const phases: string[] = []
    const onAllDone = vi.fn()
    const schedule = (cb: () => void) => cb()

    runFlowLegs(
      getFlow('success'),
      (p) => phases.push(p),
      runner,
      onAllDone,
      schedule,
    )

    expect(phases).toEqual(['traveling-common', 'traveling-success'])
    expect(calls).toHaveLength(COMMON_SEQUENCE.length + SUCCESS_SEQUENCE.length)
    expect(onAllDone).toHaveBeenCalledTimes(1)
  })

  it('runs the redrive flow end to end back to the parser via the success sequence', () => {
    const { runner, calls } = immediateRunner()
    const phases: string[] = []
    const schedule = (cb: () => void) => cb()

    runFlowLegs(
      getFlow('redrive'),
      (p) => phases.push(p),
      runner,
      vi.fn(),
      schedule,
    )

    expect(phases).toEqual(['traveling-redrive', 'traveling-success'])
    expect(calls).toEqual([
      ...REDRIVE_SEQUENCE.map((s) => `${s.segment}->${s.arrival}`),
      ...SUCCESS_SEQUENCE.map((s) => `${s.segment}->${s.arrival}`),
    ])
  })
})
