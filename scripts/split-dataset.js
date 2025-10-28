#!/usr/bin/env node
/**
 * Splits the giant `ui_demo.json` into gzip-compressed chunks plus a manifest.
 *
 * Example:
 *   node scripts/split-dataset.js \
 *     --input public/ui_demo.json \
 *     --out public/chunks \
 *     --chunk-mb 5
 */

import { createReadStream, createWriteStream } from 'node:fs';
import { promises as fs } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';

import { chain } from 'stream-chain';
import { parser } from 'stream-json';
import { pick } from 'stream-json/filters/Pick';
import { streamObject } from 'stream-json/streamers/StreamObject';

const DEFAULT_INPUT = 'public/ui_demo.json';
const DEFAULT_OUTPUT = 'public/chunks';
const DEFAULT_CHUNK_MB = 5;
const MAX_ROWS_PER_CHUNK = 5000;

const args = parseArgs(process.argv.slice(2));

const INPUT_PATH = resolve(process.cwd(), args.input ?? DEFAULT_INPUT);
const OUTPUT_DIR = resolve(process.cwd(), args.out ?? DEFAULT_OUTPUT);
const CHUNK_BYTES = Math.max(1, Math.floor((Number(args['chunk-mb']) || DEFAULT_CHUNK_MB) * 1024 * 1024));

/** Simple CLI arg parser */
function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        result[key] = true;
      } else {
        result[key] = next;
        i++;
      }
    }
  }
  return result;
}

async function ensureDir(path) {
  await fs.mkdir(path, { recursive: true });
}

async function writeChunk(index, rows) {
  const fileName = `chunk-${String(index).padStart(3, '0')}.json.gz`;
  const filePath = resolve(OUTPUT_DIR, fileName);

  await ensureDir(dirname(filePath));

  const payload = JSON.stringify({ rows });
  await pipeline(
    Readable.from(payload),
    createGzip({ level: 9 }),
    createWriteStream(filePath),
  );

  const { size } = await fs.stat(filePath);
  return { fileName, size };
}

async function main() {
  console.log(`📦 Splitting dataset from ${INPUT_PATH}`);
  console.log(`   Output directory: ${OUTPUT_DIR}`);
  console.log(`   Target chunk size: ~${(CHUNK_BYTES / (1024 * 1024)).toFixed(1)} MB`);

  await ensureDir(OUTPUT_DIR);

  const manifest = {
    version: 1,
    total: 0,
    chunks: [],
  };

  let rows = [];
  let approxBytes = 0;
  let chunkIndex = 0;

  const stream = chain([
    createReadStream(INPUT_PATH),
    parser(),
    pick({ filter: 'groups' }),
    streamObject(),
  ]);

  for await (const item of stream) {
    const groupName = item.key;
    const group = item.value ?? {};
    const repos = group?.repos ?? {};

    for (const [repoName, repo] of Object.entries(repos)) {
      const images = repo?.images ?? {};

      for (const [imageName, image] of Object.entries(images)) {
        const vulns = image?.vulnerabilities ?? [];

        for (const vuln of vulns) {
          const record = {
            ...vuln,
            groupName,
            repoName,
            imageName,
          };

          const serialized = JSON.stringify(record);
          const size = Buffer.byteLength(serialized, 'utf8');

          // flush if adding this record would blow the chunk
          if (rows.length > 0 && (approxBytes + size > CHUNK_BYTES || rows.length >= MAX_ROWS_PER_CHUNK)) {
            const { fileName, size: written } = await writeChunk(chunkIndex, rows);
            manifest.chunks.push({ url: fileName, count: rows.length, bytes: written });
            console.log(`   ✂️  chunk-${String(chunkIndex).padStart(3, '0')} -> ${written} bytes (${rows.length} rows)`);
            chunkIndex += 1;
            rows = [];
            approxBytes = 0;
          }

          rows.push(record);
          approxBytes += size;
          manifest.total += 1;
        }
      }
    }
  }

  if (rows.length > 0) {
    const { fileName, size: written } = await writeChunk(chunkIndex, rows);
    manifest.chunks.push({ url: fileName, count: rows.length, bytes: written });
    console.log(`   ✂️  chunk-${String(chunkIndex).padStart(3, '0')} -> ${written} bytes (${rows.length} rows)`);
  }

  const manifestPath = resolve(OUTPUT_DIR, 'manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  console.log('✅ Done.');
  console.log(`   Total rows: ${manifest.total.toLocaleString()}`);
  console.log(`   Chunks created: ${manifest.chunks.length}`);
  console.log(`   Manifest: ${manifestPath}`);
}

main().catch((err) => {
  console.error('❌ Failed to split dataset:', err);
  process.exit(1);
});
