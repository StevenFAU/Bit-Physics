// The falcon (07-boids-3d.md, "The model"; M1): a kinematic agent — a
// position and a velocity, a speed range and a largest turn rate — advanced
// on the CPU once per model step and handed to that step's uniforms, so the
// flock sees exactly where it was at every step.
//
// Three ways to fly it:
//   player   steer towards a point (the pointer on the flock's plane) and/or
//            with keys (A/D turn, W/S climb and dive), Shift for the stoop
//   pursuit  the scripted fallback: climb to a perch above and behind the
//            flock's last known centre, stoop through it, climb out, again
//   script   a fixed path through given waypoints, a function of the step
//            alone — deterministic, so an attack replays byte for byte
// Units are model units (about 2 m) and seconds. A peregrine's level flight is
// ~10–15 m/s and its stoop far faster; here 9–15 units/s (18–30 m/s), against
// the starlings' 5.5 (11 m/s).

import type { V3 } from "./flock.js";

export type FalconMode = "off" | "player" | "pursuit" | "script";

export interface FalconLimits {
  cruise: number;
  stoop: number;
  slowest: number;
  /** Largest turn rate, rad/s. */
  turn: number;
}

export const FALCON: FalconLimits = { cruise: 9, stoop: 15, slowest: 5, turn: 1.9 };

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const len = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
const norm = (a: V3, fb: V3 = [0, 0, -1]): V3 => {
  const l = len(a);
  return l > 1e-9 ? [a[0] / l, a[1] / l, a[2] / l] : fb;
};
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Rotate unit vector `from` towards unit `to` by at most `maxAngle` radians. */
export function turnTowards(from: V3, to: V3, maxAngle: number): V3 {
  const c = Math.min(Math.max(dot(from, to), -1), 1);
  const angle = Math.acos(c);
  if (angle <= maxAngle || angle < 1e-9) return [...to];
  // the component of `to` perpendicular to `from`
  let perp = sub(to, scale(from, c));
  if (len(perp) < 1e-9) perp = Math.abs(from[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  perp = norm(sub(perp, scale(from, dot(perp, from))));
  return norm(add(scale(from, Math.cos(maxAngle)), scale(perp, Math.sin(maxAngle))));
}

export interface PlayerInput {
  /** A point to fly at (model units), or null to fly straight. */
  aim: V3 | null;
  /** -1 … 1: A/D. */
  yaw: number;
  /** -1 … 1: W climbs, S dives. */
  pitch: number;
  stoop: boolean;
}

export class Falcon {
  mode: FalconMode = "off";
  position: V3 = [0, 30, 60];
  heading: V3 = [0, 0, -1];
  speed = FALCON.cruise;
  limits: FalconLimits = { ...FALCON };
  input: PlayerInput = { aim: null, yaw: 0, pitch: 0, stoop: false };
  /** Pursuit: the flock's last known centre and mean heading (from the instruments). */
  target: { centre: V3; heading: V3 } | null = null;
  /** Script: waypoints and the step the path starts at. */
  script: { start: number; points: V3[] } | null = null;
  private phase: "perch" | "stoop" = "perch";
  private stoopSteps = 0;

  get flying(): boolean {
    return this.mode !== "off";
  }

  get velocity(): V3 {
    return scale(this.heading, this.speed);
  }

  /** Put the falcon on a perch: above and behind a point, heading towards it. */
  placeNear(centre: V3, distance = 55): void {
    this.position = [centre[0] + distance * 0.6, Math.min(centre[1] + 22, 30), centre[2] + distance * 0.8];
    this.heading = norm(sub(centre, this.position));
    this.speed = this.limits.cruise;
    this.phase = "perch";
  }

  /** Advance one model step of dt seconds; `step` is the model step (script mode). */
  advance(dt: number, step: number): void {
    if (this.mode === "off") return;
    let desired: V3 = this.heading;
    let targetSpeed = this.limits.cruise;
    if (this.mode === "player") {
      const i = this.input;
      if (i.aim) desired = norm(sub(i.aim, this.position), this.heading);
      if (i.yaw !== 0 || i.pitch !== 0) {
        const right = norm([-this.heading[2], 0, this.heading[0]], [1, 0, 0]);
        desired = norm(add(add(desired, scale(right, i.yaw * 0.8)), [0, i.pitch * 0.7, 0]), desired);
      }
      targetSpeed = i.stoop ? this.limits.stoop : this.limits.cruise;
    } else if (this.mode === "pursuit" && this.target) {
      const t = this.target;
      if (this.phase === "perch") {
        // above and behind the flock, then turn in
        const perch = add(add(t.centre, scale(norm([t.heading[0], 0, t.heading[2]]), -38)), [0, 20, 0]);
        desired = norm(sub(perch, this.position), this.heading);
        if (len(sub(perch, this.position)) < 8) {
          this.phase = "stoop";
          this.stoopSteps = 0;
        }
      } else {
        const lead = add(t.centre, scale(t.heading, 6));
        desired = norm(sub(lead, this.position), this.heading);
        targetSpeed = this.limits.stoop;
        this.stoopSteps += 1;
        if (len(sub(lead, this.position)) < 3 || this.stoopSteps > 360) this.phase = "perch";
      }
    } else if (this.mode === "script" && this.script) {
      const pts = this.script.points;
      // waypoint k is due at script.start + k·240 steps (2 s apart)
      const k = Math.min(Math.max(Math.floor((step - this.script.start) / 240) + 1, 0), pts.length - 1);
      desired = norm(sub(pts[k]!, this.position), this.heading);
      targetSpeed = k >= 2 ? this.limits.stoop : this.limits.cruise;
    }
    // never into the ground (model y −40 is the ground)
    if (this.position[1] < -30 && desired[1] < 0.2) desired = norm([desired[0], 0.35, desired[2]]);
    this.heading = turnTowards(this.heading, desired, this.limits.turn * dt);
    // a stoop gains speed fastest when diving
    const accel = this.heading[1] < -0.2 ? 9 : 4;
    this.speed += Math.min(Math.max(targetSpeed - this.speed, -accel * dt), accel * dt);
    this.speed = Math.min(Math.max(this.speed, this.limits.slowest), this.limits.stoop);
    this.position = add(this.position, scale(this.heading, this.speed * dt));
  }

  /** The falcon's state for a step's uniforms, or null when it is not flying. */
  state(): { position: V3; velocity: V3 } | null {
    return this.flying ? { position: [...this.position], velocity: this.velocity } : null;
  }

  snapshot(): FalconSnapshot {
    return { mode: this.mode, position: [...this.position], heading: [...this.heading], speed: this.speed, phase: this.phase, stoopSteps: this.stoopSteps };
  }

  restore(s: FalconSnapshot): void {
    this.mode = s.mode;
    this.position = [...s.position];
    this.heading = [...s.heading];
    this.speed = s.speed;
    this.phase = s.phase;
    this.stoopSteps = s.stoopSteps;
  }
}

export interface FalconSnapshot {
  mode: FalconMode;
  position: V3;
  heading: V3;
  speed: number;
  phase: "perch" | "stoop";
  stoopSteps: number;
}
