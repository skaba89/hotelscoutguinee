import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Run all independent queries in parallel
    const [
      totalHotels,
      hotelsByRegionRaw,
      hotelsByDigitalStatusRaw,
      avgScoreResult,
      pipelineDistributionRaw,
      recentContactsCount,
      totalContacts,
      hotelsWithWebsite,
      hotelsWithPhone,
      hotelsWithEmail,
      priorityDistributionRaw,
    ] = await Promise.all([
      db.hotel.count(),

      db.hotel.groupBy({
        by: ['region'],
        _count: { region: true },
        orderBy: { _count: { region: 'desc' } },
      }),

      db.hotel.groupBy({
        by: ['statusDigital'],
        _count: { statusDigital: true },
        orderBy: { _count: { statusDigital: 'desc' } },
      }),

      db.hotel.aggregate({
        _avg: { score: true },
      }),

      db.hotel.groupBy({
        by: ['pipelineStage'],
        _count: { pipelineStage: true },
        orderBy: { _count: { pipelineStage: 'desc' } },
      }),

      db.contact.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // last 7 days
          },
        },
      }),

      db.contact.count(),

      db.hotel.count({ where: { web: { not: null } } }),

      db.hotel.count({ where: { phone: { not: null } } }),

      db.hotel.count({ where: { email: { not: null } } }),

      db.hotel.groupBy({
        by: ['priority'],
        _count: { priority: true },
        orderBy: { _count: { priority: 'desc' } },
      }),
    ])

    // Transform raw groupBy results into clean objects
    const byRegion: Record<string, number> = {}
    for (const row of hotelsByRegionRaw) {
      byRegion[row.region] = row._count.region
    }

    const byDigitalStatus: Record<string, number> = {}
    for (const row of hotelsByDigitalStatusRaw) {
      byDigitalStatus[row.statusDigital] = row._count.statusDigital
    }

    const pipelineDistribution: Record<string, number> = {}
    for (const row of pipelineDistributionRaw) {
      pipelineDistribution[row.pipelineStage] = row._count.pipelineStage
    }

    const priorityDistribution: Record<string, number> = {}
    for (const row of priorityDistributionRaw) {
      priorityDistribution[row.priority] = row._count.priority
    }

    const averageScore = avgScoreResult._avg.score
      ? Math.round(avgScoreResult._avg.score * 100) / 100
      : 0

    const digitalReadiness =
      totalHotels > 0
        ? Math.round(
            ((byDigitalStatus['ok'] ?? 0) / totalHotels) * 100
          )
        : 0

    return NextResponse.json({
      totalHotels,
      byRegion,
      byDigitalStatus,
      averageScore,
      pipelineDistribution,
      priorityDistribution,
      recentContactsCount,
      totalContacts,
      digitalReadiness,
      hotelsWithWebsite,
      hotelsWithPhone,
      hotelsWithEmail,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Stats GET] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}
