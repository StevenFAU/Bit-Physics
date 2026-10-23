// Headless driver for the Grow training spike (rebuild-v2 M0).
//
//   CHROME_BIN=/snap/bin/chromium PLAYWRIGHT_MODULE=<.../playwright/index.mjs> \
//     node packages/neural-ca/train-spike/run-spike.mjs --out <dir> <task> [file]
//
// Tasks: build | info | gradcheck <cases.json> | train <config.json> | alloc <shapes.json>
// The page is built into <out>/dist and served from a local http server.

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
const out = resolve(flag("--out", join(here, "out")));
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

if (task === "build") {
  build();
  process.exit(0);
}
if (!existsSync(join(dist, "index.html"))) build();

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
const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN,
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
page.on("console", (m) => console.log(`[page] ${m.text()}`));
page.on("pageerror", (e) => console.log(`[pageerror] ${e.message}`));
await page.goto(url);
await page.waitForFunction(() => window.__spikeReady === true, null, { timeout: 60000 });

const vramPath = "/sys/class/drm/card1/device/mem_info_vram_used";
const vram = () => (existsSync(vramPath) ? Number(readFileSync(vramPath, "utf8").trim()) : null);
const save = (name, obj) => {
  writeFileSync(join(out, name), JSON.stringify(obj, null, 1));
  console.log(`wrote ${join(out, name)}`);
};
const errors = () => page.evaluate(() => window.__spikeErrors);

try {
  const info = await page.evaluate(() => window.spike.info());
  if (task === "info") save("info.json", info);
  else if (task === "gradcheck") {
    const doc = JSON.parse(readFileSync(file, "utf8"));
    const results = await page.evaluate((c) => window.spike.gradcheck(c), doc.cases);
    save("gradcheck-gpu.json", { adapter: info.adapterId, results, errors: await errors() });
  } else if (task === "train") {
    const cfg = JSON.parse(readFileSync(file, "utf8"));
    const runs = Array.isArray(cfg) ? cfg : [cfg];
    for (const c of runs) {
      const target = readFileSync(resolve(dirname(file), c.targetFile)).toString("base64");
      const before = vram();
      const res = await page.evaluate((x) => window.spike.train(x), { ...c, target });
      save(`train-${c.label}.json`, { adapter: info.adapterId, config: c, vramBefore: before, ...res, errors: await errors() });
    }
  } else if (task === "alloc") {
    const shapes = JSON.parse(readFileSync(file, "utf8"));
    const rows = [];
    for (const s of shapes) {
      const before = vram();
      let r;
      try {
        r = await page.evaluate((x) => window.spike.alloc(x), s);
      } catch (e) {
        rows.push({ shape: s, error: String(e) });
        continue;
      }
      await new Promise((t) => setTimeout(t, 500));
      const after = vram();
      await page.evaluate(() => window.spike.free());
      await new Promise((t) => setTimeout(t, 500));
      rows.push({ shape: s, accounted: r.total, memory: r.memory, vramDelta: before !== null && after !== null ? after - before : null });
      console.log(JSON.stringify(rows[rows.length - 1]));
    }
    save("alloc.json", { adapter: info.adapterId, rows });
  } else {
    console.error(`unknown task ${task}`);
    process.exitCode = 2;
  }
} finally {
  await browser.close();
  server.close();
}
