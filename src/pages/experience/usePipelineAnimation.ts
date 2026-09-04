import { useEffect, useRef, useState } from 'react'
import { SEGMENTS, type NodeId, type Phase } from './pipelineData'
import {
  getFinalPhase,
  getFlow,
  runFlowLegs,
  type StepRunner,
} from './pipelineFlow'

export function usePipelineAnimation() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [highlightedNode, setHighlightedNode] = useState<NodeId | null>(null)
  const tokenRef = useRef<SVGCircleElement>(null)

  // Guards against two real gaps in the setTimeout-chained animation below:
  // a click re-entering addTelemetry/redrive while a run is already in
  // flight (the buttons that trigger them are supposed to be unmounted by
  // then, but two clicks landing in the same tick can both fire before
  // React re-renders), and a stray setTimeout/transitionend callback
  // touching state after the component has unmounted. Refs rather than
  // state since both need to be read synchronously, mid-tick, by code that
  // isn't triggered by a render.
  const runningRef = useRef(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    // StrictMode's dev-only mount -> cleanup -> mount again means the
    // cleanup below can run once before settling — re-arm on setup too, or
    // that first (non-final) cleanup would permanently wedge this false.
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  function safeSetPhase(next: Phase) {
    if (mountedRef.current) setPhase(next)
  }

  function runSegment(
    pathD: string,
    arrivalNodeId: NodeId,
    onDone: () => void,
  ) {
    const el = tokenRef.current
    if (!el) return

    // setProperty rather than camelCase assignment (el.style.offsetPath = ...)
    // — offset-path/offset-distance aren't reliably exposed as named
    // CSSStyleDeclaration accessors even where the CSS property itself is
    // supported, so the camelCase form can silently no-op.
    el.style.setProperty('transition', 'none')
    el.style.setProperty('offset-path', `path('${pathD}')`)
    el.style.setProperty('offset-distance', '0%')
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
      if (mountedRef.current) setHighlightedNode(arrivalNodeId)
      onDone()
    }
    el.addEventListener('transitionend', handleEnd)
  }

  const runStep: StepRunner = (segment, arrival, onDone) =>
    runSegment(SEGMENTS[segment], arrival, onDone)

  // The outcome is chosen upfront (two buttons, not a mid-journey pause) —
  // otherwise the token would sit waiting at the parser indefinitely if the
  // visitor just never clicked anything. It still travels the common leg
  // first, then chains straight into the chosen outcome leg with no pause
  // in between, so the payload panel still visibly flips from raw bytes to
  // decoded/error exactly when the token reaches the parser.
  function addTelemetry(outcome: 'success' | 'failure') {
    if (runningRef.current || (phase !== 'idle' && phase !== 'done-success'))
      return
    runningRef.current = true
    setHighlightedNode('device')
    runFlowLegs(getFlow(outcome), safeSetPhase, runStep, () => {
      runningRef.current = false
      safeSetPhase(getFinalPhase(outcome))
    })
  }

  function redrive() {
    if (runningRef.current || phase !== 'in-dlq') return
    runningRef.current = true
    // The whole point of a redrive is that the parser's been fixed — it
    // always succeeds on the retry.
    runFlowLegs(getFlow('redrive'), safeSetPhase, runStep, () => {
      runningRef.current = false
      safeSetPhase(getFinalPhase('redrive'))
    })
  }

  const notified = phase === 'in-dlq' || phase === 'traveling-redrive'

  return { phase, highlightedNode, tokenRef, notified, addTelemetry, redrive }
}
