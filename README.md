# Portfolio

Blake Grudzien's portfolio site. Source at [blakegrudzien/Portfolio](https://github.com/blakegrudzien/Portfolio). A statically-built React site, not a template: each project/experience page is a case study that explains the reasoning behind what was built, not just the result.

**Status:** in progress. The Chess Scholar and Level Home case studies and the 12-marbles puzzle are built; the About page and Level Home's "my story" section are still placeholders.

## Stack

- React 19 + TypeScript, built with Vite, no backend, so a static site.
- React Router (library mode) for routing.
- CSS Modules + a small set of design tokens (`src/styles/tokens.css`) for styling, with no Tailwind or CSS-in-JS.
- Self-hosted fonts via `@fontsource` (Zilla Slab, IBM Plex Sans, IBM Plex Mono), latin subset only, rather than a Google Fonts `<link>`, which avoids a third-party render-blocking request.
- oxlint for linting (with `jsx-a11y`), Prettier for formatting, Vitest + React Testing Library for tests.
- GitHub Actions CI runs format check, lint, typecheck, tests, and build on every push/PR.

## Development

```bash
npm install
npm run dev        # start the dev server
npm run test       # run tests in watch mode
npm run lint        # oxlint
npm run typecheck   # tsc -b
npm run format       # prettier --write
npm run build        # typecheck + production build
```

## A couple of design decisions worth naming

- **Direct-render-now, index-later routing.** `/projects` and `/projects/chess-scholar` currently render the same page, since there's only one project; `/experience` and `/experience/level-home` likewise. Adding a second entry later is a one-line swap of the index route's element, and the specific case-study routes and their URLs don't move.
- **No data-driven "sections" abstraction for case studies.** With two case studies, a generic content schema would be premature, so page components compose a shared `CaseStudySection` directly as JSX. The one place a typed data array is used is for genuinely homogeneous repeated items, like the architecture-layer accordion on the Chess Scholar page.
- **The Level Home pipeline diagram's animation state is split into pure data/logic and DOM-driving code** (`pipelineData.ts`, `pipelineFlow.ts`, `usePipelineAnimation.ts`) specifically so the sequencing logic, meaning what phase follows what action, can be unit tested without a real browser animation to wait on.
