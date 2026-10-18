const query = new URLSearchParams(location.search);
// Routed mode modules mount createSettingsPanel and publish exposeCapture only after WebGPU boot.

// The read-only inspector is hidden in Play mode until the visitor samples the
// field (style.css); the first press on any canvas reveals it for the session.
document.addEventListener(
  "pointerdown",
  (event) => {
    if ((event.target as Element | null)?.closest("canvas")) {
      document.getElementById("inspector-host")?.setAttribute("data-sampled", "");
    }
  },
  { capture: true },
);

if (query.get("m0") === "1") {
  void import("./m0-app.js");
} else if (query.get("arena") === "1") {
  void import("./arena-app.js");
} else if (query.get("ecosystem") === "1") {
  void import("./ecosystem-app.js");
} else {
  void import("./app.js");
}
