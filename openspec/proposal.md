# viral-filter — SDD Proposal

## Project Overview
Create a **local clone of viralyt.ai** for YouTube content creators. The app runs entirely on `localhost` as a Next.js web application, leveraging affordable AI and free YouTube data to replace viralyt.ai's paid subscription.

## Target Users
- YouTube content creators seeking viral ideas
- Creators analyzing their niche and competitors
- Channels optimizing titles, descriptions, and hooks

## Core Value Proposition
- **Zero subscription cost** — replaces viralyt.ai's recurring fee
- **Local-first** — all data stays on the user's machine
- **AI-powered** — uses OpenCode Go ($10/month) for all generative tasks

---

## Tech Stack Implications

### 1. Frontend — Next.js (Localhost)
| Aspect | Implication |
|--------|-------------|
| **Runtime** | Runs on `localhost` only. No deployment, no auth, no multi-user. |
| **State** | Can use localStorage or a lightweight local DB (SQLite via Prisma or lowdb) for caching. |
| **API Routes** | Next.js API routes will proxy calls to YouTube Data API and OpenCode Go, keeping secrets server-side. |
| **No SSR needed** | Since it's local, we can use client-side rendering freely; SSR adds complexity with no benefit. |
| **Build** | `next dev` is sufficient; no production build pipeline needed. |

**Key decisions:**
- Use Next.js App Router (recommended) or Pages Router (simpler for local-only).
- Store API keys in `.env.local` (never commit).
- Use React Server Components where they reduce boilerplate, but don't over-engineer.

---

### 2. AI — OpenCode Go ($10/month)
| Aspect | Implication |
|--------|-------------|
| **API style** | OpenAI-compatible (`/v1/chat/completions`). Existing `openai` SDK works with a custom baseURL. |
| **Models** | Qwen3.7, DeepSeek V4, GLM-5, Kimi K2, MiniMax M3 — all accessible via the same endpoint. |
| **Cost** | Flat $10/month is predictable. No per-token anxiety. |
| **Latency** | May vary by model; benchmark and pick the fastest/cheapest for each task. |

**Key decisions:**
- Wrap AI calls in a single service module (`lib/ai.ts`) with retry logic and timeout handling.
- Support model switching per feature (e.g., fast model for keyword extraction, strong model for competitor analysis).
- Cache AI responses aggressively to minimize API calls.
- Implement streaming for long responses (e.g., AI Assistant) to improve perceived performance.

**Risk:**
- OpenCode Go is a smaller provider. If the service becomes unavailable, the app stops working. Mitigation: the OpenAI-compatible API means we can fall back to OpenRouter or direct OpenAI with minimal code changes.

---

### 3. YouTube Data API v3 (Free Tier)
| Aspect | Implication |
|--------|-------------|
| **Quota** | 10,000 units/day. Search = 100 units, videos.list = 1 unit, channels.list = 1 unit. |
| **Rate limiting** | 1,000 requests per 100 seconds. |
| **Data freshness** | Real-time but not instant. Trend detection requires polling over time. |

**Quota math (daily budget):**
| Feature | Units per call | Calls/day | Total units |
|---------|---------------|-----------|-------------|
| Search (idea gen) | 100 | 20 | 2,000 |
| Video details | 1 | 200 | 200 |
| Channel details | 1 | 100 | 100 |
| Trend monitoring | 100 | 50 | 5,000 |
| **Buffer** | — | — | ~2,700 |
| **Total** | — | — | **~10,000** |

**Key decisions:**
- Implement a **quota tracker** in the UI showing units used today.
- Cache all API responses (videos, channels, search results) to avoid re-fetching.
- Use **batch requests** where possible (`videos?part=snippet,statistics&id=...,...,...`).
- Store historical data locally so trend analysis doesn't require daily re-fetching.
- For Niche Analysis (400K+ channels), we cannot fetch all channels daily. Instead:
  - Use a curated subset or user-defined watchlist.
  - Fetch trending/popular channels only.
  - Use search + trending endpoints to surface new channels, not exhaustive monitoring.

---

## Feature Breakdown & SDD Phases

### Phase 1: Foundation (Init)
- [x] Project scaffolding
- [x] Tech stack decisions
- [ ] Next.js setup with local dev environment
- [ ] YouTube API key setup & quota monitor
- [ ] OpenCode Go integration wrapper

### Phase 2: Idea Generator
- AI-powered topic suggestions based on niche + filters
- Uses: OpenCode Go + YouTube Search API
- **Estimated complexity**: Medium

### Phase 3: Keyword Research
- Trending keyword extraction, search volume proxy (via YouTube API popularity)
- Uses: OpenCode Go + YouTube Search API
- **Estimated complexity**: Low

### Phase 4: Niche Analysis
- Trend detection across a channel watchlist
- Uses: YouTube Data API + local caching
- **Estimated complexity**: High (due to quota constraints)

### Phase 5: Competitor Analysis
- Compare channel stats, analyze thumbnails/titles with AI
- Uses: OpenCode Go + YouTube Channels/Videos API
- **Estimated complexity**: Medium

### Phase 6: AI Assistant
- Content optimization (titles, descriptions, hooks)
- Uses: OpenCode Go only
- **Estimated complexity**: Low

### Phase 7: Thumbnail Generator (Deferred)
- AI image generation for thumbnails
- **Status**: Not in scope for MVP

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| YouTube API quota exhausted | High | Quota tracker, aggressive caching, batch requests |
| OpenCode Go downtime | High | OpenAI-compatible fallback; abstract AI provider |
| Local data loss | Medium | Export/import JSON backups; optional cloud sync (future) |
| YouTube API terms of service | Medium | Read-only operations; no scraping; respect rate limits |
| Feature scope creep | Medium | Strict MVP cutoff; defer Thumbnail Generator |

---

## Assumptions
1. Users are technical enough to run `npm run dev` and set `.env.local`.
2. YouTube API free tier is sufficient for daily usage (not heavy enterprise use).
3. OpenCode Go's $10/month plan is sustainable and reliable for the project's lifetime.
4. No user authentication needed — single-user local app.
5. Data is not sensitive enough to require encryption at rest (local machine).

---

## Next Steps
1. ✅ **Init Phase** — Complete (this document)
2. **Proposal Phase** — Gather user feedback on feature priority, confirm model choices
3. **Design Phase** — UI mockups, database schema, API route design
4. **Apply Phase** — Implement features incrementally
5. **Verify Phase** — Test against quota, validate AI output quality

---

*Generated by SDD Init Executor — 2026-06-07*
