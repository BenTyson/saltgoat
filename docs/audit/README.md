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
- **2026-07-13** · Session 2 — T1-3/T1-4/T1-5/T1-7/T1-8 · 🧠 Opus · ✅ shipped in `2d26df4`. Constant-time
  webhook secrets (`security.ts`), RevenueCat 5xx-on-DB-error, `getSession()`→`getUser()` across 75 authz
  sites/24 files, `handleError` hook + `logger.ts` (Sentry-seam), in-memory rate limiting (`rateLimit.ts`).
  Verified: build 0, check 31, logged-out smoke (public 200 · /profile→/auth 303 · /admin→/ 302).
  **Authed path pending verification on deploy.**
- **Open (Tier 0, 👤 you):** T0-1 Stripe price id · T0-2 weather cron · T0-3 SPARROW_URL · T0-4 real
  secrets · T0-6 delete forum garbage · T0-7 Open-Meteo key.
- **Deferred → Session 3:** T0-5/T1-6 secret rotation (needs Supabase CLI install + lockstep dashboard flip).
- **2026-07-14** · Fable deep-bank (expiring window) · 🧠 Fable ×6 · ✅ complete — 6 durable artifacts in
  `docs/audit/{reviews,specs,growth}/` (draft SQL in `specs/drafts/`). Reviews found real holes in
  shipped S1/S2 code (auth = **safe on security**, but reliability fixes needed; rate-limit XFF DoS;
  incomplete RevenueCat fix; stale-types regression). All new items logged in
  [`backlog.md`](backlog.md#addendum--fable-deep-bank-findings-2026-07-14). Next: fix batch for the
  live-code R-items.
- **2026-07-14** · Review fix batch pt.1 (R-H1/H2/RC1/RC2, B-1/B-2/B-3) · 🔧 Sonnet · ✅ shipped `2ed513a`.
  Rate-limiter XFF→getClientAddress + secret-before-limit; RevenueCat upserts + UUID guard + ordering
  guard; isPro counts trialing; og:url removed; robots hardened. build 0 / check 31.
- **2026-07-14** · Review fix batch pt.2 (R-A auth centralization + R-L1) · 🧠 Opus · ✅ shipped —
  one request-scoped client + memoized `locals.safeGetSession()` in hooks; 35 files converted off
  per-load `getUser()`; kills M1/M2 refresh-race + redundant hops; 404s no longer error-logged.
  build 0 / check **29** (−2). Logged-out smoke ✓. **Authed path: owner to run the manual-test script
  (in `reviews/S1-S2-auth-redteam.md`) on deploy.**
- **Still owner-only:** R-M3 types regen (needs Supabase CLI) — also unblocks T1-6 + T1-9/T1-10 migrations.
