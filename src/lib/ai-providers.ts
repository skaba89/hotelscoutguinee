// HotelScout Guinea — Shared AI Provider Configuration
// Single source of truth for all AI provider settings (used by chat + providers routes)

export const AI_PROVIDERS = {
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

export type ProviderKey = keyof typeof AI_PROVIDERS;
export type AIProviderConfig = (typeof AI_PROVIDERS)[ProviderKey];

export const PROVIDER_PRIORITY: ProviderKey[] = ['groq', 'gemini', 'deepseek', 'openrouter', 'cerebras', 'glm5', 'anthropic'];
