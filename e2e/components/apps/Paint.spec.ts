import { expect, test } from "@playwright/test";

test("Paint loads its local editor and exposes a drawable canvas", async ({ page }) => {
  await page.goto("/?app=Paint");
  const paint = page.frameLocator('iframe[id^="jspaint-"]');
  await expect(paint.locator("canvas.main-canvas")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText("Paint could not start.")).toHaveCount(0);
});

test("Paint can draw without WebGL and save a PNG on the desktop", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type, ...args) {
      if (type === "webgl" || type === "experimental-webgl") return null;
      return original.call(this, type, ...args);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });

  await page.goto("/?app=Paint");
  const frame = page.frameLocator('iframe[id^="jspaint-"]');
  await expect(frame.locator("canvas.main-canvas")).toBeVisible({
    timeout: 30_000,
  });

  const result = await page.locator('iframe[id^="jspaint-"]').evaluate(async (
    element
  ) => {
    const frame = (element as HTMLIFrameElement).contentWindow as Window & {
      draw_line_strip: (
        context: CanvasRenderingContext2D,
        points: { x: number; y: number }[]
      ) => void;
      systemHooks: {
        showSaveFileDialog: (options: {
          defaultFileName: string;
          getBlob: (type: string) => Promise<Blob>;
          savedCallbackUnreliable: (value: {
            newFileName: string;
            newFileFormatID: string;
          }) => void;
        }) => Promise<void>;
      };
    };
    const canvas = frame.document.querySelector(
      "canvas.main-canvas"
    ) as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Paint canvas unavailable");

    ctx.strokeStyle = "#ff0000";
    frame.draw_line_strip(ctx, [{ x: 15, y: 15 }, { x: 110, y: 110 }]);
    const pixel = ctx.getImageData(65, 65, 1, 1).data;
    let savedName = "";
    await frame.systemHooks.showSaveFileDialog({
      defaultFileName: "Paint test.png",
      getBlob: async () => new Blob(["test"], { type: "image/png" }),
      savedCallbackUnreliable: ({ newFileName, newFileFormatID }) => {
        if (newFileFormatID !== "image/png") {
          throw new Error("Unexpected saved image format");
        }
        savedName = newFileName;
      },
    });

    return { drawn: pixel[0] > 100 && pixel[1] < 100, savedName };
  });

  expect(result.drawn).toBe(true);
  expect(result.savedName).toBe("Paint test.png");
  await expect(page.locator('main > ol button[aria-label="Paint test"]')).toBeVisible();
});
