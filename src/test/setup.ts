import '@testing-library/jest-dom/vitest'

// jsdom implements no media queries at all, so window.matchMedia is simply
// absent and any component that asks about prefers-reduced-motion throws.
// Reporting "no match" is what a browser with default settings reports, so
// tests exercise the same path a typical visitor gets.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
