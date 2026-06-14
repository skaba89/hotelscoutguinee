import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { searchAndAddHotels } from '@/lib/automation'

// POST /api/hotels/search — Search web for new Guinea hotels using automation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, saveResults = true } = body as {
      query?: string
      saveResults?: boolean
    }

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    if (saveResults) {
      // Use the automation search-and-add function
      const result = await searchAndAddHotels(query)
      return NextResponse.json({
        query,
        totalResults: result.found,
        hotelsAdded: result.added,
        hotelsSkipped: result.duplicates,
      })
    }

    // If saveResults is false, just return raw search results without saving
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()
    const searchResults = await zai.functions.invoke('web_search', {
      query,
      num: 10,
    })

    // Log the search without saving
    await db.collectionLog.create({
      data: {
        source: 'web_search',
        query,
        resultsFound: searchResults?.length ?? 0,
        hotelsAdded: 0,
        hotelsUpdated: 0,
        status: 'success',
        startedAt: new Date(),
        completedAt: new Date(),
      },
    })

    return NextResponse.json({
      query,
      totalResults: searchResults?.length ?? 0,
      rawSearchResults: searchResults,
    })
  } catch (error) {
    console.error('[POST /api/hotels/search]', error)

    // Try to log the failure
    try {
      await db.collectionLog.create({
        data: {
          source: 'web_search',
          query: 'error',
          resultsFound: 0,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
          startedAt: new Date(),
          completedAt: new Date(),
        },
      })
    } catch {
      // Ignore logging errors
    }

    return NextResponse.json({ totalResults: 0, hotelsAdded: 0, hotelsSkipped: 0, dbError: true })
  }
}
