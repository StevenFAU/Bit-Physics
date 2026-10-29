// Slime Mould v2 — morphology regression (docs/planning/rebuild-v2/02-physarum.md
// § The proof, "morphology checks"; M3). Not a gate: a regression test.
//
// Every scene is run from fixed seeds (on the 16:9 dish a 1280 × 720
// viewport gives), for a fixed number of steps with the live loop paused (so
// no director acts), and described by a handful of numbers
// (src/v2/model/regress.ts): tube cover and length per area, gaps and pieces
// per area, loopiness, a node-degree histogram, and each scene's own
// measures (the score card's; who holds the dish and how much the colonies
// share their tubes). The seeds' spread sets each number's band: mean ±
// max(5 SD over ten seeds, a floor) — measured, then declared in
// src/v2/generated/morphology-baseline.json. A measure only some seeds have
// (the mean distance before every city is joined) is recorded, not banded.
//
// Two profiles:
//   * full — each tier's agent count (T1, T2, T3) and each scene's full run;
//   * ci   — 37,500 agents (a quarter of T1, the same density, so the same
//            features on a smaller dish) and shorter runs: what a software GPU
//            on a CI runner can afford (measured locally on SwiftShader:
//            15–61 steps a second at T1, 20 cores).
//
//   npm run build   (in this directory)
//   CHROME_BIN=/snap/bin/chromium PLAYWRIGHT_MODULE=… \
//     node v2-morphology.mjs measure [--profile full|ci|all] [--seeds 1,…,10]
//     node v2-morphology.mjs check   [--profile ci|full] [--tiers T3] [--seed 1] [--scenes a,b] [out-dir]
//
// `check` runs one seed per scene (and tier) and fails if any number leaves
// its band. On the GPU the baseline was measured on, seed 1 reproduces its
// measured values exactly (the solver is deterministic there); elsewhere
// (CI's software Vulkan, whose trig differs in the last bits) the run takes
// a different path through the same dynamics and must land in the band.

import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const here = fileURLToPath(new URL(".", import.meta.url));
const dist = join(here, "dist");
// MORPH_BASELINE: measure into (or check against) another file, e.g. a survey on a second GPU
const BASELINE = process.env.MORPH_BASELINE ?? join(here, "src/v2/generated/morphology-baseline.json");

/** The scenes, and how long each runs (steps) in each profile. */
export const RUNS = [
  { key: "first-light", scene: "first-light", steps: { full: 3000, ci: 1200 } },
  { key: "cities", scene: "cities", steps: { full: 6000, ci: 1500 } },
  { key: "maze", scene: "maze", steps: { full: 16000, ci: 1500 } },
  { key: "territories", scene: "territories", steps: { full: 1500, ci: 800 } },
  { key: "territories-mixed", scene: "territories", mixed: true, steps: { full: 1500, ci: 800 } },
  { key: "lace", scene: "lace", steps: { full: 3000, ci: 1000 } },
  { key: "light", scene: "light", steps: { full: 1800, ci: 800 } },
  { key: "network", scene: "network", steps: { full: 2000, ci: 1000 } },
  { key: "table1", scene: "table1", steps: { full: 3000, ci: 1000 } },
];
/** Each profile's dishes: a tier's agent count, or a fixed count at a tier's personalities. */
export const PROFILES = {
  full: [{ tier: "T1" }, { tier: "T2" }, { tier: "T3" }],
  ci: [{ tier: "T1", agents: 37500, label: "37.5k" }],
};

const args = process.argv.slice(2);
const mode = args[0];
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const outDir = args.slice(1).find((a, i, all) => !a.startsWith("--") && !(all[i - 1] ?? "").startsWith("--"));
if (mode !== "measure" && mode !== "check") {
  console.error("usage: node v2-morphology.mjs measure|check [--profile full|ci|all] [--tiers T1,T2,T3] [--seeds 1,…] [--seed 1] [--scenes key,…] [out-dir]");
  process.exit(2);
}
const profiles = (() => {
  const p = opt("profile", mode === "measure" ? "all" : "ci");
  return p === "all" ? ["full", "ci"] : [p];
})();
const tierFilter = opt("tiers", null)?.split(",");
const seeds = mode === "measure" ? opt("seeds", "1,2,3,4,5,6,7,8,9,10").split(",").map(Number) : [Number(opt("seed", "1"))];
const only = opt("scenes", null)?.split(",");
const runs = RUNS.filter((r) => !only || only.includes(r.key));

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".bin": "application/octet-stream", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".map": "application/json" };
const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent((req.url ?? "/").split("?")[0]);
    if (p === "/favicon.ico") { res.writeHead(204); res.end(); return; }
    if (p.endsWith("/")) p += "index.html";
    const file = join(dist, normalize(p).replace(/^(\.\.[/\\])+/, ""));
    const body = await readFile(file);
    res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch { res.writeHead(404); res.end("not found"); }
});
await new Promise((r) => server.listen(0, r));
const origin = `http://localhost:${server.address().port}`;
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN,
  headless: false,
  chromiumSandbox: false,
  args: [
    "--headless=new", "--no-sandbox", "--disable-gpu-sandbox", "--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-angle=vulkan", "--use-vulkan",
    // --gpu swiftshader: pin WebGPU to Chromium's own CPU Vulkan (the same adapter on every machine)
    ...(opt("gpu", "") === "swiftshader" ? ["--use-webgpu-adapter=swiftshader", "--enable-unsafe-swiftshader"] : []),
  ],
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
await page.goto(`${origin}/v2/`, { waitUntil: "load" });
await page.waitForFunction(() => globalThis.__bitPhysicsReady === true, undefined, { timeout: Number(process.env.BITPHYSICS_READY_TIMEOUT_MS ?? 180000) });
const adapter = await page.evaluate(() => globalThis.__bpDebug().adapter);
await page.evaluate(() => { globalThis.__physarum.clock.paused = true; });
console.log(`adapter ${adapter}`);

const regress = (o) => page.evaluate((o) => globalThis.__physarumChecks.regress(o), o);
const t0 = Date.now();
let failed = 0;
const rows = [];

const dishLabel = (d) => d.label ?? d.tier;
const banded = (band) => band && typeof band.lo === "number";

if (mode === "measure") {
  // the band rule lives in the page's model (src/v2/model/regress.ts bandOf)
  const bandOf = (k, values, cells) => page.evaluate((a) => globalThis.__physarumChecks.band(a.k, a.values, a.cells), { k, values, cells });
  let out = {
    generated_by: "packages/physarum/web/v2-morphology.mjs measure",
    viewport: [1280, 720],
    rule: "band = mean ± max(5 SD over the seeds, floor); floor 0.02 for fractions, 3% of the mean for lengths and ratios, 2·√count for feature densities (src/v2/model/regress.ts bandFloor). A measure only some seeds have is recorded (seen), not banded.",
    profiles: {},
  };
  // measuring one profile keeps the other's committed bands
  try {
    const prev = JSON.parse(await readFile(BASELINE, "utf8"));
    if (prev.profiles) out.profiles = prev.profiles;
  } catch { /* first run */ }
  for (const prof of profiles) {
    const dishes = PROFILES[prof].filter((d) => !tierFilter || tierFilter.includes(d.tier));
    // --scenes re-measures some runs and keeps the profile's others (same adapter and seeds only)
    const prev = out.profiles[prof];
    const keep = only && prev && prev.adapter === adapter && String(prev.seeds) === String(seeds) ? prev.runs : {};
    const P = { adapter, date: new Date().toISOString().slice(0, 10), seeds, dishes: dishes.map(dishLabel), runs: { ...keep } };
    for (const r of runs) {
      P.runs[r.key] = { scene: r.scene, mixed: !!r.mixed, steps: r.steps[prof], dishes: {} };
      for (const dish of dishes) {
        const got = [];
        for (const seed of seeds) {
          const g = await regress({ scene: r.scene, seed, steps: r.steps[prof], tier: dish.tier, agents: dish.agents, mixed: r.mixed });
          got.push(g);
          console.log(`${prof} ${r.key} ${dishLabel(dish)} seed ${seed}: ${g.seconds.toFixed(1)} s · ${Object.entries(g.d).map(([k, v]) => `${k} ${v === null ? "—" : +v.toPrecision(4)}`).join(" · ")}`);
        }
        const cells = got[0].grid[0] * got[0].grid[1];
        const bands = {};
        for (const k of Object.keys(got[0].d)) {
          const vals = got.map((g) => g.d[k]);
          bands[k] = vals.every((v) => typeof v === "number") ? await bandOf(k, vals, cells) : { seen: vals };
        }
        P.runs[r.key].dishes[dishLabel(dish)] = { tier: dish.tier, grid: got[0].grid, n: got[0].n, seconds: got.map((g) => +g.seconds.toFixed(2)), bands };
      }
    }
    out.profiles[prof] = P;
  }
  await writeFile(BASELINE, `${JSON.stringify(out, null, 1)}\n`);
  console.log(`wrote ${BASELINE} in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
} else {
  const base = JSON.parse(await readFile(BASELINE, "utf8"));
  for (const prof of profiles) {
    const P = base.profiles?.[prof];
    if (!P) { console.log(`FAIL  no ${prof} profile in the baseline`); failed += 1; continue; }
    const sameGpu = P.adapter === adapter;
    console.log(`${prof}: measured on ${P.adapter} (${P.date}, seeds ${P.seeds.join(",")}); checking on ${adapter}`);
    const dishes = PROFILES[prof].filter((d) => !tierFilter || tierFilter.includes(d.tier));
    for (const r of runs) {
      const b = P.runs[r.key];
      if (!b) { console.log(`FAIL  ${prof} ${r.key}: no baseline`); failed += 1; continue; }
      for (const dish of dishes) {
        const bt = b.dishes[dishLabel(dish)];
        if (!bt) { console.log(`FAIL  ${prof} ${r.key} ${dishLabel(dish)}: no baseline for this dish`); failed += 1; continue; }
        const g = await regress({ scene: r.scene, seed: seeds[0], steps: b.steps, tier: dish.tier, agents: dish.agents, mixed: b.mixed });
        const out = [];
        let ok = g.grid[0] === bt.grid[0] && g.grid[1] === bt.grid[1] && g.n === bt.n;
        if (!ok) out.push(`dish ${g.grid.join("×")} / ${g.n} agents, baseline ${bt.grid.join("×")} / ${bt.n}`);
        let exact = sameGpu && seeds[0] === P.seeds[0];
        for (const [k, band] of Object.entries(bt.bands)) {
          const v = g.d[k];
          if (exact && v !== band.seen[0]) exact = false;
          if (!banded(band)) continue;
          if (!(typeof v === "number" && v >= band.lo && v <= band.hi)) {
            ok = false;
            out.push(`${k} ${v} outside [${band.lo.toPrecision(4)}, ${band.hi.toPrecision(4)}]`);
          }
        }
        rows.push({ profile: prof, key: r.key, dish: dishLabel(dish), ok, exact, seconds: g.seconds, d: g.d, problems: out });
        if (!ok) failed += 1;
        console.log(`${ok ? "PASS" : "FAIL"}  ${prof} ${r.key} ${dishLabel(dish)} (${g.seconds.toFixed(1)} s${exact ? ", identical to the baseline's seed" : ""})${out.length ? ` — ${out.join("; ")}` : ""}`);
      }
    }
  }
  console.log(`\n${rows.filter((x) => x.ok).length}/${rows.length} runs in band on ${adapter} in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
  if (outDir) {
    await mkdir(outDir, { recursive: true });
    await writeFile(join(outDir, "morphology-check.json"), JSON.stringify({ adapter, rows, errors }, null, 1));
  }
}
if (errors.length) {
  console.log(`FAIL  console errors: ${errors.slice(0, 5).join(" | ")}`);
  failed += 1;
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
