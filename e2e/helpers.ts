import type { APIRequestContext, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { E2E_ADMIN } from "./env";

/** The welcome gates play once per browser session; mark this session as having seen them (see layout.tsx). */
export async function skipWelcome(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem("welcome-seen", "1"));
}

/** A YYYY-MM-DD date `days` from today in hotel time (Asia/Kolkata), as the booking form expects. */
export function hotelDate(days: number) {
  return new Date(Date.now() + days * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/** A guest name no other test or run uses, so searches find exactly this request. */
export function uniqueGuest(prefix: string) {
  return `${prefix} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Sends a valid two-night room request through the public API, as the /book form does. Returns its reference. */
export async function sendRoomRequest(request: APIRequestContext, name: string) {
  const rooms = await request.get("/api/rooms");
  expect(rooms.ok()).toBeTruthy();
  const room = ((await rooms.json()) as { id: string; name: string; hidden?: boolean }[]).find(r => !r.hidden);
  expect(room, "a visible room to request").toBeTruthy();
  const res = await request.post("/api/book", {
    data: {
      name,
      mobile: "+91 98765 43210",
      email: "",
      roomType: room!.name,
      roomId: room!.id,
      checkin: hotelDate(60),
      checkout: hotelDate(62),
      guests: 2,
      roomsRequested: 1,
      specialRequests: "",
      website: "",
      couponCode: "",
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  return ((await res.json()) as { reference: string }).reference;
}

export async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(E2E_ADMIN.email);
  await page.getByLabel("Password").fill(E2E_ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin(#.*)?$/);
}

/**
 * Adds a confirmed booking as staff (POST /api/bookings) with the signed-in page's session. Unlike the public form it
 * is not rate-limited per address, so tests that only need a request to exist leave the guest limit to the /book tests.
 */
export async function addStaffBooking(page: Page, name: string) {
  const rooms = await page.request.get("/api/rooms");
  const room = ((await rooms.json()) as { id: string; name: string; hidden?: boolean }[]).find(r => !r.hidden);
  expect(room, "a visible room to book").toBeTruthy();
  const res = await page.request.post("/api/bookings", {
    data: {
      name,
      mobile: "+91 98765 43210",
      email: "",
      roomType: room!.name,
      roomId: room!.id,
      checkin: hotelDate(60),
      checkout: hotelDate(62),
      guests: 2,
      roomsRequested: 1,
      bookingStatus: "confirmed",
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  return ((await res.json()) as { item: { id: string } }).item.id;
}
