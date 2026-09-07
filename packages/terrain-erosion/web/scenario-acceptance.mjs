import { chromium } from "../../../tools/productization/web-deploy/web/headless/node_modules/playwright/index.mjs";
import { writeFile } from "node:fs/promises";
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
const page = await browser.newPage();
await page.goto("http://127.0.0.1:5178");
await page.waitForFunction(() => window.__bitPhysicsReady);
await page.evaluate(() => window.__canyon.pause());
const results = await page.evaluate(async () => {
  const app = window.__canyon;
  const rows = [];
  for (const scene of ["plateau", "heist", "breach", "shield"]) {
    app.reset(scene);
    const g = app.gpu;
    const initial = await g.snapshot();
    const baseline = await g.statistics();
    for (let k = 0; k < 60; k++) {
      g.step(100);
      await g.device.queue.onSubmittedWorkDone();
    }
    const a = await g.read();
    const result = await g.statistics();
    g.restore(initial);
    if (scene === "heist")
      for (let y = 8; y <= 21; y += 0.5) g.edit(2, 16, y, 1.15, 0.8);
    else if (scene === "breach") g.edit(2, 18, 12.8, 1.2, 1.2);
    else g.params.source[3] *= 2;
    for (let k = 0; k < 60; k++) {
      g.step(100);
      await g.device.queue.onSubmittedWorkDone();
    }
    const b = await g.read();
    const altered = await g.statistics();
    let response = 0;
    for (let i = 0; i < a.length; i += 16) response += Math.abs(a[i] - b[i]);
    rows.push({
      scene,
      finite: result.finite && altered.finite,
      initialWater: baseline.water,
      initialGrain: baseline.solid,
      cut: result.cut,
      deposition: result.deposited,
      simTime: result.clock[2],
      waterResponseL1: response * g.params.dx ** 2,
      waterError:
        Math.abs(result.water - baseline.water) /
        Math.max(result.storedWater, 1),
      grainError:
        Math.abs(result.solid - baseline.solid) /
        Math.max(result.cover + result.cut + result.suspended, 1),
      alteredWaterError:
        Math.abs(altered.water - baseline.water) /
        Math.max(altered.storedWater, 1),
      alteredGrainError:
        Math.abs(altered.solid - baseline.solid) /
        Math.max(altered.cover + altered.cut + altered.suspended, 1),
    });
  }
  return rows;
});
console.log(results);
await writeFile(
  new URL("../evidence/scenarios.json", import.meta.url),
  JSON.stringify(results, null, 2),
);
await browser.close();
if (
  results.some(
    (r) =>
      !r.finite ||
      r.cut < 0.1 ||
      r.deposition < 0.01 ||
      r.waterResponseL1 < 0.05 ||
      Math.max(
        r.waterError,
        r.grainError,
        r.alteredWaterError,
        r.alteredGrainError,
      ) > 2e-4,
  )
)
  throw Error("Scenario acceptance failed");
