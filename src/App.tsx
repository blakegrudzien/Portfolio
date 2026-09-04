import { RouterProvider } from 'react-router'
import { router } from './routes/routeConfig'

export function App() {
  return <RouterProvider router={router} />
}
