import { useEffect } from 'react'
import { useMatches } from 'react-router'
import { SITE_URL, type RouteMeta } from '../routes/routeMeta'

interface RouteHandle {
  meta?: RouteMeta
}

/** Finds a meta tag by its identifying attribute, creating it if the
 * served HTML did not already carry one. */
function setMetaTag(attr: 'name' | 'property', key: string, content: string) {
  const selector = `meta[${attr}="${key}"]`
  let tag = document.head.querySelector<HTMLMetaElement>(selector)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, key)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

function setCanonical(href: string) {
  let link = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  )
  if (!link) {
    link = document.createElement('link')
    link.rel = 'canonical'
    document.head.appendChild(link)
  }
  link.href = href
}

/** Applies the current route's title, description, canonical URL and Open
 * Graph tags, from the table in routeMeta.
 *
 * A plain hook rather than react-helmet-async: this site needs a handful
 * of tags, on the client, once per navigation, which does not justify a
 * meta-tag management library.
 *
 * The build step writes these same tags into a static HTML file per
 * route, so a crawler that never runs JavaScript still gets the right
 * ones. This hook is what keeps them correct as a visitor navigates
 * within the app, where no new document is ever served.
 */
export function useRouteMeta() {
  const matches = useMatches()

  useEffect(() => {
    const match = [...matches]
      .reverse()
      .find((m) => (m.handle as RouteHandle | undefined)?.meta)
    const meta = (match?.handle as RouteHandle | undefined)?.meta
    if (!meta) return

    const url = new URL(window.location.pathname, SITE_URL).href
    document.title = meta.title
    setMetaTag('name', 'description', meta.description)
    setMetaTag('property', 'og:title', meta.title)
    setMetaTag('property', 'og:description', meta.description)
    setMetaTag('property', 'og:url', url)
    setCanonical(url)
  }, [matches])
}
