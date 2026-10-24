// Grow v2 — acceptance checks in a real WebGPU browser
// (docs/planning/rebuild-v2/04-neural-ca.md M0).
//
//   npm run build   (in this directory)
//   CHROME_BIN=/snap/bin/chromium \
//   PLAYWRIGHT_MODULE=<repo>/tools/productization/web-deploy/web/headless/node_modules/playwright/index.js \
//   node v2-acceptance.mjs [out-dir]
//
// Checks: boot (the dish, full-bleed, the gated run on screen, steps advance,
// no console errors); the visible dish at step 1000 equals the committed
// canonical frame bit for bit; the live solver ≡ the gate path over all 21
// frames, run as a sliced job while the dish keeps rendering; the in-page
// gate (bit-exact + run twice) and its seed-43 fail probe; the checkpoint
// sha; undo by replay reproduces the never-cut bytes; save / restore /
// compare (in Hidden view, with the save point's own hidden channels); a
// keyboard step on the Tune slider sticks; the same seed gives the same bytes
// across page loads; the share link carries rate, view and speed; Many seeds
// settles in the middle; a dish with nothing alive regrows; probe. Prints a
// BP_BENCH line at the end.
//
// Bit-exactness against the committed canonical is backend-conditional: it
// holds on RADV (where the canonical was made). On another backend those two
// checks report the measured max |Δ| and fail.

import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const dist = fileURLToPath(new URL("./dist", import.meta.url));
const out = process.argv[2];
if (out) await mkdir(out, { recursive: true });

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

async function open(path = "/v2/", viewport = { width: 1280, height: 720 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto(origin + path, { waitUntil: "load" });
  await page.waitForFunction(() => globalThis.__bitPhysicsReady === true, undefined, { timeout: 60000 });
  return { ctx, page, errors };
}
const shot = async (page, name) => { if (out) await page.screenshot({ path: join(out, `${name}.png`) }); };
const T = (page, fn, arg) => page.evaluate(fn, arg);

// state hash after n steps from the scene start, with the live loop paused
const hashAfter = (page, n) =>
  T(page, async (steps) => {
    const app = globalThis.__grow;
    app.clock.paused = true;
    await new Promise((r) => setTimeout(r, 100));
    await app.loadScene(app.scene.id, { seed: app.seed, fireRate: app.sim.fireRate });
    app.clock.paused = true;
    await app.advance(steps);
    return app.stateHash();
  }, n);

// --- boot ---------------------------------------------------------------------
{
  const { ctx, page, errors } = await open();
  await page.waitForTimeout(3000);
  const d = await T(page, () => globalThis.__bpDebug());
  check("boots into The Dish, the gated run on screen", d.scene === "dish" && d.gated === true, `${d.scene}, gated ${d.gated}, adapter ${d.adapter}`);
  const aspect = d.domain[0] / d.domain[1] / (d.viewport[0] / d.viewport[1]);
  check("full-bleed: the camera's domain has the viewport's aspect", Math.abs(aspect - 1) < 0.01, aspect.toFixed(4));
  const dishPx = 2 * d.dishRadius * d.zoom;
  check("the dish fills the shorter side (organism large)", dishPx > 0.85 * Math.min(...d.viewport) && dishPx <= Math.min(...d.viewport), `dish ${dishPx.toFixed(0)} px across in ${d.viewport.join("×")}`);
  check("the steps advance (30/s at 1×)", d.tick >= 60 && d.tick <= 130, `${d.tick} steps after ~3 s`);
  check("a live organism (stats readback)", d.stats && d.stats.alive > 500, d.stats ? `${d.stats.alive} living cells` : "no stats");
  await shot(page, "01-dish");

  // the visible dish at step 1000 is the committed canonical's last frame
  const canon = await T(page, async () => {
    const app = globalThis.__grow;
    app.clock.paused = true;
    await new Promise((r) => setTimeout(r, 100));
    await app.loadScene("dish");
    app.clock.paused = true;
    await app.advance(1000);
    const st = await app.sim.readState();
    const frames = await globalThis.__growGate.fetchCanonFrames();
    const last = frames[frames.length - 1];
    let differ = 0;
    let maxAbs = 0;
    for (let c = 0; c < 64 * 64; c += 1) {
      for (let ch = 0; ch < 4; ch += 1) {
        const v = Math.min(1, Math.max(0, st[c * 16 + ch]));
        const w = last[c * 4 + ch];
        if (Math.fround(v) !== w) { differ += 1; maxAbs = Math.max(maxAbs, Math.abs(v - w)); }
      }
    }
    app.clock.paused = false;
    return { differ, maxAbs, tick: app.sim.tick };
  });
  check("the live dish at step 1000 equals the committed canonical frame, bit for bit", canon.differ === 0 && canon.tick === 1000, `${canon.differ} values differ, max |Δ| ${canon.maxAbs}`);

  // live solver ≡ gate path, as a sliced job while the dish renders
  const lvg = await T(page, async () => {
    const app = globalThis.__grow;
    app.clock.paused = false;
    let frames = 0;
    let stop = false;
    const count = () => { frames += 1; if (!stop) requestAnimationFrame(count); };
    requestAnimationFrame(count);
    const tick0 = app.sim.tick;
    const t0 = performance.now();
    const r = await globalThis.__growProve.runLiveVsGated();
    stop = true;
    const secs = (performance.now() - t0) / 1000;
    return { ...r, rafFps: frames / secs, dishSteps: app.sim.tick - tick0 };
  });
  check(
    "live solver ≡ gate path over all 21 frames (sliced job)",
    lvg && lvg.identical && lvg.frames === 21 && lvg.slices > 1,
    lvg ? `${lvg.differing} values differ over ${lvg.frames} frames, ${lvg.slices} page frames, ${lvg.seconds.toFixed(2)} s` : "did not run",
  );
  check("the dish kept rendering and stepping during the job", lvg && lvg.rafFps > 30 && lvg.dishSteps > 0, lvg ? `${lvg.rafFps.toFixed(0)} fps, ${lvg.dishSteps} dish steps` : "");

  const gate = await T(page, () => globalThis.__growProve.runGate());
  check("in-page gate: bit-exact over 21 frames, run twice identical", gate && gate.bitExact && gate.identical, gate ? `max |Δ| ${gate.maxAbs}, identical ${gate.identical}, ${gate.seconds.toFixed(1)} s` : "did not run");
  const probe43 = await T(page, () => globalThis.__growProve.runGate(43));
  check("the fail probe fails: seed 43 differs from the committed run", probe43 && probe43.maxAbs > 0.01, probe43 ? `max |Δ| ${probe43.maxAbs.toFixed(3)}` : "did not run");
  const w = await T(page, () => globalThis.__growProve.checkWeights());
  check("the downloaded weights are the committed checkpoint", w.matches && w.sha.startsWith("c98a4678"), w.sha.slice(0, 16));
  check("no console errors (boot, proofs)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- edits, undo by replay, history ------------------------------------------
{
  const { ctx, page, errors } = await open();
  const r = await T(page, async () => {
    const app = globalThis.__grow;
    app.clock.paused = true;
    await new Promise((res) => setTimeout(res, 150));
    await app.loadScene("dish");
    app.clock.paused = true;
    await app.advance(400);
    const clean = await app.stateHash();
    await app.loadScene("dish");
    app.clock.paused = true;
    await app.advance(200);
    app.cutAt([20, 20, 44, 44], 4);
    await app.advance(200);
    const cut = await app.stateHash();
    const gatedAfterCut = app.onGatedRun;
    await app.undo();
    const undone = await app.stateHash();
    return { clean, cut, undone, tick: app.sim.tick, gatedAfterCut, gatedAfterUndo: app.onGatedRun, canUndo: app.history.canUndo };
  });
  check("a cut changes the dish and leaves the gated run", r.cut !== r.clean && r.gatedAfterCut === false);
  check("undo replays to the never-cut bytes (step 400)", r.undone === r.clean && r.tick === 400, `${r.undone.slice(0, 16)}… vs ${r.clean.slice(0, 16)}…`);
  check("after undoing the only edit, the dish is the gated run again", r.gatedAfterUndo === true && r.canUndo === false);

  const sr = await T(page, async () => {
    const app = globalThis.__grow;
    app.savePoint();
    const atSave = await app.stateHash();
    const tickSave = app.sim.tick;
    await app.advance(150);
    const later = await app.stateHash();
    app.restoreSave();
    await new Promise((res) => setTimeout(res, 50));
    const restored = await app.stateHash();
    app.toggleCompare();
    const comparing = app.history.comparing && app.view.split !== null;
    app.toggleCompare();
    return { same: atSave === restored, moved: later !== atSave, tick: app.sim.tick === tickSave, comparing, off: app.view.split === null };
  });
  check("save point → restore returns the exact bytes", sr.same && sr.moved && sr.tick, JSON.stringify(sr));
  check("compare A/B toggles the split view", sr.comparing && sr.off);

  const seed = await T(page, async () => {
    const app = globalThis.__grow;
    const before = (await app.sim.readState())[(10 * 64 + 10) * 16 + 3];
    app.seedAt(10.5, 10.5);
    await new Promise((res) => setTimeout(res, 50));
    const after = (await app.sim.readState())[(10 * 64 + 10) * 16 + 3];
    return { before, after };
  });
  check("Seed plants a seed cell", seed.before !== 1 && seed.after === 1, JSON.stringify(seed));

  // probe
  await T(page, () => { globalThis.__grow.studio.rail.select("probe"); globalThis.__grow.clock.paused = false; });
  await page.mouse.move(640, 360);
  await page.waitForTimeout(300);
  await page.mouse.move(645, 362);
  await page.waitForTimeout(400);
  const probe = await T(page, () => { const p = document.querySelector(".bp-probe"); return p && !p.hidden ? p.textContent : null; });
  check("probe reads the cell under the pointer", !!probe && /Opacity/.test(probe), probe ?? "hidden");

  // a real drag with the Cut tool goes through the event log
  const drag = await T(page, async () => {
    const app = globalThis.__grow;
    await app.loadScene("dish");
    app.clock.paused = true;
    await app.advance(300);
    app.studio.rail.select("cut");
    return { events: app.log.length };
  });
  await page.mouse.move(560, 300);
  await page.mouse.down();
  for (let i = 1; i <= 8; i += 1) { await page.mouse.move(560 + i * 20, 300 + i * 12); await page.waitForTimeout(20); }
  await page.mouse.up();
  await page.waitForTimeout(200);
  const after = await T(page, () => ({ events: globalThis.__grow.log.length, edits: globalThis.__grow.edits, canUndo: globalThis.__grow.history.canUndo }));
  check("a drag with Cut is logged as one undoable edit", after.events > drag.events && after.edits === 1 && after.canUndo, JSON.stringify(after));
  await shot(page, "02-cut");
  check("no console errors (edits, history, probe)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- Tune: a keyboard change to the update chance sticks ----------------------
{
  const { ctx, page, errors } = await open();
  await page.waitForTimeout(800);
  await T(page, () => globalThis.__grow.studio.tune.show());
  await page.waitForTimeout(200);
  const range = page.locator(".bp-tune input[type=range]").first();
  await range.focus();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(300);
  const r = await T(page, () => ({ p: globalThis.__grow.sim.fireRate, input: document.querySelector(".bp-tune input[type=range]")?.value, events: globalThis.__grow.log.length, gated: globalThis.__grow.onGatedRun }));
  check("a keyboard step on the update-chance slider applies and stays (0.5 → 0.55)", r.p === 0.55 && Number(r.input) === 0.55 && r.events === 1 && !r.gated, JSON.stringify(r));
  check("no console errors (Tune)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- compare shows the save point's own hidden channels -----------------------
{
  const { ctx, page, errors } = await open("/v2/?show=hidden&chrome=off");
  await page.waitForTimeout(800);
  await T(page, async () => {
    const app = globalThis.__grow;
    app.studio.callouts.enabled = false;
    app.clock.paused = true;
    await new Promise((res) => setTimeout(res, 100));
    await app.loadScene("dish", { view: "hidden" });
    app.studio.callouts.enabled = false;
    app.clock.paused = true;
    await app.advance(300);
  });
  await page.waitForTimeout(400);
  const clip = { x: 440, y: 160, width: 400, height: 400 };
  const atSave = (await page.screenshot({ clip })).toString("base64");
  await T(page, async () => {
    const app = globalThis.__grow;
    app.savePoint();
    app.cutAt([16, 32, 48, 32], 6);
    await app.advance(120);
  });
  await page.waitForTimeout(400);
  const live = (await page.screenshot({ clip })).toString("base64");
  await T(page, () => { const app = globalThis.__grow; app.toggleCompare(); app.view.split = 1; });
  await page.waitForTimeout(400);
  const saved = (await page.screenshot({ clip })).toString("base64");
  const diff = await T(page, async ([a, b, c]) => {
    const pixels = async (b64) => {
      const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
      const cv = new OffscreenCanvas(bmp.width, bmp.height);
      const cx = cv.getContext("2d");
      cx.drawImage(bmp, 0, 0);
      return cx.getImageData(0, 0, bmp.width, bmp.height).data;
    };
    const [pa, pb, pc] = await Promise.all([pixels(a), pixels(b), pixels(c)]);
    const mad = (x, y) => { let s = 0; for (let i = 0; i < x.length; i += 4) s += Math.abs(x[i] - y[i]) + Math.abs(x[i + 1] - y[i + 1]) + Math.abs(x[i + 2] - y[i + 2]); return s / (x.length / 4) / 3; };
    return { savedVsAtSave: mad(pc, pa), liveVsAtSave: mad(pb, pa) };
  }, [atSave, live, saved]);
  check(
    "compare (Hidden view) draws the save point's own hidden channels",
    diff.savedVsAtSave < 1.5 && diff.liveVsAtSave > 5,
    `saved side vs the dish when saved: ${diff.savedVsAtSave.toFixed(2)}; live vs saved: ${diff.liveVsAtSave.toFixed(2)} (mean |Δ| per channel, 0–255)`,
  );
  if (out) await page.screenshot({ path: join(out, "04-compare-hidden.png") });
  check("no console errors (compare)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- a seed reproduces the same bytes across page loads ---------------------
{
  const a = await open("/v2/?s=seeds&seed=7");
  const h1 = await hashAfter(a.page, 300);
  await a.ctx.close();
  const b = await open("/v2/?s=seeds&seed=7");
  const h2 = await hashAfter(b.page, 300);
  await b.ctx.close();
  const c = await open("/v2/?s=seeds&seed=8");
  const h3 = await hashAfter(c.page, 300);
  await c.ctx.close();
  check("same seed, same bytes across page loads (Many seeds, 300 steps)", h1 === h2, `${h1.slice(0, 16)}… vs ${h2.slice(0, 16)}…`);
  check("a different seed gives a different dish", h1 !== h3);
}

// --- share link; Many seeds settles in the middle ----------------------------
{
  const { ctx, page, errors } = await open("/v2/?s=seeds&seed=11&p=0.35&show=cells&sp=2");
  const p = await T(page, () => ({ scene: globalThis.__grow.scene.id, p: globalThis.__grow.sim.fireRate, show: globalThis.__grow.view.mode, sp: globalThis.__grow.clock.speed, gated: globalThis.__grow.onGatedRun }));
  check("a share link sets scene, update chance, view and speed", p.scene === "seeds" && p.p === 0.35 && p.show === "cells" && p.sp === 2 && !p.gated, JSON.stringify(p));
  await shot(page, "03-cells");
  const settle = await T(page, async () => {
    const app = globalThis.__grow;
    app.clock.paused = true;
    await app.loadScene("seeds", { seed: 11, fireRate: 0.5 });
    app.clock.paused = true;
    await app.advance(1200);
    const st = await app.sim.readState();
    let m = 0, mx = 0, my = 0, alive = 0;
    for (let c = 0; c < 64 * 64; c += 1) {
      const a = Math.min(1, Math.max(0, st[c * 16 + 3]));
      if (st[c * 16 + 3] > 0.1) alive += 1;
      m += a; mx += a * ((c % 64) + 0.5); my += a * (Math.floor(c / 64) + 0.5);
    }
    return { alive, off: Math.hypot(mx / m - 32, my / m - 32) };
  });
  check("Many seeds ends as one organism near the dish's centre (1200 steps)", settle.alive > 1000 && settle.off < 3, `${settle.alive} living cells, centre ${settle.off.toFixed(2)} cells off`);
  check("no console errors (share link, seeds)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- nothing alive: the director grows a new one -----------------------------
{
  const { ctx, page, errors } = await open();
  await page.waitForTimeout(1500);
  await T(page, () => globalThis.__grow.cutAt([0, 32, 64, 32], 40));
  await page.waitForTimeout(4500);
  const d = await T(page, () => ({ tick: globalThis.__grow.sim.tick, edits: globalThis.__grow.edits, alive: globalThis.__grow.lastStats?.alive ?? -1 }));
  check("a dish with nothing alive regrows from the seed", d.edits === 0 && d.tick < 120 && d.tick > 0, JSON.stringify(d));
  check("no console errors (director)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- frame time at the boot scene -------------------------------------------
{
  const { ctx, page } = await open("/v2/?bench=1");
  await page.waitForFunction(() => globalThis.__bpBench, undefined, { timeout: 60000 });
  const b = await T(page, () => globalThis.__bpBench);
  console.log(`BP_BENCH ${JSON.stringify(b)}`);
  check("bench ran", b.frames > 0, `${b.fps.toFixed(1)} fps, frame p50 ${b.frameP50.toFixed(1)} ms / p90 ${b.frameP90.toFixed(1)} ms, GPU p50 ${b.gpuP50.toFixed(2)} ms, ${Math.round(b.stepsPerSecond)} steps/s, ${(b.stepCostMs * 1000).toFixed(0)} µs/step`);
  await ctx.close();
}

await browser.close();
server.close();
const failed = results.filter((r) => !r.ok);
if (out) await writeFile(join(out, "acceptance.json"), JSON.stringify(results, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
