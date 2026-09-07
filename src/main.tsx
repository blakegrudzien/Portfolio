import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Self-hosted fonts, latin subset only, since the site is English-only, so the
// cyrillic/greek/vietnamese glyphs in the packages' umbrella weight files
// would be dead weight. Weights match src/styles/tokens.css's --font-*.
import '@fontsource/zilla-slab/latin-500.css'
import '@fontsource/zilla-slab/latin-600.css'
import '@fontsource/zilla-slab/latin-700.css'
import '@fontsource/ibm-plex-sans/latin-400.css'
import '@fontsource/ibm-plex-sans/latin-500.css'
import '@fontsource/ibm-plex-mono/latin-500.css'

import { App } from './App.tsx'
import './styles/base.css'

// index.html always carries this div, so its absence means the HTML and
// this entry point have gone out of sync. Throwing says that; the `!` this
// replaces would have surfaced it as "Cannot read properties of null" from
// somewhere inside React instead.
const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('No #root element found: index.html and main.tsx disagree.')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
