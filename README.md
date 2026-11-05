This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Reservation and launch setup

The website accepts **reservation requests**, not instant confirmed bookings. Requests appear in the admin dashboard with pending status. There is no payment collection, automatic email/SMS delivery, live room inventory or inventory hold. Staff must confirm availability, final rates and policies with the guest. Pending requests do not block a room category.

Copy `.env.example` to your local environment file and configure:
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` and a random `JWT_SECRET` of at least 32 characters. Admin authentication fails closed until configured; there are no default credentials.
- The `NEXT_PUBLIC_HOTEL_*` contact values. The footer currently shows explicit placeholders; no placeholder phone/WhatsApp links send guests to a third party.
- `DATABASE_URL` for durable hosted storage. Without it, local development uses `data/db.json` (unsuitable for concurrent production workers).

The database seed endpoint requires an authenticated admin and `ALLOW_DATABASE_SEED=true`. Disable this after setup. Request throttling is per process; configure a shared limiter at your hosting edge for public production traffic.

Before public launch, replace representative photos and the family-room illustration with verified property photography. Verify all room inclusions, rates, facility claims, package capacities, contact details, hotel policies and the privacy notice. Guest counts are enquiry party sizes; room allocation and per-room occupancy are confirmed manually.

Validation:
```sh
npm run lint
npx tsc --noEmit
node --test tests/reservation.test.mjs
npm run build
```

## Extended guest experience and notifications

New public pages: `/rooms`, `/rooms/[slug]`, `/celebrations`, `/dining`, `/guest-information`, `/contact`. The homepage previews the full collections while retaining the gate and architectural illustration.

Edit `src/lib/hotel-content.ts` to replace room size, bed, occupancy, bathroom, accessibility and hotel-policy placeholders with approved information. Set verified contacts in `.env.local` using `.env.example`. Replace representative images in `src/lib/config.ts` / the room management screen; mark images as non-sample when verified. No sample reviews are presented as genuine guest feedback.

Requests support 1–10 rooms and include a local download/print summary. The amount shown remains indicative and excludes taxes. There is no live inventory, payment processing or automatic confirmation.

Every new reservation is saved together with a durable notification-outbox event. Local JSON uses a single atomic file replacement; Postgres uses a transaction. Existing Postgres databases receive an additive `rooms_requested` column and `notification_outbox` table on first booking/outbox access. The database role needs permission for these additive schema changes; apply them ahead of launch if runtime DDL is restricted. Corrupt local JSON now raises an error instead of overwriting saved reservations. Use Postgres for production with multiple workers.

To activate notification delivery, configure an HTTPS `NOTIFICATION_WEBHOOK_URL` and a `NOTIFICATION_WEBHOOK_SECRET` of at least 32 characters. The receiver must:
1. Verify `X-Hotel-Signature` as HMAC-SHA256 of `X-Hotel-Timestamp + '.' + rawBody`, reject old timestamps, and compare signatures in constant time.
2. Deduplicate `eventId` / `Idempotency-Key` durably before sending any messages. Delivery is at least once: retries and concurrent workers can repeat the same event.
3. Send a staff alert, and an acknowledgement to the guest only if their email is present. Describe the request as pending; never promise availability or confirmation.
4. Return 2xx only after durably accepting responsibility for delivery. The admin status tracks webhook acceptance, not actual email/SMS delivery.

With no valid configuration, no external transmission occurs and events remain queued. New requests attempt delivery with a four-second timeout. Admin → Dashboard → Reservation notifications shows pending events and a retry action (up to ten per action). Failed delivery does not discard a saved request. There is no scheduled retry worker bundled; schedule a worker or use the admin action operationally. Keep the retry endpoint authenticated. Review provider data-handling and retention information before enabling the connection.

Set `NEXT_PUBLIC_SITE_URL` to the verified production origin for social images and the sitemap. `SITE_READY_FOR_INDEXING` defaults to false so placeholders are not indexed; set true only when content and policies are approved. Robots rules are not access controls; admin/API routes still require authentication.
