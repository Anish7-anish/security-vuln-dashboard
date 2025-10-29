import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';

const selectSlice = (state: RootState) => state.vulns;

export const selectItems = createSelector([selectSlice], (s) => s.items);

export const selectFiltered = selectItems;

export const selectTotal = createSelector([selectSlice], (s) => s.total);

export const selectPagination = createSelector([selectSlice], (s) => ({
  page: s.page,
  pageSize: s.pageSize,
  total: s.total,
}));

export const selectSort = createSelector([selectSlice], (s) => ({
  sortBy: s.sortBy,
  sortDirection: s.sortDirection,
}));

export const selectStatus = createSelector([selectSlice], (s) => s.status);
export const selectIsRefreshing = createSelector([selectSlice], (s) => s.isRefreshing);

export const selectError = createSelector([selectSlice], (s) => s.error);

export const selectFilters = createSelector([selectSlice], (s) => s.filters);
export const selectOptions = createSelector([selectSlice], (s) => s.options);
export const selectHasMore = createSelector([selectSlice], (s) => s.hasMore);

export const selectKPI = createSelector([selectSlice], (s) => s.metrics.kpis);

export const selectSeverityCounts = createSelector(
  [selectSlice],
  (s) => s.metrics.severityCounts,
);

export const selectRiskFactorData = createSelector(
  [selectSlice],
  (s) => s.metrics.riskFactors,
);

export const selectTrendData = createSelector(
  [selectSlice],
  (s) => s.metrics.trend,
);

export const selectAiManualData = createSelector(
  [selectSlice],
  (s) => s.metrics.aiManual,
);

export const selectCriticalHighlights = createSelector(
  [selectSlice],
  (s) => s.metrics.highlights,
);

export const selectRepoSummary = createSelector(
  [selectSlice],
  (s) => s.metrics.repoSummary,
);
