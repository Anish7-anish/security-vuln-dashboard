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
const LFS_POINTER_PREFIX = "version https://git-lfs.github.com/spec";

const sleepFrame = () => new Promise(requestAnimationFrame);

const textDecoder = new TextDecoder();

async function readResponseBody(res: Response): Promise<ArrayBuffer> {
  if (!res.body) {
    return res.arrayBuffer();
  }

  const chunks: Uint8Array[] = [];
  const reader = res.body.getReader();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged.buffer;
}

async function bufferToJson(buffer: ArrayBuffer, source: string): Promise<any> {
  const view = new Uint8Array(buffer);
  const prefix = textDecoder.decode(view.subarray(0, Math.min(view.length, 80)));

  if (prefix.startsWith(LFS_POINTER_PREFIX)) {
    throw new Error(
      "Git LFS pointer detected (blob not downloaded). Ensure the release asset contains the actual JSON payload."
    );
  }

  let dataBuffer = buffer;
  const lower = source.toLowerCase();
  if (lower.endsWith(".gz") || lower.endsWith(".gzip")) {
    if (typeof DecompressionStream === "undefined") {
      throw new Error("Browser lacks gzip support (DecompressionStream unavailable).");
    }
    const stream = new Response(buffer).body?.pipeThrough(new DecompressionStream("gzip"));
    if (!stream) throw new Error("Failed to create gzip decompression stream.");
    dataBuffer = await new Response(stream).arrayBuffer();
  }

  const text = textDecoder.decode(dataBuffer);

  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`Invalid JSON from ${source}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function loadJsonFromSources(sources: string[]): Promise<any> {
  let lastError: unknown = null;

  for (const candidate of sources) {
    try {
      console.log("🔗 Attempting fetch:", candidate);
      const res = await fetch(candidate, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Failed to fetch JSON (${res.status}) from ${candidate}`);
      }

      const buffer = await readResponseBody(res);
      return await bufferToJson(buffer, candidate);
    } catch (err) {
      lastError = err;
      console.error("⚠️ Source failed:", candidate, err);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Failed to load dataset from all sources");
}

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
    const json = await loadJsonFromSources(sources);

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
      await sleepFrame();
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
