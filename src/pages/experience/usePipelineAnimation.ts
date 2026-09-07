import { useEffect, useRef, useState } from 'react'
import {
  SEGMENTS,
  SEGMENT_DURATIONS_MS,
  getNode,
  nodeSeat,
  sqsQueueSeat,
  type NodeId,
  type Phase,
  type SegmentKey,
} from './pipelineData'
import {
  createSeating,
  dlqClusterOffset,
  type Seating,
  type SeatedFile,
} from './pipelineSeating'
import {
  getFinalPhase,
  getFlow,
  createDotOffsets,
  pickAmbientOutcome,
  runFlowLegs,
  type StepRunner,
  type Trigger,
} from './pipelineFlow'

/** One piece of telemetry making its way through the pipeline. Ambient
 * flows are background traffic the pipeline generates on its own; the
 * one whose journey drives the status text and payload panel. Both kinds
 * run through exactly the same engine. "highlighted" is presentation, not
 * a separate mechanism. */
export interface FlowInstance {
  id: string
  phase: Phase
  /** The node this flow most recently arrived at, and what each per-node
   * effect keys off. Tracked per flow, so several tokens passing different
   * stops at once each trigger their own effect. */
  arrivedAt: NodeId | null
  /** The separate device readings this flow started life as, as offsets
   * from the token's own position. They converge into one file at the
   * condenser and are never used again, but they're fixed per flow, so
   * a re-render can't reshuffle a cluster mid-flight. */
  dots: { x: number; y: number }[]
  /** Whether this file will fail to parse, decided at spawn because
   * the defect is in the bytes the device emitted, not in something that
   * happens to it later. Drives the visual cue the token carries, and
   * survives a redrive: the parser gets fixed, the file doesn't. */
  malformed: boolean
}

// Jittered rather than fixed, so traffic reads as a real system under
// variable load instead of a metronome.
//
// How many files are in flight is arrival rate times time in the system,
// and only one of those is safe to turn up. An earlier version of this
// held seven on screen by multiplying every dwell eightfold, which is the
// wrong term: a file took half a minute to cross the diagram and spent
// almost all of it stationary. Seven files that barely move read as a
// stalled pipeline, not a busy one. So the rate carries it now, the pause
// table below is the only timing in the system, and a file crosses in
// about ten seconds.
//
// The cap applies to flows actively traveling; DLQ-parked ones are
// deliberately uncapped, since watching the backlog grow is the point.
const MIN_SPAWN_DELAY_MS = 1200
const MAX_SPAWN_DELAY_MS = 2000
const MAX_TRAVELING = 7
/** How long past a hop's own duration to wait for its `transitionend`
 * before assuming it is never coming. Generous on purpose: this exists to
 * stop a flow wedging forever, not to police timing, and firing it early
 * would cut a hop short that was about to land on its own. */
const TRANSITION_WATCHDOG_SLACK_MS = 400

function randomSpawnDelay() {
  return (
    MIN_SPAWN_DELAY_MS +
    Math.random() * (MAX_SPAWN_DELAY_MS - MIN_SPAWN_DELAY_MS)
  )
}

/** Fans parked failures out into a small grid so a backlog reads as a
 * growing pile rather than one token sitting on top of another. Now that
 * the DLQ is drawn as a bin with a floor, the pile belongs inside it
 * rather than in the empty space underneath, where the node's label now
 * lives. */
interface StaticSpot {
  at: NodeId
  seat: { x: number; y: number }
  phase: Phase
}

/** The still-life version of a running pipeline.
 *
 * Someone who asks for less motion used to get an empty picture: background
 * traffic is suppressed for them, and with the visitor's own file gone
 * there would be nothing left to draw at all. So they get files at rest
 * instead: objects in the lake, references waiting in the queue, a backlog
 * in the DLQ, records in the grid. The same information the moving version
 * carries, none of the movement. The redrive still works from here.
 */
function staticScene(): { spot: StaticSpot; flow: FlowInstance }[] {
  const spots: StaticSpot[] = [
    ...[0, 1].map((i) => ({
      at: 's3lake' as NodeId,
      seat: nodeSeat('s3lake', i) ?? { x: 0, y: 0 },
      phase: 'traveling-common' as Phase,
    })),
    ...[0, 1].map((i) => ({
      at: 'sqs' as NodeId,
      seat: sqsQueueSeat(i),
      phase: 'traveling-common' as Phase,
    })),
    ...[0, 1, 2].map((i) => {
      return {
        at: 'dlq' as NodeId,
        seat: dlqClusterOffset(i),
        phase: 'in-dlq' as Phase,
      }
    }),
    ...[0, 1, 2, 3, 4].map((i) => ({
      at: 'athena' as NodeId,
      seat: nodeSeat('athena', i) ?? { x: 0, y: 0 },
      phase: 'done-success' as Phase,
    })),
  ]

  return spots.map((spot, i) => ({
    spot,
    flow: {
      id: `static-${i}`,
      phase: spot.phase,
      arrivedAt: spot.at,
      dots: createDotOffsets(),
      // The files in the DLQ carry the flaw, so the notch is explained
      // even to a reader who never sees one travel.
      malformed: spot.phase === 'in-dlq',
    } satisfies FlowInstance,
  }))
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function usePipelineAnimation() {
  // Initialised directly rather than set from an effect: for a
  // reduced-motion reader this *is* the diagram, not a later correction to
  // an empty one.
  //
  // Assigned through a null check rather than passed to useRef, which has
  // no lazy initialiser: the argument form is evaluated on every render
  // and discarded on all but the first, so staticScene() (a dozen objects,
  // each seeded with Math.random) would be rebuilt and thrown away every
  // time this component rendered. The effect below drains it to [].
  const initialSceneRef = useRef<ReturnType<typeof staticScene> | null>(null)
  if (initialSceneRef.current === null) {
    initialSceneRef.current = prefersReducedMotion() ? staticScene() : []
  }
  const initialScene = initialSceneRef.current
  const [flows, setFlows] = useState<FlowInstance[]>(() =>
    initialScene.map(({ flow }) => flow),
  )

  // One DOM node per flow, addressed by id. Travel is animated
  // imperatively (see runSegment), so it needs the element, not a re-render.
  const tokenElsRef = useRef(new Map<string, SVGGElement>())
  const mountedRef = useRef(true)
  const idCounterRef = useRef(0)
  // Who is sitting where: the SQS queue, Athena's bounded working set,
  // the DLQ pile and the per-node seat counters. All of it is plain data
  // with rules attached, so it lives in pipelineSeating and is unit
  // tested there. Built through a null check for the same reason as the
  // scene above: useRef would rebuild it on every render.
  const seatingRef = useRef<Seating | null>(null)

  /** The seating model for this mount, built on first use. Read through a
   * function rather than held in a render-scope const so that everything
   * touching it stays ref-only, and the effects that call those functions
   * don't pick up a new dependency that re-runs them every render. */
  function seating(): Seating {
    seatingRef.current ??= createSeating()
    return seatingRef.current
  }
  // Mirrors "how many ambient flows are mid-journey" without reading state,
  // so the spawn loop below can stay one long-lived effect instead of being
  // torn down and rebuilt every time any flow changes.
  const travelingRef = useRef(0)
  // A flow's token element doesn't exist until React has rendered it, so a
  // freshly spawned flow parks its trigger here and the effect below starts
  // it on the next commit, once there's an element to actually move.
  const pendingStartsRef = useRef(
    new Map<string, { trigger: Trigger; onSettled: () => void }>(),
  )
  // Whether ambient traffic is held. Kept as a ref as well as state
  // because `schedule` below reads it when a timer fires, long after the
  // render that set it.
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  // Steps whose pause elapsed while the diagram was held. They run on
  // resume, so pausing stops the pipeline rather than dropping files
  // partway through it.
  const heldStepsRef = useRef<(() => void)[]>([])
  // Every pending timeout this hook owns. A flow is a chain of hops joined
  // by timeouts, so at any moment several are outstanding; without a
  // handle on them, navigating away left ~7 flows still stepping through
  // the diagram, each one scheduling its own successor. mountedRef stops
  // those callbacks writing state, which is exactly what made it invisible:
  // no warning, just work continuing against a component that is gone.
  const timersRef = useRef(new Set<number>())

  /** setTimeout, but cancellable in bulk on unmount and inert once the
   * component has gone. Every timeout in this file goes through here. */
  function setTrackedTimeout(callback: () => void, delayMs: number): number {
    const id = window.setTimeout(() => {
      timersRef.current.delete(id)
      if (!mountedRef.current) return
      callback()
    }, delayMs)
    timersRef.current.add(id)
    return id
  }

  function clearTrackedTimeout(id: number) {
    timersRef.current.delete(id)
    window.clearTimeout(id)
  }

  useEffect(() => {
    // StrictMode's dev-only mount -> cleanup -> mount again means the
    // cleanup below can run once before settling, so re-arm on setup too, or
    // that first (non-final) cleanup would permanently wedge this false.
    mountedRef.current = true
    const timers = timersRef.current
    return () => {
      mountedRef.current = false
      for (const id of timers) window.clearTimeout(id)
      timers.clear()
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
    leaveSqsQueue(id)
    if (!mountedRef.current) return
    setFlows((current) => current.filter((flow) => flow.id !== id))
  }

  /** Draws a queue layout, animating each file to its slot so the one
   * behind a departure visibly slides forward instead of the gap simply
   * appearing. The order itself is decided by the seating model. */
  function applySqsLayout(layout: SeatedFile[]) {
    for (const { id, seat } of layout) {
      const el = tokenElsRef.current.get(id)
      if (!el) continue
      el.style.setProperty(
        'transition',
        'translate var(--motion-duration-slow) var(--motion-ease)',
      )
      el.style.setProperty('translate', `${seat.x}px ${seat.y}px`)
    }
  }

  function enqueueAtSqs(id: string) {
    applySqsLayout(seating().enqueueSqs(id))
  }

  function leaveSqsQueue(id: string) {
    const layout = seating().dequeueSqs(id)
    if (layout) applySqsLayout(layout)
  }

  function registerToken(id: string, el: SVGGElement | null) {
    if (el) tokenElsRef.current.set(id, el)
    else tokenElsRef.current.delete(id)
  }

  function runSegment(
    id: string,
    segment: SegmentKey,
    arrivalNodeId: NodeId,
    onDone: () => void,
  ) {
    // Starting a segment is what "leaving a stop" means, so this is the
    // one place that has to know the token is no longer queued.
    leaveSqsQueue(id)

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
    // because offset-path/offset-distance aren't reliably exposed as named
    // CSSStyleDeclaration accessors even where the CSS property itself is
    // supported, so the camelCase form can silently no-op.
    const durationMs = SEGMENT_DURATIONS_MS[segment]

    el.style.setProperty('transition', 'none')
    el.style.setProperty('offset-path', `path('${SEGMENTS[segment]}')`)
    el.style.setProperty('offset-distance', '0%')
    el.style.setProperty('opacity', '1')
    // Deliberately *not* clearing `translate` here. It holds the offset
    // that seated this file inside the last node's artwork, in a queue
    // slot or on the floor of the lake, and offset-distance 0% is that
    // node's centre, so leaving it alone keeps the file exactly where it
    // visibly is. Zeroing it first, which is what this used to do, made
    // every departure begin with an instant jump of up to ~37px. That
    // snap before each hop is what made the whole thing feel disjointed.
    // It eases out of the seat below instead, while it travels.
    void el.getBoundingClientRect()

    requestAnimationFrame(() => {
      el.style.setProperty(
        'transition',
        `offset-distance ${durationMs}ms linear, translate ${durationMs}ms var(--motion-ease)`,
      )
      el.style.setProperty('offset-distance', '100%')
      el.style.setProperty('translate', '0px 0px')
    })

    // A hop ends exactly once, on whichever of these comes first. Arrival
    // used to hang solely off `transitionend`: if that event never arrived,
    // because the transition was cancelled or interrupted, the sequence
    // stopped there permanently *and* onDone never ran, so this flow's
    // traveling slot was never released. Every occurrence would have cost
    // one of MAX_TRAVELING slots for the life of the page, throttling
    // ambient traffic further each time until nothing moved at all.
    let settled = false

    const settle = (arrivedByTransition: boolean) => {
      if (settled) return
      settled = true
      el.removeEventListener('transitionend', handleEnd)
      el.removeEventListener('transitioncancel', handleCancel)
      clearTrackedTimeout(watchdog)

      if (!arrivedByTransition) {
        // The travel never played out, so put the file where it was headed.
        // Arriving abruptly is much better than stopping halfway down an
        // edge and staying there.
        el.style.setProperty('transition', 'none')
        el.style.setProperty('offset-distance', '100%')
        el.style.setProperty('translate', '0px 0px')
      }

      // Settle into the node's artwork rather than stopping dead on its
      // center: onto the floor of the lake, into a slot of the queue, into
      // a cell of the grid. runSegment clears `translate` on the way out,
      // so this lasts exactly as long as the token is stopped here.
      if (arrivalNodeId === 'sqs') {
        enqueueAtSqs(id)
        updateFlow(id, { arrivedAt: arrivalNodeId })
        onDone()
        return
      }
      const seat = nodeSeat(
        arrivalNodeId,
        seating().nextSeatSlot(arrivalNodeId),
      )
      if (seat) {
        el.style.setProperty(
          'transition',
          'translate var(--motion-duration-slow) var(--motion-ease)',
        )
        el.style.setProperty('translate', `${seat.x}px ${seat.y}px`)
      }
      updateFlow(id, { arrivedAt: arrivalNodeId })
      onDone()
    }

    const handleEnd = (event: TransitionEvent) => {
      // Two properties are animating now; only the travel ends the hop.
      if (event.propertyName !== 'offset-distance') return
      settle(true)
    }

    const handleCancel = (event: TransitionEvent) => {
      if (event.propertyName !== 'offset-distance') return
      settle(false)
    }

    // Last resort, and normally dead code. Under prefers-reduced-motion
    // base.css collapses every transition to near zero, so the real event
    // still wins this race by a wide margin there too.
    const watchdog = setTrackedTimeout(
      () => settle(false),
      durationMs + TRANSITION_WATCHDOG_SLACK_MS,
    )

    el.addEventListener('transitionend', handleEnd)
    el.addEventListener('transitioncancel', handleCancel)
  }

  // The pause between segments (runFlowLegs/runSequence's `schedule`
  // parameter) is a plain setTimeout, not a CSS transition/animation, so
  // unlike everything else driving this diagram, it does NOT automatically
  // collapse under prefers-reduced-motion via the global base.css override.
  // Left alone, a reduced-motion visitor would still sit through several
  // real seconds of pauses even though every visual transition had gone
  // instant, which defeats the point. Checked per call rather than cached
  // once, since matchMedia's result can change mid-session if the OS
  // setting does. The state progression itself is unaffected: every stop
  // is still visited and every phase still announced, just without the
  // multi-second forced wait between them.
  function schedule(callback: () => void, delayMs: number) {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    setTrackedTimeout(
      () => {
        // Held rather than dropped, and held here rather than by not
        // starting the timer, so a file already in flight still finishes the
        // hop it is on and comes to rest in a node instead of stopping
        // halfway along an edge.
        if (pausedRef.current) {
          heldStepsRef.current.push(callback)
          return
        }
        callback()
      },
      prefersReducedMotion ? 20 : delayMs,
    )
  }

  function runTrigger(id: string, trigger: Trigger, onSettled: () => void) {
    const runStep: StepRunner = (segment, arrival, onDone) =>
      runSegment(id, segment, arrival, onDone)

    runFlowLegs(
      getFlow(trigger),
      (phase) => updateFlow(id, { phase }),
      runStep,
      () => {
        const finalPhase = getFinalPhase(trigger)
        if (finalPhase === 'done-success') parkAtAthena(id)
        if (finalPhase === 'in-dlq') {
          // Park it in the DLQ cluster, where it stays, visibly, until a
          // redrive sweeps the whole backlog.
          const seat = seating().nextDlqSeat()
          tokenElsRef.current
            .get(id)
            ?.style.setProperty('translate', `${seat.x}px ${seat.y}px`)
        }
        updateFlow(id, { phase: finalPhase })
        onSettled()
      },
      schedule,
    )
  }

  /** Parks a file at a stop with no journey and no animation. The token
   * groups sit directly in the SVG's own coordinate space, so placing one
   * is a plain translate to absolute coordinates, with no offset-path, which
   * is the part that would need a path to travel along. */
  function placeStatically(
    id: string,
    at: NodeId,
    seat: { x: number; y: number },
  ) {
    const el = tokenElsRef.current.get(id)
    if (!el) return
    el.style.setProperty(
      'translate',
      `${getNode(at).x + seat.x}px ${getNode(at).y + seat.y}px`,
    )
    el.style.setProperty('opacity', '1')
  }

  // Placement has to wait for React to render the elements, exactly as a
  // spawned flow's first segment does.
  // Placement waits for React to have rendered the elements, exactly as a
  // spawned flow's first segment does. Runs once, since it only ever has
  // anything to do on the first commit.
  useEffect(() => {
    for (const { spot, flow } of initialSceneRef.current ?? []) {
      placeStatically(flow.id, spot.at, spot.seat)
    }
    initialSceneRef.current = []
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Adds a finished record to Athena's grid, dropping whatever the
   * grid evicted to make room for it. */
  function parkAtAthena(id: string) {
    for (const evicted of seating().parkAtAthena(id)) removeFlow(evicted)
  }

  /** Adds a flow to state and defers its first segment until React has
   * actually rendered a token element for it. */
  function spawnFlow(
    flow: FlowInstance,
    trigger: Trigger,
    onSettled: () => void,
  ) {
    pendingStartsRef.current.set(flow.id, { trigger, onSettled })
    setFlows((current) => [...current, flow])
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

  function spawnFlowOnSchedule(forcedOutcome?: 'success' | 'failure') {
    // Someone who asked for less motion shouldn't get perpetual background
    // traffic they never opted into. Their own telemetry still runs when
    // they click for it, and that one is a deliberate action, not ambience.
    if (prefersReducedMotion()) return
    if (pausedRef.current) return
    if (travelingRef.current >= MAX_TRAVELING) return
    const id = `flow-${idCounterRef.current++}`
    const outcome = forcedOutcome ?? pickAmbientOutcome()
    travelingRef.current += 1

    spawnFlow(
      {
        id,
        phase: 'idle',
        arrivedAt: null,
        dots: createDotOffsets(),
        malformed: outcome === 'failure',
      },
      outcome,
      () => {
        // Either way it has stopped traveling, so it frees a slot: a failed
        // flow now sits parked in the DLQ, a successful one in Athena's
        // grid. Neither is deleted here: both are still on screen, and
        // both are somebody else's job to clear (a redrive, or the grid
        // filling up).
        travelingRef.current -= 1
      },
    )
  }

  // The spawn loop below lives for the component's lifetime, so a direct
  // call would pin it to the first render's closure forever. Pointing it
  // at a ref that's refreshed every render keeps the loop long-lived
  // without making it a place stale state can hide.
  const spawnRef = useRef(spawnFlowOnSchedule)
  useEffect(() => {
    spawnRef.current = spawnFlowOnSchedule
  })

  useEffect(() => {
    let cancelled = false
    let timeoutId = 0

    function queueNextSpawn() {
      timeoutId = window.setTimeout(() => {
        if (cancelled) return
        spawnRef.current()
        queueNextSpawn()
      }, randomSpawnDelay())
    }

    // Reduced motion gets the still-life scene set up above instead.
    if (prefersReducedMotion()) return () => undefined

    // Seed a few immediately. Left to the loop alone the diagram spends
    // its first half-minute nearly empty while it fills to the cap, and an
    // empty pipeline is the wrong first impression of a system that is
    // supposed to look like it's running. The jittered spawn interval
    // fans them out within a stop or two, so it isn't a starting gun.
    // One of these is a guaranteed failure. At the steady-state rate the
    // first one is a die roll, and measured runs have taken anywhere from
    // ten seconds to over a minute. Until it lands there is no
    // backlog, no Slack badge and nothing for the Redrive button to do,
    // so the entire failure pathway is invisible for an unbounded stretch
    // of a visit. That's too much of the diagram's argument to leave to
    // chance. It's seeded second, so the first thing a visitor sees is
    // still an ordinary file going through.
    const seeded: ('success' | 'failure')[] = ['success', 'failure', 'success']
    seeded.forEach((outcome, i) => {
      window.setTimeout(() => {
        if (!cancelled) spawnRef.current(outcome)
      }, i * 400)
    })

    queueNextSpawn()
    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
    // Runs once for the component's lifetime, since everything it touches is a
    // ref, so it never needs rebuilding as flows come and go.
  }, [])

  // --- the visitor's own telemetry ----------------------------------------

  // The one thing a visitor sets off. It clears the whole backlog, not one
  // file, which is what redriving a queue actually does, and the files go
  // back unchanged: what got fixed is the parser.
  /** Holds or releases the background traffic. Files already moving
   * finish their current hop and settle at the next node, so a paused
   * diagram is a still one rather than a frozen frame. */
  function togglePaused() {
    setPaused((wasPaused) => {
      const nowPaused = !wasPaused
      pausedRef.current = nowPaused
      if (!nowPaused) {
        const held = heldStepsRef.current
        heldStepsRef.current = []
        for (const step of held) step()
      }
      return nowPaused
    })
  }

  function redrive() {
    const held = flows.filter((flow) => flow.phase === 'in-dlq')
    if (held.length === 0) return
    for (const flow of held) {
      travelingRef.current += 1
      runTrigger(flow.id, 'redrive', () => {
        travelingRef.current -= 1
      })
    }
  }

  // Every file in the DLQ, not just the visitor's own. The Slack badge is
  // reporting on the queue, and the firmware team's digest counts whatever
  // is actually sitting in it.
  const dlqCount = flows.filter((flow) => flow.phase === 'in-dlq').length
  const redriving = flows.some((flow) => flow.phase === 'traveling-redrive')

  // Reduced-motion visitors get the still-life scene and no ambient
  // traffic, so there is nothing for a pause control to act on.
  const canPause = !prefersReducedMotion()

  return {
    flows,
    dlqCount,
    redriving,
    registerToken,
    redrive,
    paused,
    togglePaused,
    canPause,
  }
}
