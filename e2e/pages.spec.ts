import { expect, test } from "@playwright/test";
import { skipWelcome } from "./helpers";

for (const path of ["/privacy", "/guest-information"]) {
  test(`${path} renders`, async ({ page }) => {
    await skipWelcome(page);
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
}
