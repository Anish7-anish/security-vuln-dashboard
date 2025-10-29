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

type Manifest = {
  version?: number;
  total?: number;
  chunks?: Array<{
    url: string;
    count?: number;
    bytes?: number;
  }>;
};

const CHUNK_SIZE = 8000;
const LFS_POINTER_PREFIX = "version https://git-lfs.github.com/spec";

const sleepFrame = () => new Promise(requestAnimationFrame);

const textDecoder = new TextDecoder();

const isManifest = (value: any): value is Manifest =>
  value && typeof value === "object" && Array.isArray(value.chunks);

const makeAbsoluteUrl = (relative: string, base: string) => {
  try {
    return new URL(relative, base).toString();
  } catch {
    return relative;
  }
};

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

async function bufferToJson(
  buffer: ArrayBuffer,
  source: string,
  options?: { contentEncoding?: string | null },
): Promise<any> {
  const view = new Uint8Array(buffer);
  const prefix = textDecoder.decode(view.subarray(0, Math.min(view.length, 80)));

  if (prefix.startsWith(LFS_POINTER_PREFIX)) {
    throw new Error(
      "Git LFS pointer detected (blob not downloaded). Ensure the release asset contains the actual JSON payload."
    );
  }

  let dataBuffer = buffer;
  const lower = source.toLowerCase();
  const encoding = options?.contentEncoding?.toLowerCase();

  const shouldDecompress =
    encoding === "gzip" ||
    encoding === "x-gzip" ||
    lower.endsWith(".gz") ||
    lower.endsWith(".gzip");

  if (shouldDecompress) {
    if (typeof DecompressionStream === "undefined") {
      console.warn("gzip payload detected but DecompressionStream is unavailable; using raw buffer.");
    } else {
      try {
        const stream = new Response(buffer).body?.pipeThrough(new DecompressionStream("gzip"));
        if (!stream) throw new Error("Failed to create gzip decompression stream.");
        dataBuffer = await new Response(stream).arrayBuffer();
      } catch (err) {
        console.warn("Failed to decompress gzip payload; falling back to raw bytes:", err);
        dataBuffer = buffer;
      }
    }
  }

  const text = textDecoder.decode(dataBuffer);

  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`Invalid JSON from ${source}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function loadJsonFromSources(
  sources: string[],
): Promise<{ data: any; source: string }> {
  let lastError: unknown = null;

  for (const candidate of sources) {
    try {
      console.log("🔗 Attempting fetch:", candidate);
      const res = await fetch(candidate, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Failed to fetch JSON (${res.status}) from ${candidate}`);
      }

      const buffer = await readResponseBody(res);
      const data = await bufferToJson(buffer, candidate, {
        contentEncoding: res.headers?.get?.("content-encoding"),
      });
      return { data, source: candidate };
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
    const { data, source } = await loadJsonFromSources(sources);
    if (isManifest(data)) {
      await streamFromManifest(data, source);
    } else {
      await streamWholeDataset(data);
    }
  } catch (err: any) {
    console.error("❌ Worker error:", err);
    self.postMessage({
      type: "error",
      error: err instanceof Error ? err.message : String(err),
    });
  }
};

async function streamFromManifest(manifest: Manifest, manifestUrl: string) {
  if (!manifest.chunks?.length) {
    throw new Error("Manifest did not include any chunks to download.");
  }

  console.log(`📜 Manifest detected with ${manifest.chunks.length} chunk(s).`);

  let totalCount = 0;
  let buffer: Vulnerability[] = [];

  const flush = () => {
    if (!buffer.length) return;
    self.postMessage({ type: "chunk", items: buffer, progress: totalCount });
    buffer = [];
  };

  for (const [index, entry] of manifest.chunks.entries()) {
    const chunkUrl = makeAbsoluteUrl(entry.url, manifestUrl);
    console.log(`   📥 Fetching chunk ${index + 1}/${manifest.chunks.length}: ${chunkUrl}`);

    const res = await fetch(chunkUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch chunk (${res.status}) from ${chunkUrl}`);

    const chunkBuffer = await readResponseBody(res);
    const chunkJson = await bufferToJson(chunkBuffer, chunkUrl, {
      contentEncoding: res.headers?.get?.("content-encoding"),
    });
    const rows = Array.isArray(chunkJson?.rows) ? chunkJson.rows : [];

    for (const vuln of rows) {
      const record = buildRecord(vuln, totalCount);
      logSample(record, totalCount);
      buffer.push(record);
      totalCount += 1;

      if (buffer.length >= CHUNK_SIZE) {
        flush();
      }
    }

    flush();
    await sleepFrame();
  }

  console.log("🏁 Manifest streaming complete.", totalCount);
  self.postMessage({ type: "done", count: totalCount });
}

async function streamWholeDataset(json: any) {
  let totalCount = 0;
  let items: Vulnerability[] = [];

  for (const [groupName, group] of Object.entries(json.groups || {})) {
    for (const [repoName, repo] of Object.entries((group as any).repos || {})) {
      for (const [imageName, image] of Object.entries((repo as any).images || {})) {
        const vulns = (image as any).vulnerabilities || [];
        for (const vuln of vulns) {
          const record = buildRecord(vuln, totalCount, {
            groupName,
            repoName,
            imageName,
          });
          totalCount += 1;
          items.push(record);

          logSample(record, totalCount - 1);

          if (items.length >= CHUNK_SIZE) {
            self.postMessage({ type: "chunk", items, progress: totalCount });
            items = [];
          }
        }
      }
    }

    await sleepFrame();
  }

  if (items.length > 0) {
    self.postMessage({ type: "chunk", items, progress: totalCount });
  }

  console.log("🏁 Worker done. Total vulns:", totalCount);
  self.postMessage({ type: "done", count: totalCount });
}

function buildRecord(
  vuln: any,
  ordinal: number,
  context?: { groupName?: string; repoName?: string; imageName?: string },
): Vulnerability {
  const groupName = (vuln?.groupName ?? context?.groupName) || "";
  const repoName = (vuln?.repoName ?? context?.repoName) || "";
  const imageName = (vuln?.imageName ?? context?.imageName) || "";

  const sourceId = (vuln as any)?.id ?? null;
  const baseKey = (vuln as any)?.sourceId || (vuln as any)?.cve || sourceId || `row-${ordinal}`;
  const uniqueId = `${groupName}|${repoName}|${imageName}|${baseKey}|${ordinal}`;

  return {
    ...vuln,
    id: uniqueId,
    groupName,
    repoName,
    imageName,
    sourceId: sourceId ?? undefined,
  };
}

function logSample(record: Vulnerability, ordinal: number) {
  if (ordinal >= 5) return;
  console.log("🔎 Sample vuln:", {
    id: record.id,
    cve: record.cve,
    kaiStatus: record.kaiStatus,
    sourceId: record.sourceId,
  });
}
