import React from 'react';
import {
  AutoComplete,
  Input,
  Button,
  Space,
  Typography,
  Tag,
  Divider,
  Tooltip,
  Select,
  DatePicker,
  Slider,
  InputNumber,
  Segmented,
} from 'antd';
import type { RangeValue } from 'rc-picker/lib/interface';
import dayjs, { Dayjs } from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../app/store';
import {
  setQuery,
  toggleKaiFilter,
  clearAllFilters,
  toggleSeverity,
  setRiskFactors,
  setKaiStatuses,
  setDateRange,
  setCvssRange,
  setSortBy,
  setSortDirection,
} from '../features/vulns/slice';
import {
  FilterOutlined,
  ThunderboltOutlined,
  ClearOutlined,
} from '@ant-design/icons';
import './FilterBar.css';

const { Search } = Input;
const { Text } = Typography;
const { RangePicker } = DatePicker;

type DateRange = [number, number];
type CvssRange = [number, number];

const DEFAULT_CVSS_RANGE: CvssRange = [0, 10];
const SEARCH_WIDTH = 420;
const SORT_OPTIONS = [
  { label: 'Severity', value: 'severity' },
  { label: 'CVSS', value: 'cvss' },
  { label: 'Published', value: 'published' },
  { label: 'Repository', value: 'repo' },
  { label: 'Package', value: 'package' },
] as const;
type SortOptionValue = (typeof SORT_OPTIONS)[number]['value'];

const clampCvss = (value: number): number => {
  const clamped = Math.min(10, Math.max(0, value));
  return Math.round(clamped * 10) / 10;
};

const normaliseCvssRange = (range: CvssRange): CvssRange => {
  let [min, max] = range;
  min = clampCvss(min);
  max = clampCvss(max);
  if (min > max) {
    return [max, min];
  }
  return [min, max];
};

const isDefaultCvssRange = (range: CvssRange) =>
  range[0] === DEFAULT_CVSS_RANGE[0] && range[1] === DEFAULT_CVSS_RANGE[1];

export default function FilterBar() {
  const dispatch = useDispatch();
  const {
    q,
    kaiExclude,
    kaiStatuses,
    severities,
    filtered,
    data,
    riskFactors,
    dateRange,
  cvssRange,
    sortBy,
    sortDirection,
  } = useSelector((s: RootState) => s.vulns);

  const [searchValue, setSearchValue] = React.useState(q ?? '');
  const [options, setOptions] = React.useState<{ value: string }[]>([]);

  React.useEffect(() => {
    setSearchValue(q ?? '');
  }, [q]);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);

    const term = value.trim().toLowerCase();
    if (!term) {
      setOptions([]);
      return;
    }

    const seen = new Set<string>();
    const matches: string[] = [];

    for (const vuln of data) {
      const candidates = [
        vuln.cve,
        (vuln as any).package ?? (vuln as any).packageName,
        vuln.repoName,
        vuln.imageName,
        vuln.groupName,
        vuln.summary,
        ...(Array.isArray(vuln.riskFactors)
          ? vuln.riskFactors
          : Object.keys(
              (vuln.riskFactors as Record<string, unknown>) ?? {},
            )),
      ];

      for (const raw of candidates) {
        if (!raw) continue;
        const text = String(raw).trim();
        if (!text) continue;
        if (!text.toLowerCase().includes(term)) continue;
        if (seen.has(text)) continue;

        seen.add(text);
        matches.push(text);
        if (matches.length === 10) break;
      }

      if (matches.length === 10) break;
    }

    setOptions(matches.map((value) => ({ value })));
  };

  const handleSearchSubmit = (value: string) => {
    dispatch(setQuery(value));
  };

  const analysisActive = kaiExclude.has('invalid - norisk');
  const aiActive = kaiExclude.has('ai-invalid-norisk');

  const activeChips = [
    ...Array.from(kaiExclude).map((k) => ({ type: 'kai', label: k, value: k })),
    ...Array.from(kaiStatuses).map((status) => ({
      type: 'kaiStatus',
      label: status || 'kai: (none)',
      value: status,
    })),
    ...Array.from(severities).map((s) => ({ type: 'sev', label: s, value: s })),
    ...Array.from(riskFactors).map((rf) => ({ type: 'rf', label: rf, value: rf })),
    ...(dateRange ? [{ type: 'date', label: 'Date range' }] : []),
    ...(cvssRange ? [{ type: 'cvss', label: `CVSS ${cvssRange[0]}-${cvssRange[1]}` }] : []),
    ...(q ? [{ type: 'q', label: `q:“${q}”` }] : []),
  ];

  const allRiskFactors = React.useMemo(() => {
    const collected = new Set<string>();
    data.forEach((v) => {
      const list = Array.isArray(v.riskFactors)
        ? v.riskFactors
        : Object.keys((v.riskFactors as Record<string, unknown>) ?? {});
      list.forEach((item) => collected.add(item));
    });
    return Array.from(collected).sort();
  }, [data]);

  const allKaiStatuses = React.useMemo(() => {
    const collected = new Set<string>();
    data.forEach((v) => {
      const raw = (v.kaiStatus ?? '').toString();
      if (raw) {
        collected.add(raw);
      }
    });
    return Array.from(collected).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const handleDateRangeChange = (value: RangeValue<Dayjs>) => {
    if (!value || value.length !== 2 || !value[0] || !value[1]) {
      dispatch(setDateRange(null));
      return;
    }
    const [start, end] = value;
    const range: DateRange = [start.startOf('day').valueOf(), end.endOf('day').valueOf()];
    dispatch(setDateRange(range));
  };

  const currentRange: RangeValue<Dayjs> = dateRange
    ? [dayjs(dateRange[0]), dayjs(dateRange[1])]
    : null;

  const currentCvss: CvssRange = cvssRange ?? DEFAULT_CVSS_RANGE;


  const handleCvssChange = (value: number | number[]) => {
    if (!Array.isArray(value)) return;
    const next = normaliseCvssRange(value as CvssRange);
    dispatch(setCvssRange(next));
  };

  const handleCvssAfterChange = (value: number | number[]) => {
    if (!Array.isArray(value)) return;
    const next = normaliseCvssRange(value as CvssRange);
    if (isDefaultCvssRange(next)) {
      dispatch(setCvssRange(null));
    }
  };

  const handleCvssInputChange = (index: 0 | 1) => (val: number | null) => {
    if (typeof val !== 'number' || Number.isNaN(val)) return;
    const clamped = clampCvss(val);
    let next: CvssRange = [...currentCvss] as CvssRange;
    next[index] = clamped;

    if (index === 0 && next[0] > next[1]) {
      next[1] = clamped;
    } else if (index === 1 && next[1] < next[0]) {
      next[0] = clamped;
    }

    next = normaliseCvssRange(next);

    if (isDefaultCvssRange(next)) {
      dispatch(setCvssRange(null));
    } else {
      dispatch(setCvssRange(next));
    }
  };

  const handleSortByChange = (value: string) => {
    dispatch(setSortBy(value as SortOptionValue));
  };

  const handleSortDirectionChange = (value: string | number) => {
    dispatch(setSortDirection(value as 'asc' | 'desc'));
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap size="middle" align="center">
          <AutoComplete
            value={searchValue}
            options={options}
            style={{ width: SEARCH_WIDTH }}
            onSearch={handleSearchChange}
            onSelect={(value) => {
              setSearchValue(value);
              dispatch(setQuery(value));
            }}
            onChange={handleSearchChange}
            placeholder="Search CVE, package, repo, risk factor..."
            filterOption={false}
            notFoundContent={
              searchValue.trim()
                ? `No matches for “${searchValue.trim()}”`
                : null
            }
          >
            <Search
              allowClear
              enterButton="Search"
              style={{ width: '100%' }}
              onSearch={handleSearchSubmit}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </AutoComplete>

          <Tooltip title='Exclude kaiStatus: "invalid - norisk"'>
            <Button
              type={analysisActive ? 'primary' : 'default'}
              icon={<FilterOutlined />}
              onClick={() => dispatch(toggleKaiFilter('invalid - norisk'))}
            >
              Analysis
            </Button>
          </Tooltip>

          <Tooltip title='Exclude kaiStatus: "ai-invalid-norisk"'>
            <Button
              type={aiActive ? 'primary' : 'default'}
              icon={<ThunderboltOutlined />}
              onClick={() => dispatch(toggleKaiFilter('ai-invalid-norisk'))}
            >
              AI Analysis
            </Button>
          </Tooltip>

          <Space size="small">
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
              <Button
                key={sev}
                onClick={() => dispatch(toggleSeverity(sev))}
                className={`severity-btn ${sev.toLowerCase()} ${
                  severities.has(sev) ? 'active' : ''
                }`}
              >
                {sev}
              </Button>
            ))}
          </Space>
        </Space>

        <Space wrap size="middle" align="center">
          <Select
            mode="multiple"
            allowClear
            placeholder="Risk factors"
            style={{ minWidth: 220, maxWidth: 320 }}
            value={Array.from(riskFactors)}
            options={allRiskFactors.map((rf) => ({ label: rf, value: rf }))}
            onChange={(values) => dispatch(setRiskFactors(values))}
          />

          <Select
            allowClear
            mode="multiple"
            placeholder="Kai status"
            style={{ minWidth: 180, maxWidth: 260 }}
            value={Array.from(kaiStatuses)}
            options={allKaiStatuses.map((status) => ({
              label: status,
              value: status,
            }))}
            onChange={(values) => dispatch(setKaiStatuses(values))}
            notFoundContent="No kai statuses"
          />

          <RangePicker
            value={currentRange}
            onChange={handleDateRangeChange}
            style={{ minWidth: 260 }}
            allowEmpty={[true, true]}
            placeholder={['Published from', 'Published to']}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minWidth: 320,
              maxWidth: 380,
            }}
          >
            <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
              CVSS range
            </Text>
            <InputNumber
              min={0}
              max={10}
              step={0.1}
              precision={1}
              value={currentCvss[0]}
              style={{ width: 72 }}
              onChange={handleCvssInputChange(0)}
            />
            <Slider
              range
              min={0}
              max={10}
              step={0.1}
              value={currentCvss}
              style={{ flex: 1, minWidth: 160 }}
              tooltip={{ formatter: (value) => value?.toFixed(1) }}
              onChange={handleCvssChange}
              onAfterChange={handleCvssAfterChange}
            />
            <InputNumber
              min={0}
              max={10}
              step={0.1}
              precision={1}
              value={currentCvss[1]}
              style={{ width: 72 }}
              onChange={handleCvssInputChange(1)}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minWidth: 260,
              flexWrap: 'wrap',
            }}
          >
            <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
              Sort
            </Text>
            <Select
              value={sortBy}
              options={SORT_OPTIONS.map((opt) => ({
                label: opt.label,
                value: opt.value,
              }))}
              onChange={handleSortByChange}
              style={{ width: 140 }}
            />
            <Segmented
              value={sortDirection}
              onChange={handleSortDirectionChange}
              options={[
                { label: 'Asc', value: 'asc' },
                { label: 'Desc', value: 'desc' },
              ]}
              size="middle"
            />
          </div>

          <Button
            danger
            icon={<ClearOutlined />}
            onClick={() => dispatch(clearAllFilters())}
          >
            Clear All
          </Button>

          {q && (
            <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>
              Showing <b>{filtered.length}</b> results for <b>{q}</b>
            </Text>
          )}
        </Space>
      </Space>

      {activeChips.length > 0 && (
        <>
          <Divider style={{ margin: '12px 0' }} />
          <Space size="small" wrap>
            <Text type="secondary">Active Filters:</Text>
            {activeChips.map((c, i) => (
              <Tag
                key={i}
                color={
                  c.type === 'kai'
                    ? 'geekblue'
                    : c.type === 'kaiStatus'
                    ? 'cyan'
                    : c.type === 'sev'
                    ? 'volcano'
                    : c.type === 'rf'
                    ? 'purple'
                    : c.type === 'cvss'
                    ? 'magenta'
                    : 'green'
                }
                closable
                onClose={(e) => {
                  e.preventDefault();
                  const value = 'value' in c ? (c as any).value : c.label;
                  if (c.type === 'kai') dispatch(toggleKaiFilter(value));
                  else if (c.type === 'kaiStatus') {
                    const next = new Set(kaiStatuses);
                    next.delete(value);
                    dispatch(setKaiStatuses(Array.from(next)));
                  } else if (c.type === 'sev') dispatch(toggleSeverity(value));
                  else if (c.type === 'rf') {
                    const next = new Set(riskFactors);
                    next.delete(value);
                    dispatch(setRiskFactors(Array.from(next)));
                  } else if (c.type === 'date') {
                    dispatch(setDateRange(null));
                  } else if (c.type === 'cvss') {
                    dispatch(setCvssRange(null));
                  } else {
                    dispatch(setQuery(''));
                  }
                }}
              >
                {c.label}
              </Tag>
            ))}
          </Space>
        </>
      )}
    </div>
  );
}
