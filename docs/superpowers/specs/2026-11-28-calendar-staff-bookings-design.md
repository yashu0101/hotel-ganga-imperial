# Calendar redesign and staff-added bookings

Date: 2026-11-28 · Status: proposed

## Intent

Staff take bookings by phone, WhatsApp and at the desk, but the dashboard can only show requests guests sent from the
website. Staff want a calendar that is pleasant to read at a glance and lets them click a date to record a room stay or
an event straight away. Desktop first.

## Goals

- A month-grid calendar (7 columns, Monday first) that shows every active booking on the nights it covers.
- Click an empty part of a day to add a booking for that date, for a room type or an event.
- Click a booking on the calendar to see and act on it without leaving the calendar.
- Staff-added bookings are clearly marked and behave like any other request afterwards (status changes, delete,
  Today, analytics).

## Non-goals

- No inventory, availability checks or overbooking warnings. Bookings still never block rooms (project rule).
- No payments, deposits or prices beyond the existing free-text fields.
- No editing of a booking's details after it is saved (still status-only, as today). Wrong details: delete and re-add.
- No drag-and-drop of bookings between dates.

## Anti-goals

- Guests must not receive an automatic "we received your request" acknowledgement for a booking staff entered while
  speaking to them.
- The public booking form's rules (rate limit, honeypot, coupon handling) must not loosen.

## Constraints

- Two storage backends with identical behaviour (Postgres, `data/db.json`). New columns are added by additive DDL in
  `prepareBookingExtensions()`.
- Every admin handler checks the session itself (`isAdmin()`), unknown fields are rejected, dates are hotel dates
  (Asia/Kolkata), and the UI changes only after the server confirms (`adminRequest()`).
- Every admin string goes through `src/lib/i18n.ts` (en + hi).
- Tests load routes with a mocks map; new imports in tested routes must be mocked.

## Approaches considered (picked by the user)

1. **Timeline bars:** room types down the side, days across, bars per stay. Best for "which room type when"; not picked.
2. **Month grid (picked):** classic 7-column month. Familiar; multi-night stays are shown as bars spanning their nights
   within each week row (Google-Calendar style), so length of stay stays visible.
3. **Polished count grid:** restyle of today's numbers grid. Least change; names hidden behind clicks; not picked.

Booking types (picked): **rooms and events** from the same form.

## Design

### Calendar (month grid)

- Header: month name with previous/next/today; a room-type filter ("All rooms", each visible room type, "Events and
  other"); a status legend.
- Grid: 7 columns Mon–Sun, 5–6 week rows filling the workspace width. Days outside the month are dimmed. Today is
  ringed in brass. Past days are shaded and cannot take new bookings.
- Each week row lays bookings out in lanes. A room stay is a bar from check-in to the night before check-out, clipped at
  the week edge with a notched end when it continues. A single-day booking (event, dining) is a one-day chip. Bars show
  the guest name, plus "× 2" for several rooms; colour follows the status tones (waiting amber, confirmed blue, in house
  green). Only active statuses are shown (pending, confirmed, checked-in), as today.
- At most 3 lanes per week are drawn; a day with more shows "+N more", which opens the day panel.
- Each day cell shows the total rooms requested that night (small figure, top right) so busy nights stand out.
- Clicking:
  - an empty area of today or a future day → **Add booking** drawer, date pre-filled, type pre-filled from the room
    filter (first room type when "All rooms").
  - a bar/chip → **request drawer** over the calendar, reusing the Requests detail (contact buttons, stay facts,
    status picker, delete).
  - "+N more" or a day number → **day panel** drawer: every booking that night, plus "Add booking on this day".
- Keyboard: every bar, chip and day is a button with an accessible name ("Add booking on Tuesday 1 December",
  "Aarav Mehta, Deluxe Room, 1–3 Dec, Confirmed").

### Add booking drawer

Fields (grouped like the content editors):

- **Booking**: type (select: each visible room type; "Banquet hall"; each active banquet package as
  "Banquet - <name>"; "Dining enquiry"), rooms (1–10, rooms only), check-in / event date, check-out (rooms only),
  guests (1–20 rooms, 1–300 events).
- **Guest**: name (required), phone (required, same rule as the website), email (optional), city (optional).
- **Notes**: special requests (≤ 500).
- **Status**: Confirmed (default) or Pending.
- A "New booking" button also sits in the calendar header and the Requests page header.

Saving calls `POST /api/bookings`; on success the drawer closes, the toast says "Booking added for <name>", and the new
booking appears on the calendar and in Requests.

### Server

- `POST /api/bookings` (admin only): validates with the same rules as `/api/book` — shared through a new
  `validateReservation()` in `src/lib/reservation.ts` that both routes call — plus `bookingStatus` limited to
  pending/confirmed and `city` (≤ 100). Unknown fields are rejected. No rate limit or honeypot (staff only). Coupons are
  not offered to staff.
- `addBooking(b, options)` gains `{ status, source, notify }`. Staff bookings: `source: "staff"`, chosen status,
  `notify: false` (no outbox row, so no guest acknowledgement). Website bookings are unchanged.
- New optional `Booking.source?: "website" | "staff"` (absent = website). Postgres: `source TEXT DEFAULT ''` added in
  `prepareBookingExtensions()`; JSON: stored on the record.
- Requests table and detail show an "Added by staff" tag; analytics are unchanged (staff bookings count as requests).

### Tests

- `POST /api/bookings`: 401 without a session; validation errors match `/api/book` wording; saves with the chosen
  status and `source: "staff"`; writes no notification job.
- `/api/book` tests keep passing after the shared validation is extracted.

## Left to the builder

- Exact lane-packing algorithm and bar styling within the stated rules.
- Whether the day panel and request drawer share one drawer component.
- Hindi copy for the new strings.
