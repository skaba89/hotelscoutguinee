import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// DELETE /api/ai/providers/[providerId] — Remove a provider's API key
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ providerId: string }> }
) {
  try {
    const { providerId } = await params;

    if (!providerId) {
      return NextResponse.json(
        { error: 'providerId is required' },
        { status: 400 }
      );
    }

    const existing = await db.aIProvider.findUnique({
      where: { providerId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: `Provider "${providerId}" not found` },
        { status: 404 }
      );
    }

    await db.aIProvider.delete({
      where: { providerId },
    });

    return NextResponse.json({
      success: true,
      message: `Provider "${providerId}" removed`,
    });
  } catch (error) {
    console.error('[AI Provider DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete provider' },
      { status: 500 }
    );
  }
}
