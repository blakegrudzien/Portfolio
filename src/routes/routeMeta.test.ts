import { describe, expect, it } from 'vitest'
import { paths } from './paths'
import { ROUTE_META, SITE_URL, metaForPath } from './routeMeta'

describe('ROUTE_META', () => {
  // routeMeta.ts cannot import paths.ts, because vite.config.ts reads the
  // table from a Node program with different module resolution. This is
  // what keeps the two lists from drifting apart instead.
  it('covers every route in paths, and invents none', () => {
    expect(new Set(ROUTE_META.map((meta) => meta.path))).toEqual(
      new Set(Object.values(paths)),
    )
  })

  it('resolves a path to its own entry', () => {
    expect(metaForPath(paths.experienceLevelHome)?.title).toBe(
      'Level Home · Blake Grudzien',
    )
    expect(metaForPath('/nope')).toBeUndefined()
  })

  it('gives every route a title and a description', () => {
    for (const meta of ROUTE_META) {
      expect(meta.title.length).toBeGreaterThan(0)
      expect(meta.description.length).toBeGreaterThan(0)
    }
  })

  // Anything much past this is truncated in a search result or a link
  // preview, which wastes the part that would have said something.
  it('keeps descriptions short enough to survive a link preview', () => {
    for (const meta of ROUTE_META) {
      expect(meta.description.length).toBeLessThanOrEqual(200)
    }
  })

  it('gives the case studies their own card rather than the home page one', () => {
    const home = metaForPath(paths.home)!
    for (const path of [paths.experienceLevelHome, paths.projectChessScholar]) {
      const meta = metaForPath(path)!
      expect(meta.title).not.toBe(home.title)
      expect(meta.description).not.toBe(home.description)
    }
  })

  it('points canonical URLs at the live site', () => {
    expect(SITE_URL).toBe('https://blakegrudzien.com')
  })
})
