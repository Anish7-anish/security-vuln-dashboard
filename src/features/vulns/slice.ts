import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';
import type { Vulnerability } from '../../data/types';
import {
  fetchVulnerabilities as apiFetchVulnerabilities,
  type FetchParams,
  type VulnerabilityResponse,
} from '../../data/api';

export type SortKey = 'severity' | 'cvss' | 'published' | 'repoName';
export type SortDirection = 'asc' | 'desc';

export interface VulnMetrics {
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
}

export interface FilterState {
  query: string;
  kaiExclude: string[];
  kaiStatuses: string[];
  severities: string[];
  riskFactors: string[];
  dateRange: [number, number] | null;
  cvssRange: [number, number] | null;
  repo: string | null;
  group: string | null;
}

export interface OptionsState {
  kaiStatuses: string[];
  riskFactors: string[];
  repos: string[];
  groups: string[];
  packages: string[];
  cvssRange: { min: number; max: number };
}

export interface VulnState {
  items: Vulnerability[];
  total: number;
  page: number;
  pageSize: number;
  sortBy: SortKey;
  sortDirection: SortDirection;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  metrics: VulnMetrics;
  options: OptionsState;
  filters: FilterState;
  hasMore: boolean;
  isRefreshing: boolean;
}

const emptyMetrics: VulnMetrics = {
  severityCounts: [],
  riskFactors: [],
  trend: [],
  aiManual: [],
  highlights: [],
  repoSummary: [],
  kpis: { total: 0, remain: 0, removed: 0, pctRemain: 0 },
};

const defaultOptions: OptionsState = {
  kaiStatuses: [],
  riskFactors: [],
  repos: [],
  groups: [],
  packages: [],
  cvssRange: { min: 0, max: 10 },
};

const initialFilters: FilterState = {
  query: '',
  kaiExclude: [],
  kaiStatuses: [],
  severities: [],
  riskFactors: [],
  dateRange: null,
  cvssRange: null,
  repo: null,
  group: null,
};

const initialState: VulnState = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 50,
  sortBy: 'severity',
  sortDirection: 'desc',
  status: 'idle',
  error: null,
  metrics: emptyMetrics,
  options: defaultOptions,
  filters: initialFilters,
  hasMore: false,
  isRefreshing: false,
};

export const buildFetchParams = (state: RootState): FetchParams => {
  const {
    page,
    pageSize,
    sortBy,
    sortDirection,
    filters: {
      query,
      kaiExclude,
      kaiStatuses,
      severities,
      riskFactors,
      dateRange,
      cvssRange,
      repo,
      group,
    },
  } = state.vulns;

  return {
    page,
    limit: pageSize,
    sort: sortBy,
    direction: sortDirection,
    search: query || undefined,
    kaiExclude,
    kaiStatus: kaiStatuses,
    severity: severities,
    riskFactor: riskFactors,
    repo: repo ?? undefined,
    group: group ?? undefined,
    dateFrom: dateRange ? dateRange[0] : undefined,
    dateTo: dateRange ? dateRange[1] : undefined,
    cvssMin: cvssRange ? cvssRange[0] : undefined,
    cvssMax: cvssRange ? cvssRange[1] : undefined,
  };
};

export const fetchVulnerabilities = createAsyncThunk<
  VulnerabilityResponse,
  { append?: boolean } | undefined,
  { state: RootState }
>('vulns/fetch', async (arg, { getState }) => {
  const params = buildFetchParams(getState());
  return apiFetchVulnerabilities(params);
});

const slice = createSlice({
  name: 'vulns',
  initialState,
  reducers: {
    setPage: (state, action: PayloadAction<number>) => {
      state.page = Math.max(1, action.payload || 1);
    },
    setPageSize: (state, action: PayloadAction<number>) => {
      const size = Math.max(1, action.payload || 50);
      state.pageSize = size;
      state.page = 1;
    },
    setSort: (
      state,
      action: PayloadAction<{ sortBy: SortKey; sortDirection: SortDirection }>,
    ) => {
      state.sortBy = action.payload.sortBy;
      state.sortDirection = action.payload.sortDirection;
      state.page = 1;
    },
    setQuery: (state, action: PayloadAction<string>) => {
      state.filters.query = action.payload;
      state.page = 1;
    },
    toggleKaiFilter: (state, action: PayloadAction<string>) => {
      const value = action.payload;
      const next = new Set(state.filters.kaiExclude);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      state.filters.kaiExclude = Array.from(next);
      state.page = 1;
    },
    setKaiStatuses: (state, action: PayloadAction<string[]>) => {
      state.filters.kaiStatuses = action.payload;
      state.page = 1;
    },
    toggleSeverity: (state, action: PayloadAction<string>) => {
      const upper = action.payload.toUpperCase();
      const next = new Set(state.filters.severities);
      if (next.has(upper)) {
        next.delete(upper);
      } else {
        next.add(upper);
      }
      state.filters.severities = Array.from(next);
      state.page = 1;
    },
    setRiskFactors: (state, action: PayloadAction<string[]>) => {
      state.filters.riskFactors = action.payload;
      state.page = 1;
    },
    setDateRange: (
      state,
      action: PayloadAction<[number, number] | null>,
    ) => {
      state.filters.dateRange = action.payload;
      state.page = 1;
    },
    setCvssRange: (
      state,
      action: PayloadAction<[number, number] | null>,
    ) => {
      state.filters.cvssRange = action.payload;
      state.page = 1;
    },
    setRepoFilter: (state, action: PayloadAction<string | null>) => {
      state.filters.repo = action.payload;
      state.page = 1;
    },
    setGroupFilter: (state, action: PayloadAction<string | null>) => {
      state.filters.group = action.payload;
      state.page = 1;
    },
    resetFilters: (state) => {
      state.filters = initialFilters;
      state.page = 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVulnerabilities.pending, (state, action) => {
        const append = action.meta.arg?.append ?? false;
        state.status = 'loading';
        state.error = null;
        state.isRefreshing = !append && state.items.length > 0;
        if (!append && state.items.length === 0) {
          state.hasMore = false;
        }
      })
      .addCase(fetchVulnerabilities.fulfilled, (state, action) => {
        const append = action.meta.arg?.append ?? false;
        state.status = 'succeeded';
        state.isRefreshing = false;
        state.total = action.payload.total;
        state.metrics = action.payload.metrics ?? emptyMetrics;
        state.options = action.payload.options ?? defaultOptions;
        state.page = action.payload.page;
        state.pageSize = action.payload.limit;

        if (append) {
          state.items = state.items.concat(action.payload.data);
        } else {
          state.items = action.payload.data;
        }

        state.hasMore = state.items.length < action.payload.total;
      })
      .addCase(fetchVulnerabilities.rejected, (state, action) => {
        const hadData = state.items.length > 0;
        state.status = 'failed';
        state.isRefreshing = false;
        state.error = action.error.message ?? 'Failed to load vulnerabilities';
        if (!hadData) {
          state.items = [];
          state.total = 0;
          state.metrics = emptyMetrics;
          state.hasMore = false;
        }
      });
  },
});

export const {
  setPage,
  setPageSize,
  setSort,
  setQuery,
  toggleKaiFilter,
  setKaiStatuses,
  toggleSeverity,
  setRiskFactors,
  setDateRange,
  setCvssRange,
  setRepoFilter,
  setGroupFilter,
  resetFilters,
} = slice.actions;

export default slice.reducer;
