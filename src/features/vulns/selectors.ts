import { createSelector } from 'reselect';
import { RootState } from '../../app/store';
import Fuse from 'fuse.js';
import { Vulnerability } from './slice';

const selectAll = (state: RootState) => (state as any).entities?.vulns ?? ([] as Vulnerability[]);
const selectFilters = (state: RootState) => (state as any).vulns;

export const selectFiltered = createSelector([selectAll, selectFilters], (rows, f) => {
  let out = rows;
  if (f.kaiExclude.size) {
    out = out.filter((v: any) => !f.kaiExclude.has(v.kaiStatus ?? ''));
  }
  if (f.severities.size) {
    out = out.filter((v: any) => f.severities.has(v.severity));
  }
  if (f.riskFactors.size) {
    out = out.filter((v: any) => (v.riskFactors ?? []).some((r: any) => f.riskFactors.has(r)));
  }
  if (f.dateRange) {
    const [from, to] = f.dateRange;
    out = out.filter((v: any) => {
      const t = v.publishedAt ? Date.parse(v.publishedAt) : 0;
      return t >= from && t <= to;
    });
  }
  if (f.q) {
    const fuse = new Fuse(out, {
      keys: ['id', 'package', 'summary', 'riskFactors'],
      threshold: 0.35,
      ignoreLocation: true,
    });
    out = fuse.search(f.q).map((r: any) => r.item);
  }
  return out;
});

export const selectKPI = createSelector([selectAll, selectFiltered], (all, filtered) => {
  const total = all.length;
  const remain = filtered.length;
  const removed = total - remain;
  const pctRemain = total ? remain / total : 0;
  return { total, remain, removed, pctRemain };
});