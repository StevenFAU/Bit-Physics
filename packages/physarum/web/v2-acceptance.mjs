// Slime Mould v2 — acceptance checks in a real WebGPU browser
// (docs/planning/rebuild-v2/02-physarum.md M0, M1 and M2).
//
//   npm run build   (in this directory)
//   CHROME_BIN=/snap/bin/chromium \
//   PLAYWRIGHT_MODULE=<repo>/tools/productization/web-deploy/web/headless/node_modules/playwright/index.js \
//   node v2-acceptance.mjs [out-dir]
//
// Checks: boot at the tier's agent count on the density-coupled grid; the
// shared counting sort against its CPU reference on the live agents; the live
// solver against the gated kernel on the canonical run (byte for byte, with
// re-sorts); the mass balance at full scale, and after a parameter change;
// the in-page gate (run twice + mass); save / restore / compare; a seed
// reproduces the same bytes across page loads; parameters ride the share
// link; probe; every scene boots; overlapping scene loads keep the newest.
// M1: First Light, Lace and Light Avoidance boot at their personalities; the
// pad offers exactly the calibrated points for the tier and a pad link
// reproduces its personality; a growing colony starts mostly dormant and
// wakes; food edits keep the mass balance exact; undo replays to the bytes
// of a run that never had the edit; the light empties the dish under it and
// follows a drag; the crumb director adds food at its exact step.
// M2: Connect the Cities and The Maze boot as specified; the network is
// scored (in a worker) within the measured ranges at fixed steps; a wall
// drawn across the maze's route lengthens the shortest path and undo takes
// it away; the mass balance stays exact with walls and hunger; the score
// card fits and passes axe at 1440 and 390 px.
// Prints a BP_BENCH line (agents, frame time) at the end.

import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

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
const KEYS = ["delta_phi_deg", "L_sense", "L_move", "deposit", "decay_alpha"];
const sameParams = (a, b) => KEYS.every((k) => a[k] === b[k]);

// trail hash after n steps from the scene start, with the live loop paused
const hashAfter = (page, n) =>
  T(page, async (steps) => {
    const app = globalThis.__physarum;
    app.clock.paused = true;
    await new Promise((r) => setTimeout(r, 100));
    await app.loadScene(app.scene.id, { seed: app.seed, params: app.sim.params });
    app.clock.paused = true;
    await app.advance(steps);
    const t = await app.sim.readTrail();
    const d = await crypto.subtle.digest("SHA-256", t.buffer);
    return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }, n);

// --- boot ---------------------------------------------------------------------
{
  const { ctx, page, errors } = await open();
  await page.waitForTimeout(3000);
  const d = await T(page, () => globalThis.__bpDebug());
  const want = { T3: 2000000, T2: 500000, T1: 150000 }[d.tier];
  check("boots into First Light", d.scene === "first-light", d.scene);
  check(`boots at the tier's agent count (${d.tier})`, d.agents === want, `${d.agents.toLocaleString()} agents on ${d.domain[0]} × ${d.domain[1]}, adapter ${d.adapter}`);
  check("density held at the declared agents per cell (±1%)", Math.abs(d.density / d.declaredDensity - 1) < 0.01, `${d.density.toFixed(4)} vs ${d.declaredDensity.toFixed(4)}`);
  const aspect = d.domain[0] / d.domain[1] / (d.viewport[0] / d.viewport[1]);
  check("the dish has the viewport's aspect (full-bleed, nothing off-screen at fit)", Math.abs(aspect - 1) < 0.02, aspect.toFixed(4));
  check("the steps advance", d.tick > 100, `${d.tick} steps after 3 s`);
  await shot(page, "01-dish");

  const sort = await T(page, () => globalThis.__physarumChecks.sort());
  check("counting sort ≡ CPU reference on the live agents", sort.problem === null, `${sort.items.toLocaleString()} agents, ${sort.keyCount.toLocaleString()} tiles${sort.problem ? `: ${sort.problem}` : ""}`);

  const lvg = await T(page, () => globalThis.__physarumChecks.liveVsGated());
  check("live solver ≡ gated kernel, byte for byte (5000 steps, with re-sorts)", lvg.identical && lvg.sorts > 0, `${lvg.cellsDiffering} cells differ, ${lvg.sorts} re-sorts`);

  // mass at full scale: let it settle, then read
  await page.waitForTimeout(3500);
  const mass = await T(page, () => globalThis.__physarumChecks.liveMass());
  check("mass balance at full scale (closed form, rel < 1e-3)", mass && mass.pass, mass ? `rel ${mass.massRel.toExponential(2)}` : "not settled");

  const gate = await T(page, () => globalThis.__physarumChecks.gate());
  check("in-page gate: run twice identical, mass within 1e-3", gate.pass, `identical ${gate.identical}, M ${gate.mass.toFixed(4)} (rel ${gate.massRel.toExponential(2)}), ${gate.seconds.toFixed(1)} s`);

  // save / restore / compare
  const sr = await T(page, async () => {
    const app = globalThis.__physarum;
    const hash = async () => {
      const t = await app.sim.readTrail();
      const d = await crypto.subtle.digest("SHA-256", t.buffer);
      return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
    };
    app.clock.paused = true;
    await new Promise((r) => setTimeout(r, 100));
    app.savePoint();
    const atSave = await hash();
    const tickSave = app.sim.tick;
    await app.advance(150);
    const later = await hash();
    app.restoreSave();
    const restored = await hash();
    app.toggleCompare();
    const comparing = app.history.comparing && app.view.split !== null;
    app.toggleCompare();
    return { same: atSave === restored, moved: later !== atSave, tick: app.sim.tick === tickSave, comparing, off: app.view.split === null };
  });
  check("save point → restore returns the exact bytes", sr.same && sr.moved && sr.tick, JSON.stringify(sr));
  check("compare A/B toggles the split view", sr.comparing && sr.off);

  // probe
  await T(page, () => { globalThis.__physarum.studio.rail.select("probe"); globalThis.__physarum.clock.paused = false; });
  await page.mouse.move(640, 360);
  await page.waitForTimeout(400);
  await page.mouse.move(650, 362);
  await page.waitForTimeout(400);
  const probe = await T(page, () => { const p = document.querySelector(".bp-probe"); return p && !p.hidden ? p.textContent : null; });
  check("probe reads the trail under the pointer", !!probe && /Trail/.test(probe), probe ?? "hidden");
  check("no console errors (boot, checks, history, probe)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- a seed reproduces the same bytes across page loads ---------------------
{
  const a = await open("/v2/?seed=7");
  const h1 = await hashAfter(a.page, 300);
  await a.ctx.close();
  const b = await open("/v2/?seed=7");
  const h2 = await hashAfter(b.page, 300);
  await b.ctx.close();
  const c = await open("/v2/?seed=8");
  const h3 = await hashAfter(c.page, 300);
  await c.ctx.close();
  check("same seed, same bytes across page loads (300 steps)", h1 === h2, `${h1.slice(0, 16)}… vs ${h2.slice(0, 16)}…`);
  check("a different seed gives a different dish", h1 !== h3);
}

// --- parameters ride the share link ------------------------------------------
{
  const { ctx, page, errors } = await open("/v2/?dphi=30&ls=15&a=0.05&pal=deepsea");
  const p = await T(page, () => ({ ...globalThis.__physarum.sim.params, pal: globalThis.__physarum.palette, link: location.search }));
  check("a share link sets the parameters and palette", p.delta_phi_deg === 30 && p.L_sense === 15 && p.decay_alpha === 0.05 && p.pal === "deepsea", JSON.stringify(p));
  check("no console errors (share link)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- every scene boots; the gated scene is the gated run --------------------
{
  const { ctx, page, errors } = await open("/v2/?s=gated");
  await page.waitForTimeout(2500);
  const g = await T(page, () => ({ scene: globalThis.__physarum.scene.id, gated: globalThis.__physarum.onGatedRun, n: globalThis.__physarum.sim.n, w: globalThis.__physarum.sim.w }));
  check("the gated scene is the gated run (500 agents on 256²)", g.scene === "gated" && g.gated && g.n === 500 && g.w === 256, JSON.stringify(g));
  await shot(page, "02-gated");
  await T(page, () => globalThis.__physarum.loadScene("network"));
  await page.waitForTimeout(1500);
  check("no console errors (scene switches)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- the live mass check follows a parameter change (no settling window) ------
{
  const { ctx, page, errors } = await open();
  await page.waitForTimeout(1500);
  const r = await T(page, async () => {
    const app = globalThis.__physarum;
    app.clock.paused = true;
    await new Promise((res) => setTimeout(res, 100));
    const p = { ...app.sim.params, decay_alpha: 0.02 };
    app.setParams(p, "start");
    app.setParams(p, "end");
    await app.advance(300);
    const m = await app.liveMass();
    const check = await globalThis.__physarumChecks.liveMass();
    return { stillSettling: Math.abs(m.predicted - m.equilibrium) / m.equilibrium, check };
  });
  check(
    "mass check follows a fade change 0.1 → 0.02 after only 300 steps",
    r.check && r.check.pass && r.stillSettling > 1e-3,
    `dish still ${(r.stillSettling * 100).toFixed(2)}% from where it settles; measured vs predicted rel ${r.check ? r.check.massRel.toExponential(2) : "—"}`,
  );
  check("no console errors (fade change)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- overlapping scene loads: the latest choice wins --------------------------
{
  const { ctx, page, errors } = await open();
  const r = await T(page, async () => {
    const app = globalThis.__physarum;
    // the gated load awaits its IC asset; the live load started after it must still win
    const a = app.loadScene("gated");
    const b = app.loadScene("network");
    await Promise.all([a, b]);
    await new Promise((res) => setTimeout(res, 500));
    return { scene: app.scene.id, n: app.sim.n, heading: document.querySelector(".bp-scene-title")?.textContent };
  });
  check("overlapping scene loads keep the newest choice", r.scene === "network" && r.n > 500 && r.heading === "The network", JSON.stringify(r));
  check("no console errors (overlapping loads)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- M1: the living scenes, the pad, food, light, growth, undo --------------
{
  const { ctx, page, errors } = await open();
  await page.waitForTimeout(800);
  const cal = JSON.parse(await readFile(fileURLToPath(new URL("./src/v2/generated/pad-calibration.json", import.meta.url)), "utf8"));
  const r = await T(page, async (calTiers) => {
    const app = globalThis.__physarum;
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    const out = {};
    // the pad offers the calibrated points for this tier, and nothing else
    const stable = calTiers[app.tier].points.filter((p) => p.stable).map((p) => `${p.i},${p.j}`).sort();
    const dots = [...document.querySelectorAll(".ph-pad-dot")];
    const enabled = dots.filter((b) => !b.disabled).map((b) => b.dataset.pad).sort();
    out.pad = { tier: app.tier, stable: stable.length, enabled: enabled.length, same: JSON.stringify(stable) === JSON.stringify(enabled), dots: dots.length };
    // scenes and their personalities
    out.scenes = {};
    for (const id of ["first-light", "lace", "light"]) {
      await app.loadScene(id);
      await sleep(300);
      out.scenes[id] = { pad: app.pad, personality: app.personalityName, stochastic: !!app.scene.personality, food: app.sim.envSpec?.food.length ?? 0, lights: app.sim.envSpec?.lights.length ?? 0, growing: app.sim.growing };
    }
    // growth: a First Light colony starts mostly dormant and wakes as it spreads
    app.clock.paused = true;
    await sleep(150);
    await app.loadScene("first-light", { seed: 5 });
    app.clock.paused = true;
    const awake0 = await app.sim.awakeCount();
    await app.advance(600);
    const awake600 = await app.sim.awakeCount();
    await app.advance(600);
    const awake1200 = await app.sim.awakeCount();
    const m = await app.liveMass();
    out.growth = { n: app.sim.n, awake0, awake600, awake1200, massRel: Math.abs(m.mass - m.predicted) / m.predicted };
    return out;
  }, cal.tiers);
  check(`the pad offers exactly the ${r.pad.tier} calibrated points`, r.pad.same && r.pad.dots === 25, `${r.pad.enabled} of 25 enabled, ${r.pad.stable} stable in pad-calibration.json`);
  const fl = r.scenes["first-light"];
  check("First Light: a growing colony, 12 crumbs, a personality, Jones's stochastic rule", fl.growing && fl.food === 12 && fl.pad && fl.stochastic, JSON.stringify(fl));
  const lace = r.scenes.lace;
  check("Lace boots at the Lace personality (or the nearest offered)", lace.pad && !lace.growing && lace.food === 0, JSON.stringify(lace));
  const li = r.scenes.light;
  check("Light Avoidance boots with one light", li.lights === 1 && li.pad, JSON.stringify(li));
  const g = r.growth;
  check(
    "growth: starts mostly dormant, most agents awake within 1,200 steps",
    g.awake0 < 0.02 * g.n && g.awake1200 > 0.5 * g.n && g.awake600 > g.awake0,
    `awake ${g.awake0.toLocaleString()} → ${g.awake600.toLocaleString()} (600 steps) → ${g.awake1200.toLocaleString()} (1,200) of ${g.n.toLocaleString()}`,
  );
  check("mass balance exact through growth and food (rel < 1e-6)", g.massRel < 1e-6, `rel ${g.massRel.toExponential(2)}`);

  // food + undo by replay
  const u = await T(page, async () => {
    const app = globalThis.__physarum;
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    const hash = async () => {
      const t = await app.sim.readTrail();
      const d = await crypto.subtle.digest("SHA-256", t.buffer);
      return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
    };
    app.clock.paused = true;
    await sleep(100);
    await app.loadScene("first-light", { seed: 3 });
    app.clock.paused = true;
    await app.advance(150);
    const food0 = app.sim.envSpec.food.length;
    app.toggleFood(app.sim.w * 0.3, app.sim.h * 0.3);
    const food1 = app.sim.envSpec.food.length;
    const perStep = app.sim.foodPerStep;
    await app.advance(150);
    const hEdit = await hash();
    const mEdit = await app.liveMass();
    // removing it again is a second edit
    app.toggleFood(app.sim.w * 0.3, app.sim.h * 0.3);
    const food2 = app.sim.envSpec.food.length;
    await app.undo();
    const food3 = app.sim.envSpec.food.length;
    await app.undo();
    const food4 = app.sim.envSpec.food.length;
    const tick = app.sim.tick;
    const hUndo = await hash();
    await app.loadScene("first-light", { seed: 3 });
    app.clock.paused = true;
    await app.advance(300);
    const hRef = await hash();
    return { food0, food1, food2, food3, food4, tick, perStep, editRel: Math.abs(mEdit.mass - mEdit.predicted) / mEdit.predicted, same: hUndo === hRef, differs: hEdit !== hRef, canUndo: app.history.canUndo };
  });
  check("Food adds a crumb and takes it away again", u.food1 === u.food0 + 1 && u.food2 === u.food0, `${u.food0} → ${u.food1} → ${u.food2}`);
  check("mass balance exact with a crumb added (rel < 1e-6)", u.editRel < 1e-6, `rel ${u.editRel.toExponential(2)}, food adds ${u.perStep.toLocaleString()} per step`);
  check("undo, undo: replays to the exact bytes of a run without either edit (300 steps)", u.same && u.differs && u.food3 === u.food1 && u.food4 === u.food0 && u.tick === 300, JSON.stringify({ same: u.same, differs: u.differs, food: [u.food3, u.food4], tick: u.tick }));

  // the pad: picking a point sets its parameters and rides the share link
  const pk = await T(page, async () => {
    const app = globalThis.__physarum;
    await app.loadScene("lace");
    const offered = [...document.querySelectorAll(".ph-pad-dot:not(:disabled)")].map((b) => b.dataset.pad);
    const pick = offered.find((k) => k !== `${app.pad.i},${app.pad.j}`);
    const [i, j] = pick.split(",").map(Number);
    app.setPad({ i, j });
    await new Promise((res) => setTimeout(res, 400));
    return { i, j, params: app.sim.params, want: globalThis.__physarumPad.padParams({ i, j }), search: location.search };
  });
  check("picking a pad point sets that personality's numbers", sameParams(pk.params, pk.want), `(${pk.i},${pk.j}) → ${JSON.stringify(pk.params)}`);
  check("no console errors (M1 scenes, pad, food, undo)", errors.length === 0, errors.join(" | "));
  await ctx.close();
  {
    const b = await open(`/v2/${pk.search}`);
    const q = await T(b.page, () => ({ pad: globalThis.__physarum.pad, params: globalThis.__physarum.sim.params, scene: globalThis.__physarum.scene.id }));
    check("a pad link reproduces the personality", q.scene === "lace" && q.pad && q.pad.i === pk.i && q.pad.j === pk.j && sameParams(q.params, pk.want), `${pk.search} → ${JSON.stringify(q.pad)}`);
    await b.ctx.close();
  }
}

// --- M1: the pad in the Tune popover — fits, and passes axe ----------------
{
  const axeSource = await readFile(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const { ctx, page, errors } = await open("/v2/", vp);
    await page.waitForTimeout(500);
    await T(page, () => globalThis.__physarum.studio.tune.toggle());
    await page.waitForTimeout(400);
    const fit = await T(page, () => {
      const tune = document.querySelector(".bp-tune");
      const pad = document.querySelector(".ph-pad");
      const t = tune.getBoundingClientRect();
      const labels = [...document.querySelectorAll(".ph-pad-axis, .ph-pad-corner")].map((e) => e.getBoundingClientRect());
      const inside = (r) => r.left >= t.left - 0.5 && r.right <= t.right + 0.5;
      return { open: !tune.hidden, padW: pad.getBoundingClientRect().width, labelsInside: labels.every(inside), overflowX: tune.scrollWidth > tune.clientWidth + 1 };
    });
    await page.evaluate(axeSource);
    const v = await page.evaluate(async () =>
      // eslint-disable-next-line no-undef
      (await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] } })).violations.map((x) => `${x.id}: ${x.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", ")}`),
    );
    await shot(page, `03-tune-${vp.width}`);
    check(`Tune with the pad at ${vp.width} px: open, fits, no horizontal overflow`, fit.open && fit.labelsInside && !fit.overflowX && fit.padW > 120, JSON.stringify(fit));
    check(`Tune with the pad at ${vp.width} px: no axe violations`, v.length === 0, v.join(" | "));
    check(`no console errors (Tune at ${vp.width} px)`, errors.length === 0, errors.join(" | "));
    await ctx.close();
  }
}

// --- M1: the light empties the dish under it; a drag moves it -------------
{
  const { ctx, page, errors } = await open("/v2/?s=light");
  await page.waitForTimeout(600);
  const r = await T(page, async () => {
    const app = globalThis.__physarum;
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    app.clock.paused = true;
    await sleep(100);
    await app.loadScene("light", { seed: 2 });
    app.clock.paused = true;
    await app.advance(900);
    const L = app.sim.envSpec.lights[0];
    const t = await app.sim.readTrail();
    const w = app.sim.w;
    const h = app.sim.h;
    let inside = 0;
    let nIn = 0;
    let all = 0;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const v = t[y * w + x];
        all += v;
        let dx = Math.abs(x - L.x);
        let dy = Math.abs(y - L.y);
        dx = Math.min(dx, w - dx);
        dy = Math.min(dy, h - dy);
        if (dx * dx + dy * dy < (0.8 * L.r) ** 2) {
          inside += v;
          nIn += 1;
        }
      }
    }
    return { insideMean: inside / nIn, dishMean: all / (w * h), light: L };
  });
  check("the light empties the dish under it (mean trail inside < 5% of the dish's)", r.insideMean < 0.05 * r.dishMean, `inside ${r.insideMean.toFixed(3)} vs dish ${r.dishMean.toFixed(3)} (${((r.insideMean / r.dishMean) * 100).toFixed(2)}%)`);
  await T(page, () => globalThis.__physarum.studio.rail.select("light"));
  await page.mouse.move(300, 300);
  await page.mouse.down();
  await page.mouse.move(420, 360, { steps: 6 });
  await page.mouse.move(500, 420, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const d = await T(page, () => {
    const app = globalThis.__physarum;
    const L = app.sim.envSpec.lights[0];
    const [x, y] = app.camera.screenToDomain(500, 420);
    return { L, want: [x, y], edits: app.edits, canUndo: app.history.canUndo };
  });
  check("dragging the light moves it to the pointer (one undoable edit)", Math.hypot(d.L.x - d.want[0], d.L.y - d.want[1]) < 2 && d.edits === 1 && d.canUndo, JSON.stringify(d));
  check("no console errors (light)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- M1: the crumb director acts at its exact step -------------------------
{
  const { ctx, page, errors } = await open("/v2/?sp=8");
  const r = await T(page, async () => {
    const app = globalThis.__physarum;
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    const t0 = performance.now();
    while (app.sim.tick < 2500 && performance.now() - t0 < 30000) await sleep(100);
    const log = app.log.all().filter((e) => e.kind === "food");
    return { tick: app.sim.tick, food: app.sim.envSpec.food.length, at: log.map((e) => e.tick) };
  });
  check("left alone, First Light gets a new crumb at exactly step 2,400", r.food === 13 && r.at.length === 1 && r.at[0] === 2400, JSON.stringify(r));
  check("no console errors (director)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- M2: Connect the Cities and The Maze ------------------------------------
{
  const { ctx, page, errors } = await open("/v2/?s=cities");
  const c = await T(page, async () => {
    const app = globalThis.__physarum;
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    app.clock.paused = true;
    await sleep(100);
    await app.loadScene("cities", { seed: 1 });
    app.clock.paused = true;
    const boot = { food: app.sim.envSpec.food.length, walls: !!app.sim.envSpec.walls, growing: app.sim.growing, card: !document.querySelector(".ph-score").hidden };
    await app.advance(6000);
    const s = await globalThis.__physarumChecks.score();
    const m = await app.liveMass();
    return { boot, s, rel: Math.abs(m.mass - m.predicted) / m.predicted };
  });
  check("Connect the Cities: 30 cities, the sea as walls, a colony growing from Tokyo, the score card shown", c.boot.food === 30 && c.boot.walls && c.boot.growing && c.boot.card, JSON.stringify(c.boot));
  const s = c.s;
  check(
    "Connect the Cities at step 6,000: every city joined; length, mean distance and cut share in the measured bands",
    s.net.reached === 30 && s.tl > 1.4 && s.tl < 2.4 && s.md > 0.7 && s.md < 1 && s.cut < 0.25 && s.steinerRatio > Math.sqrt(3) / 2 && s.steinerRatio < 1,
    `reached ${s.net.reached}/30, TL ${s.tl.toFixed(2)}× MST, MD ${s.md.toFixed(2)}× MST, cut ${(s.cut * 100).toFixed(0)}% of ${s.net.links} links, Steiner ${s.steinerRatio.toFixed(3)}× MST, scored in ${s.ms.toFixed(0)} ms`,
  );
  check("mass balance exact with walls and a growing colony (rel < 1e-6)", c.rel < 1e-6, `rel ${c.rel.toExponential(2)}`);
  // the overlay draws the measured network and the MST
  await T(page, () => { globalThis.__physarum.clock.paused = false; });
  await page.waitForTimeout(600);
  const ink = await T(page, () => {
    const cv = document.querySelector(".ph-overlay");
    const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 16) if (d[i] > 0) n += 1;
    return n;
  });
  check("the score overlay draws the measured network and the MST", ink > 500, `${ink} sampled pixels drawn`);
  check("no console errors (Connect the Cities)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}
{
  const { ctx, page, errors } = await open("/v2/?s=maze");
  const m = await T(page, async () => {
    const app = globalThis.__physarum;
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    const speed = app.clock.speed;
    app.clock.paused = true;
    await sleep(100);
    await app.loadScene("maze", { seed: 1 });
    app.clock.paused = true;
    const boot = { food: app.sim.envSpec.food.length, walls: !!app.sim.envSpec.walls, hunger: app.sim.hungerMax, speed };
    await app.advance(16000);
    const s = await globalThis.__physarumChecks.score();
    const mass = await app.liveMass();
    return { boot, s, rel: Math.abs(mass.mass - mass.predicted) / mass.predicted };
  });
  check("The Maze: two food sources, walls, hunger set from the route, plays at 4×", m.boot.food === 2 && m.boot.walls && m.boot.hunger > 1000 && m.boot.speed === 4, JSON.stringify(m.boot));
  check(
    "The Maze at step 16,000: the food joined along the shortest route (≤ 1.3× its length)",
    Number.isFinite(m.s.along) && m.s.onShortest && m.s.along / m.s.shortest < 1.3,
    `route ${(m.s.along / m.s.shortest).toFixed(2)}× the shortest path, on it: ${m.s.onShortest}, tube elsewhere ${m.s.extra.toFixed(2)}× the route`,
  );
  check("mass balance exact with walls and hungry agents returning to food (rel < 1e-6)", m.rel < 1e-6, `rel ${m.rel.toExponential(2)}`);
  // block the route with the Wall tool, then undo it
  const plan = await T(page, async () => {
    const app = globalThis.__physarum;
    const a = app.analysis.score;
    const p = a.shortestPath;
    const k = 2 * Math.floor(p.length / 4);
    const [x, y] = [p[k], p[k + 1]];
    // across the path: perpendicular to it
    const dx = p[k + 2] - p[k - 2];
    const dy = p[k + 3] - p[k - 1];
    const L = Math.hypot(dx, dy) || 1;
    // one corridor wide: the maze's pitch is a cell plus its wall
    const half = app.maze.pitch * 0.3;
    const s0 = app.camera.domainToScreen(x - (dy / L) * half, y + (dx / L) * half);
    const s1 = app.camera.domainToScreen(x + (dy / L) * half, y - (dx / L) * half);
    app.studio.rail.select("wall");
    app.wallSize = 2;
    return { x, y, s0, s1, before: a.shortest };
  });
  await page.mouse.move(plan.s0[0], plan.s0[1]);
  await page.mouse.down();
  await page.mouse.move(plan.s1[0], plan.s1[1], { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  const after = await T(page, async (p) => {
    const app = globalThis.__physarum;
    const wallAt = () => {
      const c = Math.floor(p.y) * app.sim.w + Math.floor(p.x);
      return (app.sim.envSpec.walls[c >> 5] & (1 << (c & 31))) !== 0;
    };
    const s = await globalThis.__physarumChecks.score();
    const blocked = { wall: wallAt(), shortest: s.shortest, hunger: app.sim.hungerMax, edits: app.edits };
    await app.undo();
    const s2 = await globalThis.__physarumChecks.score();
    return { blocked, undone: { wall: wallAt(), shortest: s2.shortest } };
  }, plan);
  check(
    "a wall across the route lengthens the shortest path (hunger follows); undo takes it away",
    after.blocked.wall && after.blocked.shortest > plan.before * 1.02 && !after.undone.wall && Math.abs(after.undone.shortest - plan.before) < 1,
    `shortest ${plan.before.toFixed(0)} → ${Number.isFinite(after.blocked.shortest) ? after.blocked.shortest.toFixed(0) : "walled off"} cells with the wall, ${after.undone.shortest.toFixed(0)} after undo; hunger ${after.blocked.hunger}`,
  );
  check("no console errors (The Maze)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}
{
  const axeSource = await readFile(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const { ctx, page, errors } = await open("/v2/?s=cities", vp);
    await page.waitForTimeout(4000);
    if (vp.width < 640) {
      await page.click(".ph-score-fold");
      await page.waitForTimeout(200);
    }
    const fit = await T(page, () => {
      const r = (el) => { const b = el.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; };
      const card = r(document.querySelector(".ph-score"));
      const others = [".bp-rail", ".bp-transport", ".bp-top-actions", ".bp-heading .bp-scene-title"].map((s) => [s, document.querySelector(s)]).filter(([, e]) => e && e.getBoundingClientRect().width > 0).map(([s, e]) => [s, r(e)]);
      const overlap = (a, b) => a[0] < b[2] - 1 && b[0] < a[2] - 1 && a[1] < b[3] - 1 && b[1] < a[3] - 1;
      return { card, inside: card[0] >= 0 && card[1] >= 0 && card[2] <= innerWidth && card[3] <= innerHeight, overlaps: others.filter(([, b]) => overlap(card, b)).map(([s]) => s), scored: !!globalThis.__physarum.analysis };
    });
    await page.evaluate(axeSource);
    const v = await page.evaluate(async () =>
      // eslint-disable-next-line no-undef
      (await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] } })).violations.map((x) => `${x.id}: ${x.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", ")}`),
    );
    await shot(page, `04-score-${vp.width}`);
    check(`score card at ${vp.width} px: inside the viewport, over no other chrome`, fit.inside && fit.overlaps.length === 0, JSON.stringify(fit));
    check(`score card at ${vp.width} px: no axe violations`, v.length === 0, v.join(" | "));
    check(`no console errors (score card at ${vp.width} px)`, errors.length === 0, errors.join(" | "));
    await ctx.close();
  }
}

// --- review regressions (PR #44) --------------------------------------------
{
  const { ctx, page, errors } = await open("/v2/?sp=8");
  // 1. an edit holds the crumb director past its step; undoing it re-enables
  //    the director with that step in the past — the page must not hang
  const r1 = await T(page, async () => {
    const app = globalThis.__physarum;
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    const t0 = performance.now();
    while (app.sim.tick < 600 && performance.now() - t0 < 20000) await sleep(50);
    app.toggleFood(app.sim.w * 0.3, app.sim.h * 0.3);
    while (app.sim.tick < 2700 && performance.now() - t0 < 40000) await sleep(50);
    await app.undo();
    const after = app.sim.tick;
    await sleep(1500);
    return { undoneAt: after, later: app.sim.tick, food: app.sim.envSpec.food.length, edits: app.edits };
  });
  check("undo past the crumb director's step does not stall the dish", r1.later > r1.undoneAt + 100 && r1.edits === 0 && r1.food === 12, JSON.stringify(r1));
  // 2. restoring across a deposit change rebuilds the food from the restored deposit
  const r2 = await T(page, async () => {
    const app = globalThis.__physarum;
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    app.clock.paused = true;
    await sleep(100);
    await app.loadScene("first-light", { seed: 4 });
    app.clock.paused = true;
    await app.advance(100);
    const food5 = app.sim.foodPerStep;
    app.savePoint();
    app.setParams({ ...app.sim.params, deposit: 10 }, "start");
    app.setParams({ ...app.sim.params, deposit: 10 }, "end");
    const food10 = app.sim.foodPerStep;
    await app.advance(100);
    app.restoreSave();
    const restored = app.sim.foodPerStep;
    await app.advance(200);
    const m = await app.liveMass();
    return { food5, food10, restored, rel: Math.abs(m.mass - m.predicted) / m.predicted };
  });
  check("restore across a deposit change: food back to its own amount, mass exact", r2.restored === r2.food5 && r2.food10 === 2 * r2.food5 && r2.rel < 1e-6, JSON.stringify(r2));
  // 3. the Light tool in First Light repels
  const r3 = await T(page, async () => {
    const app = globalThis.__physarum;
    app.studio.rail.select("light");
    const [x, y] = app.camera.domainToScreen(app.sim.w * 0.7, app.sim.h * 0.5);
    return { x, y };
  });
  await page.mouse.move(r3.x, r3.y);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(200);
  const r4 = await T(page, async () => {
    const app = globalThis.__physarum;
    const L = app.sim.envSpec.lights[0];
    const env = await app.sim.readEnv();
    const v = env[Math.round(L.y) * app.sim.w + Math.round(L.x)];
    return { light: !!L, depth: v / app.sim.meanTrail };
  });
  check("First Light's Light tool repels (env at its centre ≪ 0)", r4.light && r4.depth < -10, JSON.stringify(r4));
  check("no console errors (review regressions)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- frame time at the boot scene -------------------------------------------
{
  const { ctx, page } = await open("/v2/?bench=1");
  await page.waitForFunction(() => globalThis.__bpBench, undefined, { timeout: 60000 });
  const b = await T(page, () => globalThis.__bpBench);
  console.log(`BP_BENCH ${JSON.stringify(b)}`);
  check("bench ran", b.frames > 0, `${b.agents.toLocaleString()} agents, ${b.fps.toFixed(1)} fps, frame p50 ${b.frameP50.toFixed(1)} ms / p90 ${b.frameP90.toFixed(1)} ms, GPU p50 ${b.gpuP50.toFixed(2)} ms, ${Math.round(b.stepsPerSecond)} steps/s`);
  await ctx.close();
}

await browser.close();
server.close();
const failed = results.filter((r) => !r.ok);
if (out) await writeFile(join(out, "acceptance.json"), JSON.stringify(results, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
