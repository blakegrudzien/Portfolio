import { act, cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CHECKPOINTS } from '../logic/course'
import { RACE_DURATION_SECONDS, RUNNERS } from '../logic/runners'
import { HOLD_SECONDS, PLAYBACK_RATE } from '../useRaceClock'
import { RaceSimulation } from './RaceSimulation'

const realRaf = window.requestAnimationFrame
const realCancelRaf = window.cancelAnimationFrame

afterEach(() => {
  window.requestAnimationFrame = realRaf
  window.cancelAnimationFrame = realCancelRaf
  cleanup()
  vi.restoreAllMocks()
})

/** Hands the frame loop a clock we drive by hand. jsdom has no frame loop
 * of its own, and the hook advances only by frames, so this is the whole
 * clock as far as the component is concerned. */
function frameDriver() {
  let pending: FrameRequestCallback | null = null
  // Started from the real clock, because the hook seeds itself with
  // performance.now() and timestamps that began at zero would hand it a
  // large negative first delta.
  let now = performance.now()
  window.requestAnimationFrame = (cb) => {
    pending = cb
    return 1
  }
  window.cancelAnimationFrame = () => {
    pending = null
  }
  return {
    /** Runs frames at 16ms until `wallSeconds` of wall clock have passed. */
    advance(wallSeconds: number) {
      const until = now + wallSeconds * 1000
      act(() => {
        while (pending && now < until) {
          now = Math.min(now + 16, until)
          const cb = pending
          pending = null
          cb(now)
        }
      })
    },
    /** Serves a single frame whose timestamp is `wallSeconds` later than
     * the last one, which is what returning to a backgrounded tab looks
     * like: no frames for a while, then one with a very large delta. */
    jump(wallSeconds: number) {
      now += wallSeconds * 1000
      act(() => {
        const cb = pending
        pending = null
        cb?.(now)
      })
    },
    get stopped() {
      return pending === null
    },
  }
}

/** The watch's timer cell, which is the one value the watch counts for
 * itself. Found through its label because several cells print h:mm:ss. */
function timerCell() {
  return screen.getByText('TIMER').parentElement as HTMLElement
}

/** The course diagram. There are two SVGs on this page and the propagation
 * strip draws circles and lines of its own, so anything counting shapes has
 * to say which drawing it means. */
function course(container: HTMLElement) {
  const svg = container.querySelector('svg')
  if (!svg) throw new Error('no course rendered')
  return svg
}

/** Where a runner has been placed, as a fraction of the course. */
function positions(container: HTMLElement) {
  return [...course(container).querySelectorAll('circle')].map((circle) => {
    const group = circle.parentElement as unknown as SVGGElement
    return Number.parseFloat(group.style.getPropertyValue('--at')) || 0
  })
}

describe('the course', () => {
  it('draws the road, a cable per timing point and a runner per bib', () => {
    const { container } = render(<RaceSimulation />)

    // One short of the timing points on purpose: the course is closed, so
    // the finish is the same stretch of road as the start and shares its
    // mark. Drawing both put two cables on one spot at different angles,
    // which rendered as a plus sign rather than a start line.
    expect(course(container).querySelectorAll('line')).toHaveLength(
      CHECKPOINTS.length - 1,
    )
    expect(CHECKPOINTS.filter((c) => c.kind === 'finish')).toHaveLength(1)
    expect(course(container).querySelectorAll('circle')).toHaveLength(
      RUNNERS.length,
    )
  })

  it('is wide enough to need sideways scrolling on a phone, and says so', () => {
    const { container } = render(<RaceSimulation />)

    // Hidden by a media query above the width where it fits; the assertion
    // is that it exists to be revealed, not that it is visible here.
    expect(screen.getByText(/Scroll the course sideways/)).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('gives each runner their own lane so two at the same distance do not stack', () => {
    const { container } = render(<RaceSimulation />)
    const lanes = [...course(container).querySelectorAll('circle')].map((c) =>
      c.getAttribute('cy'),
    )

    expect(new Set(lanes).size).toBe(RUNNERS.length)
  })
})

describe('the clock', () => {
  it('starts everyone on the line', () => {
    const driver = frameDriver()
    const { container } = render(<RaceSimulation />)
    driver.advance(0.1)

    expect(positions(container).every((p) => p < 1)).toBe(true)
  })

  it('moves the field down the course, in pace order', () => {
    const driver = frameDriver()
    const { container } = render(<RaceSimulation />)

    driver.advance(RACE_DURATION_SECONDS / PLAYBACK_RATE / 2)
    const halfway = positions(container)

    expect(Math.max(...halfway)).toBeGreaterThan(40)
    // The declaration order is fastest first, so the field should be
    // spread out and in roughly that order.
    expect(halfway[0]!).toBeGreaterThan(halfway.at(-1)!)
  })

  /* The clamp in the hook is the whole pause mechanism: nothing advances
     except by frames, and a hidden tab is served none. A visitor who looks
     away must not come back to a finished race. */
  it('does not spend a backgrounded minute running the race', () => {
    const driver = frameDriver()
    const { container } = render(<RaceSimulation />)

    driver.advance(5)
    const before = Math.max(...positions(container))

    // Away for a minute, then one frame arrives reporting the whole gap.
    // Unclamped that is 6,000 race seconds at 100x, which would put the
    // leader most of the way round; the clamp should let through a tenth
    // of a second, which is ten race seconds and barely visible.
    driver.jump(60)
    const after = Math.max(...positions(container))

    expect(after).toBeGreaterThan(before)
    expect(after - before).toBeLessThan(1)
  })

  it('holds on the result when the last runner is in, then starts again', () => {
    const driver = frameDriver()
    const { container } = render(<RaceSimulation />)
    const raceWallSeconds = RACE_DURATION_SECONDS / PLAYBACK_RATE

    driver.advance(raceWallSeconds + 1)
    expect(screen.getByText(/Everyone is in/)).toBeInTheDocument()
    // Every runner parked on the finish.
    expect(positions(container).every((p) => p === 100)).toBe(true)

    driver.advance(HOLD_SECONDS + 1)
    expect(screen.queryByText(/Everyone is in/)).not.toBeInTheDocument()
    expect(Math.max(...positions(container))).toBeLessThan(100)
  })

  it('puts everyone back on the line when restarted', () => {
    const driver = frameDriver()
    const { container } = render(<RaceSimulation />)

    driver.advance(30)
    expect(Math.max(...positions(container))).toBeGreaterThan(0)

    act(() => {
      screen.getByRole('button', { name: 'Restart the race' }).click()
    })
    expect(positions(container)).toEqual(RUNNERS.map(() => 0))
  })
})

describe('with motion turned off', () => {
  it('shows the field partway through the race and nothing moves', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList)

    const driver = frameDriver()
    const { container } = render(<RaceSimulation />)

    // Spread out, and nobody on the start line.
    const placed = positions(container)
    expect(Math.min(...placed)).toBeGreaterThan(0)
    expect(new Set(placed).size).toBe(RUNNERS.length)

    // No frame loop was ever asked for, and no restart to offer.
    expect(driver.stopped).toBe(true)
    expect(
      screen.queryByRole('button', { name: 'Restart the race' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/Motion is off/)).toBeInTheDocument()
  })
})

describe('picking a runner', () => {
  it('has one button per runner and one of them already chosen', () => {
    frameDriver()
    render(<RaceSimulation />)
    const roster = screen.getByRole('group', { name: 'Pick a runner' })
    const rows = within(roster).getAllByRole('button')

    expect(rows).toHaveLength(RUNNERS.length)
    // Something has to be selected, or the watch opens empty with nothing
    // saying any of this can be poked at.
    expect(
      rows.filter((r) => r.getAttribute('aria-pressed') === 'true'),
    ).toHaveLength(1)
  })

  it('shows the chosen runner on the watch, and switches', () => {
    const driver = frameDriver()
    render(<RaceSimulation />)
    driver.advance(40)

    const roster = screen.getByRole('group', { name: 'Pick a runner' })
    const other = within(roster).getByRole('button', { name: /657/ })
    expect(screen.getByText('#3701')).toBeInTheDocument()

    act(() => other.click())

    expect(screen.getByText('#657')).toBeInTheDocument()
    expect(other).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('the watch', () => {
  it('says pending before the first timing point has anything to give', () => {
    frameDriver()
    render(<RaceSimulation />)

    // Everyone is on the start line, where there is no pace to quote.
    expect(screen.getAllByText('pending').length).toBeGreaterThan(0)
    expect(screen.getByText(/^no cable yet/)).toBeInTheDocument()
  })

  /* The whole argument of the page, asserted. Five values are frozen at the
     last cable and only the timer moves, so a runner between two timing
     points is reading numbers from the one behind them. */
  it('holds its values between timing points while the timer runs on', () => {
    const driver = frameDriver()
    render(<RaceSimulation />)
    driver.advance(40)

    const split = () => screen.getByText(/^last cable/).textContent
    const timer = () => timerCell().textContent

    // Stepped rather than advanced in one go: a whole second of wall clock
    // is a hundred race seconds, which is long enough to cross the next
    // cable, and then of course the split has changed. The assertion is
    // that a step exists where the timer moves and the split does not.
    let heldWhileTimerRan = false
    for (let i = 0; i < 20 && !heldWhileTimerRan; i++) {
      const before = { split: split(), timer: timer() }
      driver.advance(0.2)
      heldWhileTimerRan = split() === before.split && timer() !== before.timer
    }

    expect(heldWhileTimerRan).toBe(true)
  })

  it('eventually reports a real split rather than pending', () => {
    const driver = frameDriver()
    render(<RaceSimulation />)
    driver.advance(60)

    expect(screen.getByText(/^last cable . mi \d/)).toBeInTheDocument()
  })
})

describe('the propagation strip', () => {
  it('names every hop a crossing makes to reach the wrist', () => {
    frameDriver()
    render(<RaceSimulation />)

    for (const hop of ['Cable', 'Firestore', 'Phone', 'Watch']) {
      expect(screen.getByText(hop)).toBeInTheDocument()
    }
  })
})
