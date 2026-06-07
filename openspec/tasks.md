# Implementation Tasks — viral-filter

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 2500–3500 (full stack from scratch) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 → PR 5 → PR 6 → PR 7 → PR 8 |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

---

## Delivery Notes

- **Strict TDD is enabled**: Every service, utility, and API route follows RED → GREEN → TRIANGULATE → REFACTOR.
- Each PR targets **≤ 400 changed lines** (additions + deletions).
- All tasks are grouped into **8 PRs** stacked to main.
- Tasks marked `[P]` can be parallelized within the same PR session.

---

## PR 1: Project Foundation

> Goal: Scaffold Next.js app, Prisma schema, environment, and base config.
> Estimated lines: ~300

### Phase 1: Foundation

- [x] **T1.1**: Initialize Next.js 16+ project with App Router, TypeScript, Tailwind CSS
  - Files: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
  - Effort: medium
  - Dependencies: none

- [x] **T1.2**: Install and configure shadcn/ui
  - Files: `components.json`, `components/ui/*` (button, input, card, badge, dialog, tabs, select, switch, slider, separator, tooltip, progress, collapsible, dropdown-menu)
  - Effort: small
  - Dependencies: T1.1

- [x] **T1.3**: Set up Prisma with SQLite schema
  - Files: `prisma/schema.prisma`, `lib/db.ts` (Prisma client singleton)
  - Models: `VideoCache`, `ChannelWatchlist`, `SearchHistory`, `QuotaUsage`, `TrendSnapshot` (per design.md)
  - Effort: medium
  - Dependencies: T1.1

- [x] **T1.4**: Define TypeScript types shared across the app
  - Files: `types/index.ts` (Video, Channel, SearchFilters, AnalysisRequest, TrendData, QuotaData)
  - Effort: small
  - Dependencies: T1.3

- [x] **T1.5**: Set up environment variables and validation
  - Files: `.env.example`, `.env.local`, `lib/env.ts` (runtime env validation)
  - Effort: small
  - Dependencies: T1.1

- [x] **T1.6**: [P] Write tests for Prisma schema integrity and env validation
  - Files: `__tests__/schema.test.ts`, `__tests__/env.test.ts`
  - Effort: small
  - Dependencies: T1.3, T1.5

---

## PR 2: Core Services (YouTube API + Quota)

> Goal: YouTube Data API v3 wrapper, quota tracker, and caching layer with tests.
> Estimated lines: ~380

### Phase 1: Foundation (continued)

- [x] **T2.1**: RED — Write tests for YouTube API service (search, videos.getById, channels.list)
  - Files: `__tests__/services/youtube.test.ts`
  - Effort: medium
  - Dependencies: T1.4

- [x] **T2.2**: GREEN → TRIANGULATE → REFACTOR — Implement YouTube API service
  - Files: `lib/services/youtube.ts`
  - Methods: `search()`, `getVideos()`, `getChannel()`, `getChannelVideos()`, `getTrending()`
  - Includes: request batching (max 50 IDs), rate-limit awareness, error handling
  - Effort: large (split across RED/GREEN/REFACTOR)
  - Dependencies: T2.1, T1.4

- [x] **T2.3**: RED — Write tests for quota tracker service
  - Files: `__tests__/services/quota.test.ts`
  - Covers: increment, check limits, soft limit (80%), hard limit (95%), reset
  - Effort: small
  - Dependencies: T1.3

- [x] **T2.4**: GREEN → REFACTOR — Implement quota tracker service
  - Files: `lib/services/quota.ts`
  - Methods: `increment()`, `getStatus()`, `canMakeRequest()`, `resetDaily()`
  - Persistence: reads/writes `QuotaUsage` model
  - Effort: medium
  - Dependencies: T2.3, T1.3

- [x] **T2.5**: RED — Write tests for cache service (video, search, channel)
  - Files: `__tests__/services/cache.test.ts`
  - Covers: cache hit/miss, TTL expiry (24h video, 6h channel, 1h search), search hash key
  - Effort: small
  - Dependencies: T1.3, T1.4

- [x] **T2.6**: GREEN → REFACTOR — Implement cache service
  - Files: `lib/services/cache.ts`
  - Methods: `getVideo()`, `setVideo()`, `getSearch()`, `setSearch()`, `getChannel()`, `setChannel()`
  - Uses `VideoCache` model for persistence
  - Effort: medium
  - Dependencies: T2.5, T2.2

---

## PR 3: Search API + Basic Search UI

> Goal: `/api/search` endpoint with caching + quota integration, and frontend search UI with filters.
> Estimated lines: ~350

### Phase 1: Foundation (continued)

- [x] **T3.1**: RED — Write tests for `/api/search` route
  - Files: `__tests__/api/search.test.ts`
  - Covers: cache hit, cache miss → YouTube fetch, quota check, filter application, pagination
  - Effort: medium
  - Dependencies: T2.2, T2.4, T2.6

- [x] **T3.2**: GREEN → REFACTOR — Implement `/api/search` (GET/POST)
  - Files: `app/api/search/route.ts`
  - Logic: check cache → if miss, call YouTube → cache result → increment quota → return
  - Effort: medium
  - Dependencies: T3.1

- [x] **T3.3**: [P] Set up Zustand store for app state
  - Files: `lib/store.ts` (search state, filters, results, loading states)
  - Effort: small
  - Dependencies: T1.4

- [x] **T3.4**: RED — Write tests for `FilterPanel` component
  - Files: `__tests__/components/FilterPanel.test.tsx`
  - Covers: filter state changes, collapsed/expanded, form submission
  - Effort: small
  - Dependencies: T1.2

- [x] **T3.5**: GREEN → REFACTOR — Implement `FilterPanel` component
  - Files: `components/FilterPanel.tsx`
  - Filters: category, country, language, date range, min views, min likes, sort by
  - Effort: medium
  - Dependencies: T3.4, T1.2

- [x] **T3.6**: [P] RED — Write tests for `SearchBar` component
  - Files: `__tests__/components/SearchBar.test.tsx`
  - Covers: input, AI toggle, loading state, search submission
  - Effort: small
  - Dependencies: T1.2

- [x] **T3.7**: [P] GREEN → REFACTOR — Implement `SearchBar` component
  - Files: `components/SearchBar.tsx`
  - Effort: small
  - Dependencies: T3.6, T3.3

- [x] **T3.8**: [P] Implement `VideoCard` component
  - Files: `components/VideoCard.tsx`
  - States: default, hover, selected, analyzed
  - Effort: small
  - Dependencies: T1.2, T1.4

- [x] **T3.9**: Assemble dashboard page (`/`) with search + filters + results grid
  - Files: `app/page.tsx`, `components/ResultsGrid.tsx`
  - Effort: medium
  - Dependencies: T3.2, T3.3, T3.5, T3.7, T3.8

---

## PR 4: AI Integration (OpenCode Go + Streaming)

> Goal: OpenCode Go streaming wrapper, `/api/analyze` SSE endpoint, AI output caching.
> Estimated lines: ~350

### Phase 2: AI Integration

- [ ] **T4.1**: RED — Write tests for OpenCode Go client wrapper
  - Files: `__tests__/services/aiclient.test.ts`
  - Covers: streaming SSE, non-streaming fallback, error handling, model selection
  - Effort: medium
  - Dependencies: T1.4, T1.5

- [ ] **T4.2**: GREEN → REFACTOR — Implement OpenCode Go client wrapper
  - Files: `lib/services/aiclient.ts`
  - Methods: `streamChat()`, `chat()`, available models list
  - OpenAI-compatible endpoint: `https://opencode.ai/zen/go/v1/chat/completions`
  - Models: qwen3.7, deepseek-v4, glm-5, kimi-k2, minimax-m3
  - Effort: medium
  - Dependencies: T4.1

- [ ] **T4.3**: RED — Write tests for AI prompt builder
  - Files: `__tests__/services/prompts.test.ts`
  - Covers: idea, keyword, competitor, optimize prompt templates
  - Effort: small
  - Dependencies: T1.4

- [ ] **T4.4**: GREEN → REFACTOR — Implement AI prompt builder
  - Files: `lib/services/prompts.ts`
  - Templates for each analysis type with video data injection
  - Effort: medium
  - Dependencies: T4.3

- [ ] **T4.5**: RED — Write tests for `/api/analyze` SSE route
  - Files: `__tests__/api/analyze.test.ts`
  - Covers: SSE chunk format, done event, error event, quota check, cache hit
  - Effort: medium
  - Dependencies: T4.2, T4.4, T2.4

- [ ] **T4.6**: GREEN → REFACTOR — Implement `/api/analyze` POST route (SSE)
  - Files: `app/api/analyze/route.ts`
  - Request: `{ type, data, model?, outputFormat? }`
  - Response: SSE stream with `{ type: "chunk" }` and `{ type: "done", result }`
  - Async cache write on completion
  - Effort: large (split across subtasks if needed)
  - Dependencies: T4.5, T2.6

- [ ] **T4.7**: [P] Implement AI cache helper (analysis result caching with content hash)
  - Files: `lib/services/aiCache.ts`
  - TTL: 7 days, hash-based dedup
  - Effort: small
  - Dependencies: T1.3

---

## PR 5: AI UI + Analysis Features

> Goal: AI streaming display, assistant modal, idea generator, keyword extraction UI.
> Estimated lines: ~350

### Phase 2: AI Integration (continued)

- [ ] **T5.1**: RED — Write tests for `AIStreamOutput` component
  - Files: `__tests__/components/AIStreamOutput.test.tsx`
  - Covers: idle, streaming (chunk rendering), complete, error states, text/JSON toggle
  - Effort: medium
  - Dependencies: T1.2

- [ ] **T5.2**: GREEN → REFACTOR — Implement `AIStreamOutput` component
  - Files: `components/AIStreamOutput.tsx`
  - SSE connection management, chunked display, copy-to-clipboard
  - Effort: medium
  - Dependencies: T5.1

- [ ] **T5.3**: [P] Implement `OutputFormatToggle` component
  - Files: `components/OutputFormatToggle.tsx`
  - Effort: small
  - Dependencies: T1.2

- [ ] **T5.4**: [P] Implement `QuotaIndicator` component
  - Files: `components/QuotaIndicator.tsx`
  - States: green (<50%), yellow (50-80%), red (>80%)
  - Effort: small
  - Dependencies: T1.2, T2.4

- [ ] **T5.5**: Implement `/api/quota` GET route
  - Files: `app/api/quota/route.ts`
  - Response: `{ daily: { used, limit, remaining, resetAt }, weekly: { used, trend } }`
  - Effort: small
  - Dependencies: T2.4

- [ ] **T5.6**: Assemble AI Assistant modal/panel
  - Files: `components/AIAssistantPanel.tsx`
  - Analysis type selector, input area, streaming output, format toggle
  - Effort: medium
  - Dependencies: T5.2, T5.3, T4.4

- [ ] **T5.7**: Integrate AI Assistant into dashboard page
  - Files: `app/page.tsx` (update), `components/AIAssistantPanel.tsx` (update)
  - Collapsible panel, video selection for analysis context
  - Effort: medium
  - Dependencies: T3.9, T5.6, T5.4

- [ ] **T5.8**: Wire up Idea Generator flow (select videos → analyze → display)
  - Files: `lib/store.ts` (update), `components/AIAssistantPanel.tsx` (update)
  - Effort: small
  - Dependencies: T5.7

- [ ] **T5.9**: Wire up Keyword Extraction flow
  - Files: `components/AIAssistantPanel.tsx` (update)
  - Effort: small
  - Dependencies: T5.8

---

## PR 6: Channel Watchlist

> Goal: Watchlist CRUD, channel detail API, watchlist UI, background sync logic.
> Estimated lines: ~380

### Phase 3: Analysis

- [ ] **T6.1**: RED — Write tests for `/api/channels/[id]` route
  - Files: `__tests__/api/channels.test.ts`
  - Covers: cache hit, cache miss, watchlist channel stats, recent videos
  - Effort: medium
  - Dependencies: T2.2, T2.6

- [ ] **T6.2**: GREEN → REFACTOR — Implement `/api/channels/[id]` GET route
  - Files: `app/api/channels/[id]/route.ts`
  - Response: channel info, stats (avgViews, avgLikes, totalVideos), recentVideos
  - Effort: medium
  - Dependencies: T6.1

- [ ] **T6.3**: RED — Write tests for `/api/channels` route (watchlist CRUD)
  - Files: `__tests__/api/channels-list.test.ts`
  - Covers: GET list, POST add, DELETE remove
  - Effort: small
  - Dependencies: T1.3

- [ ] **T6.4**: GREEN → REFACTOR — Implement `/api/channels` route (watchlist CRUD)
  - Files: `app/api/channels/route.ts`
  - GET: list watchlist, POST: add channel (fetch from YouTube), DELETE: remove
  - Effort: medium
  - Dependencies: T6.3

- [ ] **T6.5**: [P] Implement `ChannelCard` component
  - Files: `components/ChannelCard.tsx`
  - States: default, hover, analyzing
  - Effort: small
  - Dependencies: T1.2, T1.4

- [ ] **T6.6**: [P] Implement `WatchlistPanel` component (sidebar)
  - Files: `components/WatchlistPanel.tsx`
  - Add channel, list channels, remove, last analyzed timestamp
  - Effort: medium
  - Dependencies: T6.5, T1.2

- [ ] **T6.7**: Build `/watchlist` page
  - Files: `app/watchlist/page.tsx`
  - Full watchlist management view with channel details
  - Effort: medium
  - Dependencies: T6.2, T6.4, T6.6

- [ ] **T6.8**: Implement watchlist background sync utility
  - Files: `lib/services/watchlistSync.ts`
  - Smart polling: only fetch new videos since lastAnalyzed
  - Update `lastAnalyzed` on `ChannelWatchlist`
  - Effort: medium
  - Dependencies: T2.2, T1.3

---

## PR 7: Trending + Niche Analysis

> Goal: `/api/trending` endpoint, trend snapshots, `/trends` page with charts.
> Estimated lines: ~350

### Phase 3: Analysis (continued)

- [ ] **T7.1**: RED — Write tests for `/api/trending` route
  - Files: `__tests__/api/trending.test.ts`
  - Covers: category + country + period params, emerging/stable/declining classification, keyword extraction
  - Effort: medium
  - Dependencies: T2.2, T2.6

- [ ] **T7.2**: GREEN → REFACTOR — Implement `/api/trending` GET route
  - Files: `app/api/trending/route.ts`
  - Query params: category, country, period (24h|7d|30d)
  - Response: trends (emerging/stable/declining), keywords, channels
  - Saves `TrendSnapshot` on each call
  - Effort: medium
  - Dependencies: T7.1

- [ ] **T7.3**: [P] Implement `TrendChart` component
  - Files: `components/TrendChart.tsx`
  - States: loading, loaded, empty
  - Uses simple SVG or lightweight charting (no heavy dependencies)
  - Effort: medium
  - Dependencies: T1.2

- [ ] **T7.4**: Implement `/trends` page
  - Files: `app/trends/page.tsx`
  - Category selector, country selector, period toggle
  - Trend results with chart, keyword cloud, top channels
  - Effort: medium
  - Dependencies: T7.2, T7.3

- [ ] **T7.5**: Implement competitor comparison flow
  - Files: `components/CompetitorComparison.tsx`, `lib/services/competitor.ts`
  - Compare channels side-by-side (stats, recent videos, growth patterns)
  - Uses AI analysis with competitor prompt
  - Effort: large (may need split)
  - Dependencies: T6.2, T4.4, T5.2

- [ ] **T7.6**: Implement trend history view (30-day snapshots)
  - Files: `app/trends/history/page.tsx`, `lib/services/trendHistory.ts`
  - Display historical `TrendSnapshot` data with date range picker
  - Effort: medium
  - Dependencies: T7.2, T1.3

---

## PR 8: Polish

> Goal: Export/import, error boundaries, retry logic, performance optimization, settings page.
> Estimated lines: ~300

### Phase 4: Polish

- [ ] **T8.1**: [P] Implement export utility (JSON + CSV)
  - Files: `lib/services/export.ts`, `__tests__/services/export.test.ts`
  - Export: videos, search results, watchlist, trend data
  - RED → GREEN → REFACTOR
  - Effort: medium
  - Dependencies: T1.4

- [ ] **T8.2**: [P] Implement import/backup utility
  - Files: `lib/services/import.ts`, `__tests__/services/import.test.ts`
  - Import: JSON backup restore, conflict resolution
  - RED → GREEN → REFACTOR
  - Effort: medium
  - Dependencies: T8.1, T1.3

- [ ] **T8.3**: Build `/settings` page
  - Files: `app/settings/page.tsx`
  - Sections: API keys (YouTube, OpenCode), quota config, export/import actions
  - Effort: medium
  - Dependencies: T8.1, T8.2

- [ ] **T8.4**: Add global error handling + retry logic
  - Files: `app/error.tsx`, `app/not-found.tsx`, `lib/services/retry.ts`, `__tests__/services/retry.test.ts`
  - Retry with exponential backoff for YouTube API
  - User-friendly error boundaries
  - Effort: medium
  - Dependencies: T2.2

- [ ] **T8.5**: Performance optimization — response caching headers, SWR/stale-while-revalidate
  - Files: `lib/services/cache.ts` (enhance), route handlers (cache headers)
  - Add `revalidate` tags, implement background refresh pattern
  - Effort: medium
  - Dependencies: T2.6, T3.2

- [ ] **T8.6**: Add app layout with navigation + QuotaIndicator in header
  - Files: `app/layout.tsx` (update), `components/AppHeader.tsx`, `components/AppNav.tsx`
  - Logo, navigation links, quota indicator
  - Effort: small
  - Dependencies: T5.4, T1.2

- [ ] **T8.7**: [P] Final integration testing + smoke tests
  - Files: `__tests__/integration/smoke.test.ts`
  - End-to-end flow: search → cache → analyze → export
  - Effort: medium
  - Dependencies: All previous PRs

---

## Parallelization Summary

| PR | Parallelizable Tasks | Notes |
|----|---------------------|-------|
| PR 1 | T1.6 (tests) can run while T1.2/T1.3 finalize | Low parallelism, mostly sequential |
| PR 2 | None — services are dependency-ordered | YouTube → Cache → Quota |
| PR 3 | T3.6, T3.7, T3.8 can run in parallel | Components are independent |
| PR 4 | T4.7 (AI cache) can run in parallel with T4.5–T4.6 | Otherwise sequential |
| PR 5 | T5.3, T5.4, T5.5 can run in parallel | Small independent pieces |
| PR 6 | T6.5, T6.6 can run in parallel | Components independent of API routes |
| PR 7 | T7.3 (TrendChart) can run while T7.1–T7.2 finish | T7.5 is large — consider sub-split |
| PR 8 | T8.1, T8.2, T8.7 can run in parallel | Export/import/smoke are independent |

---

## Risk Notes

1. **T4.6 (`/api/analyze` SSE route)** and **T7.5 (Competitor Comparison)** are the largest single tasks. If either exceeds session limits, split into: (a) core logic, (b) streaming/response formatting, (c) edge cases.
2. **Strict TDD** doubles the task count (test + implementation per feature). Each RED step should produce failing tests; GREEN should be the minimal implementation.
3. **shadcn/ui component installation** (T1.2) may produce many files. Run `npx shadcn@latest add <component>` for only needed components to stay within budget.
4. **SQLite file persistence**: ensure `dev.db` is in `.gitignore` and seed scripts exist for development.
