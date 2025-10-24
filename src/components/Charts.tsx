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
import { Card, Typography, Tag, Empty, Row, Col, Space, Badge } from 'antd';
import { Vulnerability } from '../data/types';
import {
  FilterImpactMetrics,
  RiskFactorDatum,
  TrendPoint,
  AiManualDatum,
} from '../utils/vulnMetrics';

const COLORS = ['#cf1322', '#fa8c16', '#faad14', '#52c41a', '#5b8ff9'];
const { Text } = Typography;

const severityPalette: Record<string, string> = {
  CRITICAL: '#cf1322',
  HIGH: '#fa8c16',
  MEDIUM: '#faad14',
  LOW: '#52c41a',
  UNKNOWN: '#5b8ff9',
};

export const SeverityChart = ({ data }: { data: Vulnerability[] }) => {
  const summary = useMemo(() => {
    if (!data.length) return [];
    const entries = Object.entries(
      data.reduce((acc: Record<string, number>, v) => {
        const key = (v.severity || 'UNKNOWN').toUpperCase();
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
    );
    return entries.map(([name, value]) => ({ name, value }));
  }, [data]);

  return (
    <Card title="Severity Distribution" style={{ width: '100%', height: '100%' }} bodyStyle={{ height: '100%' }}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {!summary.length ? (
          <Empty description="No vulnerabilities" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={summary} dataKey="value" nameKey="name" innerRadius={45} outerRadius={100} paddingAngle={3}>
                {summary.map((entry, idx) => (
                  <Cell key={entry.name} fill={severityPalette[entry.name] || COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={32} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
};

export const RiskFactorChart = ({ data }: { data: RiskFactorDatum[] }) => (
  <Card title="Risk Factor Frequency" style={{ width: '100%', height: '100%' }} bodyStyle={{ height: '100%' }}>
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {data.length === 0 ? (
        <Empty description="No risk factor data" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 16, right: 16, left: -10, bottom: 32 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" interval={0} angle={-30} textAnchor="end" height={70} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value" fill="#1890ff" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  </Card>
);

export const TrendChart = ({ data }: { data: TrendPoint[] }) => (
  <Card title="Published Trend" style={{ width: '100%' }}>
    {data.length === 0 ? (
      <Empty description="No dated vulnerabilities" image={Empty.PRESENTED_IMAGE_SIMPLE} />
    ) : (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 16, right: 16, left: -10, bottom: 16 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="CRITICAL" stroke={severityPalette.CRITICAL} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="HIGH" stroke={severityPalette.HIGH} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="MEDIUM" stroke={severityPalette.MEDIUM} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="LOW" stroke={severityPalette.LOW} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="UNKNOWN" stroke={severityPalette.UNKNOWN} strokeWidth={2} strokeDasharray="4 2" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    )}
  </Card>
);

export const FilterImpactCard = ({ impact }: { impact: FilterImpactMetrics }) => (
  <Card title="Filter Impact" style={{ width: '100%', height: '100%' }} bodyStyle={{ height: '100%' }}>
    {impact.total === 0 ? (
      <Empty description="No data loaded" image={Empty.PRESENTED_IMAGE_SIMPLE} />
    ) : (
      <Space
        direction="vertical"
        size="middle"
        style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'space-between' }}
      >
        <Row gutter={16} align="middle" justify="space-between">
          <Col span={12}>
            <div>
              <Text strong>{impact.visible}</Text>
              <Text> visible of </Text>
              <Text strong>{impact.total}</Text>
              <Text> total vulnerabilities</Text>
            </div>
            <Text type="secondary">{impact.hidden} hidden via filters</Text>
          </Col>
          <Col span={12}>
            <div className="filter-impact-bar">
              <div
                className="filter-impact-bar__visible"
                style={{ width: `${impact.percentVisible}%` }}
                aria-label="Visible percentage"
              />
              <div
                className="filter-impact-bar__hidden"
                style={{ width: `${impact.percentHidden}%` }}
                aria-label="Hidden percentage"
              />
            </div>
            <Row justify="space-between">
              <Text type="secondary">Visible {impact.percentVisible}%</Text>
              <Text type="secondary">Hidden {impact.percentHidden}%</Text>
            </Row>
          </Col>
        </Row>
        <Space size="small" wrap>
          {impact.queryActive && <Tag color="blue">Query “{impact.queryText}”</Tag>}
          {impact.activeKaiFilters.map((status) => (
            <Tag color="magenta" key={status}>
              Excluding {status}
            </Tag>
          ))}
          {impact.kaiExcludedCount > 0 && (
            <Tag color="volcano">{impact.kaiExcludedCount} blocked by Kai filters</Tag>
          )}
        </Space>
      </Space>
    )}
  </Card>
);

export const AiManualChart = ({ data }: { data: AiManualDatum[] }) => (
  <Card title="AI vs Manual Analysis" style={{ width: '100%' }}>
    {data.length === 0 ? (
      <Empty description="No analysis data" image={Empty.PRESENTED_IMAGE_SIMPLE} />
    ) : (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 16, right: 16, left: -10, bottom: 16 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="ai" stackId="a" fill="#531dab" name="AI analysis" radius={[4, 4, 0, 0]} />
          <Bar dataKey="manual" stackId="a" fill="#36cfc9" name="Manual review" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )}
  </Card>
);

interface CriticalHighlightsProps {
  data: Vulnerability[];
}

export const CriticalHighlights: React.FC<CriticalHighlightsProps> = ({ data }) => (
  <Card title="Critical Highlights" style={{ width: '100%' }}>
    {data.length === 0 ? (
      <Empty description="No critical vulnerabilities" image={Empty.PRESENTED_IMAGE_SIMPLE} />
    ) : (
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {data.map((item) => {
          const severity = (item.severity || 'UNKNOWN').toUpperCase();
          const color = severityPalette[severity] || '#5b8ff9';
          const cvss = item.cvss ?? (item as any).cvssScore;
          return (
            <Badge.Ribbon text="CRITICAL" color={color} key={item.id} style={{ fontSize: 12 }}>
              <Card size="small" hoverable style={{ borderLeft: `4px solid ${color}` }}>
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  <Space size="small" wrap>
                    <Text strong>{item.cve || item.id}</Text>
                    {cvss !== undefined && <Tag color="geekblue">CVSS {cvss}</Tag>}
                    <Tag color={color}>{severity}</Tag>
                  </Space>
                  {item.summary && (
                    <Text type="secondary" ellipsis={{ rows: 2 }}>
                      {item.summary}
                    </Text>
                  )}
                  <Space size="small" wrap>
                    {((item.riskFactors && Array.isArray(item.riskFactors)
                      ? item.riskFactors
                      : Object.keys((item.riskFactors as Record<string, unknown>) ?? {})) ||
                      [])
                      .slice(0, 4)
                      .map((factor) => (
                        <Tag key={`${item.id}-${factor}`} color="purple">
                          {factor}
                        </Tag>
                      ))}
                  </Space>
                </Space>
              </Card>
            </Badge.Ribbon>
          );
        })}
      </Space>
    )}
  </Card>
);
