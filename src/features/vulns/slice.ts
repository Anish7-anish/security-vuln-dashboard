import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Vulnerability } from '../../data/types';

interface VulnState {
  all: Vulnerability[];
  filtered: Vulnerability[];
  kaiExclude: string[];
  query: string;
}

const initialState: VulnState = {
  all: [],
  filtered: [],
  kaiExclude: [],
  query: '',
};

const vulnSlice = createSlice({
  name: 'vulns',
  initialState,
  reducers: {
    setData: (state, action: PayloadAction<Vulnerability[]>) => {
      state.all = action.payload;
      state.filtered = action.payload;
    },

    setQuery: (state, action: PayloadAction<string>) => {
      const query = action.payload.toLowerCase();
      state.query = action.payload;

      // ✅ Type narrowing ensures v is Vulnerability
      const all: Vulnerability[] = Array.isArray(state.all)
        ? (state.all as Vulnerability[])
        : [];

      state.filtered = all.filter((v) =>
        (v.cve ?? '').toLowerCase().includes(query),
      );
    },

    toggleKaiFilter(state, action: PayloadAction<string>) {
    const status = action.payload;
    if (state.kaiExclude.includes(status)) {
      state.kaiExclude = state.kaiExclude.filter((s) => s !== status);
    } else {
      state.kaiExclude.push(status);
    }
    state.filtered = state.all.filter(
      (x) => !state.kaiExclude.includes(x.kaiStatus || '')
    );
},
  },
});

export const { setData, setQuery, toggleKaiFilter } = vulnSlice.actions;
export default vulnSlice.reducer;
