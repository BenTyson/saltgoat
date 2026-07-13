# SaltGoat Fable Audit — Command Hub

**Owner:** orchestrated from the Claude Code "command hub" session (Opus 4.8).
**Purpose:** a structured, multi-session audit + execution plan to get SaltGoat launch-ready and set up to grow.
**Created:** 2026-07-13 · **Scope:** Web app only (mobile deferred to a follow-up pass).

This directory IS the living plan. Any session — human or agent — can read these files to know
exactly where things stand. Update the dashboard below as work completes.

---

## How this works

1. **Phase 0 — Evidence pack** ✅ (Opus, cheap): [`00-repo-map.md`](00-repo-map.md) — repo inventory,
   hotspots, and a *curated reading list* per domain so Fable reads targeted files, not the whole repo.
2. **Phase 1 — Domain audits**: one report per domain. Curated model split (see table).
3. **Phase 2 — Backlog** ✅: [`backlog.md`](backlog.md) — 76 raw findings deduped & prioritized (P0→P3),
   each tagged with a recommended executor. **7 launch-blockers (Tier 0), mostly config.**
4. **Phase 3 — Execution**: each backlog item spins off a scoped session/subagent, reports back here.

**Model policy (decided 2026-07-13):** curated Fable usage. Fable only on the three high-judgment
domains. Opus/Sonnet handle the rest. No fixed launch date → optimize for doing it right (broad P0/P1).

---

## Domain dashboard

| # | Domain | Auditor | Report | Status |
|---|--------|---------|--------|--------|
| A | Security & data integrity | **Fable** | `A-security.md` | ✅ Report delivered |
| B | Backend / infra / code quality | **Fable** | `B-backend.md` | ✅ Report delivered |
| C | Web frontend quality & performance | Opus/Sonnet | `C-frontend.md` | ✅ Report delivered |
| D | UI/UX | Opus/Sonnet | `D-uiux.md` | ✅ Report delivered |
| E | Features & scope coherence | Opus/Sonnet | `E-features.md` | ✅ Report delivered |
| F | Growth & product strategy | **Fable** | `F-growth.md` | ✅ Report delivered |

Legend: ⬜ Not started · 🟡 In progress · ✅ Report delivered · 🔵 Backlog items in execution

---

## Health snapshot (updated as evidence lands)

| Signal | Value |
|--------|-------|
| Web LOC | ~39.4k (243 TS/Svelte files) |
| Server modules | 24 (+ forum submodules), 6.3k LOC |
| API endpoints | 32 (`+server.ts`) |
| Route pages w/ loads | 26 |
| Migrations | 62 |
| Commits | 79 |
| Test suite | None (verification = build + manual) |
| Schema-validation lib | None (hand-rolled validation) |
| `npm run build` | ✅ Passes (exit 0) once `.env` present — confirmed 2026-07-13 |
| `npm run check` | 🟡 31 errors / 69 warnings (was 131 → 101 → **31** after T1-1 barrel restore; ~remaining need Supabase regen + C-report follow-ups) |

---

## Decision log

- **2026-07-13** — Session established as command hub. Audit scoped: web-only, curated Fable
  (A/B/F), no fixed launch date, evidence-gathering at orchestrator's discretion (build/check +
  read-only schema + git freely; live-site browse where useful; nothing write/destructive).

---

## Execution log

- **2026-07-13** · T1-1 (types barrel corruption) · 🔧 Sonnet · ✅ restored `src/lib/types/database.ts`
  to the 2-line re-export barrel → `npm run check` **101 → 31 errors**. Follow-up: user must run
  `supabase gen types … 2>/dev/null > packages/shared/src/types/database.ts` to add `contact_submissions`
  to the shared pkg (CLI not installed here).
- **2026-07-13** · T1-2 (regen command re-breaks barrel) · 🔧 Sonnet · ✅ fixed `CLAUDE.md:19` to target
  the shared pkg with `2>/dev/null`.
- **2026-07-13** · T1-11 (/pricing unreachable) · 🔧 Sonnet · ✅ added Pricing to `Header.svelte` navLinks
  + `Footer.svelte`. Build green. Uncommitted, ready for review.
- **Open (Tier 0, 👤 you):** T0-1 Stripe price id · T0-2 weather cron · T0-3 SPARROW_URL · T0-4 real
  secrets · T0-6 delete forum garbage · T0-7 Open-Meteo key. **Deferred to Session 2:** T0-5/T1-6 secret
  rotation (lockstep w/ trigger migration).
