import { chromium } from "../../../tools/productization/web-deploy/web/headless/node_modules/playwright/index.mjs";
import { writeFile, mkdir } from "node:fs/promises";
const out = "/tmp/canyon-evidence";
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
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:5178");
await page.waitForTimeout(4000);
console.log("boot", await page.locator("#boot").textContent());
console.log("errors", errors.slice(0, 10));
if (!errors.length) {
  await page.evaluate(() => window.__canyon.pause());
  console.log(
    "adapter",
    await page.evaluate(async () => {
      const a = await navigator.gpu.requestAdapter();
      return {
        info: { ...a.info },
        description: a.info.description,
        architecture: a.info.architecture,
        vendor: a.info.vendor,
      };
    }),
  );
  await page.screenshot({ path: out + "/initial.png" });
  console.log("proof", await page.evaluate(() => window.__canyon.prove()));
  await page.evaluate(() =>
    document.querySelector('[data-bp="capture"]').click(),
  );
  await page.waitForFunction(
    () => window.__bitPhysicsCaptureReady === true,
    {},
    { timeout: 120000 },
  );
  await writeFile(
    out + "/canonical.json",
    JSON.stringify(await page.evaluate(() => window.__bitPhysicsCapture)),
  );
  await page.evaluate(() => window.__canyon.resume());
  await page.waitForTimeout(15000);
  await page.screenshot({ path: out + "/evolved.png" });
  console.log("readout", await page.locator("#readout").innerText());
}
await writeFile(out + "/errors.json", JSON.stringify(errors));
await browser.close();
