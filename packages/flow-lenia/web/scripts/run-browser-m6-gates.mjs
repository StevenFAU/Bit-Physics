import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";

const playwright = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = playwright.chromium ?? playwright.default.chromium;
const webRoot = resolve(import.meta.dirname, "..");
const distDir = resolve(process.argv[2] ?? join(webRoot, "dist"));
const output = resolve(process.argv[3] ?? join(webRoot, "artifacts", "m6-browser-release-gates.json"));
const screenshot = resolve(process.argv[4] ?? "/tmp/flow-lenia-m6-arena-ui.png");
const canonicalOutput = resolve(process.argv[5] ?? join(webRoot, "artifacts", "m6-canonical-capture-index.json"));
const timeout = Number(process.env.FLOW_LENIA_M6_TIMEOUT_MS ?? "1200000");
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".map": "application/json", ".woff2": "font/woff2" };

const server = createServer(async (request, response) => {
  try { let path = decodeURIComponent((request.url ?? "/").split("?")[0]); if (path === "/favicon.ico") { response.writeHead(204); response.end(); return; } if (path === "/") path = "/index.html"; const file = join(distDir, normalize(path).replace(/^(\.\.[/\\])+/, "")); const body = await readFile(file); response.writeHead(200, { "content-type": mime[extname(file)] ?? "application/octet-stream" }); response.end(body); }
  catch { response.writeHead(404); response.end("not found"); }
});

await new Promise((resolveListen) => server.listen(0, resolveListen)); const address = server.address(); if (!address || typeof address === "string") throw new Error("M6 gate server did not bind TCP"); const base = `http://localhost:${address.port}/`;
let exitCode = 1;
try {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN, headless: false, chromiumSandbox: false, args: ["--headless=new", "--no-sandbox", "--disable-gpu-sandbox", "--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-angle=vulkan", "--use-vulkan"] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1, reducedMotion: "reduce" }); const page = await context.newPage(); const errors = [];
  page.on("console", (message) => { if (message.type() === "error") { errors.push(message.text()); console.log(`browser error: ${message.text()}`); } else if (message.text().startsWith("Flow Lenia M6")) console.log(message.text()); }); page.on("pageerror", (error) => { errors.push(`pageerror: ${error.message}`); console.log(`pageerror: ${error.message}`); });
  await page.goto(`${base}?arena=1&grid=128&gate=1&preset=corridor-divergence`, { waitUntil: "load", timeout: 30_000 }); console.log("M6 Arena gate page loaded");
  const available = await page.evaluate(async () => Boolean(navigator.gpu && await navigator.gpu.requestAdapter()));
  if (!available) { console.log("WEBGPU_UNAVAILABLE: browser adapter absent"); exitCode = 42; }
  else {
    await page.waitForFunction(() => window.__bitPhysicsReady === true, undefined, { timeout });
    const report = await page.evaluate(async () => { if (!window.__flowLeniaM6) throw new Error("Flow Lenia M6 hook missing"); return window.__flowLeniaM6.runGates(); });
    await page.evaluate(async () => { await window.__flowLeniaM6.loadExperiment("maze-navigation"); window.__flowLeniaM6.step(96); }); await page.waitForTimeout(1200); await page.screenshot({ path: screenshot, fullPage: true });
    await page.evaluate(() => { window.__bitPhysicsCaptureReady = false; const capture = document.querySelector('[data-bp="capture"]'); if (!(capture instanceof HTMLButtonElement)) throw new Error("Arena capture button missing"); capture.click(); }); await page.waitForFunction(() => window.__bitPhysicsCaptureReady === true, undefined, { timeout });
    const captureContract = await page.evaluate(async () => {
      const bundle = window.__bitPhysicsCapture; const step = bundle?.steps?.[0]; const fields = step?.state ? Object.keys(step.state) : []; const params = bundle?.manifest?.config?.params; const encoded = new TextEncoder().encode(JSON.stringify(step?.state ?? {})); const digest = await crypto.subtle.digest("SHA-256", encoded); const stateSha256 = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join(""); const pass = params?.mode === "arena" && step?.step === 72 && fields.includes("mass") && fields.includes("genome_h") && fields.includes("genome_q") && fields.includes("identity_u32_values") && fields.includes("environment_affinity_values") && fields.includes("environment_region_u32_values") && params?.environment_schema === "flow-lenia-arena-environment-v1" && /^[0-9a-f]{64}$/.test(params?.shader_sha256 ?? "");
      return { schemaVersion: bundle?.manifest?.schema_version ?? "missing", step: step?.step ?? -1, fields, shaderHash: params?.shader_sha256 ?? "", environmentSchema: params?.environment_schema ?? "", stateSha256, diagnostics: step?.diagnostics ?? {}, pass: Boolean(pass) };
    });
    report.captureContract = { schemaVersion: captureContract.schemaVersion, step: captureContract.step, fields: captureContract.fields, shaderHash: captureContract.shaderHash, environmentSchema: captureContract.environmentSchema, pass: captureContract.pass };
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: "reduce" }); const mobilePage = await mobile.newPage(); await mobilePage.goto(`${base}?arena=1&grid=128&gate=1&preset=storm-recovery`, { waitUntil: "load", timeout: 30_000 }); await mobilePage.waitForFunction(() => window.__bitPhysicsReady === true, undefined, { timeout }); const adaptiveSmoke = await mobilePage.evaluate(() => { const stage = document.querySelector("#organism-lab")?.getBoundingClientRect(); const panelMounted = Boolean(document.querySelector("[data-bp-panel]")); const ready = window.__bitPhysicsReady === true && Boolean(window.__flowLeniaM6); const pass = ready && panelMounted && window.__flowLeniaM6.grid === 128 && Boolean(stage && stage.width <= innerWidth + 1 && stage.height <= innerHeight + 1); return { grid: window.__flowLeniaM6?.grid ?? -1, viewport: [innerWidth, innerHeight], ready, panelMounted, pass }; }); await mobile.close(); report.adaptiveSmoke = adaptiveSmoke;
    report.browserMatrix = [
      { browser: "Chromium", surface: "desktop reference + 256² measured scratch", webgpu: true, result: report.performance.pass && report.architecture.under128Mib ? "PASS" : "FAIL" },
      { browser: "Chromium", surface: "390×844 touch + reduced motion + 128² adaptive", webgpu: true, result: adaptiveSmoke.pass ? "PASS" : "FAIL" },
      { browser: "Firefox/Safari", surface: "compatibility", webgpu: false, result: "NOT CLAIMED — support varies" },
    ];
    report.pass = report.pass && captureContract.pass && adaptiveSmoke.pass;
    const unexpected = errors.filter((message) => !/WebGPU unavailable|requestAdapter/i.test(message)); if (unexpected.length > 0) throw new Error(`browser errors: ${unexpected.join(" | ")}`);
    const [m2, m4] = await Promise.all([readFile(join(webRoot, "artifacts", "m2-browser-gates.json"), "utf8").then(JSON.parse), readFile(join(webRoot, "artifacts", "m4-browser-gates.json"), "utf8").then(JSON.parse)]);
    const canonical = { schemaVersion: "flow-lenia-m6-canonical-index-v1", generatedUtc: new Date().toISOString(), modelVariant: "flow-lenia-ecosystem-v1", captures: [
      { mode: "organism", reference: "m2-browser-gates.json structural replay", grid: m2.structural.grid, step: m2.structural.steps, stateSha256: m2.structural.firstHash, byteExactSameAdapter: m2.structural.byteExactSameAdapter, massRelativeDrift: m2.structural.metrics.relativeMassDrift },
      { mode: "ecosystem", reference: "m4-browser-gates.json whole-rule replay", grid: 128, step: m4.determinismRules.find((item) => item.rule === "whole").steps, stateSha256: m4.determinismRules.find((item) => item.rule === "whole").hashA, byteExactSameAdapter: m4.determinismRules.find((item) => item.rule === "whole").byteExactSameAdapter, massRelativeDrift: m4.determinismRules.find((item) => item.rule === "whole").metrics.relativeMassDrift },
      { mode: "arena", reference: "standard browser capture", grid: 128, step: captureContract.step, stateSha256: captureContract.stateSha256, shaderSha256: captureContract.shaderHash, environmentSchema: captureContract.environmentSchema, byteExactSameAdapter: report.arenas.every((item) => item.byteExactSameAdapter), massRelativeDrift: captureContract.diagnostics.mass_relative_drift },
    ], pass: m2.pass && m4.pass && captureContract.pass && report.arenas.every((item) => item.byteExactSameAdapter) };
    await mkdir(dirname(output), { recursive: true }); await writeFile(output, JSON.stringify(report, null, 2) + "\n"); await writeFile(canonicalOutput, JSON.stringify(canonical, null, 2) + "\n");
    console.log(`M6 browser gates: ${output}`); console.log(`Arena cards: ${report.arenas.map((item) => `${item.id}=${item.pass}`).join(", ")}`); console.log(`round trip: restored=${report.roundTrip.restoredByteExact}, continuation=${report.roundTrip.continuationByteExact}`); console.log(`256² Arena: ${report.performance.p95Ms} ms p95; ${report.architecture.memoryMib256} MiB`); console.log(`capture: ${captureContract.pass}; adaptive: ${adaptiveSmoke.pass}`); console.log(`canonical index: ${canonicalOutput}`); console.log(`screenshot: ${screenshot}`); console.log(`verdict: ${report.pass ? "PASS" : "FAIL"}`); exitCode = report.pass ? 0 : 1;
  }
  await context.close(); await browser.close();
} catch (error) { console.error(`M6 browser gates failed: ${String(error).split("\n")[0]}`); }
finally { server.close(); }
process.exit(exitCode);
