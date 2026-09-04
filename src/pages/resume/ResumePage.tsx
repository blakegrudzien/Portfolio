import { ContactSection } from './ContactSection'
import styles from './ResumePage.module.css'

export function ResumePage() {
  return (
    <main id="main-content" className={styles.page}>
      <h1>Resume &amp; Contact</h1>
      <ContactSection />
    </main>
  )
}
