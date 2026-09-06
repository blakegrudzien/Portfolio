import { useEffect } from 'react'
import { useMatches } from 'react-router'

interface RouteHandle {
  title?: string
}

/** Sets document.title from the current route's `handle.title` (set per
 * route in routeConfig.tsx). A plain hook rather than react-helmet-async,
 * this project only ever needs a single tag, on the client, once per
 * navigation, which doesn't justify a whole meta-tag management library. */
export function useDocumentTitle() {
  const matches = useMatches()

  useEffect(() => {
    const match = [...matches]
      .reverse()
      .find((m) => (m.handle as RouteHandle | undefined)?.title)
    const title = (match?.handle as RouteHandle | undefined)?.title
    if (title) {
      document.title = title
    }
  }, [matches])
}
