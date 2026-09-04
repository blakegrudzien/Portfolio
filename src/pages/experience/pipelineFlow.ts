import type { NodeId, Phase, SegmentKey } from './pipelineData'

export interface SequenceStep {
  segment: SegmentKey
  arrival: NodeId
  /** How long to hold at this stop before continuing, so its effect (if
   * any) has time to actually play rather than being cut off by the next
   * segment starting immediately. */
  pauseMs?: number
}

export const DEFAULT_PAUSE_MS = 150

export const COMMON_SEQUENCE: SequenceStep[] = [
  { segment: 'devCond', arrival: 'condenser' },
  { segment: 'condKin', arrival: 'kinesis', pauseMs: 1000 },
  { segment: 'kinS3', arrival: 's3lake' },
  { segment: 's3Sqs', arrival: 'sqs', pauseMs: 1000 },
  { segment: 'sqsLambda', arrival: 'lambda', pauseMs: 700 },
  { segment: 'lambdaParser', arrival: 'parser', pauseMs: 500 },
]

export const SUCCESS_SEQUENCE: SequenceStep[] = [
  { segment: 'parserOutput', arrival: 'output' },
  { segment: 'outputAthena', arrival: 'athena', pauseMs: 600 },
]

export const FAILURE_SEQUENCE: SequenceStep[] = [
  { segment: 'parserDlq', arrival: 'dlq' },
]

export const REDRIVE_SEQUENCE: SequenceStep[] = [
  { segment: 'dlqReturn', arrival: 'sqs', pauseMs: 700 },
  { segment: 'sqsLambda', arrival: 'lambda', pauseMs: 500 },
  { segment: 'lambdaParser', arrival: 'parser', pauseMs: 400 },
]

export type Trigger = 'success' | 'failure' | 'redrive'

/** One leg of a trigger's journey: the phase to announce while it runs,
 * and the segments that make it up. */
export interface FlowLeg {
  phase: Phase
  sequence: SequenceStep[]
}

// The whole "what happens when" state machine, as data rather than as
// branching imperative code — this is what makes it directly testable
// without touching the DOM or a timer. Each trigger is an ordered list of
// legs; the phase updates once per leg, not once per segment, since that's
// the granularity a visitor (or a screen reader via the status text)
// actually reads meaning from.
const FLOWS: Record<Trigger, FlowLeg[]> = {
  success: [
    { phase: 'traveling-common', sequence: COMMON_SEQUENCE },
    { phase: 'traveling-success', sequence: SUCCESS_SEQUENCE },
  ],
  failure: [
    { phase: 'traveling-common', sequence: COMMON_SEQUENCE },
    { phase: 'traveling-failure', sequence: FAILURE_SEQUENCE },
  ],
  // The success leg here reuses SUCCESS_SEQUENCE (a redrive that reaches
  // the parser always succeeds — see usePipelineAnimation) and is
  // announced as its own 'traveling-success' phase rather than staying on
  // 'traveling-redrive' for the whole trip, so the aria-live status text
  // (and the payload preview) still flips to "writing to output" instead
  // of going stale on "moving back through SQS" for that whole back half.
  redrive: [
    { phase: 'traveling-redrive', sequence: REDRIVE_SEQUENCE },
    { phase: 'traveling-success', sequence: SUCCESS_SEQUENCE },
  ],
}

const FINAL_PHASE: Record<Trigger, Phase> = {
  success: 'done-success',
  failure: 'in-dlq',
  redrive: 'done-success',
}

export function getFlow(trigger: Trigger): FlowLeg[] {
  return FLOWS[trigger]
}

export function getFinalPhase(trigger: Trigger): Phase {
  return FINAL_PHASE[trigger]
}

/** Runs one segment of travel. Supplied by the caller (usePipelineAnimation,
 * in practice) since actually moving the token is a DOM/CSS concern —
 * runSequence and runFlowLegs below only care about ordering and timing,
 * so they stay testable without a real animation to wait on. */
export type StepRunner = (
  segment: SegmentKey,
  arrival: NodeId,
  onDone: () => void,
) => void

/** Chains a list of node-to-node segments into what reads as one
 * continuous trip, pausing briefly at each arrival (longer where that
 * stop has its own effect to show off) before continuing. */
export function runSequence(
  steps: SequenceStep[],
  runStep: StepRunner,
  onAllDone: () => void,
  schedule: (callback: () => void, delayMs: number) => void = (cb, ms) =>
    window.setTimeout(cb, ms),
) {
  const [step, ...rest] = steps
  if (!step) {
    onAllDone()
    return
  }
  runStep(step.segment, step.arrival, () => {
    schedule(
      () => runSequence(rest, runStep, onAllDone, schedule),
      step.pauseMs ?? DEFAULT_PAUSE_MS,
    )
  })
}

/** Chains a trigger's full list of legs, announcing each leg's phase via
 * `setPhase` before its segments run. */
export function runFlowLegs(
  legs: FlowLeg[],
  setPhase: (phase: Phase) => void,
  runStep: StepRunner,
  onAllDone: () => void,
  schedule?: (callback: () => void, delayMs: number) => void,
) {
  const [leg, ...rest] = legs
  if (!leg) {
    onAllDone()
    return
  }
  setPhase(leg.phase)
  runSequence(
    leg.sequence,
    runStep,
    () => runFlowLegs(rest, setPhase, runStep, onAllDone, schedule),
    schedule,
  )
}
