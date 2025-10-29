import { Vulnerability } from '../data/types';

export interface RiskFactorDatum {
  name: string;
  value: number;
}

export interface TrendPoint {
  month: string;
  CRITICAL: number;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
  UNKNOWN: number;
  total: number;
}

export interface FilterImpactMetrics {
  total: number;
  visible: number;
  hidden: number;
  percentVisible: number;
  percentHidden: number;
  kaiExcludedCount: number;
  activeKaiFilters: string[];
  queryActive: boolean;
  queryText: string;
}

export interface AiManualDatum {
  label: string;
  ai: number;
  manual: number;
}

const severityOrder: Array<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN'> = [
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
  'UNKNOWN',
];

const severityScore: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  UNKNOWN: 0,
};

function normaliseSeverity(value?: string): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN' {
  // Normalise the noisy severity strings into the buckets our charts expect.
  const upper = (value || 'UNKNOWN').toUpperCase();
  if (upper.includes('CRIT')) return 'CRITICAL';
  if (upper.includes('HIGH')) return 'HIGH';
  if (upper.includes('MED')) return 'MEDIUM';
  if (upper.includes('LOW')) return 'LOW';
  return 'UNKNOWN';
}

function riskFactorLabels(v: Vulnerability): string[] {
  // Flatten risk factor payloads into a simple string array.
  if (!v.riskFactors) return [];
  if (Array.isArray(v.riskFactors)) return v.riskFactors.filter(Boolean) as string[];
  return Object.keys(v.riskFactors as Record<string, unknown>);
}

function parseDate(candidate?: string): Date | null {
  // Ignore dates we can't parse cleanly.
  if (!candidate) return null;
  const ts = Date.parse(candidate);
  if (Number.isNaN(ts)) return null;
  return new Date(ts);
}

export function collectRiskFactorCounts(rows: Vulnerability[]): RiskFactorDatum[] {
  // Count occurrences per risk factor for charting.
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    riskFactorLabels(row).forEach((label) => {
      counts.set(label, (counts.get(label) || 0) + 1);
    });
  });
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);
}

export function buildMonthlyTrend(rows: Vulnerability[]): TrendPoint[] {
  // Bucket vulnerabilities by month and severity for the trend line.
  const buckets = new Map<string, TrendPoint>();
  rows.forEach((row) => {
    const date =
      parseDate(row.published) ||
      parseDate(row.publishedAt) ||
      parseDate(row.fixDate as string | undefined);
    if (!date) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        month: key,
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
        UNKNOWN: 0,
        total: 0,
      });
    }
    const bucket = buckets.get(key)!;
    const severity = normaliseSeverity(row.severity);
    bucket[severity] += 1;
    bucket.total += 1;
  });

  return Array.from(buckets.values()).sort((a, b) => a.month.localeCompare(b.month));
}

export function deriveFilterImpact(
  all: Vulnerability[],
  visible: Vulnerability[],
  kaiExclude: string[],
  query: string,
): FilterImpactMetrics {
  // Compare total vs visible counts to show how much the filters hide.
  const total = all.length;
  const visibleCount = visible.length;
  const hidden = Math.max(total - visibleCount, 0);
  const percentVisible = total === 0 ? 0 : Math.round((visibleCount / total) * 100);
  const percentHidden = total === 0 ? 0 : Math.max(0, 100 - percentVisible);
  const excludedLower = new Set(kaiExclude.map((v) => v.toLowerCase()));
  const kaiExcludedCount = all.filter((v) => {
    const status = (v.kaiStatus || '').toLowerCase();
    return status && excludedLower.has(status);
  }).length;

  return {
    total,
    visible: visibleCount,
    hidden,
    percentVisible,
    percentHidden,
    kaiExcludedCount,
    activeKaiFilters: kaiExclude,
    queryActive: query.trim().length > 0,
    queryText: query,
  };
}

export function computeAiManualBreakdown(rows: Vulnerability[]): AiManualDatum[] {
  // Split counts by severity and whether Kai or a human touched them.
  const buckets = new Map<string, AiManualDatum>();
  rows.forEach((row) => {
    const severity = normaliseSeverity(row.severity);
    if (!buckets.has(severity)) {
      buckets.set(severity, { label: severity, ai: 0, manual: 0 });
    }
    const bucket = buckets.get(severity)!;
    const status = (row.kaiStatus || '').toLowerCase();
    if (status.includes('ai')) {
      bucket.ai += 1;
    } else if (status) {
      bucket.manual += 1;
    } else {
      bucket.manual += 1;
    }
  });
  return severityOrder
    .filter((label) => buckets.has(label))
    .map((label) => buckets.get(label)!);
}

export function pickCriticalHighlights(rows: Vulnerability[], limit = 3): Vulnerability[] {
  // Prioritise the nastiest vulns, then backfill with the next tier if needed.
  const critical = rows
    .filter((row) => normaliseSeverity(row.severity) === 'CRITICAL')
    .sort((a, b) => {
      const aScore = Number(a.cvss ?? (a as any).cvssScore ?? 0);
      const bScore = Number(b.cvss ?? (b as any).cvssScore ?? 0);
      return bScore - aScore;
    });

  if (critical.length >= limit) return critical.slice(0, limit);

  const remainder = rows
    .filter((row) => normaliseSeverity(row.severity) !== 'CRITICAL')
    .sort((a, b) => {
      const severityDiff = severityScore[normaliseSeverity(b.severity)] - severityScore[normaliseSeverity(a.severity)];
      if (severityDiff !== 0) return severityDiff;
      const aScore = Number(a.cvss ?? (a as any).cvssScore ?? 0);
      const bScore = Number(b.cvss ?? (b as any).cvssScore ?? 0);
      return bScore - aScore;
    });

  return critical.concat(remainder.slice(0, Math.max(0, limit - critical.length)));
}

export function summariseRiskFactors(v: Vulnerability): string[] {
  return riskFactorLabels(v);
}
