import { expect, test } from "@playwright/test";
import { closePage, disableWallpaper, loadApp } from "e2e/functions";

test.beforeEach(disableWallpaper);
test.afterEach(closePage);

test("Chess accepts a legal move in two-player mode", async ({ page }) => {
  await loadApp({ app: "Chess" })({ page });

  const board = page.getByRole("application", { name: "Chess board" });
  await expect(board).toBeVisible({ timeout: 60_000 });
  await page.locator('select[id^="chess-mode-"]').selectOption("hvh");
  await board.locator('[data-square-coord="e2"]').click();
  await board.locator('[data-square-coord="e4"]').click();
  await expect(page.locator("div.status")).toContainText("Black to move");
});

const canvasGames = [
  { app: "DXBall", canvas: "#dx-ball" },
  { app: "ClassiCube", frame: "ClassiCube" },
  { app: "Quake3", frame: "Quake III Arena" },
  { app: "SpaceCadet", frame: "Space Cadet" },
] as const;

for (const game of canvasGames) {
  test(`${game.app} starts a visible, interactive canvas`, async ({ page }) => {
    test.setTimeout(120_000);

    await loadApp({ app: game.app })({ page });

    const canvas =
      "frame" in game
        ? page.frameLocator(`iframe[title="${game.frame}"]`).locator("canvas")
        : page.locator(game.canvas);

    // AppContainer hides its children until the game finishes loading.
    await expect(canvas).toBeVisible({ timeout: 90_000 });

    const dimensions = await canvas.evaluate((element) => {
      const { height, width } = element as HTMLCanvasElement;
      return { height, width };
    });

    expect(dimensions.width).toBeGreaterThan(0);
    expect(dimensions.height).toBeGreaterThan(0);

    await canvas.click();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowRight");
  });
}

test("Chrome Dino loads its game canvas", async ({ page }) => {
  await loadApp({ app: "Browser", url: "chrome://dino" })({ page });

  const dinoCanvas = page
    .frameLocator('iframe[title*="Browser"]')
    .locator("canvas");

  await expect(dinoCanvas).toBeVisible({ timeout: 30_000 });
  await dinoCanvas.click();
  await page.keyboard.press("Space");
});

test("Desktop DOOM opens the playable host in a new tab", async ({ page }) => {
  await loadApp()({ page });

  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "DOOM", exact: true }).dblclick();
  const popup = await popupPromise;

  await expect.poll(() => popup.url()).toContain("silentspacemarine.com");
  await popup.close();
});
