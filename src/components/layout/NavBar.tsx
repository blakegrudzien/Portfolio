import { NavLink } from 'react-router'
import { paths } from '../../routes/paths'
import { cx } from '../../utils/cx'
import styles from './NavBar.module.css'

// Home is listed even though the name in the corner already links there.
// Clicking a wordmark to get home is a real convention, but a full name
// doesn't read as a clickable mark the way a logo does, so in practice
// there was no obvious way back once you'd navigated off. The two links
// are separated across the bar, and the redundancy is worth more than the
// tidiness of having exactly one route home.
//
// Lab is deliberately absent. One marble-weighing puzzle doesn't carry the
// same weight as a case study, and giving it a top-level tab said it did.
// The page still exists at /lab and About links to it.
const navItems: { to: string; label: string; end?: boolean }[] = [
  // `end`, or "/" would match every route and Home would always look active.
  { to: paths.home, label: 'Home', end: true },
  { to: paths.projects, label: 'Projects' },
  { to: paths.experience, label: 'Experience' },
  { to: paths.resume, label: 'Resume' },
]

export function NavBar() {
  return (
    <header className={styles.header}>
      <nav className={styles.nav} aria-label="Primary">
        <NavLink to={paths.home} end className={styles.brand}>
          Blake Grudzien
        </NavLink>
        <ul className={styles.links}>
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cx(styles.link, isActive && styles.linkActive)
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
