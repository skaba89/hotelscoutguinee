import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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

export type AIProviderConfig = (typeof AI_PROVIDERS)[keyof typeof AI_PROVIDERS];

export const PROVIDER_PRIORITY = ['groq', 'gemini', 'deepseek', 'openrouter', 'cerebras', 'glm5', 'anthropic'] as const;

export { AI_PROVIDERS };

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

// POST /api/ai/providers — Save a provider API key
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { providerId, apiKey } = body;

    if (!providerId || !apiKey) {
      return NextResponse.json(
        { error: 'providerId and apiKey are required' },
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

    // Optional: validate key prefix if the provider has one
    if (providerConfig.keyPrefix && !apiKey.startsWith(providerConfig.keyPrefix)) {
      return NextResponse.json(
        {
          error: `API key for ${providerConfig.name} should start with "${providerConfig.keyPrefix}"`,
        },
        { status: 400 }
      );
    }

    const saved = await db.aIProvider.upsert({
      where: { providerId },
      update: {
        apiKey,
        name: providerConfig.name,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        providerId,
        name: providerConfig.name,
        apiKey,
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
        keyHint:
          saved.apiKey.length > 8
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
