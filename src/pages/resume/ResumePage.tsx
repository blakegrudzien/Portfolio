import { ContactSection } from './ContactSection'
import styles from './ResumePage.module.css'

export function ResumePage() {
  return (
    <div className={styles.page}>
      <h1>Resume &amp; Contact</h1>
      <ContactSection />
    </div>
  )
}
