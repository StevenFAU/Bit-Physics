// The local model library (Teach, M2; spec § Export): trained models saved on
// the visitor's device, in this browser's IndexedDB. Nothing is uploaded and
// nothing here is shared: clearing the site's data deletes them, and another
// browser or device has its own (empty) library. A download is the way to
// keep one or move it; the file is the weights in the committed checkpoint's
// layout (8,320 little-endian float32), the same as the Menagerie's files, so
// any copy of the page can import it.

export const DB_NAME = "bit-physics-grow";
const STORE = "models";
const VERSION = 1;
export const WEIGHTS_BYTES = 8320 * 4;

export interface ModelCard {
  /** Training iterations. */
  iterations: number;
  trainSeconds: number;
  /** Mean loss over the last 50 iterations. */
  finalLoss: number | null;
  adapter: string;
  tier: string;
  /** Overlap with the target grown from one cell (96 and 300 steps), from the last evaluation. */
  iou96: number | null;
  iou300: number | null;
  /** Mean IoU 200 steps after the three standard cuts, on the live kernel (null: not measured). */
  regrow: number | null;
  /** Iterations and seconds to recognisable, if it got there. */
  recognisable: { iter: number; seconds: number } | null;
  regime: "persistent" | "regenerating";
  batch: number;
  pool: number;
  rollout: [number, number];
}

export interface SavedModel {
  id: string;
  name: string;
  created: number;
  /** Committed layout, 8,320 float32. */
  weights: ArrayBuffer;
  /** The target, 64 × 64 premultiplied RGBA float32. */
  target: ArrayBuffer;
  sha256: string;
  card: ModelCard | null;
  /** "trained here" or "imported". */
  origin: "trained" | "imported";
}

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error ?? new Error("IndexedDB request failed"));
  });
}

export class ModelLibrary {
  private dbP: Promise<IDBDatabase> | null = null;
  /** Why the library is unavailable (private window, blocked storage), or null. */
  unavailable: string | null = null;

  private db(): Promise<IDBDatabase> {
    if (!this.dbP) {
      this.dbP = new Promise<IDBDatabase>((resolve, reject) => {
        if (typeof indexedDB === "undefined") {
          reject(new Error("this browser has no IndexedDB"));
          return;
        }
        let open: IDBOpenDBRequest;
        try {
          open = indexedDB.open(DB_NAME, VERSION);
        } catch (e) {
          reject(e);
          return;
        }
        open.onupgradeneeded = () => {
          if (!open.result.objectStoreNames.contains(STORE)) open.result.createObjectStore(STORE, { keyPath: "id" });
        };
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error ?? new Error("IndexedDB would not open"));
        open.onblocked = () => reject(new Error("IndexedDB is blocked by another tab"));
      });
      this.dbP.catch((e: unknown) => {
        this.unavailable = (e as Error).message;
        this.dbP = null;
      });
    }
    return this.dbP;
  }

  async list(): Promise<SavedModel[]> {
    const db = await this.db();
    const all = await req(db.transaction(STORE, "readonly").objectStore(STORE).getAll() as IDBRequest<SavedModel[]>);
    return all.sort((a, b) => b.created - a.created);
  }

  async get(id: string): Promise<SavedModel | null> {
    const db = await this.db();
    return ((await req(db.transaction(STORE, "readonly").objectStore(STORE).get(id))) as SavedModel | undefined) ?? null;
  }

  async put(m: SavedModel): Promise<void> {
    if (m.weights.byteLength !== WEIGHTS_BYTES) throw new Error("not a Grow model: wrong number of weights");
    const db = await this.db();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(m);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
      tx.onabort = () => reject(tx.error ?? new Error("IndexedDB write aborted (storage full?)"));
    });
  }

  async remove(id: string): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("IndexedDB delete failed"));
    });
  }

  async rename(id: string, name: string): Promise<void> {
    const m = await this.get(id);
    if (!m) return;
    await this.put({ ...m, name });
  }
}

/** A fresh id: time plus a random suffix (ids are local only). */
export function newModelId(): string {
  const r = new Uint32Array(1);
  crypto.getRandomValues(r);
  return `m${Date.now().toString(36)}${r[0]!.toString(36)}`;
}
