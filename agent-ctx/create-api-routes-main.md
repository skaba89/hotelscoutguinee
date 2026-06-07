# API Routes Task - Work Record

## Task ID: create-api-routes

## Summary
Created 4 API route files for HotelScout Guinea v7:

### 1. `/api/pipeline/route.ts`
- **GET**: Returns all 5 pipeline stages (nouveau, contacte, interesse, proposal, client) with counts and full hotel objects
- **PUT**: Moves a hotel to a different pipeline stage. Validates stage value, checks hotel existence, auto-increments contactCount when moving to "contacte", updates lastContactAt
- Returns French labels for each stage (Nouveau, Contacté, Intéressé, Proposition, Client)

### 2. `/api/contacts/route.ts`
- **GET**: Lists contacts with optional filters (hotelId, status, channel), includes related hotel data, supports pagination (limit/offset)
- **POST**: Creates a new contact with validation for channel (email|whatsapp|phone|visit), direction (outbound|inbound), status (sent|delivered|replied|converted). Auto-updates hotel's lastContactAt and contactCount
- Returns 201 on success with full contact + hotel data

### 3. `/api/stats/route.ts`
- **GET**: Returns comprehensive dashboard statistics
  - totalHotels, byRegion, byDigitalStatus, averageScore
  - pipelineDistribution, priorityDistribution
  - recentContactsCount (last 7 days), totalContacts
  - digitalReadiness (% of hotels with statusDigital="ok")
  - hotelsWithWebsite/Phone/Email counts
  - All queries run in parallel for performance

### 4. `/api/cron/collect/route.ts`
- **POST**: Automated data collection using z-ai-web-dev-sdk
  - Searches 8 different queries for Guinea hotels
  - Filters results by hotel-related keywords
  - Checks for duplicates using name similarity (Jaccard token overlap, 0.7 threshold)
  - Auto-extracts city/region from search snippets
  - Computes digital status, score, and priority for new hotels
  - Logs each collection run to CollectionLog table
  - Returns { found, added, updated, errors, details }

## Also Fixed
- Pre-existing lint error in `/api/hotels/search/route.ts` line 253: `N'Zoo` string literal with unescaped apostrophe

## Test Results
All endpoints tested successfully:
- GET /api/pipeline → 200 with all stages and 33 hotels
- PUT /api/pipeline → 200 (stage move) and 400 (validation)
- GET /api/contacts → 200 with pagination
- POST /api/contacts → 201 (created) and 400 (validation)
- GET /api/stats → 200 with comprehensive statistics
- Lint passes clean
