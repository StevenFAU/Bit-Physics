// Site link-resolution check (Lane B, dispatch P-7).
//
// Deploys are operator-only, so this is the LOCAL proof that the published
// tree is self-consistent: it replicates the web-deploy.yml "Assemble site"
// step's copy commands into a temp tree (sim bundles stand in from each
// package's built web/dist), then verifies that every href/src/poster
// attribute and every CSS url(...) reference in every assembled .html/.css
// file resolves to a file inside the tree. External URLs (scheme or
// protocol-relative) and pure fragments are skipped. Exit 0 = zero missing.
//
// Usage:  node check-links.mjs               (assemble replica + check)
//         node check-links.mjs --tree DIR    (check an existing tree)
//
// Keep the REPLICA block in sync with the Assemble-site step in
// .github/workflows/web-deploy.yml — the workflow is the source of truth.

import { cp, mkdir, mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { dirname, extname, join, posix, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url)); // .../web/pages
const REPO = join(HERE, "../../../../..");

// Published sims — mirrors pipeline.py GATE_KIND / the discover job.
const SIMS = [
  "reaction-diffusion-2d", "mandelbulb-explorer", "neural-ca",
  "ising-classical", "strange-attractors", "boids-2d", "boids-3d",
  "curl-noise", "eulerian-smoke", "mpm-multimaterial", "physarum",
  "pic-flip", "schrodinger-smoke", "sph-water", "heat-equation",
  "signal-workbench", "phase-field-fracture", "fdtd-optics",
];

// The confirmed GitHub Pages base (P-8) — observed live (HTTP 200) in the
// phase-5 launch audit, and recorded in phase-5-productization.md. Per-sim
// pages emit ABSOLUTE og:url/og:image on this base (social scrapers fetch them
// off the live deploy); we map those back into the assembled tree and confirm
// the targets exist. The trailing slash is NOT included so both "/sims/x/" and
// "/assets/x.png" map cleanly.
const PAGES_BASE = "https://stevenfau.github.io/Bit-Physics";

// The universal chrome nav hrefs injected by common-web panel-shell.ts (P-8).
// They live in each sim's bundled JS (runtime DOM), not static HTML, so the
// HTML walk can't see them — we scan the bundle for the literals AND resolve
// each from the sim page location.
const NAV_HREFS = ["../../", "../../about.html"];

async function assembleReplica(out) {
  // REPLICA of web-deploy.yml "Assemble site" (P-7 copy list):
  //   cp pages/index.html site/index.html
  //   cp pages/about.html site/about.html
  //   cp -r pages/assets  site/assets
  //   cp -r <validated bundle>  site/sims/<sim>   (here: packages/<sim>/web/dist)
  await mkdir(join(out, "sims"), { recursive: true });
  await cp(join(HERE, "index.html"), join(out, "index.html"));
  await cp(join(HERE, "about.html"), join(out, "about.html"));
  await cp(join(HERE, "assets"), join(out, "assets"), { recursive: true });
  for (const sim of SIMS) {
    const dist = join(REPO, "packages", sim, "web", "dist");
    await stat(dist).catch(() => { throw new Error(`missing built bundle for ${sim} (${dist}) — run the validate pipeline build first`); });
    await cp(dist, join(out, "sims", sim), { recursive: true });
  }
}

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

const ATTR_RE = /(?:href|src|poster)\s*=\s*["']([^"']+)["']/gi;
const URL_RE = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
// Social-card refs: og:url / og:image / twitter:image content values (mirrors
// the per-sim head generator's property|name → content attribute order).
const META_RE =
  /<meta\s+(?:property|name)=["'](?:og:url|og:image|twitter:image)["']\s+content=["']([^"']+)["']/gi;

function metaRefsOf(text) {
  return [...text.matchAll(META_RE)].map((m) => m[1]);
}

// Map an absolute Pages-base URL to its in-tree path (leading "/"); returns null
// for any other absolute URL (genuinely external — skip).
function pagesPath(ref) {
  if (!ref.startsWith(`${PAGES_BASE}/`)) return null;
  return ref.slice(PAGES_BASE.length); // e.g. "/sims/boids-3d/", "/assets/x.png"
}

function refsOf(text, ext) {
  const out = [];
  if (ext === ".html") for (const m of text.matchAll(ATTR_RE)) out.push(m[1]);
  for (const m of text.matchAll(URL_RE)) out.push(m[1]); // inline <style> + .css
  return out;
}

function isExternal(ref) {
  return /^[a-z][a-z0-9+.-]*:/i.test(ref) || ref.startsWith("//") || ref.startsWith("#") || ref.startsWith("data:");
}

async function resolves(tree, fromFile, ref) {
  const clean = ref.split("#")[0].split("?")[0];
  if (clean === "") return true; // pure fragment/query
  const base = clean.startsWith("/") ? tree : dirname(fromFile);
  const target = join(base, clean);
  const s = await stat(target).catch(() => null);
  if (!s) return false;
  if (s.isDirectory()) return (await stat(join(target, "index.html")).catch(() => null)) !== null;
  return true;
}

const treeArg = process.argv.indexOf("--tree");
let tree;
let scratch = null;
if (treeArg !== -1) {
  tree = process.argv[treeArg + 1];
} else {
  scratch = await mkdtemp(join(tmpdir(), "bp-site-"));
  tree = scratch;
  await assembleReplica(tree);
}

let checked = 0;
const missing = [];
for await (const file of walk(tree)) {
  const ext = extname(file);
  if (ext !== ".html" && ext !== ".css") continue;
  const text = await readFile(file, "utf8");
  for (const ref of refsOf(text, ext)) {
    if (isExternal(ref)) continue;
    checked += 1;
    if (!(await resolves(tree, file, ref))) {
      missing.push(`${posix.normalize(relative(tree, file))} -> ${ref}`);
    }
  }
  // Social-card refs (P-8): og:url / og:image / twitter:image. Absolute
  // Pages-base URLs map back into the tree and must resolve; relative ones
  // resolve like any other ref; truly-external absolutes are skipped.
  if (ext === ".html") {
    for (const ref of metaRefsOf(text)) {
      const mapped = pagesPath(ref);
      if (mapped === null && isExternal(ref)) continue; // external, not Pages base
      checked += 1;
      const resolvable = mapped ?? ref;
      if (!(await resolves(tree, file, resolvable))) {
        missing.push(`${posix.normalize(relative(tree, file))} -> ${ref} (meta)`);
      }
    }
  }
}

// Chrome nav hrefs (P-8): runtime-injected by panel-shell.ts, so they live in
// each sim's bundled JS rather than static HTML. Confirm the bundle still
// carries each literal AND that it resolves from the sim page location.
for (const sim of SIMS) {
  const simDir = join(tree, "sims", sim);
  const simIndex = join(simDir, "index.html");
  let js = "";
  try {
    for await (const f of walk(simDir)) {
      if (extname(f) === ".js") js += await readFile(f, "utf8");
    }
  } catch { /* missing bundle already reported by assemble */ }
  for (const href of NAV_HREFS) {
    checked += 1;
    if (!js.includes(`"${href}"`)) {
      missing.push(`sims/${sim} bundle -> nav href "${href}" absent from JS`);
    } else if (!(await resolves(tree, simIndex, href))) {
      missing.push(`sims/${sim} -> ${href} (nav, unresolved)`);
    }
  }
}

// Favicon cross-copy byte-identity (P-8 amendment): the deployed favicon is one
// canonical asset replicated per-sim (vite public/ → dist), not single-file
// dedup — so all copies in the tree must be sha256-identical. Catches future
// drift between the canonical pages/assets copy and any per-sim bundle.
const faviconFiles = [
  join(tree, "assets", "favicon.svg"),
  ...SIMS.map((s) => join(tree, "sims", s, "favicon.svg")),
];
const faviconHashes = await Promise.all(
  faviconFiles.map(async (f) => {
    try { return createHash("sha256").update(await readFile(f)).digest("hex"); }
    catch { return `MISSING:${posix.normalize(relative(tree, f))}`; }
  }),
);
const faviconUniq = [...new Set(faviconHashes)];
const faviconOk = faviconUniq.length === 1 && !faviconUniq[0].startsWith("MISSING");
if (faviconOk) {
  console.log(`favicon byte-identity: ${faviconFiles.length} copies all sha256 ${faviconUniq[0].slice(0, 12)}…`);
} else {
  console.log(`favicon byte-identity FAIL — ${faviconUniq.length} distinct value(s):`);
  faviconFiles.forEach((f, i) => console.log(`  ${posix.normalize(relative(tree, f))} ${faviconHashes[i].slice(0, 16)}`));
}

console.log(`checked ${checked} internal refs across the assembled tree (${tree})`);
if (missing.length) {
  console.log(`MISSING (${missing.length}):`);
  for (const m of missing) console.log(`  ${m}`);
} else {
  console.log("zero missing — assembled tree is self-consistent");
}
if (scratch) await rm(scratch, { recursive: true, force: true });
process.exit(missing.length || !faviconOk ? 1 : 0);
