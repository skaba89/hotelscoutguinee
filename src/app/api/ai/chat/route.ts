import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AI_PROVIDERS, PROVIDER_PRIORITY, ProviderKey } from '@/lib/ai-providers';
import { decryptApiKey } from '@/lib/security';
import { checkRateLimit, RATE_LIMITS, getRateLimitHeaders } from '@/lib/rate-limit';

// ---------------------------------------------------------------------------
// Chat request / response types
// ---------------------------------------------------------------------------

interface ChatRequest {
  prompt: string;
  hotelId?: string;
  preferredProvider?: string;
}

interface ChatResponse {
  text: string;
  provider: string;
  providerName: string;
}

// ---------------------------------------------------------------------------
// Provider-specific API callers
// ---------------------------------------------------------------------------

async function callOpenAIFormat(
  endpoint: string,
  apiKey: string,
  model: string,
  prompt: string,
  extraHeaders: Record<string, string> = {}
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...extraHeaders,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2048,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`OpenAI-format API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content in OpenAI-format response');
    return content;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callGeminiFormat(
  endpoint: string,
  apiKey: string,
  model: string,
  prompt: string
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    // Use header-based auth instead of query param (fixes C3: API key in URL)
    const url = `${endpoint}${model}:generateContent`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,  // Header-based auth instead of ?key=
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error('No content in Gemini response');
    return content;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callAnthropicFormat(
  endpoint: string,
  apiKey: string,
  model: string,
  prompt: string
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        // Removed 'anthropic-dangerous-direct-browser-access' (fixes M9)
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data?.content?.[0]?.text;
    if (!content) throw new Error('No content in Anthropic response');
    return content;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------------------------------------------------------------------------
// Unified caller that dispatches to the correct format
// ---------------------------------------------------------------------------

async function callProvider(
  providerKey: ProviderKey,
  apiKey: string,
  prompt: string
): Promise<string> {
  const config = AI_PROVIDERS[providerKey];

  switch (config.format) {
    case 'openai': {
      const extraHeaders: Record<string, string> = {};
      if (providerKey === 'openrouter') {
        extraHeaders['HTTP-Referer'] = 'https://hotelscout-guinea.app';
        extraHeaders['X-Title'] = 'HotelScout Guinea';
      }
      return callOpenAIFormat(config.endpoint, apiKey, config.defaultModel, prompt, extraHeaders);
    }
    case 'gemini':
      return callGeminiFormat(config.endpoint, apiKey, config.defaultModel, prompt);
    case 'anthropic':
      return callAnthropicFormat(config.endpoint, apiKey, config.defaultModel, prompt);
  }
}

// ---------------------------------------------------------------------------
// POST /api/ai/chat — Multi-provider LLM chat with automatic fallback
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // Rate limiting (fixes H5)
    const clientId = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateResult = checkRateLimit(`ai:${clientId}`, RATE_LIMITS.ai);
    const rateHeaders = getRateLimitHeaders(rateResult, RATE_LIMITS.ai);

    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429, headers: rateHeaders }
      );
    }

    const body: ChatRequest = await request.json();
    const { prompt, hotelId, preferredProvider } = body;

    // Input validation (fixes M8 - body size)
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'A non-empty prompt is required' },
        { status: 400, headers: rateHeaders }
      );
    }

    if (prompt.length > 10000) {
      return NextResponse.json(
        { error: 'Prompt too long (max 10000 characters)' },
        { status: 400, headers: rateHeaders }
      );
    }

    // Fetch all configured providers from the database
    const savedProviders = await db.aIProvider.findMany({
      where: { isActive: true },
    });

    if (savedProviders.length === 0) {
      return NextResponse.json(
        { error: 'No AI providers configured. Please add at least one API key.' },
        { status: 400, headers: rateHeaders }
      );
    }

    const providerKeyMap = new Map(
      savedProviders.map((p) => [p.providerId, p])
    );

    // Build the ordered list of providers to try
    let orderedKeys: ProviderKey[];

    if (preferredProvider && providerKeyMap.has(preferredProvider)) {
      const preferred = preferredProvider as ProviderKey;
      orderedKeys = [
        preferred,
        ...PROVIDER_PRIORITY.filter((k) => k !== preferred && providerKeyMap.has(k)),
      ];
    } else {
      orderedKeys = PROVIDER_PRIORITY.filter((k) => providerKeyMap.has(k));
    }

    if (orderedKeys.length === 0) {
      return NextResponse.json(
        { error: 'No active AI providers available.' },
        { status: 400, headers: rateHeaders }
      );
    }

    // Try each provider in order with fallback
    const errors: { provider: string; error: string }[] = [];
    let result: ChatResponse | null = null;

    for (const providerKey of orderedKeys) {
      const providerRecord = providerKeyMap.get(providerKey)!;
      const config = AI_PROVIDERS[providerKey];

      try {
        // Decrypt API key if encrypted (fixes C2)
        const apiKey = decryptApiKey(providerRecord.apiKey);

        const text = await callProvider(providerKey, apiKey, prompt);

        // Update lastUsedAt (non-critical)
        await db.aIProvider.update({
          where: { providerId: providerKey },
          data: { lastUsedAt: new Date() },
        }).catch(() => {});

        result = { text, provider: config.id, providerName: config.name };
        break;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.warn(`[AI Chat] Provider ${config.name} failed: ${errorMsg}`);
        errors.push({ provider: config.id, error: errorMsg });
        continue;
      }
    }

    if (!result) {
      return NextResponse.json(
        { error: 'All AI providers failed', details: errors.map(e => e.provider) },
        { status: 502, headers: rateHeaders }
      );
    }

    // Store the AI analysis if hotelId is provided
    if (hotelId) {
      try {
        await db.aIAnalysis.create({
          data: { hotelId, providerId: result.provider, prompt, response: result.text },
        });
      } catch {
        // Non-critical
      }
    }

    return NextResponse.json(result, { headers: rateHeaders });
  } catch (error) {
    console.error('[AI Chat POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
