# Hotel Ganga Imperial

Marketing website and reservation-request system for Hotel Ganga Imperial, Varanasi. Built with Next.js 16, React 19
and Postgres (Neon), deployed on Vercel.

The site accepts **reservation requests, not bookings**. There is no payment, live inventory or automatic
confirmation: requests arrive in the admin dashboard as pending, and staff confirm availability, rates and policies
with the guest. Pending requests never hold a room.

## Pages

- Public: `/`, `/rooms`, `/rooms/[slug]`, `/dining`, `/celebrations`, `/guest-information`, `/contact`, `/book`,
  `/track` (guests check a request's status with its reference and email), `/privacy`.
- Staff: `/login` and `/admin` (requests, enquiries, rooms, offers, banquet packages, dining, reviews, analytics,
  notification status and a launch checklist of missing details).

## Local development

```sh
npm ci
cp .env.example .env.local   # fill in at least ADMIN_EMAIL, ADMIN_PASSWORD and JWT_SECRET
npm run dev                  # http://localhost:3000
```

Without `DATABASE_URL`, data is stored in `data/db.json`. That file is for local development only; production needs
Postgres.

## Checks

Run all of these before merging. CI (`.github/workflows/ci.yml`) runs the same on every pull request.

```sh
npm run lint
npx tsc --noEmit
npm run format:check
npm test
npm run build
```

End-to-end tests (Playwright, Chromium) start their own `next dev` on port 3100 with a throwaway copy of
`data/db.json` (`e2e/.data/`), so they can run beside `npm run dev` and never write guest data to the committed file:

```sh
npx playwright install chromium   # once
npm run test:e2e
```

## Configuration

All variables are listed in `.env.example`.

| Variable                                                                                                                                     | Purpose                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                                                                                               | Neon Postgres. Required for Vercel production: the build fails without it.                |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`                                                                                                              | Staff login. There are no default credentials; admin is disabled until set.               |
| `JWT_SECRET`                                                                                                                                 | Session signing key, at least 32 random characters.                                       |
| `NEXT_PUBLIC_HOTEL_PHONE`, `NEXT_PUBLIC_HOTEL_WHATSAPP`, `NEXT_PUBLIC_HOTEL_EMAIL`, `NEXT_PUBLIC_HOTEL_ADDRESS`, `NEXT_PUBLIC_HOTEL_MAP_URL` | Contact details shown to guests. Baked in at build time, so redeploy after changing them. |
| `NEXT_PUBLIC_SITE_URL`                                                                                                                       | Production origin, used for canonical URLs, social images and the sitemap.                |
| `SITE_READY_FOR_INDEXING`                                                                                                                    | Keep `false` until content is approved; `true` lets search engines index the site.        |
| `NOTIFICATION_WEBHOOK_URL`, `NOTIFICATION_WEBHOOK_SECRET`                                                                                    | Where new-request events are sent (HTTPS, secret of at least 32 characters). Optional.    |
| `CRON_SECRET`                                                                                                                                | Authorises the scheduled job (notification retry, retention clean-up), 32+ characters.    |
| `ALLOW_DATABASE_SEED`                                                                                                                        | Set `true` only while running the one-time database setup, then back to `false`.          |

## Deploying to production

1. Create a Neon database and set all variables above in Vercel (Production environment).
2. Deploy, set `ALLOW_DATABASE_SEED=true`, sign in at `/login`, then `POST /api/seed` once. It creates the tables
   and applies every newer column and table (notification outbox, retry timestamps, admin session state), so a
   database role that cannot alter tables fails here rather than on a guest's request. Set `ALLOW_DATABASE_SEED`
   back to `false` and redeploy.
3. Turn on Neon point-in-time restore for backups.
4. **Required before launch:** add Vercel Firewall rate-limit rules (Project → Firewall → Configure → Rate Limiting)
   for `/api/book` (e.g. 10 requests per minute per IP), `/api/track` (20/min) and `/api/auth/login` (10/min). The
   app's own limiter counts per server instance, so on its own it does not stop abuse spread across instances.
5. Add the repository secrets `SITE_URL` and `CRON_SECRET` so `.github/workflows/scheduled-jobs.yml` runs the
   scheduled job every 10 minutes (Vercel Hobby cron only runs daily). On Vercel Pro you can instead change the
   schedule in `vercel.json` to `*/10 * * * *`.
6. Monitoring: add an uptime check (e.g. Better Stack or UptimeRobot) on `/` and `/api/rooms`, and an alert on log
   lines containing `"level":"error"` (Vercel log drain or log alerts). Server errors are logged as one JSON line
   each (`src/instrumentation.ts`, `src/lib/log.ts`).
7. Work through the admin dashboard's launch checklist (contact details, check-in/out times and privacy notice facts
   under Settings, room facts and rates, real photography, and every sample offer, package and dining option). Only then set `SITE_READY_FOR_INDEXING=true` and submit the sitemap.

## Content

- `src/lib/hotel-content.ts`: room facts, hotel policies and privacy-notice facts. Leave a value `""` until the
  hotel approves it: blank values are hidden from guests and listed in the launch checklist. Add the notification
  provider to `PRIVACY_INFORMATION.providers` once one is chosen.
- Data retention: set `PRIVACY_INFORMATION.retentionMonths` (e.g. `24`). The privacy notice then states the period,
  and the scheduled job deletes requests and enquiries whose sent date and requested dates are both older than that.
  While it is `0`, nothing is deleted automatically; staff can still delete a request from the dashboard.
- `src/lib/config.ts`: hotel name, contact fallbacks, default rooms and images.
- Rooms, offers, banquet packages, dining options and reviews are edited in the admin dashboard.
- Photos marked "representative" show a disclosure label. Replace them with real photography before launch.

## Notifications

Each new request is saved together with a notification event in one transaction. When the webhook is configured,
the event is sent straight away. The scheduled job retries failed events, waiting longer after each failure (5
minutes, doubling up to 6 hours). Staff can press Retry in the admin dashboard to send pending events at once, for
example after fixing the receiver; events sent in the last 5 minutes are skipped so nothing goes out twice from
overlapping runs. After 8 failed attempts an event is marked failed so it stops blocking newer ones; admin can put
failed events back in the queue. The saved request is never lost. The dashboard warns when `CRON_SECRET` is not set,
because then nothing retries automatically and the retention clean-up never runs.

The receiving service must:

1. Verify `X-Hotel-Signature`: HMAC-SHA256 of `X-Hotel-Timestamp + "." + rawBody`, compared in constant time, and
   reject old timestamps.
2. Deduplicate on `eventId` / `Idempotency-Key`. Delivery is at least once.
3. Alert staff, and acknowledge the guest only if they gave an email. Describe the request as pending, never as
   confirmed.
4. Return 2xx only after it has accepted responsibility for delivery.

Signature check in Node (use the raw body as received, before JSON parsing):

```js
import { createHmac, timingSafeEqual } from "node:crypto";
function verify(rawBody, timestamp, signature, secret) {
  if (Math.abs(Date.now() - Number(timestamp)) > 5 * 60_000) return false; // reject replays
  const expected = createHmac("sha256", secret).update(timestamp + "." + rawBody).digest();
  const given = Buffer.from(String(signature), "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
```

Without a webhook, events stay queued and requests are only visible in the admin dashboard.

## Admin sessions

Sessions last 8 hours. Signing out ends every session of the admin account, including copied tokens. There is one
shared admin account (`ADMIN_EMAIL`/`ADMIN_PASSWORD`): if the password may have leaked, change it and sign out.
