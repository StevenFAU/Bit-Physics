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
// Prints BP_BENCH lines at the end (Open Water, The Order Dial, The Mill).

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

// --- frame time: the boot scene and the M1 scenes ------------------------------
for (const scene of ["open-water", "order-dial", "mill"]) {
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
