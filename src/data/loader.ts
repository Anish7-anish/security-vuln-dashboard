import { openDB, deleteDB, type IDBPDatabase } from 'idb';
import { Vulnerability } from './types';
import workerUrl from '../workers/jsonStreamer.worker?worker&url';

const REMOTE_DATA =
  'https://media.githubusercontent.com/media/chanduusc/Ui-Demo-Data/main/ui_demo.json?raw=1';
export const DATA_URL =
  import.meta.env.VITE_DATA_URL || REMOTE_DATA;
export const EXPECTED_TOTAL = 236656;

export const DB_NAME = 'vuln-db';
const DB_VERSION = 2;
const STORE = 'vulns';

let dbPromise:
  | Promise<IDBPDatabase<Record<string, unknown>>>
  | null = null;

export async function ensureDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, transaction) {
        const baseStore = db.objectStoreNames.contains(STORE)
          ? transaction.objectStore(STORE)
          : db.createObjectStore(STORE, { keyPath: 'id' });

        if (!baseStore.indexNames.contains('severity')) {
          baseStore.createIndex('severity', 'severity');
        }
        if (!baseStore.indexNames.contains('kaiStatus')) {
          baseStore.createIndex('kaiStatus', 'kaiStatus');
        }
        if (!baseStore.indexNames.contains('groupName')) {
          baseStore.createIndex('groupName', 'groupName');
        }
        if (!baseStore.indexNames.contains('repoName')) {
          baseStore.createIndex('repoName', 'repoName');
        }
        if (!baseStore.indexNames.contains('imageName')) {
          baseStore.createIndex('imageName', 'imageName');
        }
      },
    });
  }
  return dbPromise;
}

// export async function streamIntoDB(url: string){
//   const db = await ensureDB();
//   const worker = new Worker(workerUrl, {type: 'module'});
//   let batch: Vulnerability[] = [];

//   return new Promise<void>((resolve, reject) => {
//     worker.onmessage = async (e) => {
//       const msg = e.data;
//       if (msg.type === 'chunk') {
//         //console.log('Received chunk:', msg.items.length);
//         const tx = db.transaction(STORE, 'readwrite');
//         for (const item of msg.items) await tx.store.put(item);
//         await tx.done;
//       } else if (msg.type === 'done') {
//         if (batch.length) {
//           const tx = db.transaction(STORE, 'readwrite');
//           for (const item of batch) await tx.store.put(item);
//           await tx.done;
//         }
//         worker.terminate();
//         resolve();
//       } else if (msg.type === 'error') {
//         worker.terminate();
//         reject(new Error(msg.error));
//       }
//     };
//     worker.postMessage({ url });
//   });
// }
let activeWorker: Worker | null = null;

export async function streamIntoDB(
  url: string,
  onProgress?: (count: number) => void,
): Promise<number | null> {
  if (activeWorker) {
    console.warn("⚠️ Worker already active, skipping duplicate run");
    return null;
  }

  const db = await ensureDB();
  const worker = new Worker(workerUrl, { type: 'module' });
  activeWorker = worker;

  return new Promise<number | null>((resolve, reject) => {
    let lastProgress = 0;
    worker.onmessage = async (e) => {
      const msg = e.data;
      if (msg.type === 'chunk') {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.store;
        for (const item of msg.items) store.put(item);
        await tx.done;
        if (typeof msg.progress === 'number') {
          lastProgress = msg.progress;
        } else {
          lastProgress += msg.items.length;
        }
        if (typeof msg.progress === 'number') {
          onProgress?.(msg.progress);
        }
      } 
      else if (msg.type === 'done') {
        console.log("✅ Stream completed.");
        worker.terminate();
        activeWorker = null;
        const total =
          typeof msg.count === 'number' ? msg.count : lastProgress || null;
        resolve(total);
        if (typeof msg.count === 'number') {
          onProgress?.(msg.count);
        }
      } 
      else if (msg.type === 'error') {
        console.error("❌ Worker error:", msg.error);
        worker.terminate();
        activeWorker = null;
        reject(new Error(msg.error));
      }
    };

    worker.onerror = (err) => {
      console.error("💥 Worker crashed:", err);
      activeWorker = null;
      reject(err);
    };

    worker.postMessage({ url });
  });
}

export async function clearDatabase() {
  if (activeWorker) {
    activeWorker.terminate();
    activeWorker = null;
  }
  if (dbPromise) {
    try {
      const db = await dbPromise;
      db.close();
    } catch (e) {
      console.warn('Failed closing DB before reset', e);
    }
    dbPromise = null;
  }
  try {
    await deleteDB(DB_NAME);
  } catch (e) {
    console.warn('Failed deleting DB', e);
  }
}



export async function getAllVulnerabilities(): Promise<Vulnerability[]> {
  const db = await ensureDB();
  return (await db.getAll(STORE)) as Vulnerability[];
}
