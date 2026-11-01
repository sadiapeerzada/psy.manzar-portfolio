import { expect, test } from "@playwright/test";

test("Paint displays a canvas rather than an error-only screen", async ({
  page,
}) => {
  await page.goto("/?app=Paint");

  await expect(async () => {
    const classicCount = await page
      .frameLocator('iframe[id^="jspaint-"]')
      .locator("canvas.main-canvas")
      .count();
    const fallbackCount = await page
      .locator('canvas[aria-label="Paint drawing canvas"]')
      .count();

    expect(classicCount + fallbackCount).toBeGreaterThan(0);
  }).toPass({ timeout: 25_000 });
});

test("Paint falls back to a usable canvas when the bundled editor fails", async ({
  page,
}) => {
  await page.route("**/jspaint/index.html", async (route) => {
    await route.fulfill({
      body: "<!doctype html><html><body>Unavailable</body></html>",
      contentType: "text/html",
      status: 503,
    });
  });

  await page.goto("/?app=Paint");
  const canvas = page.locator('canvas[aria-label="Paint drawing canvas"]');

  await expect(canvas).toBeVisible({ timeout: 25_000 });
  const bounds = await canvas.boundingBox();

  if (!bounds) throw new Error("Fallback canvas not visible");

  await page.mouse.move(bounds.x + 12, bounds.y + 12);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 80, bounds.y + 80, { steps: 8 });
  await page.mouse.up();

  const hasDrawing = await canvas.evaluate((element) => {
    const item = element as HTMLCanvasElement;
    const pixel = item.getContext("2d")?.getImageData(48, 48, 1, 1).data;

    return Boolean(pixel && pixel[0] < 245);
  });

  expect(hasDrawing).toBe(true);
  await page.getByRole("button", { name: "Save PNG" }).click();
  await expect(page.getByText(/Saved .*\.png to Desktop\./)).toBeVisible();
});
