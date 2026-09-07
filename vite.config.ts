import { execSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vitest/config'
import {
  OG_IMAGE,
  ROUTE_META,
  SITE_URL,
  type RouteMeta,
} from './src/routes/routeMeta.js'

const projectDir = dirname(fileURLToPath(import.meta.url))

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Replaces a whole tag, and throws if the template no longer contains it.
 * A silent no-op here would ship pages whose cards all still said "Blake
 * Grudzien", which is exactly the state this build step exists to fix. */
function replaceTag(
  html: string,
  pattern: RegExp,
  replacement: string,
): string {
  if (!pattern.test(html)) {
    throw new Error(`index.html no longer contains a tag matching ${pattern}`)
  }
  return html.replace(pattern, replacement)
}

function applyMeta(template: string, meta: RouteMeta): string {
  const url = meta.path === '/' ? `${SITE_URL}/` : `${SITE_URL}${meta.path}`
  const title = escapeAttribute(meta.title)
  const description = escapeAttribute(meta.description)

  let html = replaceTag(
    template,
    /<title>[\s\S]*?<\/title>/,
    `<title>${title}</title>`,
  )
  html = replaceTag(
    html,
    /<meta\s+name="description"[\s\S]*?\/>/,
    `<meta name="description" content="${description}" />`,
  )
  html = replaceTag(
    html,
    /<meta\s+property="og:title"[\s\S]*?\/>/,
    `<meta property="og:title" content="${title}" />`,
  )
  html = replaceTag(
    html,
    /<meta\s+property="og:description"[\s\S]*?\/>/,
    `<meta property="og:description" content="${description}" />`,
  )
  html = replaceTag(
    html,
    /<meta\s+property="og:url"[\s\S]*?\/>/,
    `<meta property="og:url" content="${url}" />`,
  )
  html = replaceTag(
    html,
    /<link\s+rel="canonical"[\s\S]*?\/>/,
    `<link rel="canonical" href="${url}" />`,
  )
  return replaceTag(
    html,
    /<meta\s+property="og:image"\s+content="[\s\S]*?"\s*\/>/,
    `<meta property="og:image" content="${OG_IMAGE}" />`,
  )
}

/** Writes one static HTML file per route, each carrying that route's own
 * title, description, canonical URL and Open Graph tags.
 *
 * The app is a single-page app, so without this every URL is served the
 * same index.html and every shared link unfurls as the home page. Setting
 * the tags at runtime does not help: LinkedIn, Slack and iMessage read the
 * HTML they are served and never execute the bundle.
 *
 * This is not prerendering. The body is still an empty root div and React
 * still renders the page on the client. Only the head differs per file,
 * which is all a crawler reads.
 */
function routeMetaHtml(): Plugin {
  return {
    name: 'route-meta-html',
    apply: 'build',
    async closeBundle() {
      const distDir = resolve(projectDir, 'dist')
      const indexPath = join(distDir, 'index.html')
      const template = await readFile(indexPath, 'utf8')

      for (const meta of ROUTE_META) {
        const html = applyMeta(template, meta)
        if (meta.path === '/') {
          await writeFile(indexPath, html)
          continue
        }
        // A flat "<path>.html" rather than "<path>/index.html". Both are
        // found by Cloudflare's asset handler, but the directory form makes
        // it 307-redirect /experience/level-home to a trailing-slash URL,
        // and these are the links going on a resume.
        const file = join(distDir, `${meta.path}.html`)
        await mkdir(dirname(file), { recursive: true })
        await writeFile(file, html)
      }
    },
  }
}

/** When the site last actually changed, taken from the last commit rather
 * than from build time, so rebuilding without editing anything does not
 * advertise the site as freshly updated. Falls back to now if git history
 * is not available, which is better than an empty footer. */
function lastUpdated(): string {
  try {
    const iso = execSync('git log -1 --format=%cI', {
      cwd: projectDir,
      encoding: 'utf8',
    }).trim()
    if (iso) return iso
  } catch {
    // No git history here; fall through to build time.
  }
  return new Date().toISOString()
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), routeMetaHtml()],
  define: {
    __LAST_UPDATED__: JSON.stringify(lastUpdated()),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
