// EnvironmentProbe (F4): what a shiny surface reflects. A small cube texture
// of the backdrop as seen from one point, rendered once (or when the look
// changes) through six 90° views: LiquidSurface samples it in the reflected
// direction. Anything that draws a backdrop from a View3D can fill it — F3's
// Environment (`captureEnvironment`) or a sim's own room (`capture`).
//
// Face order and orientation follow the WebGPU (Vulkan / D3D) cube
// convention: faces +X, −X, +Y, −Y, +Z, −Z; on face f the texel (u, v), v
// down, is the direction ma + sc·(2u − 1) + tc·(2v − 1). Each face's view
// puts sc to the screen's right and −tc to its up, so a probe face renders
// exactly the texels `textureSample(cube, dir)` will read. Some of those
// bases are mirror images (left-handed): fine for full-screen backdrops,
// which draw no culled triangles.

import type { Vec3 } from "./orbit-camera.js";
import { perspective } from "./orbit-camera.js";
import { Environment } from "./environment.js";
import type { EnvironmentLook } from "./environment.js";
import { SCENE_FORMAT } from "./hdr.js";
import { View3D } from "./view3d.js";

/** Per face: the major axis, and the axes u (sc) and v (tc) run along. */
export const CUBE_FACES: readonly { ma: Vec3; sc: Vec3; tc: Vec3 }[] = [
  { ma: [1, 0, 0], sc: [0, 0, -1], tc: [0, -1, 0] },
  { ma: [-1, 0, 0], sc: [0, 0, 1], tc: [0, -1, 0] },
  { ma: [0, 1, 0], sc: [1, 0, 0], tc: [0, 0, 1] },
  { ma: [0, -1, 0], sc: [1, 0, 0], tc: [0, 0, -1] },
  { ma: [0, 0, 1], sc: [1, 0, 0], tc: [0, -1, 0] },
  { ma: [0, 0, -1], sc: [-1, 0, 0], tc: [0, -1, 0] },
];

/** The unit direction a cube sample at face f, texel coordinates (u, v) ∈ [0, 1]² reads. */
export function cubeFaceDirection(face: number, u: number, v: number): Vec3 {
  const f = CUBE_FACES[face]!;
  const a = 2 * u - 1;
  const b = 2 * v - 1;
  const d: Vec3 = [f.ma[0] + f.sc[0] * a + f.tc[0] * b, f.ma[1] + f.sc[1] * a + f.tc[1] * b, f.ma[2] + f.sc[2] * a + f.tc[2] * b];
  const l = Math.hypot(...d);
  return [d[0] / l, d[1] / l, d[2] / l];
}

/** Column-major view matrix of face f seen from `eye` (rows: right = sc, up = −tc, back = −ma). */
export function cubeFaceView(face: number, eye: Vec3): Float32Array<ArrayBuffer> {
  const f = CUBE_FACES[face]!;
  const r = f.sc;
  const u: Vec3 = [-f.tc[0], -f.tc[1], -f.tc[2]];
  const b: Vec3 = [-f.ma[0], -f.ma[1], -f.ma[2]];
  const dot = (a: Vec3, c: Vec3): number => a[0] * c[0] + a[1] * c[1] + a[2] * c[2];
  const m = new Float32Array(16);
  m.set([r[0], u[0], b[0], 0, r[1], u[1], b[1], 0, r[2], u[2], b[2], 0, -dot(r, eye), -dot(u, eye), -dot(b, eye), 1]);
  return m;
}

export class EnvironmentProbe {
  readonly texture: GPUTexture;
  /** The cube view LiquidSurface samples. */
  readonly cubeView: GPUTextureView;
  /** The probe's own view uniform: bind backdrop renderers to it to draw into the probe. */
  readonly view: View3D;
  /** Bumped on every capture. */
  version = 0;
  private readonly faces: GPUTextureView[];
  private env: Environment | null = null;

  constructor(
    private readonly device: GPUDevice,
    readonly size = 128,
    readonly format: GPUTextureFormat = SCENE_FORMAT,
  ) {
    this.texture = device.createTexture({
      size: [size, size, 6],
      format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      label: "environment-probe",
    });
    this.cubeView = this.texture.createView({ dimension: "cube" });
    this.faces = [0, 1, 2, 3, 4, 5].map((i) =>
      this.texture.createView({ dimension: "2d", baseArrayLayer: i, arrayLayerCount: 1, label: `environment-probe-${i}` }),
    );
    this.view = new View3D(device);
  }

  /**
   * Render the six faces from `centre` (world). `draw` records one backdrop
   * into a colour-only pass whose View3D is `this.view`; each face is its own
   * submit, so the view uniform written before it is the one it reads.
   */
  capture(centre: Vec3, draw: (pass: GPURenderPassEncoder) => void, near = 0.02, far = 100): void {
    const proj = perspective(Math.PI / 2, 1, near, far);
    for (let f = 0; f < 6; f += 1) {
      this.view.updateMatrices(cubeFaceView(f, centre), proj, centre, near, far, this.size, this.size, 0);
      const enc = this.device.createCommandEncoder({ label: `environment-probe-${f}` });
      const pass = enc.beginRenderPass({
        colorAttachments: [{ view: this.faces[f]!, loadOp: "clear", storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 1 } }],
      });
      draw(pass);
      pass.end();
      this.device.queue.submit([enc.finish()]);
    }
    this.version += 1;
  }

  /** Capture an F3 Environment look (its sky or studio gradient and ground). */
  async captureEnvironment(look: EnvironmentLook, centre: Vec3): Promise<void> {
    this.env ??= await Environment.create(this.device, this.view, look, { format: this.format });
    this.env.look = look;
    const env = this.env;
    this.capture(centre, (pass) => env.draw(pass));
  }

  destroy(): void {
    this.texture.destroy();
    this.view.buffer.destroy();
    this.env?.destroy();
  }
}
