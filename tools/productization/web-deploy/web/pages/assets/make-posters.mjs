// Landing-page poster generator (Lane B, dispatch P-2).
//
// Photographs each built sim bundle at a deterministic state: default seed
// (42) + a fixed RAF frame count, by wrapping requestAnimationFrame before
// the app boots and freezing the loop once the target frame is reached.
// READ-ONLY with respect to the sims: no sim code, params, or capture path
// is touched — this drives the same built dist the validate gate drives.
//
// Usage:  node make-posters.mjs [sim ...]        (default: all seven)
// Env:    CHROME_BIN (required locally — e.g. /snap/bin/chromium)
//         PLAYWRIGHT_MODULE (same override the capture driver honors)
// Writes <this dir>/<sim>.png. Poster parameters are recorded in the Lane B
// P-2 audit note; regenerate by re-running with the same config below.

import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const pw = await import(
  process.env.PLAYWRIGHT_MODULE ??
    join(dirname(fileURLToPath(import.meta.url)), "../../headless/node_modules/playwright/index.js")
);
const chromium = pw.chromium ?? pw.default.chromium;

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "../../../../../..");

// frames: RAF frames to run before freezing (seed stays the app default, 42).
// px: output CSS pixel width for the canvas screenshot.
// zoom: crop to the bright-content bounding box (sparse point renders read
//   as voids at card size otherwise). pixelated: crisp CA texels, no smoothing.
const SIMS = {
  // P-6: third regen — the P-6 display-only camera-fit (render.wgsl, ratified)
  // removed the P-5 "flock drifts out of the fixed frame" ceiling, so frames
  // can sit at 420 where the murmuration wisps are fully developed. Exposure
  // softened 1.8→1.35 (fit-framed sprites are denser; 1.8 washed the speed
  // palette to white). The auto-fit makes raw framing converge by readback
  // timing, not frame count alone; the zoom-to-content crop normalizes it.
  "boids-3d": { frames: 420, px: 512, zoom: true, zoomTight: 0.62, boost: "brightness(1.35) saturate(1.5)" },
  "neural-ca": { frames: 140, px: 512 },
  physarum: { frames: 650, px: 512 },
  // verification-demo rework (rd2d): render.wgsl v2 (bilinear + relief +
  // in-shader tonemap) regenerated at the same frame count — no boost needed,
  // the shader carries its own exposure; hiDPI boot sizing is dpr=1 headless.
  "reaction-diffusion-2d": { frames: 2200, px: 512 },
  "ising-classical": { frames: 600, px: 512 },
  "mandelbulb-explorer": { frames: 200, px: 360 },
  // verification-demo rework: the v2 render (HDR additive ribbon+glow, GPU-side
  // exposure) needs no photographic rescue — boost drops 1.9→1.1. Frames move
  // 420→2094 (one full auto-orbit revolution, 2π/0.003): the 600-frame
  // trace-in completes, the afterglow settles, and the camera returns to the
  // face-on butterfly.
  "strange-attractors": { frames: 2094, px: 512, zoom: true, zoomTight: 0.62, boost: "brightness(1.1) saturate(1.2)" },
};
// Experiment overrides: POSTER_FRAMES=<n> POSTER_SUFFIX=-x node make-posters.mjs <sim>
const FRAMES_OVERRIDE = process.env.POSTER_FRAMES ? Number(process.env.POSTER_FRAMES) : null;
const SUFFIX = process.env.POSTER_SUFFIX ?? "";

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

async function poster(browser, sim, cfg) {
  const dist = join(REPO, "packages", sim, "web", "dist");
  const server = serve(dist);
  await new Promise((r) => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/`;
  const context = await browser.newContext({ viewport: { width: 1400, height: 1400 } });
  const page = await context.newPage();
  page.on("console", (m) => { if (m.type() === "error") console.log(`  [${sim}] console: ${m.text().slice(0, 200)}`); });
  page.on("pageerror", (e) => console.log(`  [${sim}] pageerror: ${String(e).slice(0, 200)}`));
  try {
    // Freeze the live loop at exactly cfg.frames RAF callbacks (the target is
    // armed only after the app reports ready, so boot frames don't count).
    await page.addInitScript(() => {
      window.__posterFrames = 0;
      window.__posterTarget = Infinity;
      window.__origRAF = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => {
        if (window.__posterFrames >= window.__posterTarget) {
          window.__pendingCb = cb; // park the loop so it can be resumed
          return 0;
        }
        window.__posterFrames += 1;
        return window.__origRAF(cb);
      };
    });

    await page.goto(url, { waitUntil: "load", timeout: 30000 });
    // polling: interval — the default RAF-based polling starves once the
    // wrapper freezes the loop (no main-world RAF -> no compositor frames).
    await page.waitForFunction(() => window.__bitPhysicsReady === true, undefined, { timeout: 120000, polling: 100 });
    await page.evaluate((t) => { window.__posterFrames = 0; window.__posterTarget = t; }, cfg.frames);
    await page.waitForFunction(
      (t) => window.__posterFrames >= t, cfg.frames, { timeout: 240000, polling: 100 });
    await page.waitForTimeout(250); // let the last frame composite

    await page.evaluate((cfg) => {
      const panel = document.querySelector("[data-bp-panel]");
      if (panel) panel.style.display = "none";
      const boot = document.getElementById("boot");
      if (boot) boot.style.display = "none";
      const canvas = document.querySelector("canvas");
      canvas.style.width = `${cfg.px}px`;
      canvas.style.height = "auto";
      if (cfg.pixelated) canvas.style.imageRendering = "pixelated";
      if (cfg.boost) canvas.style.filter = cfg.boost; // exposure, not physics
    }, cfg);
    // NOTE: do NOT force a recomposite here — a composited frame without a
    // fresh app present drops the WebGPU canvas texture (blank poster).

    const out = join(HERE, `${sim}${SUFFIX}.png`);
    if (cfg.trail) {
      // Long exposure: stack element screenshots taken cfg.trail.gap frames
      // apart with additive blending — purely photographic motion trails.
      const shots = [];
      for (let i = 0; i < cfg.trail.shots; i += 1) {
        shots.push((await page.locator("canvas").first().screenshot()).toString("base64"));
        await page.evaluate((gap) => {
          window.__posterTarget += gap;
          const cb = window.__pendingCb;
          window.__pendingCb = null;
          if (cb) window.__origRAF(cb);
        }, cfg.trail.gap);
        await page.waitForFunction(() => window.__pendingCb !== null && window.__pendingCb !== undefined,
          undefined, { timeout: 30000, polling: 50 });
      }
      const dataUrl = await page.evaluate(async ({ frames, px, boost }) => {
        const imgs = [];
        for (const b of frames) {
          const img = new Image();
          await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = `data:image/png;base64,${b}`; });
          imgs.push(img);
        }
        const t = document.createElement("canvas");
        t.width = imgs[0].width; t.height = imgs[0].height;
        const ctx = t.getContext("2d");
        ctx.drawImage(imgs[0], 0, 0);
        ctx.globalCompositeOperation = "lighten"; // per-pixel max: unions dots without summing the background to white
        for (const img of imgs.slice(1)) ctx.drawImage(img, 0, 0);
        // crop to bright content (pad 8%), then render at px with exposure
        const d = ctx.getImageData(0, 0, t.width, t.height).data;
        let x0 = t.width, y0 = t.height, x1 = 0, y1 = 0;
        for (let y = 0; y < t.height; y += 1)
          for (let x = 0; x < t.width; x += 1) {
            const i = (y * t.width + x) * 4;
            if (d[i] + d[i + 1] + d[i + 2] > 54) {
              if (x < x0) x0 = x; if (x > x1) x1 = x;
              if (y < y0) y0 = y; if (y > y1) y1 = y;
            }
          }
        const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.08);
        const side = Math.min(Math.max(x1 - x0, y1 - y0) + 2 * pad, Math.min(t.width, t.height));
        const bx = Math.min(Math.max((x0 + x1) / 2 - side / 2, 0), t.width - side);
        const by = Math.min(Math.max((y0 + y1) / 2 - side / 2, 0), t.height - side);
        const o = document.createElement("canvas");
        o.width = px; o.height = px;
        const octx = o.getContext("2d");
        if (boost) octx.filter = boost;
        octx.drawImage(t, bx, by, side, side, 0, 0, px, px);
        return o.toDataURL("image/png");
      }, { frames: shots, px: cfg.px, boost: cfg.boost ?? null });
      await writeFile(out, Buffer.from(dataUrl.split(",")[1], "base64"));
    } else if (cfg.zoom) {
      // The WebGPU canvas bitmap isn't 2D-drawable post-present, so find the
      // bright-content bbox by decoding a first screenshot of the element
      // (CSS-pixel coords), then re-shoot a scaled clip around it.
      const probe = await page.locator("canvas").first().screenshot();
      const bbox = await page.evaluate(async ({ dataUrl, px, tight }) => {
        const img = new Image();
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
        const t = document.createElement("canvas");
        t.width = img.width; t.height = img.height;
        const ctx = t.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const d = ctx.getImageData(0, 0, t.width, t.height).data;
        let x0 = t.width, y0 = t.height, x1 = 0, y1 = 0, hits = 0;
        for (let y = 0; y < t.height; y += 1) {
          for (let x = 0; x < t.width; x += 1) {
            const i = (y * t.width + x) * 4;
            if (d[i] + d[i + 1] + d[i + 2] > 54) {
              hits += 1;
              if (x < x0) x0 = x; if (x > x1) x1 = x;
              if (y < y0) y0 = y; if (y > y1) y1 = y;
            }
          }
        }
        if (hits < 16) return null; // empty frame
        // pad 8%, optionally tighten, and square the box around its center
        const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.08);
        const side = Math.min(
          Math.round((Math.max(x1 - x0, y1 - y0) + 2 * pad) * (tight ?? 1)),
          Math.min(t.width, t.height));
        const bx = Math.min(Math.max((x0 + x1) / 2 - side / 2, 0), t.width - side);
        const by = Math.min(Math.max((y0 + y1) / 2 - side / 2, 0), t.height - side);
        // enlarge the canvas so the bbox renders at ~px CSS pixels (cap 4x),
        // and translate it so the bbox sits at the viewport origin — fixed
        // elements can't be screenshot beyond the viewport
        const f = Math.min(px / side, 4);
        const c = document.querySelector("canvas");
        const cssW = c.getBoundingClientRect().width;
        c.style.position = "fixed";
        c.style.left = `${-bx * f}px`;
        c.style.top = `${-by * f}px`;
        c.style.width = `${cssW * f}px`;
        c.style.height = "auto";
        return { x: 0, y: 0, side: side * f };
      }, { dataUrl: `data:image/png;base64,${probe.toString("base64")}`, px: cfg.px, tight: cfg.zoomTight });
      if (bbox) {
        console.log(`  [${sim}] zoom clip ${JSON.stringify(bbox)}`);
        try {
          await page.screenshot({
            path: out,
            clip: { x: bbox.x, y: bbox.y, width: bbox.side, height: bbox.side },
          });
        } catch (e) {
          console.log(`  [${sim}] clip failed (${String(e).split("\n")[0]}) — element fallback`);
          await page.locator("canvas").first().screenshot({ path: out });
        }
      } else {
        console.log(`  [${sim}] zoom bbox unavailable — falling back to full canvas`);
        await page.locator("canvas").first().screenshot({ path: out });
      }
    } else {
      await page.locator("canvas").first().screenshot({ path: out });
    }
    const { size } = await import("node:fs").then((fs) =>
      fs.promises.stat(out));
    console.log(`${sim}: frames=${cfg.frames} -> ${out} (${Math.round(size / 1024)} KB)`);
  } catch (e) {
    const state = await page.evaluate(() => ({
      ready: window.__bitPhysicsReady, frames: window.__posterFrames,
      gpu: !!navigator.gpu, boot: document.getElementById("boot")?.textContent ?? null,
    })).catch(() => null);
    console.log(`${sim}: FAIL ${String(e).split("\n")[0]} state=${JSON.stringify(state)}`);
  } finally {
    await context.close();
    server.close();
  }
}

const wanted = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN, headless: false, args: ARGS, chromiumSandbox: false,
});
for (const [sim, cfg] of Object.entries(SIMS)) {
  if (wanted.length && !wanted.includes(sim)) continue;
  await poster(browser, sim, FRAMES_OVERRIDE ? { ...cfg, frames: FRAMES_OVERRIDE } : cfg);
}
await browser.close();
