import { createBrowserRouter } from 'react-router'
import { SiteShell } from '../components/layout/SiteShell'
import { AboutPage } from '../pages/about/AboutPage'
import { LevelHomePage } from '../pages/experience/LevelHomePage'
import { HomePage } from '../pages/home/HomePage'
import { LabPage } from '../pages/lab/LabPage'
import { NotFoundPage } from '../pages/not-found/NotFoundPage'
import { ChessRagPage } from '../pages/projects/ChessRagPage'
import { ResumePage } from '../pages/resume/ResumePage'
import { paths } from './paths'

const suffix = ' — Blake Grudzien'

export const router = createBrowserRouter([
  {
    element: <SiteShell />,
    children: [
      {
        path: paths.home,
        element: <HomePage />,
        handle: { title: 'Blake Grudzien' },
      },
      // /projects and /projects/chess-rag both render ChessRagPage for now,
      // since there's only one project. When a second one exists, only the
      // element on `projects` needs to change to a real index page — the
      // chess-rag route and its URL stay exactly as they are.
      {
        path: paths.projects,
        element: <ChessRagPage />,
        handle: { title: `Chess RAG${suffix}` },
      },
      {
        path: paths.projectChessRag,
        element: <ChessRagPage />,
        handle: { title: `Chess RAG${suffix}` },
      },
      {
        path: paths.experience,
        element: <LevelHomePage />,
        handle: { title: `Level Home${suffix}` },
      },
      {
        path: paths.experienceLevelHome,
        element: <LevelHomePage />,
        handle: { title: `Level Home${suffix}` },
      },
      {
        path: paths.lab,
        element: <LabPage />,
        handle: { title: `Lab${suffix}` },
      },
      {
        path: paths.about,
        element: <AboutPage />,
        handle: { title: `About${suffix}` },
      },
      {
        path: paths.resume,
        element: <ResumePage />,
        handle: { title: `Resume & Contact${suffix}` },
      },
      {
        path: '*',
        element: <NotFoundPage />,
        handle: { title: `Not found${suffix}` },
      },
    ],
  },
])
