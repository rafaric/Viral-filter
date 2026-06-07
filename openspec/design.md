# viral-filter — Technical Design

## Status
**Design** — Complete

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                      │
│                     App Router / React                        │
└─────────────────────────┬───────────────────────────────────┘
                          │ Server Actions / API Routes
┌─────────────────────────▼───────────────────────────────────┐
│                      API Layer                                │
│  /api/search  /api/channels  /api/analyze  /api/trending   │
└─────────────────────────┬───────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   YouTube    │  │  OpenCode    │  │   SQLite     │
│  Data API    │  │     Go       │  │   (Prisma)   │
│  v3          │  │  $10/mo      │  │  30-day      │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Tech Stack Decisions

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Framework | Next.js 16+ (App Router) | Latest stable, RSC support |
| Database | SQLite + Prisma | Robust queries, 30-day retention, easy backup |
| AI | OpenCode Go (OpenAI-compatible) | $10/mo flat, streaming support |
| Styling | Tailwind CSS + shadcn/ui | Fast development, consistent UI |
| State | Zustand | Lightweight, simple, good for local app |
| Streaming | Server-Sent Events (SSE) | Native Next.js support, simple fallback |

## Database Schema (Prisma)

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model VideoCache {
  id            String   @id // YouTube video ID
  title         String
  description   String?
  channelId     String
  channelTitle  String
  publishedAt   DateTime
  viewCount     Int?
  likeCount     Int?
  commentCount  Int?
  categoryId    String?
  tags          String?  // JSON array stored as string
  thumbnailUrl  String?
  fetchedAt     DateTime @default(now())
  analyzedAt    DateTime?
  aiAnalysis    String?  // AI-generated insights

  @@index([channelId])
  @@index([publishedAt])
  @@index([fetchedAt])
}

model ChannelWatchlist {
  id          String   @id // YouTube channel ID
  title       String
  description String?
  subscriberCount Int?
  videoCount  Int?
  thumbnailUrl String?
  addedAt     DateTime @default(now())
  lastAnalyzed DateTime?

  @@index([addedAt])
}

model SearchHistory {
  id          String   @id @default(cuid())
  query       String
  filters     String   // JSON stored as string
  resultsCount Int
  createdAt   DateTime @default(now())

  @@index([createdAt])
}

model QuotaUsage {
  id        String   @id @default(cuid())
  date      String   // YYYY-MM-DD
  used      Int      @default(0)
  updatedAt DateTime @default(now())

  @@unique([date])
}

model TrendSnapshot {
  id          String   @id @default(cuid())
  categoryId  String
  country     String
  capturedAt  DateTime @default(now())
  videoIds    String   // JSON array of top video IDs

  @@index([capturedAt])
  @@index([categoryId, country])
}
```

## API Routes Design

### 1. Search & Discovery

```
GET/POST /api/search
```

**Request:**
```typescript
{
  query: string;           // Search term
  filters: {
    category?: string;     // Video category ID
    language?: string;     // ISO 639-1 (en, es, fr...)
    country?: string;      // ISO 3166-1 alpha-2 (US, AR, ES...)
    publishedAfter?: string;  // ISO date
    publishedBefore?: string;
    minViews?: number;
    minLikes?: number;
    sortBy?: 'relevance' | 'date' | 'viewCount' | 'rating';
  };
  pageToken?: string;      // Pagination
}
```

**Response:**
```typescript
{
  items: Video[];
  nextPageToken?: string;
  quotaUsed: number;
  cached: boolean;
}
```

### 2. Channel Details

```
GET /api/channels/[id]
```

**Response:**
```typescript
{
  id: string;
  title: string;
  description: string;
  subscriberCount: number;
  videoCount: number;
  thumbnail: string;
  stats: {
    avgViews: number;
    avgLikes: number;
    totalVideos: number;
  };
  recentVideos: Video[];
}
```

### 3. AI Analysis (Streaming SSE)

```
POST /api/analyze
```

**Request:**
```typescript
{
  type: 'idea' | 'keyword' | 'competitor' | 'optimize';
  data: {
    videos?: Video[];      // For idea/keyword analysis
    channelId?: string;   // For competitor analysis
    content?: {
      title?: string;
      description?: string;
      type?: 'title' | 'description' | 'hook';
    };                    // For optimize
  };
  model?: string;          // Optional model override
  outputFormat?: 'text' | 'json';
}
```

**Response (SSE stream):**
```
data: {"type": "chunk", "content": "Analizando tendencias..."}
data: {"type": "chunk", "content": " patrones detectados..."}
data: {"type": "done", "result": {...}}
```

### 4. Trending / Niche Analysis

```
GET /api/trending
```

**Query params:**
- `category` — Video category ID
- `country` — ISO country code
- `period` — 24h | 7d | 30d

**Response:**
```typescript
{
  trends: {
    emerging: Video[];     // Videos gaining traction
    stable: Video[];       // Consistently popular
    declining: Video[];     // Losing relevance
  };
  keywords: string[];      // Trending terms
  channels: Channel[];    // Top performing channels
  quotaUsed: number;
}
```

### 5. Quota Tracker

```
GET /api/quota
```

**Response:**
```typescript
{
  daily: {
    used: number;
    limit: 10000;
    remaining: number;
    resetAt: string;       // ISO timestamp
  };
  weekly: {
    used: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  };
}
```

## UI Design

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] viral-filter              [Quota: 7,234/10,000] 🔴  │
├────────────┬────────────────────────────────────────────────┤
│            │                                                │
│  FILTERS   │              MAIN CONTENT                      │
│            │                                                │
│ □ Category │  ┌──────────────────────────────────────────┐ │
│ □ Country  │  │  Search Bar + AI Assistant Toggle        │ │
│ □ Language │  └──────────────────────────────────────────┘ │
│ □ Date     │                                                │
│ □ Min Views│  ┌──────────────────────────────────────────┐ │
│ □ Engagemnt│  │  Results Grid / List                     │ │
│            │  │                                          │ │
│ [Search]   │  │  [Video Card] [Video Card] [Video Card]  │ │
│            │  │  [Video Card] [Video Card] [Video Card]  │ │
│ ────────── │  │                                          │ │
│            │  └──────────────────────────────────────────┘ │
│  WATCHLIST │                                                │
│  + Add     │  ┌──────────────────────────────────────────┐ │
│  - Channel1│  │  AI Analysis Panel (collapsible)         │ │
│  - Channel2│  │  Streaming output here...                 │ │
│            │  └──────────────────────────────────────────┘ │
└────────────┴────────────────────────────────────────────────┘
```

### Component Inventory

| Component | Purpose | States |
|-----------|---------|--------|
| `FilterPanel` | Collapsible left sidebar with all filters | default, collapsed, loading |
| `SearchBar` | Main search input with AI toggle | default, focused, loading, streaming |
| `VideoCard` | Video preview with stats | default, hover, selected, analyzed |
| `ChannelCard` | Channel info in watchlist | default, hover, analyzing |
| `QuotaIndicator` | Shows daily/remaining quota | green (<50%), yellow (50-80%), red (>80%) |
| `AIStreamOutput` | Streaming text display | idle, streaming, complete, error |
| `OutputFormatToggle` | Switch text/JSON output | text, json |
| `TrendChart` | Visual trend over time | loading, loaded, empty |

### Key Pages

1. **`/` (Dashboard)** — Main search + filters + results
2. **`/trends`** — Niche analysis view with trend charts
3. **`/watchlist`** — Channel watchlist management
4. **`/settings`** — API keys, quota config, export/import

## Feature Implementation Order

### Phase 1: Foundation
1. Next.js setup with App Router + Tailwind + shadcn/ui
2. Prisma schema + SQLite database
3. YouTube API integration (search, videos, channels)
4. Quota tracker service
5. Basic search UI with filters

### Phase 2: AI Integration
6. OpenCode Go wrapper with streaming
7. AI Assistant modal
8. Idea Generator flow
9. Keyword extraction flow

### Phase 3: Analysis
10. Channel watchlist
11. Niche Analysis view
12. Competitor comparison
13. Trend snapshots (30-day history)

### Phase 4: Polish
14. Export (JSON/CSV)
15. Import/backup
16. Performance optimization (caching, batching)
17. Error handling + retry logic

## Performance Considerations

### Caching Strategy

| Data Type | TTL | Strategy |
|-----------|-----|----------|
| Video details | 24h | Cache-first, background refresh |
| Channel stats | 6h | Cache-first |
| Search results | 1h | Cache with search hash key |
| AI analysis | 7d | Cache with content hash (no re-analyze same videos) |
| Quota stats | 5min | In-memory + persistence |

### Quota Management

- **Soft limit at 80%**: Show warning, suggest caching
- **Hard limit at 95%**: Disable API calls, show "quota exhausted" state
- **Batch requests**: Group video IDs (max 50 per request)
- **Rate limiting**: Respect 1000 req/100s YouTube limit
- **Smart polling**: Only fetch new data for watchlist channels

### Streaming Architecture

```
User Action → API Route → OpenCode Go → SSE Stream → Frontend Display
                              ↓
                        Cache result (async)
```

- Frontend shows chunks as they arrive
- On complete, result is cached
- If streaming fails, fallback to non-streaming

## Environment Variables

```env
# .env.local
YOUTUBE_API_KEY=your_youtube_api_key
OPENCODE_API_KEY=your_opencode_go_key
DATABASE_URL="file:./dev.db"
```

## Out of Scope (v1)

- Multi-user / auth
- Cloud sync
- Thumbnail generation
- YouTube upload integration
- Mobile app

## Open Questions

1. **Export format**: CSV alongside JSON? Any other formats needed?
2. **Watchlist limit**: Any limit on channels in watchlist?
3. **AI model selection**: Allow user to pick model per task, or auto-select?

---

*Design completed: 2026-06-07*