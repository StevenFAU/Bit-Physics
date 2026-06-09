// Phase-5 web-deploy — headless browser-WebGPU capture driver (sub-phase 5.1).
//
// This is the gate the web-build track DEFERRED to 5.1: it loads a built Stack-B
// bundle in headless Chromium with WebGPU enabled, asserts the WebGPU path
// ACTUALLY engaged (navigator.gpu + a real adapter + the settings panel mounted —
// the apps have NO Canvas2D/WebGL fallback, so a mounted panel == WebGPU booted),
// drives the capture-export hook, and extracts the browser-emitted capture for
// `verify.py` to re-apply the sim's own established gate.
//
// WebGPU availability is environment-dependent. Where `navigator.gpu` is absent
// (e.g. this dev box under snap confinement — probe § 4) the driver exits 42
// (WEBGPU_UNAVAILABLE) so the pipeline can report the gate as deferred-to-CI
// locally and FAIL in CI (which must provide a WebGPU adapter via Mesa lavapipe).
// It NEVER degrades to a DOM-load pass standing in for the browser-WebGPU gate.
//
// Usage:
//   node driver.mjs <dist-dir> <sim> <gate_kind> <out-dir> [--runs N]
// Writes <out-dir>/capture-<i>.json (one per run; new_canonical needs --runs 2).
// CHROME_BIN overrides the executable; PLAYWRIGHT_MODULE overrides the resolver.

import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;

const [distDir, sim, gateKind, outDir] = process.argv.slice(2);
const runsArg = process.argv.indexOf("--runs");
const RUNS = runsArg > -1 ? Number(process.argv[runsArg + 1]) : 1;
if (!distDir || !sim || !gateKind || !outDir) {
  console.error("usage: node driver.mjs <dist-dir> <sim> <gate_kind> <out-dir> [--runs N]");
  process.exit(2);
}

const WEBGPU_UNAVAILABLE = 42;
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".bin": "application/octet-stream",
  ".map": "application/json", ".wasm": "application/wasm",
};

// WebGPU-on-headless-Chromium flags. CI provides Mesa lavapipe (software Vulkan);
// Dawn brings WebGPU up over it — the REAL browser WebGPU path, not WebGL.
const ARGS = [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu-sandbox",
  "--enable-unsafe-webgpu",
  "--enable-features=Vulkan",
  "--use-angle=vulkan",
  "--use-vulkan",
];

function serve(dir) {
  const server = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent((req.url ?? "/").split("?")[0]);
      if (p === "/favicon.ico") { res.writeHead(204); res.end(); return; }
      if (p === "/") p = "/index.html";
      const file = join(dir, normalize(p).replace(/^(\.\.[/\\])+/, ""));
      const body = await readFile(file);
      res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
      res.end(body);
    } catch { res.writeHead(404); res.end("not found"); }
  });
  return server;
}

async function captureOnce(browser, baseUrl, runIdx) {
  const context = await browser.newContext();  // fresh profile → genuine run-twice
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  await page.goto(baseUrl, { waitUntil: "load", timeout: 30000 });

  // Hard gate: is browser WebGPU actually present?
  const gpu = await page.evaluate(async () => {
    if (!navigator.gpu) return { present: false };
    try {
      const a = await navigator.gpu.requestAdapter();
      return { present: true, adapter: !!a, info: a ? (a.info ?? {}) : null };
    } catch (e) { return { present: true, adapter: false, err: String(e) }; }
  });
  if (!gpu.present || !gpu.adapter) {
    await context.close();
    return { webgpu: false, gpu };
  }

  // Wait for the app to boot to the WebGPU-ready state (panel mounts only on the
  // successful WebGPU path — proof the WebGPU path engaged, not a fallback).
  await page.waitForFunction(() => window.__bitPhysicsReady === true, { timeout: 30000 });
  const panelMounted = await page.evaluate(() => !!document.querySelector("[data-bp-panel]"));
  if (!panelMounted) {
    await context.close();
    throw new Error("settings panel did not mount — WebGPU path did not fully engage");
  }

  // Drive the capture-export hook and wait for the browser to publish the capture.
  await page.evaluate(() => { window.__bitPhysicsCaptureReady = false; });
  await page.click('[data-bp="capture"]');
  await page.waitForFunction(() => window.__bitPhysicsCaptureReady === true, { timeout: 300000 });
  const bundle = await page.evaluate(() => window.__bitPhysicsCapture);
  if (!bundle || !bundle.steps || bundle.steps.length === 0) {
    await context.close();
    throw new Error("capture bundle empty");
  }

  const unexpected = errors.filter((e) => !/WebGPU unavailable|navigator\.gpu|requestAdapter/i.test(e));
  if (unexpected.length) {
    await context.close();
    throw new Error(`console/page errors: ${unexpected.join(" | ")}`);
  }

  await mkdir(outDir, { recursive: true });
  const dest = join(outDir, `capture-${runIdx}.json`);
  await writeFile(dest, JSON.stringify(bundle));
  await context.close();
  return { webgpu: true, dest, adapter: gpu.info, frames: bundle.steps.length };
}

const server = serve(distDir);
await new Promise((r) => server.listen(0, r));
const baseUrl = `http://localhost:${server.address().port}/`;

let exitCode = 1;
try {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN, headless: false, args: ARGS, chromiumSandbox: false,
  });
  console.log(`driver: ${sim} (${gateKind}) — ${RUNS} run(s) @ ${baseUrl}`);
  let webgpuMissing = false;
  for (let i = 0; i < RUNS; i += 1) {
    const r = await captureOnce(browser, baseUrl, i);
    if (r.webgpu === false) {
      console.log(`WEBGPU_UNAVAILABLE: navigator.gpu/adapter absent (${JSON.stringify(r.gpu)})`);
      webgpuMissing = true;
      break;
    }
    console.log(`  run ${i}: capture -> ${r.dest} (frames=${r.frames}, adapter=${JSON.stringify(r.adapter)})`);
  }
  await browser.close();
  exitCode = webgpuMissing ? WEBGPU_UNAVAILABLE : 0;
} catch (e) {
  console.log(`driver FAIL — ${String(e).split("\n")[0]}`);
  exitCode = 1;
} finally {
  server.close();
}
process.exit(exitCode);
