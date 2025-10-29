import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import connectDB from '../lib/db.js';
import Vulnerability from '../models/Vulnerability.js';

dotenv.config();

const INPUT_PATH =
  process.argv[2] || path.resolve(process.cwd(), '../public/ui_demo.json');

const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'];
const allowedKaiStatuses = new Map([
  ['ai-invalid-norisk', 'ai-invalid-norisk'],
  ['ai invalid norisk', 'ai-invalid-norisk'],
  ['ai-invalid - norisk', 'ai-invalid-norisk'],
  ['invalid - norisk', 'invalid - norisk'],
  ['invalid-norisk', 'invalid - norisk'],
  ['invalid norisk', 'invalid - norisk'],
]);

function normaliseSeverity(value) {
  const upper = String(value || 'UNKNOWN').toUpperCase();
  if (upper.includes('CRIT')) return 'CRITICAL';
  if (upper.includes('HIGH')) return 'HIGH';
  if (upper.includes('MED')) return 'MEDIUM';
  if (upper.includes('LOW')) return 'LOW';
  return 'UNKNOWN';
}

function severityScore(value) {
  const normalized = normaliseSeverity(value);
  const index = severityOrder.indexOf(normalized);
  return index === -1 ? severityOrder.length : index;
}

function parseDate(raw) {
  if (!raw) return null;
  const ts = Date.parse(raw);
  if (Number.isNaN(ts)) return null;
  return new Date(ts);
}

function extractRiskFactors(vuln) {
  const rf = vuln?.riskFactors;
  if (!rf) return [];
  if (Array.isArray(rf)) {
    return rf.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof rf === 'object') {
    return Object.keys(rf)
      .filter((key) => key && rf[key])
      .map((key) => String(key).trim())
      .filter(Boolean);
  }
  return [];
}

function coerceCvss(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

function extractKaiStatus(raw) {
  if (!raw) return { kaiStatus: null, statusFallback: null };
  const normalized = String(raw)
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  if (allowedKaiStatuses.has(normalized)) {
    return { kaiStatus: allowedKaiStatuses.get(normalized) ?? null, statusFallback: null };
  }
  return { kaiStatus: null, statusFallback: String(raw) };
}

async function loadFile() {
  const raw = await fs.promises.readFile(INPUT_PATH, 'utf8');
  return JSON.parse(raw);
}

function flattenDataset(dataset) {
  const records = [];
  let ordinal = 0;
  for (const [groupName, group] of Object.entries(dataset.groups || {})) {
    for (const [repoName, repo] of Object.entries(group.repos || {})) {
      for (const [imageName, image] of Object.entries(repo.images || {})) {
        const vulns = image.vulnerabilities || [];
        for (const vuln of vulns) {
          const sourceId = vuln.id ?? null;
          const baseKey = sourceId || vuln.cve || `row-${ordinal}`;
          const id = `${groupName}|${repoName}|${imageName}|${baseKey}|${ordinal}`;

          const severityNormalized = normaliseSeverity(vuln.severity);
          const publishedAt =
            parseDate(vuln.publishedAt) ||
            parseDate(vuln.published) ||
            null;
          const fixDate = parseDate(vuln.fixDate);
          const cvss =
            coerceCvss(vuln.cvss) ??
            coerceCvss(vuln.cvssScore) ??
            coerceCvss(vuln.cvssBaseScore);
          const riskFactorList = extractRiskFactors(vuln);

          const { kaiStatus, statusFallback } = extractKaiStatus(vuln.kaiStatus);
          // Keep only the essentials; the source payload is huge and cans the Atlas free tier.
          const record = {
            id,
            sourceId,
            cve: vuln.cve ?? null,
            severity: vuln.severity ?? severityNormalized,
            severityNormalized,
            severityScore: severityScore(vuln.severity),
            cvss,
            kaiStatus,
            status: vuln.status ?? statusFallback ?? null,
            summary: vuln.summary ?? vuln.description ?? null,
            riskFactors: vuln.riskFactors ?? null,
            riskFactorList,
            groupName,
            repoName,
            imageName,
            packageName: vuln.packageName ?? vuln.package ?? null,
            package: vuln.package ?? vuln.packageName ?? null,
            version: vuln.version ?? vuln.packageVersion ?? null,
            publishedAt,
            published: publishedAt,
            fixDate,
          };

          records.push(record);
          ordinal += 1;
        }
      }
    }
  }
  return records;
}

async function main() {
  await connectDB();
  const dataset = await loadFile();
  const records = flattenDataset(dataset);
  console.log(`Loaded ${records.length.toLocaleString()} vulnerabilities.`);

  // Drop everything (documents + indexes) so we always rebuild from a clean slate in Atlas.
  await Vulnerability.collection.drop().catch((err) => {
    if (err.codeName !== 'NamespaceNotFound') throw err;
  });

  const batchSize = 1000;
  for (let i = 0; i < records.length; i += batchSize) {
    const slice = records.slice(i, i + batchSize);
    await Vulnerability.insertMany(slice, { ordered: false });
    console.log(`Inserted ${Math.min(i + batchSize, records.length)} rows`);
  }
  console.log('Import completed.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
