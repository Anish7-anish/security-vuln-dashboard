import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type KaiStatus = 'invalid - norisk' | 'ai-invalid-norisk' | string;

export interface Vulnerability {
  id: string;
  package: string;
  version?: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN' | string;
  cvssScore?: number;
  publishedAt?: string;
  updatedAt?: string;
  riskFactors?: string[];
  kaiStatus?: KaiStatus;
  summary?: string;
  references?: string[];
  [k: string]: unknown;
}

export interface FilterState {
  severities: Set<string>;
  kaiExclude: Set<string>;
  riskFactors: Set<string>;
  q: string;
  dateRange?: [number, number];
}

const initialState: FilterState = {
  severities: new Set(),
  kaiExclude: new Set(),
  riskFactors: new Set(),
  q: '',
};

const vulnsSlice = createSlice({
  name: 'vulns',
  initialState,
  reducers: {
    setQuery(state, action: PayloadAction<string>) {
      state.q = action.payload;
    },
    toggleSeverity(state, action: PayloadAction<string>) {
      const v = action.payload;
      if (state.severities.has(v)) {
        state.severities.delete(v);
      } else {
        state.severities.add(v);
      }
    },
    toggleRisk(state, action: PayloadAction<string>) {
      const v = action.payload;
      if (state.riskFactors.has(v)) {
        state.riskFactors.delete(v);
      } else {
        state.riskFactors.add(v);
      }
    },
    setDateRange(state, action: PayloadAction<[number, number] | undefined>) {
      state.dateRange = action.payload;
    },
    clearAllFilters(state) {
      state.severities.clear();
      state.riskFactors.clear();
      state.kaiExclude.clear();
      state.q = '';
      state.dateRange = undefined;
    },
    applyManualAnalysis(state) {
      state.kaiExclude.add('invalid - norisk');
    },
    applyAIAnalysis(state) {
      state.kaiExclude.add('ai-invalid-norisk');
    },
    toggleKaiExclude(state, action: PayloadAction<string>) {
      const v = action.payload;
      if (state.kaiExclude.has(v)) {
        state.kaiExclude.delete(v);
      } else {
        state.kaiExclude.add(v);
      }
    },
  },
});

export const {
  setQuery,
  toggleSeverity,
  toggleRisk,
  setDateRange,
  clearAllFilters,
  applyManualAnalysis,
  applyAIAnalysis,
  toggleKaiExclude,
} = vulnsSlice.actions;

export default vulnsSlice.reducer;