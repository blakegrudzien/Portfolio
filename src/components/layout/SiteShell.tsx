import { Outlet } from 'react-router'
import { useRouteFocus } from '../../hooks/useRouteFocus'
import { useRouteMeta } from '../../hooks/useRouteMeta'
import { Footer } from './Footer'
import { NavBar } from './NavBar'
import styles from './SiteShell.module.css'

export function SiteShell() {
  useRouteMeta()
  const mainRef = useRouteFocus<HTMLElement>()

  return (
    <div className={styles.shell}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>
      <NavBar />
      {/* tabIndex -1 so both the skip link and useRouteFocus can move focus
          here. It is not in the tab order; it is only ever focused
          programmatically. */}
      <main
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
        className={styles.content}
      >
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
