// Field Studies shell checks (00-foundation.md § 7.3): chrome layout at
// 390 / 820 / 1440 px widths and at 200% zoom, full-bleed (no letterboxing),
// and axe-core accessibility, in a real WebGPU browser.
//
//   CHROME_BIN=/snap/bin/chromium \
//   PLAYWRIGHT_MODULE=$PWD/tools/productization/web-deploy/web/headless/node_modules/playwright/index.js \
//   node web/tools/check-studio.mjs packages/reaction-diffusion-2d/web/dist v2/ [out-dir]
//
// The page may carry a query (e.g. `v2/?s=mill` for one scene). A sim's own
// floating panels opt in to the overflow and overlap checks with the
// attribute data-bp-chrome.
//
// Exit 0 when every check passes; 1 otherwise (a JSON report goes to stdout,
// screenshots to out-dir when given). The page must expose globalThis.__bpDebug
// (camera view rect, domain) and flip __bitPhysicsReady.

import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { extname, join, normalize, resolve } from "node:path";

const pw = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const chromium = pw.chromium ?? pw.default.chromium;
const [distArg, entryArg = "", outArg] = process.argv.slice(2);
if (!distArg) {
  console.error("usage: node check-studio.mjs <dist-dir> [page/] [out-dir]");
  process.exit(2);
}
const dist = resolve(distArg);
const entry = entryArg.replace(/^\/+/, "");
const require = createRequire(import.meta.url);
const axeSource = await readFile(require.resolve("axe-core/axe.min.js"), "utf8");

const VIEWPORTS = [
  { name: "phone-390", width: 390, height: 844, scale: 2, touch: true },
  { name: "tablet-820", width: 820, height: 1180, scale: 2, touch: true },
  { name: "desktop-1440", width: 1440, height: 900, scale: 1, touch: false },
  // 200% browser zoom on a 1440×900 window: half the CSS pixels at 2× density
  { name: "zoom200-1440", width: 720, height: 450, scale: 2, touch: false },
];

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
const base = `http://localhost:${server.address().port}/${entry}`;

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN,
  headless: false,
  chromiumSandbox: false,
  args: ["--headless=new", "--no-sandbox", "--disable-gpu-sandbox", "--enable-unsafe-webgpu",
    "--enable-features=Vulkan", "--use-angle=vulkan", "--use-vulkan"],
});

const report = { page: base, viewports: [], pass: true };
if (outArg) await mkdir(outArg, { recursive: true });

async function axe(page, label) {
  await page.evaluate(axeSource);
  const r = await page.evaluate(async () =>
    // eslint-disable-next-line no-undef
    axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] } }),
  );
  return r.violations.map((v) => ({
    where: label,
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.slice(0, 4).map((n) => n.target.join(" ")),
  }));
}

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.scale,
    hasTouch: vp.touch,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  const res = { name: vp.name, problems: [], axe: [] };
  try {
    await page.goto(base, { waitUntil: "load" });
    await page.waitForFunction(() => globalThis.__bitPhysicsReady === true, undefined, { timeout: 60000 });
    await page.waitForTimeout(1500);
    const geo = await page.evaluate(() => {
      const r = (el) => { const b = el.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; };
      const visible = (el) => {
        const s = getComputedStyle(el);
        const b = el.getBoundingClientRect();
        return s.display !== "none" && s.visibility !== "hidden" && b.width > 0 && b.height > 0;
      };
      const pick = (sel) => [...document.querySelectorAll(sel)].filter(visible).map((el) => ({ sel, rect: r(el) }));
      return {
        inner: [innerWidth, innerHeight],
        scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
        canvas: r(document.querySelector(".bp-canvas")),
        dbg: globalThis.__bpDebug?.(),
        chrome: [
          ...pick(".bp-top .bp-back"), ...pick(".bp-top-actions"), ...pick(".bp-heading .bp-scene-title"),
          ...pick(".bp-rail"), ...pick(".bp-options"), ...pick(".bp-transport"),
          // a sim's own floating panels opt in to the same checks
          ...pick("[data-bp-chrome]"),
        ],
        capture: (() => {
          const b = document.querySelector('[data-bp="capture"]');
          return b ? { button: b instanceof HTMLButtonElement, disabled: b.disabled, display: getComputedStyle(b).display } : null;
        })(),
        panel: !!document.querySelector("[data-bp-panel]"),
      };
    });
    const [iw, ih] = geo.inner;
    const eps = 0.5;
    if (geo.scroll[0] > iw + eps || geo.scroll[1] > ih + eps) res.problems.push(`page scrolls: ${geo.scroll} vs ${geo.inner}`);
    const [cl, ct, cr, cb] = geo.canvas;
    if (Math.abs(cl) > eps || Math.abs(ct) > eps || Math.abs(cr - iw) > eps || Math.abs(cb - ih) > eps) {
      res.problems.push(`canvas is not full-bleed: ${geo.canvas.map((v) => v.toFixed(1))}`);
    }
    if (geo.dbg && !geo.dbg.periodic) {
      // the camera's view must lie inside the domain: no letterbox bars
      const [x0, y0, x1, y1] = geo.dbg.view;
      const [w, h] = geo.dbg.domain;
      if (x0 < -1 || y0 < -1 || x1 > w + 1 || y1 > h + 1) res.problems.push(`letterboxed: view ${geo.dbg.view.map((v) => v.toFixed(1))} outside domain ${w}×${h}`);
    }
    for (const c of geo.chrome) {
      const [l, t, rr, bb] = c.rect;
      if (l < -eps || t < -eps || rr > iw + eps || bb > ih + eps) res.problems.push(`${c.sel} overflows the viewport: ${c.rect.map((v) => v.toFixed(0))}`);
    }
    const overlap = (a, b) => a[0] < b[2] - 1 && b[0] < a[2] - 1 && a[1] < b[3] - 1 && b[1] < a[3] - 1;
    for (let i = 0; i < geo.chrome.length; i += 1) {
      for (let j = i + 1; j < geo.chrome.length; j += 1) {
        if (overlap(geo.chrome[i].rect, geo.chrome[j].rect)) res.problems.push(`${geo.chrome[i].sel} overlaps ${geo.chrome[j].sel}`);
      }
    }
    if (!geo.panel) res.problems.push("no [data-bp-panel]");
    if (!geo.capture || !geo.capture.button || geo.capture.disabled || geo.capture.display === "none") {
      res.problems.push(`capture control not a live button at boot: ${JSON.stringify(geo.capture)}`);
    }
    if (outArg) await page.screenshot({ path: join(outArg, `${vp.name}.png`) });
    res.axe.push(...(await axe(page, "boot")));
    // Learn and Prove open
    for (const tab of ["Learn", "Prove"]) {
      await page.evaluate((t) => {
        const b = [...document.querySelectorAll(".bp-top-actions button")].find((x) => x.textContent?.includes(t) || x.querySelector(".bp-chip-label")?.textContent === t);
        b?.click();
      }, tab);
      await page.waitForTimeout(500);
      if (outArg) await page.screenshot({ path: join(outArg, `${vp.name}-${tab.toLowerCase()}.png`) });
      res.axe.push(...(await axe(page, tab.toLowerCase())));
    }
  } catch (e) {
    res.problems.push(`error: ${String(e).split("\n")[0]}`);
  }
  if (errors.length) res.problems.push(...errors.map((e) => `console: ${e}`));
  // de-duplicate axe hits across the three states
  const seen = new Set();
  res.axe = res.axe.filter((v) => (seen.has(v.id + v.nodes.join()) ? false : seen.add(v.id + v.nodes.join())));
  if (res.problems.length || res.axe.length) report.pass = false;
  report.viewports.push(res);
  await ctx.close();
}

await browser.close();
server.close();
const text = JSON.stringify(report, null, 2);
if (outArg) await writeFile(join(outArg, "report.json"), text);
console.log(text);
process.exit(report.pass ? 0 : 1);
