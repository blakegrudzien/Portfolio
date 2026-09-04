import { CaseStudyShell } from '../../components/case-study/CaseStudyShell'
import { CaseStudySection } from '../../components/case-study/CaseStudySection'
import { ExpandablePanelList } from '../../components/common/ExpandablePanelList'
import styles from './ChessRagPage.module.css'

const architectureLayers = [
  {
    id: 'sql',
    title: 'SQL — game statistics',
    children: (
      <p>
        Direct queries over 127,435 games and 10.2 million moves for anything
        statistical: win rates, opening frequencies, move-count trends.
      </p>
    ),
  },
  {
    id: 'vector-rag',
    title: 'Vector RAG — annotated commentary',
    children: (
      <p>
        pgvector search over 468,862 chunks of annotated commentary, embedded
        with Voyage AI's voyage-4 (1024-dim), for conceptual "why is this good"
        questions.
      </p>
    ),
  },
  {
    id: 'engine',
    title: 'Engine evaluation — Stockfish',
    children: (
      <p>
        Real Stockfish analysis through a pool of subprocesses, run concurrently
        so multiple requests don't queue behind each other. The model never
        judges a position itself — every tactical claim in a chat response cites
        an actual engine call.
      </p>
    ),
  },
  {
    id: 'similarity',
    title: 'Structural similarity — opening matching',
    children: (
      <p>
        Opening-move-prefix matching against the game database, surfaced as
        "games that started like this." Explicitly labeled illustrative rather
        than authoritative — it matches move sequences, not chess understanding.
      </p>
    ),
  },
  {
    id: 'recommendations',
    title: 'Recommendations — study filtering',
    children: (
      <p>
        A separate agent filters scraped Lichess studies through a
        gradient-boosted classifier (0.887 cross-validated ROC-AUC on 184
        hand-labeled examples) before surfacing them.
      </p>
    ),
  },
]

const demoLink = {
  label: 'Live demo',
  href: 'https://chess-rag-blake.streamlit.app',
}
const repoLink = {
  label: 'Repo',
  href: 'https://github.com/blakegrudzien/Chess-Scholar',
}
const links = [demoLink, repoLink]

export function ChessRagPage() {
  return (
    <CaseStudyShell
      kind="project"
      title="Chess RAG"
      tags={['Claude', 'pgvector', 'Stockfish', 'Streamlit']}
      links={links}
    >
      <CaseStudySection heading="The problem">
        <p>
          Chess questions aren't one kind of question. "How often does the
          London System win as White?" is a statistics query. "Why is this move
          strong?" needs annotated commentary, not a number. "Is this position
          actually winning?" needs a real engine, not an opinion. "Have I seen a
          game like this before?" is a pattern-matching problem, not a lookup.
          Chess RAG treats these as genuinely different problems, each routed to
          the backend built for it, rather than forcing everything through one
          general-purpose retrieval pipeline and hoping it's close enough.
        </p>
      </CaseStudySection>

      <CaseStudySection heading="Architecture">
        <p>
          Claude's own native tool-calling — not a hand-rolled intent
          classifier, not LangChain or LlamaIndex — decides which backend a
          question actually needs, and can call more than one.
        </p>
        <ExpandablePanelList panels={architectureLayers} defaultOpenId="sql" />
      </CaseStudySection>

      <CaseStudySection heading="Design decisions">
        <p>
          <strong>No LangChain or LlamaIndex.</strong> Raw SQL and direct API
          calls instead — harder to build than wiring up a framework, but every
          part of the request path is inspectable and easy to explain rather
          than hidden behind an abstraction layer.
        </p>
        <p>
          <strong>Tool-calling over a routing classifier.</strong> Claude
          decides which backend a question needs using its own native
          tool-calling, rather than a hand-trained intent classifier sitting in
          front of it — one less model to maintain and evaluate.
        </p>
        <p>
          <strong>
            python-chess as the sole source of truth for move legality.
          </strong>{' '}
          Every move gets validated the same way, everywhere in the system — no
          duplicated, possibly-inconsistent legality logic.
        </p>
        <p>
          <strong>
            A concurrent Stockfish pool, added after it was needed.
          </strong>{' '}
          The engine layer originally ran one position at a time; the pool of
          subprocesses was added after real, reported slowness under concurrent
          use, not built speculatively ahead of a problem that might not have
          happened.
        </p>
        <p>
          <strong>Real error handling on every external call.</strong> Three
          paid APIs and a Postgres connection all fail sometimes; each has
          actual handling, not a bare try/except.
        </p>
        <p>
          <strong>A session-local rate limit (8 requests/minute).</strong>{' '}
          Enough to stop accidental abuse from one session without penalizing
          anyone else using the app.
        </p>
      </CaseStudySection>

      <CaseStudySection heading="Known limitations">
        <p>
          <strong>Chat answers synthesize, they don't judge.</strong> Responses
          combine retrieved commentary and engine output — the model isn't
          forming its own tactical opinion, it's reporting what the engine and
          the annotated games actually say.
        </p>
        <p>
          <strong>
            Structural similarity matches sequences, not understanding.
          </strong>{' '}
          The similarity layer finds games with the same opening moves; it has
          no sense of positional or strategic similarity beyond that.
        </p>
        <p>
          <strong>
            The recommendation classifier is trained on a small, single-labeler
            set.
          </strong>{' '}
          184 hand-labeled examples, all labeled by one person — a real, if
          small, dataset, not a large or independently verified one.
        </p>
        <p>
          <strong>Desktop only, for now.</strong>
        </p>
        <p>
          <strong>
            Trend synthesis across time is designed for, not built.
          </strong>{' '}
          The architecture supports it; it isn't implemented yet.
        </p>
      </CaseStudySection>

      <CaseStudySection heading="Tech stack">
        <p>
          Claude Sonnet 5 (native tool calling) · Voyage AI voyage-4 embeddings
          · Postgres + pgvector (Neon) · Stockfish via python-chess (UCI) ·
          Streamlit with a custom draggable board (wraps chessboard.js) · ruff
        </p>
      </CaseStudySection>

      <CaseStudySection heading="Tests & CI">
        <p>
          235 tests, run in CI on Python 3.11 and 3.12 via GitHub Actions. Tests
          that need a live Postgres connection skip themselves locally with a
          clear reason printed, rather than failing or silently passing.
        </p>
      </CaseStudySection>

      <CaseStudySection heading="Try it" prose={false}>
        <div className={styles.cta}>
          <a
            href={demoLink.href}
            target="_blank"
            rel="noreferrer"
            className={`${styles.ctaLink} ${styles.ctaPrimary}`}
          >
            {demoLink.label}
          </a>
          <a
            href={repoLink.href}
            target="_blank"
            rel="noreferrer"
            className={styles.ctaLink}
          >
            {repoLink.label}
          </a>
        </div>
      </CaseStudySection>
    </CaseStudyShell>
  )
}
