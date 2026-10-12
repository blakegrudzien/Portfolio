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

  /* Replaces an assertion that a section and its entry rendered the *same*
     page, which they did while each section held one thing. Both sections
     have a real index now, so the property worth guarding is the opposite:
     a section is its own page, and it links to the case studies under it. */
  it('gives a section its own page, listing the entries below it', () => {
    renderRoute(paths.experience)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Experience' }),
    ).toBeInTheDocument()
    for (const name of ['Level Home', 'Brooksee']) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument()
    }
  })

  it('gives every case study a way back to its index', () => {
    for (const [path, index] of [
      [paths.experienceLevelHome, 'Experience'],
      [paths.experienceBrooksee, 'Experience'],
      [paths.projectChessScholar, 'Projects'],
    ] as const) {
      renderRoute(path)
      expect(
        screen.getByRole('link', { name: `← ${index}` }),
      ).toBeInTheDocument()
      cleanup()
    }
  })
})

describe('the experience index', () => {
  /* Replaces an assertion that each still was drawn from its diagram's own
     data. They were, and both were illegible: a 1200-wide pipeline reduced
     to the width of an index entry is a row of dots. They are purpose-drawn
     now, so what is worth guarding is that every entry has one and that the
     two are not the same drawing. */
  it('gives every entry its own still', () => {
    renderRoute(paths.experience)
    const stills = [...document.querySelectorAll('svg')]

    expect(stills).toHaveLength(2)
    expect(stills[0]?.innerHTML).not.toBe(stills[1]?.innerHTML)
  })
})
