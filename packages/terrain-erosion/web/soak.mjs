import { chromium } from "../../../tools/productization/web-deploy/web/headless/node_modules/playwright/index.mjs";
import { mkdir, writeFile } from "node:fs/promises";
const dir = new URL("../evidence/", import.meta.url);
await mkdir(dir, { recursive: true });
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
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.goto("http://127.0.0.1:5179");
await page.waitForFunction(() => window.__bitPhysicsReady === true);
const started = Date.now(),
  samples = [];
const minutes = Number(process.env.CANYON_SOAK_MINUTES ?? 30);
for (let minute = 0; minute <= minutes; minute++) {
  if (minute) await page.waitForTimeout(60000);
  const sample = await page.evaluate(async () => {
    const a = window.__canyon,
      g = a.gpu,
      s = await g.statistics();
    return {
      steps: g.steps,
      simTime: s.clock[2],
      guard: new Uint32Array(s.clock.buffer)[1],
      ...s,
      clock: undefined,
      bytes: g.allocatedBytes,
      fps: document.querySelector("#fps").textContent,
      jsHeap: performance.memory?.usedJSHeapSize,
    };
  });
  sample.wallSeconds = (Date.now() - started) / 1000;
  samples.push(sample);
  console.log(JSON.stringify({ minute, ...sample }));
  await writeFile(
    new URL("soak-progress.json", dir),
    JSON.stringify({ minutesRequested: minutes, errors, samples }, null, 2),
  );
  if (minute === 5) {
    await page.evaluate(() => window.__canyon.gpu.edit(2, 17, 16, 1, 0.25));
  }
  if ([0, 1, 5, 10, 30].includes(minute))
    await page.screenshot({
      path: new URL(`soak-${minute}min.png`, dir).pathname,
    });
  if (!sample.finite || sample.guard || errors.length) break;
}
await browser.close();
