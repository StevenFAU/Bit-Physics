// Headless driver for the Materials PB-MPM 3D spike (rebuild-v2 M0).
//
//   CHROME_BIN=/snap/bin/chromium PLAYWRIGHT_MODULE=<.../playwright/index.mjs> \
//     node packages/mpm-multimaterial/pbmpm-spike/run-spike.mjs --out <dir> <task> [file]
//
// Tasks: build | info | svdcheck | run <runs.json> | determinism <run.json>
// --swiftshader: Playwright's bundled Chromium with the Vulkan ICD pointed at
// lavapipe, which comes up on SwiftShader here (see results/README notes).
// Screenshots: the page awaits window.__shot(name) at each requested time.

import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, extname, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (k, d) => {
  const i = args.indexOf(k);
  if (i < 0) return d;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const bool = (k) => {
  const i = args.indexOf(k);
  if (i < 0) return false;
  args.splice(i, 1);
  return true;
};
const out = resolve(flag("--out", join(here, "out")));
const swiftshader = bool("--swiftshader");
const rebuild = bool("--rebuild");
const task = args[0];
const file = args[1];
mkdirSync(out, { recursive: true });
const dist = join(out, "dist");

function build() {
  const r = spawnSync("npx", ["vite", "build", "--config", join(here, "vite.config.ts"), "--logLevel", "warn"], {
    stdio: "inherit",
    env: { ...process.env, SPIKE_OUT: dist },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (task === "build" || rebuild || !existsSync(join(dist, "index.html"))) build();
if (task === "build") process.exit(0);

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
const server = createServer((req, res) => {
  const p = new URL(req.url, "http://x").pathname;
  const f = join(dist, p === "/" ? "index.html" : p);
  if (!f.startsWith(dist) || !existsSync(f)) {
    res.writeHead(p === "/favicon.ico" ? 204 : 404);
    res.end();
    return;
  }
  res.writeHead(200, { "content-type": TYPES[extname(f)] ?? "application/octet-stream" });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/`;

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const lvp = "/usr/share/vulkan/icd.d/lvp_icd.json";
const browser = await chromium.launch({
  ...(swiftshader ? {} : { executablePath: process.env.CHROME_BIN }),
  env: swiftshader ? { ...process.env, VK_DRIVER_FILES: lvp, VK_ICD_FILENAMES: lvp } : process.env,
  args: [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu-sandbox",
    "--enable-unsafe-webgpu",
    "--enable-features=Vulkan",
    "--use-angle=vulkan",
    "--use-vulkan",
    "--enable-webgpu-developer-features",
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") console.log(`[page:${m.type()}] ${m.text()}`);
});
page.on("pageerror", (e) => console.log(`[pageerror] ${e.message}`));
mkdirSync(join(out, "shots"), { recursive: true });
await page.exposeFunction("__shot", async (name) => {
  await page.screenshot({ path: join(out, "shots", `${name}.png`), clip: { x: 0, y: 0, width: 1280, height: 720 } });
});
await page.goto(url);
await page.waitForFunction(() => window.__spikeReady === true, null, { timeout: 60000 });

const save = (name, obj) => {
  writeFileSync(join(out, name), JSON.stringify(obj, null, 1));
  console.log(`wrote ${join(out, name)}`);
};

try {
  const info = await page.evaluate(() => window.spike.info());
  console.log(`adapter: ${info.adapterId} timestamp=${info.timestamp}`);
  if (task === "info") save("info.json", info);
  else if (task === "svdcheck") {
    const r = await page.evaluate(() => window.spike.svdcheck(4096));
    save("svdcheck.json", { adapter: info.adapterId, ...r });
  } else if (task === "run") {
    const cfgs = JSON.parse(readFileSync(file, "utf8"));
    for (const c of Array.isArray(cfgs) ? cfgs : [cfgs]) {
      const t0 = Date.now();
      const r = await page.evaluate((x) => window.spike.run(x), c);
      const label = c.label ?? c.scene;
      save(`run-${label}.json`, r);
      const last = r.timeline[r.timeline.length - 1] ?? {};
      const worst = r.timeline.reduce((a, s) => ({ nf: Math.max(a.nf, s.nonFinite), v: Math.max(a.v, s.maxSpeed), fast: Math.max(a.fast, s.fast) }), { nf: 0, v: 0, fast: 0 });
      console.log(`${label}: n=${r.n} wall=${((Date.now() - t0) / 1000).toFixed(1)}s nonFinite(max)=${worst.nf} maxSpeed=${worst.v.toFixed(0)} cells/s fast(max)=${worst.fast} lastMaxSpeed=${(last.maxSpeed ?? 0).toFixed(1)} errors=${r.errors.length}${r.bench ? ` bench=${JSON.stringify(r.bench)}` : ""}`);
    }
  } else if (task === "determinism") {
    const c = JSON.parse(readFileSync(file, "utf8"));
    const r = await page.evaluate((x) => window.spike.determinism(x), c);
    save(`determinism-${c.label ?? c.scene}.json`, { adapter: info.adapterId, config: c, ...r });
    console.log(JSON.stringify(r));
  } else {
    console.error(`unknown task ${task}`);
    process.exitCode = 2;
  }
} finally {
  await browser.close();
  server.close();
}
