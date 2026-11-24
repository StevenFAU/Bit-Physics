// Murmuration v2 — acceptance checks in a real WebGPU browser
// (docs/planning/rebuild-v2/07-boids-3d.md, M0).
//
//   npm run build   (in this directory)
//   CHROME_BIN=/snap/bin/chromium \
//   PLAYWRIGHT_MODULE=<repo>/tools/productization/web-deploy/web/headless/node_modules/playwright/index.js \
//   node v2-acceptance.mjs [out-dir]
//
// Checks: the v1 page's capture and the v2 page's carry the same bytes; v2
// signals ready at the gate path, then goes live; the tier's bird count and
// the clock's step rate; an ordered flock (M1: polarization, nearest
// neighbour, thickness, measured); the in-page gate, grid ≡ brute force byte
// for byte (a flock, birds packed beyond a corner of the grid, and the falcon
// flying through so the alarm spreads) and the sort and gather as an exact
// permutation on the live flock; a step's bytes do not depend on how
// steps fall into submits; the same seed gives the same bytes across page
// loads; the flock is drawn as a medium (a dark core, lace at the edges) from
// the ground; the spec's flicker risk — the screen's total optical depth over
// a slow dolly, against the analytic-normalisation control, and the same
// across the near-bird hand-off (cross-fade against a hard switch, all meshes
// and the medium alone); Look turns the head and leaves the eye where it is,
// double-click comes home; Startle raises the alarm; the falcon (F) hunts and
// the alarm wave's speed is measured; The Attack replays byte for byte; a gust
// changes the flock and save / restore replays it byte for byte; Tune's
// alignment and sun on the link and back after a reload;
// reduced motion; at most six tools at 1280×720; no console errors. Prints a
// BP_BENCH line at the end.

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
const measured = {};
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
  await page.waitForFunction(() => globalThis.__bitPhysicsReady === true, undefined, { timeout: 60000 });
  const ready = Date.now() - t0;
  const liveBefore = await page.evaluate(() => globalThis.__murmurLive === true);
  if (path.startsWith("/v2/") && !o.noLive) await page.waitForFunction(() => globalThis.__murmurLive === true, undefined, { timeout: 60000 });
  return { ctx, page, errors, ready, liveBefore };
}
const shot = async (page, name) => { if (out) await page.screenshot({ path: join(out, `${name}.png`) }); };
const T = (page, fn, arg) => page.evaluate(fn, arg);
const dbg = (page) => T(page, () => globalThis.__bpDebug());
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Click the capture control and return the published capture. */
const capture = (page) =>
  T(page, async () => {
    globalThis.__bitPhysicsCaptureReady = false;
    document.querySelector('[data-bp="capture"]').click();
    for (let i = 0; i < 1200 && !globalThis.__bitPhysicsCaptureReady; i += 1) await new Promise((r) => setTimeout(r, 50));
    return JSON.stringify(globalThis.__bitPhysicsCapture);
  });

const sha = (page, text) =>
  T(page, async (t) => {
    const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
    return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
  }, text);

/** Pause the live loop and let in-flight frames land. */
const pause = (page) =>
  T(page, async () => {
    const a = globalThis.__murmur;
    a.clock.paused = true;
    await new Promise((r) => setTimeout(r, 200));
    await a.gpu.device.queue.onSubmittedWorkDone();
  });

/** sha256 of the live flock's whole state. */
const flockHash = (page) =>
  T(page, async () => {
    const a = globalThis.__murmur;
    const buf = await a.flock.readState();
    const d = await crypto.subtle.digest("SHA-256", buf);
    return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
  });

/** Advance the paused flock n steps, `per` steps per submit. */
const advance = (page, n, per = 32) =>
  T(page, async ([n, per]) => {
    const a = globalThis.__murmur;
    const dev = a.gpu.device;
    let done = 0;
    while (done < n) {
      const k = Math.min(per, n - done);
      const enc = dev.createCommandEncoder();
      a.flock.encodeSteps(enc, k);
      dev.queue.submit([enc.finish()]);
      done += k;
    }
    await dev.queue.onSubmittedWorkDone();
  }, [n, per]);

/** Reseed the live flock (paused) and wait for the queue. */
const reseed = (page, seed) =>
  T(page, async ([seed]) => {
    const a = globalThis.__murmur;
    await a.loadScene("dusk", { seed });
    a.clock.paused = true;
    await a.gpu.device.queue.onSubmittedWorkDone();
  }, [seed]);

/**
 * The flicker check: hold the flock still, dolly the eye slowly towards it
 * (`step` units a frame), render each frame and read Σ τ over the screen.
 * Returns the totals.
 */
const dollyTotals = (page, frames, step, look) =>
  T(page, async ([frames, step, look]) => {
    const a = globalThis.__murmur;
    const v = a.view;
    const before = { ...v.birds };
    v.birds = { ...v.birds, ...look };
    a.busy = true;
    const cam = a.camera;
    const home = cam.state();
    const totals = [];
    try {
      for (let i = 0; i < frames; i += 1) {
        await a.renderOnce();
        const t = await v.readTau();
        totals.push(t.total);
        cam.dolly(step);
      }
    } finally {
      cam.set(home);
      v.birds = before;
      a.busy = false;
    }
    return totals;
  }, [frames, step, look]);

/** Residual of a least-squares quadratic through the totals, relative; and the raw frame-to-frame change. */
function flicker(totals) {
  const n = totals.length;
  const xs = totals.map((_, i) => i / (n - 1));
  // normal equations for y = a + b x + c x²
  const S = (f) => xs.reduce((s, x, i) => s + f(x, totals[i]), 0);
  const m = [[n, S((x) => x), S((x) => x * x)], [S((x) => x), S((x) => x * x), S((x) => x ** 3)], [S((x) => x * x), S((x) => x ** 3), S((x) => x ** 4)]];
  const r = [S((_, y) => y), S((x, y) => x * y), S((x, y) => x * x * y)];
  // Gaussian elimination
  for (let i = 0; i < 3; i += 1) {
    for (let j = i + 1; j < 3; j += 1) {
      const f = m[j][i] / m[i][i];
      for (let k = i; k < 3; k += 1) m[j][k] -= f * m[i][k];
      r[j] -= f * r[i];
    }
  }
  const c = [0, 0, 0];
  for (let i = 2; i >= 0; i -= 1) c[i] = (r[i] - m[i].slice(i + 1).reduce((s, v, k) => s + v * c[i + 1 + k], 0)) / m[i][i];
  const res = totals.map((y, i) => (y - (c[0] + c[1] * xs[i] + c[2] * xs[i] ** 2)) / y);
  const rms = Math.sqrt(res.reduce((s, x) => s + x * x, 0) / n);
  const steps = totals.slice(1).map((y, i) => (y - totals[i]) / totals[i]);
  // frame-to-frame change with the smooth trend removed
  const jitter = res.slice(1).map((x, i) => x - res[i]);
  return {
    trend: (totals[n - 1] - totals[0]) / totals[0],
    residualRms: rms,
    residualMax: Math.max(...res.map(Math.abs)),
    jitterRms: Math.sqrt(jitter.reduce((s, x) => s + x * x, 0) / jitter.length),
    stepMax: Math.max(...steps.map(Math.abs)),
  };
}

// --------------------------------------------------------------------------
// 1. the capture: v1 and v2 carry the same bytes; v2 is ready before it is live
{
  const v1 = await open("/");
  const c1 = await capture(v1.page);
  const h1 = await sha(v1.page, c1);
  check("v1 page publishes its capture", c1.length > 1000 && JSON.parse(c1).steps.length === 11, `${(c1.length / 1e6).toFixed(2)} MB`);
  check("v1 page: no console errors", v1.errors.length === 0, v1.errors.slice(0, 3).join(" | "));
  await v1.ctx.close();

  const v2 = await open("/v2/", { noLive: true });
  check("v2 signals ready at the gate path, before the live view", v2.ready < 15000, `ready in ${v2.ready} ms (live then: ${v2.liveBefore})`);
  measured.timeToReadyMs = v2.ready;
  const c2 = await capture(v2.page);
  const h2 = await sha(v2.page, c2);
  check("v2 capture ≡ v1 capture, byte for byte", h1 === h2, `sha256 ${h2.slice(0, 16)}…`);
  measured.captureSha256 = h2;
  await v2.page.waitForFunction(() => globalThis.__murmurLive === true, undefined, { timeout: 60000 });
  const c3 = await capture(v2.page);
  check("a capture taken while the flock flies is the same bytes", (await sha(v2.page, c3)) === h2);
  check("v2: no console errors through two captures", v2.errors.length === 0, v2.errors.slice(0, 3).join(" | "));
  await v2.ctx.close();
}

// 2. the live view: tier size, step rate, the look
const main = await open("/v2/");
const { page } = main;
{
  const d = await dbg(page);
  check("__bpDebug reports a 3D view", d.space === "3d");
  check("the tier's bird count", d.birds === d.sizes[d.tier], `${d.tier}: ${d.birds.toLocaleString("en-US")} birds`);
  measured.tier = d.tier;
  measured.birds = d.birds;
  // the step rate, at boot and once the flock has flown a while
  const b0 = await T(page, () => globalThis.__murmur.flock.steps);
  await wait(3000);
  const b1 = await T(page, () => globalThis.__murmur.flock.steps);
  measured.bootStepsPerSecond = (b1 - b0) / 3;
  await wait(9000);
  const s0 = await T(page, () => globalThis.__murmur.flock.steps);
  await wait(3000);
  const s1 = await T(page, () => globalThis.__murmur.flock.steps);
  const rate = (s1 - s0) / 3;
  check("the flock flies at 120 steps per second (1×)", rate > 112 && rate < 128, `${rate.toFixed(1)} steps/s (the first 3 s: ${measured.bootStepsPerSecond.toFixed(1)})`);
  await shot(page, "01-dusk");
  const t = await T(page, async () => {
    const a = globalThis.__murmur;
    const tau = await a.view.readTau();
    return { tau, stats: a.stats, scale: a.governor.renderScale };
  });
  const cover = t.tau.covered / (t.tau.width * t.tau.height);
  check("the flock is drawn as a medium: a dark core", t.tau.max > 1.5, `max τ ${t.tau.max.toFixed(2)} (transmittance ${Math.exp(-t.tau.max).toFixed(3)})`);
  check("…spread over the sky", cover > 0.03, `${(cover * 100).toFixed(1)}% of the pixels carry optical depth; Σ τ ${t.tau.total.toFixed(0)}`);
  check("the governor holds full render scale on this GPU", t.scale === 1, `render scale ${t.scale}`);
  measured.tauMax = t.tau.max;
  measured.coveredFraction = cover;
  const s = t.stats;
  // order: sampled once a second over 30 s (it dips while the flock turns back at the roost's edge)
  const order = await T(page, async () => {
    const a = globalThis.__murmur;
    const out = [];
    for (let i = 0; i < 30; i += 1) {
      await new Promise((r) => setTimeout(r, 1000));
      const st = a.stats;
      if (st) out.push({ p: st.polarization, nnd: st.nnd, thick: st.thickness, axes: st.axes.map(Math.sqrt) });
    }
    return out;
  });
  const pols = order.map((o) => o.p).sort((x, y) => x - y);
  const nnds = order.map((o) => o.nnd).sort((x, y) => x - y);
  const mid = Math.floor(pols.length / 2);
  check("an ordered flock: polarization ≥ 0.9 in level flight, median ≥ 0.75 through its turns", pols[pols.length - 1] >= 0.9 && pols[mid] >= 0.75,
    `polarization ${pols[0].toFixed(2)}–${pols[pols.length - 1].toFixed(2)} over 30 s (median ${pols[mid].toFixed(2)}; ${pols.filter((p) => p >= 0.9).length} of ${pols.length} samples ≥ 0.9)`);
  check("…dense: nearest neighbour about a metre", nnds[mid] * 2 > 0.5 && nnds[mid] * 2 < 1.6, `median ${(nnds[mid] * 2).toFixed(2)} m`);
  measured.order = { polarization: [pols[0], pols[mid], pols[pols.length - 1]], above09: pols.filter((p) => p >= 0.9).length, samples: pols.length, nndMetres: [nnds[0] * 2, nnds[mid] * 2, nnds[nnds.length - 1] * 2], thicknessMetres: order.map((o) => o.thick * 2), axesMetres: order.map((o) => o.axes.map((x) => x * 2)) };
  check("Learn's observables are live", s && Number.isFinite(s.polarization) && Number.isFinite(s.nnd) && s.thickness > 0,
    s ? `polarization ${s.polarization.toFixed(3)}, nearest neighbour ${(s.nnd * 2).toFixed(2)} m, thickness ${(s.thickness * 2).toFixed(1)} m, milling ${s.milling.toFixed(2)}` : "none");
  measured.observables = s && { polarization: s.polarization, milling: s.milling, nndUnits: s.nnd, thicknessUnits: s.thickness, axesRms: s.axes.map(Math.sqrt) };
}

// 3. Prove, in the page
{
  await page.click("button[aria-label='Prove']");
  await wait(300);
  await T(page, () => globalThis.__murmurProve.runAll());
  const r = await T(page, () => JSON.parse(JSON.stringify(globalThis.__murmurProve.results)));
  check("in-page gate: run twice, identical, within budget", r.gate?.passed, r.gate ? `step 100 within ${r.gate.shortAbs.toExponential(2)} of f64 (budget 1e-2), v_max ${r.gate.vmaxObserved}` : "");
  const g = r.grid ?? [];
  check("grid ≡ brute force, byte for byte, on a flock", g[0]?.identical && g[0].meanNeighbors > 3, g[0] ? `${g[0].birds} birds × ${g[0].steps} steps, ${g[0].meanNeighbors.toFixed(2)} neighbours each` : "");
  check("grid ≡ brute force on birds packed beyond a corner of the grid", g[1]?.identical && g[1].meanNeighbors > 3, g[1] ? `${g[1].birds} birds × ${g[1].steps} steps, ${g[1].meanNeighbors.toFixed(2)} neighbours each` : "");
  check("grid ≡ brute force with the falcon flying through (the alarm spreads)", g[2]?.identical && g[2].alarmed > 50, g[2] ? `${g[2].birds} birds × ${g[2].steps} steps, ${g[2].alarmed} took fright` : "");
  check("the scatter is an exact permutation on the live flock", r.scatter?.passed, r.scatter ? `${r.scatter.birds} birds, ${r.scatter.occupiedCells} cells, fullest ${r.scatter.maxOccupancy}` : "");
  measured.prove = { gateShortAbs: r.gate?.shortAbs, grid: g, scatter: r.scatter };
  await shot(page, "02-prove");
  await page.keyboard.press("Escape");
}

// 4. determinism: a step's bytes do not depend on how steps fall into submits; same seed, same bytes
let seededHash = "";
{
  await pause(page);
  await reseed(page, 1234);
  await advance(page, 96, 32);
  const a = await flockHash(page);
  await reseed(page, 1234);
  await advance(page, 96, 1);
  const b = await flockHash(page);
  await reseed(page, 1234);
  await advance(page, 96, 7);
  const c = await flockHash(page);
  check("96 steps give the same bytes in submits of 32, 1 and 7", a === b && b === c, `sha256 ${a.slice(0, 16)}…`);
  seededHash = a;
}

// 5. the flicker risk: Σ τ over a slow dolly (the flock held still)
{
  await reseed(page, 42);
  await advance(page, 1200, 32);
  const shipped = flicker(await dollyTotals(page, 120, 0.02, {}));
  const control = flicker(await dollyTotals(page, 120, 0.02, { mode: 1, filterPx: 0.3 }));
  check("slow dolly: the screen's total optical depth moves smoothly (shipped splat)", shipped.jitterRms < 1e-4,
    `frame-to-frame jitter ${shipped.jitterRms.toExponential(2)} rms (trend ${(shipped.trend * 100).toFixed(2)}% over 120 frames, residual max ${shipped.residualMax.toExponential(2)})`);
  check("…against the control (analytic normalisation, 0.3 px filter), which flickers", control.jitterRms > 10 * shipped.jitterRms,
    `control jitter ${control.jitterRms.toExponential(2)} rms (${(control.jitterRms / Math.max(shipped.jitterRms, 1e-12)).toFixed(0)}× the shipped)`);
  measured.flicker = { frames: 120, dollyUnitsPerFrame: 0.02, shipped, control };
}

// 5b. the near-bird hand-off, over a slow dolly: a close view where birds cross 12–20 px of
// wingspan; the screen's coverage Σ(1 − e^−τ·(1 − α)) per frame, for the shipped cross-fade,
// a hard switch at 16 px, every bird a mesh, and the medium alone
{
  const runs = await T(page, async () => {
    const a = globalThis.__murmur;
    const w = (ms) => new Promise((r) => setTimeout(r, ms));
    a.clock.paused = true;
    await w(300);
    await a.gpu.device.queue.onSubmittedWorkDone();
    a.busy = true;
    const st = a.stats;
    const c = [st.centroid[0], st.centroid[1] + 40, st.centroid[2]];
    const e0 = a.camera.eye();
    const d0 = Math.hypot(c[0] - e0[0], c[1] - e0[1], c[2] - e0[2]);
    const H = a.hdr.height;
    const fov = (14 * Math.PI) / 180;
    const fpx = H / 2 / Math.tan(fov / 2);
    const dist = (0.2 * a.view.birds.scale * fpx) / 15;
    const eye = [0, 1, 2].map((k) => c[k] - ((c[k] - e0[k]) / d0) * dist);
    const dx = c[0] - eye[0], dy = c[1] - eye[1], dz = c[2] - eye[2];
    const start = { eye, yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)), fov };
    const home = a.camera.state();
    const look0 = { ...a.view.near.look };
    const run = async (patch) => {
      a.view.near.look = { ...look0, ...patch };
      a.camera.set(start);
      const tot = [];
      let meshes = 0;
      for (let i = 0; i < 120; i += 1) {
        await a.renderOnce();
        const cv = await a.view.readCoverage();
        tot.push(cv.total);
        if (i === 60) meshes = await a.view.near.readCount();
        a.camera.dolly(0.1);
      }
      return { tot, meshes };
    };
    const out = { shipped: await run({}), hard: await run({ px0: 16, px1: 16.0001 }), allMesh: await run({ px0: 0, px1: 0.0001 }), medium: await run({ px0: 1e5, px1: 1e5 + 1 }) };
    a.view.near.look = look0;
    a.camera.set(home);
    a.busy = false;
    return out;
  });
  const f = Object.fromEntries(Object.entries(runs).map(([k, v]) => [k, { ...flicker(v.tot), total0: v.tot[0], meshes: v.meshes }]));
  const share = (k) => Math.abs(f[k].total0 - f.medium.total0) / f.medium.total0;
  check("hand-off: no double coverage (meshes and the medium hide the same sky)", share("shipped") < 0.06 && share("allMesh") < 0.06,
    `coverage at the start: cross-fade ${(share("shipped") * 100).toFixed(1)}%, all meshes ${(share("allMesh") * 100).toFixed(1)}% off the medium alone (${f.shipped.meshes.toLocaleString("en-US")} birds as meshes mid-dolly)`);
  check("hand-off: the cross-fade adds no popping beyond the meshes' own", f.shipped.jitterRms <= f.allMesh.jitterRms,
    `jitter rms: cross-fade ${f.shipped.jitterRms.toExponential(2)}, hard switch ${f.hard.jitterRms.toExponential(2)}, all meshes ${f.allMesh.jitterRms.toExponential(2)}, medium alone ${f.medium.jitterRms.toExponential(2)}`);
  measured.handoff = f;
  await T(page, () => { globalThis.__murmur.clock.paused = false; });
}

// 6. tools: Look turns the head; double-click comes home; Startle; Gust and save / restore
{
  await T(page, () => { globalThis.__murmur.clock.paused = false; });
  const c0 = (await dbg(page)).camera;
  await page.mouse.move(640, 300);
  await page.mouse.down();
  await page.mouse.move(800, 260, { steps: 8 });
  await page.mouse.up();
  await wait(400);
  const c1 = (await dbg(page)).camera;
  check("Look: a drag turns the head, the eye stays put", Math.abs(c1.yaw - c0.yaw) > 0.05 && JSON.stringify(c1.eye) === JSON.stringify(c0.eye), `yaw ${c0.yaw.toFixed(3)} → ${c1.yaw.toFixed(3)}`);
  await page.mouse.dblclick(640, 300);
  await wait(1200);
  const gaze = await T(page, () => {
    const a = globalThis.__murmur;
    const c = a.stats.centroid;
    const e = a.camera.eye();
    const t = [c[0] - e[0], c[1] + 40 - e[1], c[2] - e[2]];
    const l = Math.hypot(...t);
    const f = a.camera.forward();
    return Math.acos(Math.min(1, (f[0] * t[0] + f[1] * t[1] + f[2] * t[2]) / l));
  });
  check("double-click looks back at the flock", gaze < 0.12, `${((gaze * 180) / Math.PI).toFixed(1)}° from its centre`);

  // Startle: press on the flock's centre
  await page.keyboard.press("4");
  const centre = await T(page, () => {
    const a = globalThis.__murmur;
    const c = a.stats.centroid;
    const v = a.view.view3d;
    const p = v.project([c[0], c[1], c[2]]);
    const sx = a.camera.viewW / v.width;
    return [p[0] * sx, p[1] * sx];
  });
  await page.mouse.move(centre[0], centre[1]);
  await page.mouse.down();
  await wait(600);
  await page.mouse.up();
  await wait(300);
  const alert = (await dbg(page)).stats.alertFraction;
  check("Startle: the birds there take fright, and the alarm spreads", alert > 0.01, `mean alarm ${alert.toFixed(3)}`);

  // Gust and save / restore: replay from a save point with and without the gust
  await pause(page);
  const hashes = await T(page, async () => {
    const a = globalThis.__murmur;
    const dev = a.gpu.device;
    const hash = async () => {
      const d = await crypto.subtle.digest("SHA-256", await a.flock.readState());
      return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 16);
    };
    const live = a.flock.input;
    const run = async (tool) => {
      a.flock.input = (step) => ({ step, falcon: null, tool });
      for (let i = 0; i < 4; i += 1) {
        const enc = dev.createCommandEncoder();
        a.flock.encodeSteps(enc, 30);
        dev.queue.submit([enc.finish()]);
      }
      a.flock.input = live;
      await dev.queue.onSubmittedWorkDone();
      return hash();
    };
    a.savePoint();
    const c = a.stats.centroid;
    const gust = await run({ code: 4, position: [c[0], c[1], c[2]], direction: [0, 0, 1], radius: 24, strength: 6 });
    a.restoreSave();
    const calm = await run({ code: 0, position: [0, 0, 0], direction: [0, 1, 0], radius: 18, strength: 3.2 });
    a.restoreSave();
    const calm2 = await run({ code: 0, position: [0, 0, 0], direction: [0, 1, 0], radius: 18, strength: 3.2 });
    return { gust, calm, calm2 };
  });
  check("a gust changes the flock", hashes.gust !== hashes.calm);
  check("restore replays byte for byte", hashes.calm === hashes.calm2, hashes.calm);
  await page.keyboard.press("1");
  await T(page, () => { globalThis.__murmur.clock.paused = false; });
}

// 7. Tune: alignment (the model) and the sun (the picture), on the link, back after a reload
{
  await page.click(".bp-tool-tune");
  await wait(300);
  const setSlider = (name, value) =>
    page.evaluate(([name, value]) => {
      const s = [...document.querySelectorAll(".bp-slider input[type=range]")].find((x) => x.closest(".bp-slider")?.textContent?.includes(name));
      s.value = String(value);
      s.dispatchEvent(new Event("input", { bubbles: true }));
    }, [name, value]);
  await setSlider("Alignment", 0.6);
  await setSlider("Sun", -7);
  await wait(1200);
  const d = await dbg(page);
  check("Tune: alignment changes the model at the next step", Math.abs(d.model.align - 0.6) < 1e-9, `alignment ${d.model.align}`);
  await shot(page, "03-loose-late-sun");
  const href = await T(page, () => location.href);
  check("the link carries the alignment and the sun", /al=0\.6/.test(href) && /sun=-7/.test(href), href.slice(href.indexOf("?")));
  const again = await open(href.slice(origin.length));
  const d2 = await dbg(again.page);
  check("a reload of the link restores them", Math.abs(d2.model.align - 0.6) < 1e-9 && Math.abs(d2.dusk.sunElevation + 7) < 1e-9);
  check("reload: no console errors", again.errors.length === 0, again.errors.slice(0, 3).join(" | "));
  await again.ctx.close();
  await page.keyboard.press("Escape");
}

// 7b. the falcon hunts (F); the alarm spreads and its speed is measured
{
  await page.keyboard.press("f");
  await wait(500);
  const mode0 = (await dbg(page)).falcon.mode;
  const wave = await T(page, async () => {
    const a = globalThis.__murmur;
    for (let i = 0; i < 300 && !a.wave; i += 1) await new Promise((r) => setTimeout(r, 100));
    return a.wave && { speed: a.wave.speed, alarmed: a.wave.alarmed, direct: a.wave.direct, duration: a.wave.duration };
  });
  await shot(page, "04-falcon");
  check("F flies the falcon (it hunts by itself until you steer)", mode0 === "pursuit", `mode ${mode0}`);
  check("the alarm wave is measured", wave && Number.isFinite(wave.speed) && wave.alarmed > 1000 && wave.direct > 0,
    wave ? `${wave.alarmed.toLocaleString("en-US")} birds (${wave.direct} saw the falcon), median ${(wave.speed * 2).toFixed(1)} m/s bird to bird` : "no wave in 30 s");
  measured.falconWave = wave;
  // a held pointer stoops the falcon (as Shift does), released it flies level
  await page.mouse.move(640, 260);
  await page.mouse.down();
  await wait(300);
  const stooping = await T(page, () => globalThis.__murmur.falcon.input.stoop);
  await page.mouse.up();
  await wait(300);
  const level = await T(page, () => globalThis.__murmur.falcon.input.stoop);
  check("holding the pointer stoops the falcon", stooping === true && level === false, `held ${stooping}, released ${level}`);
  // a key held while the falcon is put away, released after, leaves nothing latched
  await page.keyboard.down("a");
  await wait(100);
  const turning = await T(page, () => globalThis.__murmur.keys.yaw);
  await page.keyboard.press("1");
  await page.keyboard.up("a");
  await wait(100);
  const after = await T(page, () => globalThis.__murmur.keys);
  check("no falcon key stays latched after leaving the tool", turning === -1 && after.yaw === 0 && after.pitch === 0 && !after.stoop, `A held: yaw ${turning}; after: ${JSON.stringify(after)}`);
  await page.keyboard.press("2");
  await wait(300);
  await page.keyboard.press("f");
  await wait(300);
  check("F again lands it", (await dbg(page)).falcon.mode === "off");
}

// 7c. The Attack: from a seeded, warmed state; a restart replays it byte for byte
{
  const at = await open("/v2/?s=attack");
  const r = await T(at.page, async () => {
    const a = globalThis.__murmur;
    const dev = a.gpu.device;
    const hash = async () => {
      const d = await crypto.subtle.digest("SHA-256", await a.flock.readState());
      return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 16);
    };
    const go = async () => {
      a.clock.paused = true;
      await a.loadScene("attack");
      for (let i = 0; i < 25; i += 1) {
        const enc = dev.createCommandEncoder();
        a.flock.encodeSteps(enc, 24);
        dev.queue.submit([enc.finish()]);
      }
      await dev.queue.onSubmittedWorkDone();
      return hash();
    };
    const h1 = await go();
    await a.measureWaveNow();
    const w = a.wave && { speed: a.wave.speed, alarmed: a.wave.alarmed, direct: a.wave.direct, duration: a.wave.duration };
    const h2 = await go();
    a.clock.paused = false;
    return { h1, h2, w, scene: a.scene.id };
  });
  await wait(2500);
  await shot(at.page, "05-attack");
  check("The Attack replays byte for byte from its seeded, warmed state", r.h1 === r.h2, `600 steps after the warm-up: sha256 ${r.h1}…`);
  check("…and its wave is measured", r.w && Number.isFinite(r.w.speed) && r.w.alarmed > 1000,
    r.w ? `${r.w.alarmed.toLocaleString("en-US")} birds in ${r.w.duration.toFixed(2)} s (${r.w.direct} saw the falcon), median ${(r.w.speed * 2).toFixed(1)} m/s bird to bird` : "none");
  measured.attackWave = r.w;
  check("The Attack: no console errors", at.errors.length === 0, at.errors.slice(0, 3).join(" | "));
  await at.ctx.close();
}

// 8. the same seed across page loads
{
  const other = await open("/v2/");
  await pause(other.page);
  await reseed(other.page, 1234);
  await advance(other.page, 96, 32);
  check("the same seed gives the same bytes in a fresh page", (await flockHash(other.page)) === seededHash);
  await other.ctx.close();
}

// 9. reduced motion; the rail at 1280×720
{
  const rm = await open("/v2/", { reducedMotion: "reduce" });
  const d = await dbg(rm.page);
  const speed = await T(rm.page, () => globalThis.__murmur.clock.speed);
  const follow = await T(rm.page, () => globalThis.__murmur.camera.reducedMotion);
  check("reduced motion: half speed, a still camera that holds the whole roost", speed === 0.5 && follow && d.camera.fov > 1.05, `speed ${speed}, fov ${(d.camera.fov * 57.3).toFixed(0)}°`);
  const tools = await T(rm.page, () => document.querySelectorAll(".bp-rail-tools .bp-tool").length);
  check("at most six tools at 1280×720", tools > 0 && tools <= 6, `${tools} tools`);
  await rm.ctx.close();
}

check("no console errors on the main page", main.errors.length === 0, main.errors.slice(0, 3).join(" | "));
await main.ctx.close();

// 10. bench
{
  const b = await open("/v2/?bench=1");
  await b.page.waitForFunction(() => globalThis.__bpBench, undefined, { timeout: 60000 });
  const r = await T(b.page, () => globalThis.__bpBench);
  console.log(`BP_BENCH ${JSON.stringify(r)}`);
  measured.bench = r;
  await b.ctx.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (out) await writeFile(join(out, "acceptance.json"), JSON.stringify({ results, measured }, null, 2));
await browser.close();
server.close();
process.exit(failed.length ? 1 : 0);
