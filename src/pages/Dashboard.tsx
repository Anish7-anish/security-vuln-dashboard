import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Layout, Row, Col, Card, Typography, Spin } from 'antd';
import { streamIntoDB, getAllVulnerabilities } from '../data/loader';
import { setData } from '../features/vulns/slice';
import { RootState } from '../app/store';
import FilterBar from '../components/FilterBar';
import VulnTable from '../components/VulnTable';
import { SeverityChart } from '../components/Charts';

const { Title } = Typography;
const { Content } = Layout;

export default function Dashboard() {
  const dispatch = useDispatch();
  const vulns = useSelector((s: RootState) => s.vulns.filtered);
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
            <Col xs={24} md={12} lg={16}>
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
