// Headless DOM-load smoke for a built Stack-B web bundle (Phase-5 web-build).
//
// §6.1 anticipated problem: "Headless browser can't initialize WebGPU: fall back
// to 'page loads, error count = 0'." In THIS environment headless *browser*
// WebGPU is unavailable (Chromium 149 does not expose navigator.gpu even with a
// working native Vulkan stack), so this smoke is the documented §6.1 FALLBACK —
// it proves the Vite bundle loads, its ES module evaluates, and main() runs to
// the WebGPU-init boundary with NO unexpected console/page errors. It does NOT
// validate the GPU compute path; that is validated on the identical committed
// .wgsl by the wgpu-native gate (gpu_gate.py). The browser's real WebGPU path
// is exercised by sub-phase 5.1's cloud Playwright on a WebGPU-capable runner.
//
// Usage:  CHROME_BIN=/path/to/chrome node smoke.mjs <dist-dir>
// Exit 0 = bundle loaded clean (only the expected WebGPU-unavailable notice).

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

// Playwright is a local-only validation dependency (5.1 owns the cloud
// Playwright). Resolve it from PLAYWRIGHT_MODULE (an absolute path to the
// installed package) or the ambient resolver.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");

const distDir = process.argv[2];
if (!distDir) {
  console.error("usage: node smoke.mjs <dist-dir>");
  process.exit(2);
}
const CHROME = process.env.CHROME_BIN;

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".bin": "application/octet-stream",
  ".map": "application/json", ".wasm": "application/wasm",
};

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent((req.url ?? "/").split("?")[0]);
    if (p === "/favicon.ico") { res.writeHead(204); res.end(); return; }
    if (p === "/") p = "/index.html";
    const file = join(distDir, normalize(p).replace(/^(\.\.[/\\])+/, ""));
    const body = await readFile(file);
    res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});

await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const url = `http://localhost:${port}/`;

const errors = [];
const isExpected = (msg) =>
  /WebGPU unavailable|navigator\.gpu|requestAdapter/i.test(msg);

let exitCode = 1;
try {
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: false,
    args: ["--headless=new", "--no-sandbox", "--disable-gpu-sandbox"],
    chromiumSandbox: false,
  });
  const page = await browser.newPage();
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto(url, { waitUntil: "load", timeout: 20000 });
  // Give the module a beat to evaluate main() up to the WebGPU boundary.
  await page.waitForTimeout(1500);
  // Without a GPU adapter the render loop + settings panel never mount (correct
  // degraded behaviour); the canvas is static HTML and the boot notice proves
  // main() ran to the WebGPU boundary. When a real adapter IS present, the
  // ready flag + settings panel mount and are asserted too.
  const domOk = await page.evaluate(() => !!document.querySelector("canvas"));
  const ready = await page.evaluate(() => Boolean(window.__bitPhysicsReady));
  const panelMounted = await page.evaluate(() => !!document.querySelector("[data-bp-panel]"));
  const bootNotice = await page.evaluate(() => (document.getElementById("boot")?.textContent ?? "").length > 0);
  const moduleRan = ready || bootNotice;
  const unexpected = errors.filter((e) => !isExpected(e));

  console.log(`url: ${url}`);
  console.log(`dom canvas present: ${domOk}`);
  console.log(`module evaluated (ready flag or boot notice): ${moduleRan}`);
  console.log(`real-webgpu path (ready flag + panel mounted): ${ready && panelMounted}`);
  console.log(`console/page errors: ${errors.length} (unexpected: ${unexpected.length})`);
  for (const e of errors) console.log(`  ${isExpected(e) ? "[expected]" : "[UNEXPECTED]"} ${e}`);
  const webgpuExpected = errors.some(isExpected);
  console.log(`webgpu-unavailable notice present (expected in this env): ${webgpuExpected}`);
  const pass = domOk && moduleRan && unexpected.length === 0;
  console.log(`SMOKE: ${pass ? "PASS (§6.1 DOM-load fallback; NOT real headless WebGPU)" : "FAIL"}`);
  exitCode = pass ? 0 : 1;
  await browser.close();
} catch (e) {
  console.log(`SMOKE: FAIL — ${String(e).split("\n")[0]}`);
} finally {
  server.close();
}
process.exit(exitCode);
