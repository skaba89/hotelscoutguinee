import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ---------------------------------------------------------------------------
// Provider configuration (mirrors /api/ai/providers)
// ---------------------------------------------------------------------------

const AI_PROVIDERS = {
  groq: {
    id: 'groq',
    name: 'Groq',
    free: true,
    models: 'llama-3.3-70b-versatile',
    defaultModel: 'llama-3.3-70b-versatile',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    keyPrefix: 'gsk_',
    format: 'openai' as const,
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    free: true,
    models: 'gemini-2.0-flash',
    defaultModel: 'gemini-2.0-flash',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/',
    keyPrefix: 'AIza',
    format: 'gemini' as const,
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    free: true,
    models: 'meta-llama/llama-3.3-70b-instruct:free',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    keyPrefix: 'sk-or-',
    format: 'openai' as const,
  },
  glm5: {
    id: 'glm5',
    name: 'GLM-5 (ZhipuAI)',
    free: true,
    models: 'glm-4-flash',
    defaultModel: 'glm-4-flash',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    keyPrefix: '',
    format: 'openai' as const,
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    free: true,
    models: 'deepseek-chat',
    defaultModel: 'deepseek-chat',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    keyPrefix: 'sk-',
    format: 'openai' as const,
  },
  cerebras: {
    id: 'cerebras',
    name: 'Cerebras',
    free: true,
    models: 'llama-4-scout-17b-16e-instruct',
    defaultModel: 'llama-4-scout-17b-16e-instruct',
    endpoint: 'https://api.cerebras.ai/v1/chat/completions',
    keyPrefix: 'csk-',
    format: 'openai' as const,
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    free: false,
    models: 'claude-sonnet-4-20250514',
    defaultModel: 'claude-sonnet-4-20250514',
    endpoint: 'https://api.anthropic.com/v1/messages',
    keyPrefix: 'sk-ant-',
    format: 'anthropic' as const,
  },
} as const;

type ProviderKey = keyof typeof AI_PROVIDERS;

const PROVIDER_PRIORITY: ProviderKey[] = ['groq', 'gemini', 'deepseek', 'openrouter', 'cerebras', 'glm5', 'anthropic'];

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
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`OpenAI-format API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No content in OpenAI-format response');
  }
  return content;
}

async function callGeminiFormat(
  endpoint: string,
  apiKey: string,
  model: string,
  prompt: string
): Promise<string> {
  // Gemini endpoint format: {base}/MODEL:generateContent?key=API_KEY
  const url = `${endpoint}${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) {
    throw new Error('No content in Gemini response');
  }
  return content;
}

async function callAnthropicFormat(
  endpoint: string,
  apiKey: string,
  model: string,
  prompt: string
): Promise<string> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data?.content?.[0]?.text;
  if (!content) {
    throw new Error('No content in Anthropic response');
  }
  return content;
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
      return callOpenAIFormat(
        config.endpoint,
        apiKey,
        config.defaultModel,
        prompt,
        extraHeaders
      );
    }
    case 'gemini':
      return callGeminiFormat(
        config.endpoint,
        apiKey,
        config.defaultModel,
        prompt
      );
    case 'anthropic':
      return callAnthropicFormat(
        config.endpoint,
        apiKey,
        config.defaultModel,
        prompt
      );
    default:
      throw new Error(`Unknown format: ${config.format}`);
  }
}

// ---------------------------------------------------------------------------
// POST /api/ai/chat — Multi-provider LLM chat with automatic fallback
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { prompt, hotelId, preferredProvider } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'A non-empty prompt is required' },
        { status: 400 }
      );
    }

    // Fetch all configured providers from the database
    const savedProviders = await db.aIProvider.findMany({
      where: { isActive: true },
    });

    if (savedProviders.length === 0) {
      return NextResponse.json(
        { error: 'No AI providers configured. Please add at least one API key.' },
        { status: 400 }
      );
    }

    const providerKeyMap = new Map(
      savedProviders.map((p) => [p.providerId, p])
    );

    // Build the ordered list of providers to try
    let orderedKeys: ProviderKey[];

    if (preferredProvider && providerKeyMap.has(preferredProvider)) {
      // Put the preferred provider first, then the rest in priority order
      const preferred = preferredProvider as ProviderKey;
      orderedKeys = [
        preferred,
        ...PROVIDER_PRIORITY.filter(
          (k) => k !== preferred && providerKeyMap.has(k)
        ),
      ];
    } else {
      // Use default priority order, only including configured providers
      orderedKeys = PROVIDER_PRIORITY.filter((k) => providerKeyMap.has(k));
    }

    if (orderedKeys.length === 0) {
      return NextResponse.json(
        { error: 'No active AI providers available.' },
        { status: 400 }
      );
    }

    // Try each provider in order with fallback
    const errors: { provider: string; error: string }[] = [];
    let result: ChatResponse | null = null;

    for (const providerKey of orderedKeys) {
      const providerRecord = providerKeyMap.get(providerKey)!;
      const config = AI_PROVIDERS[providerKey];

      try {
        console.log(
          `[AI Chat] Trying provider: ${config.name} (${config.id})`
        );

        const text = await callProvider(
          providerKey,
          providerRecord.apiKey,
          prompt
        );

        // Update lastUsedAt
        await db.aIProvider.update({
          where: { providerId: providerKey },
          data: { lastUsedAt: new Date() },
        }).catch(() => {
          // Non-critical: don't fail the request if this update fails
        });

        result = {
          text,
          provider: config.id,
          providerName: config.name,
        };
        break; // Success — stop trying
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Unknown error';
        console.warn(
          `[AI Chat] Provider ${config.name} failed: ${errorMsg}`
        );
        errors.push({ provider: config.id, error: errorMsg });
        continue; // Try the next provider
      }
    }

    if (!result) {
      return NextResponse.json(
        {
          error: 'All AI providers failed',
          details: errors,
        },
        { status: 502 }
      );
    }

    // Store the AI analysis in the database if hotelId is provided
    if (hotelId) {
      try {
        await db.aIAnalysis.create({
          data: {
            hotelId,
            providerId: result.provider,
            prompt,
            response: result.text,
          },
        });
      } catch (dbError) {
        console.error('[AI Chat] Failed to save analysis:', dbError);
        // Non-critical: still return the result
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[AI Chat POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
