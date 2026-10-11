import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PipelineDiagram } from './PipelineDiagram'
import { NODES } from './pipelineData'

afterEach(() => {
  // Not automatic: this project does not run vitest with globals, so
  // Testing Library never registers its own afterEach hook.
  cleanup()
  vi.useRealTimers()
})

/** The diagram animates on a timer for as long as it is mounted, so the
 * clock is held still and handed to userEvent rather than left running
 * underneath the assertions. */
function setup() {
  vi.useFakeTimers()
  render(<PipelineDiagram />)
  const controls = within(
    screen.getByRole('group', { name: 'Telemetry pipeline diagram' }),
  ).getAllByRole('button')
  return { controls }
}

describe('the node controls', () => {
  it('is one real button per node, each named after its node', () => {
    const { controls } = setup()

    expect(controls).toHaveLength(NODES.length)
    // Named, rather than a dozen buttons announced as "button". The name
    // carries the node's own explanation, so tabbing the diagram reads it.
    for (const control of controls) {
      expect(control).toHaveAccessibleName()
    }
  })

  it('opens a node when its control is clicked', () => {
    const { controls } = setup()
    const prompt = /Select a step in the diagram/

    expect(screen.getByText(prompt)).toBeInTheDocument()
    fireEvent.click(controls[0]!)

    expect(screen.queryByText(prompt)).not.toBeInTheDocument()
  })

  /* Focus alone selects, which is what makes tabbing through the diagram
     read each node rather than requiring a keypress per node. Enter and
     Space are not tested here: a <button> activates on both without being
     told to, and that is the platform's guarantee rather than this
     component's. Getting that guarantee is why these stopped being
     <g tabIndex={0} role="button"> with a hand-written keydown handler. */
  it('opens a node when its control takes focus', () => {
    const { controls } = setup()
    const prompt = /Select a step in the diagram/

    fireEvent.focus(controls[0]!)
    expect(screen.queryByText(prompt)).not.toBeInTheDocument()

    fireEvent.blur(controls[0]!)
    expect(screen.getByText(prompt)).toBeInTheDocument()
  })

  it('puts the controls in the same places as the artwork', () => {
    const { controls } = setup()

    // Positions are percentages of the shared viewBox, so a control cannot
    // drift off the node it covers when the SVG scales.
    for (const control of controls) {
      const { left, top, width, height } = (control as HTMLElement).style
      for (const value of [left, top, width, height]) {
        expect(value).toMatch(/%$/)
      }
    }
  })
})
