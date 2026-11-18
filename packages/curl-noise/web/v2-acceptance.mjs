// Flow Sculpture v2 — acceptance checks in a real WebGPU browser
// (docs/planning/rebuild-v2/06-curl-noise.md, M0).
//
//   npm run build   (in this directory)
//   CHROME_BIN=/snap/bin/chromium \
//   PLAYWRIGHT_MODULE=<repo>/tools/productization/web-deploy/web/headless/node_modules/playwright/index.js \
//   node v2-acceptance.mjs [out-dir]
//
// Checks: the v1 page's capture and the v2 page's carry the same bytes; v2
// signals ready at the gate path, then goes live; the tier's ribbon count and
// length; the clock's step rate; the Studio boots on its own field with Silk's
// two sheets; the in-page gate, the live kernel ≡ the gated one byte for byte,
// the identities (divergence, confinement, Clebsch, tangency) at the f32 floor
// with helicity as the nonzero control; every Silk particle still on its two
// surfaces, recomputed here in double precision (src/curlnoise64.mjs) at its
// single-precision position, and a restart that misses its sheet is never
// published (at swirls of 1.2 with one octave too); the sphere through the
// GPU cull; dragging the
// sphere moves it (one edit, on the link, still tangent) and a drag elsewhere
// only turns the view; undo by replay gives the same bytes as never editing;
// Tune's Evolution as an edit on the link; save / restore; the same seed gives
// the same bytes across page loads; a shared link boots into its field; the
// volume mode keeps an even density; reduced motion; at most six tools at
// 1280×720; no console errors. M1: Dust (the tier's points on three sheets, 60
// steps/s, every point on its sheet in f64, the Silk ↔ Dust switch on the link),
// the software-adapter profile, and Paint the Stream (the scene picker, its
// tools, the 2D Prove cards — divergence at the f32 floor of its terms, v·∇ψ,
// particles on their contours in f64, patch counts as even as a random
// scatter — a drag as one stroke that raises ψ only under it, the contour key,
// undo by replay ≡ never painting, a new landscape as an undoable edit on the
// link, back to the Studio, and the same seed giving the same bytes across
// loads). Prints a BP_BENCH line at the end.

import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { isoValues } from "./src/curlnoise64.mjs";

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
  if (path.startsWith("/v2/") && !o.noLive) await page.waitForFunction(() => globalThis.__flowLive === true, undefined, { timeout: 60000 });
  return { ctx, page, errors, ready };
}
const shot = async (page, name) => { if (out) await page.screenshot({ path: join(out, `${name}.png`) }); };
const T = (page, fn, arg) => page.evaluate(fn, arg);
const dbg = (page) => T(page, () => globalThis.__bpDebug());
const sci = (x) => (typeof x === "number" ? x.toExponential(1) : String(x));

/** Click the capture control and return the published capture. */
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

/** sha256 of every tracer's (xyz, age) and epoch after pausing the live loop. */
const flowHash = (page) =>
  T(page, async () => {
    const f = globalThis.__flow.flow;
    const a = await f.readTracers();
    const d = await crypto.subtle.digest("SHA-256", a.buffer);
    return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
  });

/** Pause the live loop and let in-flight frames land. */
const pause = (page) =>
  T(page, async () => {
    const a = globalThis.__flow;
    a.clock.paused = true;
    await new Promise((r) => setTimeout(r, 200));
    await a.gpu.device.queue.onSubmittedWorkDone();
  });

/** The gate's own budget: 2e-4 of the iso scale (0.666 in the gate scene). */
const GATE_BUDGET = 2e-4 * 0.666;

/**
 * Every live particle against its anchors, ‖(f₁, f₂)(x) − anchors‖ with f
 * recomputed in f64 (src/curlnoise64.mjs) at its f32 position; how many
 * are anchored on one of Silk's sheets (the rest are restarts that missed and
 * wait for the next step). Call with the clock paused.
 */
async function sheetCheck(page, limit = 1 << 20) {
  const surf = await T(page, async (lim) => {
    const a = globalThis.__flow;
    const [x, f0] = await Promise.all([a.flow.readTracers(lim), a.flow.readAnchors(lim)]);
    return { x: Array.from(x), f0: Array.from(f0), field: a.flow.params, time: a.flow.time, sheets: a.flow.sheets };
  }, limit);
  const o = surf.field.obstacle;
  const cfg = {
    octaves: surf.field.octaves, ell0: surf.field.ell0, gain: surf.field.gain, lacunarity: surf.field.lacunarity, amplitude: surf.field.amplitude, seed: 0, time: surf.time * surf.field.evolution,
    obstacleCenter: o.centre, obstacleRadius: o.radius, obstacleRampWidth: o.ramp, obstacleNoiseAmp: o.noiseAmp,
  };
  const sheetF32 = surf.sheets.map((c) => Math.fround(c));
  let worst = 0;
  let onSheet = 0;
  const n = surf.f0.length / 2;
  for (let i = 0; i < n; i += 1) {
    const f = isoValues([surf.x[i * 4], surf.x[i * 4 + 1], surf.x[i * 4 + 2]], cfg);
    worst = Math.max(worst, Math.hypot(f[0] - surf.f0[i * 2], f[1] - surf.f0[i * 2 + 1]));
    if (sheetF32.includes(surf.f0[i * 2 + 1])) onSheet += 1;
  }
  return { n, onSheet, worst };
}

/** The capture without its wall-clock field. */
const sansWall = (text) => {
  const b = JSON.parse(text);
  b.manifest.run.wall_clock_seconds = 0;
  return JSON.stringify(b);
};

// --- the v1 page: its capture ---------------------------------------------------
let v1Capture = "";
{
  const { ctx, page, errors } = await open("/");
  v1Capture = await capture(page);
  check("v1 page boots on WebGPU and exports its capture", v1Capture.length > 1000, `${v1Capture.length} bytes`);
  check("no console errors (v1 page)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- boot, the gate, the Studio ---------------------------------------------------
let bench = null;
{
  const { ctx, page, errors, ready } = await open("/v2/");
  const boot = await T(page, () => globalThis.__flowBoot);
  check("v2 signals ready at the gate path, before the live view compiles", boot.ready <= boot.compiled && boot.ready <= boot.live, `ready ${boot.ready} ms, compiled ${boot.compiled} ms, live ${boot.live} ms (driver saw ready at ${ready} ms)`);
  const v2Capture = await capture(page);
  const a = JSON.parse(v1Capture);
  const b = JSON.parse(v2Capture);
  const stepsSame = JSON.stringify(a.steps) === JSON.stringify(b.steps);
  const shaSame = a.manifest.config.params.trajectory_sha256 === b.manifest.config.params.trajectory_sha256;
  check(
    "release-gate capture: the same bytes on the v1 and v2 pages (all but the wall clock)",
    stepsSame && shaSame && sansWall(v1Capture) === sansWall(v2Capture) && b.manifest.config.params.run_twice_identical === true,
    `positions sha256 ${b.manifest.config.params.trajectory_sha256.slice(0, 16)}…, steps JSON sha256 ${(await sha(page, JSON.stringify(b.steps))).slice(0, 16)}…`,
  );
  const tools = await T(page, () => document.querySelectorAll(".bp-rail-tools .bp-tool").length);
  check("at most six tools at 1280×720", tools <= 6 && tools >= 1, `${tools} tools`);
  const cap = await T(page, () => {
    const btn = document.querySelector('[data-bp="capture"]');
    return btn instanceof HTMLButtonElement && !btn.disabled && getComputedStyle(btn).display !== "none";
  });
  check("the capture control is a live button in the boot state", cap);

  await page.waitForTimeout(1500);
  const d0 = await dbg(page);
  const want = { T3: [32768, 96], T2: [16384, 64], T1: [8192, 48] }[d0.tier];
  check(`the tier's ribbons (${d0.tier})`, d0.strands === want[0] && d0.slots === want[1], `${d0.strands.toLocaleString()} ribbons × ${d0.slots} points, adapter ${d0.adapter}`);
  check(
    "boots into the Studio on its own field, Silk's two sheets",
    d0.scene === "studio" && d0.fieldKind === "scene" && d0.field.octaves === 2 && d0.field.ell0 === 0.7 && JSON.stringify(d0.sheets) === "[-0.08,0.08]",
    `${d0.field.octaves} octaves, ℓ₀ ${d0.field.ell0}, sheets ${JSON.stringify(d0.sheets)}`,
  );
  const t0 = Date.now();
  const s0 = d0.steps;
  await page.waitForTimeout(2000);
  const d1 = await dbg(page);
  const rate = (d1.steps - s0) / ((Date.now() - t0) / 1000);
  check("the clock runs 120 steps a second at 1× (±10%)", Math.abs(rate / 120 - 1) < 0.1, `${rate.toFixed(0)} steps/s`);
  await shot(page, "01-studio");

  // Prove, as the drawer runs it
  const prove = await T(page, async () => {
    const P = globalThis.__flowProve;
    await P.runAll();
    return P.results;
  });
  const g = prove.gate;
  check("in-page release gate: run twice identical, IC on the committed seeds, iso residual within budget", g?.passed, g ? `worst ${sci(g.isoWorst)} = ${(g.fraction * 100).toFixed(1)}% of ${sci(g.budgetAbs)}; IC within ${sci(g.icMaxAbsDev)}` : "no result");
  check("the live kernel ≡ the gated one, byte for byte (64 steps, 4,096 tracers)", prove.live?.identical, `${prove.live?.compared} checkpoints${prove.live?.firstMismatch !== null ? `, first difference at step ${prove.live?.firstMismatch}` : ""}`);
  const m = prove.identities;
  const divRel = m.divMax / m.jacScale;
  const confRel = Math.max(m.conf1Max, m.conf2Max) / m.speedMax;
  const vnRel = m.vnMax / m.surfaceSpeedMax;
  check("divergence at the f32 floor (< 10⁻⁵ of the largest |∇×v|)", divRel < 1e-5, `max |∇·v| ${sci(m.divMax)} = ${sci(divRel)} of |∇×v| ${m.jacScale.toFixed(1)}`);
  check("confinement and Clebsch at the f32 floor (< 10⁻⁵ of the fastest speed)", confRel < 1e-5 && m.clebschMax / m.speedMax < 1e-5, `v·∇f₁ ${sci(m.conf1Max)}, v·∇f₂ ${sci(m.conf2Max)}, (f₁∇f₂)·v ${sci(m.clebschMax)}; |v| ≤ ${m.speedMax.toFixed(2)}`);
  check("tangent at the sphere (|v·n| < 10⁻⁵ of the surface speed)", vnRel < 1e-5, `max |v·n| ${sci(m.vnMax)} = ${sci(vnRel)} of ${m.surfaceSpeedMax.toFixed(2)}`);
  check("the control is not zero: kinetic helicity v·(∇×v)", m.helicityMax > 1e-2, `max ${m.helicityMax.toFixed(3)}`);
  await T(page, () => document.querySelector('.bp-top-actions [aria-label="Prove"]').click());
  await page.waitForTimeout(400);
  await shot(page, "02-prove");
  await T(page, () => document.querySelector(".bp-drawer .bp-icon-btn[aria-label='Close panel']").click());

  // Silk: every particle on its two surfaces, recomputed in f64 here
  await pause(page);
  {
    const r = await sheetCheck(page);
    check(
      "every Silk particle's anchors are its own surfaces (f64 at its f32 position), and nearly all ride a sheet",
      r.worst < GATE_BUDGET && r.onSheet / r.n > 0.99,
      `${r.n.toLocaleString()} particles, ${r.onSheet.toLocaleString()} on a sheet, ${r.n - r.onSheet} waiting to restart; worst ${sci(r.worst)} (gate budget ${sci(GATE_BUDGET)})`,
    );
  }

  // the sphere through the GPU cull
  const counts = await T(page, async () => globalThis.__flow.view.readSphereCounts());
  check("Instances: the sphere passes the GPU frustum cull", counts.reduce((x, y) => x + y, 0) === 1, `per level ${counts.join(" / ")}`);

  // drag the sphere: one edit, on the link, still tangent
  await T(page, () => { globalThis.__flow.camera.autoRotate = 0; globalThis.__flow.clock.paused = false; });
  await page.waitForTimeout(300);
  const before = await T(page, () => {
    const a = globalThis.__flow;
    return { sp: a.screenOf(a.flow.params.obstacle.centre), events: a.eventCount, centre: [...a.flow.params.obstacle.centre] };
  });
  await page.mouse.move(before.sp[0], before.sp[1]);
  await page.mouse.down();
  await page.mouse.move(before.sp[0] + 90, before.sp[1] - 40, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(800);
  const moved = await T(page, () => {
    const a = globalThis.__flow;
    return { centre: [...a.flow.params.obstacle.centre], events: a.eventCount, kind: globalThis.__bpDebug().fieldKind, search: location.search };
  });
  const dist = Math.hypot(...moved.centre.map((c, i) => c - before.centre[i]));
  check("dragging the sphere moves it, as one edit on the link", dist > 0.03 && moved.events === before.events + 1 && moved.kind === "edited" && moved.search.includes("obs="), `moved ${dist.toFixed(3)} to (${moved.centre.map((c) => c.toFixed(3)).join(", ")}); ${moved.search}`);
  await page.waitForTimeout(1200);
  await shot(page, "03-moved");
  const movedId = await T(page, async () => {
    const P = globalThis.__flowProve;
    await P.runAll();
    return P.results.identities;
  });
  check("the moved sphere is still exactly tangent (|v·n| < 10⁻⁵ of the surface speed)", movedId.vnMax / movedId.surfaceSpeedMax < 1e-5, `max |v·n| ${sci(movedId.vnMax)} of ${movedId.surfaceSpeedMax.toFixed(2)}`);
  const c0 = await T(page, () => ({ yaw: globalThis.__flow.camera.state().yaw, events: globalThis.__flow.eventCount }));
  await page.mouse.move(1150, 250);
  await page.mouse.down();
  await page.mouse.move(1050, 240, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const c1 = await T(page, () => ({ yaw: globalThis.__flow.camera.state().yaw, events: globalThis.__flow.eventCount }));
  check("a drag off the sphere turns the view and edits nothing", Math.abs(c1.yaw - c0.yaw) > 0.2 && c1.events === c0.events, `yaw ${c0.yaw.toFixed(2)} → ${c1.yaw.toFixed(2)}`);
  const undone = await T(page, async () => {
    const a = globalThis.__flow;
    a.undo();
    await new Promise((r) => setTimeout(r, 300));
    return { centre: [...a.flow.params.obstacle.centre], events: a.eventCount, kind: globalThis.__bpDebug().fieldKind };
  });
  check("undo puts the sphere back", undone.centre.every((c) => c === 0.5) && undone.events === before.events && undone.kind === "scene", `(${undone.centre.join(", ")}), ${undone.kind}`);

  // undo by replay ≡ never editing, byte for byte
  const replay = await T(page, async () => {
    const a = globalThis.__flow;
    const hash = async () => {
      const x = await a.flow.readTracers();
      const d = await crypto.subtle.digest("SHA-256", x.buffer);
      return [...new Uint8Array(d)].map((v) => v.toString(16).padStart(2, "0")).join("").slice(0, 16);
    };
    const settle = () => new Promise((r) => setTimeout(r, 120));
    a.clock.paused = true;
    await settle();
    await a.loadScene("studio", { seed: 7 });
    a.clock.paused = true;
    await a.advance(96);
    a.setField({ ...a.flow.params, evolution: 0.2 }, a.flow.dt);
    await settle(); // the edit lands at the next frame's step boundary
    const edited = a.flow.params.evolution;
    await a.advance(96);
    a.undo();
    await settle();
    const withUndo = await hash();
    const steps = a.flow.steps;
    await a.loadScene("studio", { seed: 7 });
    a.clock.paused = true;
    await a.advance(steps);
    const plain = await hash();
    return { edited, withUndo, plain, steps };
  });
  check("undo replays to the same bytes as never editing", replay.edited === 0.2 && replay.withUndo === replay.plain, `${replay.steps} steps: ${replay.withUndo} ≡ ${replay.plain}`);

  // Tune's Evolution: an edit on the link
  const evo = await T(page, async () => {
    const a = globalThis.__flow;
    a.clock.paused = false;
    a.setField({ ...a.flow.params, evolution: 0.15 }, a.flow.dt);
    await new Promise((r) => setTimeout(r, 700));
    const mid = { evo: a.flow.params.evolution, kind: globalThis.__bpDebug().fieldKind, search: location.search };
    a.undo();
    await new Promise((r) => setTimeout(r, 300));
    return { mid, after: a.flow.params.evolution };
  });
  check("Evolution lands as an edit, rides the link, and undoes", evo.mid.evo === 0.15 && evo.mid.kind === "evolving" && evo.mid.search.includes("evo=0.15") && evo.after === 0, evo.mid.search);
  await page.waitForTimeout(400);

  // save / restore
  const hist = await T(page, async () => {
    const a = globalThis.__flow;
    a.savePoint();
    const saved = a.flow.steps;
    await new Promise((r) => setTimeout(r, 1200));
    const later = a.flow.steps;
    a.restoreSave();
    return { saved, later, restored: a.flow.steps };
  });
  check("save point and restore", hist.later > hist.saved && hist.restored === hist.saved, `saved at ${hist.saved}, ran to ${hist.later}, restored to ${hist.restored}`);

  // bench
  await T(page, () => { globalThis.__flow.clock.paused = false; globalThis.__flow.camera.autoRotate = 0.05; });
  bench = await T(page, async () => {
    const a = globalThis.__flow;
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
    return { fps: a.fps, rafPerSecond: frames / sec, stepsPerSecond: (a.stepsTotal - s0) / sec, strands: a.flow.n, slots: a.flow.slots, tier: a.tier, gpuMs: a.profiler?.frameAvg ?? null, passes: a.profiler?.timings().map((p) => ({ name: p.name, ms: +p.avg.toFixed(3) })) ?? [] };
  });
  check("60 fps at the tier's sizes (headless, this GPU)", bench.fps > 55, `${bench.fps.toFixed(1)} fps, GPU ${bench.gpuMs?.toFixed(2)} ms/frame`);
  check("no console errors (v2 page)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- determinism: the same seed gives the same bytes across page loads ------------------
{
  const run = async () => {
    const { ctx, page, errors } = await open("/v2/?seed=5");
    await T(page, async () => {
      const a = globalThis.__flow;
      a.clock.paused = true;
      await new Promise((r) => setTimeout(r, 200));
      await a.loadScene("studio", { seed: 5 });
      a.clock.paused = true;
      await a.advance(480);
    });
    const hash = await flowHash(page);
    await ctx.close();
    return { hash, errors };
  };
  const a = await run();
  const b = await run();
  check("the same seed gives the same tracer bytes across page loads (480 steps, with respawns)", a.hash === b.hash, `${a.hash.slice(0, 16)}… ≡ ${b.hash.slice(0, 16)}…`);
  check("no console errors (seed runs)", a.errors.length + b.errors.length === 0);
}

// --- where a sheet barely enters the ball (swirls of 1.2, one octave) ----------------------
{
  const { ctx, page, errors } = await open("/v2/?ell=1.2&oct=1");
  await pause(page);
  await T(page, async () => {
    const a = globalThis.__flow;
    await a.loadScene("studio", { field: { ...a.flow.params }, seed: 1 });
    a.clock.paused = true;
    await a.gpu.device.queue.onSubmittedWorkDone();
  });
  const seeded = await sheetCheck(page);
  await T(page, async () => globalThis.__flow.advance(60));
  const later = await sheetCheck(page);
  check(
    "a seed that misses its sheet is never published: anchors stay true at seeding and after (swirls 1.2, one octave)",
    seeded.worst < GATE_BUDGET && later.worst < GATE_BUDGET && later.onSheet / later.n > 0.99,
    `seeded: ${seeded.n - seeded.onSheet} of ${seeded.n.toLocaleString()} waiting, worst ${sci(seeded.worst)}; after 60 steps: ${later.n - later.onSheet} waiting, worst ${sci(later.worst)}`,
  );
  await T(page, () => { globalThis.__flow.clock.paused = false; });
  await page.waitForTimeout(2500);
  await shot(page, "06-swirl-1.2");
  check("no console errors (swirls 1.2)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- a shared link boots into its field --------------------------------------------------
{
  const { ctx, page, errors } = await open("/v2/?oct=3&ell=0.5&obs=0.58,0.5,0.46");
  const d = await dbg(page);
  const o = d.field.obstacle.centre;
  check("a link with the field and the sphere's place boots into them", d.field.octaves === 3 && d.field.ell0 === 0.5 && o[0] === 0.58 && o[2] === 0.46 && d.fieldKind === "edited", `${d.field.octaves} octaves, ℓ₀ ${d.field.ell0}, sphere at (${o.join(", ")})`);
  await page.waitForTimeout(2500);
  await shot(page, "04-link");
  check("no console errors (link)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- the volume mode keeps an even density -----------------------------------------------
{
  const { ctx, page, errors } = await open("/v2/?sh=none");
  await page.waitForTimeout(8000);
  const dens = await T(page, async () => {
    const a = globalThis.__flow;
    a.clock.paused = true;
    await new Promise((r) => setTimeout(r, 200));
    const x = await a.flow.readTracers();
    return { x: Array.from(x), sheets: a.flow.sheets, obstacle: a.flow.params.obstacle, steps: a.flow.steps };
  });
  // equal-volume shells of the ball (centre (0.5,0.5,0.5), radius 0.47), the sphere's volume taken out
  const S = 8;
  const R = 0.47;
  const shell = (x, y, z) => {
    const r = Math.hypot(x - 0.5, y - 0.5, z - 0.5);
    return r <= R ? Math.min(S - 1, Math.floor(S * (r / R) ** 3)) : -1;
  };
  const counts = new Array(S).fill(0);
  for (let i = 0; i < dens.x.length; i += 4) {
    const k = shell(dens.x[i], dens.x[i + 1], dens.x[i + 2]);
    if (k >= 0) counts[k] += 1;
  }
  const o = dens.obstacle;
  const free = new Array(S).fill(0);
  let s = 2463534242;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0), s / 4294967296);
  for (let i = 0; i < 400000; i += 1) {
    const x = 0.5 + R * (2 * rnd() - 1), y = 0.5 + R * (2 * rnd() - 1), z = 0.5 + R * (2 * rnd() - 1);
    const k = shell(x, y, z);
    if (k < 0 || Math.hypot(x - o.centre[0], y - o.centre[1], z - o.centre[2]) < o.radius) continue;
    free[k] += 1;
  }
  const total = counts.reduce((x, y) => x + y, 0);
  const freeTotal = free.reduce((x, y) => x + y, 0);
  // shells the sphere fills almost entirely hold too few particles to count
  const ratio = counts.map((c, k) => (free[k] / freeTotal > 0.02 ? c / total / (free[k] / freeTotal) : null));
  const dev = Math.max(...ratio.filter((r) => r !== null).map((r) => Math.abs(r - 1)));
  check(
    "the volume mode keeps an even density: every shell within 10% of its share of the free volume",
    dens.sheets === null && dev < 0.1,
    `${total.toLocaleString()} particles after ${dens.steps} steps; density / even per shell: ${ratio.map((r) => (r === null ? "—" : r.toFixed(3))).join(" ")}`,
  );
  await shot(page, "05-volume");
  check("no console errors (volume mode)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// ============================ M1: Dust ============================================
{
  const { ctx, page, errors } = await open("/v2/?look=dust");
  const d = await dbg(page);
  const want = { T3: 1 << 20, T2: 1 << 18, T1: 1 << 16 }[d.tier];
  check(
    "a link with look=dust boots into Dust: the tier's points on three sheets, one slot each",
    d.look === "dust" && d.strands === want && d.slots === 1 && JSON.stringify(d.sheets) === "[-0.12,0,0.12]",
    `${d.strands.toLocaleString()} points, sheets ${JSON.stringify(d.sheets)}`,
  );
  const s0 = d.steps;
  const t0 = Date.now();
  await page.waitForTimeout(2000);
  const rate = ((await dbg(page)).steps - s0) / ((Date.now() - t0) / 1000);
  check("Dust takes 60 steps a second, each twice Silk's (same flow speed, half the solver's cost)", Math.abs(rate / 60 - 1) < 0.1 && Math.abs((await dbg(page)).dt / 0.0024 - 1) < 1e-9, `${rate.toFixed(0)} steps/s, Δt ${(await dbg(page)).dt}`);
  await pause(page);
  const r = await sheetCheck(page, 32768);
  check(
    "every Dust point's anchors are its own surfaces (f64), and nearly all ride a sheet",
    r.worst < GATE_BUDGET && r.onSheet / r.n > 0.99,
    `${r.n.toLocaleString()} points checked, ${r.onSheet.toLocaleString()} on a sheet; worst ${sci(r.worst)}`,
  );
  await T(page, () => { globalThis.__flow.clock.paused = false; });
  await page.waitForTimeout(1500);
  await shot(page, "07-dust");
  // the Tune switch, both ways, on the link
  const sw = await T(page, async () => {
    const a = globalThis.__flow;
    const settle = () => new Promise((r) => setTimeout(r, 450)); // the link is written 250 ms after the last change
    await a.setLook("silk");
    await settle();
    const silk = { look: a.look, n: a.flow.n, slots: a.flow.slots, search: location.search };
    await a.setLook("dust");
    await settle();
    return { silk, dust: { look: a.look, n: a.flow.n, search: location.search } };
  });
  check("Silk ↔ Dust switches particle sets, and the link carries the look", sw.silk.look === "silk" && sw.silk.slots > 1 && !sw.silk.search.includes("look=") && sw.dust.look === "dust" && sw.dust.search.includes("look=dust"), `${sw.silk.n} ribbons ↔ ${sw.dust.n} points; ${sw.dust.search}`);
  check("no console errors (Dust)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// ============================ M1: the software-adapter profile =====================
{
  const { ctx, page, errors } = await open("/v2/?soft=1");
  const d = await dbg(page);
  const p = await T(page, () => ({ soft: globalThis.__flow.softwareProfile, bloom: globalThis.__flow.hdr.bloom.intensity, maxSteps: globalThis.__flow.clock.maxTicksPerFrame }));
  check(
    "a software adapter (forced with ?soft=1) starts in Dust at 4,096 points, no bloom, two steps a frame at most",
    p.soft && d.look === "dust" && d.strands === 4096 && p.bloom === 0 && p.maxSteps === 2,
    `${d.look}, ${d.strands} points, bloom ${p.bloom}, ≤ ${p.maxSteps} steps a frame`,
  );
  check("no console errors (software profile)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// ============================ M1: Paint the Stream ==================================
{
  const { ctx, page, errors } = await open("/v2/");
  // pick the scene in the heading's picker, as a visitor would
  await page.selectOption(".bp-scene-picker", "paint");
  await page.waitForFunction(() => globalThis.__bpDebug().scene === "paint", undefined, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const d = await dbg(page);
  const want = { T3: [1024, 131072], T2: [512, 65536], T1: [512, 32768] }[d.tier];
  check("the scene picker opens Paint the Stream: a wrapping 2D map, the tier's grid and particles", d.space === "2d" && d.periodic === true && d.n === want[0] && d.particles === want[1], `${d.n}×${d.n} map, ${d.particles.toLocaleString()} particles`);
  const tools = await T(page, () => [...document.querySelectorAll(".bp-rail-tools .bp-tool")].map((b) => b.textContent.trim()));
  check("its tools: Paint and Pan", tools.join(",") === "Paint,Pan", tools.join(", "));
  await shot(page, "08-paint");

  // the 2D Prove cards
  const prove = await T(page, async () => {
    await globalThis.__flowProve.runAll();
    return globalThis.__flowProve.results.paint;
  });
  check("2D: the divergence is f32 rounding of the terms it sums (< 10⁻⁶), and v·∇ψ vanishes", prove.divRel < 1e-6 && prove.alongRel < 1e-6, `|∇·v| ${sci(prove.divRel)} of its terms; v·∇ψ ${prove.alongMax === 0 ? "exactly 0" : sci(prove.alongRel)}`);
  check("2D: particles keep to their contours (f64, < 10⁻³ of a line spacing)", prove.residual.worst / prove.contourStep < 1e-3, `worst ${sci(prove.residual.worst / prove.contourStep)}, median ${sci(prove.residual.median / prove.contourStep)} of a spacing`);
  check("2D: nothing piles up — patch counts as even as a random scatter (within 1.5×)", prove.spread.spread < 1.5 * prove.spread.expected, `±${(prove.spread.spread * 100).toFixed(2)}% vs ±${(prove.spread.expected * 100).toFixed(2)}%`);

  // a drag with the brush: one stroke, ψ raised under it and unchanged far away
  const psi0 = await T(page, async () => Array.from(await globalThis.__flowScene.paint().paint.readPsi()));
  const e0 = (await dbg(page)).events;
  await page.mouse.move(560, 380);
  await page.mouse.down();
  await page.mouse.move(700, 400, { steps: 12 });
  await page.waitForTimeout(250);
  await page.mouse.up();
  await page.waitForTimeout(300);
  const psi1 = await T(page, async () => Array.from(await globalThis.__flowScene.paint().paint.readPsi()));
  const n = d.n;
  let near = 0;
  let far = 0;
  const cam = await T(page, () => { const c = globalThis.__flowScene.paint().camera; return { cx: c.cx, cy: c.cy, k: c.pxPerUnit }; });
  const cx = cam.cx + (630 - 640) / cam.k;
  const cy = cam.cy + (390 - 360) / cam.k;
  for (let j = 0; j < n; j += 1) {
    for (let i = 0; i < n; i += 1) {
      const dx = Math.abs(((i - cx) % n + n * 1.5) % n - n / 2);
      const dy = Math.abs(((j - cy) % n + n * 1.5) % n - n / 2);
      const dd = psi1[j * n + i] - psi0[j * n + i];
      if (Math.hypot(dx, dy) < 0.05 * n) near = Math.max(near, dd);
      if (Math.hypot(dx, dy) > 0.4 * n) far = Math.max(far, Math.abs(dd));
    }
  }
  check("a drag paints one stroke: ψ rises under it, and nowhere far away", (await dbg(page)).events === e0 + 1 && near > 0 && far === 0, `one edit; rise ${near.toFixed(0)} under the stroke, ${far} far away`);
  await page.keyboard.press("c");
  check("C toggles the contour lines", (await dbg(page)).contours === false);
  await page.keyboard.press("c");

  // undo by replay ≡ never painting, byte for byte (ψ and particles)
  const rep = await T(page, async () => {
    const p = globalThis.__flowScene.paint();
    const hex = async (buf) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", buf))].map((v) => v.toString(16).padStart(2, "0")).join("").slice(0, 16);
    const state = async () => (await hex((await p.paint.readPsi()).buffer)) + "/" + (await hex((await p.paint.readParticles()).buffer));
    p.clock.paused = true;
    await new Promise((r) => setTimeout(r, 150));
    await p.load({ seed: 3 });
    p.clock.paused = true;
    await p.advance(60);
    p.dab({ x: 200, y: 260, radius: 60, amount: 2500, mode: "raise" });
    await p.advance(60);
    p.undo();
    await new Promise((r) => setTimeout(r, 150));
    const withUndo = await state();
    const steps = p.paint.steps;
    await p.load({ seed: 3 });
    p.clock.paused = true;
    await p.advance(steps);
    return { withUndo, plain: await state(), steps };
  });
  check("2D undo replays to the same bytes as never painting (ψ and particles)", rep.withUndo === rep.plain, `${rep.steps} steps: ${rep.withUndo} ≡ ${rep.plain}`);

  // a new landscape is an edit; undo brings the old one back, and the link follows
  const land = await T(page, async () => {
    const p = globalThis.__flowScene.paint();
    p.clock.paused = false;
    const before = p.paint.landscapeSeed;
    p.newLandscape(424242);
    await new Promise((r) => setTimeout(r, 600));
    const mid = { seed: p.paint.landscapeSeed, search: location.search, events: p.eventCount };
    p.undo();
    await new Promise((r) => setTimeout(r, 600));
    return { before, mid, after: p.paint.landscapeSeed, search: location.search };
  });
  check(
    "a new landscape is an undoable edit, and the link carries its seed",
    land.mid.seed === 424242 && land.mid.search.includes("seed=424242") && land.after === land.before && !land.search.includes("seed=424242"),
    `seed ${land.before} → ${land.mid.seed} → ${land.after}; ${land.mid.search} → ${land.search}`,
  );
  check("no console errors (Paint the Stream)", errors.length === 0, errors.join(" | "));

  // back to the Studio
  await page.selectOption(".bp-scene-picker", "studio");
  await page.waitForFunction(() => globalThis.__bpDebug().space === "3d", undefined, { timeout: 30000 });
  const back = await T(page, () => ({ active: globalThis.__flow.active, scene: globalThis.__bpDebug().scene }));
  check("back to the Studio: the 3D scene is live again", back.active && back.scene === "studio", JSON.stringify(back));
  await ctx.close();
}

// --- 2D: the same seed gives the same bytes across page loads; a link boots into its landscape ---
{
  const run = async () => {
    const { ctx, page, errors } = await open("/v2/?s=paint&seed=7");
    await page.waitForFunction(() => globalThis.__bpDebug().scene === "paint", undefined, { timeout: 60000 });
    const land = (await dbg(page)).landscape;
    const hash = await T(page, async () => {
      const p = globalThis.__flowScene.paint();
      p.clock.paused = true;
      await new Promise((r) => setTimeout(r, 150));
      await p.load({ seed: 7 });
      p.clock.paused = true;
      await p.advance(240);
      const d = await crypto.subtle.digest("SHA-256", (await p.paint.readParticles()).buffer);
      return [...new Uint8Array(d)].map((v) => v.toString(16).padStart(2, "0")).join("").slice(0, 16);
    });
    await ctx.close();
    return { hash, land, errors };
  };
  const a = await run();
  const b = await run();
  check("a link with s=paint&seed=7 boots into that landscape", a.land === 7 && b.land === 7, `landscape ${a.land}`);
  check("2D: the same seed gives the same particle bytes across page loads (240 steps, with restarts)", a.hash === b.hash, `${a.hash} ≡ ${b.hash}`);
  check("no console errors (2D seed runs)", a.errors.length + b.errors.length === 0, [...a.errors, ...b.errors].join(" | "));
}

// --- reduced motion -----------------------------------------------------------------------
{
  const { ctx, page } = await open("/v2/", { reducedMotion: "reduce" });
  const r = await T(page, () => ({ turn: globalThis.__flow.camera.autoRotate, speed: globalThis.__flow.clock.speed }));
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
