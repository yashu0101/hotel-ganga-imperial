import { expect, test } from "@playwright/test";
import { addStaffBooking, signIn, skipWelcome, uniqueGuest } from "./helpers";

test.beforeEach(async ({ page }) => {
  await skipWelcome(page);
});

test("a deleted request goes to Deleted, can be restored, and both steps appear in Activity", async ({ page }) => {
  const name = uniqueGuest("E2E Deleted Guest");
  await signIn(page);
  const reference = (await addStaffBooking(page, name)).slice(0, 8).toUpperCase();
  await page.reload();
  const nav = page.getByRole("navigation");

  await nav.getByRole("link", { name: /^Requests\b/ }).click();
  await page.getByRole("searchbox", { name: "Search name, phone, email or reference" }).fill(name);
  await page.getByRole("row").filter({ hasText: name }).getByRole("button", { name }).click();
  await page.getByRole("complementary").getByRole("button", { name: "Delete request" }).click();
  const confirm = page.getByRole("dialog");
  await expect(confirm).toContainText("restore it for 30 days");
  await confirm.getByRole("button", { name: "Delete request" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Moved to Deleted" })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: name })).toHaveCount(0);

  await nav.getByRole("link", { name: /^Deleted\b/ }).click();
  const deletedRow = page.getByRole("row").filter({ hasText: name });
  await expect(deletedRow).toContainText(reference);
  await deletedRow.getByRole("button", { name: /Restore/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "request is back" })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: name })).toHaveCount(0);

  await nav.getByRole("link", { name: /^Requests\b/ }).click();
  await page.getByRole("searchbox", { name: "Search name, phone, email or reference" }).fill(name);
  await expect(page.getByRole("row").filter({ hasText: name })).toHaveCount(1);

  // The activity log names the request by its reference only.
  await nav.getByRole("link", { name: /^Activity\b/ }).click();
  const entries = page.getByRole("row").filter({ hasText: reference });
  await expect(entries.filter({ hasText: "Deleted" })).toHaveCount(1);
  await expect(entries.filter({ hasText: "Restored" })).toHaveCount(1);
  await expect(page.getByRole("table")).not.toContainText(name);
});

test("hotel policies saved in Settings appear on the guest information page", async ({ page }) => {
  const checkIn = "1:00 pm (" + Date.now().toString(36) + ")";
  await signIn(page);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: /^Settings\b/ })
    .click();
  await page.getByLabel("Check-in time").fill(checkIn);
  await page.getByLabel("Check-out time").fill("11:00 am");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Settings saved" })).toBeVisible();

  await page.goto("/guest-information");
  await expect(page.getByText(checkIn)).toBeVisible();
});

test("staff can download requests as CSV; signed-out visitors can't", async ({ page, request }) => {
  const name = uniqueGuest("E2E Export Guest");
  expect((await request.get("/api/bookings/export")).status()).toBe(401);

  await signIn(page);
  await addStaffBooking(page, name);
  const res = await page.request.get("/api/bookings/export");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/csv");
  expect(res.headers()["content-disposition"]).toMatch(/attachment; filename="requests-\d{4}-\d{2}-\d{2}\.csv"/);
  const csv = await res.text();
  expect(csv).toContain("Reference,Received,Name,Phone,Email");
  expect(csv).toContain(name);
});
