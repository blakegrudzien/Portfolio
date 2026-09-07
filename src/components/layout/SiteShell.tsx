import { Outlet } from 'react-router'
import { useRouteMeta } from '../../hooks/useRouteMeta'
import { Footer } from './Footer'
import { NavBar } from './NavBar'
import styles from './SiteShell.module.css'

export function SiteShell() {
  useRouteMeta()

  return (
    <div className={styles.shell}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>
      <NavBar />
      <main id="main-content" className={styles.content}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
