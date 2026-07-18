// Splash-reel clip generator (full-screen ambient demo reel for splash.html).
//
// Films FEATURE clips — one per (sim, scene/look) pair — under the same
// deterministic capture discipline as make-loops.mjs: default seed (42) +
// declared RAF frame ranges via the poster RAF wrapper, one canvas shot every
// `gap` frames, single-threaded fixed-CRF VP9 encode. READ-ONLY with respect
// to the sims: scenes and looks are selected either through each sim's own
// boot query params (?preset=…) or by driving its own UI (panel preset chips
// / in-page lab buttons and selects) exactly as a user would — no sim code,
// params, or capture path is touched.
//
// Differences from the card loops (declared):
//   px 1024 (full-screen cover source, vs 512 cards), ~400 shots (~13 s at
//   30 fps, vs 10 s), and a `stage` op list per clip. Stage ops FAIL LOUD:
//   a missing chip/select aborts that clip rather than silently filming the
//   wrong scene.
//
// Usage:  node make-splash.mjs [sim ...]     (default: every clip; a sim name
//         films every clip of that sim; an id like sph-water--whirlpool films
//         one clip). Existing outputs are SKIPPED unless --force.
// Env:    CHROME_BIN (required locally), PLAYWRIGHT_MODULE, FFMPEG.
// Writes  <this dir>/splash/<sim>--<id>.webm and splices the manifest of all
//         PRESENT clips into ../splash.html between the
//         __SPLASH_MANIFEST_START__ / __SPLASH_MANIFEST_END__ markers.
// Budgets (declared): ≤2 MB per clip; sizes printed per clip + total.

import { createServer } from "node:http";
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
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
const OUT_DIR = join(HERE, "splash");
const SPLASH_HTML = join(HERE, "../splash.html");
const REPO = join(HERE, "../../../../../..");

// Stage ops (run after ready + chrome hidden, before the frame pump):
//   { click: "<css>" }        — click the first match (panel chips:
//                               [data-bp2="preset:<label>"]; lab buttons)
//   { pick: "<regex>" }       — find the <select> with an <option> whose text
//                               or value matches, select it, fire change+input
// Per-clip fields mirror make-loops.mjs: start/shots/gap/fps/px/crf/boost/hide,
// plus query (boot search string), stage, and href (defaults to ./sims/<sim>/,
// query clips deep-link their preset).
const PX = 1024;
const SHOTS = 400;
const FPS = 30;

// hide lists (verbatim from make-loops.mjs where the sim has one)
const HIDE_B2D = ["#topbar", "#hint", "#playstats", "#modeflag", "#panel", "#overlay"];
const HIDE_HEAT = [".he-explain", ".he-verify"];
const HIDE_SW = [".sw-explain", ".sw-verify"];
const HIDE_PFF = [".pf-explain", ".pf-verify", "#hud"];
const HIDE_FO = [".fo-explain", ".fo-verify"];
const HIDE_LM = [".lm-explain", ".lm-verify"];

const chip = (label) => ({ click: `[data-bp2="preset:${label}"]` });

const CLIPS = [
  // ---- boids-2d: the v4 lab's regimes × field readouts (user-facing UI,
  // driven via the lab's own #presets / #colorSeg buttons). crf 62 + 340
  // shots: the full-detail comet flock is high-entropy at 1024 px — crf 60
  // at 400 shots measured 3.1 MB, past the 2 MB clip budget.
  { sim: "boids-2d", id: "flock", start: 120, gap: 2, crf: 63, shots: 300, hide: HIDE_B2D },
  { sim: "boids-2d", id: "murmuration-order", start: 150, gap: 2, crf: 62, shots: 340, hide: HIDE_B2D,
    stage: [{ click: '#presets button[data-p="murmuration"]' }, { click: '#colorSeg button[data-cm="1"]' }] },
  { sim: "boids-2d", id: "mill-speed", start: 200, gap: 2, crf: 62, shots: 340, hide: HIDE_B2D,
    stage: [{ click: '#presets button[data-p="mill"]' }, { click: '#colorSeg button[data-cm="2"]' }] },
  { sim: "boids-2d", id: "fluiddrift-curl", start: 200, gap: 2, crf: 62, shots: 340, hide: HIDE_B2D,
    stage: [{ click: '#presets button[data-p="fluiddrift"]' }, { click: '#colorSeg button[data-cm="5"]' }] },
  { sim: "boids-2d", id: "swarm-density", start: 150, gap: 2, crf: 63, shots: 300, hide: HIDE_B2D,
    stage: [{ click: '#presets button[data-p="swarm"]' }, { click: '#colorSeg button[data-cm="3"]' }] },

  // ---- sph-water: scene chips + the view selects (colormap / render mode).
  // crf 56: dense particle spheres at 1024 px measured 3.0 MB at crf 52.
  // whirlpool start 600: the stirrer needs the spin-up before the funnel reads.
  { sim: "sph-water", id: "whirlpool-turbo", start: 600, gap: 2, crf: 56,
    stage: [chip("whirlpool"), { pick: "^particles$" }, { pick: "^turbo$" }] },
  { sim: "sph-water", id: "piston-inferno", start: 40, gap: 1, crf: 56,
    stage: [chip("piston"), { pick: "^particles$" }, { pick: "^inferno$" }] },
  { sim: "sph-water", id: "double-dam", start: 30, gap: 1, crf: 54,
    stage: [chip("double dam")] },

  // ---- boids-3d: native ?preset= boot params (engine presets × color modes)
  // starling/storm: per-bird color modes are confetti-entropic at 1024 px —
  // crf 54 measured 7.2 / 2.4 MB; 62/60 + 340 shots hold the 2 MB budget.
  { sim: "boids-3d", id: "starling-speed", query: "?preset=starling&n=32768&color=speed",
    start: 60, gap: 2, crf: 62, shots: 340, boost: "brightness(1.35) saturate(1.5)" },
  { sim: "boids-3d", id: "storm-alert", query: "?preset=storm&n=65536&color=alert",
    start: 60, gap: 2, crf: 60, shots: 340, boost: "brightness(1.35) saturate(1.5)" },
  { sim: "boids-3d", id: "landmark", query: "?preset=landmark&n=32768&color=natural",
    start: 90, gap: 2, crf: 54, boost: "brightness(1.35) saturate(1.5)" },

  // ---- pic-flip: native ?preset= boot params
  { sim: "pic-flip", id: "waterfall", query: "?preset=waterfall", start: 60, gap: 1, crf: 52 },
  { sim: "pic-flip", id: "double-dam-flip", query: "?preset=double-dam&mode=flip", start: 20, gap: 1, crf: 52 },
  // rotating-disk: CUT — the disk sheet renders as near-invisible point specks
  // at 1024 px (measured 85 KB ≈ static black).

  // ---- fdtd-optics: native ?preset= scenes
  { sim: "fdtd-optics", id: "double-slit", query: "?preset=double-slit", start: 120, gap: 2, crf: 50, hide: HIDE_FO },
  { sim: "fdtd-optics", id: "lens", query: "?preset=lens", start: 120, gap: 2, crf: 50, hide: HIDE_FO },
  // kerr: CUT — settled self-focused beam is near-static (35 KB).
  { sim: "fdtd-optics", id: "mie", query: "?preset=mie", start: 120, gap: 2, crf: 50, hide: HIDE_FO },

  // ---- lbm-multiphase: native ?preset= scenes
  { sim: "lbm-multiphase", id: "spinodal", query: "?preset=spinodal", start: 30, gap: 2, crf: 50, hide: HIDE_LM },
  { sim: "lbm-multiphase", id: "rising-bubble", query: "?preset=rising-bubble", start: 40, gap: 2, crf: 50, hide: HIDE_LM },
  { sim: "lbm-multiphase", id: "capillary-race", query: "?preset=capillary-race", start: 40, gap: 2, crf: 50, hide: HIDE_LM },

  // ---- signal-workbench: native ?preset= presets
  { sim: "signal-workbench", id: "chirp", query: "?preset=chirp", start: 90, gap: 2, crf: 50, hide: HIDE_SW },
  // fm CUT (settled Bessel stems are a still, 45 KB); persist CUT (the
  // phosphor films near-black without a live beam driving it, 53 KB).

  // ---- schrodinger-smoke: scene chips (ISF vortex zoo). gap 1 + early start:
  // the dye keeps its ring/knot structure only for the first few hundred
  // frames before diffusing to a blob (measured at gap 2). vortex-street CUT —
  // tracer confetti buries the street (12 MB of noise).
  { sim: "schrodinger-smoke", id: "leapfrog", start: 30, gap: 1, crf: 54, stage: [chip("leapfrog")] },
  { sim: "schrodinger-smoke", id: "trefoil", start: 30, gap: 1, crf: 54, stage: [chip("trefoil")] },

  // ---- eulerian-smoke: ink + fireworks CUT (sparse near-static dots in the
  // filmable window); Kármán CUT (still laminar even at frames 900–2100 —
  // shedding onset is beyond a filmable pump). The plume carries the sim.
  { sim: "eulerian-smoke", id: "plume", start: 150, gap: 2, crf: 52,
    boost: "brightness(1.6) saturate(1.6)" },

  // ---- curl-noise: template chips
  { sim: "curl-noise", id: "abc-flow", start: 120, gap: 2, crf: 52, stage: [chip("ABC flow")] },
  { sim: "curl-noise", id: "smoke-ring", start: 120, gap: 2, crf: 52, stage: [chip("Smoke ring / plume")] },

  // ---- heat-equation: laser CUT (white-field plate view strobes the dark
  // reel); the thermal-camera FLIR view of the same physics films dark.
  { sim: "heat-equation", id: "thermal", start: 150, gap: 4, crf: 50, hide: HIDE_HEAT,
    stage: [chip("thermal camera")] },

  // ---- mpm-multimaterial: preset chips
  { sim: "mpm-multimaterial", id: "snowball", start: 10, gap: 1, crf: 52, stage: [chip("snowball")] },
  { sim: "mpm-multimaterial", id: "snow-globe", start: 10, gap: 1, crf: 52, stage: [chip("snow globe")] },

  // ---- sph-multiphase: preset chips
  { sim: "sph-multiphase", id: "rayleigh-taylor", start: 60, gap: 1, crf: 52,
    stage: [chip("Rayleigh–Taylor")] },
  { sim: "sph-multiphase", id: "coalescence", start: 60, gap: 1, crf: 52,
    stage: [chip("coalescence lab")] },

  // ---- reaction-diffusion-2d: regime chips (timelapse gap, card precedent)
  { sim: "reaction-diffusion-2d", id: "solitons", start: 300, gap: 6, crf: 50, stage: [chip("solitons")] },
  { sim: "reaction-diffusion-2d", id: "coral", start: 300, gap: 6, crf: 50, stage: [chip("coral")] },

  // ---- strange-attractors: other systems' boot trace-in (system select)
  { sim: "strange-attractors", id: "aizawa", start: 1, gap: 2, crf: 52,
    boost: "brightness(1.1) saturate(1.2)", stage: [{ pick: "^Aizawa$" }] },
  { sim: "strange-attractors", id: "halvorsen", start: 1, gap: 2, crf: 52,
    boost: "brightness(1.1) saturate(1.2)", stage: [{ pick: "^Halvorsen$" }] },

  // ---- phase-field-fracture: scene chips
  // 250 shots: the crack pair hooks and arrests early — 400 shots left 8 s of
  // arrested stillness on the tail.
  { sim: "phase-field-fracture", id: "en-passant", start: 30, gap: 2, crf: 50, shots: 250, hide: HIDE_PFF,
    stage: [chip("en-passant")] },

  // ---- physarum: later window than the card — the coarsened transport network
  { sim: "physarum", id: "network", start: 400, gap: 2, crf: 52 },

  // neural-ca: CUT — the organism renders on a white field, which strobes the
  // dark ambient reel and washes out the typed line (dark-render follow-up).
];

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

function outName(clip) { return `${clip.sim}--${clip.id}.webm`; }

async function film(browser, clip) {
  const dist = join(REPO, "packages", clip.sim, "web", "dist");
  const server = serve(dist);
  await new Promise((r) => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/${clip.query ?? ""}`;
  const context = await browser.newContext({ viewport: { width: 1400, height: 1400 } });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log(`  [${clip.sim}--${clip.id}] pageerror: ${String(e).slice(0, 200)}`));
  const frames = await mkdtemp(join(tmpdir(), `bp-splash-${clip.sim}-${clip.id}-`));
  try {
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

    // stage the shot: hide chrome, size the canvas, apply exposure
    await page.evaluate((cfg) => {
      const panel = document.querySelector("[data-bp-panel]");
      if (panel) panel.style.display = "none";
      const boot = document.getElementById("boot");
      if (boot) boot.style.display = "none";
      if (cfg.hide) for (const sel of cfg.hide)
        document.querySelectorAll(sel).forEach((el) => el.style.setProperty("display", "none", "important"));
      const canvas = document.querySelector("canvas");
      canvas.style.width = `${cfg.px}px`;
      canvas.style.height = "auto";
      if (cfg.boost) canvas.style.filter = cfg.boost;
    }, { hide: clip.hide, px: PX, boost: clip.boost });

    // scene/look staging via the sim's own UI — FAIL LOUD on a missing target
    for (const op of clip.stage ?? []) {
      const ok = await page.evaluate((o) => {
        if (o.click) {
          const el = document.querySelector(o.click);
          if (!el) return false;
          el.click();
          return true;
        }
        if (o.pick) {
          const re = new RegExp(o.pick);
          for (const sel of document.querySelectorAll("select")) {
            const opt = [...sel.options].find((x) => re.test(x.textContent.trim()) || re.test(x.value));
            if (!opt) continue;
            sel.value = opt.value;
            sel.dispatchEvent(new Event("input", { bubbles: true }));
            sel.dispatchEvent(new Event("change", { bubbles: true }));
            return true;
          }
          return false;
        }
        return false;
      }, op);
      if (!ok) throw new Error(`stage op failed (no target): ${JSON.stringify(op)}`);
      await page.waitForTimeout(120);
    }

    await page.evaluate((t) => { window.__posterFrames = 0; window.__posterTarget = t; }, clip.start);
    await page.waitForFunction((t) => window.__posterFrames >= t, clip.start, { timeout: 240000, polling: 100 });
    await page.waitForTimeout(250);

    const canvas = page.locator("canvas").first();
    const shots = clip.shots ?? SHOTS;
    for (let i = 0; i < shots; i += 1) {
      await canvas.screenshot({ path: join(frames, `${String(i).padStart(5, "0")}.png`) });
      await page.evaluate((gap) => {
        window.__posterTarget += gap;
        const cb = window.__pendingCb;
        window.__pendingCb = null;
        if (cb) window.__origRAF(cb);
      }, clip.gap);
      await page.waitForFunction(() => window.__pendingCb !== null && window.__pendingCb !== undefined,
        undefined, { timeout: 30000, polling: 50 });
    }

    const out = join(OUT_DIR, outName(clip));
    await run(FFMPEG, [
      "-y", "-framerate", String(FPS), "-i", join(frames, "%05d.png"),
      "-c:v", "libvpx-vp9", "-crf", String(clip.crf), "-b:v", "0",
      "-pix_fmt", "yuv420p", "-an", "-threads", "1", "-cpu-used", "2", out,
    ]);
    const { size } = await stat(out);
    console.log(`${outName(clip)}: start=${clip.start} gap=${clip.gap} crf=${clip.crf} -> ${Math.round(size / 1024)} KB${size > 2 * 1024 * 1024 ? "  ** OVER 2 MB BUDGET **" : ""}`);
    return size;
  } catch (e) {
    console.log(`${outName(clip)}: FAIL ${String(e).split("\n")[0]}`);
    return 0;
  } finally {
    await rm(frames, { recursive: true, force: true });
    await context.close();
    server.close();
  }
}

// splice the manifest of all PRESENT clips into splash.html
async function spliceManifest() {
  const present = new Set(await readdir(OUT_DIR).catch(() => []));
  const rows = CLIPS.filter((c) => present.has(outName(c))).map((c) => {
    const href = c.query ? `./sims/${c.sim}/${c.query}` : `./sims/${c.sim}/`;
    return `  { sim: ${JSON.stringify(c.sim)}, name: ${JSON.stringify(c.sim)}, href: ${JSON.stringify(href)}, src: ${JSON.stringify(`./assets/splash/${outName(c)}`)} },`;
  });
  const html = await readFile(SPLASH_HTML, "utf8");
  const START = "/* __SPLASH_MANIFEST_START__";
  const END = "/* __SPLASH_MANIFEST_END__ */";
  const a = html.indexOf(START);
  const b = html.indexOf(END);
  if (a === -1 || b === -1) throw new Error("splash.html manifest markers not found");
  const startLineEnd = html.indexOf("\n", a);
  const next = html.slice(0, startLineEnd + 1) + rows.join("\n") + "\n  " + html.slice(b);
  await writeFile(SPLASH_HTML, next);
  console.log(`manifest: ${rows.length} clips spliced into splash.html`);
}

const wanted = process.argv.slice(2).filter((a) => a !== "--force");
const force = process.argv.includes("--force");
await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN, headless: false, args: ARGS, chromiumSandbox: false,
});
let total = 0;
for (const clip of CLIPS) {
  const key = `${clip.sim}--${clip.id}`;
  if (wanted.length && !wanted.includes(clip.sim) && !wanted.includes(key)) continue;
  if (!force && (await stat(join(OUT_DIR, outName(clip))).catch(() => null))) {
    total += (await stat(join(OUT_DIR, outName(clip)))).size;
    console.log(`${outName(clip)}: exists, skipped`);
    continue;
  }
  total += await film(browser, clip);
}
await browser.close();
await spliceManifest();
console.log(`total splash bytes: ${Math.round(total / 1024)} KB across present clips`);
