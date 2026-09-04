import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Self-hosted fonts, latin subset only — the site is English-only, so the
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
