// Canvas input (00-foundation.md § 2.5): pointer events only (mouse, pen and
// touch unified). One pointer drives the active tool; two touch pointers
// pinch-zoom and pan; middle/right mouse, Space-drag or the hand tool pan;
// wheel and trackpad pinch zoom at the cursor; double-click fits. Canvas
// gestures never scroll the page.

export interface CameraLike {
  panBy(dx: number, dy: number): void;
  zoomAt(factor: number, sx: number, sy: number): void;
  fling(vx: number, vy: number): void;
  stop(): void;
  fit(zoom?: number, animate?: boolean): void;
}

export interface ToolHandlers {
  /** True when the active tool paints (single-pointer drags go to it). */
  paints(): boolean;
  down(x: number, y: number, e: PointerEvent): void;
  move(x: number, y: number, e: PointerEvent): void;
  up(x: number, y: number, e: PointerEvent): void;
  /** Hover without buttons (preview ring), or null when the pointer left. */
  hover(x: number | null, y: number | null): void;
  /** Click with a non-painting tool (probe, dive). */
  tap?(x: number, y: number, e: PointerEvent): void;
}

export class CanvasInput {
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private mode: "idle" | "tool" | "pan" | "pinch" = "idle";
  private last = { x: 0, y: 0, t: 0 };
  private vel = { x: 0, y: 0 };
  private pinchDist = 0;
  private pinchMid = { x: 0, y: 0 };
  private downAt = { x: 0, y: 0, t: 0 };
  private spaceHeld = false;
  enabled = true;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: CameraLike,
    private readonly tool: ToolHandlers,
    private readonly isPanTool: () => boolean,
  ) {
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", (e) => this.onDown(e));
    canvas.addEventListener("pointermove", (e) => this.onMove(e));
    canvas.addEventListener("pointerup", (e) => this.onUp(e));
    canvas.addEventListener("pointercancel", (e) => this.onUp(e, true));
    canvas.addEventListener("pointerleave", () => {
      if (this.pointers.size === 0) this.tool.hover(null, null);
    });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const p = this.local(e);
        // trackpad pinch arrives as ctrl+wheel with small deltas
        const k = e.ctrlKey ? 0.01 : 0.0015;
        const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
        this.camera.zoomAt(Math.exp(-dy * k), p.x, p.y);
      },
      { passive: false },
    );
    canvas.addEventListener("dblclick", (e) => {
      if (this.tool.paints() && !this.isPanTool()) return;
      e.preventDefault();
      this.camera.fit(1, true);
    });
    canvas.addEventListener("keydown", (e) => {
      const step = e.shiftKey ? 120 : 40;
      const r = canvas.getBoundingClientRect();
      switch (e.key) {
        case "ArrowLeft":
          this.camera.panBy(step, 0);
          break;
        case "ArrowRight":
          this.camera.panBy(-step, 0);
          break;
        case "ArrowUp":
          this.camera.panBy(0, step);
          break;
        case "ArrowDown":
          this.camera.panBy(0, -step);
          break;
        case "+":
        case "=":
          this.camera.zoomAt(1.25, r.width / 2, r.height / 2);
          break;
        case "-":
        case "_":
          this.camera.zoomAt(0.8, r.width / 2, r.height / 2);
          break;
        case "0":
          this.camera.fit(1, true);
          break;
        default:
          return;
      }
      e.preventDefault();
    });
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space" && e.target === canvas) this.spaceHeld = true;
    });
    window.addEventListener("keyup", (e) => {
      if (e.code === "Space") this.spaceHeld = false;
    });
  }

  private local(e: { clientX: number; clientY: number }): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private onDown(e: PointerEvent): void {
    if (!this.enabled) return;
    this.canvas.setPointerCapture(e.pointerId);
    const p = this.local(e);
    this.pointers.set(e.pointerId, p);
    this.camera.stop();
    if (this.pointers.size >= 2) {
      if (this.mode === "tool") this.tool.up(p.x, p.y, e);
      this.mode = "pinch";
      const [a, b] = [...this.pointers.values()];
      this.pinchDist = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      this.pinchMid = { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 };
      return;
    }
    this.downAt = { x: p.x, y: p.y, t: performance.now() };
    this.last = { x: p.x, y: p.y, t: performance.now() };
    this.vel = { x: 0, y: 0 };
    const panButton = e.pointerType === "mouse" && (e.button === 1 || e.button === 2);
    if (panButton || this.spaceHeld || this.isPanTool() || !this.tool.paints()) {
      this.mode = "pan";
      return;
    }
    this.mode = "tool";
    this.tool.down(p.x, p.y, e);
  }

  private onMove(e: PointerEvent): void {
    const p = this.local(e);
    if (!this.pointers.has(e.pointerId)) {
      if (this.enabled && e.pointerType !== "touch") this.tool.hover(p.x, p.y);
      return;
    }
    this.pointers.set(e.pointerId, p);
    if (this.mode === "pinch" && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      const mid = { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 };
      this.camera.panBy(mid.x - this.pinchMid.x, mid.y - this.pinchMid.y);
      if (this.pinchDist > 0) this.camera.zoomAt(d / this.pinchDist, mid.x, mid.y);
      this.pinchDist = d;
      this.pinchMid = mid;
      return;
    }
    const now = performance.now();
    if (this.mode === "pan") {
      const dt = Math.max(1, now - this.last.t) / 1000;
      this.camera.panBy(p.x - this.last.x, p.y - this.last.y);
      this.vel = { x: (p.x - this.last.x) / dt, y: (p.y - this.last.y) / dt };
    } else if (this.mode === "tool") {
      this.tool.move(p.x, p.y, e);
      this.tool.hover(p.x, p.y);
    }
    this.last = { x: p.x, y: p.y, t: now };
  }

  private onUp(e: PointerEvent, cancelled = false): void {
    const p = this.local(e);
    const had = this.pointers.delete(e.pointerId);
    if (!had) return;
    if (this.mode === "pinch") {
      if (this.pointers.size === 0) this.mode = "idle";
      return;
    }
    if (this.mode === "pan") {
      const moved = Math.hypot(p.x - this.downAt.x, p.y - this.downAt.y);
      const quick = performance.now() - this.downAt.t < 350;
      if (!cancelled && moved < 6 && quick && !this.isPanTool() && !this.tool.paints()) {
        this.tool.tap?.(p.x, p.y, e);
      } else if (!cancelled && performance.now() - this.last.t < 80) {
        this.camera.fling(this.vel.x, this.vel.y);
      }
    } else if (this.mode === "tool") {
      this.tool.up(p.x, p.y, e);
    }
    this.mode = "idle";
  }
}
