import React, { useEffect, useState, useMemo, Suspense, lazy, useRef } from 'react';
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
  Alert,
} from 'antd';
import { streamIntoDB, getAllVulnerabilities, DATA_SOURCES, EXPECTED_TOTAL } from '../data/loader';
import { setData } from '../features/vulns/slice';
import FilterBar from '../components/FilterBar';
import VulnTable from '../components/VulnTable';
import KPIs from '../components/KPIs';
const RepoBar = lazy(() => import('../components/RepoBar'));
const VulnComparison = lazy(() => import('../components/VulnComparison'));
const SeverityChart = lazy(() =>
  import('../components/Charts').then((mod) => ({ default: mod.SeverityChart })),
);
const RiskFactorChart = lazy(() =>
  import('../components/Charts').then((mod) => ({ default: mod.RiskFactorChart })),
);
const TrendChart = lazy(() =>
  import('../components/Charts').then((mod) => ({ default: mod.TrendChart })),
);
const AiManualChart = lazy(() =>
  import('../components/Charts').then((mod) => ({ default: mod.AiManualChart })),
);
const CriticalHighlights = lazy(() =>
  import('../components/Charts').then((mod) => ({ default: mod.CriticalHighlights })),
);
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
  // background: '#0c1b2a'
  background: '#111827',
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
  const bootstrapped = useRef(false);
  const [progressCount, setProgressCount] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [countMismatch, setCountMismatch] = useState<number | null>(null);
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
    // stash toggles so the layout sticks between page loads
    localStorage.setItem(PREFERENCE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    // on boot try indexedDB first, stream the demo blob if we are empty
    (async () => {
      if (bootstrapped.current) return;
      bootstrapped.current = true;
      try {
        setLoadError(null);
        setCountMismatch(null);

        const stored = await getAllVulnerabilities();
        if (stored.length === 0) {
          try {
            await streamIntoDB(DATA_SOURCES, (count) => setProgressCount(count));
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error("⚠️ Stream failed:", message);
            setLoadError(message);
          }
        }

        const data = await getAllVulnerabilities();
        dispatch(setData(data));

        if (data.length !== EXPECTED_TOTAL) {
          setCountMismatch(data.length);
        } else {
          setCountMismatch(null);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("💥 Failed to bootstrap dashboard:", message);
        setLoadError(message);
      } finally {
        setLoading(false);
        setProgressCount(null);
      }
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

        {loadError && (
          <Alert
            style={{ marginTop: 16 }}
            type="error"
            showIcon
            message="Failed to stream vulnerability dataset"
            description={`The data worker stopped with: ${loadError}. Check your network connection or configure VITE_DATA_URL to a reachable JSON file.`}
          />
        )}

        {countMismatch !== null && (
          <Alert
            style={{ marginTop: 16 }}
            type="warning"
            showIcon
            message="Dataset looks incomplete"
            description={`Indexed ${countMismatch.toLocaleString()} rows, but expected about ${EXPECTED_TOTAL.toLocaleString()}. Try clearing IndexedDB and reloading once the data source is stable.`}
          />
        )}

        <Divider style={{ borderColor: 'rgba(255,255,255,0.15)', margin: '1rem 0 1.5rem' }} />

        <Card bodyStyle={{ padding: '1.5rem' }} style={{ marginBottom: 24 }}>
          <FilterBar />
        </Card>

        {loading ? (
          <Spin
            size="large"
            tip={
              progressCount
                ? `Streaming vulnerabilities… ${progressCount.toLocaleString()} loaded (${Math.min(
                    100,
                    Math.round((progressCount / EXPECTED_TOTAL) * 100),
                  )}%)`
                : 'Streaming vulnerabilities…'
            }
            style={{ marginTop: 120, display: 'block' }}
          />
        ) : (
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <Row gutter={[16, 16]}>
              {preferences.showKPIs && (
                <Col xs={24} lg={12} xl={12}>
                  <KPIs />
                </Col>
              )}
              <Col xs={24} lg={preferences.showKPIs ? 12 : 24} xl={preferences.showKPIs ? 12 : 24}>
                <Suspense
                  fallback={
                    <Card style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Spin size="large" />
                    </Card>
                  }
                >
                  <SeverityChart data={filtered} />
                </Suspense>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              {preferences.showAiManual && (
                <Col xs={24} lg={12} xl={12} style={{ display: 'flex' }}>
                  <Suspense
                    fallback={
                      <Card style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Spin size="large" />
                      </Card>
                    }
                  >
                    <AiManualChart data={aiManual} />
                  </Suspense>
                </Col>
              )}
              {preferences.showRepoBar && (
                <Col
                  xs={24}
                  lg={preferences.showAiManual ? 12 : 24}
                  xl={preferences.showAiManual ? 12 : 24}
                  style={{ display: 'flex' }}
                >
                  <Suspense
                    fallback={
                      <Card style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Spin size="large" />
                      </Card>
                    }
                  >
                    <RepoBar data={filtered} />
                  </Suspense>
                </Col>
              )}
            </Row>

            <Row gutter={[16, 16]}>
              {preferences.showRiskChart && (
                <Col xs={24} lg={12}>
                  <Suspense
                    fallback={
                      <Card style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Spin size="large" />
                      </Card>
                    }
                  >
                    <RiskFactorChart data={riskData} />
                  </Suspense>
                </Col>
              )}
              {preferences.showTrendChart && (
                <Col xs={24} lg={12}>
                  <Suspense
                    fallback={
                      <Card style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Spin size="large" />
                      </Card>
                    }
                  >
                    <TrendChart data={trendData} />
                  </Suspense>
                </Col>
              )}
            </Row>

            {preferences.showHighlights && (
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Suspense
                    fallback={
                      <Card style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Spin size="large" />
                      </Card>
                    }
                  >
                    <CriticalHighlights data={highlights} />
                  </Suspense>
                </Col>
              </Row>
            )}

            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card
                  title="Vulnerability Table"
                  extra={
                    <Text style={{ color: '#1f1f1f' }}>
                      Click any CVE to open the detailed view, or use the “Vulnerability Detail” page in the header to search directly.
                    </Text>
                  }
                  bodyStyle={{ padding: 0 }}
                >
                  <VulnTable data={filtered} />
                </Card>
              </Col>
            </Row>

            {preferences.showComparison && (
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Suspense
                    fallback={
                      <Card style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Spin size="large" />
                      </Card>
                    }
                  >
                    <VulnComparison data={comparisonData} />
                  </Suspense>
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
