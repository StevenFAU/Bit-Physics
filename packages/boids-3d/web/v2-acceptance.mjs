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
// the clock's step rate; the in-page gate, grid ≡ brute force byte for byte
// (a flock and birds packed beyond a corner of the grid) and the scatter as an
// exact permutation on the live flock; a step's bytes do not depend on how
// steps fall into submits; the same seed gives the same bytes across page
// loads; the flock is drawn as a medium (a dark core, lace at the edges) from
// the ground; the spec's flicker risk — the screen's total optical depth over
// a slow dolly, against the analytic-normalisation control; Look turns the
// head and leaves the eye where it is, double-click comes home; Startle
// raises the alarm; a gust changes the flock and save / restore replays it
// byte for byte; Tune's flock and sun on the link and back after a reload;
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
const reseed = (page, seed, preset = "starling") =>
  T(page, async ([seed, preset]) => {
    const a = globalThis.__murmur;
    await a.loadScene("dusk", { preset, seed });
    a.clock.paused = true;
    await a.gpu.device.queue.onSubmittedWorkDone();
  }, [seed, preset]);

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
  // v1's seed packs the flock into a small ellipsoid, where every bird has thousands of
  // candidates; the step rate is measured once it has spread over the roost
  const b0 = await T(page, () => globalThis.__murmur.flock.steps);
  await wait(3000);
  const b1 = await T(page, () => globalThis.__murmur.flock.steps);
  measured.bootStepsPerSecond = (b1 - b0) / 3;
  await wait(9000);
  const s0 = await T(page, () => globalThis.__murmur.flock.steps);
  await wait(3000);
  const s1 = await T(page, () => globalThis.__murmur.flock.steps);
  const rate = (s1 - s0) / 3;
  check("the flock flies at 120 steps per second (1×) once it has spread", rate > 112 && rate < 128, `${rate.toFixed(1)} steps/s (first 3 s, the packed seed: ${measured.bootStepsPerSecond.toFixed(1)})`);
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
  await wait(800);
  const c2 = (await dbg(page)).camera;
  check("double-click looks back home", Math.abs(c2.yaw) < 0.03, `yaw ${c2.yaw.toFixed(3)}`);

  // Startle: press on the flock's centre
  await page.keyboard.press("3");
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
    const run = async (tool) => {
      a.flock.tool = tool;
      for (let i = 0; i < 4; i += 1) {
        const enc = dev.createCommandEncoder();
        a.flock.encodeSteps(enc, 30);
        dev.queue.submit([enc.finish()]);
      }
      a.flock.tool = { code: 0, position: [0, 0, 0], direction: [0, 1, 0], radius: 18, strength: 3.2 };
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

// 7. Tune: the flock's character and the sun, on the link, back after a reload
{
  await page.click(".bp-tool-tune");
  await wait(300);
  await page.selectOption("#mm-flock-select", "ribbon");
  await wait(800);
  const d = await dbg(page);
  check("Tune: a new flock character reseeds", d.flock === "ribbon" && d.steps < 400, `flock ${d.flock}, step ${d.steps}`);
  await T(page, () => globalThis.__murmur.view.dusk.sunElevation);
  await page.evaluate(() => {
    const s = [...document.querySelectorAll(".bp-slider input[type=range]")].find((x) => x.closest(".bp-slider")?.textContent?.includes("Sun"));
    s.value = "-7";
    s.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await wait(1200);
  await shot(page, "03-ribbon-late-sun");
  const href = await T(page, () => location.href);
  check("the link carries the flock and the sun", /f=ribbon/.test(href) && /sun=-7/.test(href), href.slice(href.indexOf("?")));
  const again = await open(href.slice(origin.length));
  const d2 = await dbg(again.page);
  check("a reload of the link restores them", d2.flock === "ribbon" && Math.abs(d2.dusk.sunElevation + 7) < 1e-9);
  check("reload: no console errors", again.errors.length === 0, again.errors.slice(0, 3).join(" | "));
  await again.ctx.close();
  await page.keyboard.press("Escape");
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
