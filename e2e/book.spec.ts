import { expect, test, type Page } from "@playwright/test";
import { hotelDate, skipWelcome, uniqueGuest } from "./helpers";

/** Counts reservation requests the page sends, so a test can show that nothing was sent. */
function countBookRequests(page: Page) {
  const sent: string[] = [];
  page.on("request", r => {
    if (r.method() === "POST" && new URL(r.url()).pathname === "/api/book") sent.push(r.url());
  });
  return sent;
}

async function openForm(page: Page) {
  await skipWelcome(page);
  await page.goto("/book");
  await expect(page.getByRole("heading", { level: 1, name: "Plan your stay" })).toBeVisible();
  // The submit button is enabled once the latest rooms and packages have loaded.
  await expect(page.getByRole("button", { name: "Send reservation request" })).toBeEnabled();
}

async function fillValidRoomRequest(page: Page, name: string) {
  await page.getByLabel("Check-in").fill(hotelDate(60));
  await page.getByLabel("Check-out").fill(hotelDate(62));
  await page.getByLabel("Guests in your party", { exact: true }).fill("3");
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Phone number").fill("+91 98765 43210");
}

test("a guest sends a room request and gets a pending receipt with a reference", async ({ page }) => {
  await openForm(page);
  const name = uniqueGuest("E2E Guest");
  await fillValidRoomRequest(page, name);
  await expect(page.getByRole("complementary", { name: "Your request" })).toContainText("2 nights");
  await page.getByRole("button", { name: "Send reservation request" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Thank you. We have your request." })).toBeVisible();
  const receipt = page.getByRole("status").filter({ hasText: "Your plans, received." });
  await expect(receipt).toContainText(/Reference [0-9A-F]{8}/);
  await expect(receipt).toContainText("PENDING HOTEL CONFIRMATION");
  await expect(receipt).toContainText(name);
  await expect(receipt).toContainText("(2 nights)");
  await expect(receipt).toContainText("Your reservation is not confirmed yet.");

  // Never claims the stay is confirmed: every "confirmed" on the page is "not confirmed".
  const text = await page.locator("main").innerText();
  const confirmed = text.match(/\b\w+\s+confirmed\b/gi) ?? [];
  expect(
    confirmed.every(m => /^not\s/i.test(m)),
    confirmed.join(", "),
  ).toBe(true);
  expect(text).not.toMatch(/\b(booking|reservation|stay) (is|has been) confirmed\b/i);
});

test("submitting with missing details shows validation errors and sends nothing", async ({ page }) => {
  const sent = countBookRequests(page);
  await openForm(page);

  // Nothing filled in: the browser blocks the form and marks the first required field.
  await page.getByRole("button", { name: "Send reservation request" }).click();
  const checkin = page.getByLabel("Check-in");
  await expect(checkin).toBeFocused();
  expect(await checkin.evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
  expect(await page.getByLabel("Full name").evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);

  // Dates and name filled, but the phone number is not a real one: the form's own check explains the problem.
  await page.getByLabel("Check-in").fill(hotelDate(60));
  await page.getByLabel("Check-out").fill(hotelDate(62));
  await page.getByLabel("Full name").fill(uniqueGuest("E2E Invalid"));
  await page.getByLabel("Phone number").fill("12");
  await page.getByRole("button", { name: "Send reservation request" }).click();
  const phone = page.getByLabel("Phone number");
  await expect(phone).toHaveAttribute("aria-invalid", "true");
  await expect(phone).toBeFocused();
  await expect(phone).toHaveAccessibleDescription(/10 to 15 digits/);

  // Check-out on the day of check-in: the date error appears on the dates.
  await phone.fill("+91 98765 43210");
  await page.getByLabel("Check-out").fill(hotelDate(60));
  await page.getByRole("button", { name: "Send reservation request" }).click();
  const checkout = page.getByLabel("Check-out");
  await expect(checkout).toHaveAttribute("aria-invalid", "true");
  await expect(checkout).toHaveAccessibleDescription(/end date must be after/);
  await expect(checkout).toBeFocused();

  await expect(page.getByRole("heading", { name: "Thank you. We have your request." })).toHaveCount(0);
  expect(sent).toEqual([]);
});

test("an invalid offer code is reported on the offer code field and the request is not sent", async ({ page }) => {
  await openForm(page);
  await fillValidRoomRequest(page, uniqueGuest("E2E Coupon"));
  const code = page.getByLabel("Offer code");
  await code.fill("NOSUCHCODE123");
  await page.getByRole("button", { name: "Send reservation request" }).click();

  await expect(code).toHaveAttribute("aria-invalid", "true");
  await expect(code).toHaveAccessibleDescription(/not valid or has expired/);
  await expect(code).toBeFocused();
  await expect(page.getByRole("heading", { name: "Thank you. We have your request." })).toHaveCount(0);

  // Editing the code clears the error.
  await code.fill("");
  await expect(code).not.toHaveAttribute("aria-invalid", "true");
});
