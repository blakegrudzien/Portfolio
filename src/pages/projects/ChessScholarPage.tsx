import { CaseStudyShell } from '../../components/case-study/CaseStudyShell'
import { CaseStudySection } from '../../components/case-study/CaseStudySection'
import { ExpandablePanelList } from '../../components/common/ExpandablePanelList'
import styles from './ChessScholarPage.module.css'

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

export function ChessScholarPage() {
  return (
    <CaseStudyShell
      kind="project"
      title="Chess Scholar"
      tags={['Claude', 'pgvector', 'Stockfish', 'Streamlit']}
      links={links}
    >
      <CaseStudySection heading="The problem">
        <p>
          Chess engines surpassed human players decades ago, however they don't
          understand chess in the same way humans do. Attempts at AI coaching
          generally fall flat because they have to reverse engineer a human
          readable explanation for a decision made without those ideas in mind.
          Chess Scholar bypasses this problem by training a model on high level
          annotations. This way, the AI never tries to understand the game on
          its own and instead supplies the user with relevant human commentary
          to explain the reasoning behind a move.
        </p>
      </CaseStudySection>

      <CaseStudySection heading="Architecture">
        <p>
          Four different backends, each specialized for a different type of
          question: SQL for statistics, vector RAG for annotated commentary,
          Stockfish for tactical evaluation, and structural similarity for
          opening matching. Claude uses its own native tool-calling to choose
          which combination of layers will best answer the user's question.
          After the response, the recommendation layer filters Lichess studies
          and grandmaster games to suggest relevant further study material.
          Lichess studies are scraped and filtered through a gradient-boosted
          classifier so only high quality studies are suggested. Grandmaster
          games are picked based on positional relevance.
        </p>
        <ExpandablePanelList panels={architectureLayers} defaultOpenId="sql" />
      </CaseStudySection>

      <CaseStudySection heading="Known limitations">
        <p>
          Answers are built out of retrieved commentary and engine output, not
          the model's own read of a position. That's the design, but it means
          the quality of an explanation depends on whether a human ever
          annotated something similar.
        </p>
        <p>
          The similarity layer matches opening move sequences, not positional
          understanding, so "games that started like this" is doing less than it
          sounds like it is. The study recommender's classifier scored 0.887
          cross-validated ROC-AUC, but it was trained on 184 examples I labeled
          myself, so that number reflects one person's judgment of what makes a
          good study.
        </p>
        <p>
          It's desktop only right now, and synthesizing trends across a player's
          games over time is designed for but not built.
        </p>
      </CaseStudySection>

      <CaseStudySection heading="Tech stack">
        <p>
          Python · Claude Sonnet 5 (native tool calling) · Voyage AI voyage-4
          embeddings · Postgres + pgvector (Neon) · Stockfish via python-chess
          (UCI) · Streamlit with a custom draggable board (wraps chessboard.js)
          · ruff
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
