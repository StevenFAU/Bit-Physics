// IndexedDB persistence with explicit schema versioning. Phase 0
// ships a thin promise wrapper over the IndexedDB API for storing /
// retrieving capture manifests + payload blobs in the browser. Tier 3
// sims compose this with the CaptureWriter to keep last-N captures
// available across reloads.

export interface CaptureRecord {
  manifestId: string;
  manifestJson: string;
  payload: ArrayBuffer;
  storedUtc: string;
}

export interface CaptureStoreOptions {
  /** IndexedDB database name. Defaults to "bit-physics". */
  databaseName?: string;
  /** Schema version the caller expects. Phase 0 ships v1. */
  schemaVersion?: number;
}

const DEFAULT_DATABASE = "bit-physics";
const STORE_NAME = "captures";
const CURRENT_SCHEMA_VERSION = 1;

export class CaptureStore {
  private constructor(private readonly _db: IDBDatabase) {}

  static async open(options: CaptureStoreOptions = {}): Promise<CaptureStore> {
    const databaseName = options.databaseName ?? DEFAULT_DATABASE;
    const schemaVersion = options.schemaVersion ?? CURRENT_SCHEMA_VERSION;
    if (schemaVersion > CURRENT_SCHEMA_VERSION) {
      throw new Error(
        `caller requested IndexedDB schema_version=${schemaVersion.toString()}; ` +
          `this build supports up to ${CURRENT_SCHEMA_VERSION.toString()}`,
      );
    }
    const idb = (globalThis as { indexedDB?: IDBFactory }).indexedDB;
    if (idb === undefined) {
      throw new Error(
        "indexedDB is not available — CaptureStore requires a browser or " +
          "an IndexedDB shim (e.g. fake-indexeddb in Node tests).",
      );
    }
    return new Promise<CaptureStore>((res, rej) => {
      const req = idb.open(databaseName, schemaVersion);
      req.onupgradeneeded = (): void => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "manifestId" });
        }
      };
      req.onsuccess = (): void => {
        res(new CaptureStore(req.result));
      };
      req.onerror = (): void => {
        rej(req.error ?? new Error("IndexedDB open failed"));
      };
    });
  }

  put(record: CaptureRecord): Promise<void> {
    return new Promise<void>((res, rej) => {
      const tx = this._db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = (): void => res();
      tx.onerror = (): void => rej(tx.error ?? new Error("put failed"));
    });
  }

  get(manifestId: string): Promise<CaptureRecord | null> {
    return new Promise<CaptureRecord | null>((res, rej) => {
      const tx = this._db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(manifestId);
      req.onsuccess = (): void => {
        res((req.result as CaptureRecord | undefined) ?? null);
      };
      req.onerror = (): void => rej(req.error ?? new Error("get failed"));
    });
  }

  delete(manifestId: string): Promise<void> {
    return new Promise<void>((res, rej) => {
      const tx = this._db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(manifestId);
      tx.oncomplete = (): void => res();
      tx.onerror = (): void => rej(tx.error ?? new Error("delete failed"));
    });
  }

  close(): void {
    this._db.close();
  }
}

export const INDEXEDDB_SCHEMA_VERSION = CURRENT_SCHEMA_VERSION;
