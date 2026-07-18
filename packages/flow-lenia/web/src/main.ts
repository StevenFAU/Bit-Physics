const query = new URLSearchParams(location.search);
// Routed mode modules mount createSettingsPanel and publish exposeCapture only after WebGPU boot.

if (query.get("m0") === "1") {
  void import("./m0-app.js");
} else if (query.get("arena") === "1") {
  void import("./arena-app.js");
} else if (query.get("ecosystem") === "1") {
  void import("./ecosystem-app.js");
} else {
  void import("./app.js");
}
