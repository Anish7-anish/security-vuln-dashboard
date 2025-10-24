import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Vulnerability } from '../../data/types';

type Range = [number, number];

export interface VulnState {
  data: Vulnerability[];
  filtered: Vulnerability[];
  q: string;
  kaiExclude: Set<string>;
  severities: Set<string>;
  riskFactors: Set<string>;
  dateRange: Range | null;
  cvssRange: Range | null;
}

const initialState: VulnState = {
  data: [],
  filtered: [],
  q: '',
  kaiExclude: new Set<string>(),
  severities: new Set<string>(),
  riskFactors: new Set<string>(),
  dateRange: null,
  cvssRange: null,
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

const recomputeFiltered = (state: VulnState) => {
  const query = state.q.trim().toLowerCase();
  let rows = [...state.data];

  if (state.kaiExclude.size) {
    rows = rows.filter(
      (v) => !state.kaiExclude.has((v.kaiStatus ?? '').toString()),
    );
  }

  if (state.severities.size) {
    rows = rows.filter((v) =>
      state.severities.has((v.severity ?? '').toString().toUpperCase()),
    );
  }

  if (state.riskFactors.size) {
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

    clearAllFilters: (state) => {
      state.q = '';
      state.kaiExclude.clear();
      state.severities.clear();
      state.riskFactors.clear();
      state.dateRange = null;
      state.cvssRange = null;
      state.filtered = [...state.data];
    },
  },
});

export const {
  setData,
  setQuery,
  toggleKaiFilter,
  toggleSeverity,
  setRiskFactors,
  setDateRange,
  setCvssRange,
  clearAllFilters,
} = vulnSlice.actions;
export type { Vulnerability } from '../../data/types';
export default vulnSlice.reducer;
