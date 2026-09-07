import { createBrowserRouter } from 'react-router'
import { SiteShell } from '../components/layout/SiteShell'
import { LevelHomePage } from '../pages/experience/LevelHomePage'
import { HomePage } from '../pages/home/HomePage'
import { LabPage } from '../pages/lab/LabPage'
import { ErrorPage } from '../pages/error/ErrorPage'
import { NotFoundPage } from '../pages/not-found/NotFoundPage'
import { ChessScholarPage } from '../pages/projects/ChessScholarPage'
import { ResumePage } from '../pages/resume/ResumePage'
import { paths } from './paths'
import { NOT_FOUND_META, metaForPath } from './routeMeta'

/** Attaches a route's entry from the metadata table. Throws at module
 * load rather than at navigation time if a route has no entry, so a new
 * route without a title and description cannot ship quietly. */
function handleFor(path: string) {
  const meta = metaForPath(path)
  if (!meta) throw new Error(`No route metadata defined for: ${path}`)
  return { meta }
}

export const router = createBrowserRouter([
  {
    element: <SiteShell />,
    // Catches a failure in the shell itself, where there is no nav left to
    // render the error inside.
    errorElement: <ErrorPage />,
    children: [
      {
        // Pathless, purely to own the error boundary for every page below
        // it. Errors bubble to the nearest errorElement, so putting it
        // here means a broken page is replaced inside SiteShell's Outlet
        // and the visitor keeps the nav, the footer, and a way out.
        errorElement: <ErrorPage />,
        children: [
          {
            path: paths.home,
            element: <HomePage />,
            handle: handleFor(paths.home),
          },
          // /projects and /projects/chess-scholar both render ChessScholarPage for now,
          // since there's only one project. When a second one exists, only the
          // element on `projects` needs to change to a real index page. The
          // chess-scholar route and its URL stay exactly as they are.
          {
            path: paths.projects,
            element: <ChessScholarPage />,
            handle: handleFor(paths.projects),
          },
          {
            path: paths.projectChessScholar,
            element: <ChessScholarPage />,
            handle: handleFor(paths.projectChessScholar),
          },
          {
            path: paths.experience,
            element: <LevelHomePage />,
            handle: handleFor(paths.experience),
          },
          {
            path: paths.experienceLevelHome,
            element: <LevelHomePage />,
            handle: handleFor(paths.experienceLevelHome),
          },
          {
            path: paths.lab,
            element: <LabPage />,
            handle: handleFor(paths.lab),
          },
          {
            path: paths.resume,
            element: <ResumePage />,
            handle: handleFor(paths.resume),
          },
          {
            path: '*',
            element: <NotFoundPage />,
            handle: { meta: NOT_FOUND_META },
          },
        ],
      },
    ],
  },
])
