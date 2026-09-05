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

// Pauses split the pipeline into two kinds of stop. Transforming stops —
// the condenser, Kinesis, Lambda, the parser — do something to the file
// and hand it straight on, so they hold it only long enough for that to
// register. Holding stops — the lake and the queue — are where a file
// actually waits in the real system, and they're what makes the diagram
// look like it has depth rather than a conveyor belt.
//
// This table is now the only thing that controls timing anywhere: there is
// no multiplier layered on top of it. A file crosses in about ten seconds,
// roughly a third of that actually in motion.
export const COMMON_SEQUENCE: SequenceStep[] = [
  { segment: 'devCond', arrival: 'condenser', pauseMs: 380 },
  { segment: 'condKin', arrival: 'kinesis', pauseMs: 200 },
  { segment: 'kinS3', arrival: 's3lake', pauseMs: 1600 },
  { segment: 's3Sqs', arrival: 'sqs', pauseMs: 2000 },
  { segment: 'sqsLambda', arrival: 'lambda', pauseMs: 240 },
  { segment: 'lambdaParser', arrival: 'parser', pauseMs: 200 },
]

export const SUCCESS_SEQUENCE: SequenceStep[] = [
  { segment: 'parserOutput', arrival: 'output' },
  { segment: 'outputAthena', arrival: 'athena', pauseMs: 600 },
]

export const FAILURE_SEQUENCE: SequenceStep[] = [
  { segment: 'parserDlq', arrival: 'dlq' },
]

export const REDRIVE_SEQUENCE: SequenceStep[] = [
  { segment: 'dlqReturn', arrival: 'sqs', pauseMs: 900 },
  { segment: 'sqsLambda', arrival: 'lambda', pauseMs: 240 },
  { segment: 'lambdaParser', arrival: 'parser', pauseMs: 200 },
]

export type Trigger = 'success' | 'failure' | 'redrive'

/** How often background traffic fails to parse. Still well above a real
 * pipeline's rate — a visitor has to see the DLQ actually accumulate
 * rather than take the failure story on faith — but lower than it was,
 * because throughput went up roughly fourfold and the old rate would now
 * bury the diagram in failures inside a minute. */
export const AMBIENT_FAILURE_RATE = 0.1

/** A device emits several discrete readings, not one file — the file is
 * something the condenser makes. These are the offsets those readings ride
 * at until they merge, laid out on a jittered ring so a cluster reads as
 * several separate things rather than as one fuzzy blob.
 *
 * Randomness is injected rather than reached for, so the shape of the
 * output stays testable without stubbing globals. */
export function createDotOffsets(
  rand: () => number = Math.random,
): { x: number; y: number }[] {
  const count = 4 + Math.floor(rand() * 3)
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + rand() * 0.7
    const radius = 6 + rand() * 4
    return {
      x: Math.round(Math.cos(angle) * radius * 100) / 100,
      y: Math.round(Math.sin(angle) * radius * 100) / 100,
    }
  })
}

/** What the payload actually *is* at each point in the pipeline. Four
 * states, not two, because the file genuinely changes form twice on the
 * way through and both changes are load-bearing:
 *
 * - `events`   several separate device readings, before anything batches them
 * - `file`     one batched file — and later, the same file reopened and read
 * - `gzipped`  what Firehose writes to the lake, and all SQS ever refers to
 * - `parquet`  columnar, after the parser's output is converted
 *
 * Kept here rather than in the component because it's the pipeline's own
 * description of itself, and because it's the kind of thing worth a test.
 */
export type PayloadStage = 'events' | 'file' | 'gzipped' | 'parquet'

export function payloadStage(arrivedAt: NodeId | null): PayloadStage {
  switch (arrivedAt) {
    case null:
    case 'device':
      return 'events'
    // Compressed from the moment Firehose writes it, and still compressed
    // in the queue — SQS only ever carries the bucket and key, so nothing
    // between here and Lambda has looked inside the file.
    case 'kinesis':
    case 's3lake':
    case 'sqs':
      return 'gzipped'
    case 'output':
    case 'athena':
      return 'parquet'
    // Lambda fetches and extracts, the parser hands back records, and a
    // file in the DLQ is one that got that far and failed.
    default:
      return 'file'
  }
}

export function pickAmbientOutcome(): 'success' | 'failure' {
  return Math.random() < AMBIENT_FAILURE_RATE ? 'failure' : 'success'
}

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
