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
  | { type: "chunk"; items: Vulnerability[]; progress?: number }
  | { type: "done"; count: number }
  | { type: "error"; error: string };

type WorkerRequest = {
  urls?: string[];
  url?: string;
};

const CHUNK_SIZE = 8000;

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const payload = e.data ?? {};
  const sources = Array.isArray(payload.urls) && payload.urls.length
    ? payload.urls
    : payload.url
    ? [payload.url]
    : [];

  if (!sources.length) {
    self.postMessage({ type: "error", error: "No data sources supplied to worker" });
    return;
  }

  console.log("👷 Worker started (yield-enabled). Sources:", sources);

  try {
    let response: Response | null = null;
    let lastError: unknown = null;

    for (const candidate of sources) {
      try {
        console.log("🔗 Attempting fetch:", candidate);
        const res = await fetch(candidate, { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Failed to fetch JSON (${res.status}) from ${candidate}`);
        }
        response = res;
        break;
      } catch (err) {
        lastError = err;
        console.error("⚠️ Fetch failed:", candidate, err);
      }
    }

    if (!response) {
      const message =
        lastError instanceof Error ? lastError.message : "Failed to fetch any data source";
      throw new Error(message);
    }

    const text = await response.text();
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

            // make a fresh record so we never mutate the original blob
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
              self.postMessage({ type: "chunk", items, progress: totalCount });
              items = [];
            }
          }
        }
      }

      // 💤 yield control every group iteration
      await new Promise(requestAnimationFrame);
    }

    if (items.length > 0) self.postMessage({ type: "chunk", items, progress: totalCount });

    console.log("🏁 Worker done. Total vulns:", totalCount);
    self.postMessage({ type: "done", count: totalCount });
  } catch (err: any) {
    console.error("❌ Worker error:", err);
    self.postMessage({
      type: "error",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
