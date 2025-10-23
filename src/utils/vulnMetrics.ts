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

function getRiskFactorLabels(v: Vulnerability): string[] {
  if (Array.isArray(v.riskFactors)) {
    return v.riskFactors.filter(Boolean) as string[];
  }
  if (v.riskFactors && typeof v.riskFactors === 'object') {
    return Object.keys(v.riskFactors);
  }
  return [];
}

function normaliseSeverity(
  severity?: string,
): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN' {
  const value = (severity || 'UNKNOWN').toUpperCase();
  if (value.includes('CRIT')) return 'CRITICAL';
  if (value.includes('HIGH')) return 'HIGH';
  if (value.includes('MED')) return 'MEDIUM';
  if (value.includes('LOW')) return 'LOW';
  return 'UNKNOWN';
}

function coerceDate(input?: string): Date | undefined {
  if (!input) return undefined;
  const timestamp = Date.parse(input);
  if (Number.isNaN(timestamp)) return undefined;
  return new Date(timestamp);
}

export function collectRiskFactorCounts(
  vulnerabilities: Vulnerability[],
): RiskFactorDatum[] {
  const counts = new Map<string, number>();
  vulnerabilities.forEach((v) => {
    getRiskFactorLabels(v).forEach((name) => {
      counts.set(name, (counts.get(name) || 0) + 1);
    });
  });
  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);
}

export function buildMonthlyTrend(vulnerabilities: Vulnerability[]): TrendPoint[] {
  const buckets = new Map<string, TrendPoint>();

  vulnerabilities.forEach((v) => {
    const candidate =
      coerceDate(v.published) ||
      coerceDate(v.publishedAt) ||
      coerceDate(v.fixDate);
    if (!candidate) return;

    const key = `${candidate.getFullYear()}-${String(candidate.getMonth() + 1).padStart(2, '0')}`;
    const severity = normaliseSeverity(v.severity);
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
  const total = all.length;
  const visibleCount = visible.length;
  const hidden = Math.max(total - visibleCount, 0);
  const percentVisible = total === 0 ? 0 : Math.round((visibleCount / total) * 100);
  const percentHidden = total === 0 ? 0 : Math.max(0, 100 - percentVisible);
  const activeKaiFilters = kaiExclude;
  const excludedKaiSet = new Set(kaiExclude.map((s) => s.toLowerCase()));
  const kaiExcludedCount = all.filter((v) => {
    const status = (v.kaiStatus || '').toLowerCase();
    return status && excludedKaiSet.has(status);
  }).length;

  return {
    total,
    visible: visibleCount,
    hidden,
    percentVisible,
    percentHidden,
    kaiExcludedCount,
    activeKaiFilters,
    queryActive: query.trim().length > 0,
    queryText: query,
  };
}

export function summariseRiskFactors(v: Vulnerability): string[] {
  return getRiskFactorLabels(v);
}
