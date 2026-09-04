import { useEffect, useRef, useState } from 'react'
import { SEGMENTS, type NodeId, type Phase } from './pipelineData'
import {
  getFinalPhase,
  getFlow,
  pickAmbientOutcome,
  runFlowLegs,
  type StepRunner,
  type Trigger,
} from './pipelineFlow'

/** One piece of telemetry making its way through the pipeline. Ambient
 * flows are background traffic the pipeline generates on its own; the
 * highlighted flow is the one a visitor added by clicking, and is the only
 * one whose journey drives the status text and payload panel. Both kinds
 * run through exactly the same engine — "highlighted" is presentation, not
 * a separate mechanism. */
export interface FlowInstance {
  id: string
  kind: 'ambient' | 'highlighted'
  phase: Phase
  /** The node this flow most recently arrived at — what each per-node
   * effect keys off. Tracked per flow, so several tokens passing different
   * stops at once each trigger their own effect. */
  arrivedAt: NodeId | null
}

// Jittered rather than fixed, so traffic reads as a real system under
// variable load instead of a metronome. The cap applies to flows actively
// traveling — DLQ-parked ones are deliberately uncapped, since watching the
// backlog grow is the point.
const MIN_SPAWN_DELAY_MS = 1500
const MAX_SPAWN_DELAY_MS = 4000
const MAX_TRAVELING_AMBIENT = 4

function randomSpawnDelay() {
  return (
    MIN_SPAWN_DELAY_MS +
    Math.random() * (MAX_SPAWN_DELAY_MS - MIN_SPAWN_DELAY_MS)
  )
}

/** Fans parked failures out into a small grid just below the DLQ node, so a
 * backlog reads as a growing pile rather than one token sitting on top of
 * another — and stays clear of the node's own label. */
function dlqClusterOffset(slot: number) {
  const col = slot % 4
  const row = Math.floor(slot / 4) % 2
  return { dx: (col - 1.5) * 12, dy: 36 + row * 11 }
}

export function usePipelineAnimation() {
  const [flows, setFlows] = useState<FlowInstance[]>([])

  // One DOM node per flow, addressed by id — travel is animated
  // imperatively (see runSegment), so it needs the element, not a re-render.
  const tokenElsRef = useRef(new Map<string, SVGCircleElement>())
  const mountedRef = useRef(true)
  const idCounterRef = useRef(0)
  const dlqSlotCounterRef = useRef(0)
  // Mirrors "how many ambient flows are mid-journey" without reading state,
  // so the spawn loop below can stay one long-lived effect instead of being
  // torn down and rebuilt every time any flow changes.
  const travelingAmbientRef = useRef(0)
  const highlightedIdRef = useRef<string | null>(null)
  // A flow's token element doesn't exist until React has rendered it, so a
  // freshly spawned flow parks its trigger here and the effect below starts
  // it on the next commit, once there's an element to actually move.
  const pendingStartsRef = useRef(
    new Map<string, { trigger: Trigger; onSettled: () => void }>(),
  )

  useEffect(() => {
    // StrictMode's dev-only mount -> cleanup -> mount again means the
    // cleanup below can run once before settling — re-arm on setup too, or
    // that first (non-final) cleanup would permanently wedge this false.
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  function updateFlow(id: string, patch: Partial<FlowInstance>) {
    if (!mountedRef.current) return
    setFlows((current) =>
      current.map((flow) => (flow.id === id ? { ...flow, ...patch } : flow)),
    )
  }

  function removeFlow(id: string) {
    tokenElsRef.current.delete(id)
    if (!mountedRef.current) return
    setFlows((current) => current.filter((flow) => flow.id !== id))
  }

  function registerToken(id: string, el: SVGCircleElement | null) {
    if (el) tokenElsRef.current.set(id, el)
    else tokenElsRef.current.delete(id)
  }

  function runSegment(
    id: string,
    pathD: string,
    arrivalNodeId: NodeId,
    onDone: () => void,
  ) {
    const el = tokenElsRef.current.get(id)
    if (!el) {
      // Element vanished mid-journey (only really possible if the flow was
      // torn out from under us). Finish the step anyway rather than
      // returning: bailing silently would strand the rest of the sequence
      // and never release this flow's traveling slot, throttling ambient
      // traffic a little more each time it happened.
      onDone()
      return
    }

    // setProperty rather than camelCase assignment (el.style.offsetPath = ...)
    // — offset-path/offset-distance aren't reliably exposed as named
    // CSSStyleDeclaration accessors even where the CSS property itself is
    // supported, so the camelCase form can silently no-op.
    el.style.setProperty('transition', 'none')
    el.style.setProperty('offset-path', `path('${pathD}')`)
    el.style.setProperty('offset-distance', '0%')
    // `translate` (the standalone property, not the transform shorthand)
    // composes with offset-path positioning instead of replacing it. Cleared
    // here so a token leaving the DLQ drops the cluster offset it was given.
    el.style.setProperty('translate', 'none')
    el.style.setProperty('opacity', '1')
    // Force a reflow so the browser applies the reset above before the
    // transition below starts, otherwise both changes get batched into
    // one paint and the token never visibly jumps to the path's start.
    void el.getBoundingClientRect()

    requestAnimationFrame(() => {
      el.style.setProperty(
        'transition',
        'offset-distance var(--pipeline-segment-duration) linear',
      )
      el.style.setProperty('offset-distance', '100%')
    })

    const handleEnd = () => {
      el.removeEventListener('transitionend', handleEnd)
      updateFlow(id, { arrivedAt: arrivalNodeId })
      onDone()
    }
    el.addEventListener('transitionend', handleEnd)
  }

  // The pause between segments (runFlowLegs/runSequence's `schedule`
  // parameter) is a plain setTimeout, not a CSS transition/animation — so
  // unlike everything else driving this diagram, it does NOT automatically
  // collapse under prefers-reduced-motion via the global base.css override.
  // Left alone, a reduced-motion visitor would still sit through several
  // real seconds of pauses even though every visual transition had gone
  // instant, which defeats the point. Checked per call rather than cached
  // once, since matchMedia's result can change mid-session if the OS
  // setting does. The state progression itself is unaffected — every stop
  // is still visited and every phase still announced, just without the
  // multi-second forced wait between them.
  function schedule(callback: () => void, delayMs: number) {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    window.setTimeout(callback, prefersReducedMotion ? 20 : delayMs)
  }

  function runTrigger(id: string, trigger: Trigger, onSettled: () => void) {
    const runStep: StepRunner = (segment, arrival, onDone) =>
      runSegment(id, SEGMENTS[segment], arrival, onDone)

    runFlowLegs(
      getFlow(trigger),
      (phase) => updateFlow(id, { phase }),
      runStep,
      () => {
        const finalPhase = getFinalPhase(trigger)
        if (finalPhase === 'in-dlq') {
          // Park it in the DLQ cluster, where it stays — visibly — until a
          // redrive sweeps the whole backlog.
          const { dx, dy } = dlqClusterOffset(dlqSlotCounterRef.current++)
          tokenElsRef.current
            .get(id)
            ?.style.setProperty('translate', `${dx}px ${dy}px`)
        }
        updateFlow(id, { phase: finalPhase })
        onSettled()
      },
      schedule,
    )
  }

  /** Adds a flow to state and defers its first segment until React has
   * actually rendered a token element for it. */
  function spawnFlow(
    flow: FlowInstance,
    trigger: Trigger,
    onSettled: () => void,
  ) {
    pendingStartsRef.current.set(flow.id, { trigger, onSettled })
    setFlows((current) => {
      // Only ever one highlighted flow: there's a single status line and
      // payload panel to narrate with, so a new one replaces the old story.
      const kept =
        flow.kind === 'highlighted'
          ? current.filter((existing) => existing.kind !== 'highlighted')
          : current
      return [...kept, flow]
    })
  }

  useEffect(() => {
    if (pendingStartsRef.current.size === 0) return
    for (const flow of flows) {
      const pending = pendingStartsRef.current.get(flow.id)
      if (!pending) continue
      pendingStartsRef.current.delete(flow.id)
      runTrigger(flow.id, pending.trigger, pending.onSettled)
    }
  }, [flows])

  // --- ambient background traffic -----------------------------------------

  function spawnAmbientFlow() {
    // Someone who asked for less motion shouldn't get perpetual background
    // traffic they never opted into. Their own telemetry still runs when
    // they click for it — that one is a deliberate action, not ambience.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (travelingAmbientRef.current >= MAX_TRAVELING_AMBIENT) return
    const id = `flow-${idCounterRef.current++}`
    const outcome = pickAmbientOutcome()
    travelingAmbientRef.current += 1

    spawnFlow(
      { id, kind: 'ambient', phase: 'idle', arrivedAt: null },
      outcome,
      () => {
        // Either way it has stopped traveling, so it frees a slot: a failed
        // flow now sits parked in the DLQ, a successful one is cleared out.
        travelingAmbientRef.current -= 1
        if (outcome === 'success') removeFlow(id)
      },
    )
  }

  useEffect(() => {
    let cancelled = false
    let timeoutId = 0

    function queueNextSpawn() {
      timeoutId = window.setTimeout(() => {
        if (cancelled) return
        spawnAmbientFlow()
        queueNextSpawn()
      }, randomSpawnDelay())
    }

    queueNextSpawn()
    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
    // Runs once for the component's lifetime — the loop reads only refs, so
    // it never needs rebuilding as flows come and go.
  }, [])

  // --- the visitor's own telemetry ----------------------------------------

  const highlightedFlow = flows.find((flow) => flow.kind === 'highlighted')
  const phase: Phase = highlightedFlow?.phase ?? 'idle'

  // The outcome is chosen upfront (two buttons, not a mid-journey pause) —
  // otherwise the token would sit waiting at the parser indefinitely if the
  // visitor just never clicked anything. Unlike ambient traffic this one's
  // outcome is deterministic: the button says what will happen, so it has to
  // actually happen.
  function addTelemetry(outcome: 'success' | 'failure') {
    if (highlightedIdRef.current) return
    const id = `flow-${idCounterRef.current++}`
    highlightedIdRef.current = id

    spawnFlow(
      { id, kind: 'highlighted', phase: 'idle', arrivedAt: 'device' },
      outcome,
      () => {
        // A failure keeps the slot held: the visitor's story isn't over
        // until they redrive it, and the Redrive button is gated on it.
        if (outcome === 'success') highlightedIdRef.current = null
      },
    )
  }

  function redrive() {
    if (phase !== 'in-dlq') return
    // One redrive clears the whole backlog, not just the visitor's own file
    // — that's what redriving a queue actually does.
    for (const flow of flows.filter((f) => f.phase === 'in-dlq')) {
      if (flow.kind === 'ambient') travelingAmbientRef.current += 1
      runTrigger(flow.id, 'redrive', () => {
        if (flow.kind === 'ambient') {
          travelingAmbientRef.current -= 1
          removeFlow(flow.id)
        } else {
          highlightedIdRef.current = null
        }
      })
    }
  }

  const notified = phase === 'in-dlq' || phase === 'traveling-redrive'

  return { flows, phase, notified, registerToken, addTelemetry, redrive }
}
