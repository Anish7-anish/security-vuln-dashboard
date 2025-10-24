import { createSelector } from 'reselect';
import { RootState } from '../../app/store';
import {
  collectRiskFactorCounts,
  buildMonthlyTrend,
  deriveFilterImpact,
  computeAiManualBreakdown,
  pickCriticalHighlights,
} from '../../utils/vulnMetrics';

const selectSlice = (state: RootState) => state.vulns;

export const selectAll = createSelector([selectSlice], (s) => s.data);

export const selectFiltered = createSelector([selectSlice], (s) => s.filtered);

export const selectSort = createSelector([selectSlice], (s) => ({
  sortBy: s.sortBy,
  sortDirection: s.sortDirection,
}));

export const selectKPI = createSelector([selectSlice], (s) => {
  const total = s.data.length;
  const remain = s.filtered.length;
  const removed = total - remain;
  const pctRemain = total ? remain / total : 0;
  return { total, remain, removed, pctRemain };
});

const selectKaiExcludeArray = createSelector([selectSlice], (s) =>
  Array.from(s.kaiExclude),
);

export const selectRiskFactorData = createSelector([selectFiltered], (rows) =>
  collectRiskFactorCounts(rows),
);

export const selectTrendData = createSelector([selectFiltered], (rows) =>
  buildMonthlyTrend(rows),
);

export const selectFilterImpact = createSelector(
  [selectAll, selectFiltered, selectKaiExcludeArray, selectSlice],
  (all, filtered, kaiExclude, slice) =>
    deriveFilterImpact(all, filtered, kaiExclude, slice.q),
);

export const selectAiManualData = createSelector([selectFiltered], (rows) =>
  computeAiManualBreakdown(rows),
);

export const selectCriticalHighlights = createSelector([selectFiltered], (rows) =>
  pickCriticalHighlights(rows),
);
