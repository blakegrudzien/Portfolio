import styles from './Footer.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        {/* Contact lives here rather than only on the resume page: a
        recruiter shouldn't have to navigate anywhere to find an email
        address, and this is the one element on every page. GitHub is
        deliberately not here. Opening someone's source is a decision
        you've already made by the time you go looking, so it sits on the
        resume page instead of following you around the site. */}
        <ul className={styles.contact}>
          <li>
            <a href="mailto:blakegrudzien@gmail.com">blakegrudzien@gmail.com</a>
          </li>
        </ul>
        <p className={styles.meta}>
          © {new Date().getFullYear()} Blake Grudzien ·{' '}
          <a
            href="https://github.com/blakegrudzien/Portfolio"
            target="_blank"
            rel="noreferrer"
          >
            Source on GitHub
          </a>
        </p>
      </div>
    </footer>
  )
}
