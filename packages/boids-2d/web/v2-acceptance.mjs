// Swarm v2 — acceptance checks in a real WebGPU browser
// (docs/planning/rebuild-v2/03-boids-2d.md M0).
//
//   npm run build   (in this directory)
//   CHROME_BIN=/snap/bin/chromium \
//   PLAYWRIGHT_MODULE=<repo>/tools/productization/web-deploy/web/headless/node_modules/playwright/index.js \
//   node v2-acceptance.mjs [out-dir]
//
// Checks: boot at the tier's fish count, density and the viewport's aspect;
// the release gate's capture is byte-identical on the v1 and v2 pages, and
// re-runs in-page; the v2 GPU kernel reproduces the v4 lab's trajectory hash
// (same device, brute force and sort, with and without noise); brute ≡ sort
// and run-twice in-page; the shared counting sort ≡ its CPU reference on the
// live million; the memory reorder changes no fish's path; the φ series at
// full scale repeats; the shark clears the water around it; save / restore /
// compare; a seed reproduces the same bytes across page loads; the rule rides
// the share link; the proof flock scene. Prints a BP_BENCH line at the end.

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

/** Click the capture control and return the published capture as JSON text. */
const capture = (page) =>
  T(page, async () => {
    globalThis.__bitPhysicsCaptureReady = false;
    document.querySelector('[data-bp="capture"]').click();
    for (let i = 0; i < 600 && !globalThis.__bitPhysicsCaptureReady; i += 1) await new Promise((r) => setTimeout(r, 50));
    return JSON.stringify(globalThis.__bitPhysicsCapture);
  });

// boids hash after n steps from the scene start, with the live loop paused
const hashAfter = (page, n) =>
  T(page, async (steps) => {
    const app = globalThis.__swarm;
    app.clock.paused = true;
    await new Promise((r) => setTimeout(r, 100));
    await app.loadScene(app.scene.id, { seed: app.seed, rule: app.flock.rule });
    app.clock.paused = true;
    await app.advance(steps);
    const b = await app.flock.readBoids();
    const d = await crypto.subtle.digest("SHA-256", b.buffer);
    return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
  }, n);

// --- the v4 lab (v1 page): its own capture and its own trajectory hashes -------
let v1Capture = "";
let v4 = null;
{
  const { ctx, page, errors } = await open("/");
  v1Capture = await capture(page);
  await page.waitForFunction(() => globalThis.__boids2dReady === true, undefined, { timeout: 60000 });
  v4 = await T(page, async () => {
    /* global ENGINE, S, hashBusy */
    // eslint-disable-next-line no-undef
    if (!ENGINE || ENGINE.kind !== "gpu") return { error: `v4 engine is ${ENGINE && ENGINE.kind}` };
    hashBusy++; // freeze the v4 render loop for the whole section, as its own verify suite does
    try {
      S.speciesCount = 1; S.interaction = "metric"; S.timeRate = 1; S.initMode = "random"; S.fovDeg = 360;
      ENGINE.setCount(4096);
      const rule = { wSep: S.wSep, wAli: S.wAli, wCoh: S.wCoh, rCoh: S.rCoh, maxSpeed: S.maxSpeed, noise: S.noise, fovDeg: S.fovDeg };
      const world = { halfW: ENGINE.halfW(), halfH: ENGINE.halfH() };
      const run = async (bp, noise) => {
        S.broadphase = bp; S.noise = noise;
        ENGINE.reseed(42);
        return ENGINE.hashRun(60);
      };
      const quiet = { brute: await run("brute", 0), sort: await run("sort", 0) };
      const noisy = { brute: await run("brute", 0.2), sort: await run("sort", 0.2) };
      return { rule, world, quiet, noisy };
    } finally {
      hashBusy = Math.max(0, hashBusy - 1);
    }
  });
  check("v1 page (the v4 lab) boots on WebGPU and computes its own hashes", v4 && !v4.error, v4?.error ?? `${v4.quiet.brute.hash.slice(0, 16)}…`);
  check("no console errors (v1 page)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- boot ---------------------------------------------------------------------
{
  const { ctx, page, errors } = await open();
  await page.waitForTimeout(3000);
  const d = await T(page, () => globalThis.__bpDebug());
  const want = { T3: 1000000, T2: 250000, T1: 60000 }[d.tier];
  check("boots into Open Water", d.scene === "open-water", d.scene);
  check(`boots at the tier's fish count (${d.tier})`, d.agents === want, `${d.agents.toLocaleString()} fish on ${d.world.map((v) => v.toFixed(2)).join(" × ")}, adapter ${d.adapter}`);
  check("density held at the declared fish per unit² (±0.1%)", Math.abs(d.density / d.declaredDensity - 1) < 1e-3, `${d.density.toFixed(2)} vs ${d.declaredDensity.toFixed(2)}`);
  const aspect = d.world[0] / d.world[1] / (d.viewport[0] / d.viewport[1]);
  check("the ocean has the viewport's aspect (full-bleed at fit)", Math.abs(aspect - 1) < 0.01, aspect.toFixed(4));
  check("the steps advance", d.tick > 100, `${d.tick} steps after 3 s`);
  await shot(page, "01-open-water");

  // the release gate: same capture bytes as the v1 page, and re-run in-page
  const v2Capture = await capture(page);
  check("release-gate capture is byte-identical on the v1 and v2 pages", v2Capture === v1Capture && v2Capture.length > 1000, `${v2Capture.length} bytes`);
  const gate = await T(page, () => globalThis.__swarmProve.gate());
  check("in-page release gate: run twice identical, predicates hold", gate.pass, `φ calm ${gate.orderedPhi.toFixed(4)} vs noisy ${gate.noisyPhi.toFixed(4)}, vmax ${gate.vmax}, div ${gate.divergence.map((x) => x.toExponential(3)).join(" → ")}`);

  // the v2 kernel against the v4 lab's, same device
  if (v4 && !v4.error) {
    const v2 = await T(page, async (cfg) => {
      const P = globalThis.__swarmProve;
      const base = { n: 4096, seed: 42, steps: 60, halfW: cfg.world.halfW, halfH: cfg.world.halfH };
      const r = async (broadphase, noise) => P.hashRun({ ...base, broadphase, rule: { ...cfg.rule, noise } });
      return { quiet: { brute: await r("brute", 0), sort: await r("sort", 0) }, noisy: { brute: await r("brute", 0.2), sort: await r("sort", 0.2) } };
    }, v4);
    for (const k of ["quiet", "noisy"]) {
      const eta = k === "quiet" ? 0 : 0.2;
      check(`v2 kernel ≡ v4 kernel, brute force (η ${eta}, 4096 fish, 60 steps)`, v2[k].brute.hash === v4[k].brute.hash && v2[k].brute.nan === 0, `v2 ${v2[k].brute.hash.slice(0, 16)}… v4 ${v4[k].brute.hash.slice(0, 16)}…`);
      check(`v2 sort ≡ v4 sort ≡ brute (η ${eta})`, v2[k].sort.hash === v4[k].sort.hash && v2[k].sort.hash === v4[k].brute.hash, `v2 ${v2[k].sort.hash.slice(0, 16)}… v4 ${v4[k].sort.hash.slice(0, 16)}…`);
    }
  }

  const bs = await T(page, () => globalThis.__swarmProve.bruteSort());
  check("in-page brute ≡ sort (4096 fish, 60 steps, the scene's rule)", bs.identical && bs.nan === 0, `${bs.brute.slice(0, 16)}… ${bs.seconds.toFixed(1)} s`);
  check("in-page run twice, same bytes", bs.repeatable, `${bs.sort.slice(0, 16)}… ≡ ${bs.sort2.slice(0, 16)}…`);
  check("fixed-point sums clean (no saturation flag)", !bs.saturated);

  const sort = await T(page, () => globalThis.__swarmProve.liveSort());
  check("counting sort ≡ CPU reference on the live ocean", sort.problem === null, `${sort.items.toLocaleString()} fish, ${sort.cells.toLocaleString()} cells${sort.problem ? `: ${sort.problem}` : ""}`);

  const ro = await T(page, () => globalThis.__swarmProve.reorder());
  check("the memory reorder changes no fish's path (η 0)", ro.identical, `${ro.n.toLocaleString()} fish, ${ro.steps} steps, ${ro.reorders} re-sorts, ${ro.differing} differ`);

  const fs = await T(page, () => globalThis.__swarmProve.fullScale());
  check("φ series at full scale repeats (run twice)", fs.identical, `${fs.n.toLocaleString()} fish, φ ${fs.phiFirst.toFixed(3)} → ${fs.phiLast.toFixed(3)}, ${fs.seconds.toFixed(1)} s`);

  // the shark clears the water around it
  const target = await T(page, async () => {
    const app = globalThis.__swarm;
    app.clock.paused = false;
    app.studio.rail.select("shark");
    const b = await app.flock.readBoids();
    // the densest of a few hundred fish's neighbourhoods
    const R = app.shark.radius * 0.5;
    let best = [0, 0], bestN = -1;
    for (let k = 0; k < 300; k += 1) {
      const i = (k * 3331) % app.flock.n;
      const x = b[i * 6], y = b[i * 6 + 1];
      let c = 0;
      for (let j = 0; j < app.flock.n; j += 97) if (Math.hypot(b[j * 6] - x, b[j * 6 + 1] - y) < R) c += 1;
      if (c > bestN) { bestN = c; best = [x, y]; }
    }
    app.camera.set({ cx: best[0] + app.flock.halfW, cy: best[1] + app.flock.halfH, pxPerUnit: app.camera.coverZoom() * 4 });
    const [sx, sy] = app.camera.domainToScreen(best[0] + app.flock.halfW, best[1] + app.flock.halfH);
    return { sx, sy };
  });
  const near = (page2) =>
    T(page2, async () => {
      const app = globalThis.__swarm;
      const b = await app.flock.readBoids();
      const s = app.shark;
      const R = s.radius * 0.5;
      let c = 0;
      for (let j = 0; j < app.flock.n; j += 1) {
        let dx = b[j * 6] - s.x, dy = b[j * 6 + 1] - s.y;
        dx -= 2 * app.flock.halfW * Math.round(dx / (2 * app.flock.halfW));
        dy -= 2 * app.flock.halfH * Math.round(dy / (2 * app.flock.halfH));
        if (dx * dx + dy * dy < R * R) c += 1;
      }
      return { c, present: s.presence, x: s.x, y: s.y };
    });
  await page.mouse.move(target.sx - 30, target.sy);
  await page.waitForTimeout(80);
  await page.mouse.move(target.sx, target.sy, { steps: 4 });
  await page.waitForTimeout(120);
  const before = await near(page);
  await page.mouse.down();
  await page.waitForTimeout(2500);
  const during = await near(page);
  await shot(page, "02-shark");
  await page.mouse.up();
  check("the shark clears the water around it (fish within half its fear radius)", during.present > 0.9 && during.c < before.c * 0.25, `${before.c} → ${during.c} fish`);

  // save / restore / compare
  const sr = await T(page, async () => {
    const app = globalThis.__swarm;
    const hash = async () => {
      const t = await app.flock.readBoids();
      const d = await crypto.subtle.digest("SHA-256", t.buffer);
      return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
    };
    app.clock.paused = true;
    await new Promise((r) => setTimeout(r, 200));
    app.savePoint();
    const atSave = await hash();
    const tickSave = app.flock.tick;
    await app.advance(150);
    const later = await hash();
    app.restoreSave();
    const restored = await hash();
    app.toggleCompare();
    const comparing = app.history.comparing && app.view.split !== null;
    app.toggleCompare();
    return { same: atSave === restored, moved: later !== atSave, tick: app.flock.tick === tickSave, comparing, off: app.view.split === null };
  });
  check("save point → restore returns the exact bytes", sr.same && sr.moved && sr.tick, JSON.stringify(sr));
  check("compare A/B toggles the split view", sr.comparing && sr.off);
  check("no console errors (boot, proofs, shark, history)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- a seed reproduces the same bytes across page loads ---------------------
{
  // with noise: the draws follow memory slots, so this also pins the reorder's layout
  const a = await open("/v2/?seed=7&eta=0.15");
  const h1 = await hashAfter(a.page, 300);
  await a.ctx.close();
  const b = await open("/v2/?seed=7&eta=0.15");
  const h2 = await hashAfter(b.page, 300);
  await b.ctx.close();
  const c = await open("/v2/?seed=8&eta=0.15");
  const h3 = await hashAfter(c.page, 300);
  await c.ctx.close();
  check("same seed, same bytes across page loads (1M fish, η 0.15, 300 steps, with re-sorts)", h1 === h2, `${h1.slice(0, 16)}… vs ${h2.slice(0, 16)}…`);
  check("a different seed gives a different ocean", h1 !== h3);
}

// --- the rule rides the share link --------------------------------------------
{
  const { ctx, page, errors } = await open("/v2/?wa=2&eta=0.15&r=0.12&shark=20&col=heading");
  const p = await T(page, () => ({ ...globalThis.__swarm.flock.rule, shark: globalThis.__swarm.sharkSize, col: globalThis.__swarm.view.look.colour }));
  check("a share link sets the rule, shark size and fish colour", p.wAli === 2 && p.noise === 0.15 && p.rCoh === 0.12 && p.shark === 20 && p.col === "heading", JSON.stringify(p));
  await page.waitForTimeout(1500);
  await shot(page, "03-heading");
  check("no console errors (share link)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- the proof flock scene; overlapping loads keep the newest ---------------
{
  const { ctx, page, errors } = await open();
  const r = await T(page, async () => {
    const app = globalThis.__swarm;
    await app.loadScene("proof");
    const proof = { scene: app.scene.id, n: app.flock.n, proofRun: app.onProofRun, reorder: app.flock.sortEvery };
    const a = app.loadScene("proof");
    const b = app.loadScene("open-water");
    await Promise.all([a, b]);
    return { proof, after: { scene: app.scene.id, n: app.flock.n } };
  });
  check("the proof flock is the proofs' run (4,096 fish, no reorder)", r.proof.scene === "proof" && r.proof.n === 4096 && r.proof.proofRun && r.proof.reorder === 0, JSON.stringify(r.proof));
  check("overlapping scene loads keep the newest choice", r.after.scene === "open-water" && r.after.n > 4096, JSON.stringify(r.after));
  check("no console errors (scenes)", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

// --- frame time at the boot scene -------------------------------------------
{
  const { ctx, page } = await open("/v2/?bench=1");
  await page.waitForFunction(() => globalThis.__bpBench, undefined, { timeout: 60000 });
  const b = await T(page, () => globalThis.__bpBench);
  console.log(`BP_BENCH ${JSON.stringify(b)}`);
  check("bench ran", b.frames > 0, `${b.agents.toLocaleString()} fish, ${b.fps.toFixed(1)} fps, frame p50 ${b.frameP50.toFixed(1)} ms / p90 ${b.frameP90.toFixed(1)} ms, GPU p50 ${b.gpuP50.toFixed(2)} ms, ${Math.round(b.stepsPerSecond)} steps/s, render scale ${b.renderScale}`);
  await ctx.close();
}

await browser.close();
server.close();
const failed = results.filter((r) => !r.ok);
if (out) await writeFile(join(out, "acceptance.json"), JSON.stringify(results, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
