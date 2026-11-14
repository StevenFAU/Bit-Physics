// Chaos v2 — acceptance checks in a real WebGPU browser
// (docs/planning/rebuild-v2/05-strange-attractors.md, M0).
//
//   npm run build   (in this directory)
//   CHROME_BIN=/snap/bin/chromium \
//   PLAYWRIGHT_MODULE=<repo>/tools/productization/web-deploy/web/headless/node_modules/playwright/index.js \
//   node v2-acceptance.mjs [out-dir]
//
// M0 checks: the v1 page's capture and the v2 page's are byte-identical; v2
// signals ready at the gate path, then goes live; the tier's ball and density
// sizes; the clock's step rate; the first ball released automatically, ε wide;
// predictability lost in a sane window, and a finer ball (10⁻⁹, 10⁻¹²) loses
// it later — which absolute f32 coordinates could not resolve; the in-page
// gate, the live kernel ≡ the gated one byte for byte, the offsets against
// f64; a click on the attractor releases a ball on it, a click off it does
// not; the Ghost pair; the orbit camera by drag, wheel and double-click;
// precision by keyboard; Tune's ρ as an undoable edit (undo by replay) that
// rides the share link; save / restore / compare; the same seed gives the
// same bytes across page loads; the fixed points through the GPU cull;
// Environment's sky and ground in the browser; reduced motion; at most six
// tools at 1280×720; no console errors.
// M1: Prove's Lyapunov cards (λ₁ against Sprott, λ₂ = 0, the spectrum's sum
// against the exact trace) and the invariant-measure card, each inside its
// declared budget; Buy More Digits (the first ball at three digits, the live
// horizon equal to the off-loop measurement, "Buy a digit", "Measure 3–15"
// drawing a line whose slope gives λ₁ near the f64 value, the link, reduced
// motion); the live λ₁ instrument in Learn; the ball's captions never two at
// once. Prints a BP_BENCH line at the end.

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
  if (path.startsWith("/v2/") && !o.noLive) await page.waitForFunction(() => globalThis.__chaosLive === true, undefined, { timeout: 60000 });
  return { ctx, page, errors, ready };
}
const shot = async (page, name) => { if (out) await page.screenshot({ path: join(out, `${name}.png`) }); };
const T = (page, fn, arg) => page.evaluate(fn, arg);
const dbg = (page) => T(page, () => globalThis.__bpDebug());

/** Click the capture control and return the published capture as JSON text. */
const capture = (page) =>
  T(page, async () => {
    globalThis.__bitPhysicsCaptureReady = false;
    document.querySelector('[data-bp="capture"]').click();
    for (let i = 0; i < 600 && !globalThis.__bitPhysicsCaptureReady; i += 1) await new Promise((r) => setTimeout(r, 50));
    return JSON.stringify(globalThis.__bitPhysicsCapture);
  });

const sha = (page, text) =>
  T(page, async (t) => {
    const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
    return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
  }, text);

/** sha256 of the ball's member offsets (all of them). */
const ballHash = (page) =>
  T(page, async () => {
    const a = globalThis.__chaos;
    const f = await a.chaos.readEnsemble();
    const d = await crypto.subtle.digest("SHA-256", f.buffer);
    return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
  });

// --- the v1 page: its capture ---------------------------------------------------
let v1Capture = "";
{
  const { ctx, page, errors } = await open("/");
  v1Capture = await capture(page);
  check("v1 page boots on WebGPU and exports its capture", v1Capture.length > 1000, `${v1Capture.length} bytes`);
  check("no console errors (v1 page)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- boot, the gate, the first ball ---------------------------------------------------
let bench = null;
{
  const { ctx, page, errors, ready } = await open("/v2/");
  const boot = await T(page, () => globalThis.__chaosBoot);
  check("v2 signals ready at the gate path, before the live view compiles", boot.ready <= boot.compiled && boot.ready <= boot.live, `ready ${boot.ready} ms, compiled ${boot.compiled} ms, live ${boot.live} ms (driver saw ready at ${ready} ms)`);
  const v2Capture = await capture(page);
  check("release-gate capture is byte-identical on the v1 and v2 pages", v2Capture === v1Capture && v2Capture.length > 1000, `sha256 ${(await sha(page, v2Capture)).slice(0, 16)}…`);
  const tools = await T(page, () => document.querySelectorAll(".bp-rail-tools .bp-tool").length);
  check("at most six tools at 1280×720", tools <= 6 && tools >= 1, `${tools} tools`);
  const cap = await T(page, () => {
    const b = document.querySelector('[data-bp="capture"]');
    return b instanceof HTMLButtonElement && !b.disabled && getComputedStyle(b).display !== "none";
  });
  check("the capture control is a live button in the boot state", cap);

  await page.waitForTimeout(1200);
  const d0 = await dbg(page);
  const want = { T3: [1 << 20, 1 << 19], T2: [1 << 18, 1 << 17], T1: [1 << 16, 1 << 16] }[d0.tier];
  check(`the tier's sizes (${d0.tier})`, d0.members === want[0] && d0.density === want[1], `${d0.members.toLocaleString()} ball members, ${d0.density.toLocaleString()} attractor points, adapter ${d0.adapter}`);
  check("boots into The Butterfly with Lorenz's own parameters", d0.scene === "butterfly" && d0.classic, JSON.stringify(d0.params));
  await shot(page, "01-attractor");
  await page.waitForFunction(() => globalThis.__bpDebug().released, undefined, { timeout: 10000 });
  const t0 = Date.now();
  const s0 = (await dbg(page)).steps;
  await page.waitForTimeout(2000);
  const d1 = await dbg(page);
  const rate = (d1.steps - s0) / ((Date.now() - t0) / 1000);
  check("the first ball is released by itself, 10⁻⁶ wide", d1.released && d1.eps === 1e-6, `eps ${d1.eps}`);
  check("the clock runs 240 steps a second at 1× (±10%)", Math.abs(rate / 240 - 1) < 0.1, `${rate.toFixed(0)} steps/s`);
  await shot(page, "02-ball");
  await page.waitForFunction(() => globalThis.__bpDebug().horizonT !== null, undefined, { timeout: 30000 });
  const d2 = await dbg(page);
  check("predictability is lost, in a sane window (t 8–30 for 10⁻⁶)", d2.horizonT > 8 && d2.horizonT < 30, `t = ${d2.horizonT.toFixed(2)}; attractor RMS size ${d2.attractorRms.toFixed(2)}`);
  await page.waitForTimeout(2500);
  await shot(page, "03-forgotten");

  // the horizon against precision, from one release point (holds the live loop)
  const hz = await T(page, async () => {
    const a = globalThis.__chaos;
    const p = [...a.releasePoint];
    const out = {};
    for (const d of [3, 6, 9, 12]) out[d] = (await a.measureHorizon(d, p, 80)).horizon;
    return out;
  });
  const ok = hz[3] !== null && hz[6] !== null && hz[9] !== null && hz[12] !== null && hz[3] < hz[6] && hz[6] < hz[9] && hz[9] < hz[12];
  const slopes = [hz[6] - hz[3], hz[9] - hz[6], hz[12] - hz[9]].map((x) => x / 3);
  check(
    "a finer ball loses predictability later: 10⁻³ < 10⁻⁶ < 10⁻⁹ < 10⁻¹²",
    ok,
    `t = ${[3, 6, 9, 12].map((d) => `${hz[d]?.toFixed(2)} (${d} digits)`).join(", ")}`,
  );
  check(
    "each digit buys a bounded amount of future (0.8–5 time units per digit; ln 10 / λ₁ ≈ 2.5)",
    ok && slopes.every((s) => s > 0.8 && s < 5),
    slopes.map((s) => s.toFixed(2)).join(", "),
  );

  // Prove, as the drawer runs it
  const prove = await T(page, async () => {
    const P = globalThis.__chaosProve;
    await P.runAll();
    return P.results;
  });
  check("in-page release gate: run twice identical, inside the f64 envelope", prove.gate?.passed, `${(prove.gate?.worstRatio * 100).toFixed(1)}% of the margin used, ${prove.gate?.points} states`);
  check("the live density kernel ≡ the gated kernel, byte for byte (10,000 steps)", prove.live?.identical, `${prove.live?.compared} sampled states${prove.live?.firstMismatch !== null ? `, first difference at ${prove.live?.firstMismatch}` : ""}`);
  check(
    "a 10⁻⁹ ball's f32 offsets track f64 (relative error < 10⁻³ after 10 time units)",
    prove.offsets && prove.offsets.worstRel < 1e-3 && prove.offsets.growth > 10,
    prove.offsets ? `worst ${prove.offsets.worstRel.toExponential(2)}, median ${prove.offsets.medianRel.toExponential(2)}; the ball grew ${prove.offsets.growth.toExponential(1)}×` : "no result",
  );
  const lb = { l1Abs: 0.008, l2Abs: 0.0015, sumRel: 1.5e-5, invariantTv: 0.02 }; // proof/budgets.ts (≡ tolerance.toml, unit-tested)
  const ly = prove.lyapunov;
  check("Prove: λ₁ (Benettin, f64, 4,000 time units) within its budget of Sprott's 0.9056", ly && ly.l1Err <= lb.l1Abs, ly ? `λ = ${ly.estimate.lambdas.map((v) => v.toFixed(5)).join(", ")}; off by ${ly.l1Err.toFixed(5)} (budget ${lb.l1Abs}); ${ly.ms.toFixed(0)} ms` : "no result");
  check("Prove: λ₂ is zero within its budget", ly && ly.l2Abs <= lb.l2Abs, ly ? `|λ₂| ${ly.l2Abs.toExponential(2)} (budget ${lb.l2Abs})` : "");
  check("Prove: the spectrum sums to −(σ + 1 + β) = −41/3 within its budget", ly && ly.sumRel <= lb.sumRel, ly ? `relative ${ly.sumRel.toExponential(3)} (budget ${lb.sumRel}); Kaplan–Yorke ${ly.ky.toFixed(4)}` : "");
  const im = prove.invariant;
  check("Prove: the forgotten cloud's histogram matches a long f64 run (total variation)", im && im.tv <= lb.invariantTv, im ? `TV ${im.tv.toFixed(4)} (budget ${lb.invariantTv}; two f64 runs ${im.floor.toFixed(4)}), outside ${im.outside}` : "no result");
  await T(page, () => document.querySelector('.bp-top-actions [aria-label="Prove"]').click());
  await page.waitForTimeout(300);
  await shot(page, "04-prove");
  await T(page, () => document.querySelector(".bp-drawer .bp-icon-btn[aria-label='Close panel']").click());

  // the fixed points through the GPU cull
  const counts = await T(page, async () => globalThis.__chaos.view.readMarkerCounts(globalThis.__chaos.gpu.device));
  check("Instances: the three fixed points pass the GPU frustum cull", counts.reduce((a, b) => a + b, 0) === 3, `per level ${counts.join(" / ")}`);

  // click on the attractor → a ball there; click on empty sky → no ball
  const pick = await T(page, async () => {
    const a = globalThis.__chaos;
    a.clock.paused = true;
    await new Promise((r) => setTimeout(r, 200));
    const p = [...a.releasePoint];
    const sp = a.screenOf(p);
    return { sp, events: a.eventCount };
  });
  await page.mouse.click(pick.sp[0], pick.sp[1]);
  await page.waitForTimeout(300);
  const afterClick = await T(page, () => {
    const a = globalThis.__chaos;
    const c = a.chaos.ref.x;
    const p = a.releasePoint;
    return { events: a.eventCount, released: a.chaos.released, onRef: Math.hypot(c[0] - p[0], c[1] - p[1], c[2] - p[2]), steps: a.chaos.steps, releaseStep: a.chaos.releaseStep };
  });
  check("a click on the attractor releases a ball there", afterClick.events === pick.events + 1 && afterClick.releaseStep === afterClick.steps, `${afterClick.events - pick.events} new release`);
  await page.mouse.click(1180, 160);
  await page.waitForTimeout(300);
  const toast = await T(page, () => document.querySelector(".bp-toast")?.textContent ?? "");
  const afterSky = await T(page, () => globalThis.__chaos.eventCount);
  check("a click on empty sky releases nothing and says why", afterSky === afterClick.events && /attractor/.test(toast), toast);

  // Ghost
  await T(page, () => globalThis.__chaos.studio.rail.select("ghost"));
  const gp = await T(page, () => globalThis.__chaos.screenOf(globalThis.__chaos.releasePoint));
  await page.mouse.click(gp[0], gp[1]);
  await T(page, () => { globalThis.__chaos.clock.paused = false; });
  await page.waitForTimeout(400);
  const g0 = await T(page, () => globalThis.__chaos.ghostSeparation);
  await page.waitForTimeout(4000);
  const g1 = await T(page, () => globalThis.__chaos.ghostSeparation);
  check("Ghost: two paths start 10⁻⁶ apart and separate", g0 !== null && g0 < 1e-3 && g1 > g0 * 10, `${g0?.toExponential(2)} → ${g1?.toExponential(2)}`);
  await shot(page, "05-ghost");
  await T(page, () => globalThis.__chaos.studio.rail.select("release"));

  // the orbit camera
  const c0 = await T(page, () => ({ yaw: globalThis.__chaos.camera.state().yaw, d: globalThis.__chaos.camera.state().distance }));
  await page.mouse.move(640, 400);
  await page.mouse.down();
  await page.mouse.move(760, 380, { steps: 8 });
  await page.mouse.up();
  await page.mouse.wheel(0, -400);
  await page.waitForTimeout(400);
  const c1 = await T(page, () => ({ yaw: globalThis.__chaos.camera.state().yaw, d: globalThis.__chaos.camera.state().distance, events: globalThis.__chaos.eventCount }));
  check("a drag orbits and the wheel dollies (and neither releases a ball)", Math.abs(c1.yaw - c0.yaw) > 0.3 && c1.d < c0.d * 0.9 && c1.events === afterSky, `yaw ${c0.yaw.toFixed(2)} → ${c1.yaw.toFixed(2)}, distance ${c0.d.toFixed(2)} → ${c1.d.toFixed(2)}`);
  await page.mouse.dblclick(640, 400);
  await page.waitForTimeout(1200);
  const c2 = await T(page, () => globalThis.__chaos.camera.state().distance);
  check("double-click returns to the home view", Math.abs(c2 - c0.d) / c0.d < 0.05, `distance ${c2.toFixed(2)}`);

  // precision by keyboard
  await page.keyboard.press("]");
  await page.keyboard.press("]");
  const dg = await T(page, () => globalThis.__chaos.digits);
  check("] raises the next ball's precision", dg === 8, `${dg} digits`);
  await page.keyboard.press("B");
  await page.waitForTimeout(200);
  check("the next ball uses it", (await dbg(page)).eps === 1e-8, `${(await dbg(page)).eps}`);
  await page.waitForTimeout(400); // the link is written 250 ms after the last change
  check("precision rides the share link", (await T(page, () => location.search)).includes("d=8"), await T(page, () => location.search));

  // Tune ρ: an undoable edit at a step boundary, on the link, outside the gated regime
  const rho = await T(page, async () => {
    const a = globalThis.__chaos;
    const before = { ...a.chaos.params };
    a.setParams({ ...before, rho: 35 });
    await new Promise((r) => setTimeout(r, 600));
    const mid = { ...a.chaos.params, search: location.search, lyapRho: a.lyap.params.rho };
    await a.undo();
    await new Promise((r) => setTimeout(r, 300));
    return { before, mid, after: { ...a.chaos.params }, lyapRho: a.lyap.params.rho };
  });
  check("Tune's ρ lands as an edit and rides the link", rho.mid.rho === 35 && rho.mid.search.includes("rho=35"), rho.mid.search);
  check("undo replays to the same moment without it (ρ back to 28)", rho.after.rho === 28, JSON.stringify(rho.after));
  check("λ restarts with the parameters an undo brings back", rho.mid.lyapRho === 35 && rho.lyapRho === 28, `estimator ρ ${rho.mid.lyapRho} → ${rho.lyapRho}`);
  const rs = await T(page, async () => {
    const a = globalThis.__chaos;
    a.savePoint();
    a.setParams({ ...a.chaos.params, rho: 40 });
    await new Promise((r) => setTimeout(r, 500));
    const mid = a.lyap.params.rho;
    a.restoreSave();
    await new Promise((r) => setTimeout(r, 200));
    return { mid, rho: a.chaos.params.rho, lyapRho: a.lyap.params.rho };
  });
  check("…and with those a save point brings back", rs.mid === 40 && rs.rho === 28 && rs.lyapRho === 28, `estimator ρ ${rs.mid} → ${rs.lyapRho}, system ρ ${rs.rho}`);

  // save / restore / compare
  const hist = await T(page, async () => {
    const a = globalThis.__chaos;
    a.savePoint();
    const saved = a.chaos.steps;
    await new Promise((r) => setTimeout(r, 1500));
    const later = a.chaos.steps;
    a.toggleCompare();
    await new Promise((r) => setTimeout(r, 300));
    const comparing = document.querySelector('.bp-transport [aria-label="Compare A/B"]').getAttribute("aria-pressed");
    a.toggleCompare();
    a.restoreSave();
    return { saved, later, restored: a.chaos.steps, comparing };
  });
  check("save point, compare, restore", hist.later > hist.saved && hist.restored === hist.saved && hist.comparing === "true", `saved at ${hist.saved}, ran to ${hist.later}, restored to ${hist.restored}`);

  // F3 Environment: sky + ground in the browser (then back to the studio)
  const env = await T(page, async () => {
    const a = globalThis.__chaos;
    const prev = a.view.env.look;
    a.view.env.look = { mode: "sky", zenith: [0.12, 0.26, 0.62], horizon: [0.62, 0.72, 0.85], nadir: [0.22, 0.22, 0.24], glow: 0, glowRadius: 0.5, sunDir: [0.35, 0.6, 0.45], sunColor: [40, 36, 30], sunSize: 0.99985, halo: 0.6, ground: { height: -1.1, color: [0.32, 0.31, 0.29], grid: 0.25, fade: 30, shadow: 0.8 } };
    a.view.env.setCasters(new Float32Array([0, -0.8, 0, 0.3]));
    a.camera.set({ yaw: 0.3, pitch: 0.25, distance: 3, target: [0, 0, 0] });
    await new Promise((r) => setTimeout(r, 1200));
    return { prev };
  });
  await shot(page, "06-f3-sky-ground");
  const px = await page.screenshot({ clip: { x: 640, y: 70, width: 1, height: 1 } });
  await T(page, (prev) => { globalThis.__chaos.view.env.look = prev; globalThis.__chaos.camera.fit(); }, env.prev);
  check("Environment's sky and ground render (no GPU errors; screenshot 06)", errors.length === 0, `${px.length} bytes sampled`);

  // bench
  await T(page, () => { globalThis.__chaos.clock.paused = false; });
  bench = await T(page, async () => {
    const a = globalThis.__chaos;
    const w = (ms) => new Promise((r) => setTimeout(r, ms));
    await w(1500);
    const f0 = performance.now();
    let frames = 0;
    let stop = false;
    const loop = () => { frames += 1; if (!stop) requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    const s0 = a.stepsTotal;
    await w(5000);
    stop = true;
    const sec = (performance.now() - f0) / 1000;
    return { fps: a.fps, rafPerSecond: frames / sec, stepsPerSecond: (a.stepsTotal - s0) / sec, members: a.chaos.ensemble.n, density: a.chaos.density.n, gpuMs: a.profiler?.frameAvg ?? null, passes: a.profiler?.timings().map((p) => ({ name: p.name, ms: +p.avg.toFixed(3) })) ?? [] };
  });
  check("60 fps at the tier's sizes (headless, this GPU)", bench.fps > 55, `${bench.fps.toFixed(1)} fps, GPU ${bench.gpuMs?.toFixed(2)} ms/frame`);
  check("no console errors (v2 page)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- M1: the ball's captions take turns --------------------------------------------------
{
  const { ctx, page, errors } = await open("/v2/?sp=2");
  const seen = await T(page, async () => {
    const out = { maxShown: 0, texts: new Set(), samples: 0 };
    const t0 = performance.now();
    while (performance.now() - t0 < 14000) {
      const shown = [...document.querySelectorAll(".bp-callout")].filter((el) => Number(getComputedStyle(el).opacity) > 0.08);
      out.maxShown = Math.max(out.maxShown, shown.length);
      for (const el of shown) out.texts.add(el.textContent);
      out.samples += 1;
      await new Promise((r) => setTimeout(r, 40));
    }
    return { maxShown: out.maxShown, texts: [...out.texts], samples: out.samples };
  });
  check("the ball's captions take turns: never two visible at once", seen.maxShown <= 1 && seen.texts.length >= 3, `${seen.texts.length} captions seen (${seen.texts.join(" · ")}); at most ${seen.maxShown} at a time over ${seen.samples} samples`);
  check("no console errors (captions)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- M1: Buy More Digits ----------------------------------------------------------------
{
  const { ctx, page, errors } = await open("/v2/?s=digits");
  const d0 = await dbg(page);
  check("Buy More Digits boots at 4× with its panel", d0.scene === "digits" && (await T(page, () => globalThis.__chaos.clock.speed)) === 4 && (await T(page, () => !document.querySelector(".cx-digits").hidden)), `speed ${await T(page, () => globalThis.__chaos.clock.speed)}`);
  await page.waitForFunction(() => globalThis.__bpDebug().horizonT !== null, undefined, { timeout: 30000 });
  const first = await T(page, () => ({ d: globalThis.__chaos.ballDigits, h: globalThis.__chaos.horizonT, pts: globalThis.__chaosDigits.points() }));
  check("the first ball is three digits wide and its horizon lands on the plot", first.d === 3 && first.pts.length === 1 && first.pts[0].digits === 3, `t = ${first.h.toFixed(3)}`);
  const off3 = await T(page, async () => (await globalThis.__chaos.measureHorizon(3, globalThis.__chaos.releasePoint, 80)).horizon);
  check("the live horizon equals the off-loop measurement (spread sampled every 0.1 time units either way)", Math.abs(off3 - first.h) < 0.05, `live ${first.h.toFixed(3)}, measured ${off3.toFixed(3)}`);
  await page.click('[data-cx="buy"]');
  await page.waitForTimeout(300);
  await page.waitForFunction(() => globalThis.__chaos.ballDigits === 4 && globalThis.__bpDebug().horizonT !== null, undefined, { timeout: 30000 });
  const two = await T(page, () => globalThis.__chaosDigits.points());
  check("Buy a digit: a ball 10⁻⁴ wide, and a second point, later", two.length === 2 && two[1].digits === 4 && two[1].horizon > two[0].horizon, two.map((p) => `${p.digits}: ${p.horizon.toFixed(2)}`).join(", "));
  const un = await T(page, async () => {
    const a = globalThis.__chaos;
    await a.undo();
    await new Promise((r) => setTimeout(r, 200));
    return { d: a.ballDigits, eps: a.chaos.eps, h: a.horizonT, status: document.querySelector(".cx-digits-status").textContent };
  });
  check("undoing a purchase brings back the three-digit ball, its precision and its horizon", un.d === 3 && un.eps === 1e-3 && Math.abs(un.h - off3) < 1e-9 && un.status.includes("10⁻³"), `${un.d} digits, ε ${un.eps}, horizon ${un.h?.toFixed(3)}; panel: ${un.status}`);
  await page.click('[data-cx="measure"]');
  await page.waitForFunction(() => !document.querySelector('[data-cx="measure"]').disabled && globalThis.__chaosDigits.points().length >= 13, undefined, { timeout: 180000 });
  const line = await T(page, () => {
    const D = globalThis.__chaosDigits;
    const est = globalThis.__chaos.lyap.estimate();
    return { pts: D.points(), fit: D.fit(), l1: est.lambdas[0], t: est.t };
  });
  const implied = Math.LN10 / line.fit.slope;
  check(
    "Measure 3–15: thirteen precisions on a line (r² > 0.95), later for every three digits",
    line.pts.length === 13 && line.fit.r2 > 0.95 && line.pts.every((p, i) => i < 3 || p.horizon > line.pts[i - 3].horizon),
    line.pts.map((p) => `${p.digits}:${p.horizon.toFixed(1)}`).join(" "),
  );
  check(
    "the line's slope gives λ₁ within 15% of Sprott's 0.9056 (Prove's f64 Benettin run: 0.908)",
    Math.abs(implied / 0.9056 - 1) < 0.15,
    `slope ${line.fit.slope.toFixed(3)} per digit → λ₁ ≈ ${implied.toFixed(3)} (${((implied / 0.9056 - 1) * 100).toFixed(1)}%); ln 10 / 0.9056 = ${(Math.LN10 / 0.9056).toFixed(3)}; the live estimate had averaged ${Math.round(line.t)} time units: ${line.l1.toFixed(3)}`,
  );
  await shot(page, "08-digits");
  check("the scene rides the link (its own speed is not written)", (await T(page, () => location.search)).includes("s=digits") && !(await T(page, () => location.search)).includes("sp="), await T(page, () => location.search));

  // the live λ₁ instrument
  await T(page, () => document.querySelector('.bp-top-actions [aria-label="Learn"]').click());
  await page.waitForTimeout(1500);
  const li = await T(page, () => {
    const e = globalThis.__chaos.lyap.estimate();
    const txt = document.querySelector('[aria-label="The Lyapunov spectrum"]')?.textContent ?? "";
    return { l: e.lambdas, t: e.t, se: e.se, txt };
  });
  check("Learn's λ₁, measured as you watch, converges towards 0.906", li.t > 100 && Math.abs(li.l[0] - 0.906) < 0.08 && /Kaplan/.test(li.txt), `λ = ${li.l.map((v) => v.toFixed(3)).join(", ")} after ${Math.round(li.t)} time units (2 SE ${(2 * li.se[0]).toFixed(3)})`);
  await shot(page, "09-digits-learn");
  check("no console errors (Buy More Digits)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}
{
  const { ctx, page } = await open("/v2/?s=digits", { reducedMotion: "reduce" });
  const r = await T(page, () => ({ turn: globalThis.__chaos.camera.autoRotate, speed: globalThis.__chaos.clock.speed }));
  check("reduced motion in Buy More Digits: no turntable, half its speed", r.turn === 0 && r.speed === 2, JSON.stringify(r));
  await ctx.close();
}

// --- determinism: the same seed gives the same bytes across page loads ------------------
{
  const run = async () => {
    const { ctx, page, errors } = await open("/v2/?seed=5");
    const h = await T(page, async () => {
      const a = globalThis.__chaos;
      a.clock.paused = true;
      await new Promise((r) => setTimeout(r, 200));
      await a.loadScene("butterfly", { seed: 5 });
      a.clock.paused = true;
      a.requestRelease(a.releasePoint);
      await a.advance(800);
      return null;
    });
    void h;
    const hash = await ballHash(page);
    // after an off-loop advance the live loop still gets its spread samples
    const live = await T(page, async () => {
      const a = globalThis.__chaos;
      const t0 = a.lastSpread?.t ?? -1;
      a.clock.paused = false;
      await new Promise((r) => setTimeout(r, 1500));
      return { before: t0, after: a.lastSpread?.t ?? -1 };
    });
    await ctx.close();
    return { hash, errors, live };
  };
  const a = await run();
  const b = await run();
  check("the same seed gives the same ball bytes across page loads (800 steps)", a.hash === b.hash, `${a.hash.slice(0, 16)}… ≡ ${b.hash.slice(0, 16)}…`);
  check("no console errors (seed runs)", a.errors.length + b.errors.length === 0);
  check("after an off-loop advance, live spread samples keep arriving", a.live.after > a.live.before && a.live.after > 0, `last sample at t ${a.live.before.toFixed(2)} → ${a.live.after.toFixed(2)}`);
}

// --- a shared link boots into its state --------------------------------------------------
{
  const { ctx, page, errors } = await open("/v2/?rho=99.65&d=9");
  const d = await dbg(page);
  check("a link with ρ and precision boots into them", d.params.rho === 99.65 && (await T(page, () => globalThis.__chaos.digits)) === 9, `ρ ${d.params.rho}`);
  await page.waitForTimeout(2500);
  await shot(page, "07-rho-99.65");
  check("no console errors (link)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- reduced motion -----------------------------------------------------------------------
{
  const { ctx, page } = await open("/v2/", { reducedMotion: "reduce" });
  const r = await T(page, () => ({ turn: globalThis.__chaos.camera.autoRotate, speed: globalThis.__chaos.clock.speed }));
  check("reduced motion: no turntable, half speed", r.turn === 0 && r.speed === 0.5, JSON.stringify(r));
  await ctx.close();
}

console.log(`BP_BENCH ${JSON.stringify(bench)}`);
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (out) await writeFile(join(out, "acceptance.json"), JSON.stringify({ results, bench }, null, 2));
await browser.close();
server.close();
process.exit(failed.length ? 1 : 0);
