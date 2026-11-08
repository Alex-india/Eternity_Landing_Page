# Owner notifications and creator filters

Uses the existing `server/services/email.js` Brevo HTTPS client, its configured
`BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, and reply-to behaviour.
No provider, dependency, sender address, or public signup behaviour was added.
Creator confirmation emails remain controlled separately by CREATOR_EMAIL_ENABLED.

## Configure and test locally

1. In the ignored `server/.env`, keep your existing database, owner credentials,
   WhatsApp destination, and verified Brevo sender/key. Add:

   ```dotenv
   NOTIFICATIONS_ENABLED=true
   ADMIN_BASE_URL=http://localhost:3000
   NOTIFY_HOURLY_LIMIT=20
   ```

   ADMIN_BASE_URL is the origin only, without `/admin`, a path, query, or fragment.
   Use your actual local port. Production requires an HTTPS origin. Example-file
   placeholders intentionally disable sending. Missing owner, key, sender or valid
   base URL produces a conspicuous startup warning listing setting names, never
   credential values. Existing required owner/WhatsApp validation still applies.

2. Run `npm --prefix server run migrate`, then `npm start`. The normal server
   startup also applies the additive migration automatically. Migration 003 adds
   two operational notification tables; it does not add business entities.
3. Sign in at `/admin/login`, open `/admin/creators`, and click **Send test email**.
   Check the configured owner's inbox and spam folder. The endpoint is
   `POST /api/admin/notifications/test`, protected by owner authorization, CSRF,
   same-origin checks and a three-tests-per-hour IP limit. Tests use the daily
   notification safety budget as well. It will not send while notifications are
   disabled or misconfigured. "Accepted by Brevo" does not guarantee inbox delivery.
4. Submit a new valid handle at `/creators?src=notification-test`. The application
   must return successfully while notification delivery runs separately. Under
   normal conditions, the owner email should arrive in a few seconds. It contains
   only handle, niche, followers, average views, country, INR rate, source, joined
   time in IST, and the configured `/admin/creators` link. Contact email, WhatsApp,
   full name, and internal review notes are excluded from owner emails/outbox data.
5. Submit the same handle again: no new owner email. Validation failures, honeypot
   submissions and rate-limited requests must not create notification events.
6. On a disposable local setup, set NOTIFY_HOURLY_LIMIT=1 and restart. Add two
   different creators: only the first gets an individual owner email. The second
   goes into that UTC clock hour's overflow summary. After the hour ends, run:

   ```powershell
   npm --prefix server run notifications:run
   ```

   Expect one overflow summary. Run the command again: no duplicate summary.
   The public form still limits one IP to eight attempts/hour; do not disable that
   protection to generate test traffic. Restore NOTIFY_HOURLY_LIMIT=20 afterwards.
7. To test the daily digest without changing real timestamps, run the same command
   after 8pm IST on a day with applications. It covers the fixed 24-hour window
   ending at 8pm IST, lists up to 500 profiles, and gives exact total/source counts.
   If there are more than 500, it explicitly points to admin for the rest. A repeat
   run does not resend that window. An empty window sends nothing. A first run
   before 8pm may catch up the previous day's due window.
8. On a disposable setup, use an invalid Brevo key. Signup must still succeed;
   warnings remain short and omit the key. Restore the key. The cron worker retries
   queued failed deliveries at least five minutes apart, up to three attempts.

## Render setup: reliable scheduling independent of web-service sleep

For the existing **web service**, set the same notification variables, with
ADMIN_BASE_URL set to your real HTTPS domain. Reuse its already verified sender.
Redeploy to apply migration 003 before starting the worker. Confirm the admin
test action works in production and submit a fresh test profile from your phone.

The implemented scheduling path is a **separate native Render Cron Job**:

- Same repository/branch as the web service.
- Runtime: Node; use the same region as your current service/database where possible.
- Build command: `cd server && npm install`
- Start/command: `node server/jobs/notifications.js`
- Schedule: `*/5 * * * *` (Render cron schedules use UTC).
- Variables: DATABASE_URL, OWNER_EMAIL, BREVO_API_KEY, BREVO_SENDER_EMAIL,
  BREVO_SENDER_NAME, NOTIFICATIONS_ENABLED=true, ADMIN_BASE_URL, and
  NOTIFY_HOURLY_LIMIT. Keep secrets in Render environment settings or a shared
  environment group. The worker does not need creator WhatsApp or JWT secrets.
- Use **Trigger Run** once and inspect its credential-free status output. It exits
  unsuccessfully on processing errors or a failed send, making failures visible.
- At 14:30 UTC (8pm IST), the next worker run sends the digest. Hourly summaries
  normally run within five minutes of the UTC hour ending. Provider/database
  delays, retries, and safety budgets can make these later.

`render-notifications.example.yaml` is a copyable reference, not an automatically
provisioned service. Native Render Cron Jobs have a **$1/month minimum per job**.
No service, subscription, deployment, or billing change has been made here.

An in-process setInterval scheduler is unreliable on Render Free because the web
service sleeps/restarts and loses timers. A free external cron calling a
secret-protected endpoint is another possible approach, but HTTP wake-up timeouts,
provider scheduling guarantees and secret management add failure points. That
endpoint is not exposed in this release: the native worker is the selected reliable
path and talks directly to PostgreSQL/Brevo while the web service sleeps. Immediate
signup notifications begin only once the signup request itself wakes/completes.

Sources checked during implementation:
- https://render.com/docs/cronjobs
- https://render.com/docs/free

## Limits, delivery and failure behaviour

- Brevo Free currently allows **300 emails per day for the whole account**, shared
  with inquiry, booking, creator-confirmation and other sends. This is not a
  separate allowance for owner notifications. Official limit:
  https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans
- NOTIFY_HOURLY_LIMIT defaults to 20 (valid 1–200). PostgreSQL serializes decisions
  across processes, so concurrent signups cannot overrun the fixed UTC hourly
  individual quota. Overflow gets one summary for that hour. Manual test emails
  have their own three/hour limiter.
- Owner mail also has a conservative **200 attempted sends per rolling 24 hours**
  safety cap, including summaries, digests, tests and failed attempts. This leaves
  nominal room for existing mail; it cannot measure sends made by other apps or
  other Brevo interfaces. Brevo remains the authority on the shared 300/day limit.
  The owner budget can defer messages, including a digest, until capacity returns.
  Existing site emails are not blocked or otherwise changed by this budget.
- Individual sends use a 3.5-second timeout through the existing helper. Normal
  notification failures cannot fail creator signup. They produce generic warnings;
  no request headers, provider response bodies, or API keys are logged by owner
  notification handling. Other existing email calls retain their original defaults.
- Event/delivery keys, leases and retry counts persist in PostgreSQL. Restarts do
  not clear hourly quotas or forget already-sent summaries/digests. The scheduled
  worker catches up queued failures and the latest due daily reporting window.
- No email service can promise inbox placement. Use the verified sender already
  configured; authenticate its domain/DKIM/DMARC and check spam and Brevo delivery
  logs. Accepted-by-provider status is not a delivery/open receipt.
- The public call is deliberately fire-and-forget after the creator INSERT commits.
  A process crash before its outbox insert could lose the individual event; the
  creator remains saved and is included in the daily digest. A provider acceptance
  followed by a connection failure/process crash can produce a rare duplicate on
  retry. Local idempotency prevents routine repeats, not provider-level exactly-once
  delivery. Notifications disabled/misconfigured at signup are not retroactively
  sent individually; the digest still reads the Creator table.
- Previously failed daily windows are not replayed indefinitely: each job checks
  the latest 8pm window. A full-day scheduler outage can therefore miss an older
  digest. The stored creators remain available in admin. Review worker failures.

## Creator filters

In `/admin/creators`, expand **More filters**. You can combine country, min/max
average views, followers, INR rate, quality score, scored/unscored, and joined date
range with the existing search/status/niche/source filters. Sort by date, views,
followers, rate or quality. Date ranges include the full selected IST days. Apply
resets pagination, Reset clears everything, and the indicator shows active inputs.
Malformed ranges/sorts/dates return 400; values stay parameterized and sort columns
are selected from an allowlist.

## Files and verification

- `server/services/email.js`: optional short timeout/quiet mode; old callers keep defaults.
- `server/services/notifications.js`: reusable notifyOwner(event), durable throttling,
  delivery retries, hourly summary and daily digest orchestration. To add an event,
  add its loader/render/summaryLine entry to EVENT_HANDLERS; shared delivery stays intact.
- `server/services/notification-format.js`: safe subject/body formatting and IST window.
- `server/services/notification-config.js`, `server/config.js`: settings and warnings.
- `server/routes/creators.js`: post-commit, non-awaited event hook.
- `server/routes/admin.js`, `public/admin.js`, `server/views/admin.js`: protected test button.
- `server/db/migrations/003_owner_notifications.sql`: operational event/delivery tables.
- `server/jobs/notifications.js`, `server/package.json`, Render YAML files: worker setup.
- `server/creator-filters.js`, admin creator route/view/script/CSS: filter controls/query logic.
- `.env.example` and tests: configuration placeholders and regression coverage.

`npm --prefix server test` runs unit checks. Set TEST_DATABASE_URL only to the guarded
local `eternity_creator_test` database for full integration coverage, as described
in CREATOR-LAUNCH.md. Tests mock Brevo; they send no real email. They cover pending
provider responses, failures/timeouts, duplicate/spam suppression, concurrent
deduplication, quota persistence, summaries/digests, owner/CSRF authorization,
body privacy, configuration warnings and combined filters. Actual inbox delivery,
Render scheduling and phone/browser visual checks require the manual steps above.

Verification result: all 27 unit/integration tests passed against isolated local
PostgreSQL 18, including the real 3.5-second timeout and daily safety budget.
JavaScript syntax and whitespace checks passed. No real emails were sent and no
production database, Render service, or billing configuration was changed.
