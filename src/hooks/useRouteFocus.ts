import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

/** Moves focus to the main landmark after a client-side navigation.
 *
 * A single-page app swaps the page's contents without ever loading a
 * document, so by default nothing tells anyone that a navigation happened.
 * The title changes silently, and focus stays on the link that was just
 * clicked, which means the next Tab keeps going through the nav instead of
 * entering the page that was just opened. Someone using a screen reader is
 * left on the old position with no announcement. Moving focus to <main> is
 * what a real page load would have done.
 *
 * Deliberately skipped on the first render: on a fresh load, focus belongs
 * wherever the browser put it, and taking it would be a change nobody
 * asked for. preventScroll, because the scroll position is already being
 * reset on navigation and focusing must not fight it.
 */
export function useRouteFocus<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const { pathname } = useLocation()
  const isInitialRender = useRef(true)

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false
      return
    }
    ref.current?.focus({ preventScroll: true })
  }, [pathname])

  return ref
}
