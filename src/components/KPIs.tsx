// components/KPIs.tsx
import React from 'react';
import { Card, Statistic, Row, Col, Progress, Typography } from 'antd';
import { useSelector } from 'react-redux';
import { selectKPI } from '../features/vulns/selectors';
import type { RootState } from '../app/store';

export default function KPIs() {
  const { total, remain, removed, pctRemain } = useSelector((s: RootState) => selectKPI(s));
  return (
    <Card
      title="Key Vulnerability Indicators"
      bodyStyle={{ padding: '1.5rem' }}
      style={{ width: '100%', height: '100%' }}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Statistic title="Total Vulnerabilities" value={total} />
        </Col>
        <Col xs={24} sm={8}>
          <Statistic title="After Filters" value={remain} />
        </Col>
        <Col xs={24} sm={8}>
          <Statistic title="Removed by Filters" value={removed} />
        </Col>
        <Col span={24}>
          <div style={{ marginTop: 8 }}>
            <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
              Visibility After Filtering
            </Typography.Text>
            <Progress
              percent={Math.round(pctRemain * 100)}
              showInfo
              format={(p) => `${p}% remain`}
            />
          </div>
        </Col>
      </Row>
    </Card>
  );
}
