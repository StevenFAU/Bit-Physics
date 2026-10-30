// Swarm v2 — acceptance checks in a real WebGPU browser
// (docs/planning/rebuild-v2/03-boids-2d.md M0 and M1).
//
//   npm run build   (in this directory)
//   CHROME_BIN=/snap/bin/chromium \
//   PLAYWRIGHT_MODULE=<repo>/tools/productization/web-deploy/web/headless/node_modules/playwright/index.js \
//   node v2-acceptance.mjs [out-dir]
//
// Checks: boot at the tier's fish count, density and the viewport's aspect;
// the release gate's capture is byte-identical on the v1 and v2 pages, and
// re-runs in-page; the v2 GPU kernel reproduces the v4 lab's trajectory hash
// (same device, brute force and sort, with and without noise); brute ≡ sort
// and run-twice in-page; the shared counting sort ≡ its CPU reference on the
// live million; the memory reorder changes no fish's path; the φ series at
// full scale repeats; the shark clears the water around it; save / restore /
// compare; a seed reproduces the same bytes across page loads; the rule rides
// the share link; the proof flock scene. M1: The Order Dial (the Vicsek brain
// at the tier's count; the dial by keyboard; a measured point on the map; a
// full η sweep with η_c at the χ peak; its link; seeds across loads with
// noise and re-sorts), The Mill (Tunstrøm's milling region, measured; the
// shark breaks it; the Couzin zones ride the link; save / restore), the new
// brains' proofs (brute ≡ sort, run twice, re-sort with noise, φ(η) against
// the f64 CPU reference), the three levels of detail and their frame times.
// M2: Current (the tier's fish, the solved water incompressible live, the
// push, a brush stroke moving the water, the water's Prove cards — motes,
// momentum exchange, the school riding the current — save / restore and a
// seed across loads) and Food Chain (the census, Feed, Release, the replay
// card, save / restore, a seed across loads, and every population alive and
// cycling through ten minutes of simulated time).
// M3: Eyes Only (the vision brain at its count; the brains' exactness, every
// fish's field against f64, the paper's ordered motion against the f64
// reference with its no-edges control, all as Prove runs them; the live
// scene schools and, with the edge terms off, does not; save / restore; a
// seed across loads; its link), Species Matrix (the kinds and the matrix
// panel; a keyboard edit reaching the running brain and the link; a new
// number of kinds restarting the ocean; the mixing card; save / restore; a
// seed across loads; an edited matrix on the link), Watch one (it picks the
// fish under the pointer, keeps the same fish through memory re-sorts, lists
// its neighbours, the camera follows it, a pan takes the camera back and
// Follow returns it, Let go; Eyes Only's retina; the species line; no
// overlap with the scene's own panel at 1280×720; at most six tools in every
// scene).
// Prints BP_BENCH lines at the end (all seven scenes).

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

/** Click the capture control and return the published capture as JSON text. */
const capture = (page) =>
  T(page, async () => {
    globalThis.__bitPhysicsCaptureReady = false;
    document.querySelector('[data-bp="capture"]').click();
    for (let i = 0; i < 600 && !globalThis.__bitPhysicsCaptureReady; i += 1) await new Promise((r) => setTimeout(r, 50));
    return JSON.stringify(globalThis.__bitPhysicsCapture);
  });

// boids hash after n steps from the scene start, with the live loop paused
const hashAfter = (page, n) =>
  T(page, async (steps) => {
    const app = globalThis.__swarm;
    app.clock.paused = true;
    await new Promise((r) => setTimeout(r, 100));
    await app.loadScene(app.scene.id, { seed: app.seed, rule: app.flock.rule });
    app.clock.paused = true;
    await app.advance(steps);
    const b = await app.flock.readBoids();
    const d = await crypto.subtle.digest("SHA-256", b.buffer);
    return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
  }, n);

// --- the v4 lab (v1 page): its own capture and its own trajectory hashes -------
let v1Capture = "";
let v4 = null;
{
  const { ctx, page, errors } = await open("/");
  v1Capture = await capture(page);
  await page.waitForFunction(() => globalThis.__boids2dReady === true, undefined, { timeout: 60000 });
  v4 = await T(page, async () => {
    /* global ENGINE, S, hashBusy */
    // eslint-disable-next-line no-undef
    if (!ENGINE || ENGINE.kind !== "gpu") return { error: `v4 engine is ${ENGINE && ENGINE.kind}` };
    hashBusy++; // freeze the v4 render loop for the whole section, as its own verify suite does
    try {
      S.speciesCount = 1; S.interaction = "metric"; S.timeRate = 1; S.initMode = "random"; S.fovDeg = 360;
      ENGINE.setCount(4096);
      const rule = { wSep: S.wSep, wAli: S.wAli, wCoh: S.wCoh, rCoh: S.rCoh, maxSpeed: S.maxSpeed, noise: S.noise, fovDeg: S.fovDeg };
      const world = { halfW: ENGINE.halfW(), halfH: ENGINE.halfH() };
      const run = async (bp, noise) => {
        S.broadphase = bp; S.noise = noise;
        ENGINE.reseed(42);
        return ENGINE.hashRun(60);
      };
      const quiet = { brute: await run("brute", 0), sort: await run("sort", 0) };
      const noisy = { brute: await run("brute", 0.2), sort: await run("sort", 0.2) };
      return { rule, world, quiet, noisy };
    } finally {
      hashBusy = Math.max(0, hashBusy - 1);
    }
  });
  check("v1 page (the v4 lab) boots on WebGPU and computes its own hashes", v4 && !v4.error, v4?.error ?? `${v4.quiet.brute.hash.slice(0, 16)}…`);
  check("no console errors (v1 page)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- boot ---------------------------------------------------------------------
{
  const { ctx, page, errors } = await open();
  await page.waitForTimeout(3000);
  const d = await T(page, () => globalThis.__bpDebug());
  const want = { T3: 1000000, T2: 250000, T1: 60000 }[d.tier];
  check("boots into Open Water", d.scene === "open-water", d.scene);
  check(`boots at the tier's fish count (${d.tier})`, d.agents === want, `${d.agents.toLocaleString()} fish on ${d.world.map((v) => v.toFixed(2)).join(" × ")}, adapter ${d.adapter}`);
  check("density held at the declared fish per unit² (±0.1%)", Math.abs(d.density / d.declaredDensity - 1) < 1e-3, `${d.density.toFixed(2)} vs ${d.declaredDensity.toFixed(2)}`);
  const aspect = d.world[0] / d.world[1] / (d.viewport[0] / d.viewport[1]);
  check("the ocean has the viewport's aspect (full-bleed at fit)", Math.abs(aspect - 1) < 0.01, aspect.toFixed(4));
  check("the steps advance", d.tick > 100, `${d.tick} steps after 3 s`);
  await shot(page, "01-open-water");

  // the release gate: same capture bytes as the v1 page, and re-run in-page
  const v2Capture = await capture(page);
  check("release-gate capture is byte-identical on the v1 and v2 pages", v2Capture === v1Capture && v2Capture.length > 1000, `${v2Capture.length} bytes`);
  const gate = await T(page, () => globalThis.__swarmProve.gate());
  check("in-page release gate: run twice identical, predicates hold", gate.pass, `φ calm ${gate.orderedPhi.toFixed(4)} vs noisy ${gate.noisyPhi.toFixed(4)}, vmax ${gate.vmax}, div ${gate.divergence.map((x) => x.toExponential(3)).join(" → ")}`);

  // the v2 kernel against the v4 lab's, same device
  if (v4 && !v4.error) {
    const v2 = await T(page, async (cfg) => {
      const P = globalThis.__swarmProve;
      const base = { n: 4096, seed: 42, steps: 60, halfW: cfg.world.halfW, halfH: cfg.world.halfH };
      const r = async (broadphase, noise) => P.hashRun({ ...base, broadphase, rule: { ...cfg.rule, noise } });
      return { quiet: { brute: await r("brute", 0), sort: await r("sort", 0) }, noisy: { brute: await r("brute", 0.2), sort: await r("sort", 0.2) } };
    }, v4);
    for (const k of ["quiet", "noisy"]) {
      const eta = k === "quiet" ? 0 : 0.2;
      check(`v2 kernel ≡ v4 kernel, brute force (η ${eta}, 4096 fish, 60 steps)`, v2[k].brute.hash === v4[k].brute.hash && v2[k].brute.nan === 0, `v2 ${v2[k].brute.hash.slice(0, 16)}… v4 ${v4[k].brute.hash.slice(0, 16)}…`);
      check(`v2 sort ≡ v4 sort ≡ brute (η ${eta})`, v2[k].sort.hash === v4[k].sort.hash && v2[k].sort.hash === v4[k].brute.hash, `v2 ${v2[k].sort.hash.slice(0, 16)}… v4 ${v4[k].sort.hash.slice(0, 16)}…`);
    }
  }

  const bs = await T(page, () => globalThis.__swarmProve.bruteSort());
  check("in-page brute ≡ sort (4096 fish, 60 steps, the scene's rule)", bs.identical && bs.nan === 0, `${bs.brute.slice(0, 16)}… ${bs.seconds.toFixed(1)} s`);
  check("in-page run twice, same bytes", bs.repeatable, `${bs.sort.slice(0, 16)}… ≡ ${bs.sort2.slice(0, 16)}…`);
  check("fixed-point sums clean (no saturation flag)", !bs.saturated);

  const sort = await T(page, () => globalThis.__swarmProve.liveSort());
  check("counting sort ≡ CPU reference on the live ocean", sort.problem === null, `${sort.items.toLocaleString()} fish, ${sort.cells.toLocaleString()} cells${sort.problem ? `: ${sort.problem}` : ""}`);

  const ro = await T(page, () => globalThis.__swarmProve.reorder());
  check("the memory reorder changes no fish's path (η 0)", ro.identical, `${ro.n.toLocaleString()} fish, ${ro.steps} steps, ${ro.reorders} re-sorts, ${ro.differing} differ`);

  const fs = await T(page, () => globalThis.__swarmProve.fullScale());
  check("φ series at full scale repeats (run twice)", fs.identical, `${fs.n.toLocaleString()} fish, φ ${fs.phiFirst.toFixed(3)} → ${fs.phiLast.toFixed(3)}, ${fs.seconds.toFixed(1)} s`);

  // the shark clears the water around it
  const target = await T(page, async () => {
    const app = globalThis.__swarm;
    app.clock.paused = false;
    app.studio.rail.select("shark");
    const b = await app.flock.readBoids();
    // the densest of a few hundred fish's neighbourhoods
    const R = app.shark.radius * 0.5;
    let best = [0, 0], bestN = -1;
    for (let k = 0; k < 300; k += 1) {
      const i = (k * 3331) % app.flock.n;
      const x = b[i * 6], y = b[i * 6 + 1];
      let c = 0;
      for (let j = 0; j < app.flock.n; j += 97) if (Math.hypot(b[j * 6] - x, b[j * 6 + 1] - y) < R) c += 1;
      if (c > bestN) { bestN = c; best = [x, y]; }
    }
    app.camera.set({ cx: best[0] + app.flock.halfW, cy: best[1] + app.flock.halfH, pxPerUnit: app.camera.coverZoom() * 4 });
    const [sx, sy] = app.camera.domainToScreen(best[0] + app.flock.halfW, best[1] + app.flock.halfH);
    return { sx, sy };
  });
  const near = (page2) =>
    T(page2, async () => {
      const app = globalThis.__swarm;
      const b = await app.flock.readBoids();
      const s = app.shark;
      const R = s.radius * 0.5;
      let c = 0;
      for (let j = 0; j < app.flock.n; j += 1) {
        let dx = b[j * 6] - s.x, dy = b[j * 6 + 1] - s.y;
        dx -= 2 * app.flock.halfW * Math.round(dx / (2 * app.flock.halfW));
        dy -= 2 * app.flock.halfH * Math.round(dy / (2 * app.flock.halfH));
        if (dx * dx + dy * dy < R * R) c += 1;
      }
      return { c, present: s.presence, x: s.x, y: s.y };
    });
  await page.mouse.move(target.sx - 30, target.sy);
  await page.waitForTimeout(80);
  await page.mouse.move(target.sx, target.sy, { steps: 4 });
  await page.waitForTimeout(120);
  const before = await near(page);
  await page.mouse.down();
  await page.waitForTimeout(2500);
  const during = await near(page);
  await shot(page, "02-shark");
  await page.mouse.up();
  check("the shark clears the water around it (fish within half its fear radius)", during.present > 0.9 && during.c < before.c * 0.25, `${before.c} → ${during.c} fish`);

  // save / restore / compare
  const sr = await T(page, async () => {
    const app = globalThis.__swarm;
    const hash = async () => {
      const t = await app.flock.readBoids();
      const d = await crypto.subtle.digest("SHA-256", t.buffer);
      return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
    };
    app.clock.paused = true;
    await new Promise((r) => setTimeout(r, 200));
    app.savePoint();
    const atSave = await hash();
    const tickSave = app.flock.tick;
    await app.advance(150);
    const later = await hash();
    app.restoreSave();
    const restored = await hash();
    app.toggleCompare();
    const comparing = app.history.comparing && app.view.split !== null;
    app.toggleCompare();
    return { same: atSave === restored, moved: later !== atSave, tick: app.flock.tick === tickSave, comparing, off: app.view.split === null };
  });
  check("save point → restore returns the exact bytes", sr.same && sr.moved && sr.tick, JSON.stringify(sr));
  check("compare A/B toggles the split view", sr.comparing && sr.off);
  check("no console errors (boot, proofs, shark, history)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- a seed reproduces the same bytes across page loads ---------------------
{
  // with noise: the draws follow memory slots, so this also pins the reorder's layout
  const a = await open("/v2/?seed=7&eta=0.15");
  const h1 = await hashAfter(a.page, 300);
  await a.ctx.close();
  const b = await open("/v2/?seed=7&eta=0.15");
  const h2 = await hashAfter(b.page, 300);
  await b.ctx.close();
  const c = await open("/v2/?seed=8&eta=0.15");
  const h3 = await hashAfter(c.page, 300);
  await c.ctx.close();
  check("same seed, same bytes across page loads (1M fish, η 0.15, 300 steps, with re-sorts)", h1 === h2, `${h1.slice(0, 16)}… vs ${h2.slice(0, 16)}…`);
  check("a different seed gives a different ocean", h1 !== h3);
}

// --- the rule rides the share link --------------------------------------------
{
  const { ctx, page, errors } = await open("/v2/?wa=2&eta=0.15&r=0.12&shark=20&col=heading");
  const p = await T(page, () => ({ ...globalThis.__swarm.flock.rule, shark: globalThis.__swarm.sharkSize, col: globalThis.__swarm.view.look.colour }));
  check("a share link sets the rule, shark size and fish colour", p.wAli === 2 && p.noise === 0.15 && p.rCoh === 0.12 && p.shark === 20 && p.col === "heading", JSON.stringify(p));
  await page.waitForTimeout(1500);
  await shot(page, "03-heading");
  check("no console errors (share link)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- the proof flock scene; overlapping loads keep the newest ---------------
{
  const { ctx, page, errors } = await open();
  const r = await T(page, async () => {
    const app = globalThis.__swarm;
    await app.loadScene("proof");
    const proof = { scene: app.scene.id, n: app.flock.n, proofRun: app.onProofRun, reorder: app.flock.sortEvery };
    const a = app.loadScene("proof");
    const b = app.loadScene("open-water");
    await Promise.all([a, b]);
    return { proof, after: { scene: app.scene.id, n: app.flock.n } };
  });
  check("the proof flock is the proofs' run (4,096 fish, no reorder)", r.proof.scene === "proof" && r.proof.n === 4096 && r.proof.proofRun && r.proof.reorder === 0, JSON.stringify(r.proof));
  check("overlapping scene loads keep the newest choice", r.after.scene === "open-water" && r.after.n > 4096, JSON.stringify(r.after));
  check("no console errors (scenes)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}


// --- M1: The Order Dial --------------------------------------------------------
{
  const { ctx, page, errors } = await open("/v2/?s=order-dial");
  await page.waitForTimeout(3000);
  const d = await T(page, () => globalThis.__bpDebug());
  const want = { T3: 1000000, T2: 250000, T1: 60000 }[d.tier];
  check("The Order Dial boots at the tier's fish count on the Vicsek brain", d.scene === "order-dial" && d.agents === want && d.brain?.kind === "vicsek", `${d.agents.toLocaleString()} fish, r ${d.brain?.p.r.toFixed(4)}, v₀ ${d.brain?.p.speed.toFixed(5)}`);
  check("it starts as one ordered school (φ > 0.8)", d.order && d.order.phi > 0.8, `φ ${d.order?.phi.toFixed(3)}`);
  await shot(page, "10-order-dial");
  // the dial is an ARIA slider and answers the keyboard
  const k = await T(page, async () => {
    const face = document.querySelector(".sw-dial-panel [role=slider]");
    face.focus();
    for (let i = 0; i < 5; i += 1) face.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await new Promise((r) => setTimeout(r, 300));
    return { now: face.getAttribute("aria-valuenow"), eta: globalThis.__swarm.flock.brain.p.eta, url: location.search };
  });
  check("the dial is a slider; five arrow presses turn η up by 0.05", Math.abs(k.eta - 0.2) < 1e-9 && k.now === "0.2" && /eta=0\.2/.test(k.url), JSON.stringify(k));
  // a held setting becomes a measured point (8× speed)
  const pt = await T(page, async () => {
    const app = globalThis.__swarm;
    app.setSpeed(8);
    const t0 = performance.now();
    while (!globalThis.__swarmDial.last && performance.now() - t0 < 30000) await new Promise((r) => setTimeout(r, 200));
    const m = globalThis.__swarmDial.last;
    app.setSpeed(1);
    return m && { eta: m.eta, rho: m.rho, phi: m.phi, chi: m.chi, settled: m.settled, steps: m.steps, points: globalThis.__swarmDial.panel.measurements.length };
  });
  check("a held setting is measured from the live solver and lands on the map", pt && pt.eta === 0.2 && pt.points >= 1 && pt.steps >= 600, pt ? `η ${pt.eta}, ρ ${pt.rho}: ⟨φ⟩ ${pt.phi.toFixed(3)}, χ ${pt.chi.toFixed(2)}, ${pt.settled ? "settled" : "still changing"} over ${pt.steps} steps` : "no measurement in 30 s");
  // Tune's "back to the scene's values" moves the dial too, and measures afresh
  const rs = await T(page, async () => {
    const dial = globalThis.__swarmDial;
    dial.set(0.4, 2, "end");
    await new Promise((r) => setTimeout(r, 200));
    globalThis.__swarm.resetRule();
    await new Promise((r) => setTimeout(r, 200));
    const face = document.querySelector(".sw-dial-panel [role=slider]");
    return { eta: dial.eta, rho: dial.rho, meter: [dial.meter.eta, dial.meter.rho], since: dial.meter.since, tick: globalThis.__swarm.flock.tick, now: face.getAttribute("aria-valuenow"), brain: globalThis.__swarm.flock.brain.p.eta };
  });
  check("resetting the rule in Tune moves the dial and restarts its measurement", rs.eta === 0.15 && rs.rho === 1 && rs.meter[0] === 0.15 && rs.meter[1] === 1 && rs.now === "0.15" && rs.brain === 0.15 && rs.tick - rs.since < 200, JSON.stringify(rs));
  // leaving the scene mid-sweep ends the sweep and restores the speed
  const lv = await T(page, async () => {
    const app = globalThis.__swarm;
    const dial = globalThis.__swarmDial;
    const speed0 = app.clock.speed;
    const run = dial.sweep();
    await new Promise((r) => setTimeout(r, 2500));
    const during = { sweeping: dial.sweeping, speed: app.clock.speed };
    await app.loadScene("open-water");
    const res = await run;
    await new Promise((r) => setTimeout(r, 300));
    const after = { sweeping: dial.sweeping, speed: app.clock.speed, scene: app.scene.id, complete: res?.complete };
    await app.loadScene("order-dial");
    return { speed0, during, after };
  });
  check("leaving The Order Dial mid-sweep ends the sweep and restores the speed", lv.during.sweeping && lv.during.speed === 8 && !lv.after.sweeping && lv.after.speed === lv.speed0 && lv.after.complete === false, JSON.stringify(lv));
  // the sweep: the dial turns itself; η_c at the χ peak
  const sw = await T(page, async () => {
    const t0 = performance.now();
    const r = await globalThis.__swarmDial.sweep();
    return { seconds: (performance.now() - t0) / 1000, rho: r.rho, n: r.n, etaC: r.etaC, complete: r.complete, pts: r.points.map((p) => [p.eta, +p.phi.toFixed(4), +p.chi.toFixed(2), p.settled]) };
  });
  const phis = sw.pts.map((p) => p[1]);
  check("a full sweep measures φ(η) from order to disorder", sw.complete && phis[0] > 0.9 && phis[phis.length - 1] < 0.05, `${sw.n.toLocaleString()} fish, ρ ${sw.rho}, ${sw.seconds.toFixed(0)} s: ${sw.pts.map((p) => `${p[0]}:${p[1]}${p[3] ? "" : "*"}`).join(" ")}`);
  check("η_c sits at the χ peak, inside the dial", sw.etaC !== null && sw.etaC > 0.1 && sw.etaC < 0.7, `η_c ${sw.etaC?.toFixed(3)} (Vicsek's units ${(2 * Math.PI * sw.etaC).toFixed(2)}); χ ${sw.pts.map((p) => p[2]).join(" ")}`);
  await shot(page, "11-order-dial-swept");
  // the new brains' proofs
  const br = await T(page, () => globalThis.__swarmProve.brains());
  for (const b of br) check(`${b.brain} brain: brute ≡ sort and run twice (${b.n} fish, noise on)`, b.identical && b.repeatable && b.nan === 0 && !b.saturated, `${b.sort.slice(0, 16)}…`);
  const bro = await T(page, () => globalThis.__swarmProve.brainReorder());
  check("re-sorting changes no fish's path even with noise (Vicsek, η 0.3)", bro.identical, `${bro.n.toLocaleString()} fish, ${bro.reorders} re-sorts, ${bro.differing} differ`);
  const vc = await T(page, () => globalThis.__swarmProve.vicsek());
  check("φ(η) on the GPU matches the f64 CPU reference (z ≤ 4 at every η)", vc.pass, `${vc.rows.map((r) => `η ${r.eta}: ${r.gpuMean.toFixed(3)} vs ${r.cpuMean.toFixed(3)} (z ${r.z.toFixed(2)})`).join("; ")}; ${(vc.gpuSeconds + vc.cpuSeconds).toFixed(1)} s`);
  check("…and a reference shifted by Δη 0.05 fails it", vc.probeFails, `z ${vc.probeZ.toFixed(1)}`);
  check("no console errors (The Order Dial)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}
{
  const { ctx, page, errors } = await open("/v2/?s=order-dial&eta=0.4&rho=2");
  const b = await T(page, () => ({ ...globalThis.__swarm.flock.brain.p, dial: [globalThis.__swarmDial.eta, globalThis.__swarmDial.rho] }));
  const rho = b.r * b.r * 562.5;
  check("an Order Dial link sets η and ρ", Math.abs(b.eta - 0.4) < 1e-9 && Math.abs(rho - 2) < 1e-6 && b.dial[0] === 0.4 && b.dial[1] === 2, JSON.stringify(b));
  check("no console errors (Order Dial link)", errors.length === 0, errors.join(" | "));
  await ctx.close();
  // same seed, same bytes with the Vicsek brain (noise keyed by fish id, re-sorts on)
  const a1 = await open("/v2/?s=order-dial&seed=5&eta=0.3");
  const h1 = await hashAfter(a1.page, 300);
  await a1.ctx.close();
  const a2 = await open("/v2/?s=order-dial&seed=5&eta=0.3");
  const h2 = await hashAfter(a2.page, 300);
  await a2.ctx.close();
  check("The Order Dial: same seed, same bytes across page loads (η 0.3, 300 steps, re-sorts)", h1 === h2, `${h1.slice(0, 16)}… vs ${h2.slice(0, 16)}…`);
}

// --- M1: The Mill ------------------------------------------------------------------
{
  const { ctx, page, errors } = await open("/v2/?s=mill");
  const r = await T(page, async () => {
    const app = globalThis.__swarm;
    app.clock.paused = true;
    await app.advance(1500);
    const o = await app.flock.readOrder();
    app.clock.paused = false;
    return { n: app.flock.n, tier: app.tier, brain: app.flock.brain, phi: o.phi, mill: o.mill, disp: o.dispersion, sat: await app.flock.readSaturated() };
  });
  const want = { T3: 8192, T2: 4096, T1: 2048 }[r.tier];
  check("The Mill boots at its tier count on Couzin's zones", r.n === want && r.brain?.kind === "couzin", `${r.n.toLocaleString()} fish; r_r ${r.brain?.p.rr}, r_o ${r.brain?.p.ro}, r_a ${r.brain?.p.ra.toFixed(1)}, ${r.brain?.p.fovDeg}° view, ${(r.brain?.p.maxTurn * 180 / Math.PI).toFixed(1)}° per step`);
  check("after 1,500 steps the school mills — Tunstrøm's region, measured (O_p < 0.35, O_r > 0.65)", r.phi < 0.35 && r.mill > 0.65 && !r.sat, `O_p ${r.phi.toFixed(3)}, O_r ${r.mill.toFixed(3)}, mean radius ${r.disp.toFixed(1)} r_r`);
  await page.waitForTimeout(1500);
  const lab = await T(page, () => globalThis.__bpDebug().regime);
  check("the panel names it with Tunstrøm's cutoffs", lab === "milling", lab);
  await shot(page, "12-mill");
  const tune = await T(page, () => {
    const t = document.querySelector(".bp-tune");
    // the sliders in the brain's own box (the other boxes carry hidden)
    return t ? [...t.querySelectorAll(".bp-tune-body .bp-slider-label")].filter((e) => !e.closest(".bp-tune-body > [hidden]")).map((e) => e.textContent) : [];
  });
  check("Tune shows Couzin's knobs on The Mill", tune.some((t) => t.startsWith("Orientation zone")) && tune.some((t) => t.startsWith("Field of view")), tune.join(", "));
  // the shark: sit on the mill's centre and lunge
  const c = await T(page, async () => {
    const app = globalThis.__swarm;
    app.studio.rail.select("shark");
    const b = await app.flock.readBoids();
    let sx = 0, sy = 0;
    for (let i = 0; i < app.flock.n; i += 1) { sx += b[i * 6]; sy += b[i * 6 + 1]; }
    const cx = sx / app.flock.n, cy = sy / app.flock.n;
    const [x, y] = app.camera.domainToScreen(cx + app.flock.halfW, cy + app.flock.halfH);
    return { x, y };
  });
  await page.mouse.move(c.x - 20, c.y);
  await page.mouse.move(c.x, c.y, { steps: 4 });
  await page.mouse.down();
  const hit = await T(page, async () => {
    const app = globalThis.__swarm;
    const t0 = app.flock.tick;
    let minMill = 1;
    while (app.flock.tick < t0 + 600) {
      await new Promise((r) => setTimeout(r, 250));
      const o = await app.flock.readOrder();
      minMill = Math.min(minMill, o.mill);
    }
    return { minMill, steps: app.flock.tick - t0 };
  });
  await page.mouse.up();
  await shot(page, "13-mill-shark");
  check("the shark pushes the school out of the mill (O_r falls below 0.65)", hit.minMill < 0.65, `lowest O_r ${hit.minMill.toFixed(3)} over ${hit.steps} steps of lunging at its centre`);
  // save / restore with the brain and its ids
  const sr = await T(page, async () => {
    const app = globalThis.__swarm;
    const hash = async () => {
      const t = await app.flock.readBoids();
      const d = await crypto.subtle.digest("SHA-256", t.buffer);
      return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
    };
    app.clock.paused = true;
    await new Promise((r) => setTimeout(r, 200));
    app.savePoint();
    const a = await hash();
    await app.advance(100);
    const after1 = await hash();
    app.restoreSave();
    const b = await hash();
    await app.advance(100);
    const after2 = await hash();
    return { restored: a === b, replay: after1 === after2 };
  });
  check("The Mill: restore returns the exact bytes, and replays the same 100 steps", sr.restored && sr.replay, JSON.stringify(sr));
  check("no console errors (The Mill)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}
{
  // Couzin et al.: widen the orientation zone and the school stops milling
  const { ctx, page, errors } = await open("/v2/?s=mill&dro=6&fov=300");
  const r = await T(page, async () => {
    const app = globalThis.__swarm;
    app.clock.paused = true;
    await app.advance(1500);
    const o = await app.flock.readOrder();
    return { ro: app.flock.brain.p.ro, fov: app.flock.brain.p.fovDeg, phi: o.phi, mill: o.mill };
  });
  check("a Mill link sets Couzin's zones", r.ro === 7 && r.fov === 300, JSON.stringify(r));
  console.log(`INFO  Mill with Δr_o 6, α 300°: O_p ${r.phi.toFixed(3)}, O_r ${r.mill.toFixed(3)} after 1,500 steps`);
  check("no console errors (Mill link)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- M1: three levels of detail -------------------------------------------------------
{
  const { ctx, page, errors } = await open("/v2/?chrome=off");
  await page.waitForTimeout(2000);
  for (const [zoom, want] of [[1, "field"], [6, "streak"], [20, "glyph"]]) {
    const r = await T(page, async (z) => {
      const app = globalThis.__swarm;
      const c = app.camera;
      c.set({ cx: c.domainW / 2, cy: c.domainH / 2, pxPerUnit: c.coverZoom() * z });
      await new Promise((r) => setTimeout(r, 2000));
      const t = [];
      let last = performance.now();
      await new Promise((res) => {
        let k = 0;
        const f = (now) => { t.push(now - last); last = now; if (++k < 120) requestAnimationFrame(f); else res(); };
        requestAnimationFrame(f);
      });
      t.sort((a, b) => a - b);
      return { lod: app.view.lod.name, len: app.view.look.fishLength * c.pxPerUnit, p50: t[60], p90: t[108], n: app.flock.n, field: app.profiler?.timings().find((p) => p.name === "field")?.avg ?? null };
    }, zoom);
    await shot(page, `20-lod-${want}`);
    check(`${want} level of detail at ${zoom}× (fish ${r.len.toFixed(1)} px), 60 fps at ${r.n.toLocaleString()} fish`, r.lod === want && r.p50 < 17.5, `frame p50 ${r.p50.toFixed(1)} / p90 ${r.p90.toFixed(1)} ms${r.field !== null ? `, field splat ${r.field.toFixed(2)} ms` : ""}`);
  }
  check("no console errors (levels of detail)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- M2: Current ------------------------------------------------------------------------
{
  const { ctx, page, errors } = await open("/v2/?s=current");
  await page.waitForTimeout(4000);
  const d = await T(page, () => globalThis.__bpDebug());
  const want = { T3: 262144, T2: 131072, T1: 65536 }[d.tier];
  check("Current boots at its tier count with its water", d.scene === "current" && d.agents === want && d.fluid && d.fluid.grid[0] >= 64,
    `${d.agents.toLocaleString()} fish on ${d.world.map((v) => v.toFixed(1)).join(" × ")}, water ${d.fluid?.grid.join(" × ")}, ${d.fluid?.motes.toLocaleString()} motes, fb ${d.fluid?.fb.toFixed(3)}`);
  const st = d.fluid?.stats;
  check("the live water is incompressible: grid |∇·u| ≤ 1e-5 of |∇u|", st && st.maxGrad > 0 && st.maxDiv / st.maxGrad <= 1e-5,
    st ? `|∇·u| ${st.maxDiv.toExponential(2)} against |∇u| ${st.maxGrad.toExponential(2)} (${(st.maxDiv / st.maxGrad).toExponential(1)}); Poisson residual ${st.poisson.toExponential(1)}` : "no stats");
  check("the push keeps a current running near a fish's top speed", st && st.maxSpeed > 0.5 * 0.0065 && st.maxSpeed < 3 * 0.0065, st ? `fastest water ${(st.maxSpeed / 0.0065).toFixed(2)}× a fish's top speed` : "");
  await shot(page, "30-current");
  // a wide brush stroke to the right: the ocean's mean drift must move with it
  const u0a = await T(page, async () => { globalThis.__swarm.brushRadius = 4; return (await globalThis.__swarm.current.fluid.readPsi()).u0; });
  await page.mouse.move(400, 380);
  await page.mouse.down();
  for (let k = 0; k < 30; k += 1) await page.mouse.move(400 + k * 16, 380, { steps: 2 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const u0b = await T(page, async () => (await globalThis.__swarm.current.fluid.readPsi()).u0);
  check("a brush stroke pushes the water along it (the mean drift moves right)", u0b[0] - u0a[0] > 2e-4, `U₀ x ${u0a[0].toExponential(2)} → ${u0b[0].toExponential(2)}`);
  for (const [k, name] of [["motes", "the water does not compress: motes stay spread, the compressible control piles them up"], ["exchange", "fish ↔ water conserves momentum"], ["ride", "the school rides the current (coupled vs free, one seed)"]]) {
    const r = await T(page, (key) => globalThis.__swarmProve[key](), k);
    const detail = k === "motes" ? `index ${r.index.toFixed(3)} (start ${r.start.toFixed(3)}), control ${r.control.toFixed(1)}; grid |∇·u| ${r.divRatio.toExponential(1)} of |∇u|`
      : k === "exchange" ? `imbalance ${r.imbalance.toExponential(1)} (fish ${r.fishMomentum.toExponential(4)}, water ${r.waterMomentum.toExponential(4)})`
      : `alignment ${r.alignCoupled.toFixed(3)} coupled vs ${r.alignFree.toFixed(3)} free; water energy ${r.energyCoupled.toExponential(2)} vs ${r.energyFree.toExponential(2)}`;
    check(name, r.pass, detail);
  }
  // save → 100 steps → restore: the fish and the water come back exactly, and replay the same 100 steps
  const sr = await T(page, async () => {
    const app = globalThis.__swarm;
    app.clock.paused = true;
    const h = async () => {
      const b = await app.flock.readBoids();
      const p = (await app.current.fluid.readPsi()).psi;
      const all = new Uint8Array(b.byteLength + p.byteLength);
      all.set(new Uint8Array(b.buffer, b.byteOffset, b.byteLength), 0);
      all.set(new Uint8Array(p.buffer, p.byteOffset, p.byteLength), b.byteLength);
      return [...new Uint8Array(await crypto.subtle.digest("SHA-256", all))].map((x) => x.toString(16).padStart(2, "0")).join("");
    };
    const h0 = await h();
    const drag0 = app.current.fluid.params.drag;
    const tide0 = app.current.tideSpeed;
    app.savePoint();
    await app.advance(100);
    const h1 = await h();
    // turn the knobs after saving: the restore must bring them back with the water
    app.current.fluid.params = { ...app.current.fluid.params, drag: 0.2 };
    app.current.setTide(tide0 * 2);
    app.restoreSave();
    await app.device.queue.onSubmittedWorkDone();
    const h2 = await h();
    const knobs = app.current.fluid.params.drag === drag0 && app.current.tideSpeed === tide0;
    await app.advance(100);
    const h3 = await h();
    return { restored: h0 === h2, replay: h1 === h3, moved: h0 !== h1, knobs };
  });
  check("Current: restore returns the fish, the water and its knobs exactly, and replays the same 100 steps", sr.restored && sr.replay && sr.moved && sr.knobs, JSON.stringify(sr));
  check("no console errors (Current)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}
{
  const a = await open("/v2/?s=current&seed=3");
  const h1 = await hashAfter(a.page, 300);
  await a.ctx.close();
  const b = await open("/v2/?s=current&seed=3");
  const h2 = await hashAfter(b.page, 300);
  await b.ctx.close();
  check("Current: same seed, same bytes across page loads (fish and water coupled, 300 steps)", h1 === h2, `${h1.slice(0, 16)}… vs ${h2.slice(0, 16)}…`);
}

// --- M2: Food Chain ---------------------------------------------------------------------
{
  const { ctx, page, errors } = await open("/v2/?s=food-chain");
  await page.waitForTimeout(4000);
  const d = await T(page, () => globalThis.__bpDebug());
  const want = { T3: 32768, T2: 16384, T1: 8192 }[d.tier];
  const c0 = d.census;
  check("Food Chain boots with its fish slots, a census and its first sharks", d.scene === "food-chain" && d.agents === want && c0 && c0.fish > 0.1 * want && c0.sharks >= 1,
    c0 ? `${c0.fish.toLocaleString()} of ${d.agents.toLocaleString()} slots alive, ${c0.sharks} sharks, plankton ${(c0.plankton * 100).toFixed(0)}%` : "no census");
  await shot(page, "31-food-chain");
  // Feed: hold a wide brush still for 1.5 s — the plankton rises
  const p0 = await T(page, async () => { const a = globalThis.__swarm; a.brushRadius = 4; return (await a.ecology.readCensusNow()).plankton; });
  await page.mouse.move(640, 360);
  await page.mouse.down();
  await page.waitForTimeout(1500);
  await page.mouse.up();
  const p1 = await T(page, async () => (await globalThis.__swarm.ecology.readCensusNow()).plankton);
  check("Feed makes plankton bloom", p1 > p0 + 0.05, `plankton ${(p0 * 100).toFixed(1)}% → ${(p1 * 100).toFixed(1)}%`);
  // Release: one click puts 300 fish in the water at the next step (births and deaths move the count a little)
  const r = await T(page, async () => {
    const a = globalThis.__swarm;
    a.studio.rail.selectIndex(1);
    return { before: (await a.ecology.readCensusNow()).fish, tool: a.studio.rail.active };
  });
  await page.mouse.click(700, 300);
  await page.waitForTimeout(250);
  const r2 = await T(page, async () => (await globalThis.__swarm.ecology.readCensusNow()).fish);
  check("Release puts a school of 300 in the water", r.tool === "release" && r2 - r.before >= 260 && r2 - r.before <= 340, `${r.before} → ${r2} fish`);
  const rp = await T(page, () => globalThis.__swarmProve.replay());
  check("Food Chain replays byte for byte (fish, sharks, plankton), and another seed differs", rp.identical && rp.differs && rp.births > 0,
    `${rp.hashes[0].slice(0, 16)}…; ${rp.births} births, ${rp.eaten} eaten in the run`);
  const sr = await T(page, async () => {
    const app = globalThis.__swarm;
    app.clock.paused = true;
    const h = async () => {
      const b = await app.flock.readBoids();
      const c = await app.ecology.readCensusNow();
      const all = new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
      return [...new Uint8Array(await crypto.subtle.digest("SHA-256", all))].map((x) => x.toString(16).padStart(2, "0")).join("") + `|${c.fish}|${c.sharks}|${c.plankton}`;
    };
    const h0 = await h();
    const eff0 = app.ecology.params.efficiency;
    app.savePoint();
    await app.advance(120);
    const h1 = await h();
    app.ecology.params = { ...app.ecology.params, efficiency: 0.4 };
    app.restoreSave();
    await app.device.queue.onSubmittedWorkDone();
    const h2 = await h();
    const knobs = app.ecology.params.efficiency === eff0;
    await app.advance(120);
    const h3 = await h();
    return { restored: h0 === h2, replay: h1 === h3, moved: h0 !== h1, knobs };
  });
  check("Food Chain: restore returns the fish, sharks, plankton and rates exactly, and replays the same 120 steps", sr.restored && sr.replay && sr.moved && sr.knobs, JSON.stringify(sr));
  check("no console errors (Food Chain)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}
{
  const a = await open("/v2/?s=food-chain&seed=4");
  const h1 = await hashAfter(a.page, 400);
  await a.ctx.close();
  const b = await open("/v2/?s=food-chain&seed=4");
  const h2 = await hashAfter(b.page, 400);
  await b.ctx.close();
  check("Food Chain: same seed, same bytes across page loads (400 steps of births and deaths)", h1 === h2, `${h1.slice(0, 16)}… vs ${h2.slice(0, 16)}…`);
}
{
  // ten minutes of simulated time (36,000 steps at 60 a second), run at 8×, from the default seed
  const { ctx, page, errors } = await open("/v2/?s=food-chain&sp=8");
  const series = await T(page, async () => {
    const app = globalThis.__swarm;
    const rows = [];
    while (app.flock.tick < 36000) {
      await new Promise((r) => setTimeout(r, 500));
      const c = app.census;
      if (c) rows.push([app.flock.tick, c.fish, c.sharks, c.plankton]);
    }
    return rows;
  });
  const fish = series.map((r) => r[1]);
  const sharks = series.map((r) => r[2]);
  const slots = 32768;
  const peaks = [];
  for (let i = 0; i < series.length; i += 1) {
    const win = sharks.slice(Math.max(0, i - 40), i + 41);
    if (sharks[i] > 30 && sharks[i] >= Math.max(...win) && (peaks.length === 0 || series[i][0] - peaks[peaks.length - 1] > 6000)) peaks.push(series[i][0]);
  }
  console.log(`BP_FOODCHAIN ${JSON.stringify(series.filter((_, i) => i % 4 === 0))}`);
  check("Food Chain: ten simulated minutes, no population lost — fish and sharks always present, within their slots",
    Math.min(...fish) > 0 && Math.min(...sharks.slice(10)) >= 1 && Math.max(...fish) <= slots,
    `${series.length} samples to step ${series[series.length - 1][0].toLocaleString()}: fish ${Math.min(...fish)}–${Math.max(...fish)}, sharks ${Math.min(...sharks)}–${Math.max(...sharks)}; shark booms at steps ${peaks.join(", ")}`);
  check("…and the populations cycle (at least two shark booms)", peaks.length >= 2, `${peaks.length} booms`);
  check("no console errors (Food Chain, ten minutes)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- M2 knobs ride the share link, and survive a restart ---------------------------------
{
  const { ctx, page, errors } = await open("/v2/?s=current&wp=0.1,-1,1.5,-1,-1");
  const w = await T(page, async () => {
    const a = globalThis.__swarm;
    // the water was built with the linked push (its starting vorticity comes from it), not patched after
    const before = { drag: a.current.fluid.params.drag, push: a.current.tideSpeed / a.flock.rule.maxSpeed, built: a.current.cfg.tide / a.flock.rule.maxSpeed };
    await a.restart();
    return { before, after: { drag: a.current.fluid.params.drag, push: a.current.tideSpeed / a.flock.rule.maxSpeed }, url: location.search };
  });
  check("a Current link builds the water with its knobs, and a restart keeps them", w.before.drag === 0.1 && Math.abs(w.before.push - 1.5) < 1e-9 && Math.abs(w.before.built - 1.5) < 1e-9 && w.after.drag === 0.1 && Math.abs(w.after.push - 1.5) < 1e-9 && /wp=/.test(w.url), JSON.stringify(w));
  await ctx.close();
  const b = await open("/v2/?s=food-chain&ep=0.02,0.2,-1,-1");
  const e = await T(b.page, () => globalThis.__swarm.ecology.params);
  check("a Food Chain link sets the ecology's knobs", e.growth === 0.02 && e.efficiency === 0.2 && e.sharkCost === 0.0042, `growth ${e.growth}, efficiency ${e.efficiency}, shark upkeep ${e.sharkCost}`);
  check("no console errors (M2 links)", errors.length === 0 && b.errors.length === 0, [...errors, ...b.errors].join(" | "));
  await b.ctx.close();
}

// --- M3 helpers -------------------------------------------------------------------------
/** Pause, and return the screen point (CSS px) of the live fish nearest the view's centre. */
const fishNearCentre = (page) =>
  T(page, async () => {
    const app = globalThis.__swarm;
    app.clock.paused = true;
    await app.device.queue.onSubmittedWorkDone();
    const b = await app.flock.readBoids();
    const W = app.camera.viewW;
    const H = app.camera.viewH;
    let best = null;
    let bd = Infinity;
    for (let i = 0; i < app.flock.n; i += 1) {
      if (b[i * 6 + 5] < 0) continue;
      const [sx, sy] = app.camera.domainToScreen(b[i * 6] + app.flock.halfW, b[i * 6 + 1] + app.flock.halfH);
      const d = Math.hypot(sx - W / 2, sy - H / 2);
      if (d < bd) {
        bd = d;
        best = [sx, sy];
      }
    }
    return best;
  });

/** Watch the fish at (x, y), run for `ms`, then pause and check the record against the GPU's own copy of that fish. */
const watchAndTrack = (page, at, ms) =>
  T(
    page,
    async ([at, ms]) => {
      const app = globalThis.__swarm;
      const ok = await app.watchAt(at[0], at[1]);
      if (!ok) return { ok };
      const id = app.watch.id;
      const tick0 = app.flock.tick;
      const reorders0 = app.flock.reorders;
      app.clock.paused = false;
      const slots = new Set();
      const t0 = performance.now();
      while (performance.now() - t0 < ms) {
        await new Promise((r) => setTimeout(r, 50));
        if (app.watch.rec?.found) slots.add(app.watch.rec.slot);
      }
      // while following: the fish where the record, carried forward to this step, puts it — against the view's centre
      const rec = app.watch.rec;
      const ahead = app.flock.tick - app.watch.recTick;
      const [sx, sy] = app.camera.domainToScreen(rec.pos[0] + rec.vel[0] * ahead + app.flock.halfW, rec.pos[1] + rec.vel[1] * ahead + app.flock.halfH);
      const offRunning = Math.hypot(sx - app.camera.viewW / 2, sy - app.camera.viewH / 2);
      app.clock.paused = true;
      await new Promise((r) => setTimeout(r, 600));
      // paused, the record is of the current step: the camera must sit on the fish itself
      const [px, py] = app.camera.domainToScreen(app.watch.rec.pos[0] + app.flock.halfW, app.watch.rec.pos[1] + app.flock.halfH);
      const offCentre = Math.hypot(px - app.camera.viewW / 2, py - app.camera.viewH / 2);
      // paused: the tracker still runs each frame, so its last record is of the current step
      const [b, ids] = await Promise.all([app.flock.readBoids(), app.flock.readIds()]);
      let slot = -1;
      for (let s = 0; s < app.flock.n; s += 1) if (ids[s] === id) slot = s;
      const r = app.watch.rec;
      const same = slot >= 0 && r.found && r.slot === slot && r.pos[0] === b[slot * 6] && r.pos[1] === b[slot * 6 + 1] && app.watch.recTick === app.flock.tick;
      // its neighbours: every fish within the reach, counted on the CPU from the same state
      const { radius } = app.watchReach();
      let within = 0;
      const W = app.flock.halfW * 2;
      const H = app.flock.halfH * 2;
      for (let s = 0; s < app.flock.n; s += 1) {
        if (s === slot || b[s * 6 + 5] < 0) continue;
        let dx = b[s * 6] - b[slot * 6];
        let dy = b[s * 6 + 1] - b[slot * 6 + 1];
        dx -= W * Math.round(dx / W);
        dy -= H * Math.round(dy / H);
        if (Math.hypot(dx, dy) < radius) within += 1;
      }
      return {
        ok,
        id,
        steps: app.flock.tick - tick0,
        reorders: app.flock.reorders - reorders0,
        slots: slots.size,
        same,
        total: r.total,
        within,
        listed: r.listed,
        offCentre,
        offRunning,
        follow: app.watch.follow,
        retina: !!app.watch.retina,
        panel: !!document.querySelector(".sw-watch"),
        panelText: document.querySelector(".sw-watch")?.textContent ?? "",
      };
    },
    [at, ms],
  );

/** The watch panel and the scene's own panel at the current viewport: no overlap. */
const panelsClear = (page) =>
  T(page, () => {
    const vis = (el) => el && getComputedStyle(el).display !== "none" && el.getBoundingClientRect().width > 0;
    const els = [...document.querySelectorAll("[data-bp-chrome], .bp-rail, .bp-transport, .bp-options, .bp-top-actions, .bp-heading .bp-scene-title")].filter(vis);
    const r = els.map((e) => ({ c: e.className.split(" ")[0], b: e.getBoundingClientRect() }));
    const bad = [];
    for (let i = 0; i < r.length; i += 1)
      for (let j = i + 1; j < r.length; j += 1) {
        const a = r[i].b;
        const c = r[j].b;
        if (a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1) bad.push(`${r[i].c} × ${r[j].c}`);
      }
    return bad;
  });

// --- M3: Eyes Only -------------------------------------------------------------------------
{
  const { ctx, page, errors } = await open("/v2/?s=eyes-only");
  const d = await T(page, () => {
    const g = globalThis.__bpDebug();
    return { ...g, tools: [...document.querySelectorAll(".bp-rail-tools [data-tool]")].map((b) => b.dataset.tool), colour: globalThis.__swarm.view.look.colour, expMax: globalThis.__swarm.hdr.exposure.max };
  });
  check("Eyes Only boots on the vision brain at its count, Watch first", d.scene === "eyes-only" && d.brain?.kind === "vision" && d.agents === (d.tier === "T1" ? 1024 : 2048) && d.tools[0] === "watch" && d.colour === "heading" && d.expMax === 1,
    `${d.agents.toLocaleString()} fish on ${d.world.map((x) => x.toFixed(0)).join(" × ")} BL, sight ${d.brain?.p.range} BL, tools ${d.tools.join(", ")}`);
  await shot(page, "m3-eyes-boot");

  // the M3 brains' proofs, as Prove runs them
  const ex = await T(page, () => globalThis.__swarmProve.m3Exact());
  for (const r of ex) {
    check(`${r.brain}: brute force ≡ counting sort, and run twice (${r.n.toLocaleString()} fish, 60 steps)`, r.identical && r.repeatable && r.nan === 0 && !r.saturated, `${r.sort.slice(0, 16)}…`);
    check(`${r.brain}: re-sorting in memory changes no fish (by id)`, r.reorder.differing === 0 && r.reorder.reorders > 0, `${r.reorder.n.toLocaleString()} fish, ${r.reorder.reorders} re-sorts, ${r.reorder.differing} differ`);
  }
  const fc = await T(page, () => globalThis.__swarmProve.field());
  check("every fish's visual field matches the f64 reference (declared ≤ 5e-5 of bins, |Δψ|, |Δv| ≤ 1e-6)", fc.differ / fc.bins <= 5e-5 && fc.maxDpsi <= 1e-6 && fc.maxDv <= 1e-6,
    `${fc.differ} of ${fc.bins.toLocaleString()} bins in ${fc.fishDiffering} fish; |Δψ| ${fc.maxDpsi.toExponential(2)}, |Δv| ${fc.maxDv.toExponential(2)}; cover ${(fc.cover * 100).toFixed(0)}%, ${fc.edges.toFixed(1)} edges`);
  const oc = await T(page, () => globalThis.__swarmProve.order());
  check("ordered motion emerges with no alignment rule: GPU ≡ f64 reference (z ≤ 4), both φ > 0.5", oc.z <= 4 && oc.gpuMean > 0.5 && oc.cpuMean > 0.5,
    `⟨φ⟩ GPU ${oc.gpuMean.toFixed(3)} (32 seeds) · CPU ${oc.cpuMean.toFixed(3)} (32 seeds), z ${oc.z.toFixed(2)}; ${(oc.gpuSeconds + oc.cpuSeconds).toFixed(1)} s`);
  check("…and not without the edge terms (control ⟨φ⟩ ≤ 0.25)", oc.controlMean <= 0.25, `control ⟨φ⟩ ${oc.controlMean.toFixed(3)}, largest ${Math.max(...oc.control).toFixed(3)}`);

  // the live scene schools — and with the edge terms off, does not
  const live = await T(page, async () => {
    const app = globalThis.__swarm;
    const run = async (a1) => {
      app.clock.paused = true;
      const p = { ...app.flock.brain.p, a1, b1: a1 };
      await app.loadScene("eyes-only", { seed: app.seed, brain: { kind: "vision", p } });
      app.clock.paused = true;
      await app.advance(3600);
      app.clock.paused = false;
      const t0 = performance.now();
      const tick = app.flock.tick;
      while (performance.now() - t0 < 6000) {
        await new Promise((r) => setTimeout(r, 100));
        const s = globalThis.__bpDebug().schools;
        if (s && app.flock.tick > tick) return { ...s, phi: globalThis.__bpDebug().order?.phi ?? null, panel: document.querySelector(".sw-eyes")?.textContent ?? "" };
      }
      return null;
    };
    const on = await run(app.flock.brain.p.a1);
    const off = await run(0);
    await app.loadScene("eyes-only", { seed: app.seed });
    return { on, off };
  });
  check("the live ocean schools by step 3,600: each school's own order > 0.8, most fish in schools", live.on && live.on.order > 0.8 && live.on.schooled > 0.8 * d.agents,
    live.on ? `${live.on.schools} schools, ${live.on.schooled} fish, own order ${live.on.order.toFixed(3)}, whole-ocean φ ${live.on.phi?.toFixed(3)}` : "no sample");
  check("…with the edge terms off it does not (own order < 0.5)", live.off && (live.off.schools === 0 || live.off.order < 0.5),
    live.off ? `${live.off.schools} schools, own order ${live.off.order.toFixed(3)}, φ ${live.off.phi?.toFixed(3)}` : "no sample");
  check("the panel reads the schools", live.on && /schools?/.test(live.on.panel) && /Schooling|Lining up|Gathering/.test(live.on.panel), live.on?.panel.slice(0, 120));

  // Watch: its retina, the same fish through re-sorts, the camera
  const at = await fishNearCentre(page);
  const w = await watchAndTrack(page, at, 2500);
  check("Watch picks the fish under the pointer and keeps the same fish through memory re-sorts", w.ok && w.same && w.reorders >= 2,
    `fish ${w.id}: ${w.steps} steps, ${w.reorders} re-sorts, seen in ${w.slots} memory slots; record = the GPU's own copy of that fish: ${w.same}`);
  check("…counts every fish within its sight (the record against the CPU, same step)", w.total === w.within && w.total > 0, `${w.total} on the GPU, ${w.within} on the CPU (${w.listed} listed)`);
  check("…the camera follows it (within 40 px of the centre while it swims, 2 px once paused)", w.follow && w.offRunning < 40 && w.offCentre < 2, `${w.offRunning.toFixed(1)} px swimming, ${w.offCentre.toFixed(2)} px paused`);
  check("…and its panel shows its retina", w.retina && w.panel && /What it sees/.test(w.panelText) && /edges?/.test(w.panelText), w.panelText.slice(0, 140));
  await shot(page, "m3-eyes-watch");
  const clear = await panelsClear(page);
  check("Eyes Only: watching, no panel overlaps another at 1280×720", clear.length === 0, clear.join(", "));
  // a drag with the Watch tool pans the view (a real mouse, through the canvas input)
  const before = await T(page, () => globalThis.__swarm.watch.follow);
  await page.mouse.move(600, 300);
  await page.mouse.down();
  for (let k = 1; k <= 6; k += 1) await page.mouse.move(600 + k * 20, 300 + k * 6);
  await page.mouse.up();
  const pan = await T(page, async (before) => {
    const app = globalThis.__swarm;
    await new Promise((r) => setTimeout(r, 200));
    const panned = app.watch.follow;
    const followBtn = [...document.querySelectorAll(".sw-watch button")].find((b) => b.textContent === "Follow");
    const shown = followBtn && getComputedStyle(followBtn).display !== "none";
    followBtn?.click();
    const again = app.watch.follow;
    [...document.querySelectorAll(".sw-watch button")].find((b) => b.textContent === "Let go")?.click();
    await new Promise((r) => setTimeout(r, 200));
    return { before, panned, shown, again, after: app.watch.id, panel: !!document.querySelector(".sw-watch") };
  }, before);
  check("a pan takes the camera back from the fish; Follow returns it; Let go ends the watch", pan.before && !pan.panned && pan.shown && pan.again && pan.after === null && !pan.panel, JSON.stringify(pan));

  // save → 100 steps → restore: exact, and the same 100 steps again (ψ rides in the boids)
  const sr = await T(page, async () => {
    const app = globalThis.__swarm;
    app.clock.paused = true;
    const h = async () => [...new Uint8Array(await crypto.subtle.digest("SHA-256", (await app.flock.readBoids()).buffer))].map((x) => x.toString(16).padStart(2, "0")).join("");
    await app.advance(50);
    const h0 = await h();
    app.savePoint();
    await app.advance(100);
    const h1 = await h();
    app.restoreSave();
    await app.device.queue.onSubmittedWorkDone();
    const h2 = await h();
    await app.advance(100);
    const h3 = await h();
    return { restored: h0 === h2, replay: h1 === h3, moved: h0 !== h1 };
  });
  check("Eyes Only: restore returns the exact bytes, and replays the same 100 steps", sr.restored && sr.replay && sr.moved, JSON.stringify(sr));
  check("no console errors (Eyes Only)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}
{
  const a = await open("/v2/?s=eyes-only&seed=5");
  const h1 = await hashAfter(a.page, 300);
  await a.ctx.close();
  const b = await open("/v2/?s=eyes-only&seed=5");
  const h2 = await hashAfter(b.page, 300);
  const v = await T(b.page, () => globalThis.__swarm.flock.brain.p);
  await b.ctx.close();
  check("Eyes Only: same seed, same bytes across page loads (300 steps, re-sorts)", h1 === h2, `${h1.slice(0, 16)}… vs ${h2.slice(0, 16)}…`);
  const c = await open("/v2/?s=eyes-only&vis=0.2,0.03,0.25,20");
  const p = await T(c.page, async () => {
    const app = globalThis.__swarm;
    const before = { ...app.flock.brain.p };
    await app.restart();
    return { before, after: { ...app.flock.brain.p }, url: location.search };
  });
  check("an Eyes Only link sets α₀, β₀, the edge pull and the sight, and a restart keeps them",
    p.before.a0 === 0.2 && p.before.b0 === 0.03 && p.before.a1 === 0.25 && p.before.b1 === 0.25 && p.before.range === 20 && p.after.a1 === 0.25 && p.after.range === 20 && /vis=/.test(p.url) && v.a1 === 0.2,
    JSON.stringify({ before: p.before, url: p.url }));
  check("no console errors (Eyes Only links)", c.errors.length === 0, c.errors.join(" | "));
  await c.ctx.close();
}

// --- M3: Species Matrix ------------------------------------------------------------------
{
  const { ctx, page, errors } = await open("/v2/?s=species");
  const d = await T(page, async () => {
    const g = globalThis.__bpDebug();
    const b = await globalThis.__swarm.flock.readBoids();
    const kinds = new Set();
    for (let i = 0; i < g.agents; i += 1) kinds.add(b[i * 6 + 4]);
    return { ...g, kinds: [...kinds].sort(), cells: document.querySelectorAll(".sw-matrix-cell").length, colour: globalThis.__swarm.view.look.colour };
  });
  check("Species Matrix boots with three kinds at its count, coloured by kind, and the matrix on the canvas", d.brain?.kind === "species" && d.kinds.join() === "0,1,2" && d.cells === 9 + 3 && d.colour === "species",
    `${d.agents.toLocaleString()} fish, kinds ${d.kinds.join(", ")}, ${d.cells} cells`);
  await shot(page, "m3-species-boot");
  const k = await T(page, async () => {
    const cell = [...document.querySelectorAll(".sw-matrix-cell")].find((c) => c.getAttribute("aria-label") === "blue steers towards gold");
    const before = globalThis.__swarm.flock.brain.p.gc[2];
    cell.focus();
    for (let i = 0; i < 5; i += 1) cell.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    // the link is written 250 ms after the last change
    await new Promise((r) => setTimeout(r, 500));
    return { before, after: globalThis.__swarm.flock.brain.p.gc[2], now: cell.getAttribute("aria-valuenow"), url: location.search, preset: globalThis.__bpDebug().species.preset };
  });
  check("a matrix cell is a slider: five arrow presses raise blue → gold by 0.5, in the running brain and the link",
    Math.abs(k.after - (k.before + 0.5)) < 1e-9 && k.now === k.after.toFixed(2) && /kinds=custom~3~g/.test(decodeURIComponent(k.url)) && k.preset === "custom", JSON.stringify(k));
  const five = await T(page, async () => {
    const seg = [...document.querySelectorAll(".sw-matrix-count .bp-seg")].find((b) => b.textContent === "5");
    seg.click();
    await new Promise((r) => setTimeout(r, 600));
    const app = globalThis.__swarm;
    const b = await app.flock.readBoids();
    const kinds = new Set();
    for (let i = 0; i < app.flock.n; i += 1) kinds.add(b[i * 6 + 4]);
    return { count: app.flock.brain.p.count, kinds: kinds.size, tick: app.flock.tick, cells: document.querySelectorAll(".sw-matrix-cell").length };
  });
  check("five kinds restart the ocean with five kinds (a 5 × 5 matrix)", five.count === 5 && five.kinds === 5 && five.cells === 25 + 5 && five.tick < 200, JSON.stringify(five));
  const mx = await T(page, () => globalThis.__swarmProve.mixing());
  check("the matrix does what it says: kept apart, kinds gather (≥ +0.4); all together, a random draw (±0.01)", mx.pass, `apart +${mx.apart.toFixed(3)}, together ${mx.together.toFixed(4)}`);
  const mixShown = await T(page, async () => {
    await new Promise((r) => setTimeout(r, 2500));
    return document.querySelector(".sw-matrix-mix")?.textContent ?? "";
  });
  check("the panel reads each kind's own share of its neighbours", /%/.test(mixShown) && /\(\d+%\)/.test(mixShown), mixShown.slice(0, 120));
  // Watch: the species line
  const at = await fishNearCentre(page);
  const w = await watchAndTrack(page, at, 1500);
  check("Watch in Species Matrix: the same fish through re-sorts, its neighbours, its kind", w.ok && w.same && w.total === w.within && /fish — /.test(w.panelText), `${w.reorders} re-sorts, ${w.total} within r; ${w.panelText.slice(w.panelText.indexOf("A "), w.panelText.indexOf("A ") + 60)}`);
  const clear = await panelsClear(page);
  check("Species Matrix: watching, no panel overlaps another at 1280×720 (five kinds)", clear.length === 0, clear.join(", "));
  await shot(page, "m3-species-watch");
  const sr = await T(page, async () => {
    const app = globalThis.__swarm;
    app.letGo();
    app.clock.paused = true;
    const h = async () => [...new Uint8Array(await crypto.subtle.digest("SHA-256", (await app.flock.readBoids()).buffer))].map((x) => x.toString(16).padStart(2, "0")).join("");
    const h0 = await h();
    const gc0 = app.flock.brain.p.gc.slice();
    app.savePoint();
    await app.advance(100);
    const h1 = await h();
    // edit the matrix after saving: the restore must bring the matrix back with the fish
    app.setBrain({ kind: "species", p: { ...app.flock.brain.p, gc: gc0.map((x) => -x) } });
    app.restoreSave();
    await app.device.queue.onSubmittedWorkDone();
    const h2 = await h();
    const matrix = app.flock.brain.p.gc.every((x, i) => x === gc0[i]);
    await app.advance(100);
    const h3 = await h();
    return { restored: h0 === h2, replay: h1 === h3, moved: h0 !== h1, matrix };
  });
  check("Species Matrix: restore returns the fish and the matrix exactly, and replays the same 100 steps", sr.restored && sr.replay && sr.moved && sr.matrix, JSON.stringify(sr));
  check("no console errors (Species Matrix)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}
{
  const a = await open("/v2/?s=species&seed=4");
  const h1 = await hashAfter(a.page, 300);
  await a.ctx.close();
  const b = await open("/v2/?s=species&seed=4");
  const h2 = await hashAfter(b.page, 300);
  await b.ctx.close();
  check("Species Matrix: same seed, same bytes across page loads (300 steps)", h1 === h2, `${h1.slice(0, 16)}… vs ${h2.slice(0, 16)}…`);
  const link = "custom~2~g0.9,-1.2,1.5,0.2~a1.1,0,0,0.3~s1,2";
  const c = await open(`/v2/?s=species&kinds=${encodeURIComponent(link)}`);
  const p = await T(c.page, () => ({ p: globalThis.__swarm.flock.brain.p, cells: document.querySelectorAll(".sw-matrix-cell").length, sel: document.querySelector(".sw-matrix-preset").value }));
  check("an edited matrix rides the link", p.p.count === 2 && p.p.gc[1] === -1.2 && p.p.gc[6] === 1.5 && p.p.ga[7] === 0.3 && p.p.spd[1] === 2 && p.cells === 4 + 2 && p.sel === "custom", JSON.stringify({ gc: p.p.gc.slice(0, 8), spd: p.p.spd.slice(0, 2), sel: p.sel }));
  check("no console errors (Species Matrix links)", c.errors.length === 0, c.errors.join(" | "));
  await c.ctx.close();
}

// --- M3: Watch one in the other scenes, and the rail ------------------------------------------
for (const scene of ["open-water", "order-dial", "mill", "current", "food-chain"]) {
  const { ctx, page, errors } = await open(`/v2/?s=${scene}`);
  const tools = await T(page, () => [...document.querySelectorAll(".bp-rail-tools [data-tool]")].map((b) => b.dataset.tool));
  const at = await fishNearCentre(page);
  const w = await watchAndTrack(page, at, 1500);
  // Food Chain never re-sorts (a slot holds a life); the others do every 16 steps
  const resorts = scene === "food-chain" ? w.reorders === 0 : w.reorders >= 1;
  check(`Watch in ${scene}: the same fish (${scene === "food-chain" ? "by slot" : "through re-sorts"}), every neighbour counted, the camera on it`, w.ok && w.same && resorts && w.total === w.within && w.offRunning < 40 && w.offCentre < 2,
    `${w.steps} steps, ${w.reorders} re-sorts, ${w.total} within reach (CPU ${w.within}), ${w.offRunning.toFixed(1)} px off centre swimming, ${w.offCentre.toFixed(2)} paused; tools ${tools.join(", ")}`);
  const clear = await panelsClear(page);
  check(`${scene}: at most six tools, Watch among them; watching, no panel overlaps another at 1280×720`, tools.length <= 6 && tools.includes("watch") && clear.length === 0, `${tools.length} tools; ${clear.join(", ")}`);
  check(`no console errors (Watch, ${scene})`, errors.length === 0, errors.join(" | "));
  if (scene === "mill") await shot(page, "m3-mill-watch");
  await ctx.close();
}

// --- frame time: the boot scene and the M1, M2 and M3 scenes -----------------------
for (const scene of ["open-water", "order-dial", "mill", "current", "food-chain", "eyes-only", "species"]) {

  const { ctx, page } = await open(`/v2/?s=${scene}&bench=1`);
  await page.waitForFunction(() => globalThis.__bpBench, undefined, { timeout: 60000 });
  const b = await T(page, () => globalThis.__bpBench);
  console.log(`BP_BENCH ${JSON.stringify(b)}`);
  check(`bench ran (${scene})`, b.frames > 0, `${b.agents.toLocaleString()} fish, ${b.fps.toFixed(1)} fps, frame p50 ${b.frameP50.toFixed(1)} ms / p90 ${b.frameP90.toFixed(1)} ms, GPU p50 ${b.gpuP50.toFixed(2)} ms, ${Math.round(b.stepsPerSecond)} steps/s, render scale ${b.renderScale}`);
  await ctx.close();
}

await browser.close();
server.close();
const failed = results.filter((r) => !r.ok);
if (out) await writeFile(join(out, "acceptance.json"), JSON.stringify(results, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
