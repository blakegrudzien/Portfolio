import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../routes/routeConfig'

function renderApp(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('focus on navigation', () => {
  it('leaves focus alone on first render', () => {
    renderApp()
    // Nothing has navigated yet, so taking focus would be a change the
    // visitor did not ask for.
    expect(document.activeElement).toBe(document.body)
  })

  it('moves focus into the page after a navigation', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('link', { name: 'Projects' }))

    // Without this, focus stays on the link that was clicked: the next Tab
    // carries on through the nav rather than entering the new page, and a
    // screen reader announces nothing.
    await waitFor(() => {
      expect(document.activeElement).toBe(
        document.getElementById('main-content'),
      )
    })
  })

  it('moves focus again on each subsequent navigation', async () => {
    const user = userEvent.setup()
    renderApp()
    const main = () => document.getElementById('main-content')

    await user.click(screen.getByRole('link', { name: 'Projects' }))
    await waitFor(() => expect(document.activeElement).toBe(main()))

    // Blur it, so the next assertion cannot pass just by focus never moving.
    ;(document.activeElement as HTMLElement).blur()
    expect(document.activeElement).toBe(document.body)

    await user.click(screen.getByRole('link', { name: 'Resume' }))
    await waitFor(() => expect(document.activeElement).toBe(main()))
  })

  it('keeps the main landmark out of the tab order', () => {
    renderApp()
    expect(document.getElementById('main-content')).toHaveAttribute(
      'tabindex',
      '-1',
    )
  })
})
