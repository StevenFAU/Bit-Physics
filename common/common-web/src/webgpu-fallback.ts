// No-WebGPU fallback screen (2026-10 portfolio review, finding 12).
//
// Before this, a visitor whose browser exposes no WebGPU got a black canvas and
// an 8 px boot line ("WebGPU unavailable: WebGPU unavailable: …"). Every sim
// imports panel-shell.ts, which imports this module for its side effect, so the
// check runs on every sim page with no per-sim wiring: if `navigator.gpu` is
// missing, or no adapter comes back, a full-page card replaces the dead canvas
// with the sim's poster loop, what it needs, and a way home.
//
// A sim that ships its own non-WebGPU backend (boids-2d's CPU engine) opts out
// with <meta name="bp-webgpu" content="optional"> in its index.html.
//
// The headless validate / poster drivers always have an adapter, so the screen
// never renders there and the poster <video>/<img> is never requested (validate
// serves each dist standalone, where ../../assets would 404).

const OPT_OUT_SELECTOR = 'meta[name="bp-webgpu"][content="optional"]';

/** `<sim>` from a Pages path like /Bit-Physics/sims/<sim>/; null elsewhere. */
function simSlug(): string | null {
  const m = /\/sims\/([^/]+)\/?/.exec(location.pathname);
  return m ? m[1] : null;
}

/** "Bit-Physics · Boids v4" / "Canyon Lab · Bit Physics" → the sim's own name. */
function simTitle(): string {
  const t = document.title
    .replace(/^\s*Bit[- ]?Physics\s*[·|—–-]\s*/i, "")
    .replace(/\s*[·|—–-]\s*Bit[- ]?Physics\s*$/i, "")
    .split(/\s+[·|—–]\s+/)[0]
    .trim();
  return t.length > 0 ? t : "This simulation";
}

/**
 * Resolve to a human-readable reason when this browser cannot run WebGPU, or
 * null when an adapter is available.
 */
export async function detectWebGPUProblem(): Promise<string | null> {
  if (!("gpu" in navigator) || !navigator.gpu) {
    return "This browser does not expose WebGPU.";
  }
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (adapter === null) {
      return (
        "WebGPU is present, but no compatible GPU adapter was found — it may be " +
        "turned off, blocklisted for this GPU, or unavailable in this browsing mode."
      );
    }
  } catch (e) {
    return `The WebGPU adapter request failed: ${(e as Error).message}`;
  }
  return null;
}

/** Render the fallback card (idempotent). Exported so a sim can also call it. */
export function showWebGPUUnavailable(reason: string): void {
  if (document.querySelector('[data-bp2="webgpu-fallback"]')) return;

  const el = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
    text?: string,
  ): HTMLElementTagNameMap[K] => {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  };

  const root = el("div", "bps-nogpu");
  root.setAttribute("data-bp2", "webgpu-fallback");
  root.setAttribute("role", "alert");
  const card = el("div", "bps-nogpu-card");

  const slug = simSlug();
  if (slug) {
    const poster = `../../assets/${slug}.png`;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const media = still ? el("img") : el("video");
    media.className = "bps-nogpu-media";
    media.setAttribute("aria-hidden", "true");
    if (media instanceof HTMLVideoElement) {
      media.muted = true;
      media.loop = true;
      media.autoplay = true;
      media.playsInline = true;
      media.poster = poster;
      media.src = `../../assets/${slug}.webm`;
    } else {
      media.src = poster;
      media.alt = "";
    }
    media.addEventListener("error", () => media.remove());
    card.appendChild(media);
  }

  card.append(
    el("p", "bps-nogpu-eyebrow", "Bit Physics"),
    el("h2", "bps-nogpu-title", `${simTitle()} needs WebGPU`),
    el("p", "bps-nogpu-reason", reason),
    el(
      "p",
      "bps-nogpu-help",
      "It runs in current desktop Chrome and Edge, Chrome on Android, and Safari 26 " +
        "or later on macOS, iOS and iPadOS. Firefox support depends on your platform " +
        "and version. If you are on a supported browser, check that hardware " +
        "acceleration is turned on.",
    ),
  );

  const links = el("p", "bps-nogpu-links");
  const home = el("a", undefined, "← All simulations");
  home.href = "../../";
  const about = el("a", undefined, "About the project");
  about.href = "../../about.html";
  links.append(home, about);
  card.appendChild(links);

  root.appendChild(card);
  document.body.appendChild(root);
  document.body.setAttribute("data-bp2-nogpu", "true");
}

function install(): void {
  if (typeof document === "undefined" || typeof navigator === "undefined") return;
  if (document.querySelector(OPT_OUT_SELECTOR)) return;
  void detectWebGPUProblem().then((reason) => {
    if (reason !== null) showWebGPUUnavailable(reason);
  });
}

install();
