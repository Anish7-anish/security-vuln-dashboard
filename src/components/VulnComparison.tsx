import React from 'react';
import { Card, Select, List, Tag, Typography, Empty, Space } from 'antd';
import { Vulnerability } from '../data/types';
import { summariseRiskFactors } from '../utils/vulnMetrics';

const { Text } = Typography;

function severityColor(severity?: string): string {
  const value = (severity || '').toLowerCase();
  if (value.includes('crit')) return 'magenta';
  if (value.includes('high')) return 'red';
  if (value.includes('med')) return 'orange';
  if (value.includes('low')) return 'green';
  return 'blue';
}

export default function VulnComparison({ data }: { data: Vulnerability[] }) {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  const options = React.useMemo(
    () =>
      data.map((v) => ({
        label: `${v.cve || v.id} – ${(v.severity || 'unknown').toUpperCase()}`,
        value: v.id,
      })),
    [data],
  );

  const selected = React.useMemo(
    () => data.filter((item) => selectedIds.includes(item.id)),
    [data, selectedIds],
  );

  const handleChange = (values: string[]) => {
    if (values.length <= 3) {
      setSelectedIds(values);
    } else {
      setSelectedIds(values.slice(values.length - 3));
    }
  };

  return (
    <Card
      title="Compare Vulnerabilities"
      extra={<Text type="secondary">Select up to three</Text>}
      style={{ width: '100%' }}
    >
      <Select
        mode="multiple"
        allowClear
        maxTagCount={2}
        value={selectedIds}
        options={options}
        onChange={handleChange}
        placeholder="Pick vulnerabilities to compare"
        style={{ width: '100%', marginBottom: 16 }}
      />
      {selected.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Choose vulnerabilities to view side-by-side"
        />
      ) : (
        <List
          dataSource={selected}
          renderItem={(item) => {
            const factors = summariseRiskFactors(item).slice(0, 4);
            return (
              <List.Item key={item.id}>
                <List.Item.Meta
                  title={
                    <Space size="small" wrap>
                      <Text strong>{item.cve || item.id}</Text>
                      <Tag color={severityColor(item.severity)}>
                        {(item.severity || 'unknown').toUpperCase()}
                      </Tag>
                      {(item.cvss ?? item.cvssScore) && (
                        <Tag color="geekblue">CVSS {item.cvss ?? item.cvssScore}</Tag>
                      )}
                    </Space>
                  }
                  description={
                    <div>
                      <Text type="secondary">
                        Package: {item.packageName || item.package || 'n/a'}
                      </Text>
                      <br />
                      <Text type="secondary">Repo: {item.repoName || 'n/a'}</Text>
                      <br />
                      <Text type="secondary">Image: {item.imageName || 'n/a'}</Text>
                      <div style={{ marginTop: 8 }}>
                        {factors.map((factor) => (
                          <Tag key={factor} color="purple">
                            {factor}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  }
                />
              </List.Item>
            );
          }}
        />
      )}
    </Card>
  );
}
