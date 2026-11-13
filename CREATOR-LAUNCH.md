# Creator release: setup and acceptance checks

This release adds only Creator data and owner security. Lead/Brand, shortlists,
deals, the ledger, reports, uploads, and expiring update links remain staged.
Existing development content remains at `/`; `/build` is currently an alias so
the small post-onboarding website offer works. The split homepage comes later.

Owner email notifications and additional creator filters are documented in
[OWNER-NOTIFICATIONS.md](OWNER-NOTIFICATIONS.md), including the separate cron worker,
notification budget, setup/test steps and delivery limitations.

The creator admin list also has a red **Delete** action beside Review. It asks for
confirmation with the creator's name and handle before permanently removing that
profile and its queued notification snapshot. Owner authorization, CSRF protection
and a matching handle are required. There is no bulk delete or undo. Delivery-only
metadata is retained for email-budget accounting; it contains no profile/contact
fields. To test, use a disposable profile: cancel once and verify it remains, then
confirm deletion and verify it stays absent after refreshing the list.

## Creator counts

The top of the admin list displays **Total entries**, counting public and manual
profiles across all pages. With filters applied it also shows how many match;
adding/deleting a creator refreshes the count with the list.

## Filter and export a brand shortlist

The admin list has compact filters above a full-width list. Advanced filters are
collapsed by default; rows and actions use compact spacing for quick selection. Expand
**Niche** or **Status** and tick multiple options. Options within a group match
any selected value; different groups, search, views/followers/rate/quality ranges,
entry method, score status and dates apply together. Country and Source accept
comma-separated values. Press **Apply**; Reset clears all filter controls.

Tick individual creator rows or the header checkbox to select the current page.
Selections stay across pagination and changed filters, including profiles outside
the current results. The selected count is always shown. Use **Clear selection**
to start a new shortlist. Selections are held in this tab's memory and clear on
reload/logout. Maximum: 200 profiles per export.

Press **Export selected** to fetch current saved profile data and preview the
exact selected profiles in selection order. Export includes name, Instagram
handle/link, niche, country, full follower count, average reel views, indicative
INR reel rate and profile status. Pending profiles are explicitly marked Pending
review; unknown values are Not provided. Email, WhatsApp, internal notes, quality
score, consent details and source tags are excluded at the server. The only
profile links in the generated message are constructed Instagram links.

Use **Copy for WhatsApp**, **Download .txt**, or **Open WhatsApp** (for short
messages). Clipboard-denied browsers select the text for manual copying. For
large shortlists, copy the message or attach the UTF-8 .txt file in WhatsApp.
Nothing is sent automatically. Exporting does not create a persistent shortlist
or public URL. A deleted/unavailable selected profile causes a clear error rather
than silently exporting a partial selection. The endpoint is owner-only, uses
the existing CSRF checks and never caches the response.

No dependencies, migrations or new environment variables are needed. Existing
single-value filter URLs continue to work; repeated parameters support multiple
values (for example `niche=Fashion&niche=Lifestyle&status=verified&status=active`).

Deployment checks: choose Fashion + Lifestyle, Verified + Active, and a reel-rate
maximum, then Apply and inspect the results/count. Select profiles on two pages,
change a filter and confirm the selected count remains; export and confirm only
those selected profiles appear. Copy/paste into a draft WhatsApp message or open
the downloaded .txt; verify full numbers and no contact/internal fields. Reset
filters, clear selections, then check Edit/Add/Delete still refresh the list.

## Manually add a creator from DMs

Open `/admin/creators` and click **Add creator**. Name, Instagram handle, niche,
country and confirmation of the creator's DM agreement are required. Email,
WhatsApp, followers, average views and INR reel rate can be left blank when
unknown. These are stored as NULL, displayed as Unknown/Not provided, and sorted
after known values. The source defaults to `dm-manual`; change it to your outreach
batch/channel. Internal notes are private.

Manual entries start pending and show a Manual entry label. Every creator row now
has **Edit**, **Review**, and **Delete**. Use Edit to correct followers, average
views, rates, contact details and other profile fields for both public submissions
and manual entries. Required public-form fields remain required; manual entries
may still have unknown values. Existing consent, entry method, created date,
review status/quality and confirmation email status remain unchanged. Edits do not
trigger signup notifications. The public form explains full counts (49K = 49000).
New saves clear list filters and show all creators newest first so the saved
entry is visible. Errors preserve entered values. Duplicate handles (including
case, @ and URL variants) return an error and never overwrite the existing row.
Public signup requirements and duplicate behavior remain unchanged. Owner-entered
profiles do not send signup/confirmation emails. Optional scheduled digests count
all added creators, including manual entries.

Migration `004_manual_creators.sql` adds `entry_method` and `added_by`, and allows
unknown contact/metric columns only for manual rows. Existing rows default to
`form`; a database constraint continues to require those fields for form rows.
The migration runner applies this automatically before the app starts. There are
no new environment variables or dependencies.

Test with a disposable profile: save a minimal DM entry, refresh and find it by
handle/source, then use Review → Edit details to add views/rate and verify the
values persist. Try the same handle again and an invalid rate; neither should
create/overwrite a record. Cancel should close without saving. Owner session and
CSRF are required for both create and edit endpoints.

## Required configuration

Copy `server/.env.example` to `server/.env` for local work. Render environment
variables override that file. Never commit real credentials or an owner password.

| Variable | Value / purpose |
| --- | --- |
| `DATABASE_URL` | Existing PostgreSQL/Neon database connection. Use verified TLS (`sslmode=verify-full`) for production. |
| `JWT_SECRET` | Random secret, at least 32 characters. Existing tokens without a current owner session version cannot access private endpoints. |
| `OWNER_EMAIL` | Your single owner email; the example contains a marked placeholder. |
| `CREATOR_WHATSAPP_NUMBER` | Your confirmation destination, digits only with country code, no `+`, spaces, or punctuation. The example contains a marked placeholder. |
| `CREATOR_AGENCY_NAME` | Creator-facing agency name, default `Eternity Creator Network`. |
| `CREATOR_EMAIL_ENABLED` | Keep `false` until the sender domain is authenticated. WhatsApp confirmation works independently. |
| `NODE_ENV` | `production` on Render. Startup fails if owner/WhatsApp configuration is missing or invalid. |
| `CAL_WEBHOOK_SECRET` | The same secret configured in Cal.com. Without it, webhook processing returns 503; invalid signatures return 401. |
| `FRONTEND_URL` | Optional separate frontend origin. Same-origin requests work automatically. |

`OWNER_EMAIL` is used in `server/config.js` (normalization/startup validation),
`server/db/setup-owner.js` (private provisioning), `server/routes/admin.js`
(login authorization), `server/middleware/auth.js` (database-backed owner check
on every private request), and `server/routes/auth.js` (prevents public signup
from claiming the owner email). It is declared in `server/.env.example` and
`render.yaml`, and covered by tests. It is not exposed in public configuration.

`CREATOR_WHATSAPP_NUMBER` is used in `server/config.js` (production startup
validation) and `server/creator-config.js` (validation and wa.me link building).
The link builder is consumed by `server/views/creators.js` (thank-you CTA and
correction/removal contact link) and `server/routes/creators.js` (secondary email
CTA and submission readiness). It is declared in `server/.env.example` and
`render.yaml`, and covered by tests. The business number appears in public
WhatsApp links intentionally. No real values are committed.

The handle used in the thank-you message comes from a signed, HttpOnly,
15-minute receipt cookie scoped to `/creators/thanks`. It is not in the page URL.
With cookies disabled, the same page uses a generic prefilled message instead.

## Provision the owner before deploying

1. Configure `server/.env` with the target database, JWT secret and `OWNER_EMAIL`.
2. Run `npm --prefix server run owner:setup` in a normal terminal. It prompts for
   a hidden password (12+ characters, at most 72 UTF-8 bytes). This applies the
   migrations, deletes the known demo account, and creates/promotes only this owner.
3. On Render, set matching variables before deploying. No production signup or
   automatic owner creation is provided. Do not reuse a demo password.
4. Start locally with `npm start`, or deploy using the existing Render build/start
   commands. Open `/admin/login`. The admin uses an 8-hour HttpOnly, SameSite=Strict
   cookie, Secure in production, and CSRF tokens for cookie-authenticated writes.

The CLI also accepts `OWNER_PASSWORD` from the process environment for deployment
automation. Do not put it in shell arguments, source control, or permanent Render
configuration. The hidden interactive prompt is preferred. Running setup again
resets the owner password and revokes existing owner sessions. Changing OWNER_EMAIL
also requires running the provisioning command; changing the variable alone does
not grant access to an existing member account.

Migrations use an advisory lock, a transaction and `schema_migrations`. The legacy
schema is initialized once without dropping data; new SQL migrations are applied
once. `001_owner.sql` adds a single-owner role constraint and removes the known
demo account. `002_creators.sql` creates the Creator table and indexes. Existing
inquiries and bookings are preserved. Review a database backup before production
schema changes; these changes have been exercised against an isolated local DB,
not your production DB.

## Brevo setup (secondary)

1. In Brevo's sender/domain settings, add a domain or sending subdomain you own.
2. Add exactly the verification, DKIM and DMARC records Brevo supplies to your DNS.
   Merge existing mail records correctly; do not create competing DMARC policies.
   Gmail's domain cannot be authenticated by you.
3. Add/verify a sender such as `creators@your-domain`, then set `BREVO_SENDER_EMAIL`,
   `BREVO_SENDER_NAME`, and `BREVO_API_KEY` in Render. Check any API-key IP restriction
   against the service's actual outbound networking.
4. Keep `CREATOR_EMAIL_ENABLED=false` until a real test reaches your inbox. Then
   set it to `true` and redeploy/restart. Confirmations use Brevo's HTTPS API with a
   timeout. The admin records `disabled`, `pending`, `sent` (provider accepted), or
   `failed`. A failed email never rolls back a creator submission. No background
   mail queue or automatic retry is implemented in this release.

Official instructions: https://help.brevo.com/hc/en-us/articles/12163873383186-Authenticate-your-domain-with-Brevo-Brevo-code-DKIM-DMARC

## Render sleep and cheapest reliable option

Render Free sleeps after 15 idle minutes; the first request can take about a minute
to wake. The `/creators` document itself is served by Express, so it also waits.
Choose the lowest paid web instance ($7/month at the time of implementation) for
this existing service. A paid workspace subscription is not needed just to change
the service's compute instance. The repo keeps `plan: free` to avoid an automatic
billing change. Upgrade in the dashboard and update that field to `starter` when
you decide to use it, so Blueprint configuration matches your dashboard.

Keep-alive HTTP pings can reduce idle time while they run, but are not a reliability
guarantee and retain free-tier restarts, usage limits, and suspension behavior. No
keep-alive service is installed. Splitting out a free static form does not fix a
sleeping submission API. Keep Neon for data; do not replace it with a temporary
free Render Postgres database. No uploads or local persistent storage are needed.

Sources: https://render.com/pricing and https://render.com/docs/free

## Exact manual acceptance tests

### Step 1: owner security

1. Start in production mode with OWNER_EMAIL absent, then with
   CREATOR_WHATSAPP_NUMBER absent/invalid. Each attempt must exit with the named
   configuration error. Restore both before continuing.
2. Provision the owner. Log in at `/admin/login`; `/admin/creators` should load.
3. In a private/incognito window, `/admin/creators` must redirect to login.
   `/api/admin/creators`, `/api/inquiries`, `/api/cal/bookings`, `/api/cal/email-status`,
   and `/api/auth/me` must return 401, with no private records.
4. A non-owner account's token must return 403 on those APIs. Public production
   signup must return 403 even if `ALLOW_DEV_SIGNUP=true`. The old demo account
   must no longer log in. Owner credentials must use `/api/admin/login`, not the
   legacy site login route.
5. Log out. Refresh a formerly private page: login must be required. A previously
   copied cookie must also fail. Re-provisioning the owner must revoke old sessions.
6. `/server/index.js`, `/server/.env`, `/server/db/schema.sql`, `/package.json`, and
   `/.git/config` must return 404. `/`, `/build`, CSS, JS, favicon and hero effects
   must still work.
7. Direct unauthenticated `/api/cal/send-confirmation` must return 401. Configure
   the same webhook secret in Cal.com and Render, then create a test booking using
   Cal.com. Unsigned/altered webhook payloads must be rejected. Client-side direct
   email triggering is now private; legitimate booking emails use signed webhooks.

### Step 2: creator onboarding

1. Open `/creators?src=dm-batch1` on your phone, including from Instagram. Confirm
   there is no Eternity navigation/footer, no dev scripts, and no upload field.
2. Submit a realistic test profile. The required fields include INR rate, average
   reel views and consent. Empty consent, negative numbers, malformed contact
   details and unknown niches must be rejected. Server errors redisplay entered
   fields instead of discarding them.
3. The form should redirect to `/creators/thanks`. Tap Confirm on WhatsApp: verify
   the configured destination and `Hi, I just joined the creator network as @handle`
   text. No message sends automatically. With cookies blocked, expect generic text.
4. In admin, find the new pending record; verify source, consent timestamp, rate,
   email and phone. Search by handle/name/email, filter niche/status/source, and
   check pagination when there are more than 25 records.
5. Submit the same handle with different capitalization, with an `@`, and as a
   profile URL. Expect the same generic thank-you and exactly one stored profile.
   Previous details must not be overwritten. Request changes through WhatsApp.
6. Try Pending directly to Active: it must be rejected. Set Verified with a score
   from 0–100 and notes, save, then set Active. Refresh and confirm persistence.
7. Restart the server and confirm the record/review remains. A migration rerun
   must not recreate the demo user or wipe creator data.
8. Keep creator emails disabled: applications must still work. On a test setup,
   enable email with an invalid key: the record must save and show email `failed`.
9. The ninth submission attempt from one IP in an hour returns 429. The limiter
   is in-memory for this one-instance release and resets on process restart. Use
   a shared store when scaling; the signed form token and honeypot remain active.
10. Check narrow screens, keyboard navigation, browser Back and a slow connection.
    Confirm the website offer sits below the main thank-you/WhatsApp instructions.

## Automated checks

`npm --prefix server test` runs validation/configuration checks. Integration tests
are skipped unless TEST_DATABASE_URL explicitly points to a local database named
`eternity_creator_test`. Never point this at Neon or an existing personal DB.

PowerShell example after creating that disposable local test database:

```powershell
$env:TEST_DATABASE_URL='postgresql://eternity_test@127.0.0.1:55439/eternity_creator_test'
npm --prefix server test
```

The integration suite applies the real migrations and exercises HTTP routes,
database persistence, uniqueness, owner sessions, CSRF, rate limits, and signed
webhooks. It creates synthetic fixtures and only runs against the guarded local
database. Browser checks do not establish real Instagram in-app compatibility;
that requires your phone test above.

Implementation verification: 20 tests passed against isolated PostgreSQL 18;
server/public JavaScript syntax checks and `git diff --check` passed. No live
database migrations, Render deployment, or billing changes were performed.
Visual browser review could not be completed because browser access was
unavailable; desktop/mobile visual QA and the Instagram test remain required.

## Remaining launch concerns

- Configure owner/WhatsApp variables and provision the owner before production.
- Upgrade Render compute before outreach if immediate loads matter; no billing
  changes have been made automatically.
- Configure the Cal.com webhook secret to restore signed booking deliveries.
- Authenticate the Brevo sender domain before enabling creator email.
- The existing development homepage still contains placeholder contact details,
  imagery/testimonials and privacy/terms links. Review them before driving traffic.
- Retain a verified PostgreSQL TLS connection, review backup/recovery, and provide
  a way to honour correction/deletion requests through the displayed WhatsApp link.
- The legacy development page retains its existing external fonts/CDN/animations
  and permissive CSP. The new creator/admin pages have independent strict CSPs.
- No uploads are supported. Later analytics assets must use private object storage,
  never this repo or Render's temporary filesystem.
- Prisma baseline generation alone might take around an hour. Budget 3–6 hours
  for live-schema verification, CommonJS/client integration, migration and deploy
  checks. Prisma remains deferred until deals/ledger as agreed for that estimate.
