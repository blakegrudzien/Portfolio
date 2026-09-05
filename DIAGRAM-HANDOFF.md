# Handoff: Level Home pipeline diagram redesign

> Working document for picking up the pipeline-diagram work mid-stream. Not part of the
> site. Delete before committing, or keep it untracked.

---

## 1. Who this is for and what the project is

Blake Grudzien — Emory CS, graduating May 2026, job-searching for Solutions Engineer /
Backend / Data Engineer / Forward-Deployed Engineer roles in the Bay Area. This repo is his
personal portfolio site. The site's whole thesis is that it should _demonstrate_ engineering
judgment rather than list projects, so the code itself is part of the artifact.

**The repo is public from the first commit.**

### Standing rules — these are not negotiable, follow them exactly

1. **Never run `git commit`.** Blake commits himself. Stage changes and summarize them; he
   reviews and commits. Same for `git push`.
2. **Explain and defend every choice.** When you change something, say what changed and why,
   citing either an engineering principle or a stated project goal. When a decision has more
   than one reasonable answer, present the options with tradeoffs and let Blake pick — don't
   silently choose.
3. **Small, logical, reviewable diffs.** He reviews in chunks and explicitly does not want
   large piles of generated code landing at once. This is an anti-vibe-coding preference; it
   is the single most important process rule here.
4. **Code comments are written for a GitHub viewer**, not as notes to Blake. They explain
   _why_, not _what_. Look at the existing comments in `src/pages/experience/*` — match that
   register exactly. They are dense and they justify decisions.
5. **Never commit raw Level Home source material.** No internal design docs, no real service
   / bucket / table names, no product codenames, no real test commands, no Slack screenshots.
   Everything in the case study is already sanitized. Keep it that way.
6. **When a visual or content decision is genuinely uncertain, leave it blank rather than
   guessing.** Placeholder prose in his voice is worse than nothing.
7. Blake's design philosophy, in his words: _"I don't think that 'more user interaction =
   better' is true for a portfolio."_ He considered and rejected a "user fixes a letter in
   the telemetry to repair it" mechanic. Don't propose interaction for its own sake.

---

## 2. Stack and conventions

- React 19 + TypeScript + Vite 8. Static build, no backend, no server rendering.
- React Router v8 **library mode** (`createBrowserRouter` / `RouterProvider` from
  `react-router`). Not framework mode.
- **oxlint**, not ESLint. `jsx-a11y` rules on.
- Prettier: `semi: false`, `singleQuote: true`.
- Vitest + React Testing Library.
- CSS Modules + CSS custom properties. No Tailwind, no CSS-in-JS, no component library.
- Self-hosted fonts via `@fontsource` (Zilla Slab / IBM Plex Sans / IBM Plex Mono, latin subset).
- Strict TS: `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`,
  `erasableSyntaxOnly`, `noImplicitOverride`.

### Verification — all of these must pass before handing work back

```bash
npm run format        # prettier --write .
npm run typecheck     # tsc -b
npm run lint          # oxlint
npm run test:run      # vitest run   (34 tests currently)
npm run build
```

CI runs `format:check → lint → typecheck → test → build` on push/PR.

**Known accepted lint warning:** `jsx-a11y(prefer-tag-over-role)` fires on the
`<g role="button">` diagram nodes. It cannot be a real `<button>` while keeping its
`transform` and its `<rect>`/`<text>` children. This warning is expected — do not "fix" it by
restructuring the nodes.

### Design tokens — the palette is locked

Defined in `src/styles/tokens.css`. **Do not add new hex values.**

```
--color-bg      #fbfaf8
--color-ink     #1c1917
--color-accent  #ad4319
```

Every neutral is derived via `color-mix()`: `--color-border`, `--color-ink-muted`,
`--color-surface`, `--color-accent-surface`, `--color-on-accent`, `--color-accent-hover`.

Verified contrast: ink-on-bg 16.77:1, accent-on-bg 5.60:1, white-on-accent 5.84:1.
**accent-on-ink is 2.99:1 and FAILS AA — never put accent text on an ink-dark surface.**

Type scale, spacing scale, motion durations (`--motion-duration-fast/base/slow`,
`--motion-ease`) and radii all live in the same file. Components read tokens; they never
hardcode sizes or durations.

---

## 3. The page and the diagram as they exist today

Route: `/experience/level-home` → `src/pages/experience/LevelHomePage.tsx`.

The case study describes a telemetry pipeline Blake built at Level Home: device telemetry →
condenser → Kinesis Firehose → S3 data lake → SQS (on S3 event notification) → Lambda →
a firmware-team-owned parser → Parquet output → Athena, with failures going to a DLQ that
notifies Slack and can be redriven back through SQS.

### File map

| File                         | Role                                                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `pipelineData.ts`            | Pure data. Node ids/positions, `NODE_INFO` copy, regions, static edges, segment paths, `Phase` union, status text.            |
| `pipelineFlow.ts`            | Pure, testable flow logic. Sequences, the `FLOWS` table, `runSequence` / `runFlowLegs` with an injectable `schedule`. No DOM. |
| `pipelineFlow.test.ts`       | 10 tests over the above.                                                                                                      |
| `usePipelineAnimation.ts`    | The engine. Owns the pool of concurrent flows, spawning, imperative token movement, DLQ parking, redrive.                     |
| `PipelineDiagram.tsx`        | Renders the SVG, the nodes, the per-stop effects, the tokens, the status line and controls.                                   |
| `PipelineDiagram.module.css` | Node/edge/token styling and every effect keyframe.                                                                            |
| `NodeInfoPanel.tsx`          | The hover/focus info panel below the diagram.                                                                                 |
| `TelemetryPreview.tsx`       | Left-hand payload panel; shows raw bytes / parse error / decoded record per phase.                                            |

### How the animation engine currently works

`usePipelineAnimation` maintains a pool of `FlowInstance`s:

```ts
interface FlowInstance {
  id: string
  kind: 'ambient' | 'highlighted'
  phase: Phase
  arrivedAt: NodeId | null
}
```

- **Ambient flows** spawn on a jittered 1.5–4s loop, capped at `MAX_TRAVELING_AMBIENT = 4`
  in flight (DLQ-parked ones are deliberately uncapped — watching the backlog grow is the
  point). Each independently rolls `AMBIENT_FAILURE_RATE = 0.2` for its outcome.
- **The highlighted flow** is the one a visitor creates with the buttons. There is only ever
  one; a new one replaces the old. Its outcome is deterministic (the button says what will
  happen, so it must happen). It alone drives the status line, the `TelemetryPreview`, and
  the accent node highlight.
- Both kinds run through **exactly the same engine.** "Highlighted" is presentation, not a
  separate mechanism. Preserve this — it was a deliberate refactor.
- Movement is imperative: each token is an SVG element registered by id in `tokenElsRef`,
  animated with CSS `offset-path` / `offset-distance` and a `transitionend` listener.
- Redrive clears **the entire DLQ backlog**, ambient failures included — that's what
  redriving a queue actually does.

### Hard-won gotchas — do not rediscover these

- **`el.style.offsetPath = value` silently no-ops.** You must use
  `el.style.setProperty('offset-path', ...)`. Same for `offset-distance`.
- **`translate` as a standalone CSS property** (not the `transform` shorthand) composes with
  `offset-path` positioning instead of replacing it. That's how DLQ cluster offsets work.
- **`fill-opacity`, not `opacity`, for ambient dimming.** The engine drives element `opacity`
  imperatively; class-based `opacity` would fight it.
- **React StrictMode double-invokes effects in dev** (mount → cleanup → mount). `mountedRef`
  must be re-armed to `true` in the effect _setup_, not only cleared in cleanup. This
  previously wedged the entire diagram, and typecheck/lint/tests all passed while it was
  broken — only a real browser caught it.
- **A newly spawned flow has no DOM element yet.** That's why `pendingStartsRef` exists: the
  flow parks its trigger and a `[flows]` effect starts it on the next commit.
- **`runSegment` must call `onDone()` even when the element is missing.** Bailing early
  strands the sequence and permanently leaks a traveling slot.
- **The global `prefers-reduced-motion` override in `base.css` collapses CSS transition and
  animation durations, but does NOT touch JS `setTimeout` pauses.** That's why
  `usePipelineAnimation` has its own `schedule` that checks `matchMedia` per call. Ambient
  traffic is suppressed entirely under reduced motion; the visitor's own telemetry still
  runs (it's a deliberate action, not ambience) and completes in ~340ms.
- **jsdom cannot fire real `transitionend` events**, so the animation itself is not
  integration-testable there. `pipelineFlow.ts` is pure specifically so the ordering/timing
  logic _is_ testable without the DOM. Keep new logic on that side of the line.
- Verify in a real browser with Playwright (`npx playwright`, driven from a `node` script).
  Kill stray dev servers first: `lsof -ti:5173-5180 -sTCP:LISTEN | xargs -r kill`.

### Current state of the working tree

Five files are modified and **uncommitted** (the multi-flow ambient rewrite, which is
finished and verified — ambient traffic, DLQ accumulation and clustering, whole-backlog
redrive, ambient per-node effects, reduced-motion suppression all confirmed in a browser):

```
M src/pages/experience/PipelineDiagram.module.css
M src/pages/experience/PipelineDiagram.tsx
M src/pages/experience/pipelineData.ts
M src/pages/experience/pipelineFlow.ts
M src/pages/experience/usePipelineAnimation.ts
```

**Ask Blake to commit these before starting the redesign below.** Landing the redesign on top
of an uncommitted rewrite would produce exactly the unreviewable mega-diff he doesn't want.

---

## 4. The redesign — agreed design spec

Blake's brief, in his words: _"I want the diagram to be interesting throughout, each node
tries to show what it is actually doing so that the user understands it. However, I don't
want the animations to be visual clutter, they should be somewhat quiet and intuitive... I
don't like the boxes for each, they should be real unique stops that complete unique tasks,
all serving to solve this problem."_

### The organizing principle

Those two goals fight each other if every node animates — with 3–4 ambient flows in the air
and 8 animated nodes, something is always moving somewhere.

**The resolution: the node's form does the explaining, statically. The only thing that moves
is the telemetry.** Each stop gets a distinctive silhouette readable at a glance without ever
animating. The animation budget goes almost entirely into what the _token_ does as it passes
through. This is the load-bearing decision of the whole redesign — hold onto it.

### The spine: the token transforms as it travels

The token is a character that visibly changes state at each stop, so the pipeline can be read
backwards from the token's shape alone.

| Stop           | Token becomes                                                              |
| -------------- | -------------------------------------------------------------------------- |
| Device         | 5 small dots (4–6, varying)                                                |
| Condenser      | one circle                                                                 |
| Kinesis        | a smaller, denser circle — that's the gzip                                 |
| S3             | the file **stays** in the lake; a **reference tag** detaches and continues |
| SQS            | the tag queues, not the payload                                            |
| Lambda         | tag → reopens to full size, hex extracted as a row of ticks                |
| Parser         | valid → rectangle. malformed → **unchanged, still ticks**                  |
| Parquet output | rectangle gains 3–4 vertical stripes (columnar)                            |
| Athena         | slots into the grid as a block                                             |

Two consequences make this worth committing to:

**Compression genuinely hides the defect.** Valid vs. malformed is decided at spawn and shown
from the device onward as a tiny notch on one dot. It then becomes _invisible_ from Kinesis
through SQS — because the payload is gzipped and then only a reference — and reappears at
Lambda as a broken tick once the hex is extracted. That isn't a contrivance; it is exactly
why nothing upstream can catch the failure and why the DLQ has to exist. The visual and the
architecture agree.

**Failure means nothing happened.** A parse failure gets no special "rejected" effect. The
token exits the parser exactly as it entered. Absence of transformation _is_ the failure —
quieter and more accurate than any burst.

**Practical blocker:** ambient tokens are `r=4` today. None of this shape language reads at
that size, and ambient tokens are what's on screen 95% of the time. Raise them to roughly the
highlighted size (~7 vs ~9) and carry the distinction entirely in color/opacity, which is
already the established rule.

### Node by node

**Device** — a lock and a video doorbell, loosely based on Level Home hardware. An event fires
(bolt slides / doorbell ring arc) and 4–6 small telemetry pieces emit. Alternate lock and
doorbell per spawn — free asymmetry, and it sells "multiple device types." Keep the event
tiny, under ~400ms: it fires every few seconds in the top-left corner and is the likeliest
source of visual noise.

**Telemetry condenser** — the 5 dots converge and merge into one circle while the node's two
halves close inward ~8px and reopen.

> Blake proposed a hydraulic press _with a rumble effect_. **Keep the press, drop the
> rumble.** Shake is the loudest thing available in a diagram, it's the visual language of
> _error_, it's the effect most likely to read as clutter, and it's actively unpleasant for
> motion-sensitive viewers. It also imports mechanical violence into a diagram where every
> other node is software. The merge reads as compression without the noise. Blake accepted
> this. This is one of only two nodes where the token _count_ changes, so it earns its budget.

**Kinesis Firehose** — draw the node as a nozzle/funnel and let passing through it be what
shrinks the token. The form does the work; the motion is nearly free. More accurate than a
spray effect, too — Firehose is buffered delivery, not spraying. Size = compression is about
the most intuitive gzip visual available without resorting to an icon.

**S3 data lake** — a visible storage space that accumulates. This is the **only node that
should accumulate permanently**: the DLQ drains and Athena's grid is a working set, but files
really do stay in the lake forever. Let it visibly fill over a visit, capped or compacting so
it doesn't overflow after five minutes. When a file lands, a separate small marker detaches
and travels the S3→SQS edge while the file itself stays.

**SQS** — the queue holds **references, not payloads**. Blake asked whether that was accurate:
it is, and it's the most technically credible detail in the diagram. The S3 event notification
message carries bucket/key; Lambda fetches the object afterward. Most people draw the payload
flowing through the queue.

> Consequence: **Lambda has to go back to S3.** Two options — (a) draw a real fetch edge,
> accurate but it adds a line crossing the middle of the diagram, exactly the clutter Blake
> ruled out; or (b) have the token visibly _rehydrate_ from tag back to full file on arrival
> at Lambda, with the hover panel explaining the fetch. **Recommended: (b)** — the
> shape-change vocabulary is well established by that point and it costs no new geometry.

> Open tradeoff, **needs Blake's call**: he wants 3–5 items visible in the queue, but
> traveling flows are capped at 4, so a permanently-full queue would be fiction. Either show
> real occupancy (often 0–1 — honest but less interesting) or raise `MAX_TRAVELING_AMBIENT`
> so the pipeline is genuinely busier. Raising it also serves his "looks like a real system"
> goal, and is the recommendation.

**Lambda** — the token reopens (inverse of the Kinesis narrowing) and the extracted hex
appears. **Actual hex characters will not be legible at token size** — render it as a row of
monospace ticks, like a barcode. Malformed = one tick missing or misaligned. That reads small,
and it's the _same_ defect the device showed as a notch, so there's one visual vocabulary
rather than two.

**Parser** — a literal black box: the only solid-filled node in a diagram where every other
node shows its internals. Instantly readable, zero animation cost, and honest — it's
firmware-team owned and the project deliberately treats it as a pluggable step.

**DLQ** — a queue that visibly builds up.

> Blake asked whether the malformed token should _heal_ when redriven. **It shouldn't**, and
> this is worth defending: redrive does not fix the file. The _parser_ got fixed, and the same
> broken file now parses. His own status copy already says this ("Redrive it once the parser
> is fixed"). Having the token heal in the DLQ teaches the wrong lesson.
>
> Instead: the token stays broken, is redriven still-broken, and the **parser node** picks up
> a small "updated" marker at redrive time. Then the same defective input goes in and a
> rectangle comes out. That answers the obvious question ("why does it work now?"), puts the
> fix where it actually was, and makes the redrive the moment the whole failure pathway pays
> off. Blake accepted this.

**Slack** — a Slack mark with a notification badge that increments per DLQ arrival and clears
on redrive. **Retire the current per-arrival ping burst.** `NODE_INFO` records that this
became a _daily digest_, not a realtime alert — an accumulating count is both quieter and
truer to that decision than a ping per event.

**Parquet output** — not merely a vertical rectangle but one divided into 3–4 **vertical
stripes**. Columnar is recognizable that way, and it distinguishes the output from the
parser's plain rectangle instead of being the same shape rotated.

**Athena** — a grid that incoming blocks slot into. For the query, prefer **a few blocks
briefly highlighting** (a query selects rows) over a sweeping scan line, which is louder and
less semantically accurate. **Decouple it from ingestion**: fire it on its own slow timer,
every 15–20s, not on every arrival. The firmware team queries on their own schedule — more
accurate _and_ much quieter. Cap or compact the grid so it doesn't overflow.

### Three structural consequences

1. **Layout has to change.** `NODE_WIDTH` / `NODE_HEIGHT` are a uniform 140×56 and every
   coordinate is hand-placed around that. Illustrated stops with real internals (the lake, the
   queue, the grid) need per-node dimensions and more room — especially the
   device → condenser → kinesis column, currently a narrow vertical stack at `x=60` that now
   has to hold two device illustrations side by side. Do this as one deliberate re-layout
   pass, not by nudging coordinates. Note that `SEGMENTS` and `STATIC_EDGES` mirror each
   other by hand today; keep them consistent.
2. **Losing the boxes costs the affordance.** The `<rect>` is currently what looks clickable
   and what carries hover/focus state. Illustrated nodes need a replacement or nobody
   discovers the hover info: keep an invisible generous hit-rect per node plus a hairline
   hover outline on the illustration itself. Keyboard focus must stay visible.
3. **The drawings are the real risk.** Hand-rolled SVG of a lock and a doorbell can look cheap
   fast, and cheap illustration would undercut the whole page. What prevents it is staying
   inside the site's existing vocabulary: **1.5px ink-muted strokes, no fills except the
   parser, no new colors, geometric rather than skeuomorphic.** A lock is a rounded rect plus
   a shackle arc — not a rendering of a lock.

### Accessibility must not regress

More illustration means more that is invisible to assistive tech. The `NODE_INFO` text and the
`aria-live` status line remain the source of truth; illustrations are decorative. Nodes keep
their accessible names via `nodeAccessibleLabel`. Reduced motion must still suppress ambient
traffic entirely while leaving the visitor's own telemetry functional.

---

## 5. How to sequence the work

This is roughly 10 bespoke node forms, 6 transformation states and 8 effects — comfortably the
largest single piece of work on the site, bigger than everything the diagram has cost so far
combined. **Do not deliver it as one commit.** Blake reviews in chunks; a monolithic diff here
is the failure mode he has explicitly named.

1. **Node forms** — replace the boxes with the illustrated stops, static, no new motion.
   Includes the re-layout and the hit-rect/hover-affordance replacement. Biggest visual
   change, lowest risk, and it lets Blake judge the illustration quality before anything
   depends on it.
2. **Transformation chain** — the token's shape story end to end, including the defect
   notch → hidden → broken tick arc.
3. **Per-node effects** — device event, condenser merge, S3 fill, SQS queue, Athena query,
   Slack badge, parser "updated" marker on redrive.

Each stands alone, each is independently shippable, each is reviewable in one sitting. Stop
and report after each one; don't run all three together.

### Two questions to get Blake's answer on before or during step 1

1. **Raise `MAX_TRAVELING_AMBIENT`?** Needed for a queue that ever looks like a queue.
   Recommended: yes.
2. **Slow the spawn rate to ~3–6s** (from the current 1.5–4s) now that each arrival is
   visually richer? The DLQ would still accumulate over a visit, but every arrival costs more
   attention than it does today. He earlier said the important property is that _"its
   realistic for stuff to accumulate in the dlq in the time that someone spends on the page"_ —
   so accumulation matters more to him than raw rate.

---

## 6. Explicitly out of scope

Don't touch these unless Blake asks:

- The "my story" section on the Level Home page — it needs his own voice.
- Per-pathway expandable technical detail.
- About page content.
- Brooksee as a second Experience entry.
- Deployment/hosting — undecided, and it involves an account/domain choice outside the code.
