# viral-filter — SDD Phase Tracker

> SDD (Spec-Driven Development) checklist for building the viral-filter app.
> Each phase must be completed and reviewed before proceeding to the next.

---

## Phase 0: Init 🎯 (In Progress)
- [x] Create `openspec/config.yaml` with project context
- [x] Write `openspec/proposal.md` with tech stack implications
- [x] Create `openspec/TODO.md` (this file)
- [ ] Next.js project scaffolding
- [ ] Environment setup (`.env.local` template)
- [ ] YouTube API key validation
- [ ] OpenCode Go API connectivity test
- [ ] Skill registry setup (`.atl/skill-registry.md`)

---

## Phase 1: Proposal 📝
- [ ] Proposal question round (3–5 product questions to user)
- [ ] Gather user feedback on feature priorities
- [ ] Confirm AI model selection per feature
- [ ] Validate YouTube API quota assumptions
- [ ] Finalize MVP scope (confirm Thumbnail Generator deferral)
- [ ] Update `config.yaml` with confirmed scope
- [ ] Update `proposal.md` with user corrections

---

## Phase 2: Design 🎨
- [ ] UI/UX wireframes for each feature
- [ ] Database schema (local cache, trends, watchlists)
- [ ] API route design (Next.js API routes)
- [ ] AI prompt engineering (per feature)
- [ ] State management strategy (React context / Zustand / localStorage)
- [ ] Error handling & retry logic design
- [ ] Quota tracking architecture
- [ ] Review and approval

---

## Phase 3: Apply 🔧
- [ ] Scaffold Next.js app with chosen router
- [ ] Implement AI service wrapper (`lib/ai.ts`)
- [ ] Implement YouTube API service wrapper (`lib/youtube.ts`)
- [ ] Implement quota tracker component
- [ ] Build Idea Generator feature
- [ ] Build Keyword Research feature
- [ ] Build Niche Analysis feature
- [ ] Build Competitor Analysis feature
- [ ] Build AI Assistant feature
- [ ] Add error boundaries and loading states
- [ ] Add local data export/backup

---

## Phase 4: Verify ✅
- [ ] Unit tests for API wrappers
- [ ] Integration tests for AI prompts
- [ ] YouTube API quota stress test
- [ ] End-to-end user flows
- [ ] AI output quality validation
- [ ] Performance profiling (local runtime)
- [ ] Review against `review_budget: 400 lines`
- [ ] Final sign-off

---

## Phase 5: Ship 🚀 (Optional / Future)
- [ ] Build script / standalone executable (if desired)
- [ ] Documentation (README, setup guide)
- [ ] Thumbnail Generator (deferred feature)
- [ ] Multi-user support (future)
- [ ] Cloud sync / backup (future)

---

## Current Status

| Phase | Status | Notes |
|-------|--------|-------|
| Init | ✅ Complete | Files created, awaiting user approval to continue |
| Proposal | ⏳ Pending | Waiting for user to answer proposal questions |
| Design | ⏳ Pending | — |
| Apply | ⏳ Pending | — |
| Verify | ⏳ Pending | — |

---

## Quick Reference

| Config | Value |
|--------|-------|
| Project | viral-filter |
| Execution Mode | interactive |
| Artifact Store | openspec |
| Review Budget | 400 lines |
| Strict TDD | true |

---

*Last updated: 2026-06-07*
