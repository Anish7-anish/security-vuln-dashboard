import { openDB } from 'idb';
import { Vulnerability } from './types';
import workerUrl from '../workers/jsonStreamer.worker?worker&url';

const DB_NAME = 'vuln-db';
const STORE = 'vulns';

export async function ensureDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      const store = db.createObjectStore(STORE, { keyPath: 'id' });
      store.createIndex('severity', 'severity');
      store.createIndex('kaiStatus', 'kaiStatus');
      store.createIndex('groupName','groupName');
      store.createIndex('repoName', 'repoName');
      store.createIndex('imageName', 'imageName');
    },
  });
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

export async function streamIntoDB(url: string) {
  if (activeWorker) {
    console.warn("⚠️ Worker already active, skipping duplicate run");
    return;
  }

  const db = await ensureDB();
  const worker = new Worker(workerUrl, { type: 'module' });
  activeWorker = worker;

  return new Promise<void>((resolve, reject) => {
    worker.onmessage = async (e) => {
      const msg = e.data;
      if (msg.type === 'chunk') {
        const tx = db.transaction(STORE, 'readwrite');
        const store = tx.store;
        for (const item of msg.items) store.put(item);
        await tx.done;
      } 
      else if (msg.type === 'done') {
        console.log("✅ Stream completed.");
        worker.terminate();
        activeWorker = null;
        resolve();
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



export async function getAllVulnerabilities(): Promise<Vulnerability[]> {
  const db = await ensureDB();
  return (await db.getAll(STORE)) as Vulnerability[];
}