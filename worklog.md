---
Task ID: 1
Agent: Main Agent
Task: Implement multi-provider IA system (Groq, Gemini, OpenRouter, GLM-5, Claude) with free tier priority

Work Log:
- Explored the existing project structure (single HTML file, ~4454 lines, HotelScout Guinea v4)
- Identified the current AI integration (single Anthropic Claude provider only)
- Replaced the single-provider system with a comprehensive multi-provider engine
- Added 5 providers: Groq (free), Google Gemini (free), OpenRouter (free), GLM-5/ZhipuAI (free), Anthropic Claude (paid)
- Implemented fallback mechanism: tries active provider first, then falls through all configured providers
- Updated IA page: replaced single API key section with provider pills selector
- Updated Settings page: replaced single API key card with full multi-provider configuration panel
- Added CSS for provider cards, pills, and badges
- Implemented provider key management (save, remove, migration from old format)
- Updated version from v4 to v5
- Backward compatibility: old `hsg_api_key` is auto-migrated to new multi-provider format

Stage Summary:
- File updated: /home/z/my-project/download/hotelscout-guinea-v4.html (now v5)
- File created: /home/z/my-project/download/hotelscout-guinea-v5.html (copy with v5 name)
- 5 AI providers integrated with priority order: Groq > Gemini > OpenRouter > GLM-5 > Claude
- Free providers are prioritized first
- Auto-fallback: if active provider fails, automatically tries the next configured one
- Provider keys stored in localStorage as JSON (`hsg_provider_keys`)
- Active provider stored as `hsg_active_provider`
