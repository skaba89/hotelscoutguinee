import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/import/hotels — Batch import curated hotels
export async function POST(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET
    const authHeader = request.headers.get('x-cron-secret')
    const origin = (request.headers.get('origin') || '').toLowerCase()
    const referer = (request.headers.get('referer') || '').toLowerCase()
    const isSameOrigin = origin.includes('netlify.app') || origin.includes('localhost') || referer.includes('netlify.app') || referer.includes('localhost')
    if (cronSecret && !isSameOrigin && authHeader !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hotelsData = [
      { name: "Hôtel Sily", city: "Conakry", region: "Conakry", stars: 3, source: "curated", hasBooking: true },
      { name: "Hôtel Djoliba", city: "Conakry", region: "Conakry", stars: 2, source: "curated" },
      { name: "Hôtel Félicia", city: "Conakry", region: "Conakry", stars: 3, source: "curated", hasBooking: true },
      { name: "Hôtel Villa Tinka", city: "Conakry", region: "Conakry", stars: 3, source: "curated" },
      { name: "Premier Palace Hôtel", city: "Conakry", region: "Conakry", stars: 3, source: "curated" },
      { name: "Hôtel la Falaise", city: "Conakry", region: "Conakry", stars: 3, source: "curated" },
      { name: "Hôtel Baobab", city: "Conakry", region: "Conakry", stars: 2, source: "curated" },
      { name: "Dixinn Hôtel", city: "Conakry", region: "Conakry", stars: 2, source: "curated" },
      { name: "Hôtel Central", city: "Conakry", region: "Conakry", stars: 2, source: "curated" },
      { name: "Auberge de la Paix", city: "Conakry", region: "Conakry", stars: 2, source: "curated" },
      { name: "Hôtel Résidence Bèrè", city: "Conakry", region: "Conakry", stars: 3, source: "curated" },
      { name: "Hotel Landor", city: "Conakry", region: "Conakry", stars: 3, source: "curated" },
      { name: "Residence Helene", city: "Conakry", region: "Conakry", stars: 3, source: "curated" },
      { name: "Hotel Abissa", city: "Conakry", region: "Conakry", stars: 2, source: "curated" },
      { name: "Motel du Port", city: "Conakry", region: "Conakry", stars: 2, source: "curated" },
      { name: "Suite Hotel Almamy", city: "Conakry", region: "Conakry", stars: 3, source: "curated" },
      { name: "Hôtel le Paris", city: "Conakry", region: "Conakry", stars: 3, source: "curated", hasBooking: true },
      { name: "Cités des Affaires", city: "Conakry", region: "Conakry", stars: 2, source: "curated" },
      { name: "Hôtel Téli Bèrè", city: "Conakry", region: "Conakry", stars: 2, source: "curated" },
      { name: "Hôtel la Sève", city: "Kankan", region: "Kankan", stars: 3, source: "curated", hasBooking: true },
      { name: "Hôtel de la Paix Kankan", city: "Kankan", region: "Kankan", stars: 2, source: "curated" },
      { name: "Hôtel Tèma", city: "Kankan", region: "Kankan", stars: 2, source: "curated" },
      { name: "Hôtel le Fil de Fer", city: "Kankan", region: "Kankan", stars: 2, source: "curated" },
      { name: "Résidence Néné", city: "Kankan", region: "Kankan", stars: 2, source: "curated" },
      { name: "Hôtel Balan", city: "Kankan", region: "Kankan", stars: 2, source: "curated" },
      { name: "Auberge de Kankan", city: "Kankan", region: "Kankan", stars: 1, source: "curated" },
      { name: "Hôtel le Village", city: "Nzérékoré", region: "Nzérékoré", stars: 2, source: "curated", hasBooking: true },
      { name: "Hôtel Sankaran", city: "Nzérékoré", region: "Nzérékoré", stars: 2, source: "curated" },
      { name: "Hôtel l'Amitié", city: "Nzérékoré", region: "Nzérékoré", stars: 2, source: "curated" },
      { name: "Hôtel Nimba", city: "Nzérékoré", region: "Nzérékoré", stars: 2, source: "curated" },
      { name: "Résidence Bèrè Nzérékoré", city: "Nzérékoré", region: "Nzérékoré", stars: 2, source: "curated" },
      { name: "Auberge de la Forêt", city: "Nzérékoré", region: "Nzérékoré", stars: 1, source: "curated" },
      { name: "Hôtel le Relais", city: "Kindia", region: "Kindia", stars: 2, source: "curated" },
      { name: "Hôtel le Baobab Kindia", city: "Kindia", region: "Kindia", stars: 2, source: "curated" },
      { name: "Auberge de Kindia", city: "Kindia", region: "Kindia", stars: 1, source: "curated" },
      { name: "Hôtel le Boulbinet", city: "Boké", region: "Boké", stars: 2, source: "curated" },
      { name: "Hôtel le Soumba", city: "Boké", region: "Boké", stars: 2, source: "curated" },
      { name: "Hôtel AlcolA", city: "Kamsar", region: "Boké", stars: 3, source: "curated", hasBooking: true },
      { name: "Résidence Kamsar", city: "Kamsar", region: "Boké", stars: 2, source: "curated" },
      { name: "Hôtel Nabaya", city: "Kamsar", region: "Boké", stars: 2, source: "curated" },
      { name: "Auberge de Sangarédi", city: "Sangarédi", region: "Boké", stars: 1, source: "curated" },
      { name: "Hôtel de Fria", city: "Fria", region: "Boké", stars: 2, source: "curated" },
      { name: "Hôtel la Santé", city: "Labé", region: "Labé", stars: 2, source: "curated" },
      { name: "Hôtel le Fouta", city: "Labé", region: "Labé", stars: 2, source: "curated" },
      { name: "Résidence du Fouta", city: "Labé", region: "Labé", stars: 2, source: "curated" },
      { name: "Auberge de Pita", city: "Pita", region: "Labé", stars: 1, source: "curated" },
      { name: "Hôtel de Dalaba", city: "Dalaba", region: "Labé", stars: 2, source: "curated" },
      { name: "Hôtel le Mali", city: "Mali", region: "Labé", stars: 1, source: "curated" },
      { name: "Hôtel le Douta", city: "Mamou", region: "Mamou", stars: 2, source: "curated" },
      { name: "Hôtel Balimaya", city: "Mamou", region: "Mamou", stars: 2, source: "curated" },
      { name: "Auberge de Mamou", city: "Mamou", region: "Mamou", stars: 1, source: "curated" },
      { name: "Hôtel le Faranah", city: "Faranah", region: "Faranah", stars: 2, source: "curated" },
      { name: "Auberge de Faranah", city: "Faranah", region: "Faranah", stars: 1, source: "curated" },
      { name: "Hôtel de Dabola", city: "Dabola", region: "Faranah", stars: 1, source: "curated" },
      { name: "Hôtel le Kissi", city: "Kissidougou", region: "Nzérékoré", stars: 2, source: "curated" },
      { name: "Hôtel Macenta", city: "Macenta", region: "Nzérékoré", stars: 2, source: "curated" },
      { name: "Hôtel le Guéckédou", city: "Guéckédou", region: "Nzérékoré", stars: 2, source: "curated" },
      { name: "Auberge de Beyla", city: "Beyla", region: "Nzérékoré", stars: 1, source: "curated" },
      { name: "Hôtel Lola", city: "Lola", region: "Nzérékoré", stars: 1, source: "curated" },
      { name: "Hôtel de Siguiri", city: "Siguiri", region: "Kankan", stars: 2, source: "curated" },
      { name: "Hôtel Dubréka", city: "Dubréka", region: "Kindia", stars: 2, source: "curated" },
      { name: "Hôtel Coyah", city: "Coyah", region: "Kindia", stars: 2, source: "curated" },
      { name: "Hôtel Forécariah", city: "Forécariah", region: "Kindia", stars: 1, source: "curated" },
      { name: "Hôtel Boffa", city: "Boffa", region: "Boké", stars: 1, source: "curated" },
      { name: "Hôtel Koundara", city: "Koundara", region: "Boké", stars: 1, source: "curated" },
      { name: "Hôtel Gaoual", city: "Gaoual", region: "Boké", stars: 1, source: "curated" },
      { name: "Hôtel Télimélé", city: "Télimélé", region: "Kindia", stars: 1, source: "curated" },
    ]

    const existing = await db.hotel.findMany({ select: { name: true } })
    const normalizeName = (n: string) => n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').trim()
    const existingNames = new Set(existing.map(h => normalizeName(h.name)))
    let added = 0
    let duplicates = 0

    for (const h of hotelsData) {
      if (existingNames.has(normalizeName(h.name))) { duplicates++; continue }
      await db.hotel.create({ data: { name: h.name, city: h.city, region: h.region, stars: h.stars, source: h.source, hasBooking: h.hasBooking ?? false, statusDigital: h.hasBooking ? 'partial' : 'none', score: (h.hasBooking ? 15 : 0) + (h.stars >= 3 ? 10 : 0), priority: h.hasBooking ? 'warm' : 'cold', pipelineStage: 'nouveau' } })
      existingNames.add(normalizeName(h.name))
      added++
    }

    return NextResponse.json({ success: true, imported: added, duplicates, total: hotelsData.length })
  } catch (error) {
    console.error('[Import Hotels] Error:', error)
    return NextResponse.json({ error: 'Import failed', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
