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
// Lab was left out at first, on the grounds that one marble-weighing puzzle
// doesn't carry a case study's weight and a top-level tab would say it did.
// That was answering a different question. It isn't competing with the case
// studies on credibility; it's the one thing here that shows curiosity
// rather than competence, and buried in an aside at the bottom of the home
// page almost nobody found it.
// Named after the work rather than after a category, and pointing at the
// case study's own URL. With one entry each, "Experience" and "Projects"
// promised an index that isn't there: you clicked a plural and landed on a
// single page whose <h1> disagreed with the tab you came from. These go back
// to category names when there is more than one of each to list.
const navItems: { to: string; label: string; end?: boolean }[] = [
  // `end`, or "/" would match every route and Home would always look active.
  { to: paths.home, label: 'Home', end: true },
  { to: paths.experienceLevelHome, label: 'Level Home' },
  { to: paths.projectChessScholar, label: 'Chess Scholar' },
  { to: paths.lab, label: 'Lab' },
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
