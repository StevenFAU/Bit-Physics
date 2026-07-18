import { KERNEL_SPECS } from "../model/config.js";
import type { CellInspection } from "../model/solver.js";

function line(parent: HTMLElement, label: string, value = "—"): HTMLDivElement {
  const row = document.createElement("div");
  row.className = "fl-inspect-row";
  const term = document.createElement("span");
  term.textContent = label;
  const reading = document.createElement("output");
  reading.dataset.field = label;
  reading.textContent = value;
  row.append(term, reading);
  parent.appendChild(row);
  return row;
}

export class ScientificInspector {
  readonly element: HTMLElement;
  private readonly kernelCanvas: HTMLCanvasElement;
  private readonly responseCanvas: HTMLCanvasElement;
  private readonly fields = new Map<string, HTMLOutputElement>();
  private kernel = 0;
  private latest: CellInspection | null = null;

  constructor(host: HTMLElement) {
    this.element = document.createElement("aside");
    this.element.className = "fl-inspector";
    this.element.setAttribute("aria-label", "Scientific cell inspector");
    const heading = document.createElement("div");
    heading.className = "fl-inspector-head";
    heading.innerHTML = "<span>INSPECT LENS</span><b>read only</b>";
    this.element.appendChild(heading);
    const values = document.createElement("div");
    values.className = "fl-inspect-values";
    for (const label of ["cell", "mass C₀/C₁/C₂", "density ρ", "affinity V", "pressure α", "flow F", "displacement dt·F", "clamped"]) {
      const row = line(values, label);
      this.fields.set(label, row.querySelector("output") as HTMLOutputElement);
    }
    this.element.appendChild(values);

    const kernelHead = document.createElement("label");
    kernelHead.className = "fl-kernel-label";
    kernelHead.textContent = "kernel rings ";
    const select = document.createElement("select");
    select.setAttribute("aria-label", "Inspected kernel");
    KERNEL_SPECS.forEach((kernel, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = `K${index} · C${kernel.source}→C${kernel.target}`;
      select.appendChild(option);
    });
    select.addEventListener("change", () => {
      this.kernel = Number.parseInt(select.value, 10);
      this.draw();
    });
    kernelHead.appendChild(select);
    this.kernelCanvas = document.createElement("canvas");
    this.kernelCanvas.width = 240;
    this.kernelCanvas.height = 108;
    this.kernelCanvas.setAttribute("role", "img");
    this.kernelCanvas.setAttribute("aria-label", "Normalized spatial rings for kernel zero");
    this.responseCanvas = document.createElement("canvas");
    this.responseCanvas.width = 240;
    this.responseCanvas.height = 108;
    this.responseCanvas.setAttribute("role", "img");
    this.responseCanvas.setAttribute("aria-label", "Bell growth response and inspected perception sample");
    this.element.append(kernelHead, this.kernelCanvas, this.responseCanvas);
    const note = document.createElement("p");
    note.className = "fl-inspect-note";
    note.textContent = "Alt samples from any tool · kernel plot is normalized shape; response dot is the selected cell.";
    this.element.appendChild(note);
    host.appendChild(this.element);
    this.draw();
  }

  update(inspection: CellInspection): void {
    this.latest = inspection;
    const channel = KERNEL_SPECS[this.kernel]?.target ?? 0;
    this.set("cell", `${inspection.cell[0]}, ${inspection.cell[1]}`);
    this.set("mass C₀/C₁/C₂", inspection.mass.map((value) => value.toFixed(3)).join(" · "));
    this.set("density ρ", inspection.density.toFixed(4));
    this.set("affinity V", inspection.affinity.map((value) => value.toFixed(3)).join(" · "));
    this.set("pressure α", inspection.alpha.map((value) => value.toFixed(3)).join(" · "));
    this.set("flow F", inspection.flow[channel]?.map((value) => value.toFixed(3)).join(", ") ?? "—");
    this.set("displacement dt·F", inspection.displacement[channel]?.map((value) => value.toFixed(3)).join(", ") ?? "—");
    this.set("clamped", inspection.clamp.some((value) => value > 0.5) ? "yes" : "no");
    this.draw();
  }

  private set(label: string, value: string): void { const output = this.fields.get(label); if (output) output.textContent = value; }

  private draw(): void {
    const spec = KERNEL_SPECS[this.kernel] as (typeof KERNEL_SPECS)[number];
    const kernelContext = this.kernelCanvas.getContext("2d") as CanvasRenderingContext2D;
    kernelContext.clearRect(0, 0, 240, 108);
    kernelContext.fillStyle = "#071017";
    kernelContext.fillRect(0, 0, 240, 108);
    kernelContext.save();
    kernelContext.translate(58, 54);
    kernelContext.strokeStyle = "#31535a";
    kernelContext.lineWidth = 1;
    kernelContext.beginPath(); kernelContext.arc(0, 0, 43, 0, Math.PI * 2); kernelContext.stroke();
    const colors = ["#5de1c1", "#d477ff", "#ffb34d"];
    spec.ringCenters.forEach((center, index) => {
      kernelContext.strokeStyle = colors[index] as string;
      kernelContext.globalAlpha = 0.35 + 0.6 * (spec.ringAmplitudes[index] as number);
      kernelContext.lineWidth = Math.max(1.5, 42 * Math.sqrt(spec.ringWidths[index] as number));
      kernelContext.beginPath(); kernelContext.arc(0, 0, center * 42, 0, Math.PI * 2); kernelContext.stroke();
    });
    kernelContext.restore();
    kernelContext.globalAlpha = 1;
    kernelContext.strokeStyle = "#75d8c0";
    kernelContext.beginPath();
    for (let pixel = 0; pixel <= 132; pixel += 1) {
      const radius = pixel / 132;
      let value = 0;
      for (let ring = 0; ring < 3; ring += 1) {
        const delta = radius - (spec.ringCenters[ring] as number);
        value += (spec.ringAmplitudes[ring] as number) * Math.exp(-(delta * delta) / (spec.ringWidths[ring] as number));
      }
      const x = 98 + pixel;
      const y = 93 - Math.min(1, value) * 72;
      if (pixel === 0) kernelContext.moveTo(x, y); else kernelContext.lineTo(x, y);
    }
    kernelContext.stroke();
    kernelContext.fillStyle = "#8aa7aa";
    kernelContext.font = "10px ui-monospace, monospace";
    kernelContext.fillText(`K${this.kernel}  r=${spec.relativeRadius.toFixed(2)}  Σ=1`, 98, 104);
    this.kernelCanvas.setAttribute("aria-label", `Normalized three-ring spatial kernel ${this.kernel}, channel ${spec.source} to ${spec.target}`);

    const responseContext = this.responseCanvas.getContext("2d") as CanvasRenderingContext2D;
    responseContext.clearRect(0, 0, 240, 108);
    responseContext.fillStyle = "#071017";
    responseContext.fillRect(0, 0, 240, 108);
    responseContext.strokeStyle = "#29464d";
    responseContext.beginPath(); responseContext.moveTo(18, 54); responseContext.lineTo(230, 54); responseContext.stroke();
    responseContext.strokeStyle = "#ffb860";
    responseContext.beginPath();
    const xmax = 0.6;
    for (let pixel = 0; pixel <= 212; pixel += 1) {
      const perception = pixel / 212 * xmax;
      const z = (perception - spec.growthMean) / spec.growthWidth;
      const growth = 2 * Math.exp(-0.5 * z * z) - 1;
      const x = 18 + pixel;
      const y = 54 - growth * 40;
      if (pixel === 0) responseContext.moveTo(x, y); else responseContext.lineTo(x, y);
    }
    responseContext.stroke();
    const sample = this.latest?.perception[this.kernel];
    const sampleGrowth = this.latest?.growth[this.kernel];
    if (sample !== undefined && sampleGrowth !== undefined) {
      const x = 18 + Math.max(0, Math.min(1, sample / xmax)) * 212;
      const y = 54 - Math.max(-1, Math.min(1, sampleGrowth)) * 40;
      responseContext.fillStyle = "#efff91";
      responseContext.beginPath(); responseContext.arc(x, y, 4, 0, Math.PI * 2); responseContext.fill();
    }
    responseContext.fillStyle = "#8aa7aa";
    responseContext.font = "10px ui-monospace, monospace";
    responseContext.fillText(`G(U) · m=${spec.growthMean.toFixed(2)} · s=${spec.growthWidth.toFixed(3)} · −1…+1`, 18, 104);
  }
}
