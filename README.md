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
| `CRON_SECRET`                                                                                                                                | Authorises the daily notification retry (at least 32 characters).                         |
| `ALLOW_DATABASE_SEED`                                                                                                                        | Set `true` only while running the one-time database setup, then back to `false`.          |

## Deploying to production

1. Create a Neon database and set all variables above in Vercel (Production environment).
2. Deploy, set `ALLOW_DATABASE_SEED=true`, sign in at `/login`, then `POST /api/seed` once to create the tables.
   Set `ALLOW_DATABASE_SEED` back to `false` and redeploy. Newer columns and the notification table are added
   automatically on first use; if the database role cannot alter tables, apply them ahead of launch.
3. Turn on Neon point-in-time restore for backups.
4. Add Vercel Firewall rate-limit rules for `/api/book`, `/api/track` and `/api/auth/login`. The app's own limiter
   is per server instance only.
5. Work through the admin dashboard's launch checklist (contact details, check-in/out times, room facts, privacy
   notice facts, real photography). Only then set `SITE_READY_FOR_INDEXING=true` and submit the sitemap.

## Content

- `src/lib/hotel-content.ts`: room facts, hotel policies and privacy-notice facts. Leave a value `""` until the
  hotel approves it: blank values are hidden from guests and listed in the launch checklist.
- `src/lib/config.ts`: hotel name, contact fallbacks, default rooms and images.
- Rooms, offers, banquet packages, dining options and reviews are edited in the admin dashboard.
- Photos marked "representative" show a disclosure label. Replace them with real photography before launch.

## Notifications

Each new request is saved together with a notification event in one transaction. When the webhook is configured,
the event is sent straight away; failed events are retried daily by Vercel Cron (`vercel.json`) and on demand from
the admin dashboard. After 8 failed attempts an event is marked failed so it stops blocking newer ones; admin can
put failed events back in the queue. The saved request is never lost.

The receiving service must:

1. Verify `X-Hotel-Signature`: HMAC-SHA256 of `X-Hotel-Timestamp + "." + rawBody`, compared in constant time, and
   reject old timestamps.
2. Deduplicate on `eventId` / `Idempotency-Key`. Delivery is at least once.
3. Alert staff, and acknowledge the guest only if they gave an email. Describe the request as pending, never as
   confirmed.
4. Return 2xx only after it has accepted responsibility for delivery.

Without a webhook, events stay queued and requests are only visible in the admin dashboard.
