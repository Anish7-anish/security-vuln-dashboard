import React, { useEffect, useCallback, useMemo } from 'react';
import { Layout, Typography, Card } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectFilters,
  selectFiltered,
  selectPagination,
  selectHasMore,
  selectSort,
  selectStatus,
} from '../features/vulns/selectors';
import FilterBar from '../components/FilterBar';
import VulnTable from '../components/VulnTable';
import { fetchVulnerabilities, setPage, setSort } from '../features/vulns/slice';
import type { AppDispatch, RootState } from '../app/store';

const { Title } = Typography;

export default function SearchPage() {
  const dispatch = useDispatch<AppDispatch>();
  const data = useSelector(selectFiltered);
  const pagination = useSelector(selectPagination);
  const status = useSelector(selectStatus);
  const filters = useSelector(selectFilters);
  const page = useSelector((state: RootState) => state.vulns.page);
  const pageSize = useSelector((state: RootState) => state.vulns.pageSize);
  const sort = useSelector(selectSort);
  const hasMore = useSelector(selectHasMore);

  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);

  // Refetch whenever filters or sort knobs change to avoid stale results.
  useEffect(() => {
    dispatch(fetchVulnerabilities());
  }, [dispatch, filtersKey, pageSize, sort.sortBy, sort.sortDirection]);

  const handleLoadMore = useCallback(() => {
    // Skip pagination when a fetch is already running.
    if (status === 'loading' || !hasMore) return;
    dispatch(setPage(page + 1));
    dispatch(fetchVulnerabilities({ append: true }));
  }, [dispatch, hasMore, page, status]);

  return (
    <Layout style={{ padding: '2rem', background: '#fff' }}>
      <Title level={2}>🔎 Advanced Search</Title>
      <FilterBar />
      <Card>
        <VulnTable
          data={data}
          total={pagination.total}
          loading={status === 'loading'}
          sortBy={sort.sortBy}
          sortDirection={sort.sortDirection}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
        />
      </Card>
    </Layout>
  );
}
