// Paths are written out here rather than imported from paths.ts, because
// this module is also read by the build step in vite.config.ts, which is
// type-checked as a Node program with different module resolution. The two
// tables are held together by a test instead (routeMeta.test.ts), which
// fails if a route ever exists in one and not the other.
export const SITE_URL = 'https://blakegrudzien.com'
export const OG_IMAGE = `${SITE_URL}/og.jpg`

const suffix = ' · Blake Grudzien'

export interface RouteMeta {
  /** The route's path, exactly as it appears in `paths`. */
  path: string
  title: string
  description: string
}

/** Title and description for every route, in one table.
 *
 * Read from three places, which is the whole point of it being a table:
 * routeConfig hangs each entry on its route as a `handle`, useRouteMeta
 * applies the current one on navigation, and the build step in
 * vite.config.ts bakes each one into a static HTML file for that path.
 *
 * That last one matters because most link unfurlers (LinkedIn, Slack,
 * iMessage) read the HTML they are served and never run the JavaScript, so
 * updating these tags at runtime alone would leave every shared case-study
 * link showing the home page's card.
 */
export const ROUTE_META: RouteMeta[] = [
  {
    path: '/',
    title: 'Blake Grudzien',
    description:
      'Portfolio of Blake Grudzien. Emory CS, graduated May 2026, working in backend, platform, and data engineering in the Bay Area.',
  },
  {
    path: '/projects',
    title: `Chess Scholar${suffix}`,
    description:
      'A chess coach answering from four backend sources: SQL over 127,435 games, pgvector search over 468,862 chunks of commentary, a pool of Stockfish subprocesses, and opening-prefix matching.',
  },
  {
    path: '/projects/chess-scholar',
    title: `Chess Scholar${suffix}`,
    description:
      'A chess coach answering from four backend sources: SQL over 127,435 games, pgvector search over 468,862 chunks of commentary, a pool of Stockfish subprocesses, and opening-prefix matching.',
  },
  {
    path: '/experience',
    title: `Level Home${suffix}`,
    description:
      'Rebuilding a device telemetry pipeline in Go during an internship at Level Home, so failed files could be fixed and retried instead of lost. Data loss went from over 30% to under 1%.',
  },
  {
    path: '/experience/level-home',
    title: `Level Home${suffix}`,
    description:
      'Rebuilding a device telemetry pipeline in Go during an internship at Level Home, so failed files could be fixed and retried instead of lost. Data loss went from over 30% to under 1%.',
  },
  {
    path: '/lab',
    title: `Lab${suffix}`,
    description:
      'A weighing puzzle: find the one odd marble out of twelve, and say whether it is heavy or light, in three weighings.',
  },
  {
    path: '/resume',
    title: `Resume & contact${suffix}`,
    description:
      'Resume, email, LinkedIn and GitHub for Blake Grudzien. Open to backend, platform, and data engineering roles.',
  },
]

export const NOT_FOUND_META: RouteMeta = {
  path: '*',
  title: `Not found${suffix}`,
  description: 'That page does not exist.',
}

export function metaForPath(path: string): RouteMeta | undefined {
  return ROUTE_META.find((meta) => meta.path === path)
}
