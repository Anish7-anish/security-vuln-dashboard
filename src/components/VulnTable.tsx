import React, { useCallback, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Empty, Spin, Tag } from 'antd';
import VirtualList from 'rc-virtual-list';
import type { Vulnerability } from '../data/types';
import type { SortDirection, SortKey } from '../features/vulns/slice';

export interface VulnTableProps {
  data: Vulnerability[];
  total: number;
  loading: boolean;
  hasMore: boolean;
  sortBy: SortKey;
  sortDirection: SortDirection;
  onLoadMore: () => void;
}

const severityColor = (sev: string) => {
  const value = (sev || '').toUpperCase();
  switch (value) {
    case 'CRITICAL':
      return 'magenta';
    case 'HIGH':
      return 'red';
    case 'MEDIUM':
      return 'orange';
    case 'LOW':
      return 'green';
    default:
      return 'geekblue';
  }
};

const CONTAINER_HEIGHT = 560;
const ROW_HEIGHT = 64;
const columns = [
  { key: 'cve', title: 'CVE ID', width: 220 },
  { key: 'severity', title: 'Severity', width: 140 },
  { key: 'cvss', title: 'CVSS', width: 100 },
  { key: 'repoName', title: 'Repo', width: 220 },
  { key: 'imageName', title: 'Image', width: 240 },
  { key: 'kaiStatus', title: 'Kai Status', width: 180 },
];

export default function VulnTable({
  data,
  total,
  loading,
  hasMore,
  sortBy,
  sortDirection,
  onLoadMore,
}: VulnTableProps) {
  // Virtual list keeps large tables responsive.
  const gridTemplate = useMemo(
    () => columns.map((col) => `${col.width}px`).join(' '),
    [],
  );

  const renderSortIndicator = useCallback(
    (key: SortKey) => {
      if (key !== sortBy) return null;
      return sortDirection === 'asc' ? '▲' : '▼';
    },
    [sortBy, sortDirection],
  );

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      // Trigger pagination before reaching the bottom to keep scrolling smooth.
      const target = e.currentTarget;
      if (
        !loading &&
        hasMore &&
        target.scrollHeight - target.scrollTop - target.clientHeight < ROW_HEIGHT * 2
      ) {
        onLoadMore();
      }
    },
    [hasMore, loading, onLoadMore],
  );

  useEffect(() => {
    // Auto-fetch more rows if the viewport still has space.
    if (!loading && hasMore) {
      const contentHeight = data.length * ROW_HEIGHT;
      if (contentHeight < CONTAINER_HEIGHT) {
        onLoadMore();
      }
    }
  }, [data.length, hasMore, loading, onLoadMore]);

  return (
    <div
      style={{
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: gridTemplate,
          background: '#f8f9fb',
          padding: '12px 16px',
          fontWeight: 600,
          color: '#1f2933',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        {columns.map((col) => (
          <div
            key={col.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              textTransform: 'uppercase',
            }}
          >
            {col.title}
            <span style={{ fontSize: 11, color: '#4d5b77' }}>
              {renderSortIndicator(col.key as SortKey)}
            </span>
          </div>
        ))}
      </div>
      {data.length === 0 && !loading ? (
        <div style={{ padding: '48px 0' }}>
          <Empty description="No vulnerabilities" />
        </div>
      ) : (
        <VirtualList
          data={data}
          height={CONTAINER_HEIGHT}
          itemHeight={ROW_HEIGHT}
          itemKey="id"
          onScroll={handleScroll}
        >
          {(item: Vulnerability) => (
            <div
              key={item.id}
              style={{
                display: 'grid',
                gridTemplateColumns: gridTemplate,
                alignItems: 'center',
                padding: '12px 16px',
                borderBottom: '1px solid rgba(0,0,0,0.04)',
                background: '#fff',
              }}
            >
              <div>
                <Link to={`/vuln/${encodeURIComponent(item.id)}`}>
                  {item.cve || item.id}
                </Link>
              </div>
              <div>
                <Tag color={severityColor(item.severity)}>
                  {(item.severity || 'UNKNOWN').toUpperCase()}
                </Tag>
              </div>
              <div>{item.cvss ?? '—'}</div>
              <div>{item.repoName || '—'}</div>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.imageName || '—'}
              </div>
              <div>
                <Tag color={item.kaiStatus?.includes('ai') ? 'purple' : 'geekblue'}>
                  {item.kaiStatus || 'N/A'}
                </Tag>
              </div>
            </div>
          )}
        </VirtualList>
      )}
      <div style={{ padding: '12px 16px', textAlign: 'center' }}>
        {loading ? (
          <Spin />
        ) : (
          <span style={{ fontSize: 12, color: '#667085' }}>
            Showing {data.length} of {total.toLocaleString()} records
          </span>
        )}
      </div>
    </div>
  );
}
