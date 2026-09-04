import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MarblePuzzle } from './MarblePuzzle'

function marbleButton(n: number) {
  return screen.getByRole('button', { name: new RegExp(`^Marble ${n},`) })
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('MarblePuzzle', () => {
  it('renders all 12 marbles, initially unassigned', () => {
    render(<MarblePuzzle />)
    for (let n = 1; n <= 12; n++) {
      expect(marbleButton(n)).toHaveAccessibleName(
        `Marble ${n}, not on the scale`,
      )
    }
  })

  it('cycles a marble through left pan -> right pan -> off on repeated clicks', async () => {
    const user = userEvent.setup()
    render(<MarblePuzzle />)
    const marble1 = marbleButton(1)

    await user.click(marble1)
    expect(marble1).toHaveAccessibleName('Marble 1, left pan')

    await user.click(marble1)
    expect(marble1).toHaveAccessibleName('Marble 1, right pan')

    await user.click(marble1)
    expect(marble1).toHaveAccessibleName('Marble 1, not on the scale')
  })

  it('toggles a marble via the keyboard alone, no mouse', async () => {
    const user = userEvent.setup()
    render(<MarblePuzzle />)
    const marble1 = marbleButton(1)

    marble1.focus()
    await user.keyboard('{Enter}')
    expect(marble1).toHaveAccessibleName('Marble 1, left pan')

    await user.keyboard(' ')
    expect(marble1).toHaveAccessibleName('Marble 1, right pan')
  })

  it('only enables "Weigh" once both pans hold an equal, non-zero number of marbles', async () => {
    const user = userEvent.setup()
    render(<MarblePuzzle />)
    const weighButton = screen.getByRole('button', { name: 'Weigh' })
    expect(weighButton).toBeDisabled()

    await user.click(marbleButton(1))
    expect(weighButton).toBeDisabled() // 1 vs 0

    await user.click(marbleButton(2))
    await user.click(marbleButton(2)) // left -> right
    expect(weighButton).toBeEnabled() // 1 vs 1
  })

  it('logs each weighing to history and hides "Weigh" once the budget is used', async () => {
    const user = userEvent.setup()
    render(<MarblePuzzle />)

    for (let i = 0; i < 3; i++) {
      const a = i * 2 + 1
      const b = i * 2 + 2
      await user.click(marbleButton(a))
      await user.click(marbleButton(b))
      await user.click(marbleButton(b)) // move b to the right pan
      await user.click(screen.getByRole('button', { name: 'Weigh' }))
    }

    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(
      screen.queryByRole('button', { name: 'Weigh' }),
    ).not.toBeInTheDocument()
  })

  it('shows a lucky-guess result for a correct answer with no weighings done', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // solution: marble 1, heavier
    const user = userEvent.setup()
    render(<MarblePuzzle />)

    await user.selectOptions(
      screen.getByLabelText('Which marble is the odd one?'),
      'Marble 1',
    )
    await user.click(screen.getByLabelText('Heavier'))
    await user.click(screen.getByRole('button', { name: 'Lock in my answer' }))

    expect(screen.getByText(/bit of a guess/i)).toBeInTheDocument()
  })

  it('shows an incorrect result for a wrong guess', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0) // solution: marble 1, heavier
    const user = userEvent.setup()
    render(<MarblePuzzle />)

    await user.selectOptions(
      screen.getByLabelText('Which marble is the odd one?'),
      'Marble 2',
    )
    await user.click(screen.getByLabelText('Heavier'))
    await user.click(screen.getByRole('button', { name: 'Lock in my answer' }))

    expect(screen.getByText('Not quite.')).toBeInTheDocument()
  })

  it('resets weighings, history, and marble assignment when "Play again" is clicked', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const user = userEvent.setup()
    render(<MarblePuzzle />)

    await user.selectOptions(
      screen.getByLabelText('Which marble is the odd one?'),
      'Marble 1',
    )
    await user.click(screen.getByLabelText('Heavier'))
    await user.click(screen.getByRole('button', { name: 'Lock in my answer' }))
    await user.click(screen.getByRole('button', { name: 'Play again' }))

    expect(screen.getByRole('button', { name: 'Weigh' })).toBeInTheDocument()
    expect(marbleButton(1)).toHaveAccessibleName('Marble 1, not on the scale')
  })
})
