export const ARENA_SCHEMA_VERSION = "flow-lenia-arena-environment-v1" as const;

export interface ArenaStorm {
  startStep: number;
  duration: number;
  center: readonly [number, number];
  radius: number;
  amplitude: number;
}

export interface ArenaAttractor {
  center: readonly [number, number];
  radius: number;
  amplitude: number;
  orbitRadius: number;
  angularSpeed: number;
  phase: number;
}

export interface ArenaDynamics {
  channelResponse: readonly [number, number, number];
  gateOpenStep: number;
  gateCloseStep: number;
  storm: ArenaStorm;
  attractor: ArenaAttractor;
}

export interface ArenaEnvironmentState {
  schemaVersion: typeof ARENA_SCHEMA_VERSION;
  /** Per-cell vec4: authored affinity, soft-wall affinity, closed-gate affinity, wall opacity. */
  field: Float32Array;
  /** Per-cell authored region ID. Zero is unclassified; release cards use one through three. */
  regions: Uint32Array;
  dynamics: ArenaDynamics;
}

export type ArenaBrushMode = "affinity" | "wall" | "erase";

export interface ArenaBrushEvent {
  row: number;
  column: number;
  radius: number;
  strength: number;
  mode: ArenaBrushMode;
  atStep?: number;
}

export const QUIET_STORM: ArenaStorm = {
  startStep: 0,
  duration: 0,
  center: [0.5, 0.5],
  radius: 0.2,
  amplitude: 0,
};

export const QUIET_ATTRACTOR: ArenaAttractor = {
  center: [0.5, 0.5],
  radius: 0.15,
  amplitude: 0,
  orbitRadius: 0,
  angularSpeed: 0,
  phase: 0,
};

export function gateOpenAt(dynamics: ArenaDynamics, step: number): boolean {
  if (dynamics.gateOpenStep < 0 || step < dynamics.gateOpenStep) return false;
  return dynamics.gateCloseStep <= dynamics.gateOpenStep || step < dynamics.gateCloseStep;
}

export function stormEnvelopeAt(storm: ArenaStorm, step: number): number {
  if (storm.duration <= 0 || step < storm.startStep || step >= storm.startStep + storm.duration) return 0;
  const phase = (step - storm.startStep + 0.5) / storm.duration;
  return Math.sin(Math.PI * phase);
}

export function attractorCenterAt(attractor: ArenaAttractor, step: number): readonly [number, number] {
  const angle = attractor.phase + attractor.angularSpeed * step;
  return [
    attractor.center[0] + attractor.orbitRadius * Math.cos(angle),
    attractor.center[1] + attractor.orbitRadius * Math.sin(angle),
  ];
}

function torusDelta(value: number): number { return value - Math.round(value); }

/** CPU mirror of the Arena WGSL field evaluation, used by inspection and release gates. */
export function arenaExternalAt(
  field: Float32Array,
  n: number,
  row: number,
  column: number,
  dynamics: ArenaDynamics,
  step: number,
): number {
  const i = ((Math.floor(row) % n) + n) % n;
  const j = ((Math.floor(column) % n) + n) % n;
  const base = (i * n + j) * 4;
  let value = (field[base] as number) + (field[base + 1] as number);
  if (!gateOpenAt(dynamics, step)) value += field[base + 2] as number;
  const x = (i + 0.5) / n;
  const y = (j + 0.5) / n;
  const stormEnvelope = stormEnvelopeAt(dynamics.storm, step);
  if (stormEnvelope > 0 && dynamics.storm.amplitude !== 0) {
    const dx = torusDelta(x - dynamics.storm.center[0]);
    const dy = torusDelta(y - dynamics.storm.center[1]);
    const radius = Math.max(dynamics.storm.radius, 1e-6);
    const radial = Math.exp(-0.5 * (dx * dx + dy * dy) / (radius * radius));
    const angular = Math.cos(3 * Math.atan2(dy, dx) + 2 * Math.PI * stormEnvelope);
    value += dynamics.storm.amplitude * stormEnvelope * radial * angular;
  }
  if (dynamics.attractor.amplitude !== 0) {
    const center = attractorCenterAt(dynamics.attractor, step);
    const dx = torusDelta(x - center[0]);
    const dy = torusDelta(y - center[1]);
    const radius = Math.max(dynamics.attractor.radius, 1e-6);
    value += dynamics.attractor.amplitude * Math.exp(-0.5 * (dx * dx + dy * dy) / (radius * radius));
  }
  return value;
}

export function validateArenaEnvironment(state: ArenaEnvironmentState, n: number): void {
  if (state.schemaVersion !== ARENA_SCHEMA_VERSION) throw new Error(`unsupported Arena environment schema: ${String(state.schemaVersion)}`);
  if (state.field.length !== n * n * 4 || state.regions.length !== n * n) throw new Error("Arena environment has an invalid packed length");
  if (state.dynamics.channelResponse.length !== 3) throw new Error("Arena channel response must have exactly three entries");
  const finite = [
    ...state.dynamics.channelResponse,
    state.dynamics.gateOpenStep, state.dynamics.gateCloseStep,
    state.dynamics.storm.startStep, state.dynamics.storm.duration, ...state.dynamics.storm.center,
    state.dynamics.storm.radius, state.dynamics.storm.amplitude,
    ...state.dynamics.attractor.center, state.dynamics.attractor.radius, state.dynamics.attractor.amplitude,
    state.dynamics.attractor.orbitRadius, state.dynamics.attractor.angularSpeed, state.dynamics.attractor.phase,
  ];
  if (!finite.every(Number.isFinite)) throw new Error("Arena dynamics contain a non-finite value");
  if (state.dynamics.storm.radius <= 0 || state.dynamics.attractor.radius <= 0) throw new Error("Arena dynamic radii must be positive");
  for (const value of state.field) if (!Number.isFinite(value) || Math.abs(value) > 20) throw new Error("Arena field values must be finite and within [-20, 20]");
  for (const region of state.regions) if (region > 3) throw new Error("Arena release regions must be within [0, 3]");
}
