// Water in Hand v2 — acceptance checks in a real WebGPU browser
// (docs/planning/rebuild-v2/08-sph-water.md, M0; 00-foundation.md F4).
//
//   npm run build   (in this directory)
//   CHROME_BIN=/snap/bin/chromium \
//   PLAYWRIGHT_MODULE=<repo>/tools/productization/web-deploy/web/headless/node_modules/playwright/index.js \
//   node v2-acceptance.mjs [out-dir]
//
// Checks: the v1 page's capture and the v2 page's carry the same bytes (and the
// bytes v1 on main carries); v2 signals ready at the gate path, then goes live;
// an orbit view (__bpDebug space "3d"); the tier's particle count and the live
// recipe (h = 1.2 s, dt = 0.4 h / 5, speed cap 0.315 · 2h / dt, the lattice mass
// re-measured at this scale); the glass moves in the first ten seconds and the
// director drops again; the in-page gate; the live solver ≡ the shipped DFSPH
// passes byte for byte, with and without the memory re-sort; the hydrostatic and
// incompressibility cards; the Drop tool (a click is one edit) and its cooldown;
// undo by replay ≡ never dropping; save / restore; the same seed gives the same
// bytes across page loads and another seed does not; LiquidSurface draws the
// water, absorbs (Beer–Lambert), refracts and reflects the probe; the orbit
// camera; reduced motion; at most six tools at 1280×720; no console errors.
// Prints a BP_BENCH line at the end.

import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const dist = fileURLToPath(new URL("./dist", import.meta.url));
const out = process.argv[2];
if (out) await mkdir(out, { recursive: true });

/** sha256 of v1's capture states on main (cell-sort, ::16 subsample, 11 checkpoints) — measured 2026-11-18, RADV. */
const MAIN_V1_STATES_SHA = "713611ee300e5f0d52555d10c8ab547c52abd1c52ac6982dff5374aa06791937";
const LATTICE_SUM_12 = 1.0008095483584356;

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".bin": "application/octet-stream", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".map": "application/json",
};
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
  args: ["--headless=new", "--no-sandbox", "--disable-gpu-sandbox", "--enable-unsafe-webgpu",
    "--enable-features=Vulkan", "--use-angle=vulkan", "--use-vulkan"],
});

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

async function open(path = "/v2/", o = {}) {
  const ctx = await browser.newContext({ viewport: o.viewport ?? { width: 1280, height: 720 }, deviceScaleFactor: 1, reducedMotion: o.reducedMotion ?? "no-preference" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  const t0 = Date.now();
  await page.goto(origin + path, { waitUntil: "load" });
  await page.waitForFunction(() => globalThis.__bitPhysicsReady === true, undefined, { timeout: 90000 });
  const ready = Date.now() - t0;
  if (path.startsWith("/v2/") && !o.noLive) await page.waitForFunction(() => globalThis.__waterLive === true, undefined, { timeout: 90000 });
  const live = Date.now() - t0;
  return { ctx, page, errors, ready, live };
}
const shot = async (page, name) => { if (out) await page.screenshot({ path: join(out, `${name}.png`) }); };
const T = (page, fn, arg) => page.evaluate(fn, arg);
const dbg = (page) => T(page, () => globalThis.__bpDebug());
const pct = (x, d = 1) => `${(x * 100).toFixed(d)}%`;

/** Click the capture control; the sha256 of the published capture's states. */
const captureSha = (page) =>
  T(page, async () => {
    globalThis.__bitPhysicsCaptureReady = false;
    document.querySelector('[data-bp="capture"]').click();
    for (let i = 0; i < 1200 && !globalThis.__bitPhysicsCaptureReady; i += 1) await new Promise((r) => setTimeout(r, 50));
    const c = globalThis.__bitPhysicsCapture;
    const text = JSON.stringify(c.steps.map((s) => ({ step: s.step, state: s.state })));
    const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
  });

/** Pause the live loop and let in-flight frames land. */
const pause = (page) =>
  T(page, async () => {
    const a = globalThis.__water;
    a.clock.paused = true;
    await new Promise((r) => setTimeout(r, 200));
    await a.gpu.device.queue.onSubmittedWorkDone();
  });

/** Load a scene with a seed (paused), advance n steps off the frame loop, hash the state. */
const runHash = (page, scene, seed, n) =>
  T(page, async ({ scene, seed, n }) => {
    const a = globalThis.__water;
    a.clock.paused = true;
    await a.loadScene(scene, { seed });
    await a.advance(n);
    return { hash: await a.water.stateHash(), steps: a.water.steps, drops: a.dropCount };
  }, { scene, seed, n });

/** Mean RGB of a screenshot region (PNG decoded in the page). */
async function regionRgb(page, clip) {
  const png = await page.screenshot({ clip });
  return T(page, async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = new OffscreenCanvas(img.width, img.height);
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, img.width, img.height).data;
    let r = 0, gg = 0, bb = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; bb += d[i + 2]; }
    const n = d.length / 4;
    return [r / n, gg / n, bb / n];
  }, png.toString("base64"));
}

// ------------------------------------------------- the capture's bytes --
{
  const v1 = await open("/", { noLive: true });
  const v1Sha = await captureSha(v1.page);
  check("v1 capture still carries main's bytes", v1Sha === MAIN_V1_STATES_SHA, `states sha256 ${v1Sha.slice(0, 16)}…`);
  await v1.ctx.close();
  const v2 = await open("/v2/");
  const v2Sha = await captureSha(v2.page);
  check("v2 capture ≡ v1 capture, byte for byte", v2Sha === v1Sha, `states sha256 ${v2Sha.slice(0, 16)}…`);
  const t = await T(v2.page, () => globalThis.__waterBoot);
  check("v2 signals ready at the gate path, before the live view compiles", t.ready < t.compiled && t.compiled <= t.live, `ready ${t.ready} ms, compiled ${t.compiled} ms, live ${t.live} ms (navigation start)`);
  check("no console errors (capture)", v2.errors.length === 0, v2.errors.slice(0, 2).join(" | "));
  await v2.ctx.close();
}

// -------------------------------------------- the tier, the recipe, the first ten seconds --
{
  const s = await open("/v2/");
  const d0 = await dbg(s.page);
  check("an orbit view: __bpDebug reports space \"3d\"", d0.space === "3d");
  const want = d0.sizes[d0.tier];
  check(`the tier's particle count (${d0.tier})`, Math.abs(d0.particles / want - 1) < 0.06, `${d0.particles.toLocaleString()} particles for a budget of ${want.toLocaleString()}`);
  const r = d0.recipe;
  const recipeOk =
    Math.abs(r.h / r.spacing - 1.2) < 1e-12 &&
    Math.abs(r.dt - (0.4 * r.h) / 5) < 1e-15 &&
    Math.abs(r.vmax - (0.315 * 2 * r.h) / r.dt) < 1e-9 &&
    Math.abs((r.mass * LATTICE_SUM_12) / (1000 * r.spacing ** 3) - 1) < 1e-12;
  check("the live recipe: h = 1.2 s, dt = 0.4 h/5, 8/4 iterations, cap 0.315·2h/dt, mass ρ₀s³/1.00081", recipeOk, `h ${(r.h * 1000).toFixed(2)} mm, dt ${(r.dt * 1000).toFixed(3)} ms, cap ${r.vmax.toFixed(3)} m/s`);
  // the first ten seconds: the blob falls in and the water moves
  let moved = 0;
  for (let i = 0; i < 10 && !moved; i += 1) {
    await s.page.waitForTimeout(1000);
    const live = await T(s.page, () => globalThis.__waterMeasure());
    if (live && live.maxSpeed > 0.8) moved = i + 1;
  }
  await shot(s.page, "first-ten-seconds");
  check("something moves the water in the first ten seconds", moved > 0, moved ? `fastest particle over 0.8 m/s by ${moved} s` : "still");
  const st = await T(s.page, () => ({ fps: globalThis.__water.fps, ts: globalThis.__water.measuredTimeScale }));
  check("it runs live", st.fps > 20, `${st.fps.toFixed(0)} fps, ${st.ts.toFixed(3)} model s per wall s`);
  // the director: it drops again when the glass has gone quiet
  const dir = await T(s.page, async () => {
    const a = globalThis.__water;
    a.clock.paused = true;
    const before = a.dropCount;
    await a.advance(Math.round(6 / a.water.recipe.dt) - a.water.steps > 0 ? Math.round(6 / a.water.recipe.dt) - a.water.steps : 1);
    return { before, after: a.dropCount, time: a.water.time };
  });
  check("the director keeps dropping (nothing settles dead)", dir.after >= dir.before + 1, `${dir.before} → ${dir.after} drops by t = ${dir.time.toFixed(2)} s`);
  check("no console errors (live)", s.errors.length === 0, s.errors.slice(0, 2).join(" | "));
  await s.ctx.close();
}

// ------------------------------------------------------------- Prove --
{
  const s = await open("/v2/");
  const run = (title) =>
    T(s.page, async (title) => {
      const card = [...document.querySelectorAll(".bp-proof")].find((e) => e.querySelector("h3")?.textContent === title);
      card.querySelector("button").click();
      for (let i = 0; i < 3600; i += 1) {
        await new Promise((r) => setTimeout(r, 50));
        const st = card.getAttribute("data-status");
        if (st && st !== "running" && st !== "idle") break;
      }
      return { status: card.getAttribute("data-status"), text: card.querySelector(".bp-proof-numbers")?.textContent ?? "", notes: card.querySelector(".bp-proof-notes")?.textContent ?? "" };
    }, title);
  await T(s.page, () => document.querySelector(".bp-top-actions button:nth-child(2)").click());
  const g = await run("The release gate");
  const gr = await T(s.page, () => globalThis.__waterProve.results.gate);
  check("the in-page gate: pointwise vs the committed capture, run twice", g.status === "pass" && gr.runTwiceIdentical && gr.worstRatio <= 1, `${pct(gr.worstRatio)} of budget, run twice ${gr.runTwiceIdentical ? "identical" : "DIFFERENT"}`);
  const sv = await run("The shipped solver");
  const sr = await T(s.page, () => globalThis.__waterProve.results.solver);
  check("the live solver ≡ the shipped DFSPH passes, byte for byte (lists, lists + re-sort)", sv.status === "pass" && sr.lists === sr.shipped && sr.plain === sr.shipped, `${sr.steps} steps, sha256 ${sr.shipped.slice(0, 12)}…`);
  const hy = await run("Hydrostatic pressure");
  const hr = await T(s.page, () => globalThis.__waterProve.results.hydrostatic);
  await shot(s.page, "prove-hydrostatic");
  // the claim is the profile: its depth-bin means lie on a line (measured R² 0.9994) of slope near
  // ρ₀g (measured 0.89); a single particle's 200-step mean keeps particle noise (per-particle R² 0.88)
  check("hydrostatic: pressure grows linearly with depth near ρ₀g (illustrative)", hy.status === "info" && hr.binnedR2 > 0.99 && Math.abs(hr.ratio - 1) < 0.25, `dp/dd = ${hr.slope.toFixed(0)} Pa/m = ${hr.ratio.toFixed(3)} × ρ₀g, profile R² ${hr.binnedR2.toFixed(4)}, per-particle R² ${hr.r2.toFixed(3)}, ${hr.count} particles`);
  const live = await T(s.page, async () => {
    for (let i = 0; i < 100 && !globalThis.__waterProve.results.live; i += 1) await new Promise((r) => setTimeout(r, 100));
    return globalThis.__waterProve.results.live;
  });
  check("incompressibility, live: measured and finite, no list overflow", live && Number.isFinite(live.meanCompression) && live.listOverflow === 0, live ? `mean ${pct(live.meanCompression, 3)}, max ${pct(live.maxCompression, 2)}, largest neighbour count ${live.maxNeighbours}` : "no reading");
  check("no console errors (Prove)", s.errors.length === 0, s.errors.slice(0, 2).join(" | "));
  await s.ctx.close();
}

// ------------------------------------------ edits, history, determinism --
{
  const s = await open("/v2/?n=20000");
  // the Drop tool: a click on the water is one edit
  await pause(s.page);
  await T(s.page, async () => {
    const a = globalThis.__water;
    await a.loadScene("still", { seed: 3 });
    a.clock.paused = true;
    a.selectTool("drop");
  });
  const p = await T(s.page, () => {
    const a = globalThis.__water;
    return a.screenOf([0.05, 0.44, 0.02]);
  });
  const rect = await T(s.page, () => { const r = globalThis.__water.studio.canvas.getBoundingClientRect(); return [r.left, r.top]; });
  await s.page.mouse.click(rect[0] + p[0], rect[1] + p[1]);
  const clicked = await T(s.page, async () => {
    const a = globalThis.__water;
    for (let i = 0; i < 100 && a.dropCount === 0; i += 1) await new Promise((r) => setTimeout(r, 30));
    return { events: a.eventCount, drops: a.dropCount };
  });
  check("the Drop tool: a click on the water is one edit, applied", clicked.events === 1 && clicked.drops === 1, `${clicked.events} edit, ${clicked.drops} drop`);
  const cooldown = await T(s.page, () => globalThis.__water.requestDrop([0, 0]));
  check("a second drop waits for the first to land", cooldown === false);

  // undo by replay ≡ never having dropped
  const undo = await T(s.page, async () => {
    const a = globalThis.__water;
    a.clock.paused = true;
    await a.loadScene("still", { seed: 3 });
    await a.advance(60);
    a.requestDrop([0.08, -0.05]);
    for (let i = 0; i < 100 && a.dropCount === 0; i += 1) await new Promise((r) => setTimeout(r, 30));
    await a.advance(140);
    const edited = await a.water.stateHash();
    await a.undo();
    const undone = await a.water.stateHash();
    const steps = a.water.steps;
    await a.loadScene("still", { seed: 3 });
    await a.advance(steps);
    const never = await a.water.stateHash();
    return { edited, undone, never, steps };
  });
  check("undo by replay ≡ never having dropped, byte for byte", undo.undone === undo.never && undo.edited !== undo.never, `step ${undo.steps}: ${undo.undone.slice(0, 12)}… vs ${undo.never.slice(0, 12)}…`);

  // save / restore
  const sr = await T(s.page, async () => {
    const a = globalThis.__water;
    await a.loadScene("glass", { seed: 5 });
    await a.advance(80);
    a.savePoint();
    const saved = await a.water.stateHash();
    await a.advance(120);
    a.restoreSave();
    await a.gpu.device.queue.onSubmittedWorkDone();
    return { saved, restored: await a.water.stateHash() };
  });
  check("save point / restore returns the same bytes", sr.saved === sr.restored);
  const one = await runHash(s.page, "glass", 11, 300);
  await s.ctx.close();
  const s2 = await open("/v2/?n=20000");
  const two = await runHash(s2.page, "glass", 11, 300);
  const other = await runHash(s2.page, "glass", 12, 300);
  check("the same seed gives the same bytes across page loads", one.hash === two.hash, `${one.hash.slice(0, 12)}… at step ${one.steps}`);
  check("another seed drops elsewhere", other.hash !== one.hash);
  check("no console errors (edits)", s2.errors.length === 0, s2.errors.slice(0, 2).join(" | "));
  await s2.ctx.close();
}

// ------------------------------------------------- the liquid surface --
{
  const s = await open("/v2/?chrome=off");
  await pause(s.page);
  await T(s.page, async () => {
    const a = globalThis.__water;
    await a.loadScene("still", { seed: 1 });
    a.clock.paused = true;
    a.camera.set({ yaw: 0.62, pitch: 0.24, distance: 2.45, target: [0, 0.42, 0] });
  });
  // the water region on screen: below the resting level, inside the glass
  const box = await T(s.page, () => {
    const a = globalThis.__water;
    const c = a.screenOf([0, 0.25, 0]);
    const e = a.screenOf([0.18, 0.25, 0]);
    const w = Math.abs(e[0] - c[0]);
    return { x: Math.round(c[0] - w * 0.6), y: Math.round(c[1] - w * 0.4), width: Math.round(w * 1.2), height: Math.round(w * 0.8) };
  });
  const settle = () => s.page.waitForTimeout(700);
  await settle();
  const withWater = await regionRgb(s.page, box);
  await T(s.page, () => { globalThis.__water.view.showWater = false; });
  await settle();
  const without = await regionRgb(s.page, box);
  await T(s.page, () => { globalThis.__water.view.showWater = true; });
  const diff = Math.hypot(withWater[0] - without[0], withWater[1] - without[1], withWater[2] - without[2]);
  check("LiquidSurface draws the water over the scene behind", diff > 4, `mean RGB ${withWater.map((v) => v.toFixed(0)).join(",")} vs ${without.map((v) => v.toFixed(0)).join(",")}`);
  // absorption: red goes first, so more of it shifts the water towards blue-green
  await T(s.page, () => { const l = globalThis.__water.view.liquid; l.look = { ...l.look, absorption: l.look.absorption.map((x) => x * 4) }; });
  await settle();
  const deep = await regionRgb(s.page, box);
  check("Beer–Lambert: four times the absorption darkens red most", deep[0] < withWater[0] && deep[0] / Math.max(deep[2], 1) < withWater[0] / Math.max(withWater[2], 1), `R/B ${(withWater[0] / withWater[2]).toFixed(3)} → ${(deep[0] / deep[2]).toFixed(3)}`);
  await T(s.page, () => { const l = globalThis.__water.view.liquid; l.look = { ...l.look, absorption: l.look.absorption.map((x) => x / 4) }; });
  // refraction: without it the scene behind is not displaced
  await T(s.page, () => { const l = globalThis.__water.view.liquid; l.look = { ...l.look, refraction: 0 }; });
  await settle();
  const flat = await regionRgb(s.page, box);
  await T(s.page, () => { const l = globalThis.__water.view.liquid; l.look = { ...l.look, refraction: 0.25 }; });
  check("refraction changes what is seen through the water", Math.hypot(flat[0] - withWater[0], flat[1] - withWater[1], flat[2] - withWater[2]) > 0.3, `mean RGB ${flat.map((v) => v.toFixed(1)).join(",")} vs ${withWater.map((v) => v.toFixed(1)).join(",")}`);
  // reflection: the probe is captured and what the surface reflects
  const probe = await T(s.page, () => globalThis.__water.view.probe.version);
  const surface = await T(s.page, () => {
    const a = globalThis.__water;
    const c = a.screenOf([0, 0.44, -0.1]);
    const e = a.screenOf([0.25, 0.44, -0.1]);
    const w = Math.abs(e[0] - c[0]);
    return { x: Math.round(c[0] - w * 0.8), y: Math.round(c[1] - 10), width: Math.round(w * 1.6), height: 20 };
  });
  const lit = await regionRgb(s.page, surface);
  await T(s.page, () => globalThis.__water.view.liquid.setProbe(null));
  await settle();
  const unlit = await regionRgb(s.page, surface);
  await T(s.page, () => { const v = globalThis.__water.view; v.liquid.setProbe(v.probe); });
  check("Fresnel reflection of the room probe", probe >= 1 && lit[0] + lit[1] + lit[2] > unlit[0] + unlit[1] + unlit[2] + 3, `probe captured ${probe}×; surface ${lit.map((v) => v.toFixed(0)).join(",")} vs ${unlit.map((v) => v.toFixed(0)).join(",")} without it`);
  await shot(s.page, "still-water");
  // the orbit camera
  const cam0 = await dbg(s.page);
  await s.page.mouse.move(900, 300);
  await s.page.mouse.down();
  await s.page.mouse.move(700, 330, { steps: 8 });
  await s.page.mouse.up();
  await s.page.waitForTimeout(400);
  const cam1 = await dbg(s.page);
  check("a drag orbits the camera", Math.abs(cam1.camera.yaw - cam0.camera.yaw) > 0.1, `yaw ${cam0.camera.yaw.toFixed(2)} → ${cam1.camera.yaw.toFixed(2)}`);
  check("no console errors (surface)", s.errors.length === 0, s.errors.slice(0, 2).join(" | "));
  await s.ctx.close();
}

// ----------------------------------------------- shell, reduced motion --
{
  const s = await open("/v2/", { reducedMotion: "reduce" });
  const st = await T(s.page, () => ({ speed: globalThis.__water.clock.speed, tools: document.querySelectorAll(".bp-tool:not(.bp-tool-tune)").length }));
  check("reduced motion halves the playback speed", st.speed === 0.5, `${st.speed}×`);
  check("at most six tools at 1280×720", st.tools <= 6, `${st.tools} tools`);
  await shot(s.page, "boot");
  await s.ctx.close();
}

// ------------------------------------------------------------- bench --
{
  const s = await open("/v2/?bench=1");
  const bench = await s.page.waitForFunction(() => globalThis.__bpBench, undefined, { timeout: 60000 }).then((h) => h.jsonValue());
  console.log(`BP_BENCH ${JSON.stringify(bench)}`);
  check("bench: frame and GPU time measured", bench.frames > 0 && bench.solverMs > 0, `${bench.fps.toFixed(1)} fps, GPU p50 ${bench.gpuP50.toFixed(2)} ms (solver ${bench.solverMs.toFixed(2)}, surface ${bench.surfaceMs.toFixed(2)}), ${bench.stepsPerFrame.toFixed(2)} steps a frame`);
  await s.ctx.close();
}

await browser.close();
server.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (out) await writeFile(join(out, "acceptance.json"), JSON.stringify(results, null, 2));
process.exit(failed.length ? 1 : 0);
