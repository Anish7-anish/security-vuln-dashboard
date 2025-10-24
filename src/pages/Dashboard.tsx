import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Layout,
  Row,
  Col,
  Card,
  Typography,
  Spin,
  Space,
  Switch,
  Divider,
  Tooltip,
  Empty,
} from 'antd';
import { streamIntoDB, getAllVulnerabilities } from '../data/loader';
import { setData } from '../features/vulns/slice';
import FilterBar from '../components/FilterBar';
import VulnTable from '../components/VulnTable';
import KPIs from '../components/KPIs';
import RepoBar from '../components/RepoBar';
import {
  SeverityChart,
  RiskFactorChart,
  TrendChart,
  AiManualChart,
  CriticalHighlights,
} from '../components/Charts';
import VulnComparison from '../components/VulnComparison';
import {
  selectFiltered,
  selectRiskFactorData,
  selectTrendData,
  selectAiManualData,
  selectCriticalHighlights,
} from '../features/vulns/selectors';

const { Title, Text } = Typography;
const { Content } = Layout;

const pageStyle: React.CSSProperties = {
  minHeight: 'calc(100vh - 64px)',
  padding: '1.5rem clamp(1rem, 2vw, 2rem) 2.5rem',
  background: '#0c1b2a',
};

const contentStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '100%',
  margin: '0 auto',
};

type DashboardPreferences = {
  showRiskChart: boolean;
  showTrendChart: boolean;
  showAiManual: boolean;
  showComparison: boolean;
  showHighlights: boolean;
  showKPIs: boolean;
  showRepoBar: boolean;
};

const PREFERENCE_KEY = 'svd-dashboard-preferences';

const defaultPreferences: DashboardPreferences = {
  showRiskChart: true,
  showTrendChart: true,
  showAiManual: true,
  showComparison: true,
  showHighlights: true,
  showKPIs: true,
  showRepoBar: true,
};

export default function Dashboard() {
  const dispatch = useDispatch();
  const filtered = useSelector(selectFiltered);
  const riskData = useSelector(selectRiskFactorData);
  const trendData = useSelector(selectTrendData);
  const aiManual = useSelector(selectAiManualData);
  const highlights = useSelector(selectCriticalHighlights);

  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<DashboardPreferences>(() => {
    try {
      const stored = localStorage.getItem(PREFERENCE_KEY);
      if (stored) {
        return { ...defaultPreferences, ...JSON.parse(stored) } as DashboardPreferences;
      }
      return defaultPreferences;
    } catch {
      return defaultPreferences;
    }
  });

  useEffect(() => {
    localStorage.setItem(PREFERENCE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    (async () => {
      const stored = await getAllVulnerabilities();
      if (stored.length === 0) {
        await streamIntoDB('/ui_demo.json');
      }
      const data = await getAllVulnerabilities();
      dispatch(setData(data));
      setLoading(false);
    })();
  }, [dispatch]);

  const togglePreference = (key: keyof DashboardPreferences) => (checked: boolean) => {
    setPreferences((prev) => ({ ...prev, [key]: checked }));
  };

  const hasData = filtered.length > 0;

  const comparisonData = useMemo(() => filtered.slice(0, 200), [filtered]);

  return (
    <Layout style={pageStyle}>
      <Content style={contentStyle}>
        <Space
          align="center"
          style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}
        >
          <Title level={2} style={{ color: '#fff', marginBottom: 0 }}>
            🔒 Security Vulnerability Dashboard
          </Title>
          <Space size="middle" wrap>
            <Tooltip title="Toggle sections to personalize the dashboard">
              <Text strong style={{ color: '#9fb4cc' }}>
                Preferences
              </Text>
            </Tooltip>
            <Space size="small" wrap>
              <Switch
                size="small"
                checked={preferences.showRiskChart}
                onChange={togglePreference('showRiskChart')}
                checkedChildren="Risk"
                unCheckedChildren="Risk"
              />
              <Switch
                size="small"
                checked={preferences.showTrendChart}
                onChange={togglePreference('showTrendChart')}
                checkedChildren="Trend"
                unCheckedChildren="Trend"
              />
              <Switch
                size="small"
                checked={preferences.showAiManual}
                onChange={togglePreference('showAiManual')}
                checkedChildren="AI"
                unCheckedChildren="AI"
              />
              <Switch
                size="small"
                checked={preferences.showHighlights}
                onChange={togglePreference('showHighlights')}
                checkedChildren="Highlights"
                unCheckedChildren="Highlights"
              />
              <Switch
                size="small"
                checked={preferences.showComparison}
                onChange={togglePreference('showComparison')}
                checkedChildren="Compare"
                unCheckedChildren="Compare"
              />
              <Switch
                size="small"
                checked={preferences.showKPIs}
                onChange={togglePreference('showKPIs')}
                checkedChildren="KPIs"
                unCheckedChildren="KPIs"
              />
              <Switch
                size="small"
                checked={preferences.showRepoBar}
                onChange={togglePreference('showRepoBar')}
                checkedChildren="Repos"
                unCheckedChildren="Repos"
              />
            </Space>
          </Space>
        </Space>

        <Divider style={{ borderColor: 'rgba(255,255,255,0.15)', margin: '1rem 0 1.5rem' }} />

        <Card bodyStyle={{ padding: '1.5rem' }} style={{ marginBottom: 24 }}>
          <FilterBar />
        </Card>

        {loading ? (
          <Spin size="large" style={{ marginTop: 120, display: 'block' }} />
        ) : (
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <Row gutter={[16, 16]}>
              {preferences.showKPIs && (
                <Col xs={24} lg={12} xl={12}>
                  <KPIs />
                </Col>
              )}
              <Col xs={24} lg={preferences.showKPIs ? 12 : 24} xl={preferences.showKPIs ? 12 : 24}>
                <SeverityChart data={filtered} />
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              {preferences.showAiManual && (
                <Col xs={24} lg={12} xl={12} style={{ display: 'flex' }}>
                  <AiManualChart data={aiManual} />
                </Col>
              )}
              {preferences.showRepoBar && (
                <Col
                  xs={24}
                  lg={preferences.showAiManual ? 12 : 24}
                  xl={preferences.showAiManual ? 12 : 24}
                  style={{ display: 'flex' }}
                >
                  <RepoBar data={filtered} />
                </Col>
              )}
            </Row>

            <Row gutter={[16, 16]}>
              {preferences.showRiskChart && (
                <Col xs={24} lg={12}>
                  <RiskFactorChart data={riskData} />
                </Col>
              )}
              {preferences.showTrendChart && (
                <Col xs={24} lg={12}>
                  <TrendChart data={trendData} />
                </Col>
              )}
            </Row>

            {preferences.showHighlights && (
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <CriticalHighlights data={highlights} />
                </Col>
              </Row>
            )}

            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card title="Vulnerability Table" bodyStyle={{ padding: 0 }}>
                  <VulnTable data={filtered} />
                </Card>
              </Col>
            </Row>

            {preferences.showComparison && (
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <VulnComparison data={comparisonData} />
                </Col>
              </Row>
            )}

            {!hasData && (
              <Card>
                <Empty description="Adjust filters to see results" />
              </Card>
            )}
          </Space>
        )}
      </Content>
    </Layout>
  );
}
