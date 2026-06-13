import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AI_PROVIDERS, PROVIDER_PRIORITY } from '@/lib/ai-providers';
import { encryptApiKey, decryptApiKey, isEncrypted } from '@/lib/security';
import { checkRateLimit, RATE_LIMITS, getRateLimitHeaders } from '@/lib/rate-limit';

/**
 * Build a safe hint string for an API key.
 * When the stored key is encrypted the raw bytes are IV hex — not the real
 * prefix — so we decrypt first (or fall back to the provider's keyPrefix).
 */
function buildKeyHint(storedKey: string, providerKeyPrefix: string): string {
  if (isEncrypted(storedKey)) {
    // The stored value is encrypted; show the provider's expected prefix
    // or, if we can decrypt, show the real prefix.
    try {
      const realKey = decryptApiKey(storedKey);
      if (realKey.length > 8) {
        return realKey.slice(0, 4) + '••••' + realKey.slice(-4);
      }
      return '••••';
    } catch {
      // Decryption failed — fall back to the known keyPrefix
      return providerKeyPrefix ? providerKeyPrefix + '••••' : '••••';
    }
  }
  // Unencrypted legacy key
  return storedKey.length > 8
    ? storedKey.slice(0, 4) + '••••' + storedKey.slice(-4)
    : '••••';
}

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
        keyHint: saved ? buildKeyHint(saved.apiKey, config.keyPrefix) : null,
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
        keyHint: buildKeyHint(saved.apiKey, providerConfig.keyPrefix),
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
