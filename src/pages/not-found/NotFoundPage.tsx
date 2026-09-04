import { Link } from 'react-router'
import { paths } from '../../routes/paths'

export function NotFoundPage() {
  return (
    <main id="main-content">
      <h1>Page not found</h1>
      <p>
        <Link to={paths.home}>Back home</Link>
      </p>
    </main>
  )
}
