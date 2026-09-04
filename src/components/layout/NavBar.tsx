import { NavLink } from 'react-router'
import { paths } from '../../routes/paths'
import styles from './NavBar.module.css'

const navItems: { to: string; label: string }[] = [
  { to: paths.projects, label: 'Projects' },
  { to: paths.experience, label: 'Experience' },
  { to: paths.lab, label: 'Lab' },
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
                  isActive ? `${styles.link} ${styles.linkActive}` : styles.link
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
