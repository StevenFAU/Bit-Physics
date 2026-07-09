// Landing-page motion-loop generator (Lane B, dispatch P-7 — ratified).
//
// Films each MOTION-classified sim bundle under the SAME deterministic
// discipline as make-posters.mjs: default seed (42) + a declared RAF frame
// range, by wrapping requestAnimationFrame before the app boots, pumping to
// the start frame, then capturing one canvas screenshot every `gap` frames
// and encoding the sequence to a looping VP9 .webm at a fixed CRF
// (single-threaded encode for reproducibility). READ-ONLY with respect to
// the sims: no sim code, params, or capture path is touched — this drives
// the same built dist the validate gate drives. ffmpeg is required HERE
// only; nothing in any sim or gate path knows it exists.
//
// Motion/static criterion (P-7 audit, standing): a sim earns a loop iff the
// motion IS the physics (flock dynamics, network growth, front propagation,
// trajectory trace-in) — camera-only motion (orbit/zoom) stays a still.
// Motion: boids-3d, physarum, reaction-diffusion-2d, strange-attractors.
// Static: ising-classical (flicker), neural-ca (growth ends), mandelbulb
// (static geometry).
//
// Usage:  node make-loops.mjs [sim ...]        (default: the four motion sims)
// Env:    CHROME_BIN (required locally), PLAYWRIGHT_MODULE (same override
//         the capture driver honors), FFMPEG (default: ffmpeg on PATH)
// Writes <this dir>/<sim>.webm. Budgets (ratified): ≤1.5 MB per sim,
// ≤10 MB page total — sizes printed per loop and recorded in the audit.

import { createServer } from "node:http";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { extname, join, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const pw = await import(
  process.env.PLAYWRIGHT_MODULE ??
    join(dirname(fileURLToPath(import.meta.url)), "../../headless/node_modules/playwright/index.js")
);
const chromium = pw.chromium ?? pw.default.chromium;
const run = promisify(execFile);
const FFMPEG = process.env.FFMPEG ?? "ffmpeg";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "../../../../../..");

// start: RAF frames pumped before the first shot (post-boot settle).
// shots/gap: shots captured, one every gap frames → covers start..start+shots*gap.
// fps: playback rate → loop duration = shots/fps. crf: fixed VP9 quality.
// px: output CSS pixel width. boost: photographic exposure (CSS filter on the
// canvas, same mechanism/values as the poster config — exposure, not physics).
const SIMS = {
  // murmuration under the P-6 auto-fit; loop wraps with a cut (declared).
  "boids-3d": { start: 60, shots: 300, gap: 2, fps: 30, px: 512, crf: 46, boost: "brightness(1.35) saturate(1.5)" },
  // transport-network growth from the noise field.
  physarum: { start: 120, shots: 300, gap: 2, fps: 30, px: 512, crf: 46 },
  // Gray-Scott fronts: λ-class spot division filling the domain, timelapsed
  // (gap 6). Regenerated for the render.wgsl v2 look (bilinear + relief +
  // in-shader tonemap); same frame range, still no boost — the shader
  // carries its own exposure.
  "reaction-diffusion-2d": { start: 400, shots: 300, gap: 6, fps: 30, px: 512, crf: 46 },
  // Phase-6 sph-water: the dam-break collapse + crown splash — the loop
  // covers frames 30..330 (~the whole violent phase); frame-indexed live
  // loop, deterministic per device. Loop wraps with a cut (declared).
  "sph-water": { start: 30, shots: 300, gap: 1, fps: 30, px: 512, crf: 46 },
  // Phase-6 mpm-multimaterial: the showcase drop — snowball flight + splash,
  // jelly drop, water flooding the sand bed; frames 10..310 cover the whole
  // multi-material impact phase. Frame-indexed live loop, deterministic per
  // device; loop wraps with a cut (declared, boids precedent).
  "mpm-multimaterial": { start: 10, shots: 300, gap: 1, fps: 30, px: 512, crf: 46 },
  // Phase-6 pic-flip: the dam-break collapse — frame-indexed live loop,
  // deterministic per device. Loop wraps with a cut (declared).
  "pic-flip": { start: 20, shots: 300, gap: 1, fps: 30, px: 512, crf: 46 },
  // Phase-6 eulerian-smoke: motion IS the physics (buoyant plume rising +
  // rolling up); boots into the plume scene with a frame-indexed emitter, so
  // the loop is deterministic. Loop wraps with a cut (declared, boids
  // precedent). Boost matches the poster config (exposure, not physics).
  "eulerian-smoke": { start: 150, shots: 300, gap: 2, fps: 30, px: 512, crf: 46, boost: "brightness(1.6) saturate(1.6)" },
  // the P-7 boot trace-in: the trajectory draws itself in integration order;
  // start 1 + 600-frame trace = the loop restart IS the trace restarting.
  // Boost 1.9→1.1: the v2 render carries its own GPU-side exposure.
  "strange-attractors": { start: 1, shots: 300, gap: 2, fps: 30, px: 512, crf: 46, boost: "brightness(1.1) saturate(1.2)" },
  // Phase-6 schrodinger-smoke: the vortex ring punching through its dye disk
  // and rolling up the wake — frames 60..660 at the 24 steps/s wall cadence
  // (~step 20..250). Frame-indexed deterministic per device; loop wraps with
  // a cut (declared, boids precedent).
  "schrodinger-smoke": { start: 60, shots: 300, gap: 2, fps: 30, px: 512, crf: 46 },
  // Phase-6 curl-noise: trails developed by ~frame 120; the loop rides the
  // auto-orbit through the wisp field around the sphere.
  "curl-noise": { start: 120, shots: 300, gap: 2, fps: 30, px: 512, crf: 46 },
  // Phase-6 boids-2d: the v4 lab in its seed-42 'flock' regime — the flow never
  // settles, so the loop is perpetual (flock precedent). crf 58 (vs the family's
  // 46): the full-detail comet-flock is high-entropy, so 46 blew 3× past the
  // 1.5 MB budget; 58 lands 1.27 MB at card-legible quality. cfg.hide strips the
  // embedded lab chrome so only the #view comet-flock films.
  "boids-2d": { start: 120, shots: 300, gap: 2, fps: 30, px: 512, crf: 58, hide: ["#topbar", "#hint", "#playstats", "#modeflag", "#panel", "#overlay"] },
  // Phase-6 heat-equation: the 'circuit board' scene — a steady chip source
  // conducting through copper traces; gap 4 timelapses the front spreading
  // pad-to-pad (rd2d timelapse precedent). start 150 so shot 0 is already
  // glowing (a cold start flashes black on wrap); loop wraps with a cut.
  "heat-equation": { start: 150, shots: 300, gap: 4, fps: 30, px: 512, crf: 46, hide: [".he-explain", ".he-verify"] },
  // Phase-6 signal-workbench: the XY erf-beam Lissajous tumbling under the
  // 0.35 rad/s phase drift (one full figure period ~18 s at 60 fps -> gap 2
  // covers a clean visual cycle). Smooth dark-field gradients compress well;
  // start past the cold boot so shot 0 already glows (heat black-flash
  // lesson).
  "signal-workbench": { start: 90, shots: 300, gap: 2, fps: 30, px: 512, crf: 46, query: "?preset=xy", hide: [".sw-explain", ".sw-verify"] },
  // Phase-6 phase-field-fracture: the SENT benchmark end to end — elastic
  // loading (stress fringes brighten), nucleation at the notch tip, the
  // ~0.55 c_R burst with tip glow, arrest with the specimen visibly torn.
  // Start past the cold boot (heat black-flash lesson); the run completes
  // within the shot window so the loop ends on the opened crack and cuts.
  "phase-field-fracture": { start: 30, shots: 280, gap: 2, fps: 30, px: 512, crf: 46, hide: [".pf-explain", ".pf-verify", "#hud"] },
};

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".bin": "application/octet-stream",
  ".map": "application/json", ".wasm": "application/wasm",
};
const ARGS = [
  "--headless=new", "--no-sandbox", "--disable-gpu-sandbox",
  "--enable-unsafe-webgpu", "--enable-features=Vulkan",
  "--use-angle=vulkan", "--use-vulkan",
];

function serve(dir) {
  return createServer(async (req, res) => {
    try {
      let p = decodeURIComponent((req.url ?? "/").split("?")[0]);
      if (p === "/favicon.ico") { res.writeHead(204); res.end(); return; }
      if (p === "/") p = "/index.html";
      const body = await readFile(join(dir, normalize(p).replace(/^(\.\.[/\\])+/, "")));
      res.writeHead(200, { "content-type": MIME[extname(p)] ?? "application/octet-stream" });
      res.end(body);
    } catch { res.writeHead(404); res.end("not found"); }
  });
}

async function loop(browser, sim, cfg) {
  const dist = join(REPO, "packages", sim, "web", "dist");
  const server = serve(dist);
  await new Promise((r) => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/${cfg.query ?? ""}`;
  const context = await browser.newContext({ viewport: { width: 1400, height: 1400 } });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log(`  [${sim}] pageerror: ${String(e).slice(0, 200)}`));
  const frames = await mkdtemp(join(tmpdir(), `bp-loop-${sim}-`));
  try {
    // RAF wrapper, identical to make-posters.mjs (park at target, resumable).
    await page.addInitScript(() => {
      window.__posterFrames = 0;
      window.__posterTarget = Infinity;
      window.__origRAF = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => {
        if (window.__posterFrames >= window.__posterTarget) {
          window.__pendingCb = cb;
          return 0;
        }
        window.__posterFrames += 1;
        return window.__origRAF(cb);
      };
    });
    await page.goto(url, { waitUntil: "load", timeout: 30000 });
    await page.waitForFunction(() => window.__bitPhysicsReady === true, undefined, { timeout: 120000, polling: 100 });

    // stage the shot: hide chrome, size the canvas, apply exposure (all
    // BEFORE pumping — frames keep compositing, no forced recomposite).
    await page.evaluate((cfg) => {
      const panel = document.querySelector("[data-bp-panel]");
      if (panel) panel.style.display = "none";
      const boot = document.getElementById("boot");
      if (boot) boot.style.display = "none";
      // cfg.hide: sim-specific chrome selectors (in-page control panels/HUD an
      // embedded lab draws outside the common-web [data-bp-panel] shell). Purely
      // presentational — the sim, its params, and its canvas render are untouched.
      if (cfg.hide) for (const sel of cfg.hide)
        document.querySelectorAll(sel).forEach((el) => el.style.setProperty("display", "none", "important"));
      const canvas = document.querySelector("canvas");
      canvas.style.width = `${cfg.px}px`;
      canvas.style.height = "auto";
      if (cfg.boost) canvas.style.filter = cfg.boost; // exposure, not physics
    }, cfg);

    await page.evaluate((t) => { window.__posterFrames = 0; window.__posterTarget = t; }, cfg.start);
    await page.waitForFunction((t) => window.__posterFrames >= t, cfg.start, { timeout: 240000, polling: 100 });
    await page.waitForTimeout(250);

    const canvas = page.locator("canvas").first();
    for (let i = 0; i < cfg.shots; i += 1) {
      await canvas.screenshot({ path: join(frames, `${String(i).padStart(5, "0")}.png`) });
      // advance gap frames by releasing the parked RAF callback (the
      // make-posters.mjs trail-stack mechanism, verbatim).
      await page.evaluate((gap) => {
        window.__posterTarget += gap;
        const cb = window.__pendingCb;
        window.__pendingCb = null;
        if (cb) window.__origRAF(cb);
      }, cfg.gap);
      await page.waitForFunction(() => window.__pendingCb !== null && window.__pendingCb !== undefined,
        undefined, { timeout: 30000, polling: 50 });
    }

    const out = join(HERE, `${sim}.webm`);
    await run(FFMPEG, [
      "-y", "-framerate", String(cfg.fps), "-i", join(frames, "%05d.png"),
      "-c:v", "libvpx-vp9", "-crf", String(cfg.crf), "-b:v", "0",
      "-pix_fmt", "yuv420p", "-an", "-threads", "1", out,
    ]);
    const { size } = await stat(out);
    console.log(`${sim}: start=${cfg.start} shots=${cfg.shots} gap=${cfg.gap} fps=${cfg.fps} crf=${cfg.crf} -> ${out} (${Math.round(size / 1024)} KB)`);
    return size;
  } catch (e) {
    console.log(`${sim}: FAIL ${String(e).split("\n")[0]}`);
    return 0;
  } finally {
    await rm(frames, { recursive: true, force: true });
    await context.close();
    server.close();
  }
}

const wanted = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN, headless: false, args: ARGS, chromiumSandbox: false,
});
let total = 0;
for (const [sim, cfg] of Object.entries(SIMS)) {
  if (wanted.length && !wanted.includes(sim)) continue;
  total += await loop(browser, sim, cfg);
}
console.log(`total loop bytes: ${Math.round(total / 1024)} KB (budget: 1536 KB/sim, 10240 KB page total)`);
await browser.close();
