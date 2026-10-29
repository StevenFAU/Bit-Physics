// Turing Patterns v2 — acceptance checks in a real WebGPU browser
// (docs/planning/rebuild-v2/01-reaction-diffusion.md M0–M2; 00-foundation.md F1).
//
//   npm run build   (in this directory)
//   CHROME_BIN=/snap/bin/chromium \
//   PLAYWRIGHT_MODULE=<repo>/tools/productization/web-deploy/web/headless/node_modules/playwright/index.js \
//   node v2-acceptance.mjs [out-dir]
//
// Checks: boot; dive-in + breadcrumb; save / restore; A/B compare; undo by
// replay is byte-identical to never having made the edit; a share link
// reproduces the scene's starting state across page loads; probe; Learn
// instruments; keyboard; every listed scene boots without errors.
// M3: the extra models against their f64 goldens and the analytic Turing
// check (both run on this GPU from the Prove drawer's own code); On a Shape —
// sphere and torus, orbit, painting on the surface, undo by replay and share
// links there too; the Learn model panel.

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

async function open(path = "/", viewport = { width: 1440, height: 900 }) {
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

// --- boot ---------------------------------------------------------------------
{
  const { ctx, page, errors } = await open();
  const s = await T(page, () => ({ scene: __turing.scene.id, tool: __turing.studio.rail.active, title: document.querySelector(".bp-scene-title")?.textContent }));
  check("boots into The Map with the Dive tool", s.scene === "map" && s.tool === "dive" && s.title === "The Map", JSON.stringify(s));
  await page.waitForTimeout(1500);
  await shot(page, "01-map");

  // --- keyboard ---------------------------------------------------------------
  await page.locator(".bp-canvas").focus();
  await page.keyboard.press("Space");
  const paused = await T(page, () => __turing.clock.paused);
  await page.keyboard.press("Space");
  const resumed = await T(page, () => !__turing.clock.paused);
  await page.keyboard.press("2");
  const tool2 = await T(page, () => __turing.studio.rail.active);
  await page.keyboard.press("1");
  check("keyboard: Space pauses and resumes, number keys pick tools", paused && resumed && tool2 === "seed", `tool 2 = ${tool2}`);

  // --- dive -------------------------------------------------------------------
  const before = await T(page, () => ({ zoom: __turing.camera.pxPerUnit, cover: __turing.camera.coverZoom() }));
  await page.mouse.click(900, 450);
  await page.waitForTimeout(1800);
  const dive = await T(page, () => ({
    reveal: __turing.sim.chem.reveal !== null,
    F: __turing.sim.chem.F0,
    k: __turing.sim.chem.k0,
    zoom: __turing.camera.pxPerUnit / __turing.camera.coverZoom(),
    title: document.querySelector(".bp-scene-title")?.textContent,
    crumb: !!document.querySelector(".rd-crumb") && getComputedStyle(document.querySelector(".rd-crumb")).display !== "none",
    tools: [...document.querySelectorAll(".bp-rail-tools .bp-tool")].map((b) => b.dataset.tool),
  }));
  check(
    "dive: tap sets the chemistry, the camera dives in, breadcrumb appears",
    dive.reveal && dive.zoom > 2 && dive.crumb && !dive.tools.includes("dive") && dive.title !== "The Map",
    `${dive.title} · F ${dive.F.toFixed(4)} k ${dive.k.toFixed(4)} · zoom ${dive.zoom.toFixed(2)}× cover`,
  );
  await page.waitForTimeout(2500);
  await shot(page, "02-dived");

  // breadcrumb drag morphs the dish
  const crumb = await page.locator(".rd-crumb-canvas").boundingBox();
  await page.mouse.move(crumb.x + crumb.width * 0.5, crumb.y + crumb.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(crumb.x + crumb.width * 0.78, crumb.y + crumb.height * 0.42, { steps: 6 });
  await page.mouse.up();
  const morph = await T(page, () => ({ F: __turing.sim.chem.F0, k: __turing.sim.chem.k0, caption: document.querySelector(".rd-crumb-caption")?.textContent }));
  check("breadcrumb drag moves the dish through (F, k)", Math.abs(morph.F - dive.F) > 1e-4, morph.caption);
  await page.waitForTimeout(2000);
  await shot(page, "03-morphed");

  // the URL now reproduces a dish at this chemistry
  await page.waitForTimeout(600);
  const href = await T(page, () => location.href);
  const q = new URL(href).searchParams;
  check("share link: the URL carries the scene, chemistry, grid and camera", q.get("s") === "dish" && q.get("F") && q.get("k") && q.get("g") && q.get("cam"), new URL(href).search);

  // history can cross the dive: undoing it brings back the Map sweep and its Dive tool
  const undive = await T(page, async () => {
    const a = __turing;
    while (a.sim.chem.reveal !== null && a.history.canUndo) await a.undo();
    return {
      reveal: a.sim.chem.reveal !== null,
      tools: [...document.querySelectorAll(".bp-rail-tools .bp-tool")].map((b) => b.dataset.tool),
    };
  });
  check("undoing the dive brings back the Map sweep and its Dive tool", !undive.reveal && undive.tools.includes("dive"), undive.tools.join(" "));
  check("no console errors on The Map", errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();

  // --- share link reproduces the starting state across page loads ---------------
  const hashes = [];
  for (let i = 0; i < 2; i += 1) {
    const p2 = await open(new URL(href).pathname + new URL(href).search);
    const h = await T(p2.page, async () => {
      __turing.clock.paused = true;
      await __turing.restart();
      __turing.clock.paused = true;
      return { hash: await __turing.stateHash(), tick: __turing.sim.tick, scene: __turing.scene.id, F: __turing.sim.chem.F0, k: __turing.sim.chem.k0, grid: [__turing.sim.w, __turing.sim.h] };
    });
    hashes.push(h);
    await p2.ctx.close();
  }
  check(
    "share link: two fresh page loads reproduce the identical starting state",
    hashes[0].hash === hashes[1].hash && hashes[0].tick === 0 && hashes[0].scene === "dish" && Math.abs(hashes[0].F - morph.F) < 1e-6,
    `${hashes[0].hash.slice(0, 12)} vs ${hashes[1].hash.slice(0, 12)} · ${hashes[0].grid.join("×")}`,
  );
}

// --- history: save / restore / compare / undo-by-replay ------------------------
{
  const { ctx, page, errors } = await open("/?s=mitosis&seed=7");
  const r = await T(page, async () => {
    const a = __turing;
    a.clock.paused = true;
    await a.loadScene("mitosis", { seed: 7, grid: [512, 320] });
    a.clock.paused = true;
    await a.advanceTicks(200);
    const clean = await a.stateHash();
    await a.loadScene("mitosis", { seed: 7, grid: [512, 320] });
    a.clock.paused = true;
    await a.advanceTicks(100);
    return { clean };
  });
  // paint a real stroke with the pointer at tick 100
  await T(page, () => __turing.studio.rail.select("seed"));
  await page.mouse.move(500, 300);
  await page.mouse.down();
  await page.mouse.move(800, 520, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const r2 = await T(page, async () => {
    const a = __turing;
    const events = a.log.length;
    await a.advanceTicks(100);
    const edited = await a.stateHash();
    await a.undo();
    const undone = await a.stateHash();
    return { events, edited, undone, tick: a.sim.tick };
  });
  check("undo: a stroke was logged as an edit event", r2.events > 0, `${r2.events} event(s)`);
  check("undo: the edit changed the field", r2.edited !== r.clean);
  check(
    "undo by replay is byte-identical to never making the edit",
    r2.undone === r.clean && r2.tick === 200,
    `clean ${r.clean.slice(0, 12)} · undone ${r2.undone.slice(0, 12)} · tick ${r2.tick}`,
  );

  const sr = await T(page, async () => {
    const a = __turing;
    a.savePoint();
    const saved = await a.stateHash();
    await a.advanceTicks(80);
    const later = await a.stateHash();
    a.toggleCompare();
    return { saved, later, comparing: a.history.comparing };
  });
  await page.mouse.move(700, 450);
  await page.waitForTimeout(400);
  await shot(page, "04-compare");
  const sr2 = await T(page, async () => {
    const a = __turing;
    a.toggleCompare();
    a.restoreSave();
    return { restored: await a.stateHash() };
  });
  check("save point → restore returns the exact saved state", sr2.restored === sr.saved && sr.later !== sr.saved);
  check("A/B compare toggles a wipe against the save point", sr.comparing === true);

  // the diffusion ratio is page state; restore and undo must leave it describing the running Dv
  const rr = await T(page, async () => {
    const a = __turing;
    const r0 = a.ratio;
    a.savePoint();
    a.setRatio(r0 + 0.5);
    const changed = a.ratio;
    a.restoreSave();
    const restored = a.ratio;
    const restoredDv = a.sim.chem.Dv;
    a.setRatio(r0 + 0.25);
    await a.advanceTicks(10);
    await a.undo();
    return { r0, changed, restored, restoredDv, undone: a.ratio, undoneDv: a.sim.chem.Dv, Du: a.sim.chem.Du };
  });
  const inStep = (r, Dv) => Math.abs(rr.Du / Dv - r) < 1e-9;
  check(
    "restore and undo keep the diffusion ratio in step with the running Dv",
    rr.changed !== rr.r0 && rr.restored === rr.r0 && inStep(rr.restored, rr.restoredDv) && rr.undone === rr.r0 && inStep(rr.undone, rr.undoneDv),
    `ratio ${rr.r0} → ${rr.changed} → restore ${rr.restored} · undo ${rr.undone}`,
  );

  // probe
  await T(page, () => __turing.studio.rail.select("probe"));
  await page.mouse.move(720, 450);
  await page.waitForTimeout(500);
  await page.mouse.move(724, 452);
  await page.waitForTimeout(500);
  const probe = await T(page, () => {
    const p = document.querySelector(".bp-probe");
    return { visible: p && !p.hidden, text: p?.textContent ?? "" };
  });
  check("probe reads U, V and the local chemistry", probe.visible && /V \(pattern\)/.test(probe.text), probe.text.slice(0, 80));

  // Learn instruments
  await T(page, () => { __turing.clock.paused = false; __turing.studio.drawer.open("learn"); });
  await page.waitForTimeout(4000);
  const learn = await T(page, () => ({
    lambda: document.querySelector(".rd-lambda")?.textContent,
    spots: document.querySelector(".bp-spark-value")?.textContent,
  }));
  check("Learn instruments: spectrum and pattern statistics update", !/measuring/.test(learn.lambda ?? "measuring") && learn.spots !== "—", `${learn.lambda} · spots ${learn.spots}`);
  await shot(page, "05-learn");
  check("no console errors in the history / instrument checks", errors.length === 0, errors.slice(0, 3).join(" | "));
  await ctx.close();
}

// --- exports, reduced motion, the dev overlay ----------------------------------------
{
  const { ctx, page, errors } = await open("/?debug=perf");
  await page.waitForTimeout(800);
  const snap = await T(page, () => new Promise((resolve) => {
    __turing.onSnapshot = (b) => resolve(b.size);
    __turing.requestSnapshot();
    setTimeout(() => resolve(-1), 3000);
  }));
  check("Save image produces a PNG of the canvas", snap > 50000, `${snap} bytes`);
  const perf = await T(page, () => !!document.querySelector(".bp-perf canvas"));
  check("?debug=perf shows the frame graph", perf);
  check("no console errors with the dev overlay", errors.length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
  const rctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: "reduce" });
  const rp = await rctx.newPage();
  await rp.goto(`${origin}/`, { waitUntil: "load" });
  await rp.waitForFunction(() => globalThis.__bitPhysicsReady === true, undefined, { timeout: 60000 });
  const rm = await T(rp, () => ({ speed: __turing.clock.speed, still: __turing.camera.reducedMotion }));
  check("reduced motion: the sim starts slowed and the camera never animates", rm.speed === 0.25 && rm.still, JSON.stringify(rm));
  await rctx.close();
}

// --- the live solver is the gated update rule ------------------------------------
// On a uniform-chemistry periodic 128² dish from the committed seed-42 field,
// the live kernel (per-cell chemistry, fast neighbour indexing) must produce
// the same bytes as the gated kernel after 2000 steps on this GPU.
{
  const { ctx, page, errors } = await open("/?s=gated");
  const r = await T(page, async () => {
    const a = __turing;
    a.clock.paused = true;
    await a.loadScene("gated");
    a.clock.paused = true;
    await a.advanceTicks(500);
    const gated = await a.stateHash();
    await a.loadScene("dish", { F: 0.0367, k: 0.0649, grid: [128, 128] });
    a.clock.paused = true;
    const res = await fetch(new URL("./rd2d-ic-seed42.bin", location.href));
    a.sim.upload(new Float32Array(await res.arrayBuffer()));
    await a.advanceTicks(500);
    return { gated, live: await a.stateHash(), kernel: a.sim.kernel, periodic: a.sim.periodic };
  });
  check(
    "live solver == gated kernel, byte for byte, on the canonical dish (2000 steps)",
    r.gated === r.live && r.kernel === "live" && r.periodic,
    `${r.gated.slice(0, 12)} vs ${r.live.slice(0, 12)}`,
  );
  check("no console errors in the kernel-equivalence check", errors.length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

// --- M3: the extra models and the analytic Turing check, on this GPU ---------------
{
  const { ctx, page, errors } = await open("/?s=gated");
  const models = await T(page, async () => (await __turingProve.runModels()).map((r) => ({ m: r.model, worst: r.worst, budget: r.budget, pass: r.pass })));
  for (const r of models) check(`model golden: ${r.m} agrees with its f64 golden`, r.pass, `${r.worst.toExponential(2)} of max|field| · budget ${r.budget.toExponential(0)}`);
  const again = await T(page, async () => (await __turingProve.runModels()).map((r) => r.worst));
  check("model goldens: a second run on this GPU gives the same numbers", JSON.stringify(again) === JSON.stringify(models.map((r) => r.worst)));
  const t = await T(page, async () => {
    const r = await __turingProve.runTuring();
    return r && { measured: r.measured, predicted: r.predicted, rel: r.rel, budget: r.budget, pass: r.pass, status: document.querySelectorAll(".bp-proof")[3]?.textContent ?? "" };
  });
  check(
    "Turing check: the measured fastest-growing ring matches the dispersion relation",
    t && t.pass && /analytic check passed/.test(t.status),
    t ? `measured ${t.measured.toFixed(3)} vs r* ${t.predicted.toFixed(3)} (${(t.rel * 100).toFixed(2)}%, band ±${(t.budget * 100).toFixed(1)}%)` : "no result",
  );
  await T(page, () => __turing.studio.drawer.open("prove"));
  await page.waitForTimeout(300);
  await shot(page, "06-prove-m3");
  check("no console errors in the model and Turing checks", errors.length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
}

// --- M3: On a Shape ---------------------------------------------------------------------
{
  const { ctx, page, errors } = await open("/?s=shape");
  const boot = await T(page, () => ({ scene: __turing.scene.id, kernel: __turing.sim.kernel, cells: __turing.sim.cells, controls: !!document.querySelector(".rd-shape-controls") }));
  check("On a Shape boots on a sphere with the object and pattern pickers", boot.scene === "shape" && boot.kernel === "surface" && boot.cells > 10000 && boot.controls, JSON.stringify(boot));
  await page.waitForTimeout(3000);
  await shot(page, "07-shape-sphere");
  // a drag with the Look tool orbits
  const yaw0 = await T(page, () => __turing.orbit.state().yaw);
  await page.mouse.move(720, 450);
  await page.mouse.down();
  await page.mouse.move(560, 430, { steps: 8 });
  await page.mouse.up();
  const yaw1 = await T(page, () => __turing.orbit.state().yaw);
  check("On a Shape: a drag turns the object", Math.abs(yaw1 - yaw0) > 0.3, `yaw ${yaw0.toFixed(2)} → ${yaw1.toFixed(2)}`);
  // painting on the surface is an undoable edit, and undo-by-replay is byte-identical
  const r = await T(page, async () => {
    const a = __turing;
    a.orbit.autoRotate = 0;
    a.clock.paused = true;
    await a.loadScene("shape", { shape: "sphere", pattern: "spots", seed: 3 });
    a.clock.paused = true;
    a.orbit.autoRotate = 0;
    await a.advanceTicks(150);
    const clean = await a.stateHash();
    await a.loadScene("shape", { shape: "sphere", pattern: "spots", seed: 3 });
    a.clock.paused = true;
    a.orbit.autoRotate = 0;
    await a.advanceTicks(75);
    a.studio.rail.select("seed");
    return { clean };
  });
  await page.mouse.move(700, 430);
  await page.mouse.down();
  await page.mouse.move(780, 480, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  const r2 = await T(page, async () => {
    const a = __turing;
    const events = a.log.length;
    await a.advanceTicks(75);
    const edited = await a.stateHash();
    await a.undo();
    return { events, edited, undone: await a.stateHash(), tick: a.sim.tick };
  });
  check("On a Shape: a seed stroke on the sphere is logged and changes the field", r2.events > 0 && r2.edited !== r.clean, `${r2.events} event(s)`);
  check("On a Shape: undo by replay is byte-identical to never painting", r2.undone === r.clean && r2.tick === 150, `${r.clean.slice(0, 12)} vs ${r2.undone.slice(0, 12)}`);
  // the torus, and a pattern from another model
  await T(page, () => __turing.setShape("torus", "waves"));
  await page.waitForTimeout(3000);
  const tor = await T(page, () => ({ kernel: __turing.sim.kernel, model: __turing.sim.chem.model, url: location.search, learn: document.querySelector(".rd-model-eq")?.textContent ?? "" }));
  check("On a Shape: the torus runs FitzHugh–Nagumo spirals, and the URL says so", tor.kernel === "surface" && tor.model === "fitzhugh-nagumo" && /sh=torus/.test(tor.url) && /pat=waves/.test(tor.url), tor.url);
  check("Learn shows the model on screen", /u − u³ − v/.test(tor.learn), tor.learn.slice(0, 60));
  await shot(page, "08-shape-torus");
  check("no console errors On a Shape", errors.length === 0, errors.slice(0, 2).join(" | "));
  const href = await T(page, () => location.pathname + location.search);
  await ctx.close();
  // a share link reproduces the shape's starting state across page loads
  const hashes = [];
  for (let i = 0; i < 2; i += 1) {
    const p2 = await open(href);
    hashes.push(
      await T(p2.page, async () => {
        __turing.clock.paused = true;
        await __turing.restart();
        __turing.clock.paused = true;
        return { hash: await __turing.stateHash(), shape: __turing.shape, pattern: __turing.pattern };
      }),
    );
    await p2.ctx.close();
  }
  check(
    "On a Shape: a share link reproduces the object, pattern and starting state",
    hashes[0].hash === hashes[1].hash && hashes[0].shape === "torus" && hashes[0].pattern === "waves",
    `${hashes[0].hash.slice(0, 12)} vs ${hashes[1].hash.slice(0, 12)}`,
  );
}

// --- every listed scene boots and grows ------------------------------------------
for (const id of ["mitosis", "coral", "solitons", "spirals", "garden", "stripes", "spacing", "excitable", "shape", "gated"]) {
  const { ctx, page, errors } = await open(`/?s=${id}`);
  await page.waitForTimeout(4500);
  const s = await T(page, () => ({ scene: __turing.scene.id, tick: __turing.sim.tick, tone: document.querySelector(".bp-studio")?.dataset.tone }));
  await shot(page, `scene-${id}`);
  check(`scene "${id}" boots and runs`, s.scene === id && s.tick > 100 && errors.length === 0, `tick ${s.tick} · tone ${s.tone}${errors.length ? ` · ${errors[0]}` : ""}`);
  await ctx.close();
}

await browser.close();
server.close();
const failed = results.filter((r) => !r.ok);
if (out) await writeFile(join(out, "acceptance.json"), JSON.stringify(results, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
