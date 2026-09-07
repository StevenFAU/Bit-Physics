import { chromium } from "../../../tools/productization/web-deploy/web/headless/node_modules/playwright/index.mjs";
import { mkdir, writeFile } from "node:fs/promises";
const out = new URL("../evidence/ui/", import.meta.url);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-gpu-sandbox",
    "--enable-unsafe-webgpu",
    "--enable-features=Vulkan",
    "--use-angle=vulkan",
    "--use-vulkan",
  ],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [],
  results = {};
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto("http://127.0.0.1:5178");
await page.waitForFunction(() => window.__bitPhysicsReady === true);
await page.evaluate(() => window.__canyon.pause());
await page.waitForTimeout(1000);
await page.screenshot({ path: new URL("desktop.png", out).pathname });
await page.locator("#checkpoint").click();
await page.waitForTimeout(200);
const before = await page.evaluate(async () =>
  Array.from((await window.__canyon.gpu.snapshot()).data),
);
await page.getByRole("button", { name: "Build", exact: true }).click();
await page.mouse.move(750, 470);
await page.mouse.down();
await page.waitForTimeout(800);
await page.mouse.up();
await page.waitForTimeout(150);
const after = await page.evaluate(async () =>
  Array.from((await window.__canyon.gpu.snapshot()).data),
);
results.buildChangesTerrain = after.some(
  (x, i) => i % 16 === 6 && x > before[i],
);
await page.locator("#inspect").click();
await page.getByRole("button", { name: "Project & quality" }).click();
await page.getByRole("button", { name: "Replay edits", exact: true }).click();
await page.waitForTimeout(800);
results.replayExact =
  (await page.locator("#toast").textContent()) ===
  "Replay matches the original state exactly";
await page.getByRole("button", { name: "Project & quality" }).click();
await page.locator("#inspect").click();
await page.locator("#undo").click();
await page.waitForTimeout(150);
const undone = await page.evaluate(async () =>
  Array.from((await window.__canyon.gpu.snapshot()).data),
);
results.undoExact = before.every((x, i) => x === undone[i]);
await page.locator("#section-toggle").click();
await page.locator("#inspect").click();
await page.waitForTimeout(1000);
await page.screenshot({ path: new URL("instruments.png", out).pathname });
const downloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: "Project & quality" }).click();
await page.getByRole("button", { name: "Export project", exact: true }).click();
const download = await downloadPromise;
await download.saveAs(new URL("project.json", out).pathname);
await page.locator("#reset").click();
await page
  .locator("input[type=file]")
  .setInputFiles(new URL("project.json", out).pathname);
await page.waitForTimeout(1000);
const imported = await page.evaluate(async () =>
  Array.from((await window.__canyon.gpu.snapshot()).data),
);
results.importExact = before.every((x, i) => x === imported[i]);
await page.locator("#inspect").click();
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
await page.screenshot({ path: new URL("mobile.png", out).pathname });
results.mobileOverflow = await page.evaluate(
  () => document.documentElement.scrollWidth > innerWidth,
);
await page.setViewportSize({ width: 1920, height: 1080 });
await page.waitForTimeout(300);
await page.screenshot({ path: new URL("wide.png", out).pathname });
await page.evaluate(() => (document.documentElement.style.zoom = "2"));
await page.waitForTimeout(300);
await page.screenshot({ path: new URL("zoom-200.png", out).pathname });
results.zoomOverflow = await page.evaluate(
  () => document.documentElement.scrollWidth > innerWidth,
);
results.errors = errors;
console.log(results);
await writeFile(new URL("results.json", out), JSON.stringify(results, null, 2));
await browser.close();
if (
  !results.buildChangesTerrain ||
  !results.undoExact ||
  !results.importExact ||
  !results.replayExact ||
  results.mobileOverflow ||
  results.zoomOverflow ||
  errors.length
)
  throw Error("UI acceptance failed");
