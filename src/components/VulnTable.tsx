import React from 'react';
import { Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Vulnerability } from '../data/types';
import { Link } from 'react-router-dom';

export default function VulnTable({ data }: { data: Vulnerability[] }) {
  const columns: ColumnsType<Vulnerability> = [
    {
      title: 'CVE ID',
      dataIndex: 'cve',
      key: 'cve',
      width: 220,
      className: 'column-cve',
      onHeaderCell: () => ({ className: 'column-cve column-cve--header' }),
      render: (_cve, record) => (
        <Link
          to={`/vuln/${encodeURIComponent(record.id)}`}
          className="column-cve__link"
        >
          {record.cve || record.id}
        </Link>
      ),
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 140,
      render: (sev: string) => {
        const value = (sev || '').toUpperCase();
        const color =
          value === 'HIGH'
            ? 'red'
            : value === 'MEDIUM'
            ? 'orange'
            : value === 'LOW'
            ? 'green'
            : value === 'CRITICAL'
            ? 'magenta'
            : 'blue';
        return <Tag color={color}>{value || 'UNKNOWN'}</Tag>;
      },
    },
    {
      title: 'CVSS',
      dataIndex: 'cvss',
      key: 'cvss',
      width: 100,
      sorter: (a, b) => (Number(a.cvss) || 0) - (Number(b.cvss) || 0),
    },
    { title: 'Repo', dataIndex: 'repoName', key: 'repoName', width: 220 },
    { title: 'Image', dataIndex: 'imageName', key: 'imageName', ellipsis: true, width: 280 },
    {
      title: 'Kai Status',
      dataIndex: 'kaiStatus',
      key: 'kaiStatus',
      width: 180,
      render: (status: string) => (
        <Tag color={status?.includes('ai') ? 'purple' : 'geekblue'}>
          {status || 'N/A'}
        </Tag>
      ),
    },
  ];

  const VIRTUAL_THRESHOLD = 400;
  const ROW_HEIGHT = 54;
  const VIEWPORT_HEIGHT = 600;
  const BUFFER = 6;

  const withKey = React.useMemo(
    () => data.map((item) => ({ ...item, __key: item.id })),
    [data],
  );

  const needsVirtual = withKey.length > VIRTUAL_THRESHOLD;

  const [scrollTop, setScrollTop] = React.useState(0);
  const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  React.useEffect(() => {
    setScrollTop(0);
  }, [withKey, needsVirtual]);

  const { virtualRows, offsetY, totalHeight } = React.useMemo(() => {
    if (!needsVirtual) {
      return { virtualRows: withKey, offsetY: 0, totalHeight: withKey.length * ROW_HEIGHT };
    }
    const visibleCount = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + BUFFER;
    const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER);
    const endIndex = Math.min(withKey.length, startIndex + visibleCount);
    const slice = withKey.slice(startIndex, endIndex);
    return {
      virtualRows: slice,
      offsetY: startIndex * ROW_HEIGHT,
      totalHeight: withKey.length * ROW_HEIGHT,
    };
  }, [needsVirtual, withKey, scrollTop]);

  if (needsVirtual) {
    return (
    <div className="virtual-table">
      {/* make a fake table header so the columns stay aligned with the virtual rows */}
      <Table
        className="virtual-table__header"
        columns={columns}
        dataSource={[]}
        pagination={false}
          rowKey="__key"
          tableLayout="fixed"
          bordered
          size="middle"
          locale={{ emptyText: null }}
        />
        <div
          className="virtual-table__body"
          style={{ maxHeight: VIEWPORT_HEIGHT, overflowY: 'auto' }}
          onScroll={handleScroll}
        >
          <div style={{ height: totalHeight, position: 'relative' }}>
            <Table
              columns={columns}
              dataSource={virtualRows}
              pagination={false}
              rowKey="__key"
              tableLayout="fixed"
              bordered
              size="middle"
              showHeader={false}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                transform: `translateY(${offsetY}px)`,
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="id"
      pagination={{ pageSize: 20, showSizeChanger: true }}
      scroll={{ y: 500 }}
      bordered
      tableLayout="fixed"
    />
  );
}
