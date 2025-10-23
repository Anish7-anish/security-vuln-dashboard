import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { Card, Progress, Typography, Tag, Empty } from 'antd';
import { Vulnerability } from '../data/types';
import {
  FilterImpactMetrics,
  RiskFactorDatum,
  TrendPoint,
} from '../utils/vulnMetrics';

const COLORS = ['#cf1322', '#fa8c16', '#faad14', '#52c41a'];
const { Text } = Typography;

export const SeverityChart = ({ data }: { data: Vulnerability[] }) => {
  const summary = useMemo(
    () =>
      Object.entries(
        data.reduce((acc: Record<string, number>, v) => {
          const key = (v.severity || 'unknown').toUpperCase();
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {}),
      ).map(([name, value]) => ({ name, value })),
    [data],
  );

  return (
    <Card title="Severity Distribution" style={{ width: '100%', marginBottom: 16 }}>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie data={summary} dataKey="value" nameKey="name" outerRadius={80}>
            {summary.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
};

export const RiskFactorChart = ({ data }: { data: RiskFactorDatum[] }) => (
  <Card title="Risk Factor Frequency" style={{ width: '100%', marginBottom: 16 }}>
    {data.length === 0 ? (
      <Empty description="No risk factor data" image={Empty.PRESENTED_IMAGE_SIMPLE} />
    ) : (
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} margin={{ top: 16, right: 16, left: -10, bottom: 16 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" interval={0} angle={-35} textAnchor="end" height={80} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="value" fill="#1890ff" />
        </BarChart>
      </ResponsiveContainer>
    )}
  </Card>
);

export const TrendChart = ({ data }: { data: TrendPoint[] }) => (
  <Card title="Published Trend" style={{ width: '100%', marginBottom: 16 }}>
    {data.length === 0 ? (
      <Empty description="No dated vulnerabilities" image={Empty.PRESENTED_IMAGE_SIMPLE} />
    ) : (
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 16, right: 16, left: -10, bottom: 16 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="CRITICAL" stroke="#cf1322" />
          <Line type="monotone" dataKey="HIGH" stroke="#fa8c16" />
          <Line type="monotone" dataKey="MEDIUM" stroke="#faad14" />
          <Line type="monotone" dataKey="LOW" stroke="#52c41a" />
          <Line type="monotone" dataKey="UNKNOWN" stroke="#8694a3" strokeDasharray="4 2" />
        </LineChart>
      </ResponsiveContainer>
    )}
  </Card>
);

export const FilterImpactCard = ({ impact }: { impact: FilterImpactMetrics }) => (
  <Card title="Filter Impact" style={{ width: '100%', marginBottom: 16 }}>
    <Progress
      type="dashboard"
      percent={impact.percentVisible}
      format={(value) => `${value}% visible`}
      strokeColor="#722ed1"
    />
    <div style={{ marginTop: 16 }}>
      <Text strong>
        Showing {impact.visible} of {impact.total} vulnerabilities
      </Text>
      <br />
      <Text type="secondary">
        Hidden due to filters: {impact.hidden} ({impact.percentHidden}%)
      </Text>
    </div>
    <div style={{ marginTop: 16 }}>
      {impact.queryActive && (
        <Tag color="blue">Query: “{impact.queryText}”</Tag>
      )}
      {impact.activeKaiFilters.map((status) => (
        <Tag color="magenta" key={status}>
          Excluding {status}
        </Tag>
      ))}
      {impact.kaiExcludedCount > 0 && (
        <Tag color="volcano">
          {impact.kaiExcludedCount} blocked by kai filter
        </Tag>
      )}
    </div>
  </Card>
);
