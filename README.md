# Portfolio

Blake Grudzien's portfolio site. Source at [blakegrudzien/Portfolio](https://github.com/blakegrudzien/Portfolio). A statically-built React site, not a template: each project/experience page is a case study that explains the reasoning behind what was built, not just the result.

**Status:** the two case studies (Chess Scholar, Level Home) and the 12-marbles puzzle are built and written. Not yet deployed, so the routes below only resolve when the host is configured to rewrite unknown paths to `index.html`.

## Stack

- React 19 + TypeScript, built with Vite, no backend, so a static site.
- React Router (library mode) for routing.
- CSS Modules + a small set of design tokens (`src/styles/tokens.css`) for styling, with no Tailwind or CSS-in-JS.
- Images are pre-sized and encoded as WebP at build-authoring time rather than served raw: the Chess Scholar screenshot went from 1.8 MB to 140 KB, and the headshot is cropped square so it can be masked to a circle without touching the face.
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
- **No About page.** It existed, and its content moved onto the home page instead. Three paragraphs did not justify a route of their own, and a page nobody maintains is worse than one that doesn't exist. The home page carries the same material and reads as a single-page personal site.
- **The marble puzzle lives at `/lab` but isn't in the nav.** One puzzle doesn't carry the weight of a case study, and giving it a top-level tab implied it did. The home page links to it in passing.
- **No data-driven "sections" abstraction for case studies.** With two case studies, a generic content schema would be premature, so page components compose a shared `CaseStudySection` directly as JSX. The one place a typed data array is used is for genuinely homogeneous repeated items, like the architecture-layer accordion on the Chess Scholar page.
- **The Level Home pipeline diagram's animation state is split into pure data/logic and DOM-driving code** (`pipelineData.ts`, `pipelineFlow.ts`, `usePipelineAnimation.ts`) specifically so the sequencing logic, meaning what phase follows what action, can be unit tested without a real browser animation to wait on.
