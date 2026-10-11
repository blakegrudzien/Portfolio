import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PipelineDiagram } from './PipelineDiagram'
import { ATHENA_CAPACITY, nodeSeat } from './pipelineData'

const realRaf = window.requestAnimationFrame
const realCancelRaf = window.cancelAnimationFrame

afterEach(() => {
  window.requestAnimationFrame = realRaf
  window.cancelAnimationFrame = realCancelRaf
  vi.useRealTimers()
})

/** The twelve cells of Athena's grid, as the inline `translate` a file
 * parked in one carries. Derived from the same seat table the animation
 * reads, so this cannot drift from it. */
const ATHENA_CELLS = new Set(
  Array.from({ length: ATHENA_CAPACITY }, (_, slot) => {
    const seat = nodeSeat('athena', slot)
    if (!seat) throw new Error(`no athena seat for slot ${slot}`)
    return `${seat.x}px ${seat.y}px`
  }),
)

/** Every token element currently on the diagram. Tokens are the direct
 * children of the SVG that carry an inline `translate`; node groups are
 * placed with a `transform` attribute instead. */
function tokens(container: HTMLElement) {
  const svg = container.querySelector('svg')
  if (!svg) throw new Error('no diagram rendered')
  return [...svg.children].filter(
    (el): el is SVGGElement =>
      el.tagName === 'g' && !el.getAttribute('transform'),
  )
}

/** Drives document.hidden, which jsdom exposes as a getter with no setter,
 * and raises the event the browser pairs with it. */
function setTabHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => hidden,
  })
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

describe('a tab nobody is looking at', () => {
  afterEach(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false,
    })
  })

  it('spawns nothing while hidden, and starts when the tab is looked at', () => {
    vi.useFakeTimers()
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => true,
    })

    const { container } = render(<PipelineDiagram />)
    act(() => {
      vi.advanceTimersByTime(60_000)
    })

    // A minute in the background. Nothing should have been spawned at all,
    // seeded files included: a link opened in a background tab would
    // otherwise burn its seeded failure off screen.
    expect(tokens(container)).toHaveLength(0)

    setTabHidden(false)
    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    expect(tokens(container).length).toBeGreaterThan(0)
  })

  it('stops spawning again when the tab is left, without dropping what is on screen', () => {
    vi.useFakeTimers()
    const { container } = render(<PipelineDiagram />)
    act(() => {
      vi.advanceTimersByTime(30_000)
    })
    const whileWatching = tokens(container).length
    expect(whileWatching).toBeGreaterThan(0)

    setTabHidden(true)
    act(() => {
      vi.advanceTimersByTime(300_000)
    })

    // Five minutes away. Files in flight are left to finish and park, so
    // the count can fall as Athena's grid evicts, but nothing new arrives,
    // which is what used to fill the DLQ unwatched.
    expect(tokens(container).length).toBeLessThanOrEqual(whileWatching)
  })
})

describe('coming back to a backgrounded tab', () => {
  it('leaves parked files in their seats rather than at the node centre', () => {
    // Only timers are faked. A hidden tab keeps running them while it stops
    // servicing requestAnimationFrame altogether, so rAF is replaced
    // separately below rather than driven by the same clock.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

    const withheld: FrameRequestCallback[] = []
    window.requestAnimationFrame = (cb: FrameRequestCallback) =>
      withheld.push(cb)
    // Deliberately a no-op, so cancelling cannot be what makes this pass.
    // A callback the browser has already dequeued runs whatever we do, so
    // the hop itself has to know it is over.
    window.cancelAnimationFrame = () => {}

    const { container } = render(<PipelineDiagram />)

    // Time passing with nobody looking. Hops settle on the watchdog, since
    // no transition ever runs to raise transitionend.
    for (let i = 0; i < 200; i++) {
      act(() => {
        vi.advanceTimersByTime(250)
      })
    }

    // Files parked in Athena's grid, specifically. Athena is the end of the
    // line, so a file in a cell there has no next hop and must not move
    // again until the grid evicts it. A file stopped anywhere else may
    // legitimately be mid-departure, still showing the seat it is easing
    // out of, and a frame that starts that hop is supposed to zero it.
    const seated = tokens(container)
      .map((el) => ({ el, seat: el.style.translate }))
      .filter(({ seat }) => ATHENA_CELLS.has(seat))
    expect(seated.length).toBeGreaterThan(0)

    // Back to the tab: everything the browser withheld now runs at once.
    const pending = withheld.filter(Boolean)
    expect(pending.length).toBeGreaterThan(0)
    act(() => {
      for (const cb of pending) cb(0)
    })

    // Each parked file must still be in its seat. Before this was fixed the
    // withheld callbacks set `translate: 0px 0px` on every token that had
    // moved while hidden, dropping parked files onto their node's centre,
    // where nothing would ever move them again because their hop had
    // already settled. Visible on Athena, which is drawn as a twelve-cell
    // grid, as a record sitting in the middle of the table and not in a cell.
    const displaced = seated
      .filter(({ el, seat }) => el.style.translate !== seat)
      .map(({ seat, el }) => `cell ${seat} became ${el.style.translate}`)
    expect(displaced).toEqual([])
  })
})
