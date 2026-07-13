# SaltGoat

Colorado 14ers tracking app. Users log summits, write reviews, track progress across all 58 peaks.

## Stack

| Platform | Tech |
|----------|------|
| **Web** | SvelteKit 5, Supabase (cloud), Tailwind 3, Railway |
| **Mobile** | Expo SDK 55, React Native, NativeWind, Expo Router |
| **Shared** | `@saltgoat/shared` monorepo package (types, data, utils) |

```bash
npm run dev                    # Web dev (localhost:4466)
cd mobile && npx expo start    # Mobile dev (iOS simulator)
npm run build                  # Web build
railway up -d                  # Deploy
supabase db push               # Push migrations
supabase gen types typescript --project-id seywnbufuewbiwoouwkk 2>/dev/null > packages/shared/src/types/database.ts
```

**Project IDs:** Railway `00b2ac99-4a09-4959-992f-169c7f981b96` | Supabase `seywnbufuewbiwoouwkk`

## Project Structure

```
src/lib/server/         Server-side queries & mutations (all accept SupabaseClient<Database>)
src/lib/components/     Svelte UI (peak/, profile/, map/, search/, admin/, gallery/, etc.)
src/lib/data/           Static data — re-exports from @saltgoat/shared
src/lib/utils/          Utilities — re-exports from @saltgoat/shared
src/lib/types/          Generated Supabase types — re-exports from @saltgoat/shared
src/routes/             Pages & API endpoints
src/routes/api/v1/      REST API for mobile
src/routes/admin/       Admin dashboard (nested routes, layout auth guard)
static/images/peaks/    58 peak hero images (optimized JPEGs, NOT in Supabase storage)
supabase/migrations/    Database migrations (46+)
packages/shared/        @saltgoat/shared — types, data, utils shared between web + mobile
mobile/app/             Expo Router screens (tabs, stacks, modals)
mobile/components/      React Native components (peaks/, profile/, weather/, summit/, map/, ui/)
mobile/lib/             Supabase client, API client, auth provider, peaks context, theme
```

## Server Modules

| Module | Purpose |
|--------|---------|
| `supabase.ts` | SSR client, API client (Bearer token), `requireAuth(request)` |
| `peaks.ts` | Peak queries |
| `summits.ts` | Summit CRUD + stats (`createSummit`, `getUserSummitStats`, `getAdvancedStats`) |
| `reviews.ts` | Review CRUD |
| `trailReports.ts` | Trail report CRUD |
| `achievements.ts` | Check + award achievements (`checkAndAwardAchievements(supabase, userId, trigger)`) |
| `subscriptions.ts` | `getSubscription`, `isPro`, `canLogSummit` (free tier: 5 summits) |
| `images.ts` | Image gallery CRUD + moderation |
| `conditions.ts` | Weather v1 (legacy `peak_conditions`) + v2 (`peak_forecasts`: 3-band, 3-period, 7-day forecasts, `getForecastForPeak()`) |
| `leaderboard.ts` | Leaderboard aggregation |
| `reactions.ts` | Summit reactions (toggle, batch-fetch with avatar stack) |
| `comments.ts` | Summit comments (create, delete, batch-fetch) |
| `follows.ts` | Follow system + suggestions |
| `trips.ts` | Planned trips CRUD |
| `watchlist.ts` | Peak watchlist CRUD |
| `activity.ts` | Unified activity feed |
| `admin.ts` | `isAdmin()`, `assertAdmin()`, all admin dashboard queries |
| `stripe.ts` | Stripe integration (stubbed) |
| `forum/` | Community forum — modular directory (categories, topics, replies, search, views, reactions, bookmarks, admin) |

All modules live in `src/lib/server/` and accept `SupabaseClient<Database>` as first param — portable between web form actions and API endpoints.

## Adding a Feature

New features follow this pattern across both platforms:

1. **Database** — migration in `supabase/migrations/`, RLS policies, indexes. Run `supabase db push` then regenerate types
2. **Server module** — `src/lib/server/feature.ts` accepting `SupabaseClient<Database>`. All business logic lives here
3. **Web route** — `+page.server.ts` with load function + form actions. Components in `src/lib/components/feature/`
4. **API endpoint** — thin wrapper in `src/routes/api/v1/` calling server module. Must validate all input server-side (DB CHECK constraints are a safety net, not primary validation)
5. **Mobile** — types in `mobile/lib/types/api.ts`, screen in `mobile/app/`, components in `mobile/components/feature/`
6. **Verify** — `npm run build` must pass. Test both platforms if the feature touches shared logic

## Web Patterns

- **Svelte 5 runes:** `$props()`, `$state()`, `$derived()` throughout
- **Server loads** in `+page.server.ts`, mutations via **form actions**
- **Auth:** `createSupabaseServerClient(cookies)` for SSR, email + Google OAuth
- **Dark mode:** `.dark` class on `<html>`, all components support both themes
- **Design system:** `class-1`..`class-4` colors, `shadow-card` variants, Instrument Serif + Inter fonts
- **Custom SVG icons** (not Lucide) in `src/lib/components/ui/AchievementIcon.svelte`
- **Admin:** nested routes (not `?tab=`), layout auth guard at `src/routes/admin/+layout.server.ts`

## Mobile Patterns

- **Auth:** `AuthProvider` → `useSession()` hook at `mobile/lib/auth/AuthProvider.tsx`. Methods: `signInWithEmail`, `signUpWithEmail`, `signInWithGoogle` (expo-web-browser), `signInWithApple` (expo-apple-authentication), `signOut`, `resetPassword`. Tokens: `expo-secure-store`. Deep link: `saltgoat://auth/callback`
- **API client:** `apiFetch<T>(path, options?)` at `mobile/lib/api.ts` — auto Bearer token, 401 refresh retry, GET/POST/PATCH/DELETE + FormData
- **Peaks context:** `PeaksProvider` → `usePeaks()` at `mobile/lib/peaks/PeaksProvider.tsx` — shared peak data + summitedPeakIds across all tabs, `refresh()` after mutations
- **Purchases:** `PurchasesProvider` → `usePurchases()` at `mobile/lib/purchases/PurchasesProvider.tsx` — RevenueCat SDK, `isPro`, `purchase()`, `restorePurchases()`, `manageSubscription()`. Identifies users via `Purchases.logIn(user.id)` on auth change
- **Fonts:** `'InstrumentSerif'` (headings), `'Inter'`/`'Inter-Medium'`/`'Inter-SemiBold'`/`'Inter-Bold'`
- **Icons:** `SymbolView` from `expo-symbols` (SF Symbols on iOS)
- **Colors:** `colors` from `@/lib/theme/colors` for programmatic styling
- **Image upload:** `pickImage`, `optimizeImage`, `uploadImageWithProgress` at `mobile/lib/imageUpload.ts` — XHR-based with progress callback, client-side resize via `expo-image-manipulator`
- **Types:** shared from `@saltgoat/shared/types/helpers`, API responses from `@/lib/types/api`

## API Endpoints

### Web-Only
`/api/webhooks/weather` (cron, 4x daily — fetches 3 elevation bands x 58 peaks, writes to `peak_forecasts` + legacy `peak_conditions`), `/api/checkout` (stub), `/api/portal` (stub), `/api/webhooks/stripe` (stub), `/api/webhooks/revenuecat` (mobile IAP), `/api/export/summits` (Pro CSV)

### Mobile REST API (v1)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/peaks` | GET | Optional | All 58 peaks + summitedPeakIds if authenticated |
| `/api/v1/peaks/[slug]` | GET | Optional | Aggregated detail: peak + reviews + images + conditions + trail reports |
| `/api/v1/peaks/[slug]/conditions` | GET | No | 7-day weather forecast (legacy v1, uses `peak_conditions`) |
| `/api/v1/peaks/[slug]/forecast` | GET | No | 7-day elevation-banded forecast (v2, uses `peak_forecasts`) — returns `ForecastResponse` |
| `/api/v1/peaks/[slug]/routes/[route]` | GET | No | Route detail with trail geometry (best trace or route geometry) — returns `RouteDetailResponse` |
| `/api/v1/profile` | GET | Required | Stats + summits + achievements + grid |
| `/api/v1/summits` | GET | Required | Can-log pre-flight check (allowed, remaining, isPro) |
| `/api/v1/summits` | POST | Required | Create summit → returns `{ summit, newAchievements }` |
| `/api/v1/summits/[id]` | PATCH | Required | Update summit fields |
| `/api/v1/summits/[id]` | DELETE | Required | Delete summit |
| `/api/v1/peaks/[slug]/reviews` | POST | Required | Create review → returns `{ review, newAchievements }` |
| `/api/v1/peaks/[slug]/trail-reports` | POST | Required | Create trail report → returns `{ trailReport, newAchievements }` |
| `/api/v1/peaks/[slug]/images` | POST | Required | Upload peak image (multipart/form-data) → returns `{ image, url }` |
| `/api/v1/activity` | GET | Required | Unified activity feed (?feed=following/you) with reactions + comments |
| `/api/v1/users/[id]` | GET | Optional | Public user profile with stats, summits, achievements, follow data |
| `/api/v1/follows` | GET | Required | Suggested users to follow |
| `/api/v1/follows` | POST | Required | Follow a user (`{ following_id }`) |
| `/api/v1/follows` | DELETE | Required | Unfollow a user (`{ following_id }`) |
| `/api/v1/reactions` | POST | Required | Toggle summit reaction (`{ summit_id }`) |
| `/api/v1/comments` | POST | Required | Create comment (`{ summit_id, body }`) |
| `/api/v1/comments` | DELETE | Required | Delete own comment (`{ comment_id }`) |
| `/api/v1/forum/categories` | GET | No | List forum categories with counts |
| `/api/v1/forum/categories/[slug]/topics` | GET | Optional | Paginated topics for category (cursor-based) |
| `/api/v1/forum/topics` | POST | Required | Create forum topic |
| `/api/v1/forum/topics/[id]` | GET | Optional | Topic detail + first page replies + reactions + bookmarks |
| `/api/v1/forum/topics/[id]` | PATCH | Required | Edit own topic |
| `/api/v1/forum/topics/[id]` | DELETE | Required | Delete own topic |
| `/api/v1/forum/topics/[id]/replies` | GET | Optional | Paginated replies with reactions |
| `/api/v1/forum/topics/[id]/replies` | POST | Required | Create reply |
| `/api/v1/forum/reactions` | POST | Required | Toggle forum reaction (like/helpful/fire/summit) |
| `/api/v1/forum/bookmarks` | GET | Required | User's bookmarked topics |
| `/api/v1/forum/bookmarks` | POST | Required | Toggle bookmark |
| `/api/v1/forum/search` | GET | No | Full-text search with category filter |

**Pattern:** endpoints are thin wrappers around server modules. Public endpoints: anon client fallback. Auth-required: `requireAuth(request)`. CORS in `hooks.server.ts`. Static image paths resolved to absolute URLs via `url.origin`.

## Database

### Tables

**Core (public read):** `peaks` (58), `routes` (66), `peak_conditions` (legacy 7-day weather), `peak_forecasts` (v2: 3-band x 3-period x 7-day forecasts)
**User (RLS: own CRUD):** `profiles`, `user_summits`, `user_reviews`, `user_achievements`, `trail_reports`, `peak_images`, `user_follows`, `planned_trips`, `planned_trip_peaks`, `peak_watchlist`, `user_subscriptions`, `content_flags`, `summit_reactions`, `summit_comments`
**Forum:** `forum_categories` (6, admin-seeded), `forum_topics`, `forum_replies`, `forum_reactions`, `forum_bookmarks`, `forum_topic_views`, `forum_mentions`
**Storage:** `peak-images` (gallery, authenticated write), `profile-images` (avatar/cover, own write), `forum-images` (forum uploads, authenticated write)

### Key Fields

| Table | Fields |
|-------|--------|
| `peaks` | slug, name, elevation, rank, range, latitude, longitude, hero_image_url, thumbnail_url |
| `routes` | peak_id, name, distance_miles, elevation_gain_ft, difficulty_class, parking_*, trail_geometry (JSONB, currently empty) |
| `user_summits` | user_id, peak_id, route_id?, date_summited, conditions?, notes?, start_time?, summit_time?, party_size? |
| `user_reviews` | user_id, peak_id, rating (1-5), title, body (one per user per peak) |
| `profiles` | display_name, username, avatar_url, cover_image_url, bio, tagline, location, is_public |
| `user_subscriptions` | plan (free/pro), status (active/canceled/past_due/trialing), stripe_customer_id |
| `peak_images` | peak_id, storage_path, caption, category, status, is_private, flag_count |
| `peak_forecasts` | peak_id, elevation_band (summit/mid/base), forecast_date, time_period (morning/afternoon/night), temperature_f, wind_speed_mph, precipitation_in, snow_in, weather_code |

### RLS Summary

| Access | Tables |
|--------|--------|
| Public read, own CRUD | summits, reviews, trail_reports, achievements |
| Public read, own insert/delete | summit_reactions, summit_comments, user_follows |
| Own read + write only | user_subscriptions, peak_watchlist |
| Public read + admin write | peaks, routes |
| Approved+public or own read | peak_images |
| Public read, own CRUD (30-min window) | forum_topics, forum_replies |
| Public read, own insert/delete | forum_reactions |
| Own read + write only | forum_bookmarks, forum_topic_views |
| Public read only | forum_categories |

## Key Routes

| Route | Purpose |
|-------|---------|
| `/peaks/[slug]` | Peak detail (reviews, weather summary card, trail reports, gallery) |
| `/peaks/[slug]/weather` | Full weather forecast (elevation bands, forecast table, insights) — Pro gated |
| `/peaks/[slug]/[route]` | Route detail (trail map, elevation, parking, route weather strip) |
| `/profile` | User dashboard (tabs: activity, photos, trips, buddies) |
| `/community` | Community forum hub (categories, recent, popular, bookmarks) |
| `/community/[category]` | Topic list for category (infinite scroll) |
| `/community/[category]/[topic]` | Topic detail + replies + reactions |
| `/community/[category]/new` | New topic composer |
| `/community/search` | Forum full-text search |
| `/admin` | Admin dashboard (overview, moderation, users, content, subscriptions) |
| `/pricing` | Free vs Pro comparison |
| `/contact` | Contact form → hello@saltgoat.co |
| `/learn/*` | Educational guides (6 pages) |
| `/blog/*` | Blog hub + posts |

Other routes: `/`, `/peaks`, `/ranges`, `/ranges/[slug]`, `/map`, `/leaderboard`, `/users/[id]`, `/trips/[id]`, `/auth`, `/guidelines`

## Dual-Platform Rules

- **New features** must ship on both platforms (or explicitly scoped to one)
- **Bug fixes** affecting shared logic (API, database, subscriptions, achievements) must be verified on both
- **Database migrations** affect both systems — consider mobile compatibility
- **API changes** (`/api/v1/`) must maintain backward compatibility with deployed mobile clients
- Keep `@saltgoat/shared` types in sync when regenerating Supabase types

## Testing

No test suite. Verification is `npm run build` + manual testing. When in doubt, build.

## Known Issues

- GPX trail data removed (bad quality) — `routes.trail_geometry` is empty
- No rate limiting on API endpoints
- No error monitoring (Sentry)
- Stripe integration is stubbed — see `docs/ben.md` for setup steps
- PWA glob warning and `semver` circular dependency warning are harmless (ignore)
- Legacy `peak_conditions` still dual-written — deprecation timeline in `src/lib/server/conditions.ts`
- Open-Meteo free tier is non-commercial — need commercial key for production with paid subscriptions
- Weather webhook cron not yet configured — see `docs/ben.md`

## Email (Sparrow)

Sparrow is a self-hosted email gateway (Listmonk + Postmark) at `https://sparrow-production-b53e.up.railway.app`.

- **Env vars:** `SPARROW_URL`, `SPARROW_API_KEY` (Railway)
- **Server module:** `src/lib/server/sparrow.ts` — `subscribe()`, `sendRaw()`, `sendTransactional()`
- **Auth header:** `x-api-key` (not Bearer)
- **Sending domain:** `hello@saltgoat.co` (verified in Postmark)
- **Newsletter list:** `saltgoat-newsletter` in Listmonk
- **Subscribe endpoint:** `POST /api/v1/subscribe` — for mobile and web
- **Welcome email:** fired by `POST /api/webhooks/user-signup` (Supabase DB webhook on `profiles` INSERT). Also subscribes user to newsletter.
  - Configure in Supabase dashboard → Database → Webhooks → `public.profiles` INSERT → URL: `https://saltgoat.co/api/webhooks/user-signup`, Header: `Authorization: Bearer <SUPABASE_WEBHOOK_SECRET>`
- **Pro upgrade email:** fired in `src/routes/api/webhooks/revenuecat` on `INITIAL_PURCHASE`
- **Contact form:** `POST /contact` → `sendRaw` to `hello@saltgoat.co` with `reply_to` set to sender

## Reference Docs

- [Forum Spec](docs/forum.md) — community forum design, schema, phases, launch checklist
- [Mobile Roadmap](docs/mobile_roadmap.md) — mobile development plan, phases, architecture decisions
- [Manual Setup](docs/ben.md) — Stripe, GSC, Supabase ops tasks
- [GPX Import](docs/gpx-import-guide.md) — CalTopo workflow for trail data
