# T1-6 — Signup Webhook Secret Rotation Runbook

**Problem:** the live `SUPABASE_WEBHOOK_SECRET` Bearer token is hardcoded inside
`public.notify_user_signup()` in three committed migrations
(`20260420000000`, `20260420000002`, `20260421000000`). It is in git history
permanently, so it must be treated as **burned** and rotated.

**Fix:** migration `PLACEHOLDER_TIMESTAMP_rotate_signup_webhook_secret.sql`
rewrites the trigger function to read the secret from **Supabase Vault**
(secret name: `signup_webhook_secret`) at call time. After this runbook,
rotation is dashboard-only — no SQL edits, no git commits, no schema deploys.

**Blast radius if you get the order wrong:** signups NEVER break (the trigger
swallows all errors). The only thing at risk is the welcome email + newsletter
subscribe for users who sign up during a secret mismatch window. Keep the
window short; a lost welcome email is annoying, not fatal.

---

## Why Vault (decision record)

| Approach | Verdict |
|---|---|
| **(a) GUC** — `ALTER DATABASE ... SET app.settings.webhook_secret`, read via `current_setting()` | Rejected. Value sits in plaintext in `pg_db_role_setting` (a shared catalog), is readable from any SQL execution path, and appears in dumps of globals. Rotation is SQL anyway, so no UX win over Vault. |
| **(b) Deny-all config table** + SECURITY DEFINER read | Rejected. Plaintext at rest; shows up in `pg_dump`, backups, and logical replication; one future RLS/grant misstep leaks it. Vault is the same amount of SQL with encryption for free. |
| **(c) Supabase Vault** ✅ | **Chosen.** Encrypted at rest (authenticated encryption), only the `postgres` role can read `vault.decrypted_secrets`, first-class rotation via `vault.update_secret()` or the Dashboard Vault UI, and the trigger stays declarative in migrations. |
| **(d) Dashboard-configured Database Webhook** (delete the hand-rolled trigger) | Rejected, narrowly. It does get the secret out of git, but dashboard webhooks are just pg_net triggers created outside version control: they vanish on `supabase db reset`, don't exist in new environments, are invisible to code review, and you lose the exception-swallowing wrapper that already saved signup once (see `20260420000002`). Same mechanism, less control. |

**Is pg_net even needed?** Yes, or something like it — the endpoint does work
(Sparrow email + Listmonk subscribe) that can't run inside Postgres.
`net.http_post` is **async** (queued, sent by a background worker), so it adds
no latency to signup. The mechanism was never the problem; the secret's
location was.

---

## Phase 0 — Prerequisites & preflight

The Supabase CLI is **not installed on this machine**. Install and link first:

```bash
brew install supabase/tap/supabase
supabase login                                   # opens browser, paste token
cd /Users/bendiana/Bentropy/saltgoat
supabase link --project-ref seywnbufuewbiwoouwkk # prompts for DB password
```

Preflight checks:

1. **No duplicate webhook.** Dashboard → Database → Webhooks: confirm there is
   NO dashboard-configured webhook on `public.profiles` INSERT. (CLAUDE.md
   describes configuring one; the migrations hand-rolled it instead. If both
   exist you would double-send welcome emails.) If one exists, delete it — the
   migration-managed trigger is the source of truth.
2. **Vault is enabled.** Dashboard → Database → Extensions → `supabase_vault`
   enabled (it is preinstalled on current hosted projects; the migration also
   attempts a guarded enable).
3. **Know the current secret.** Read it from Railway (`railway variables` or
   Dashboard → service → Variables → `SUPABASE_WEBHOOK_SECRET`). You need it
   for Phase 1 seeding. It is also the value visible in the three old
   migration files.
4. **Confirm baseline works.** Optional but recommended: create a throwaway
   signup now and confirm the welcome email arrives, so you have a known-good
   baseline before touching anything.

---

## Phase 1 — Seed Vault with the CURRENT secret, then apply the migration

This phase changes *where* the function reads the secret from without changing
its *value* — zero mismatch window.

1. **Create the Vault secret with the CURRENT value** (Dashboard → SQL Editor):

   ```sql
   select vault.create_secret(
     '<CURRENT value of SUPABASE_WEBHOOK_SECRET>',   -- the old/burned value, for now
     'signup_webhook_secret',
     'Bearer secret for POST https://saltgoat.co/api/webhooks/user-signup'
   );
   ```

   (Or Dashboard → Project Settings → Vault → New secret, name exactly
   `signup_webhook_secret`.)

2. **Rename and apply the migration:**

   ```bash
   cd /Users/bendiana/Bentropy/saltgoat
   mv supabase/migrations/PLACEHOLDER_TIMESTAMP_rotate_signup_webhook_secret.sql \
      supabase/migrations/$(date -u +%Y%m%d%H%M%S)_rotate_signup_webhook_secret.sql
   supabase db push
   ```

3. **Verify the Vault path works with the old value:** test signup → welcome
   email arrives. If it doesn't, check Postgres logs for the
   `Vault secret "signup_webhook_secret" missing` warning (name typo is the
   most likely cause) — and note signups themselves are unaffected either way.

Do not proceed to Phase 2 until this verification passes.

---

## Phase 2 — Rotate to a fresh secret (lockstep order)

The endpoint validates exactly one secret, so there is an unavoidable window
(~Railway deploy time, 1–3 min) where DB and endpoint disagree; signups in that
window lose only their welcome email. Do this at a low-traffic moment.
(Zero-loss alternative if you ever need it: temporarily make
`src/routes/api/webhooks/user-signup/+server.ts` accept old OR new secret,
deploy, rotate, then remove the fallback. Overkill at current traffic.)

1. **Generate** the new secret locally; keep it in your clipboard/password
   manager only:

   ```bash
   openssl rand -hex 24
   ```

2. **Railway first** (the slow step — starts a redeploy):

   ```bash
   railway variables --set SUPABASE_WEBHOOK_SECRET=<NEW>
   ```

   Wait until the redeploy is **live** (Railway dashboard → Deployments).
   Window opens: endpoint now only accepts NEW, DB still sends OLD.

3. **Vault immediately after** (instant — window closes):

   ```sql
   select vault.update_secret(
     (select id from vault.secrets where name = 'signup_webhook_secret'),
     '<NEW>'
   );
   ```

4. **Local `.env`:** update `SUPABASE_WEBHOOK_SECRET=<NEW>` in
   `/Users/bendiana/Bentropy/saltgoat/.env` (gitignored; `.env.example` keeps
   its blank placeholder).

5. **Dashboard webhook header — only if applicable.** If Phase 0 step 1 found
   a dashboard-configured Database Webhook that you chose to keep instead of
   deleting, update its `Authorization: Bearer <NEW>` header now. Under this
   runbook's recommendation (trigger is the source of truth), there is nothing
   to do here.

---

## Phase 3 — Verify & invalidate the old secret

1. **End-to-end test:** sign up a fresh test account → welcome email arrives
   at that address AND it appears as a subscriber in Listmonk
   (`saltgoat-newsletter`).
2. **Old secret is rejected:**

   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' -X POST \
     https://saltgoat.co/api/webhooks/user-signup \
     -H 'Content-Type: application/json' \
     -H 'Authorization: Bearer <OLD burned value from the migrations>' \
     -d '{"type":"INSERT","table":"profiles","schema":"public","record":null,"old_record":null}'
   # expect: 401
   ```

3. **New secret is accepted (harmless probe):** same curl with `Bearer <NEW>`
   and the null-record body above → expect `200` with `{"received":true}`
   (the handler no-ops when `record.id` is absent; no email is sent).
4. **The old value is burned forever.** It remains in git history in the three
   old migration files — never reuse it anywhere. Rewriting git history is
   optional and NOT required; rotation is the real fix. Do not "clean up" the
   old migration files' SQL — they've already been applied and editing them
   would desync the migration history.

### Future rotations (the payoff)

From now on, rotating is two steps, no git, no migrations:

1. `railway variables --set SUPABASE_WEBHOOK_SECRET=<new>` → wait for deploy.
2. `vault.update_secret(...)` in the SQL editor (step 3 above).

---

## Rollback plan

- **Emails stopped after Phase 1 (migration applied, old value seeded):**
  almost certainly a Vault name/value mismatch. Fix the secret in place:
  `vault.update_secret` with the exact current Railway value, name exactly
  `signup_webhook_secret`. No migration rollback needed — signups were never
  at risk.
- **Emails stopped after Phase 2:** DB and Railway disagree. Make them agree —
  either finish the flip (set Vault to NEW) or revert both sides to OLD
  (`railway variables --set SUPABASE_WEBHOOK_SECRET=<OLD>` +
  `vault.update_secret` to OLD). Reverting to OLD is acceptable only as a
  stopgap; the old value is public in git, so re-rotate promptly.
- **Nuclear option (migration itself misbehaves):** re-apply the function body
  from `supabase/migrations/20260421000000_fix_signup_search_path.sql` via the
  SQL editor to restore the previous behavior. This re-embeds a secret in the
  DB function (though not in a new git commit) — emergency use only, then
  redo this runbook.
- **At no point can this break signup** — every version of the function since
  `20260420000002` swallows all exceptions.

---

## Verification checklist

- [ ] Supabase CLI installed, logged in, linked to `seywnbufuewbiwoouwkk`
- [ ] No duplicate dashboard Database Webhook on `profiles` INSERT
- [ ] Vault secret `signup_webhook_secret` exists (`select name from vault.secrets;`)
- [ ] Migration renamed from `PLACEHOLDER_TIMESTAMP_...` and applied (`supabase db push` clean)
- [ ] `select prosecdef, proconfig from pg_proc where proname = 'notify_user_signup';` → `prosecdef = t`, `proconfig = {search_path=""}`
- [ ] Function source contains NO literal secret: `select prosrc from pg_proc where proname = 'notify_user_signup';` → references `vault.decrypted_secrets`, no hex string
- [ ] Test signup → welcome email received → Listmonk shows the subscriber
- [ ] Old bearer → 401; new bearer → 200 (curl probes in Phase 3)
- [ ] Railway env, Vault, and local `.env` all hold the NEW value
- [ ] Old value recorded as burned; not reused anywhere
