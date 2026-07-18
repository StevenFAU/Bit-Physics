import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";

const playwright = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = playwright.chromium ?? playwright.default.chromium;
const webRoot = resolve(import.meta.dirname, "..");
const distDir = resolve(process.argv[2] ?? join(webRoot, "dist"));
const output = resolve(process.argv[3] ?? join(webRoot, "artifacts", "m4-browser-gates.json"));
const screenshot = resolve(process.argv[4] ?? "/tmp/flow-lenia-m4-ui.png");
const timeout = Number(process.env.FLOW_LENIA_M4_TIMEOUT_MS ?? "900000");
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".map": "application/json" };

const server = createServer(async (request, response) => {
  try {
    let path = decodeURIComponent((request.url ?? "/").split("?")[0]);
    if (path === "/favicon.ico") { response.writeHead(204); response.end(); return; }
    if (path === "/") path = "/index.html";
    const file = join(distDir, normalize(path).replace(/^(\.\.[/\\])+/, ""));
    const body = await readFile(file);
    response.writeHead(200, { "content-type": mime[extname(file)] ?? "application/octet-stream" });
    response.end(body);
  } catch { response.writeHead(404); response.end("not found"); }
});

await new Promise((resolveListen) => server.listen(0, resolveListen));
const address = server.address();
if (!address || typeof address === "string") throw new Error("gate server did not bind TCP");
const url = `http://localhost:${address.port}/?ecosystem=1&grid=128&gate=1`;
let exitCode = 1;
try {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN,
    headless: false,
    chromiumSandbox: false,
    args: ["--headless=new", "--no-sandbox", "--disable-gpu-sandbox", "--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-angle=vulkan", "--use-vulkan"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") { errors.push(message.text()); console.log(`browser error: ${message.text()}`); }
    else if (message.text().startsWith("Flow Lenia M4 gates:")) console.log(message.text());
  });
  page.on("pageerror", (error) => { errors.push(`pageerror: ${error.message}`); console.log(`pageerror: ${error.message}`); });
  await page.goto(url, { waitUntil: "load", timeout: 30_000 });
  console.log("M4 gate page loaded");
  const available = await page.evaluate(async () => Boolean(navigator.gpu && await navigator.gpu.requestAdapter()));
  if (!available) { console.log("WEBGPU_UNAVAILABLE: browser adapter absent"); exitCode = 42; }
  else {
    await page.waitForFunction(() => window.__bitPhysicsReady === true, undefined, { timeout });
    const report = await page.evaluate(async () => {
      if (!window.__flowLeniaM4) throw new Error("Flow Lenia M4 test hook missing");
      return window.__flowLeniaM4.runGates();
    });
    await page.evaluate(async () => { await window.__flowLeniaM4.loadExperiment("identity-dilution"); window.__flowLeniaM4.step(48); });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: screenshot, fullPage: true });
    await page.evaluate(() => {
      window.__bitPhysicsCaptureReady = false;
      const capture = document.querySelector('[data-bp="capture"]');
      if (!(capture instanceof HTMLButtonElement)) throw new Error("ecosystem capture button missing");
      capture.click();
    });
    await page.waitForFunction(() => window.__bitPhysicsCaptureReady === true, undefined, { timeout });
    const captureContract = await page.evaluate(() => {
      const bundle = window.__bitPhysicsCapture;
      const step = bundle?.steps?.[0];
      const fields = step?.state ? Object.keys(step.state) : [];
      const pass = bundle?.manifest?.config?.params?.mode === "ecosystem" && step?.step === 32 && fields.includes("mass") && fields.includes("genome_h") && fields.includes("genome_q") && fields.includes("identity_u32_values");
      return { schemaVersion: bundle?.manifest?.schema_version ?? "missing", step: step?.step ?? -1, fields, pass: Boolean(pass) };
    });
    report.captureContract = captureContract;
    report.pass = report.pass && captureContract.pass;
    const unexpected = errors.filter((message) => !/WebGPU unavailable|requestAdapter/i.test(message));
    if (unexpected.length > 0) throw new Error(`browser errors: ${unexpected.join(" | ")}`);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, JSON.stringify(report, null, 2) + "\n");
    console.log(`M4 browser gates: ${output}`);
    console.log(`numerical: ${report.numericalRules.map((item) => `${item.rule}=${item.pass}`).join(", ")}`);
    console.log(`determinism: ${report.determinismRules.map((item) => `${item.rule}=${item.byteExactSameAdapter}`).join(", ")}`);
    console.log(`mutation: ${report.mutation.pass}; ecosystems: ${report.ecosystems.map((item) => `${item.id}=${item.pass}`).join(", ")}`);
    console.log(`identity dilution mixed fractions: ${report.identityDilution.mixedFractions.join(", ")}`);
    console.log(`256²: ${report.performance.p95Ms} ms p95; ${report.architecture.memoryMib256} MiB`);
    console.log(`ecosystem capture: ${report.captureContract.pass} (${report.captureContract.fields.join(", ")})`);
    console.log(`screenshot: ${screenshot}`);
    console.log(`verdict: ${report.pass ? "PASS" : "FAIL"}`);
    exitCode = report.pass ? 0 : 1;
  }
  await browser.close();
} catch (error) { console.error(`M4 browser gates failed: ${String(error).split("\n")[0]}`); }
finally { server.close(); }
process.exit(exitCode);
