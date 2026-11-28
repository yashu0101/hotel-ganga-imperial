import { expect, test } from "@playwright/test";
import { sendRoomRequest, signIn, skipWelcome, uniqueGuest } from "./helpers";

test("staff sign in, find a guest's request, and sign out", async ({ page, request }) => {
  const name = uniqueGuest("E2E Admin Guest");
  const reference = await sendRoomRequest(request, name);

  await skipWelcome(page);
  await signIn(page);
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

  await page
    .getByRole("navigation")
    .getByRole("link", { name: /^Requests\b/ })
    .click();
  await expect(page).toHaveURL(/#requests$/);
  await expect(page.getByRole("heading", { level: 1, name: "Requests" })).toBeVisible();
  await page.getByRole("searchbox", { name: "Search name, phone, email or reference" }).fill(name);
  const row = page.getByRole("row").filter({ hasText: name });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText(reference.slice(0, 8).toUpperCase());

  // Opening the request shows its details beside the list.
  await row.getByRole("button", { name }).click();
  await expect(page).toHaveURL(new RegExp("#requests/" + reference + "$"));

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(/\/login$/);
  await expect(page.getByRole("heading", { level: 1, name: "Admin Login" })).toBeVisible();

  // The session is over: the dashboard sends staff back to the login page.
  await page.goto("/admin");
  await page.waitForURL(/\/login$/);
  expect((await page.request.get("/api/auth/me")).ok()).toBe(false);
});

test("a wrong password is refused and stays on the login page", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("e2e@example.com");
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  const email = page.getByLabel("Email");
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(email).toHaveAccessibleDescription("Invalid email or password.");
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/api/auth/me")).ok()).toBe(false);
});
