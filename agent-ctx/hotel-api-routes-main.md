# Task: HotelScout Guinea v7 API Routes

## Task ID: hotel-api-routes

## Summary

Created all 6 API route files for the HotelScout Guinea v7 application:

### Files Created

1. **`/src/app/api/hotels/route.ts`** — GET (list with filters/pagination) and POST (create)
   - GET supports: pagination (page/limit), filters (city, region, stars, priority, pipelineStage, statusDigital, hasWeb, hasBooking, hasTripadvisor), full-text search, sorting
   - POST validates required fields (name, city, region), creates hotel with all schema fields

2. **`/src/app/api/hotels/[id]/route.ts`** — GET, PUT, DELETE single hotel
   - GET includes related contacts, aiAnalyses, verificationLogs
   - PUT partial updates only provided fields
   - DELETE with existence check

3. **`/src/app/api/hotels/verify/route.ts`** — POST: Verify hotel URLs
   - Accepts hotelIds array or verifyAll flag
   - Fetches each hotel web URL with 10s timeout (HEAD request)
   - Updates hotel record: webStatus, webVerified, webVerifiedAt
   - Creates VerificationLog entries per check
   - Batch processing with max 5 concurrent requests

4. **`/src/app/api/hotels/search/route.ts`** — POST: Search web for Guinea hotels
   - Uses `z-ai-web-dev-sdk` ZAI.functions.invoke('web_search', { query, num })
   - Extracts hotel names from search results using regex patterns
   - Deduplicates against existing hotels by name/web URL
   - Auto-detects city/region from snippets
   - Creates CollectionLog entries
   - Optionally saves results as new Hotel records

5. **`/src/app/api/hotels/enrich/route.ts`** — POST: Enrich hotel data from web search
   - Targets hotels missing phone, email, or web fields
   - Uses web search to find missing contact information
   - Extracts phone (+224 format), email, website URLs from search snippets
   - Auto-updates statusDigital based on completeness
   - Detects booking platform URLs (booking.com, tripadvisor)
   - Creates CollectionLog entries

6. **`/src/app/api/export/route.ts`** — GET: Export hotels as CSV
   - Supports same filters as list endpoint for targeted exports
   - RFC 4180 compliant CSV with proper escaping
   - All 39 hotel fields included
   - Content-Disposition header with descriptive filename

### Testing Results

- `GET /api/hotels` — ✅ Returns paginated hotel list with filters
- `GET /api/hotels/[id]` — ✅ Returns single hotel with related data
- `GET /api/export` — ✅ Generates CSV download
- `bun run lint` — ✅ No errors
- Dev server — ✅ All routes compile successfully
