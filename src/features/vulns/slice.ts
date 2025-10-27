import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Vulnerability } from '../../data/types';

type Range = [number, number];
type SortKey = 'severity' | 'cvss' | 'published' | 'repo' | 'package';
type SortDirection = 'asc' | 'desc';

export interface VulnState {
  data: Vulnerability[];
  filtered: Vulnerability[];
  q: string;
  kaiExclude: Set<string>;
  kaiStatuses: Set<string>;
  severities: Set<string>;
  riskFactors: Set<string>;
  dateRange: Range | null;
  cvssRange: Range | null;
  sortBy: SortKey;
  sortDirection: SortDirection;
}

const initialState: VulnState = {
  data: [],
  filtered: [],
  q: '',
  kaiExclude: new Set<string>(),
  kaiStatuses: new Set<string>(),
  severities: new Set<string>(),
  riskFactors: new Set<string>(),
  dateRange: null,
  cvssRange: null,
  sortBy: 'severity',
  sortDirection: 'desc',
};

const normalizeRiskFactors = (rf: Vulnerability['riskFactors']): string[] => {
  if (!rf) return [];
  if (Array.isArray(rf)) return rf.filter(Boolean);
  return Object.keys(rf as Record<string, unknown>);
};

const getPublished = (v: Vulnerability): string | undefined => {
  if (typeof v.publishedAt === 'string') return v.publishedAt;
  if (typeof (v as any).published === 'string') return (v as any).published;
  return undefined;
};

const getCvss = (v: Vulnerability): number | undefined => {
  const raw = v.cvss ?? (v as any).cvssScore ?? (v as any).cvssBaseScore;
  if (raw === null || raw === undefined) return undefined;
  const num = Number(raw);
  return Number.isFinite(num) ? num : undefined;
};

const severityScore = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  UNKNOWN: 0,
};
const normalizeSeverity = (value?: string): keyof typeof severityScore => {
  if (!value) return 'UNKNOWN';
  const upper = value.toUpperCase();
  if (upper.includes('CRIT')) return 'CRITICAL';
  if (upper.includes('HIGH')) return 'HIGH';
  if (upper.includes('MED')) return 'MEDIUM';
  if (upper.includes('LOW')) return 'LOW';
  return 'UNKNOWN';
};

const applySort = (rows: Vulnerability[], sortBy: SortKey, direction: SortDirection) => {
  // shuffle order keeping the same array so table updates stay cheap
  const dir = direction === 'asc' ? 1 : -1;
  rows.sort((a, b) => {
    let diff = 0;
    switch (sortBy) {
      case 'severity': {
        const aScore = severityScore[normalizeSeverity(a.severity)];
        const bScore = severityScore[normalizeSeverity(b.severity)];
        diff = aScore - bScore;
        break;
      }
      case 'cvss': {
        const aScore = getCvss(a) ?? -Infinity;
        const bScore = getCvss(b) ?? -Infinity;
        diff = aScore - bScore;
        break;
      }
      case 'published': {
        const aDate = getPublished(a);
        const bDate = getPublished(b);
        const aTs = aDate ? Date.parse(aDate) : 0;
        const bTs = bDate ? Date.parse(bDate) : 0;
        diff = aTs - bTs;
        break;
      }
      case 'repo': {
        diff = (a.repoName || '').localeCompare(b.repoName || '');
        break;
      }
      case 'package': {
        const aName = (a as any).packageName || a.package || '';
        const bName = (b as any).packageName || b.package || '';
        diff = aName.localeCompare(bName);
        break;
      }
      default:
        diff = 0;
    }
    if (diff === 0) {
      const aId = a.id || '';
      const bId = b.id || '';
      return dir * aId.localeCompare(bId);
    }
    return dir * diff;
  });
};

const recomputeFiltered = (state: VulnState) => {
  // start from scratch every time so filters never stack weirdly
  const query = state.q.trim().toLowerCase();
  let rows = [...state.data];

  if (state.kaiExclude.size) {
    rows = rows.filter(
      (v) => !state.kaiExclude.has((v.kaiStatus ?? '').toString()),
    );
  }

  if (state.kaiStatuses.size) {
    rows = rows.filter((v) =>
      state.kaiStatuses.has((v.kaiStatus ?? '').toString()),
    );
  }

  if (state.severities.size) {
    rows = rows.filter((v) =>
      state.severities.has((v.severity ?? '').toString().toUpperCase()),
    );
  }

  if (state.riskFactors.size) {
    // each vuln can have many risk flags, we keep it if any overlap
    rows = rows.filter((v) =>
      normalizeRiskFactors(v.riskFactors).some((r) => state.riskFactors.has(r)),
    );
  }

  if (state.dateRange) {
    const [from, to] = state.dateRange;
    rows = rows.filter((v) => {
      const published = getPublished(v);
      if (!published) return false;
      const ts = Date.parse(published);
      if (Number.isNaN(ts)) return false;
      return ts >= from && ts <= to;
    });
  }

  if (state.cvssRange) {
    const [min, max] = state.cvssRange;
    rows = rows.filter((v) => {
      const score = getCvss(v);
      if (score === undefined) return false;
      return score >= min && score <= max;
    });
  }

  if (query) {
    rows = rows.filter((v) => {
      const haystack = [
        v.cve,
        v.package,
        v.summary,
        v.repoName,
        v.imageName,
        v.groupName,
      ]
        .filter(Boolean)
        .map((s) => String(s).toLowerCase());
      return haystack.some((token) => token.includes(query));
    });
  }

  state.filtered = rows;
  // final result always respects current sort
  applySort(state.filtered, state.sortBy, state.sortDirection);
};

const vulnSlice = createSlice({
  name: 'vulns',
  initialState,
  reducers: {
    setData: (state, action: PayloadAction<Vulnerability[]>) => {
      state.data = action.payload ?? [];
      recomputeFiltered(state);
    },

    setQuery: (state, action: PayloadAction<string>) => {
      state.q = action.payload ?? '';
      recomputeFiltered(state);
    },

    toggleKaiFilter: (state, action: PayloadAction<string>) => {
      const key = action.payload;
      if (state.kaiExclude.has(key)) {
        state.kaiExclude.delete(key);
      } else {
        state.kaiExclude.add(key);
      }
      recomputeFiltered(state);
    },

    setKaiStatuses: (state, action: PayloadAction<string[]>) => {
      state.kaiStatuses = new Set(action.payload ?? []);
      recomputeFiltered(state);
    },

    toggleSeverity: (state, action: PayloadAction<string>) => {
      const sev = action.payload.toUpperCase();
      if (state.severities.has(sev)) {
        state.severities.delete(sev);
      } else {
        state.severities.add(sev);
      }
      recomputeFiltered(state);
    },

    setRiskFactors: (state, action: PayloadAction<string[]>) => {
      state.riskFactors = new Set(action.payload ?? []);
      recomputeFiltered(state);
    },

    setDateRange: (state, action: PayloadAction<Range | null>) => {
      state.dateRange = action.payload;
      recomputeFiltered(state);
    },

    setCvssRange: (state, action: PayloadAction<Range | null>) => {
      state.cvssRange = action.payload;
      recomputeFiltered(state);
    },

    setSortBy: (state, action: PayloadAction<SortKey>) => {
      state.sortBy = action.payload;
      applySort(state.filtered, state.sortBy, state.sortDirection);
    },

    setSortDirection: (state, action: PayloadAction<SortDirection>) => {
      state.sortDirection = action.payload;
      applySort(state.filtered, state.sortBy, state.sortDirection);
    },

    clearAllFilters: (state) => {
      state.q = '';
      state.kaiExclude.clear();
      state.kaiStatuses.clear();
      state.severities.clear();
      state.riskFactors.clear();
      state.dateRange = null;
      state.cvssRange = null;
      state.sortBy = 'severity';
      state.sortDirection = 'desc';
      state.filtered = [...state.data];
      applySort(state.filtered, state.sortBy, state.sortDirection);
    },
  },
});

export const {
  setData,
  setQuery,
  toggleKaiFilter,
  setKaiStatuses,
  toggleSeverity,
  setRiskFactors,
  setDateRange,
  setCvssRange,
  setSortBy,
  setSortDirection,
  clearAllFilters,
} = vulnSlice.actions;
export type { Vulnerability } from '../../data/types';
export default vulnSlice.reducer;
