import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Vulnerability } from '../../data/types';

interface VulnState {
  all: Vulnerability[];
  filtered: Vulnerability[];
  suggestions: string[];
  kaiExclude: string[];
  query: string;
}

const initialState: VulnState = {
  all: [],
  filtered: [],
  suggestions: [],
  kaiExclude: [],
  query: '',
};

const SEARCH_FIELDS: Array<keyof Vulnerability> = [
  'cve',
  'package',
  'packageName',
  'packageVersion',
  'repoName',
  'imageName',
  'severity',
  'summary',
  'description',
  'groupName',
];

function extractRiskFactors(v: Vulnerability): string[] {
  if (Array.isArray(v.riskFactors)) return v.riskFactors.filter(Boolean) as string[];
  if (v.riskFactors && typeof v.riskFactors === 'object') {
    return Object.keys(v.riskFactors);
  }
  return [];
}

function collectSearchTokens(v: Vulnerability): string[] {
  const base = SEARCH_FIELDS.map((field) => {
    const value = v[field];
    return typeof value === 'string' ? value : undefined;
  }).filter((value): value is string => Boolean(value));

  const kai = v.kaiStatus ? [v.kaiStatus] : [];
  return [...base, ...extractRiskFactors(v), ...kai].map((token) =>
    token.toLowerCase(),
  );
}

function applyFilters(state: VulnState) {
  const query = state.query.trim().toLowerCase();
  const excluded = new Set(state.kaiExclude.map((s) => s.toLowerCase()));
  const suggestionSet = new Set<string>();

  state.filtered = state.all.filter((v) => {
    const status = (v.kaiStatus || '').toLowerCase();
    if (status && excluded.has(status)) return false;

    if (!query) return true;

    const matchesQuery = collectSearchTokens(v).some((token) =>
      token.includes(query),
    );

    if (matchesQuery) {
      if (v.cve) suggestionSet.add(v.cve);
      if (v.packageName) suggestionSet.add(v.packageName);
    }

    return matchesQuery;
  });

  state.suggestions = query ? Array.from(suggestionSet).slice(0, 10) : [];
}

const vulnSlice = createSlice({
  name: 'vulns',
  initialState,
  reducers: {
    setData: (state, action: PayloadAction<Vulnerability[]>) => {
      state.all = action.payload;
      applyFilters(state);
    },

    setQuery: (state, action: PayloadAction<string>) => {
      state.query = action.payload;
      applyFilters(state);
    },

    toggleKaiFilter: (state, action: PayloadAction<string>) => {
      const status = action.payload;
      if (state.kaiExclude.includes(status)) {
        state.kaiExclude = state.kaiExclude.filter((s) => s !== status);
      } else {
        state.kaiExclude.push(status);
      }
      applyFilters(state);
    },
  },
});

export const { setData, setQuery, toggleKaiFilter } = vulnSlice.actions;
export default vulnSlice.reducer;
