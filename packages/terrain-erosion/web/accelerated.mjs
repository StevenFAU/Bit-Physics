import { chromium } from "../../../tools/productization/web-deploy/web/headless/node_modules/playwright/index.mjs";
import { writeFile } from "node:fs/promises";
const b = await chromium.launch({
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
const p = await b.newPage();
p.on("pageerror", (e) => console.log(e.message));
await p.goto("http://127.0.0.1:5178");
await p.waitForFunction(() => window.__bitPhysicsReady);
await p.evaluate(() => window.__canyon.pause());
const results = await p.evaluate(async () => {
  const g = window.__canyon.gpu;
  const rows = [];
  const start = performance.now();
  for (let k = 0; k <= 40; k++) {
    if (k)
      for (let j = 0; j < 100; j++) {
        g.step(128);
        await g.device.queue.onSubmittedWorkDone();
      }
    const s = await g.statistics();
    const data = await g.read();
    let water = 0,
      grain = 0;
    for (let i = 0; i < data.length; i += 16) {
      water += data[i] - data[i + 15] - data[i + 8] - data[i + 13];
      grain +=
        -data[i + 5] + data[i + 6] + data[i + 3] - data[i + 9] - data[i + 14];
    }
    rows.push({
      ...s,
      clock: Array.from(s.clock),
      water64: water * g.params.dx ** 2,
      grain64: grain * g.params.dx ** 2,
      steps: g.steps,
      wall: (performance.now() - start) / 1000,
    });
  }
  return rows;
});
console.log(results);
await writeFile(
  new URL("../evidence/accelerated.json", import.meta.url),
  JSON.stringify(results, null, 2),
);
await b.close();
