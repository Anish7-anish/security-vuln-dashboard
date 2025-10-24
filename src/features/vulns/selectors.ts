import { createSelector } from 'reselect';
import { RootState } from '../../app/store';

const selectSlice = (state: RootState) => state.vulns;

export const selectAll = createSelector([selectSlice], (s) => s.data);

export const selectFiltered = createSelector([selectSlice], (s) => s.filtered);

export const selectKPI = createSelector([selectSlice], (s) => {
  const total = s.data.length;
  const remain = s.filtered.length;
  const removed = total - remain;
  const pctRemain = total ? remain / total : 0;
  return { total, remain, removed, pctRemain };
});
