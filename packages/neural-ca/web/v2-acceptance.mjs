// Grow v2 — acceptance checks in a real WebGPU browser
// (docs/planning/rebuild-v2/04-neural-ca.md M0 and M1).
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
// settles in the middle; a dish with nothing alive regrows; probe.
// M1: the Dish boots on the day's regenerating organism; the Menagerie (eight
// dishes, weights SHA-checked, its gated disk still bit-exact at step 1000);
// regrowth after the standard cuts measured on the live kernel against the
// manifest's reference numbers; Freeze (frozen cells keep their bytes, thaw,
// undo by replay); Graft (copy, move, across dishes, undo); Inside the Cell
// (the CPU arithmetic against the GPU's next step, share link); the organism
// picker and card. Prints BP_BENCH lines at the end (the Dish, the Menagerie).
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
  // ready means the gate path is up; the live dish compiles and loads after it
  await page.waitForFunction(() => globalThis.__growLive === true, undefined, { timeout: 60000 });
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

// --- boot order: ready once the gate path is up, the live dish after ------------
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto(origin + "/v2/", { waitUntil: "load" });
  await page.waitForFunction(() => globalThis.__bitPhysicsReady === true, undefined, { timeout: 60000 });
  // the driver's move, at once: a native click on the capture control while the rest boots
  const hash = () =>
    T(page, async () => {
      window.__bitPhysicsCaptureReady = false;
      document.querySelector('[data-bp="capture"]').click();
      while (window.__bitPhysicsCaptureReady !== true) await new Promise((r) => setTimeout(r, 50));
      const bytes = new TextEncoder().encode(JSON.stringify(window.__bitPhysicsCapture.steps));
      const d = await crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(d), (x) => x.toString(16).padStart(2, "0")).join("");
    });
  const atReady = await hash();
  await page.waitForFunction(() => globalThis.__growLive === true, undefined, { timeout: 60000 });
  const boot = await T(page, () => globalThis.__growBoot);
  await page.waitForTimeout(1500);
  const later = await hash();
  const live = await T(page, () => ({ tick: globalThis.__grow.sim.tick, alive: globalThis.__grow.lastStats?.alive ?? 0 }));
  check(
    "ready comes once the gate path is up, before the live dish is compiled",
    boot.ready <= boot.renderer && boot.ready <= boot.kernels && boot.ready < boot.live,
    `ms after navigation: gate ${boot.gate}, ready ${boot.ready}, renderer ${boot.renderer}, live solver ${boot.kernels}, live ${boot.live}`,
  );
  check("a capture clicked at ready, while the rest boots, is byte-identical to one taken later", atReady === later, `${atReady.slice(0, 16)}… vs ${later.slice(0, 16)}…`);
  check("the live dish then runs", live.tick > 10 && live.alive > 100, JSON.stringify(live));
  check("no console errors (boot order)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- boot: the day's organism ---------------------------------------------------
{
  const { ctx, page, errors } = await open();
  await page.waitForTimeout(2500);
  const r = await T(page, () => {
    const app = globalThis.__grow;
    const d = app.organism.def;
    return { scene: app.scene.id, organism: d.id, today: app.lib.today(), heals: d.training.regime === "regenerating", gated: app.onGatedRun, prompt: document.querySelector(".bp-scene-prompt")?.textContent };
  });
  check("boots into The Dish on the day's regenerating organism (not the gated run)", r.scene === "dish" && r.organism === r.today && r.heals && !r.gated && /it heals/.test(r.prompt), JSON.stringify(r));
  await shot(page, "00-dish-today");
  check("no console errors (boot, today's organism)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- boot: the gated disk -------------------------------------------------------
{
  const { ctx, page, errors } = await open("/v2/?o=disk");
  await page.waitForTimeout(3000);
  const d = await T(page, () => globalThis.__bpDebug());
  check("?o=disk boots into The Dish with the gated run on screen", d.scene === "dish" && d.organism === "disk" && d.gated === true, `${d.scene}, ${d.organism}, gated ${d.gated}, adapter ${d.adapter}`);
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
    await app.loadScene("dish", { organism: "disk" });
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
  const { ctx, page, errors } = await open("/v2/?o=disk");
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
  const { ctx, page, errors } = await open("/v2/?o=disk");
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
  const { ctx, page, errors } = await open("/v2/?o=disk&show=hidden&chrome=off");
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
  const a = await open("/v2/?s=seeds&seed=7&o=disk");
  const h1 = await hashAfter(a.page, 300);
  await a.ctx.close();
  const b = await open("/v2/?s=seeds&seed=7&o=disk");
  const h2 = await hashAfter(b.page, 300);
  await b.ctx.close();
  const c = await open("/v2/?s=seeds&seed=8&o=disk");
  const h3 = await hashAfter(c.page, 300);
  await c.ctx.close();
  check("same seed, same bytes across page loads (Many seeds, 300 steps)", h1 === h2, `${h1.slice(0, 16)}… vs ${h2.slice(0, 16)}…`);
  check("a different seed gives a different dish", h1 !== h3);
}

// --- share link; Many seeds settles in the middle ----------------------------
{
  const { ctx, page, errors } = await open("/v2/?s=seeds&o=disk&seed=11&p=0.35&show=cells&sp=2");
  const p = await T(page, () => ({ scene: globalThis.__grow.scene.id, o: globalThis.__grow.organism.def.id, p: globalThis.__grow.sim.fireRate, show: globalThis.__grow.view.mode, sp: globalThis.__grow.clock.speed, gated: globalThis.__grow.onGatedRun }));
  check("a share link sets scene, organism, update chance, view and speed", p.scene === "seeds" && p.o === "disk" && p.p === 0.35 && p.show === "cells" && p.sp === 2 && !p.gated, JSON.stringify(p));
  await shot(page, "03-cells");
  const settle = await T(page, async () => {
    const app = globalThis.__grow;
    app.clock.paused = true;
    await app.loadScene("seeds", { seed: 11, fireRate: 0.5, organism: "disk" });
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

// ============================================================== M1 ==========

// in-page helpers: the target's mask (from its PNG) and IoU of opacity > 0.5 against it
const IOU_HELPERS = `
  globalThis.__accTarget = async (id) => {
    const def = globalThis.__grow.lib.def(id);
    const bmp = await createImageBitmap(await (await fetch(new URL("../" + def.target, location.href))).blob());
    const cv = new OffscreenCanvas(bmp.width, bmp.height);
    const cx = cv.getContext("2d");
    cx.drawImage(bmp, 0, 0);
    const px = cx.getImageData(0, 0, bmp.width, bmp.height).data;
    const m = new Uint8Array(64 * 64);
    for (let i = 0; i < 64 * 64; i += 1) m[i] = px[i * 4 + 3] > 127.5 ? 1 : 0;
    return m;
  };
  globalThis.__accIou = (st, mask) => {
    let inter = 0, uni = 0;
    for (let i = 0; i < 64 * 64; i += 1) {
      const a = Math.min(1, Math.max(0, st[i * 16 + 3])) > 0.5 ? 1 : 0;
      inter += a & mask[i];
      uni += a | mask[i];
    }
    return uni ? inter / uni : 0;
  };
`;

// --- the Menagerie --------------------------------------------------------------
{
  const { ctx, page, errors } = await open("/v2/?s=menagerie");
  await page.waitForTimeout(2500);
  await shot(page, "10-menagerie");
  const r = await T(page, async () => {
    const app = globalThis.__grow;
    const ids = app.dishes.map((d) => d.org.def.id);
    const manifest = app.lib.defs.map((d) => d.id);
    const labels = [...document.querySelectorAll(".gr-label")].map((b) => b.textContent);
    app.clock.paused = true;
    await new Promise((res) => setTimeout(res, 100));
    await app.loadScene("menagerie");
    app.clock.paused = true;
    await app.advance(300);
    const alive = [];
    for (let i = 0; i < app.dishes.length; i += 1) {
      const st = await app.dishes[i].sim.readState();
      let n = 0;
      for (let c = 0; c < 64 * 64; c += 1) if (st[c * 16 + 3] > 0.1) n += 1;
      alive.push(n);
    }
    const shas = await globalThis.__growProve.checkMenagerie();
    return { ids, manifest, labels, alive, shas, gated: app.onGatedRun };
  });
  check(
    "the Menagerie shows every trained organism, one dish each, in the manifest's order",
    r.ids.length === 8 && r.ids.join() === r.manifest.join() && r.labels.length === 8 && !r.gated,
    `${r.ids.join(", ")}`,
  );
  check("every organism's downloaded weights match the manifest's SHA-256", r.shas.length === 8 && r.shas.every((x) => x.matches), r.shas.map((x) => `${x.id} ${x.sha.slice(0, 8)}`).join(", "));
  check("all eight organisms grow (300 steps, one clock)", r.alive.every((n) => n > 150), r.alive.join(" / "));

  // the gated disk inside the Menagerie is still the gated kernel's run, bit for bit
  const canon = await T(page, async () => {
    const app = globalThis.__grow;
    await app.loadScene("menagerie");
    app.clock.paused = true;
    await app.advance(1000);
    const st = await app.dishes[0].sim.readState();
    const frames = await globalThis.__growGate.fetchCanonFrames();
    const last = frames[frames.length - 1];
    let differ = 0;
    for (let c = 0; c < 64 * 64; c += 1) {
      for (let ch = 0; ch < 4; ch += 1) if (Math.fround(Math.min(1, Math.max(0, st[c * 16 + ch]))) !== last[c * 4 + ch]) differ += 1;
    }
    return { differ, organism: app.dishes[0].org.def.id, tick: app.sim.tick };
  });
  check("the Menagerie's disk at step 1000 equals the committed canonical frame (eight dishes per pass change nothing)", canon.organism === "disk" && canon.differ === 0 && canon.tick === 1000, `${canon.differ} values differ`);

  // a graft from one dish into another lands as the same cells, under the new dish's rule
  const cross = await T(page, async () => {
    const app = globalThis.__grow;
    await app.loadScene("menagerie");
    app.clock.paused = true;
    await app.advance(300);
    const from = await app.dishes[1].sim.readState();
    app.graftAt([32, 30], [32, 30], 6, true, 1, 2);
    await new Promise((res) => setTimeout(res, 50));
    const to = await app.dishes[2].sim.readState();
    const src = await app.dishes[1].sim.readState();
    let same = 0, cells = 0, cleared = 0;
    for (let y = 0; y < 64; y += 1) {
      for (let x = 0; x < 64; x += 1) {
        if (Math.hypot(x - 32, y - 30) > 6) continue;
        cells += 1;
        const b = (y * 64 + x) * 16;
        let eq = true, zero = true;
        for (let c = 0; c < 16; c += 1) {
          if (to[b + c] !== from[b + c]) eq = false;
          if (src[b + c] !== 0) zero = false;
        }
        same += eq ? 1 : 0;
        cleared += zero ? 1 : 0;
      }
    }
    return { cells, same, cleared, edits: app.edits, names: [app.dishes[1].org.def.name, app.dishes[2].org.def.name] };
  });
  check(
    "Graft across dishes: the piece arrives byte for byte, and a move clears it from the donor",
    cross.same === cross.cells && cross.cleared === cross.cells && cross.edits === 1,
    `${cross.names.join(" → ")}: ${cross.same}/${cross.cells} cells identical, ${cross.cleared} cleared`,
  );

  // the organism card, then "Grow it in the Dish"
  await T(page, async () => {
    const app = globalThis.__grow;
    await app.loadScene("menagerie");
    app.clock.paused = false;
  });
  await page.waitForTimeout(400);
  await page.locator(".gr-label").nth(1).click();
  await page.waitForTimeout(300);
  const card = await T(page, () => {
    const c = document.querySelector(".gr-card");
    return c && !c.hidden ? c.textContent : null;
  });
  await shot(page, "11-menagerie-card");
  check("an organism's card shows how it was trained and what was measured", !!card && /How it was trained/.test(card) && /training steps in \d+ s on/.test(card) && /Measured/.test(card), (card ?? "hidden").slice(0, 120));
  await page.locator(".gr-card .bp-btn-primary").click();
  await page.waitForTimeout(800);
  const opened = await T(page, () => ({ scene: globalThis.__grow.scene.id, organism: globalThis.__grow.organism.def.id, card: !document.querySelector(".gr-card") || document.querySelector(".gr-card").hidden }));
  check("“Grow it in the Dish” opens that organism on The Dish", opened.scene === "dish" && opened.organism === "gecko" && opened.card, JSON.stringify(opened));
  check("no console errors (Menagerie)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- regrowth on the live kernel, against the manifest's reference ----------------
{
  const { ctx, page, errors } = await open("/v2/?o=gecko");
  await page.evaluate(IOU_HELPERS);
  const rows = await T(page, async () => {
    const app = globalThis.__grow;
    app.clock.paused = true;
    await new Promise((res) => setTimeout(res, 100));
    const cuts = {
      "right half": [[48, -2, 48, 66], 16],
      "bottom half": [[-2, 48, 66, 48], 16],
      "middle disc": [[32, 32], 9],
    };
    const out = [];
    for (const def of app.lib.defs) {
      const mask = await globalThis.__accTarget(def.id);
      const ref = def.measured.regrow.rows.filter((r) => r.seed === 42);
      const ious = [];
      for (const [kind, [pts, r]] of Object.entries(cuts)) {
        await app.loadScene("dish", { organism: def.id, seed: 42 });
        app.clock.paused = true;
        await app.advance(400);
        app.cutAt(pts, r);
        await app.advance(200);
        const st = await app.sim.readState();
        ious.push({ kind, live: globalThis.__accIou(st, mask), ref: ref.find((x) => x.cut === kind)?.iou_200 });
      }
      const mean = ious.reduce((a, b) => a + b.live, 0) / ious.length;
      const refMean = ious.reduce((a, b) => a + b.ref, 0) / ious.length;
      out.push({ id: def.id, heals: def.training.regime === "regenerating" && def.measured.regrow.mean_iou_200 >= 0.8, mean, refMean, ious });
    }
    return out;
  });
  for (const r of rows) console.log(`  regrow ${r.id.padEnd(10)} live ${r.ious.map((x) => x.live.toFixed(3)).join(" ")}  ref ${r.ious.map((x) => x.ref.toFixed(3)).join(" ")}`);
  const healers = rows.filter((r) => r.heals);
  check(
    "every organism the page says heals does heal on this GPU: mean overlap ≥ 0.8, 200 steps after the three standard cuts (mask seed 42)",
    healers.length === 7 && healers.every((r) => r.mean >= 0.8),
    healers.map((r) => `${r.id} ${r.mean.toFixed(2)}`).join(", "),
  );
  const disk = rows.find((r) => r.id === "disk");
  check("the gated disk does not: a right-half cut does not grow back", disk && disk.ious[0].live < 0.5, disk ? `right half ${disk.ious[0].live.toFixed(3)}, mean ${disk.mean.toFixed(2)}` : "");
  const worst = Math.max(...rows.flatMap((r) => r.ious.map((x) => Math.abs(x.live - x.ref))));
  check("the live kernel's regrowth agrees with the manifest's reference numbers (|Δ IoU| per cut)", worst < 0.05, `max |Δ| ${worst.toFixed(4)} over ${rows.length * 3} cuts`);
  check("no console errors (regrowth)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- Freeze ----------------------------------------------------------------------
{
  const { ctx, page, errors } = await open("/v2/?o=gecko");
  const r = await T(page, async () => {
    const app = globalThis.__grow;
    app.clock.paused = true;
    await new Promise((res) => setTimeout(res, 100));
    await app.loadScene("dish", { organism: "gecko" });
    app.clock.paused = true;
    await app.advance(160);
    const clean = await app.stateHash();
    await app.loadScene("dish", { organism: "gecko" });
    app.clock.paused = true;
    await app.advance(40);
    app.freezeAt([32, 32], 6, true);
    const mask = app.sim.freeze.slice();
    const s0 = await app.sim.readState();
    await app.advance(120);
    const s1 = await app.sim.readState();
    let frozen = 0, kept = 0, moved = 0;
    for (let i = 0; i < 64 * 64; i += 1) {
      let eq = true;
      for (let c = 0; c < 16; c += 1) if (s0[i * 16 + c] !== s1[i * 16 + c]) eq = false;
      if (mask[i]) { frozen += 1; kept += eq ? 1 : 0; } else if (!eq) moved += 1;
    }
    const gated = app.onGatedRun;
    const frozenHash = await app.stateHash();
    await app.undo();
    const undone = await app.stateHash();
    // thaw: the region updates again
    await app.loadScene("dish", { organism: "gecko" });
    app.clock.paused = true;
    await app.advance(40);
    app.freezeAt([32, 32], 6, true);
    await app.advance(60);
    const t0 = await app.sim.readState();
    app.thawAll();
    const count = app.sim.frozenCount;
    await app.advance(60);
    const t1 = await app.sim.readState();
    let changed = 0;
    for (let i = 0; i < 64 * 64; i += 1) if (mask[i] && t0[i * 16 + 3] !== t1[i * 16 + 3]) changed += 1;
    return { frozen, kept, moved, gated, clean, frozenHash, undone, count, changed, tick: app.sim.tick };
  });
  check("Freeze: every frozen cell keeps its 16 values through 120 steps while the rest grows", r.frozen > 80 && r.kept === r.frozen && r.moved > 100 && !r.gated, `${r.kept}/${r.frozen} frozen cells unchanged, ${r.moved} other cells changed`);
  check("undoing a freeze replays to the never-frozen bytes", r.undone === r.clean && r.frozenHash !== r.clean, `${r.undone.slice(0, 16)}… vs ${r.clean.slice(0, 16)}…`);
  check("Thaw all: nothing frozen, and the region updates again", r.count === 0 && r.changed > 20, `${r.changed} thawed cells changed opacity in 60 steps`);
  await shot(page, "12-freeze");
  check("no console errors (Freeze)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- Graft -----------------------------------------------------------------------
{
  const { ctx, page, errors } = await open("/v2/?o=starfish");
  const r = await T(page, async () => {
    const app = globalThis.__grow;
    app.clock.paused = true;
    await new Promise((res) => setTimeout(res, 100));
    await app.loadScene("dish", { organism: "starfish" });
    app.clock.paused = true;
    await app.advance(300);
    const clean300 = await app.stateHash();
    await app.advance(100);
    const clean = await app.stateHash();
    await app.loadScene("dish", { organism: "starfish" });
    app.clock.paused = true;
    await app.advance(300);
    const s0 = await app.sim.readState();
    app.graftAt([32, 32], [12, 12], 5, false);
    const s1 = await app.sim.readState();
    let copied = 0, cells = 0, srcKept = true;
    for (let y = 0; y < 64; y += 1) {
      for (let x = 0; x < 64; x += 1) {
        const b = (y * 64 + x) * 16;
        if (Math.hypot(x - 12, y - 12) <= 5) {
          cells += 1;
          const sb = ((y + 20) * 64 + (x + 20)) * 16;
          let eq = true;
          for (let c = 0; c < 16; c += 1) if (s1[b + c] !== s0[sb + c]) eq = false;
          copied += eq ? 1 : 0;
        } else {
          for (let c = 0; c < 16; c += 1) if (s1[b + c] !== s0[b + c]) srcKept = false;
        }
      }
    }
    await app.advance(100);
    const grafted = await app.stateHash();
    await app.undo();
    const undone = await app.stateHash();
    // move: the source disc is cleared
    await app.loadScene("dish", { organism: "starfish" });
    app.clock.paused = true;
    await app.advance(300);
    app.graftAt([32, 32], [50, 14], 5, true);
    const m = await app.sim.readState();
    let cleared = 0, src = 0;
    for (let y = 0; y < 64; y += 1) for (let x = 0; x < 64; x += 1) {
      if (Math.hypot(x - 32, y - 32) > 5) continue;
      src += 1;
      let z = true;
      for (let c = 0; c < 16; c += 1) if (m[(y * 64 + x) * 16 + c] !== 0) z = false;
      cleared += z ? 1 : 0;
    }
    return { cells, copied, srcKept, grafted, undone, clean, clean300, cleared, src, edits: app.edits };
  });
  check("Graft (copy): the destination disc is the source disc, byte for byte; nothing else changes", r.copied === r.cells && r.srcKept, `${r.copied}/${r.cells} cells`);
  check("Graft (move) clears the source disc", r.cleared === r.src, `${r.cleared}/${r.src}`);
  check("undoing a graft replays to the never-grafted bytes", r.undone === r.clean && r.grafted !== r.clean, `${r.undone.slice(0, 16)}… vs ${r.clean.slice(0, 16)}…`);

  // a real drag with the Graft tool goes through the event log
  await T(page, async () => {
    const app = globalThis.__grow;
    await app.loadScene("dish", { organism: "starfish" });
    app.clock.paused = true;
    await app.advance(300);
    app.studio.rail.select("graft");
  });
  await page.waitForTimeout(200);
  await page.mouse.move(640, 360);
  await page.mouse.down();
  for (let i = 1; i <= 10; i += 1) { await page.mouse.move(640 + i * 14, 360 - i * 9); await page.waitForTimeout(25); }
  const ghost = await T(page, () => !document.querySelector(".gr-ghost").hidden);
  await shot(page, "13-graft-drag");
  await page.mouse.up();
  await page.waitForTimeout(250);
  const after = await T(page, () => ({ events: globalThis.__grow.log.all().map((e) => e.kind), edits: globalThis.__grow.edits, canUndo: globalThis.__grow.history.canUndo }));
  check("a drag with Graft lifts a ghost of the piece and logs one undoable graft", ghost && after.events.join() === "graft" && after.edits === 1 && after.canUndo, JSON.stringify({ ghost, ...after }));
  check("no console errors (Graft)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- Inside the Cell -------------------------------------------------------------
{
  const { ctx, page, errors } = await open("/v2/?s=cell&o=turtle&cell=30,20");
  await page.waitForTimeout(2000);
  const link = await T(page, () => ({ scene: globalThis.__grow.scene.id, o: globalThis.__grow.organism.def.id, cell: globalThis.__grow.cellSel, view: globalThis.__grow.viewMode, panel: !document.querySelector(".gr-cell-panel").hidden }));
  check("a share link opens Inside the Cell on its organism and cell, in the Cells view", link.scene === "cell" && link.o === "turtle" && link.cell.join() === "30,20" && link.view === "cells" && link.panel, JSON.stringify(link));
  const r = await T(page, async () => {
    const app = globalThis.__grow;
    const out = [];
    for (const o of ["turtle", "gecko", "disk"]) {
      await app.loadScene("cell", { organism: o, cell: [32, 32] });
      app.clock.paused = true;
      await app.advance(30 + out.length * 25);
      for (const c of [[32, 32], [31, 22], [40, 37], [22, 30], [32, 12], [45, 45]]) {
        app.selectCell(c[0], c[1]);
        const k = await app.checkCell();
        out.push({ o, c, maxAbs: k.maxAbs, lives: k.step.lives, fires: k.step.fires, active: k.step.think.active });
      }
    }
    return out;
  });
  const worst = Math.max(...r.map((x) => x.maxAbs));
  const mix = { lives: r.filter((x) => x.lives).length, dies: r.filter((x) => !x.lives).length, fires: r.filter((x) => x.fires).length };
  check("Inside the Cell: the page's arithmetic predicts the GPU's next step for the cell (18 cells, 3 organisms)", worst < 1e-5 && mix.lives > 3 && mix.fires > 3, `max |Δ| ${worst === 0 ? "0 (identical)" : worst.toExponential(2)}; ${mix.lives} live, ${mix.dies} empty/dying, ${mix.fires} fired`);
  // a frozen inspected cell: the GPU copies its old values back, and so must the prediction
  const fz = await T(page, async () => {
    const app = globalThis.__grow;
    await app.loadScene("cell", { organism: "gecko", cell: [32, 30] });
    app.clock.paused = true;
    await app.advance(20);
    app.freezeAt([32.5, 30.5], 0.5, true);
    let worst = 0, changing = 0, tries = 0;
    for (; tries < 40 && changing < 3; tries += 1) {
      const k = await app.checkCell();
      worst = Math.max(worst, k.maxAbs);
      if (!k.step.frozen) return { error: "not frozen" };
      if (k.step.fires && k.step.lives && Math.max(...Array.from(k.step.think.dx, Math.abs)) > 1e-4) changing += 1;
    }
    return { worst, changing, tries, frozenCells: app.sim.frozenCount };
  });
  check(
    "Inside the Cell on a frozen cell: the prediction keeps its values, as the GPU does",
    !fz.error && fz.frozenCells === 1 && fz.changing >= 3 && fz.worst < 1e-5,
    fz.error ?? `max |Δ| ${fz.worst === 0 ? "0" : fz.worst.toExponential(2)} over ${fz.tries} steps, ${fz.changing} of them steps the rule would have changed it`,
  );
  // the panel's own check line, after Step once
  await T(page, async () => {
    const app = globalThis.__grow;
    await app.loadScene("cell", { organism: "gecko", cell: [32, 30] });
    app.clock.paused = true;
    await app.advance(80);
  });
  await page.waitForTimeout(600);
  await page.locator(".gr-cell-actions .bp-btn").first().click();
  await page.waitForTimeout(800);
  const line = await T(page, () => document.querySelector(".gr-cell-check")?.textContent ?? "");
  await shot(page, "14-inside-the-cell");
  check("its check line reports the comparison after Step once", /Checked against your GPU/.test(line), line);
  // the organism picker
  await page.locator(".gr-organism-picker").selectOption("fish");
  await page.waitForTimeout(800);
  const picked = await T(page, () => ({ scene: globalThis.__grow.scene.id, o: globalThis.__grow.organism.def.id }));
  check("the heading's organism picker swaps the organism in place", picked.scene === "cell" && picked.o === "fish", JSON.stringify(picked));
  check("no console errors (Inside the Cell)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- frame time: the boot scene, and the Menagerie's eight dishes -------------
for (const [label, path] of [["the Dish", "/v2/?bench=1"], ["the Menagerie", "/v2/?s=menagerie&bench=1"]]) {
  const { ctx, page } = await open(path);
  await page.waitForFunction(() => globalThis.__bpBench, undefined, { timeout: 60000 });
  const b = await T(page, () => globalThis.__bpBench);
  console.log(`BP_BENCH ${JSON.stringify(b)}`);
  check(`bench ran (${label})`, b.frames > 0, `${b.fps.toFixed(1)} fps, frame p50 ${b.frameP50.toFixed(1)} ms / p90 ${b.frameP90.toFixed(1)} ms, GPU p50 ${b.gpuP50.toFixed(2)} ms, ${Math.round(b.stepsPerSecond)} steps/s, ${(b.stepCostMs * 1000).toFixed(0)} µs/step`);
  await ctx.close();
}

await browser.close();
server.close();
const failed = results.filter((r) => !r.ok);
if (out) await writeFile(join(out, "acceptance.json"), JSON.stringify(results, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
