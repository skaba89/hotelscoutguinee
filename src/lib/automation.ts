// HotelScout Guinea v7 — Automation Service
// Server-side only: URL verification, data enrichment, and automated collection

import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'
import { validateUrl } from '@/lib/security'

// ─── ZAI SDK Initialization ──────────────────────────────────────────

/**
 * Create a ZAI SDK instance with robust config-file fallback.
 * Tries ZAI.create() (reads .z-ai-config from cwd, home, /etc).
 * If the config file is missing, writes one from environment variables
 * and retries. This handles both local dev and Render/Docker deployments.
 */
async function createZAI(): Promise<ZAI> {
  try {
    return await ZAI.create()
  } catch {
    // Config file not found in standard locations — try env vars
    const baseUrl = process.env.ZAI_BASE_URL
    const apiKey = process.env.ZAI_API_KEY
    if (baseUrl && apiKey) {
      const fs = await import('fs/promises')
      const path = await import('path')
      const os = await import('os')

      const config = JSON.stringify({
        baseUrl,
        apiKey,
        chatId: process.env.ZAI_CHAT_ID || '',
        userId: process.env.ZAI_USER_ID || '',
        token: process.env.ZAI_TOKEN || '',
      })

      // Write to multiple locations to ensure ZAI.create() finds it
      const writePaths = [
        path.join(process.cwd(), '.z-ai-config'),
        path.join(os.homedir(), '.z-ai-config'),
      ]
      for (const p of writePaths) {
        try {
          await fs.writeFile(p, config, 'utf-8')
        } catch {
          // Directory might not be writable — ignore
        }
      }
      return await ZAI.create()
    }
    throw new Error(
      'ZAI SDK non configuré. Créez .z-ai-config ou définissez ZAI_BASE_URL + ZAI_API_KEY.'
    )
  }
}

// ─── Helper Utilities ──────────────────────────────────────────────

/** Normalize a hotel name for similarity comparison */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Compute token-overlap similarity between two names (0–1) */
function similarity(a: string, b: string): number {
  const normA = normalizeName(a)
  const normB = normalizeName(b)
  if (normA === normB) return 1
  if (normA.includes(normB) || normB.includes(normA)) return 0.85
  const tokensA = new Set(normA.split(' '))
  const tokensB = new Set(normB.split(' '))
  const intersection = [...tokensA].filter((t) => tokensB.has(t))
  const union = new Set([...tokensA, ...tokensB])
  return union.size > 0 ? intersection.length / union.size : 0
}

/** Known Guinea cities for snippet extraction */
const GUINEA_CITIES = [
  'Conakry', 'Kankan', 'Nzérékoré', 'Kindia', 'Boké', 'Fria',
  'Labé', 'Mamou', 'Siguiri', 'Guéckédou', 'Kissidougou', 'Macenta',
  'Dabola', 'Faranah', 'Kouroussa', 'Télimélé', 'Dubréka', 'Coyah',
  'Forécariah', 'Boffa', 'Gaoual', 'Koundara', 'Mali', 'Lélouma',
  'Tougué', 'Koubia', 'Dinguiraye', 'Beyla', 'Lola', 'Pita',
  'Dalaba', 'Yomou', "N'Zoo", 'Kérouané', 'Kamsar', 'Sangarédi',
]

/** Map city → administrative region */
const CITY_TO_REGION: Record<string, string> = {
  Conakry: 'Conakry', Kankan: 'Kankan', Kindia: 'Kindia',
  Nzérékoré: 'Nzérékoré', Boké: 'Boké', Labé: 'Labé',
  Faranah: 'Faranah', Kissidougou: 'Nzérékoré', Macenta: 'Nzérékoré',
  'Guéckédou': 'Nzérékoré', Mamou: 'Mamou', Siguiri: 'Kankan',
  Télimélé: 'Kindia', Dubréka: 'Kindia', Boffa: 'Boké',
  Kamsar: 'Boké', Sangarédi: 'Boké', Fria: 'Boké',
  Coyah: 'Kindia', Forécariah: 'Kindia', Gaoual: 'Boké',
  Koundara: 'Boké', Dabola: 'Faranah', Kouroussa: 'Kankan',
  'Kérouané': 'Kankan', Beyla: 'Nzérékoré', Lola: 'Nzérékoré',
  Yomou: 'Nzérékoré', Pita: 'Labé', Dalaba: 'Labé',
  Lélouma: 'Labé', Tougué: 'Labé', Koubia: 'Labé',
  Dinguiraye: 'Faranah', Mali: 'Labé',
}

const GUINEA_REGIONS = [
  'Conakry', 'Kankan', 'Nzérékoré', 'Kindia', 'Boké',
  'Labé', 'Mamou', 'Faranah',
]

function extractCityFromText(text: string, fallback = 'Conakry'): string {
  const lower = text.toLowerCase()
  for (const city of GUINEA_CITIES) {
    if (lower.includes(city.toLowerCase())) return city
  }
  return fallback
}

function extractRegionFromCity(city: string): string {
  return CITY_TO_REGION[city] ?? 'Conakry'
}

/** Check if a URL belongs to a booking/OTA platform */
function isBookingPlatform(url: string): boolean {
  const platforms = [
    'booking.com', 'tripadvisor.com', 'agoda.com', 'expedia.com',
    'hotels.com', 'priceline.com', 'kayak.com', 'trivago.com',
    'google.com', 'facebook.com', 'instagram.com', 'twitter.com',
    'youtube.com', 'wikipedia.org',
  ]
  return platforms.some((p) => url.toLowerCase().includes(p))
}

/** Detect the source platform from a URL or hostname */
function detectSourcePlatform(url: string, hostname: string): string {
  const lower = (url + ' ' + hostname).toLowerCase()
  if (lower.includes('booking.com')) return 'booking'
  if (lower.includes('tripadvisor')) return 'tripadvisor'
  if (lower.includes('agoda')) return 'agoda'
  if (lower.includes('expedia')) return 'expedia'
  if (lower.includes('hotels.com')) return 'hotels_com'
  if (lower.includes('google')) return 'google'
  if (lower.includes('facebook')) return 'facebook'
  return 'web'
}

/** Extract a hotel name from a search result title/snippet */
function extractHotelName(title: string, snippet: string): string | null {
  const patterns = [
    /^(.+?)\s*[-–—|]\s*(?:Guinea|Conakry|Booking|TripAdvisor|Agoda|Expedia|Hotels\.com)/i,
    /^(.+?)\s*,\s*(?:Guinea|Conakry)/i,
    /^(Hotel\s+.+?)\s*[-–—]/i,
    /^(H[oô]tel\s+[A-Z][\w\s&'-]+)/i,
    /^(Auberge\s+[A-Z][\w\s&'-]+)/i,
    /^(R[eé]sidence\s+[A-Z][\w\s&'-]+)/i,
    /^(.+?)\s*[-–—|]\s*.+/,
  ]
  for (const pattern of patterns) {
    const match = title.match(pattern)
    if (match && match[1]) {
      const name = match[1].trim()
      if (name.length >= 3 && name.length <= 100) return name
    }
  }
  if (title.length >= 3 && title.length <= 100) return title.trim()
  return null
}

/** Compute digital-presence score for a hotel */
function computeScore(data: {
  web?: string | null; phone?: string | null; email?: string | null
  fb?: string | null; wa?: string | null
  hasBooking?: boolean; hasTripadvisor?: boolean
}): number {
  let score = 0
  if (data.web) score += 20
  if (data.phone) score += 15
  if (data.email) score += 15
  if (data.fb) score += 10
  if (data.wa) score += 10
  if (data.hasBooking) score += 15
  if (data.hasTripadvisor) score += 15
  return Math.min(score, 100)
}

function determinePriority(score: number): string {
  if (score >= 60) return 'hot'
  if (score >= 30) return 'warm'
  return 'cold'
}

function determineDigitalStatus(opts: { url?: string | null; snippet?: string }): string {
  const hasUrl = !!opts.url
  const snippet = (opts.snippet ?? '').toLowerCase()
  if (hasUrl) {
    if (
      snippet.includes('site web') ||
      snippet.includes('website') ||
      snippet.includes('www.') ||
      snippet.includes('.com') ||
      snippet.includes('.gn')
    ) return 'ok'
    return 'partial'
  }
  return 'none'
}

// ─── 1. verifyHotelUrl ─────────────────────────────────────────────

export async function verifyHotelUrl(
  hotelId: string
): Promise<{ status: string; statusCode?: number; responseMs?: number }> {
  const hotel = await db.hotel.findUnique({
    where: { id: hotelId },
    select: { id: true, web: true, name: true },
  })

  if (!hotel || !hotel.web) {
    return { status: 'error' }
  }

  const url = hotel.web

  // SSRF protection (fixes C4)
  const urlValidation = validateUrl(url)
  if (!urlValidation.valid) {
    await db.hotel.update({
      where: { id: hotel.id },
      data: { webStatus: 'error', webVerified: false, webVerifiedAt: new Date() },
    })
    await db.verificationLog.create({
      data: { hotelId: hotel.id, url, status: 'error', error: `SSRF blocked: ${urlValidation.reason}` },
    })
    return { status: 'error' }
  }

  const startTime = Date.now()

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'HotelScout-Guinea/7.0 (URL Verifier)',
      },
    })

    clearTimeout(timeoutId)
    const responseMs = Date.now() - startTime

    let status: string
    if (response.ok) {
      status = 'ok'
    } else if (response.redirected) {
      status = 'redirect'
    } else {
      status = 'down'
    }

    // Update hotel record
    await db.hotel.update({
      where: { id: hotel.id },
      data: {
        webStatus: status,
        webVerified: status === 'ok',
        webVerifiedAt: new Date(),
      },
    })

    // Create verification log
    await db.verificationLog.create({
      data: {
        hotelId: hotel.id,
        url,
        status,
        statusCode: response.status,
        responseMs,
      },
    })

    return { status, statusCode: response.status, responseMs }
  } catch (err: unknown) {
    const responseMs = Date.now() - startTime
    const isTimeout = (err instanceof DOMException && err.name === 'AbortError') || (err instanceof Error && err.name === 'AbortError') || (err instanceof Error && err.message?.includes('abort'))
    const errorMessage = err instanceof Error ? err.message : String(err)
    const status = isTimeout ? 'timeout' : 'error'

    // Update hotel record
    await db.hotel.update({
      where: { id: hotel.id },
      data: {
        webStatus: status,
        webVerified: false,
        webVerifiedAt: new Date(),
      },
    })

    // Create verification log
    await db.verificationLog.create({
      data: {
        hotelId: hotel.id,
        url,
        status,
        statusCode: null,
        responseMs,
        error: errorMessage,
      },
    })

    return { status, responseMs }
  }
}

// ─── 2. verifyAllUrls ──────────────────────────────────────────────

export async function verifyAllUrls(): Promise<{
  verified: number
  ok: number
  failed: number
  results: Array<{
    hotelId: string
    name: string
    status: string
    statusCode?: number
    responseMs?: number
  }>
}> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const hotels = await db.hotel.findMany({
    where: {
      web: { not: '' },
      OR: [
        { webVerifiedAt: null },
        { webVerifiedAt: { lt: sevenDaysAgo } },
      ],
    },
    select: { id: true, name: true, web: true },
  })

  const results: Array<{
    hotelId: string
    name: string
    status: string
    statusCode?: number
    responseMs?: number
  }> = []

  // Process in batches of 5 concurrent requests
  const BATCH_SIZE = 5
  for (let i = 0; i < hotels.length; i += BATCH_SIZE) {
    const batch = hotels.slice(i, i + BATCH_SIZE)

    const batchResults = await Promise.allSettled(
      batch.map(async (hotel) => {
        const result = await verifyHotelUrl(hotel.id)
        return {
          hotelId: hotel.id,
          name: hotel.name,
          ...result,
        }
      })
    )

    for (const r of batchResults) {
      if (r.status === 'fulfilled') {
        results.push(r.value)
      }
    }
  }

  const okCount = results.filter((r) => r.status === 'ok').length
  const failedCount = results.filter((r) => r.status !== 'ok').length

  return { verified: results.length, ok: okCount, failed: failedCount, results }
}

// ─── 3. enrichHotelData ────────────────────────────────────────────

export async function enrichHotelData(
  hotelId: string
): Promise<{ enriched: boolean; fields: string[] }> {
  const hotel = await db.hotel.findUnique({
    where: { id: hotelId },
  })

  if (!hotel) {
    return { enriched: false, fields: [] }
  }

  // Determine which fields are missing
  const missingFields: string[] = []
  if (!hotel.phone) missingFields.push('phone')
  if (!hotel.email) missingFields.push('email')
  if (!hotel.web) missingFields.push('web')

  if (missingFields.length === 0) {
    return { enriched: false, fields: [] }
  }

  // Initialize ZAI SDK (backend only)
  const zai = await createZAI()

  const searchQuery = `"${hotel.name}" ${hotel.city} Guinea hotel contact information`
  const searchResults = await zai.functions.invoke('web_search', {
    query: searchQuery,
    num: 5,
  })

  const enrichedFields: string[] = []
  const updates: Record<string, unknown> = {}

  for (const result of searchResults) {
    const combinedText = `${result.name ?? ''} ${result.snippet ?? ''}`

    // Extract phone number (+224 format)
    if (missingFields.includes('phone') && !updates.phone) {
      const phoneMatch =
        combinedText.match(/(?:\+224|00224)[\s.-]?\d{2,3}[\s.-]?\d{2,3}[\s.-]?\d{2,3}/) ||
        combinedText.match(/(?:phone|t[eé]l|telephone|call)[\s:]?\s*([+]?[\d\s.-]{8,20})/i)
      if (phoneMatch) {
        updates.phone = phoneMatch[0].trim()
        if (!enrichedFields.includes('phone')) enrichedFields.push('phone')
      }
    }

    // Extract email address
    if (missingFields.includes('email') && !updates.email) {
      const emailMatch = combinedText.match(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
      )
      if (emailMatch) {
        updates.email = emailMatch[0].trim()
        if (!enrichedFields.includes('email')) enrichedFields.push('email')
      }
    }

    // Extract website URL (skip booking/tripadvisor/expedia/agoda domains)
    if (missingFields.includes('web') && !updates.web) {
      const urlMatch = combinedText.match(
        /https?:\/\/(?!.*(?:booking\.com|tripadvisor|agoda|expedia|hotels\.com))[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s]*/i
      )
      if (urlMatch) {
        updates.web = urlMatch[0].trim()
        if (!enrichedFields.includes('web')) enrichedFields.push('web')
      } else if (result.url && !isBookingPlatform(result.url)) {
        updates.web = result.url
        if (!enrichedFields.includes('web')) enrichedFields.push('web')
      }
    }

    // Also detect booking/tripadvisor URLs for the dedicated fields
    if (result.url) {
      if (result.url.includes('booking.com') && !hotel.bookingUrl) {
        updates.bookingUrl = result.url
        updates.hasBooking = true
      }
      if (result.url.includes('tripadvisor.com') && !hotel.tripadvisorUrl) {
        updates.tripadvisorUrl = result.url
        updates.hasTripadvisor = true
      }
    }

    // Stop if all missing fields are found
    if (missingFields.every((f) => updates[f])) break
  }

  // Recalculate statusDigital
  if (Object.keys(updates).length > 0) {
    const futurePhone = (updates.phone as string) ?? hotel.phone
    const futureEmail = (updates.email as string) ?? hotel.email
    const futureWeb = (updates.web as string) ?? hotel.web
    if (futurePhone && futureEmail && futureWeb) {
      updates.statusDigital = 'ok'
    } else if (futurePhone || futureEmail || futureWeb) {
      updates.statusDigital = 'partial'
    }

    await db.hotel.update({
      where: { id: hotel.id },
      data: updates,
    })
  }

  // Log the enrichment
  try {
    await db.collectionLog.create({
      data: {
        source: 'web_search_enrich',
        query: `Enrich ${hotel.name} — ${missingFields.join(', ')}`,
        resultsFound: searchResults.length,
        hotelsAdded: 0,
        hotelsUpdated: enrichedFields.length > 0 ? 1 : 0,
        status: enrichedFields.length > 0 ? 'success' : 'partial',
        startedAt: new Date(),
        completedAt: new Date(),
      },
    })
  } catch {
    // CollectionLog table may not exist yet — ignore
  }

  return { enriched: enrichedFields.length > 0, fields: enrichedFields }
}

// ─── 4. searchAndAddHotels ─────────────────────────────────────────

export async function searchAndAddHotels(
  query: string
): Promise<{ found: number; added: number; duplicates: number; error?: string }> {
  let zai
  try {
    zai = await createZAI()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[AUTOMATION searchAndAddHotels] ZAI init failed: ${msg}`)
    return { found: 0, added: 0, duplicates: 0, error: `Search '${query}' failed: ${msg}` }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let searchResults: any[]
  try {
    searchResults = await zai.functions.invoke('web_search', {
      query,
      num: 10,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[AUTOMATION searchAndAddHotels] Search failed for "${query}": ${msg}`)
    return { found: 0, added: 0, duplicates: 0, error: `Search '${query}' failed: ${msg}` }
  }

  if (!searchResults || !Array.isArray(searchResults)) {
    return { found: 0, added: 0, duplicates: 0 }
  }

  // Load existing hotels for duplicate checking
  const existingHotels = await db.hotel.findMany({
    select: { id: true, name: true },
  })

  let added = 0
  let duplicates = 0
  let skipped = 0

  const hotelKeywords = [
    'hotel', 'hôtel', 'hostel', 'lodge', 'resort', 'auberge',
    'guest house', "maison d'hôte", 'campement', 'motel',
  ]

  for (const item of searchResults) {
    try {
      const hotelName = item.name?.trim()
      if (!hotelName || hotelName.length < 3) {
        skipped++ // count unparseable results as skips (fixes L7)
        continue
      }

      // Check if it's a hotel (not an OTA page)
      const lowerName = hotelName.toLowerCase()
      const isHotelRelated = hotelKeywords.some((kw) => lowerName.includes(kw))
      if (!isHotelRelated) {
        skipped++
        continue
      }

      // Check for duplicate by name similarity
      let isDuplicate = false
      for (const existing of existingHotels) {
        const sim = similarity(hotelName, existing.name)
        if (sim >= 0.7) {
          isDuplicate = true
          break
        }
      }

      if (isDuplicate) {
        duplicates++
        continue
      }

      // Also check by web URL
      if (item.url) {
        const urlMatch = await db.hotel.findFirst({
          where: { web: item.url },
        })
        if (urlMatch) {
          duplicates++
          continue
        }
      }

      // Determine city / region
      const city = extractCityFromText(`${item.snippet ?? ''} ${item.name ?? ''}`)
      const region = extractRegionFromCity(city)
      const digitalStatus = determineDigitalStatus({
        url: item.url,
        snippet: item.snippet,
      })
      const sourcePlatform = detectSourcePlatform(item.url ?? '', item.host_name ?? '')
      const score = computeScore({
        web: item.url,
        hasBooking: sourcePlatform === 'booking',
        hasTripadvisor: sourcePlatform === 'tripadvisor',
      })
      const priority = determinePriority(score)

      // Create the new hotel
      const newHotel = await db.hotel.create({
        data: {
          name: hotelName,
          city,
          region,
          web: item.url ?? null,
          source: `web_search:${sourcePlatform}`,
          statusDigital: digitalStatus,
          hasBooking: sourcePlatform === 'booking',
          hasTripadvisor: sourcePlatform === 'tripadvisor',
          bookingUrl: sourcePlatform === 'booking' ? item.url : null,
          tripadvisorUrl: sourcePlatform === 'tripadvisor' ? item.url : null,
          score,
          priority,
          pipelineStage: 'nouveau',
          webVerified: !!item.url,
          webVerifiedAt: item.url ? new Date() : null,
        },
      })

      existingHotels.push({ id: newHotel.id, name: newHotel.name })
      added++
    } catch (itemError) {
      console.error('[AUTOMATION searchAndAddHotels] Error processing item:', itemError)
    }
  }

  // Log the collection
  try {
    await db.collectionLog.create({
      data: {
        source: 'web_search',
        query,
        resultsFound: searchResults.length,
        hotelsAdded: added,
        hotelsUpdated: 0,
        status: added > 0 ? 'success' : 'partial',
        startedAt: new Date(),
        completedAt: new Date(),
      },
    })
  } catch {
    // CollectionLog table may not exist yet — ignore
  }

  return { found: searchResults.length, added, duplicates }
}

// ─── 5. runFullCollection ──────────────────────────────────────────

const FULL_COLLECTION_QUERIES = [
  'hotels Guinea Conakry',
  'hôtels Guinée site web',
  'hotels Conakry booking',
  'hôtels Guinée Conakry contact',
  'hotels Guinea Kankan',
  'hotels Guinea Kindia',
  'hôtels Guinée Nzérékoré',
  'hotels Guinea Boké',
  'hotels Guinea Labé',
  'hotels Guinea Mamou',
  'auberges Guinée Conakry',
  'résidences hôtelières Guinea',
]

export async function runFullCollection(): Promise<{
  searched: number
  added: number
  verified: number
  enriched: number
  errors: string[]
  success: boolean
}> {
  let totalSearched = 0
  let totalAdded = 0
  const errors: string[] = []

  // Phase 1: Search and add new hotels from multiple queries
  for (const query of FULL_COLLECTION_QUERIES) {
    try {
      const result = await searchAndAddHotels(query)
      totalSearched += result.found
      totalAdded += result.added
      if (result.error) {
        errors.push(result.error)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[AUTOMATION runFullCollection] Search failed for "${query}":`, msg)
      errors.push(`Search '${query}' failed: ${msg}`)
    }
  }

  // Phase 2: Verify all URLs that haven't been checked recently
  let verified = 0
  try {
    const verifyResult = await verifyAllUrls()
    verified = verifyResult.verified
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[AUTOMATION runFullCollection] URL verification failed:', msg)
    errors.push(`URL verification failed: ${msg}`)
  }

  // Phase 3: Enrich hotels missing data (phone, email, web)
  let enriched = 0
  try {
    const hotelsToEnrich = await db.hotel.findMany({
      where: {
        OR: [
          { phone: null },
          { email: null },
          { web: null },
        ],
      },
      take: 30, // limit batch to avoid API rate limits
      select: { id: true },
    })

    for (const hotel of hotelsToEnrich) {
      try {
        const result = await enrichHotelData(hotel.id)
        if (result.enriched) enriched++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(
          `[AUTOMATION runFullCollection] Enrich failed for hotel ${hotel.id}:`,
          msg
        )
        errors.push(`Enrichment failed for hotel ${hotel.id}: ${msg}`)
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[AUTOMATION runFullCollection] Enrichment phase failed:', msg)
    errors.push(`Enrichment phase failed: ${msg}`)
  }

  // Log the full collection cycle
  try {
    await db.collectionLog.create({
      data: {
        source: 'full_automation',
        query: FULL_COLLECTION_QUERIES.join('; '),
        resultsFound: totalSearched,
        hotelsAdded: totalAdded,
        hotelsUpdated: enriched,
        status: totalAdded > 0 || enriched > 0 ? 'success' : 'partial',
        startedAt: new Date(),
        completedAt: new Date(),
      },
    })
  } catch {
    // CollectionLog table may not exist yet — ignore
  }

  return {
    searched: totalSearched,
    added: totalAdded,
    verified,
    enriched,
    errors,
    success: errors.length === 0,
  }
}
