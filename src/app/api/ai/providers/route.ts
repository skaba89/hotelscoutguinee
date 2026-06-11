import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AI_PROVIDERS, PROVIDER_PRIORITY } from '@/lib/ai-providers';
import { encryptApiKey, isEncrypted } from '@/lib/security';
import { checkRateLimit, RATE_LIMITS, getRateLimitHeaders } from '@/lib/rate-limit';

// GET /api/ai/providers — List all providers with configured status
export async function GET() {
  try {
    const savedProviders = await db.aIProvider.findMany();
    const savedMap = new Map(savedProviders.map((p) => [p.providerId, p]));

    const providers = PROVIDER_PRIORITY.map((key) => {
      const config = AI_PROVIDERS[key];
      const saved = savedMap.get(key);
      return {
        id: config.id,
        name: config.name,
        free: config.free,
        models: config.models,
        defaultModel: config.defaultModel,
        keyPrefix: config.keyPrefix,
        format: config.format,
        configured: !!saved,
        isActive: saved?.isActive ?? false,
        lastUsedAt: saved?.lastUsedAt ?? null,
        // Never expose the full API key to the client
        keyHint: saved
          ? saved.apiKey.length > 8
            ? saved.apiKey.slice(0, 4) + '••••' + saved.apiKey.slice(-4)
            : '••••'
          : null,
      };
    });

    return NextResponse.json({ providers });
  } catch (error) {
    console.error('[AI Providers GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch providers' },
      { status: 500 }
    );
  }
}

// POST /api/ai/providers — Save a provider API key (encrypted)
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 'unknown';
    const rateResult = checkRateLimit(`providers:${clientId}`, RATE_LIMITS.write);
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { providerId, apiKey } = body;

    if (!providerId || !apiKey) {
      return NextResponse.json(
        { error: 'providerId and apiKey are required' },
        { status: 400 }
      );
    }

    if (typeof apiKey !== 'string' || apiKey.length > 500) {
      return NextResponse.json(
        { error: 'Invalid API key format' },
        { status: 400 }
      );
    }

    const providerConfig = AI_PROVIDERS[providerId as keyof typeof AI_PROVIDERS];
    if (!providerConfig) {
      return NextResponse.json(
        { error: `Unknown provider: ${providerId}` },
        { status: 400 }
      );
    }

    // Validate key prefix if the provider has one (fixes M6 — stronger validation)
    if (providerConfig.keyPrefix && !apiKey.startsWith(providerConfig.keyPrefix)) {
      return NextResponse.json(
        { error: `API key for ${providerConfig.name} should start with "${providerConfig.keyPrefix}"` },
        { status: 400 }
      );
    }

    // Encrypt the API key before storing (fixes C2)
    const encryptedKey = isEncrypted(apiKey) ? apiKey : encryptApiKey(apiKey);

    const saved = await db.aIProvider.upsert({
      where: { providerId },
      update: {
        apiKey: encryptedKey,
        name: providerConfig.name,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        providerId,
        name: providerConfig.name,
        apiKey: encryptedKey,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      provider: {
        id: saved.providerId,
        name: saved.name,
        configured: true,
        isActive: saved.isActive,
        keyHint: saved.apiKey.length > 8
          ? saved.apiKey.slice(0, 4) + '••••' + saved.apiKey.slice(-4)
          : '••••',
      },
    });
  } catch (error) {
    console.error('[AI Providers POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save provider' },
      { status: 500 }
    );
  }
}
