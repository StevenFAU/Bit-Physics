// Slime Mould v2 — acceptance checks in a real WebGPU browser
// (docs/planning/rebuild-v2/02-physarum.md M0).
//
//   npm run build   (in this directory)
//   CHROME_BIN=/snap/bin/chromium \
//   PLAYWRIGHT_MODULE=<repo>/tools/productization/web-deploy/web/headless/node_modules/playwright/index.js \
//   node v2-acceptance.mjs [out-dir]
//
// Checks: boot at the tier's agent count on the density-coupled grid; the
// shared counting sort against its CPU reference on the live agents; the live
// solver against the gated kernel on the canonical run (byte for byte, with
// re-sorts); the mass balance at full scale; the in-page gate (run twice +
// mass); save / restore / compare; a seed reproduces the same bytes across
// page loads; parameters ride the share link; probe; every scene boots.
// Prints a BP_BENCH line (agents, frame time) at the end.

import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

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

async function open(path = "/v2/", viewport = { width: 1280, height: 720 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto(origin + path, { waitUntil: "load" });
  await page.waitForFunction(() => globalThis.__bitPhysicsReady === true, undefined, { timeout: 60000 });
  return { ctx, page, errors };
}
const shot = async (page, name) => { if (out) await page.screenshot({ path: join(out, `${name}.png`) }); };
const T = (page, fn, arg) => page.evaluate(fn, arg);

// trail hash after n steps from the scene start, with the live loop paused
const hashAfter = (page, n) =>
  T(page, async (steps) => {
    const app = globalThis.__physarum;
    app.clock.paused = true;
    await new Promise((r) => setTimeout(r, 100));
    await app.loadScene(app.scene.id, { seed: app.seed, params: app.sim.params });
    app.clock.paused = true;
    await app.advance(steps);
    const t = await app.sim.readTrail();
    const d = await crypto.subtle.digest("SHA-256", t.buffer);
    return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }, n);

// --- boot ---------------------------------------------------------------------
{
  const { ctx, page, errors } = await open();
  await page.waitForTimeout(3000);
  const d = await T(page, () => globalThis.__bpDebug());
  const want = { T3: 2000000, T2: 500000, T1: 150000 }[d.tier];
  check("boots into The network", d.scene === "network", d.scene);
  check(`boots at the tier's agent count (${d.tier})`, d.agents === want, `${d.agents.toLocaleString()} agents on ${d.domain[0]} × ${d.domain[1]}, adapter ${d.adapter}`);
  check("density held at the declared agents per cell (±1%)", Math.abs(d.density / d.declaredDensity - 1) < 0.01, `${d.density.toFixed(4)} vs ${d.declaredDensity.toFixed(4)}`);
  const aspect = d.domain[0] / d.domain[1] / (d.viewport[0] / d.viewport[1]);
  check("the dish has the viewport's aspect (full-bleed, nothing off-screen at fit)", Math.abs(aspect - 1) < 0.02, aspect.toFixed(4));
  check("the steps advance", d.tick > 100, `${d.tick} steps after 3 s`);
  await shot(page, "01-dish");

  const sort = await T(page, () => globalThis.__physarumChecks.sort());
  check("counting sort ≡ CPU reference on the live agents", sort.problem === null, `${sort.items.toLocaleString()} agents, ${sort.keyCount.toLocaleString()} tiles${sort.problem ? `: ${sort.problem}` : ""}`);

  const lvg = await T(page, () => globalThis.__physarumChecks.liveVsGated());
  check("live solver ≡ gated kernel, byte for byte (5000 steps, with re-sorts)", lvg.identical && lvg.sorts > 0, `${lvg.cellsDiffering} cells differ, ${lvg.sorts} re-sorts`);

  // mass at full scale: let it settle, then read
  await page.waitForTimeout(3500);
  const mass = await T(page, () => globalThis.__physarumChecks.liveMass());
  check("mass balance at full scale (d·N·(1−α)/α, rel < 1e-3)", mass && mass.pass, mass ? `rel ${mass.massRel.toExponential(2)}` : "not settled");

  const gate = await T(page, () => globalThis.__physarumChecks.gate());
  check("in-page gate: run twice identical, mass within 1e-3", gate.pass, `identical ${gate.identical}, M ${gate.mass.toFixed(4)} (rel ${gate.massRel.toExponential(2)}), ${gate.seconds.toFixed(1)} s`);

  // save / restore / compare
  const sr = await T(page, async () => {
    const app = globalThis.__physarum;
    const hash = async () => {
      const t = await app.sim.readTrail();
      const d = await crypto.subtle.digest("SHA-256", t.buffer);
      return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
    };
    app.clock.paused = true;
    await new Promise((r) => setTimeout(r, 100));
    app.savePoint();
    const atSave = await hash();
    const tickSave = app.sim.tick;
    await app.advance(150);
    const later = await hash();
    app.restoreSave();
    const restored = await hash();
    app.toggleCompare();
    const comparing = app.history.comparing && app.view.split !== null;
    app.toggleCompare();
    return { same: atSave === restored, moved: later !== atSave, tick: app.sim.tick === tickSave, comparing, off: app.view.split === null };
  });
  check("save point → restore returns the exact bytes", sr.same && sr.moved && sr.tick, JSON.stringify(sr));
  check("compare A/B toggles the split view", sr.comparing && sr.off);

  // probe
  await T(page, () => { globalThis.__physarum.studio.rail.select("probe"); globalThis.__physarum.clock.paused = false; });
  await page.mouse.move(640, 360);
  await page.waitForTimeout(400);
  await page.mouse.move(650, 362);
  await page.waitForTimeout(400);
  const probe = await T(page, () => { const p = document.querySelector(".bp-probe"); return p && !p.hidden ? p.textContent : null; });
  check("probe reads the trail under the pointer", !!probe && /Trail/.test(probe), probe ?? "hidden");
  check("no console errors (boot, checks, history, probe)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- a seed reproduces the same bytes across page loads ---------------------
{
  const a = await open("/v2/?seed=7");
  const h1 = await hashAfter(a.page, 300);
  await a.ctx.close();
  const b = await open("/v2/?seed=7");
  const h2 = await hashAfter(b.page, 300);
  await b.ctx.close();
  const c = await open("/v2/?seed=8");
  const h3 = await hashAfter(c.page, 300);
  await c.ctx.close();
  check("same seed, same bytes across page loads (300 steps)", h1 === h2, `${h1.slice(0, 16)}… vs ${h2.slice(0, 16)}…`);
  check("a different seed gives a different dish", h1 !== h3);
}

// --- parameters ride the share link ------------------------------------------
{
  const { ctx, page, errors } = await open("/v2/?dphi=30&ls=15&a=0.05&pal=deepsea");
  const p = await T(page, () => ({ ...globalThis.__physarum.sim.params, pal: globalThis.__physarum.palette, link: location.search }));
  check("a share link sets the parameters and palette", p.delta_phi_deg === 30 && p.L_sense === 15 && p.decay_alpha === 0.05 && p.pal === "deepsea", JSON.stringify(p));
  check("no console errors (share link)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- every scene boots; the gated scene is the gated run --------------------
{
  const { ctx, page, errors } = await open("/v2/?s=gated");
  await page.waitForTimeout(2500);
  const g = await T(page, () => ({ scene: globalThis.__physarum.scene.id, gated: globalThis.__physarum.onGatedRun, n: globalThis.__physarum.sim.n, w: globalThis.__physarum.sim.w }));
  check("the gated scene is the gated run (500 agents on 256²)", g.scene === "gated" && g.gated && g.n === 500 && g.w === 256, JSON.stringify(g));
  await shot(page, "02-gated");
  await T(page, () => globalThis.__physarum.loadScene("network"));
  await page.waitForTimeout(1500);
  check("no console errors (scene switches)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- frame time at the boot scene -------------------------------------------
{
  const { ctx, page } = await open("/v2/?bench=1");
  await page.waitForFunction(() => globalThis.__bpBench, undefined, { timeout: 60000 });
  const b = await T(page, () => globalThis.__bpBench);
  console.log(`BP_BENCH ${JSON.stringify(b)}`);
  check("bench ran", b.frames > 0, `${b.agents.toLocaleString()} agents, ${b.fps.toFixed(1)} fps, frame p50 ${b.frameP50.toFixed(1)} ms / p90 ${b.frameP90.toFixed(1)} ms, GPU p50 ${b.gpuP50.toFixed(2)} ms, ${Math.round(b.stepsPerSecond)} steps/s`);
  await ctx.close();
}

await browser.close();
server.close();
const failed = results.filter((r) => !r.ok);
if (out) await writeFile(join(out, "acceptance.json"), JSON.stringify(results, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
