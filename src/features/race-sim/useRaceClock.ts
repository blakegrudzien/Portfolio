import { useEffect, useRef, useState } from 'react'
import { RACE_DURATION_SECONDS, RUNNERS, runnerFraction } from './logic/runners'

/** Race seconds per second of wall clock.
 *
 * 100 puts the 3:13 race at 1:56, and more usefully it puts a timing point
 * under the leader every 5.8 seconds, which is the rhythm the rest of the
 * diagram is paced against: frequent enough that nobody waits for one,
 * slow enough that an arrival can finish being drawn before the next. */
export const PLAYBACK_RATE = 100

/** How long a finished race holds on its result before running again.
 *
 * Counted in wall-clock seconds off the same frame loop as the race, so it
 * stops while the tab is in the background along with everything else. A
 * plain timer would keep running and a visitor returning from another tab
 * would find a race that had finished, held, reset and started again
 * without them. */
export const HOLD_SECONDS = 30

/** The longest frame gap worth trusting.
 *
 * requestAnimationFrame is not serviced in a hidden tab, so the first
 * frame after returning reports however long the tab was away. Without
 * this clamp that whole gap would be spent at 100x and a visitor who
 * looked away for a minute would come back to a finished race. Clamping
 * is the entire pause mechanism: nothing advances except by frames, and
 * no frames arrive while nobody is looking. */
const MAX_FRAME_MS = 100

/** Where the field is frozen for a reduced-motion reader. Far enough in
 * that the runners are spread out and the race has a shape to read. */
const STILL_FRACTION = 0.55

/** How often the race time is published to React, in milliseconds.
 *
 * Positions are written straight to the elements every frame, but the
 * watch panel is text and has to re-render to change. Republishing at
 * roughly twelve times a second keeps its clock moving without putting a
 * sixty-per-second render through the whole diagram to do it. At 100x the
 * watch's seconds are flying by regardless, which is honest about a race
 * being replayed at speed. */
const PUBLISH_EVERY_MS = 80

export type RacePhase = 'running' | 'holding'

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Drives the one clock everything else reads.
 *
 * Positions are written straight to the elements rather than through
 * state, because a frame loop that re-rendered would re-render every
 * runner, every timing point and eventually the watch panel sixty times a
 * second to move eight dots. `--at` is a custom property the stylesheet
 * feeds to `offset-distance`; see RaceCourse.module.css for why it is not
 * set as a style property directly.
 */
export function useRaceClock() {
  const [phase, setPhase] = useState<RacePhase>('running')
  // Derived during render rather than set from the effect below: whether
  // someone asked for less motion is already true by the time this first
  // renders, so there is nothing to synchronise.
  const isStill = prefersReducedMotion()

  /** Race seconds, as the rest of the page sees it. Lags the positions by
   * up to PUBLISH_EVERY_MS, which is invisible and saves re-rendering the
   * course to move a clock. */
  const [displaySeconds, setDisplaySeconds] = useState(() =>
    isStill ? RACE_DURATION_SECONDS * STILL_FRACTION : 0,
  )

  const runnerEls = useRef(new Map<number, SVGGElement>())
  const raceWallRef = useRef(0)
  const holdWallRef = useRef(0)
  const phaseRef = useRef<RacePhase>('running')
  const publishedAtRef = useRef(0)

  function registerRunner(bib: number, el: SVGGElement | null) {
    if (el) runnerEls.current.set(bib, el)
    else runnerEls.current.delete(bib)
  }

  /** Puts every runner where the model says they are at `raceSeconds`. */
  function paint(raceSeconds: number) {
    for (const runner of RUNNERS) {
      const el = runnerEls.current.get(runner.bib)
      if (!el) continue
      const fraction = runnerFraction(runner, raceSeconds)
      el.style.setProperty('--at', `${(fraction * 100).toFixed(3)}%`)
    }
  }

  function restart() {
    raceWallRef.current = 0
    holdWallRef.current = 0
    phaseRef.current = 'running'
    setPhase('running')
    setDisplaySeconds(0)
    // Painted here as well as on the next frame, so the button feels like
    // it did something even if the frame is a beat away.
    paint(0)
  }

  useEffect(() => {
    // Nothing to publish here: the state above is initialised to this
    // moment already, since whether motion is wanted is known at render.
    if (prefersReducedMotion()) {
      paint(RACE_DURATION_SECONDS * STILL_FRACTION)
      return
    }

    let frame = 0
    let last = performance.now()

    const tick = (now: number) => {
      // Clamped at both ends. The ceiling is the pause mechanism described
      // above; the floor is because a frame timestamp is not guaranteed to
      // be later than the one before it, and a negative delta would run the
      // race backwards rather than merely stalling it.
      const deltaMs = Math.max(0, Math.min(now - last, MAX_FRAME_MS))
      const deltaSeconds = deltaMs / 1000
      last = now

      if (phaseRef.current === 'running') {
        raceWallRef.current += deltaSeconds
        const raceSeconds = raceWallRef.current * PLAYBACK_RATE

        if (raceSeconds >= RACE_DURATION_SECONDS) {
          paint(RACE_DURATION_SECONDS)
          setDisplaySeconds(RACE_DURATION_SECONDS)
          holdWallRef.current = 0
          phaseRef.current = 'holding'
          setPhase('holding')
        } else {
          paint(raceSeconds)
          if (now - publishedAtRef.current >= PUBLISH_EVERY_MS) {
            publishedAtRef.current = now
            setDisplaySeconds(raceSeconds)
          }
        }
      } else {
        holdWallRef.current += deltaSeconds
        if (holdWallRef.current >= HOLD_SECONDS) {
          raceWallRef.current = 0
          phaseRef.current = 'running'
          setPhase('running')
          setDisplaySeconds(0)
          paint(0)
        }
      }

      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // Runs once for the component's lifetime. Everything it touches is a
    // ref, so there is nothing for it to go stale against.
  }, [])

  return { registerRunner, phase, restart, isStill, displaySeconds }
}
