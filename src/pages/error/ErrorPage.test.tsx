import { cleanup, render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SiteShell } from '../../components/layout/SiteShell'
import { ErrorPage } from './ErrorPage'

function Exploding(): never {
  throw new Error('boom')
}

/** Mirrors the nesting in routeConfig.tsx: the boundary sits on a pathless
 * route inside SiteShell, so a page failure is contained to the Outlet. */
function renderExplodingRoute() {
  const router = createMemoryRouter(
    [
      {
        element: <SiteShell />,
        errorElement: <ErrorPage />,
        children: [
          {
            errorElement: <ErrorPage />,
            children: [{ path: '/', element: <Exploding /> }],
          },
        ],
      },
    ],
    { initialEntries: ['/'] },
  )
  render(<RouterProvider router={router} />)
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ErrorPage', () => {
  it('replaces a page that throws instead of blanking the document', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderExplodingRoute()

    expect(
      screen.getByRole('heading', { name: 'Something went wrong' }),
    ).toBeInTheDocument()
  })

  it('keeps the nav, so a failure still leaves a way out', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderExplodingRoute()

    expect(
      screen.getByRole('navigation', { name: 'Primary' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back home' })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('logs the error rather than showing a stack trace to the visitor', () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderExplodingRoute()

    expect(
      logged.mock.calls.some((call) => call[0] === 'Unhandled render error:'),
    ).toBe(true)
    expect(document.body.textContent).not.toContain('boom')
  })
})
