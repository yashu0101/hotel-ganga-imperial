# Calendar Month Grid and Staff Bookings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the admin calendar with a month grid of booking bars and let staff add room stays and events by clicking a date.

**Architecture:** The website's reservation rules move into pure helpers in `src/lib/reservation.ts`, used by both `POST /api/book` and a new admin-only `POST /api/bookings`. `addBooking()` gains options so staff bookings carry `source: "staff"`, a chosen status, and no notification job. The calendar becomes a client-side month grid with lane-packed bars; an add-booking drawer and a request drawer reuse the dashboard's `Modal` and the Requests detail.

**Tech Stack:** Next.js 16 app router, React 19, TypeScript, plain CSS (`src/app/admin/admin.css`), node:test with the transpile-and-mock loader in `tests/reservation.test.mjs`.

**Spec:** `docs/superpowers/specs/2026-11-28-calendar-staff-bookings-design.md`

## Global Constraints

- Bookings never block rooms: no availability checks, no inventory, no payment or revenue UI.
- Staff bookings: `source: "staff"`, status `pending` or `confirmed` (default `confirmed`), no notification-outbox row.
- Validation is identical to `/api/book` for name, phone, email, type, rooms (1–10), dates (today or later, Asia/Kolkata), guests (1–20 rooms, 1–300 events), special requests (≤ 500). City ≤ 100. Unknown fields → 400.
- Every admin handler checks `isAdmin()` itself; responses `{ item }` on create (201).
- Both storage backends behave identically; new Postgres column via `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source TEXT DEFAULT ''` in `prepareBookingExtensions()`.
- Every new admin string in `src/lib/i18n.ts`, en and hi.
- Any new import in a tested route must be added to that route's mocks in `tests/reservation.test.mjs` (the `adminRoute()` helper for admin routes).
- No git commits unless the user asks; verification is lint, `tsc --noEmit`, `format:check`, `npm test`, build.

## Review Focus

- A stay that starts in one week and ends in the next must draw as two bar pieces, both clickable, and count on every night (including month boundaries and stays starting before the 1st).
- Clicking past days must not open the add form (server would reject with the date error anyway); today must.
- A banquet package that is inactive, or a hidden room, must not be offered in the staff form and must be rejected by the server.
- Deleting or changing status from the calendar's request drawer must update the calendar without navigating away.
- A day with more than 3 overlapping bookings must show "+N more" and the day panel must list all of them.

---

### Task 1: Shared reservation rules

**Files:**

- Modify: `src/lib/reservation.ts`
- Modify: `src/app/api/book/route.ts`
- Test: `tests/reservation.test.mjs`

**Interfaces:**

- Produces:
  - `contactError(input: { name: string; mobile: string; email: string }): string` — "" when valid; messages exactly as `/api/book` today ("Enter your full name.", `phoneError()` text, "Enter a valid email address, or leave it blank.").
  - `resolveStay(b: Record<string, unknown>, rooms: StayRoom[], packages: StayPackage[]): { error: string } | { stay: Stay }` where `StayRoom = { id?: string; name: string; hidden?: boolean }`, `StayPackage = { name: string; active: boolean }`, `Stay = { roomType: string; roomId?: string; roomsRequested: number; checkin: string; checkout: string; guests: number; event: boolean }`. Room matched by `roomId` when given, else by name; events are `"Banquet hall"` or `"Banquet - <active package>"`; `"Dining enquiry"` allowed. Same error strings and order as the route today.

- [ ] **Step 1: Write the failing test** `"stay rules are shared: rooms, events, dining, counts and dates"` — `resolveStay` returns `{ stay }` with `roomType: "Deluxe Room"`, `roomsRequested: 2` for a valid room; `{ error: "Please choose an available room or enquiry type." }` for a hidden room and for `"Banquet - Old"` when Old is inactive; error for `roomsRequested: 11`; event with 250 guests accepted, room with 25 guests rejected; `contactError({ name: "", ... })` equals `"Enter your full name."`.
- [ ] **Step 2: Run** `node --test --test-name-pattern="stay rules" tests/reservation.test.mjs` — expect FAIL (`resolveStay is not a function`).
- [ ] **Step 3: Implement** both helpers in `src/lib/reservation.ts` and make `/api/book` call them (honeypot, rate limit position and coupon handling unchanged).
- [ ] **Step 4: Run** `npm test` — expect all tests PASS, including every existing `/api/book` test.

### Task 2: Storage for staff bookings

**Files:**

- Modify: `src/lib/types.ts` (`Booking.source?: "staff"`)
- Modify: `src/lib/db.ts` (`addBooking`, `mapBookingRow`, `prepareBookingExtensions`)
- Test: `tests/reservation.test.mjs`

**Interfaces:**

- Produces: `addBooking(b: NewBooking, options?: { status?: "pending" | "confirmed"; source?: "staff"; notify?: boolean }): Promise<Booking>` — defaults `status: "pending"`, `notify: true`, no source. `NewBooking` excludes `source`.

- [ ] **Step 1: Write failing tests** `"staff bookings are saved with their status and source and queue no notification"`: JSON backend (fake fs as in the atomic-write test) — `addBooking(..., { status: "confirmed", source: "staff", notify: false })` stores `bookingStatus: "confirmed"`, `source: "staff"`, and `notificationJobs` stays empty; Postgres fake — no `notification_outbox` insert, the bookings insert values include `"staff"` and `"confirmed"`, and a row with `source: "staff"` maps back to `source: "staff"` while `source: ""` maps to `undefined`.
- [ ] **Step 2: Run** `node --test --test-name-pattern="staff bookings are saved" tests/reservation.test.mjs` — expect FAIL.
- [ ] **Step 3: Implement** the options in both backends; Postgres inserts `source` (`""` for website) and uses the transaction only when notifying.
- [ ] **Step 4: Run** `npm test` — expect PASS (existing "Postgres saves the booking and event in the same transaction" still passes).

### Task 3: Admin `POST /api/bookings`

**Files:**

- Modify: `src/app/api/bookings/route.ts`
- Modify: `tests/reservation.test.mjs` (`adminRoute()` mocks gain `"@/lib/reservation": dates`)

**Interfaces:**

- Consumes: `contactError`, `resolveStay`, `cleanText` (Task 1); `addBooking(b, options)`, `getRooms`, `getBanquetPackages` (Task 2).
- Produces: `POST /api/bookings` body `{ name, mobile, email?, city?, roomType, roomId?, roomsRequested?, checkin, checkout?, guests, specialRequests?, bookingStatus? }` → `201 { item: Booking }`; 400 `{ error }` on any rule or unknown field; 401 when signed out; 503 via `serverError()` on read-only storage.

- [ ] **Step 1: Write failing tests** `"staff can add a confirmed booking without notifying the guest"` — signed in: valid body → 201, `addBooking` called with `city: "Pune"` and options `{ status: "confirmed", source: "staff", notify: false }`; `bookingStatus: "checked-in"` → 400; extra field `paymentStatus` → 400; past date → 400 with the `dateError` text. Signed out → 401 and storage untouched (extend the existing unauthenticated test only if `bookings` POST isn't already covered by its loop — it is, once POST exists).
- [ ] **Step 2: Run** `node --test --test-name-pattern="staff can add" tests/reservation.test.mjs` — expect FAIL (405/undefined POST).
- [ ] **Step 3: Implement** `POST` with an allow-list of the body keys above.
- [ ] **Step 4: Run** `npm test` — expect PASS.

### Task 4: Add-booking drawer and Requests integration

**Files:**

- Create: `src/components/admin/BookingForm.tsx`
- Modify: `src/components/admin/RequestTable.tsx` (export `RequestDetail`; "Added by staff" tag in row and detail; `RequestRow.staff?: boolean`)
- Modify: `src/app/admin/page.tsx` (`bookingRow` sets `staff`; "New booking" button in Requests; `addBooking` handler; `deleteRequest` no longer navigates — the Requests view does that in its own `onDelete`)
- Modify: `src/lib/i18n.ts`, `src/app/admin/admin.css`

**Interfaces:**

- Produces: `BookingForm({ rooms: Room[]; packages: BanquetPackage[]; initial?: { date?: string; type?: string }; onSaved: (b: Booking) => void; onClose: () => void })`. Type option values: `room:<id>`, `Banquet hall`, `Banquet - <name>`, `Dining enquiry`; check-out and rooms fields only for room types; date inputs `min` = `hotelDay()`. Submits via `adminRequest("/api/bookings", "POST", body)`; toast `"Booking added for {name}."`.
- Produces: `RequestDetail({ row, statuses, onClose, onStatus, onDelete, asDrawer?: boolean })`.

- [ ] **Step 1: Implement** the drawer (reuse `Modal`, `.adm-drawer`, `.adm-fieldset`, `.adm-field`), wire it to Requests, and add the tag.
- [ ] **Step 2: Verify** `npx tsc --noEmit` and `npm run lint` — expect no errors.

### Task 5: Month-grid calendar

**Files:**

- Modify: `src/components/admin/CalendarView.tsx` (rewrite)
- Create: `src/components/admin/calendar-layout.ts`
- Modify: `src/app/admin/page.tsx`, `src/app/admin/admin.css`, `src/lib/i18n.ts`
- Test: `tests/reservation.test.mjs`

**Interfaces:**

- Produces: `monthWeeks(month: string /* YYYY-MM */): string[][]` (Monday-first weeks of YYYY-MM-DD covering the month) and `layoutWeek(week: string[], items: { id: string; start: string; end: string }[], maxLanes: number): { segments: { id: string; lane: number; from: number; to: number; continuesBefore: boolean; continuesAfter: boolean }[]; hidden: number[] /* per day */ }` where `end` is the last night (inclusive). Lanes: sort by start, then longer first; first lane whose last `to` < `from`.
- Consumes: `BookingForm`, `RequestDetail` (Task 4); `changeStatus`, `deleteRequest`, booking-added handler from the page.

- [ ] **Step 1: Write failing tests** `"calendar weeks start on Monday and stays are split across weeks into lanes"` — `monthWeeks("2026-11")` first week starts `"2026-10-26"`, last week ends `"2026-12-06"`, 6 weeks; a stay 2026-11-28 → last night 2026-11-30 gives a piece in week 5 (`from: 5, to: 6, continuesAfter: true`) and in week 6 (`from: 0, to: 0, continuesBefore: true`); four overlapping one-day items with `maxLanes: 3` give 3 segments and `hidden[day] === 1`.
- [ ] **Step 2: Run** `node --test --test-name-pattern="calendar weeks" tests/reservation.test.mjs` — expect FAIL.
- [ ] **Step 3: Implement** `calendar-layout.ts`, then the month grid: header (month nav, Today, room filter, legend, New booking), 7-column weeks, bars coloured by status tone, nightly rooms figure, past days shaded, empty-area click → `BookingForm` with date and filter type, bar → `RequestDetail` in a drawer, "+N more"/day number → day panel drawer.
- [ ] **Step 4: Run** `npm test` — expect PASS.

### Task 6: Verify and document

**Files:**

- Modify: `CLAUDE.md` (bookings routes and admin dashboard paragraphs)

- [ ] **Step 1:** Seed sample bookings into `data/db.json` (backup first), screenshot the calendar at 1920×950 and 1366×768 in light and dark, the add drawer, a request drawer and a busy day panel; add a booking through the UI and confirm it appears on the calendar and in Requests with "Added by staff"; restore `data/db.json` and confirm its hash matches the backup.
- [ ] **Step 2:** Update CLAUDE.md: `bookings` allows staff `POST` (no notification, `source: "staff"`) alongside status changes; calendar description.
- [ ] **Step 3:** Run `npm run lint`, `npx tsc --noEmit`, `npm run format:check`, `npm test`, `npm run build` — all clean.
