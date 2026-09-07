import { useEffect } from 'react'
import { Link, isRouteErrorResponse, useRouteError } from 'react-router'
import { paths } from '../../routes/paths'

/** Rendered in place of a page that threw while rendering. Without this,
 * React unmounts the whole tree on an uncaught render error and the
 * visitor gets a blank white page with nothing to click, on a URL that is
 * printed on a resume. Wired as the `errorElement` of a pathless route
 * inside SiteShell, so the nav and footer survive the failure and only
 * the failed page is replaced.
 *
 * The error text itself is logged rather than displayed. A stack trace
 * tells a visitor nothing and reads as unfinished; the console is where
 * it is useful. */
export function ErrorPage() {
  const error = useRouteError()

  useEffect(() => {
    console.error('Unhandled render error:', error)
  }, [error])

  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : null

  return (
    <div>
      <h1>Something went wrong</h1>
      <p>
        This page hit an error it could not recover from. The rest of the site
        still works.
      </p>
      <p>
        <Link to={paths.home}>Back home</Link>
      </p>
      {detail && <p>{detail}</p>}
    </div>
  )
}
