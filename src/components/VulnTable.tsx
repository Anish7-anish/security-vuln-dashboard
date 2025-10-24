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
            render: (_cve, record) => (
              <Link to={`/vuln/${encodeURIComponent(record.id)}`}>
                {record.cve || record.id}
              </Link>
            )
        },
        {
            title: "Severity",
            dataIndex: 'severity',
            key: 'severity',
            render: (sev) => {
                const color = 
                    sev === 'high' || sev === 'HIGH'
                        ? 'red'
                        : sev === 'medium'
                        ? 'orange'
                        : sev === 'low'
                        ? 'green'
                        : 'blue';
                return <Tag color = {color}>{sev?.toUpperCase()}</Tag>;
            },
        },
        { title: 'CVSS', dataIndex: 'cvss', key: 'cvss', sorter: (a, b) => (Number(a.cvss) || 0) - (Number(b.cvss) || 0), },
        { title: 'Repo', dataIndex: 'repoName', key: 'repoName' },
        { title: 'Image', dataIndex: 'imageName', key: 'imageName', ellipsis: true },
        {
            title: 'Kai Status',
            dataIndex: 'kaiStatus',
            key: 'kaiStatus',
            render: (status) => (
                <Tag color={status?.includes('ai') ? 'purple' : 'geekblue'}>
                    {status || 'N/A'}
                </Tag>
            ),
        },
    ];

    return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="id"
      pagination={{ pageSize: 20, showSizeChanger: true }}
      scroll={{ y: 500 }}
      bordered
    />
  );
}
