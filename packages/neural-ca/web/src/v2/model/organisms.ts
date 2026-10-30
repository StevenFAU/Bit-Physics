// The Menagerie (M1): organisms the page runs through the gated kernel with
// their own weights. The list, the provenance of each organism's training and
// its measured behaviour come from public/menagerie/menagerie.json, written
// by packages/neural-ca/menagerie/build.py from the training runs; nothing
// here is retyped. Every weights file is SHA-256 checked against that
// manifest as it arrives, and the gated disk is the committed checkpoint the
// release gate re-runs.

import { sha256hex } from "@bp/verify";
import type { Checkpoint } from "../proof/gate.js";
import { assetUrl } from "../proof/gate.js";

export interface Training {
  regime: "persistent" | "regenerating";
  note?: string;
  trainer?: string;
  target?: string;
  adapter?: string;
  grid?: number;
  batch?: number;
  pool?: number;
  rollout?: [number, number];
  damaged_per_batch?: number;
  iterations?: number;
  lr?: [number, number, number];
  seed?: number;
  train_seconds?: number;
  final_loss_mean_last_200?: number;
  loss_curve?: [number, number][];
  theta_sha256?: string;
}

export interface Measured {
  growth_iou: Record<string, number>;
  alive_cells_every_250: number[];
  alive_at_long_run: number;
  regrow: {
    mean_iou_200: number;
    min_iou_200: number;
    mean_twin_200: number;
    mean_iou_800: number;
    min_iou_800: number;
    mean_twin_800: number;
    mean_iou_cut: number;
  };
}

export interface OrganismDef {
  id: string;
  name: string;
  blurb: string;
  gated: boolean;
  weights: string;
  sha256: string;
  target: string;
  training: Training;
  measured: Measured;
}

export interface MenagerieManifest {
  grid: number;
  regrow_protocol: { cut_at_step: number; cuts: string[]; measured_after: number[]; seeds: number[]; iou: string };
  organisms: OrganismDef[];
}

export interface Organism {
  def: OrganismDef;
  ck: Checkpoint;
}

/** Regrowth good enough to say "it heals" (mean IoU with the target 200 steps after the standard cuts). */
export const HEALS_IOU = 0.8;

export function heals(d: OrganismDef): boolean {
  return d.training.regime === "regenerating" && d.measured.regrow.mean_iou_200 >= HEALS_IOU;
}

export async function fetchMenagerie(): Promise<MenagerieManifest> {
  const r = await fetch(assetUrl("menagerie/menagerie.json"));
  if (!r.ok) throw new Error(`menagerie fetch failed: ${r.status}`);
  return (await r.json()) as MenagerieManifest;
}

export class OrganismLibrary {
  readonly defs: readonly OrganismDef[];
  private readonly cache = new Map<string, Promise<Organism>>();

  constructor(
    readonly manifest: MenagerieManifest,
    gated: Checkpoint,
  ) {
    this.defs = manifest.organisms;
    const disk = this.defs.find((d) => d.gated);
    if (!disk) throw new Error("the menagerie lists no gated organism");
    if (disk.sha256 !== gated.sha256) throw new Error("the menagerie's gated organism is not the committed checkpoint");
    this.cache.set(disk.id, Promise.resolve({ def: disk, ck: gated }));
    this.layout = gated;
  }

  private readonly layout: Checkpoint;

  get gatedId(): string {
    return this.defs.find((d) => d.gated)!.id;
  }

  def(id: string): OrganismDef | undefined {
    return this.defs.find((d) => d.id === id);
  }

  /** Organisms trained with damage that measurably heal, in manifest order. */
  get healers(): OrganismDef[] {
    return this.defs.filter(heals);
  }

  /** Chimera's default second organism for `id`: the next healer in the manifest (never `id` itself). */
  partnerFor(id: string): string {
    const list = this.healers.map((d) => d.id).filter((x) => x !== id);
    if (list.length === 0) return this.defs.find((d) => d.id !== id)?.id ?? id;
    const all = this.healers.map((d) => d.id);
    const i = all.indexOf(id);
    return i >= 0 ? all[(i + 1) % all.length]! : list[0]!;
  }

  /** The Dish's organism for a calendar day: the healers in turn (the spec's "rotating daily"). */
  today(now = new Date()): string {
    const list = this.healers;
    if (list.length === 0) return this.gatedId;
    const day = Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);
    return list[day % list.length]!.id;
  }

  /** Fetch (once) and SHA-check an organism's weights; they use the committed layout. */
  get(id: string): Promise<Organism> {
    let p = this.cache.get(id);
    if (!p) {
      const def = this.def(id);
      if (!def) return Promise.reject(new Error(`no organism ${id}`));
      p = (async () => {
        const r = await fetch(assetUrl(def.weights));
        if (!r.ok) throw new Error(`${def.name} weights fetch failed: ${r.status}`);
        const buf = await r.arrayBuffer();
        const sha = await sha256hex(buf);
        if (sha !== def.sha256) throw new Error(`${def.name} weights do not match the menagerie (${sha.slice(0, 12)}…)`);
        if (buf.byteLength !== this.layout.weights.byteLength) throw new Error(`${def.name} weights are not in the committed layout`);
        const { b1Off, w1Off, w2Off } = this.layout;
        return { def, ck: { weights: new Float32Array(buf), b1Off, w1Off, w2Off, sha256: sha } };
      })();
      this.cache.set(id, p);
      p.catch(() => this.cache.delete(id));
    }
    return p;
  }

  /** Teach (M2): make a taught or saved organism loadable by id (it is not in the manifest and never in a link). */
  register(o: Organism): void {
    this.cache.set(o.def.id, Promise.resolve(o));
  }

  /** In the committed menagerie (shareable by link)? */
  inGallery(id: string): boolean {
    return this.defs.some((d) => d.id === id);
  }

  all(): Promise<Organism[]> {
    return Promise.all(this.defs.map((d) => this.get(d.id)));
  }
}
