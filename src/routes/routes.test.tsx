import { cleanup, render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { paths } from './paths'
import { ROUTE_META } from './routeMeta'
import { routes } from './routeConfig'

/** Mounts the real route table at a path, exactly as the browser router
 * would. Anything that throws while rendering is caught by the app's own
 * error boundary, so these assert on what rendered rather than on the
 * absence of an exception. */
function renderRoute(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('every route', () => {
  // The point of this file. A page can break in ways that typecheck, lint
  // and every unit test pass straight through: a renamed CSS class, a bad
  // import, a hook called conditionally. Nothing else here mounts a page.
  it.each(ROUTE_META.map((meta) => [meta.path]))(
    'renders %s without hitting the error boundary',
    (path) => {
      renderRoute(path)
      expect(
        screen.queryByRole('heading', { name: 'Something went wrong' }),
      ).not.toBeInTheDocument()
    },
  )

  it.each(ROUTE_META.map((meta) => [meta.path]))(
    'gives %s exactly one h1',
    (path) => {
      renderRoute(path)
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    },
  )

  it.each(ROUTE_META.map((meta) => [meta.path]))(
    'keeps the nav and the footer on %s',
    (path) => {
      renderRoute(path)
      expect(
        screen.getByRole('navigation', { name: 'Primary' }),
      ).toBeInTheDocument()
      expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    },
  )

  it('falls through to the not-found page for an unknown URL', () => {
    renderRoute('/no-such-page')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument()
  })

  it('renders the same page for a section and its only entry', () => {
    renderRoute(paths.experience)
    const section = screen.getByRole('heading', { level: 1 }).textContent
    cleanup()
    renderRoute(paths.experienceLevelHome)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      section ?? '',
    )
  })
})
