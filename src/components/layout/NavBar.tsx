import { NavLink } from 'react-router'
import { paths } from '../../routes/paths'
import { cx } from '../../utils/cx'
import styles from './NavBar.module.css'

// TODO: decide whether Home belongs here as its own item. Right now the
// only way back is clicking the name, which is a real convention but
// doesn't look like the other tabs, so it isn't obviously a way back.
//
// Lab is deliberately absent. One marble-weighing puzzle doesn't carry the
// same weight as a case study, and giving it a top-level tab said it did.
// The page still exists at /lab and About links to it.
const navItems: { to: string; label: string }[] = [
  { to: paths.projects, label: 'Projects' },
  { to: paths.experience, label: 'Experience' },
  { to: paths.about, label: 'About' },
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
