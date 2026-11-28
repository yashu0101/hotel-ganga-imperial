import { expect, test, type Page } from "@playwright/test";

const gates = (page: Page) => page.getByLabel("Welcome to Hotel Ganga Imperial");

test("the welcome gates play on the first visit, a key skips them, and they stay hidden for the session", async ({
  page,
}) => {
  // Hold the page's timers so the intro cannot finish on its own: only the key press can remove it.
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveAttribute("data-welcome-seen");
  await expect(gates(page)).toBeVisible();
  // The key listener is attached once the page hydrates; keep pressing until the gates leave the page.
  await expect(async () => {
    await page.keyboard.press("Escape");
    await expect(gates(page)).toHaveCount(0, { timeout: 1000 });
  }).toPass({ timeout: 30_000 });
  expect(await page.evaluate(() => sessionStorage.getItem("welcome-seen"))).toBe("1");

  // A second visit in the same session: the inline script marks <html> before paint and CSS hides the gates.
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-welcome-seen", "1");
  await expect(gates(page)).toBeHidden();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
