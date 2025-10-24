// /* eslint-disable no-restricted-globals */
// import type { Vulnerability } from '../data/types';

// type Msg =
//   | { type: 'chunk'; items: Vulnerability[] }
//   | { type: 'done'; count: number }
//   | { type: 'error'; error: string };

// self.onmessage = async (e: MessageEvent) => {
//   const { url } = e.data;
//   try {
//     const res = await fetch(url);
//     const text = await res.text();
//     console.log('Worker received text (first 200 chars):', text.slice(0, 200));
//       // Only once!
//     const json = JSON.parse(text);

//     const items: Vulnerability[] = [];
//     const CHUNK_SIZE = 5000;

//     for (const [groupName, group] of Object.entries(json.groups || {})) {
//       for (const [repoName, repo] of Object.entries((group as any).repos || {})) {
//         for (const [imageName, image] of Object.entries((repo as any).images || {})) {
//           const vulns = (image as any).vulnerabilities || [];
//           for (let i = 0; i < vulns.length; i += CHUNK_SIZE) {
//             const slice = vulns.slice(i, i + CHUNK_SIZE).map((v: any, idx: number) => ({
//               id: `${groupName}-${repoName}-${imageName}-${i + idx}`,
//               ...v,
//               groupName,
//               repoName,
//               imageName,
//             }));
//             //console.log('Sent chunk of', slice.length); 
//             self.postMessage({ type: 'chunk', items: slice });
//           }
//         }
//       }
//     }
//     self.postMessage({ type: 'done', count: 'completed' });

//   } catch (err: any) {
//     self.postMessage({ type: 'error', error: err.message });
//   }
// };

/* eslint-disable no-restricted-globals */
import type { Vulnerability } from "../data/types";

type Msg =
  | { type: "chunk"; items: Vulnerability[] }
  | { type: "done"; count: number }
  | { type: "error"; error: string };

const CHUNK_SIZE = 20000;

self.onmessage = async (e: MessageEvent) => {
  const { url } = e.data;
  console.log("👷 Worker started (yield-enabled):", url);

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch JSON (${res.status})`);
    const text = await res.text();
    const json = JSON.parse(text);

    let totalCount = 0;
    let items: Vulnerability[] = [];

    for (const [groupName, group] of Object.entries(json.groups || {})) {
      for (const [repoName, repo] of Object.entries((group as any).repos || {})) {
        for (const [imageName, image] of Object.entries((repo as any).images || {})) {
          const vulns = (image as any).vulnerabilities || [];
          for (const vuln of vulns) {
            const ordinal = totalCount++;
            const sourceId = (vuln as any).id ?? null;
            const baseKey = sourceId || vuln.cve || `row-${ordinal}`;
            const uniqueId = `${groupName}|${repoName}|${imageName}|${baseKey}|${ordinal}`;

            const record: Vulnerability = {
              ...vuln,
              id: uniqueId,
              groupName,
              repoName,
              imageName,
              sourceId: sourceId ?? undefined,
            };

            if (ordinal < 5) {
              console.log("🔎 Sample vuln:", {
                id: record.id,
                cve: record.cve,
                kaiStatus: record.kaiStatus,
                sourceId,
              });
            }
            items.push(record);

            // Send chunk
            if (items.length >= CHUNK_SIZE) {
              self.postMessage({ type: "chunk", items });
              items = [];
            }
          }
        }
      }

      // 💤 yield control every group iteration
      await new Promise(requestAnimationFrame);
    }

    if (items.length > 0) self.postMessage({ type: "chunk", items });

    console.log("🏁 Worker done. Total vulns:", totalCount);
    self.postMessage({ type: "done", count: totalCount });
  } catch (err: any) {
    console.error("❌ Worker error:", err);
    self.postMessage({ type: "error", error: err.message });
  }
};
