/**
 * The one place these live. Email and LinkedIn appear both in the footer
 * (on every page) and on the resume page, and two copies of a URL is two
 * things to keep in sync.
 */
export const contact = {
  email: 'blakegrudzien@gmail.com',
  linkedin: 'https://www.linkedin.com/in/blakegrudzien/',
  /** Profile, not the portfolio repo below. Both appear in the footer, and
   * they are different destinations: this is everything Blake has written,
   * sourceRepo is the code for the page you are currently looking at. */
  github: 'https://github.com/blakegrudzien',
  sourceRepo: 'https://github.com/blakegrudzien/Portfolio',
} as const
