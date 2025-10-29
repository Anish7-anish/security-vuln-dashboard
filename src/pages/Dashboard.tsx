import React, { useCallback, useEffect, useMemo, Suspense, lazy, useState } from 'react';
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
  Alert,
} from 'antd';
import FilterBar from '../components/FilterBar';
import VulnTable from '../components/VulnTable';
import KPIs from '../components/KPIs';
import {
  selectAiManualData,
  selectCriticalHighlights,
  selectError,
  selectFiltered,
  selectFilters,
  selectHasMore,
  selectPagination,
  selectRepoSummary,
  selectRiskFactorData,
  selectSeverityCounts,
  selectSort,
  selectStatus,
  selectTrendData,
} from '../features/vulns/selectors';
import { fetchVulnerabilities, setPage, setSort } from '../features/vulns/slice';
import type { AppDispatch, RootState } from '../app/store';

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

const { Title, Text } = Typography;
const { Content } = Layout;

const pageStyle: React.CSSProperties = {
  minHeight: 'calc(100vh - 64px)',
  padding: '1.5rem clamp(1rem, 2vw, 2rem) 2.5rem',
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
  const dispatch = useDispatch<AppDispatch>();
  const items = useSelector(selectFiltered);
  const riskData = useSelector(selectRiskFactorData);
  const trendData = useSelector(selectTrendData);
  const aiManual = useSelector(selectAiManualData);
  const highlights = useSelector(selectCriticalHighlights);
  const repoSummary = useSelector(selectRepoSummary);
  const severityCounts = useSelector(selectSeverityCounts);
  const pagination = useSelector(selectPagination);
  const sort = useSelector(selectSort);
  const status = useSelector(selectStatus);
  const error = useSelector(selectError);
  const filters = useSelector(selectFilters);
  const page = useSelector((state: RootState) => state.vulns.page);
  const pageSize = useSelector((state: RootState) => state.vulns.pageSize);
  const hasMore = useSelector(selectHasMore);

  // Persist dashboard preferences in localStorage so toggles survive reloads.
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
    // Persist preference toggles immediately for the next visit.
    localStorage.setItem(PREFERENCE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);

  // Refetch vulnerability data when filters or sort order change.
  useEffect(() => {
    dispatch(fetchVulnerabilities());
  }, [dispatch, filtersKey, pageSize, sort.sortBy, sort.sortDirection]);

  const loading = status === 'loading';

  // Flip a single preference flag while keeping the rest intact.
  const togglePreference = (key: keyof DashboardPreferences) => (checked: boolean) => {
    setPreferences((prev) => ({ ...prev, [key]: checked }));
  };

  const severitySummary = severityCounts ?? [];

  const handleLoadMore = useCallback(() => {
    // Skip pagination when a fetch is in flight or when there is no more data.
    if (status === 'loading' || !hasMore) return;
    dispatch(setPage(page + 1));
    dispatch(fetchVulnerabilities({ append: true }));
  }, [dispatch, status, hasMore, page]);

  const hasData = items.length > 0;

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
            <Text strong style={{ color: '#9fb4cc' }}>
              Preferences
            </Text>
            <Space size="small" wrap>
              <Switch size="small" checked={preferences.showRiskChart} onChange={togglePreference('showRiskChart')} checkedChildren="Risk" unCheckedChildren="Risk" />
              <Switch size="small" checked={preferences.showTrendChart} onChange={togglePreference('showTrendChart')} checkedChildren="Trend" unCheckedChildren="Trend" />
              <Switch size="small" checked={preferences.showAiManual} onChange={togglePreference('showAiManual')} checkedChildren="AI" unCheckedChildren="AI" />
              <Switch size="small" checked={preferences.showHighlights} onChange={togglePreference('showHighlights')} checkedChildren="Highlights" unCheckedChildren="Highlights" />
              <Switch size="small" checked={preferences.showComparison} onChange={togglePreference('showComparison')} checkedChildren="Compare" unCheckedChildren="Compare" />
              <Switch size="small" checked={preferences.showKPIs} onChange={togglePreference('showKPIs')} checkedChildren="KPIs" unCheckedChildren="KPIs" />
              <Switch size="small" checked={preferences.showRepoBar} onChange={togglePreference('showRepoBar')} checkedChildren="Repos" unCheckedChildren="Repos" />
            </Space>
          </Space>
        </Space>

        {error && (
          <Alert
            style={{ marginTop: 16 }}
            type="error"
            showIcon
            message="Failed to load vulnerability data"
            description={error}
          />
        )}

        <Divider style={{ borderColor: 'rgba(255,255,255,0.15)', margin: '1rem 0 1.5rem' }} />

        <Card bodyStyle={{ padding: '1.5rem' }} style={{ marginBottom: 24 }}>
          <FilterBar />
        </Card>

        {loading && !hasData ? (
          <Spin size="large" tip="Loading vulnerabilities…" style={{ marginTop: 120, display: 'block' }} />
        ) : (
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            <Row gutter={[16, 16]}>
              {preferences.showKPIs && (
                <Col xs={24} lg={12} xl={12}>
                  <KPIs />
                </Col>
              )}
              <Col xs={24} lg={preferences.showKPIs ? 12 : 24} xl={preferences.showKPIs ? 12 : 24}>
                <Suspense fallback={<Card style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin size="large" /></Card>}>
                  <SeverityChart data={severitySummary} />
                </Suspense>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              {preferences.showAiManual && (
                <Col xs={24} lg={12} xl={12} style={{ display: 'flex' }}>
                  <Suspense fallback={<Card style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin size="large" /></Card>}>
                    <AiManualChart data={aiManual} />
                  </Suspense>
                </Col>
              )}
              {preferences.showRepoBar && (
                <Col xs={24} lg={preferences.showAiManual ? 12 : 24} xl={preferences.showAiManual ? 12 : 24} style={{ display: 'flex' }}>
                  <Suspense fallback={<Card style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin size="large" /></Card>}>
                    <RepoBar data={repoSummary} />
                  </Suspense>
                </Col>
              )}
            </Row>

            <Row gutter={[16, 16]}>
              {preferences.showRiskChart && (
                <Col xs={24} lg={12}>
                  <Suspense fallback={<Card style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin size="large" /></Card>}>
                    <RiskFactorChart data={riskData} />
                  </Suspense>
                </Col>
              )}
              {preferences.showTrendChart && (
                <Col xs={24} lg={12}>
                  <Suspense fallback={<Card style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin size="large" /></Card>}>
                    <TrendChart data={trendData} />
                  </Suspense>
                </Col>
              )}
            </Row>

            {preferences.showHighlights && (
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Suspense fallback={<Card style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin size="large" /></Card>}>
                    <CriticalHighlights data={highlights} />
                  </Suspense>
                </Col>
              </Row>
            )}

            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card title="Vulnerability Table" bodyStyle={{ padding: 0 }}>
                  <VulnTable
                    data={items}
                    total={pagination.total}
                    loading={loading}
                    sortBy={sort.sortBy}
                    sortDirection={sort.sortDirection}
                    hasMore={hasMore}
                    onLoadMore={handleLoadMore}
                  />
                </Card>
              </Col>
            </Row>

            {preferences.showComparison && (
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <Suspense fallback={<Card style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin size="large" /></Card>}>
                    <VulnComparison data={items.slice(0, 200)} />
                  </Suspense>
                </Col>
              </Row>
            )}
          </Space>
        )}
      </Content>
    </Layout>
  );
}
