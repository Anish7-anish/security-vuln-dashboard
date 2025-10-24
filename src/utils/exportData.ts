import { Vulnerability } from '../data/types';

const CSV_FIELDS: Array<{ key: keyof Vulnerability | 'riskFactors'; header: string }> = [
  { key: 'id', header: 'id' },
  { key: 'cve', header: 'cve' },
  { key: 'severity', header: 'severity' },
  { key: 'cvss', header: 'cvss' },
  { key: 'groupName', header: 'groupName' },
  { key: 'repoName', header: 'repoName' },
  { key: 'imageName', header: 'imageName' },
  { key: 'package', header: 'package' },
  { key: 'kaiStatus', header: 'kaiStatus' },
  { key: 'riskFactors', header: 'riskFactors' },
  { key: 'publishedAt', header: 'publishedAt' },
];

const escapeCsv = (value: string) => {
  const needsWrap = /[,"\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsWrap ? `"${escaped}"` : escaped;
};

const normaliseRiskFactors = (riskFactors: Vulnerability['riskFactors']): string[] => {
  if (!riskFactors) return [];
  if (Array.isArray(riskFactors)) return riskFactors.filter(Boolean) as string[];
  return Object.keys(riskFactors as Record<string, unknown>);
};

// crunch the filtered rows into a csv blob the browser can download
export function exportAsCsv(rows: Vulnerability[]): Blob {
  const header = CSV_FIELDS.map((field) => field.header).join(',');
  const data = rows.map((row) => {
    return CSV_FIELDS.map((field) => {
      if (field.key === 'riskFactors') {
        return escapeCsv(normaliseRiskFactors(row.riskFactors).join('; '));
      }
      const raw = row[field.key as keyof Vulnerability];
      if (raw === undefined || raw === null) return '';
      if (typeof raw === 'string') return escapeCsv(raw);
      if (typeof raw === 'number') return String(raw);
      if (Array.isArray(raw)) return escapeCsv(raw.join('; '));
      return escapeCsv(String(raw));
    }).join(',');
  });

  const csv = [header, ...data].join('\r\n');
  return new Blob([csv], { type: 'text/csv;charset=utf-8' });
}

// sometimes I just want the raw objects back out
export function exportAsJson(rows: Vulnerability[]): Blob {
  const json = JSON.stringify(rows, null, 2);
  return new Blob([json], { type: 'application/json;charset=utf-8' });
}

// standard download shim: point a hidden anchor at the blob and click it
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
