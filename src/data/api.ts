import type { Vulnerability } from './types';

const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '/api';

export interface FetchParams {
  page?: number;
  limit?: number;
  severity?: string[];
  repo?: string | null;
  group?: string | null;
  kaiStatus?: string[];
  kaiExclude?: string[];
  riskFactor?: string[];
  dateFrom?: number | null;
  dateTo?: number | null;
  cvssMin?: number | null;
  cvssMax?: number | null;
  search?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export interface VulnerabilityResponse {
  data: Vulnerability[];
  page: number;
  limit: number;
  total: number;
  metrics: {
    severityCounts: Array<{ name: string; value: number }>;
    riskFactors: Array<{ name: string; value: number }>;
    trend: Array<{
      month: string;
      CRITICAL: number;
      HIGH: number;
      MEDIUM: number;
      LOW: number;
      UNKNOWN: number;
      total: number;
    }>;
    aiManual: Array<{ label: string; ai: number; manual: number }>;
    highlights: Vulnerability[];
    repoSummary: Array<{ name: string; value: number }>;
    kpis: { total: number; remain: number; removed: number; pctRemain: number };
  };
  options: {
    kaiStatuses: string[];
    riskFactors: string[];
    repos: string[];
    groups: string[];
    packages: string[];
    cvssRange: { min: number; max: number };
  };
}

function buildUrl(path: string, params: Record<string, unknown>) {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (
      value === undefined ||
      value === null ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)
    ) {
      return;
    }
    if (Array.isArray(value)) {
      url.searchParams.set(key, value.join(','));
    } else {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

export async function fetchVulnerabilities(
  params: FetchParams,
): Promise<VulnerabilityResponse> {
  const url = buildUrl('/vulnerabilities', params);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API request failed (${res.status})`);
  }
  return res.json();
}

export async function fetchVulnerabilityById(id: string): Promise<Vulnerability | null> {
  const url = `${API_BASE}/vulnerabilities/${encodeURIComponent(id)}`;
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`API request failed (${res.status})`);
  }
  return res.json();
}

export interface Suggestion {
  value: string;
  label: string;
  meta?: {
    repoName?: string | null;
    packageName?: string | null;
    imageName?: string | null;
  };
}

export async function fetchSuggestions(term: string, limit = 12): Promise<Suggestion[]> {
  const url = new URL(`${API_BASE}/vulnerabilities/suggest`, window.location.origin);
  url.searchParams.set('term', term);
  url.searchParams.set('limit', String(limit));
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`API request failed (${res.status})`);
  }
  const payload = await res.json();
  return payload?.suggestions ?? [];
}
