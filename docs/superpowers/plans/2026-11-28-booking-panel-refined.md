# New Booking Panel, Refined — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the New booking side panel: type cards, live summary, steppers, segmented status, tighter layout.

**Architecture:** Presentation-only change to `src/components/admin/BookingForm.tsx` plus its CSS and strings. The request body sent to `POST /api/bookings` is unchanged. The one piece of logic (clamping stepper values to the server limits) is a pure helper in `src/components/admin/format.ts` with a unit test.

**Tech Stack:** React 19 client component, plain CSS in `src/app/admin/admin.css`, node:test.

**Spec:** `docs/superpowers/specs/2026-11-28-booking-panel-refined-design.md`

## Global Constraints

- Limits match the server: rooms 1–10; guests 1–20 (rooms, dining) or 1–300 (events).
- One accent (brass), radii 6 / 10 / 999, strings in en + hi, no new dependencies, no commits unless asked.
- Cards are a native radio group; steppers are labelled buttons around a number input; summary is `aria-live="polite"`.

## Review Focus

- Switching from a room card to an event card must drop check-out/rooms from the summary and raise the guest cap to 300; switching back must clamp guests to 20.
- Typing an out-of-range number then pressing a stepper must land inside the limits.
- Many banquet packages must wrap, not overflow the 520px panel.

---

### Task 1: Stepper clamp helper

**Files:** Modify `src/components/admin/format.ts`; Test `tests/reservation.test.mjs`

**Interfaces:** Produces `clampCount(value: string | number, min: number, max: number): number` — non-numbers become `min`; decimals round down.

- [ ] **Step 1:** Test `"booking steppers stay within the server's limits"` — `clampCount("0",1,10) === 1`, `clampCount(11,1,10) === 10`, `clampCount("abc",1,20) === 1`, `clampCount("2.7",1,20) === 2`, `clampCount(250,1,20) === 20`.
- [ ] **Step 2:** Run `node --test --test-name-pattern="booking steppers" tests/reservation.test.mjs` — expect FAIL (`clampCount is not a function`).
- [ ] **Step 3:** Implement in `format.ts`.
- [ ] **Step 4:** Run `npm test` — expect PASS.

### Task 2: Refined panel

**Files:** Modify `src/components/admin/BookingForm.tsx`, `src/app/admin/admin.css`, `src/lib/i18n.ts`

- [ ] **Step 1:** Summary card (type × rooms, weekday dates, nights, guests, status), type cards (Rooms with rate; Events: hall + active packages; Other: dining), steppers using `clampCount`, segmented status, field layout per spec, drawer class `adm-drawer booking` (~520px).
- [ ] **Step 2:** `npx tsc --noEmit`, `npm run lint` — clean.

### Task 3: Verify

- [ ] **Step 1:** Seed sample data (backup `data/db.json`), screenshot the panel at 1440×900 light and dark with a room and with an event selected, add a booking through it, restore `data/db.json` and confirm the hash.
- [ ] **Step 2:** `npm run format:check`, `npm test`, `npm run build` — clean.
