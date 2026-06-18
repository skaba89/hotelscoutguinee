/**
 * Public web search fallback for environments where the ZAI SDK is not
 * reachable (e.g. Render, Vercel, any external PaaS).
 *
 * The ZAI SDK uses `internal-api.z.ai` which resolves to private IPs
 * (172.25.x.x) and is only accessible from within Z.ai's infrastructure.
 * On external hosts like Render, all ZAI calls fail with "fetch failed".
 *
 * This module uses DuckDuckGo's HTML endpoint (no API key required, no
 * rate limits, publicly reachable) and returns results in the same shape
 * as the ZAI SDK's `functions.invoke('web_search', ...)` so callers can
 * use them interchangeably.
 *
 * Result shape: Array<{ name: string; url: string; snippet: string; source?: string }>
 *
 * IMPORTANT: Use GET (not POST) with a Safari User-Agent. POST requests
 * to the html endpoint are served the "lite" version without results.
 */

interface WebSearchResult {
  name: string
  url: string
  snippet: string
  source?: string
}

const DDG_HTML_ENDPOINT = 'https://html.duckduckgo.com/html/'
// Safari UA works; Chrome UA sometimes gets the lite page without results
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 ' +
  '(KHTML, like Gecko) Version/17.0 Safari/605.1.15'

/**
 * Extract the actual URL from a DuckDuckGo redirect link.
 * DDG returns links in the form: //duckduckgo.com/l/?uddg=<encoded-url>&rut=...
 * or sometimes: https://duckduckgo.com/l/?uddg=<encoded-url>...
 */
function extractActualUrl(rawHref: string): string {
  try {
    // Handle protocol-relative URLs
    let href = rawHref
    if (href.startsWith('//')) {
      href = 'https:' + href
    }
    const url = new URL(href, 'https://duckduckgo.com')
    const uddg = url.searchParams.get('uddg')
    if (uddg) {
      return decodeURIComponent(uddg)
    }
    // If no uddg param, it might be a direct link
    return href
  } catch {
    return rawHref
  }
}

/**
 * Decode HTML entities in a string (basic implementation).
 */
function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x2F;/g, '/')
}

/**
 * Strip all HTML tags from a string.
 */
function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '').trim()
}

/**
 * Search the web using DuckDuckGo's HTML endpoint.
 * Returns an array of results with name, url, and snippet.
 *
 * @param query Search query
 * @param num Maximum number of results to return (default 10)
 */
export async function duckDuckGoSearch(
  query: string,
  num: number = 10
): Promise<WebSearchResult[]> {
  // Use GET with query string — POST returns the lite page without results
  const url = `${DDG_HTML_ENDPOINT}?q=${encodeURIComponent(query)}`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    throw new Error(`DuckDuckGo returned HTTP ${res.status}`)
  }

  const html = await res.text()
  const results: WebSearchResult[] = []

  // DDG HTML structure (with Safari UA):
  //   <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=...&rut=...">Title</a>
  //   <a class="result__snippet" href="...">Snippet text...</a>
  //
  // We split into two regexes because the title and snippet are in
  // separate anchors that may have other attributes between them.

  const titleRegex = /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g
  const snippetRegex = /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g

  const titles: { url: string; name: string }[] = []
  let titleMatch: RegExpExecArray | null
  while ((titleMatch = titleRegex.exec(html)) !== null) {
    const rawUrl = titleMatch[1]
    const titleHtml = titleMatch[2]
    const name = decodeHtml(stripHtml(titleHtml))
    const actualUrl = extractActualUrl(rawUrl)
    if (name && actualUrl && name.length >= 3) {
      titles.push({ url: actualUrl, name })
    }
  }

  const snippets: string[] = []
  let snippetMatch: RegExpExecArray | null
  while ((snippetMatch = snippetRegex.exec(html)) !== null) {
    snippets.push(decodeHtml(stripHtml(snippetMatch[1])))
  }

  // Combine titles with snippets (they appear in the same order)
  for (let i = 0; i < titles.length && results.length < num; i++) {
    const t = titles[i]
    const snippet = snippets[i] ?? ''
    let source: string | undefined
    try {
      const u = new URL(t.url)
      source = u.hostname.replace(/^www\./, '')
    } catch {
      source = undefined
    }
    results.push({
      name: t.name,
      url: t.url,
      snippet,
      source,
    })
  }

  return results
}

/**
 * Check if an error from the ZAI SDK is a network error that warrants
 * falling back to DuckDuckGo.
 */
export function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message.toLowerCase()
  return (
    msg.includes('fetch failed') ||
    msg.includes('network error') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound') ||
    msg.includes('etimedout') ||
    msg.includes('econnreset') ||
    msg.includes('socket hang up') ||
    msg.includes('getaddrinfo') ||
    // Underlying cause errors
    (err as { cause?: { code?: string } }).cause?.code === 'ECONNREFUSED' ||
    (err as { cause?: { code?: string } }).cause?.code === 'ENOTFOUND' ||
    (err as { cause?: { code?: string } }).cause?.code === 'ETIMEDOUT' ||
    (err as { cause?: { code?: string } }).cause?.code === 'ECONNRESET'
  )
}
