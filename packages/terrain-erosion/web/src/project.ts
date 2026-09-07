import type { Snapshot, Parameters } from "./solver";
export interface Project {
  version: 1;
  scene: string;
  n: number;
  snapshot: Snapshot;
  events: unknown[];
  initialParams: Parameters;
}
const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
const inRange = (v: unknown, lo: number, hi: number) =>
  finite(v) && v >= lo && v <= hi;
/** Validate before allocating or replacing the current GPU project. */
export function parseProject(text: string): Project {
  if (text.length > 140_000_000)
    throw Error("Project exceeds the supported size");
  const p = JSON.parse(text);
  if (
    p.version !== 1 ||
    !["plateau", "heist", "breach", "shield"].includes(p.scene) ||
    ![128, 256, 512].includes(p.n)
  )
    throw Error("Unsupported project version, scene or grid");
  const s = p.snapshot;
  if (
    !s ||
    !Array.isArray(s.data) ||
    s.data.length !== p.n * p.n * 16 ||
    !Array.isArray(s.clock) ||
    s.clock.length !== 4 ||
    !s.clock.every(finite) ||
    !inRange(s.clock[2], 0, 1e8) ||
    !Number.isSafeInteger(s.steps) ||
    s.steps < 0
  )
    throw Error("Invalid project state or clock");
  const events = p.events ?? [];
  if (!Array.isArray(events) || events.length > 1000000)
    throw Error("Invalid event log");
  let previousStep = 0;
  for (const event of events) {
    if (
      !event ||
      !Number.isSafeInteger(event.step) ||
      event.step < previousStep ||
      event.step > s.steps ||
      ![0, 1, 2, 3, 4, 5].includes(event.kind)
    )
      throw Error("Invalid event ordering");
    previousStep = event.step;
    if (
      event.kind !== 0 &&
      (!inRange(event.x, 0, 32) ||
        !inRange(event.y, 0, 32) ||
        !inRange(event.radius, 0.1, 5) ||
        !inRange(event.amount, 0, 2) ||
        !inRange(event.value, 0, 20))
    )
      throw Error("Invalid brush event");
  }
  const a = s.params as Parameters;
  for (const a of [
    s.params,
    p.initialParams ?? s.params,
    ...events.filter((e) => e.kind === 0).map((e) => e.params),
  ] as Parameters[]) {
    if (
      !a ||
      a.dx !== 32 / p.n ||
      !inRange(a.maxdt, 1e-6, 0.1) ||
      !inRange(a.erosion, 0, 20) ||
      !inRange(a.settling, 0, 0.1) ||
      !inRange(a.friction, 0.001, 0.1) ||
      a.boundary !== 1 ||
      a.negative !== 0 ||
      !Array.isArray(a.source) ||
      a.source.length !== 4 ||
      !inRange(a.source[0], 0, 32) ||
      !inRange(a.source[1], 0, 32) ||
      !inRange(a.source[2], 0.1, 5) ||
      !inRange(a.source[3], 0, 1)
    )
      throw Error("Invalid physical parameters");
  }
  for (let i = 0; i < s.data.length; i += 16) {
    for (let j = 0; j < 16; j++)
      if (!inRange(s.data[i + j], -1e7, 1e7))
        throw Error("Non-finite or out-of-range field");
    for (const j of [0, 3, 5, 6, 12])
      if (s.data[i + j] < 0) throw Error("Negative conserved reservoir");
    if (!inRange(s.data[i + 7], 0.05, 20) || s.data[i + 12] > 0.1)
      throw Error("Invalid material or rain field");
  }
  const clock = new Float32Array(s.clock);
  if (new Uint32Array(clock.buffer)[1] !== 0)
    throw Error("Project contains a failed numerical guard");
  return {
    version: 1,
    scene: p.scene,
    n: p.n,
    snapshot: {
      data: new Float32Array(s.data),
      clock,
      steps: s.steps,
      params: a,
    },
    events,
    initialParams: p.initialParams ?? a,
  };
}
