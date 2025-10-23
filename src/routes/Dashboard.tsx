import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Layout, Row, Col, Card, Typography, Spin } from 'antd';
import { streamIntoDB, getAllVulnerabilities } from '../data/loader';
import { setData } from '../features/vulns/slice';
import { RootState } from '../app/store';
import FilterBar from '../components/FilterBar';
import VulnTable from '../components/VulnTable';
import {
  SeverityChart,
  RiskFactorChart,
  TrendChart,
  FilterImpactCard,
} from '../components/Charts';
import VulnComparison from '../components/VulnComparison';
import {
  buildMonthlyTrend,
  collectRiskFactorCounts,
  deriveFilterImpact,
} from '../utils/vulnMetrics';

const { Title } = Typography;
const { Content } = Layout;

export default function Dashboard() {
  const dispatch = useDispatch();
  const vulns = useSelector((s: RootState) => s.vulns.filtered);
  const allVulns = useSelector((s: RootState) => s.vulns.all);
  const kaiExclude = useSelector((s: RootState) => s.vulns.kaiExclude);
  const query = useSelector((s: RootState) => s.vulns.query);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    (async () => {
      const stored = await getAllVulnerabilities();
      if (stored.length === 0) {
      //  await streamIntoDB('https://raw.githubusercontent.com/chanduusc/Ui-Demo-Data/main/ui_demo.json');
       await streamIntoDB('/ui_demo.json');

      }
      const data = await getAllVulnerabilities();
      dispatch(setData(data));
      setLoading(false);
    })();
  }, [dispatch]);

  const riskFactors = useMemo(() => collectRiskFactorCounts(vulns), [vulns]);
  const trendSeries = useMemo(() => buildMonthlyTrend(vulns), [vulns]);
  const impact = useMemo(
    () => deriveFilterImpact(allVulns, vulns, kaiExclude, query),
    [allVulns, vulns, kaiExclude, query],
  );

  return (
    <Layout style={{ padding: '2rem', background: '#fff' }}>
      <Content>
        <Title level={2}>🔒 Security Vulnerability Dashboard</Title>
        <FilterBar />

        {loading ? (
          <Spin size="large" style={{ marginTop: 100, display: 'block' }} />
        ) : (
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12} lg={8}>
              <SeverityChart data={vulns} />
            </Col>
            <Col xs={24} md={12} lg={8}>
              <RiskFactorChart data={riskFactors} />
            </Col>
            <Col xs={24} md={24} lg={8}>
              <FilterImpactCard impact={impact} />
            </Col>
            <Col xs={24} md={14} lg={14}>
              <TrendChart data={trendSeries} />
            </Col>
            <Col xs={24} md={10} lg={10}>
              <VulnComparison data={vulns} />
            </Col>
            <Col xs={24}>
              <Card title="Vulnerability Table">
                <VulnTable data={vulns} />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
