import { Link } from 'react-router'
import { paths } from '../../routes/paths'

export function NotFoundPage() {
  return (
    <div>
      <h1>Page not found</h1>
      <p>
        <Link to={paths.home}>Back home</Link>
      </p>
    </div>
  )
}
