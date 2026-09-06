/**
 * The one place these live. Email and LinkedIn appear both in the footer
 * (on every page) and on the resume page, and two copies of a URL is two
 * things to keep in sync.
 */
export const contact = {
  email: 'blakegrudzien@gmail.com',
  linkedin: 'https://www.linkedin.com/in/blakegrudzien/',
  /** Profile, not the portfolio repo below. Deliberately not in the
   * footer: opening someone's source is a decision you've already made by
   * the time you go looking, so it sits on the resume page. */
  github: 'https://github.com/blakegrudzien',
  sourceRepo: 'https://github.com/blakegrudzien/Portfolio',
} as const
