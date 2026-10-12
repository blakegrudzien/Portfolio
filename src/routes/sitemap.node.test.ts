import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  NOT_FOUND_META,
  ROUTE_META,
  SITE_URL,
  // .js extension because this file is typechecked as a nodenext program
  // (see tsconfig.node.json); the resolver maps it to routeMeta.ts.
} from './routeMeta.js'

const sitemapPath = resolve(__dirname, '../../public/sitemap.xml')
const sitemap = readFileSync(sitemapPath, 'utf8')

const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!)

/** Routes deliberately left out of the sitemap, and why.
 *
 * A route in neither this list nor the sitemap fails the test below. That
 * is the point: public/sitemap.xml is hand-written and nothing else in the
 * project reads it, so adding a page and forgetting it would leave the new
 * page unlisted with nothing to say so. This turns the omission into a
 * decision someone has to make rather than one they can miss.
 */
const DELIBERATELY_UNLISTED: Record<string, string> = {
  '/projects':
    'serves the same page as /projects/chess-scholar while there is one project, and listing both would offer a crawler two URLs for identical content',
  '/experience':
    'serves the same page as /experience/level-home, for the same reason',
  [NOT_FOUND_META.path]: 'the catch-all, which is not a page',
}

describe('the sitemap', () => {
  it('lists only URLs that are real routes', () => {
    const paths = new Set(ROUTE_META.map((meta) => meta.path))

    for (const loc of listed) {
      expect(loc, `${loc} is not under ${SITE_URL}`).toMatch(
        new RegExp(`^${SITE_URL}`),
      )
      // A sitemap entry pointing at a route that no longer exists hands a
      // crawler a 404 and is invisible from inside the app.
      const path = loc.slice(SITE_URL.length) || '/'
      expect(
        paths.has(path),
        `sitemap lists ${path}, which is not a route`,
      ).toBe(true)
    }
  })

  it('accounts for every route, listed or deliberately not', () => {
    const unaccounted = ROUTE_META.map((meta) => meta.path)
      .filter((path) => !(path in DELIBERATELY_UNLISTED))
      .filter(
        (path) =>
          !listed.includes(
            path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`,
          ),
      )

    expect(
      unaccounted,
      'Add these to public/sitemap.xml, or to DELIBERATELY_UNLISTED above with the reason',
    ).toEqual([])
  })

  it('does not list the same URL twice', () => {
    expect(new Set(listed).size).toBe(listed.length)
  })
})
