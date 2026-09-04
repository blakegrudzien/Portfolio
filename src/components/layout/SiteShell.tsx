import { Outlet } from 'react-router'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { Footer } from './Footer'
import { NavBar } from './NavBar'
import styles from './SiteShell.module.css'

export function SiteShell() {
  useDocumentTitle()

  return (
    <div className={styles.shell}>
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>
      <NavBar />
      <div className={styles.content}>
        <Outlet />
      </div>
      <Footer />
    </div>
  )
}
