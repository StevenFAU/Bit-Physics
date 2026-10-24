// Slime Mould v2 — personality pad calibration (02-physarum.md § Risks:
// "sweep the 2D pad at each tier offline and keep only points whose
// morphology metric is stable across seeds").
//
//   npm run build   (in this directory)
//   CHROME_BIN=/snap/bin/chromium \
//   PLAYWRIGHT_MODULE=<repo>/tools/productization/web-deploy/web/headless/node_modules/playwright/index.js \
//   node v2-calibrate.mjs [thumbs-dir]
//
// Each of the pad's 5 × 5 personalities runs on its own 16:9 dish at the
// T1, T2 and T3 agent counts (the declared density, so the dish grows with
// the tier) from three seeds, and the trail's morphology is measured at
// steps 1,000 and 3,000 (src/v2/model/morphology.ts). A point is stable at a
// tier when, at both steps, the three seeds agree:
//   * tube length per area within ±STABLE_LENGTH of their mean (relative), and
//   * enclosed gap counts within ±max(STABLE_MESH · mean, 2√mean) of their
//     mean: gaps are counted features, and a dish holding n of them varies
//     by about √n from seed to seed by counting alone.
// (The first run judged gaps by ±STABLE_MESH alone, which rejected points on
// counting noise — at T1 a dish holds ~15 gaps, ±26% at one standard
// deviation. That verdict is kept per point as `stableFirstRule`.)
// Writes src/v2/generated/pad-calibration.json (the pad reads it).

import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const STEPS = [1000, 3000];
const SEEDS = [11, 12, 13];
const TIERS = ["T1", "T2", "T3"];
const STABLE_LENGTH = 0.1;
const STABLE_MESH = 0.3;

const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const dist = fileURLToPath(new URL("./dist", import.meta.url));
const outFile = fileURLToPath(new URL("./src/v2/generated/pad-calibration.json", import.meta.url));
const thumbs = process.argv[2];
if (thumbs) await mkdir(thumbs, { recursive: true });

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".bin": "application/octet-stream", ".woff2": "font/woff2" };
const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent((req.url ?? "/").split("?")[0]);
    if (p === "/favicon.ico") { res.writeHead(204); res.end(); return; }
    if (p.endsWith("/")) p += "index.html";
    const file = join(dist, normalize(p).replace(/^(\.\.[/\\])+/, ""));
    res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN, headless: false, chromiumSandbox: false,
  args: ["--headless=new", "--no-sandbox", "--disable-gpu-sandbox", "--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-angle=vulkan", "--use-vulkan"],
});
const page = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage();
page.on("pageerror", (e) => console.log(`pageerror: ${e.message}`));
// the gated scene is the lightest live load while the survey runs
await page.goto(`http://localhost:${server.address().port}/v2/?s=gated`);
await page.waitForFunction(() => globalThis.__bitPhysicsReady === true, undefined, { timeout: 60000 });
await page.evaluate(() => { globalThis.__physarum.clock.paused = true; });
const pad = await page.evaluate(() => ({ n: globalThis.__physarumPad.PAD_N, jitter: globalThis.__physarumPad.PAD_JITTER }));
const adapter = await page.evaluate(() => globalThis.__bpDebug().adapter);

const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const spread = (a) => { const m = mean(a); return m > 0 ? Math.max(...a.map((v) => Math.abs(v - m))) / m : 0; };
const round = (v, d = 4) => Number(v.toPrecision(d));

const tiers = {};
for (const tier of TIERS) {
  const points = [];
  let grid = null;
  for (let j = 0; j < pad.n; j += 1) {
    for (let i = 0; i < pad.n; i += 1) {
      const params = await page.evaluate(([i, j]) => globalThis.__physarumPad.padParams({ i, j }), [i, j]);
      const runs = [];
      for (const seed of SEEDS) {
        const r = await page.evaluate((o) => globalThis.__physarumChecks.morph(o), { params, seed, at: STEPS, tier, jitter: pad.jitter });
        grid = r.grid;
        runs.push(r.at);
        if (thumbs) {
          for (const a of r.at) {
            const buf = Buffer.from(a.thumb.b64, "base64");
            await writeFile(join(thumbs, `${tier}_i${i}_j${j}_s${seed}_t${a.step}.pgm`), Buffer.concat([Buffer.from(`P5\n${a.thumb.w} ${a.thumb.h}\n255\n`), buf]));
          }
        }
      }
      const at = STEPS.map((step, k) => {
        const m = runs.map((r) => r[k]);
        const len = m.map((x) => x.lengthDensity);
        const mesh = m.map((x) => x.meshDensity);
        const meshCounts = m.map((x) => x.meshes);
        const mc = mean(meshCounts);
        const meshOk = Math.max(...meshCounts.map((c) => Math.abs(c - mc))) <= Math.max(STABLE_MESH * mc, 2 * Math.sqrt(mc));
        const firstRule = Math.max(...meshCounts) < 3 ? Math.max(...meshCounts) - Math.min(...meshCounts) <= 2 : spread(mesh) <= STABLE_MESH;
        return {
          step,
          stable: spread(len) <= STABLE_LENGTH && meshOk,
          stableFirstRule: spread(len) <= STABLE_LENGTH && firstRule,
          lengthDensity: round(mean(len)),
          lengthSpread: round(spread(len), 3),
          meshDensity: round(mean(mesh)),
          meshSpread: round(spread(mesh), 3),
          meshes: meshCounts,
          pieces: m.map((x) => x.pieces),
          cover: round(mean(m.map((x) => x.cover)), 3),
          width: round(mean(m.map((x) => x.width)), 3),
          loopiness: round(mean(m.map((x) => x.loopiness)), 3),
        };
      });
      const stable = at.every((a) => a.stable);
      points.push({ i, j, params, stable, stableFirstRule: at.every((a) => a.stableFirstRule), at });
      console.log(`${tier} (${i},${j}) ${stable ? "stable  " : "UNSTABLE"} ` + at.map((a) => `[${a.step}] len ${a.lengthDensity} ±${(a.lengthSpread * 100).toFixed(0)}% mesh ${a.meshDensity} ±${(a.meshSpread * 100).toFixed(0)}% (${a.meshes.join("/")}) pieces ${a.pieces.join("/")}`).join("  "));
    }
  }
  tiers[tier] = { grid, points };
}

const doc = {
  generated_by: "packages/physarum/web/v2-calibrate.mjs",
  adapter,
  date: new Date().toISOString().slice(0, 10),
  aspect: "16:9",
  steps: STEPS,
  seeds: SEEDS,
  jitter: pad.jitter,
  criterion: {
    lengthSpread: STABLE_LENGTH,
    gapCounts: `each seed within ±max(${STABLE_MESH}·mean, 2·√mean) of the mean`,
    firstRule: `gaps per area within ±${STABLE_MESH} relative (< 3 gaps in every run: counts within ±2)`,
  },
  tiers,
};
await writeFile(outFile, JSON.stringify(doc, null, 1) + "\n");
const summary = TIERS.map((t) => `${t}: ${tiers[t].points.filter((p) => p.stable).length}/${tiers[t].points.length} stable on ${tiers[t].grid.join(" × ")}`);
console.log(summary.join("\n"));
await browser.close();
server.close();
