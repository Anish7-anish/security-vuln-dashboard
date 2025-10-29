import React, { useEffect, useMemo, useState } from 'react';
import {
  AutoComplete,
  Button,
  DatePicker,
  Input,
  InputNumber,
  Select,
  Slider,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectFilters,
  selectItems,
  selectOptions,
  selectSort,
  selectStatus,
  selectIsRefreshing,
} from '../features/vulns/selectors';
import {
  fetchVulnerabilities,
  resetFilters,
  setCvssRange,
  setDateRange,
  setKaiStatuses,
  setQuery,
  setRepoFilter,
  setRiskFactors,
  setGroupFilter,
  setSort,
  toggleKaiFilter,
  toggleSeverity,
} from '../features/vulns/slice';
import { fetchSuggestions, type Suggestion } from '../data/api';
import type { AppDispatch } from '../app/store';
import { exportAsCsv, exportAsJson, saveBlob } from '../utils/exportData';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const ANALYSIS_STATUS = 'invalid - norisk';
const AI_ANALYSIS_STATUS = 'ai-invalid-norisk';

const severityConfigs: Array<{ value: string; label: string; color: string }> = [
  { value: 'CRITICAL', label: 'CRITICAL', color: '#cf1322' },
  { value: 'HIGH', label: 'HIGH', color: '#fa8c16' },
  { value: 'MEDIUM', label: 'MEDIUM', color: '#faad14' },
  { value: 'LOW', label: 'LOW', color: '#52c41a' },
];

const SORT_OPTIONS = [
  { label: 'Severity', value: 'severity' },
  { label: 'CVSS', value: 'cvss' },
  { label: 'Published', value: 'published' },
  { label: 'Repository', value: 'repoName' },
];

const sliderMarks = {
  0: '0',
  2: '2',
  4: '4',
  6: '6',
  8: '8',
  10: '10',
};

export default function FilterBar() {
  const dispatch = useDispatch<AppDispatch>();
  const filters = useSelector(selectFilters);
  const options = useSelector(selectOptions);
  const sort = useSelector(selectSort);
  const status = useSelector(selectStatus);
  const rows = useSelector(selectItems);
  const isRefreshing = useSelector(selectIsRefreshing);

  const [searchValue, setSearchValue] = useState(filters.query ?? '');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [fetchingSuggestions, setFetchingSuggestions] = useState(false);
  const [repoOptions, setRepoOptions] = useState(options.repos);
  const [groupOptions, setGroupOptions] = useState(options.groups);

  const isLoading = status === 'loading' && !isRefreshing;

  const cvssBounds = options.cvssRange ?? { min: 0, max: 10 };
  const effectiveCvss = filters.cvssRange ?? [cvssBounds.min, cvssBounds.max];

  useEffect(() => {
    setSearchValue(filters.query ?? '');
  }, [filters.query]);

  useEffect(() => {
    setRepoOptions(options.repos);
    setGroupOptions(options.groups);
  }, [options.repos, options.groups]);

  // Quick debounce before hitting the suggestion endpoint so we don't spam requests while typing.
  useEffect(() => {
    const term = searchValue.trim();
    if (!term) {
      setSuggestions([]);
      return;
    }

    const handle = setTimeout(async () => {
      try {
        setFetchingSuggestions(true);
        const results = await fetchSuggestions(term, 12);
        setSuggestions(results);
      } catch (err) {
        console.error('Failed to fetch suggestions', err);
      } finally {
        setFetchingSuggestions(false);
      }
    }, 250);

    return () => clearTimeout(handle);
  }, [searchValue]);

  const analysisActive = filters.kaiExclude.includes(ANALYSIS_STATUS);
  const aiActive = filters.kaiExclude.includes(AI_ANALYSIS_STATUS);

  const handleSearchSubmit = (value: string) => {
    dispatch(setQuery(value.trim()));
  };

  const handleKaiToggle = (statusValue: string) => {
    dispatch(toggleKaiFilter(statusValue));
  };

  const handleSeverityToggle = (severity: string) => {
    dispatch(toggleSeverity(severity));
  };

  const handleKaiStatusesChange = (values: string[]) => {
    dispatch(setKaiStatuses(values));
  };

  const handleRiskFactorChange = (values: string[]) => {
    dispatch(setRiskFactors(values));
  };

  const handleRepoChange = (value: string | null) => {
    dispatch(setRepoFilter(value));
  };

  const handleGroupChange = (value: string | null) => {
    dispatch(setGroupFilter(value));
  };

  const handleDateRangeChange = (range: [Dayjs | null, Dayjs | null] | null) => {
    if (!range || !range[0] || !range[1]) {
      dispatch(setDateRange(null));
      return;
    }
    const [start, end] = range as [Dayjs, Dayjs];
    dispatch(
      setDateRange([
        start.startOf('day').valueOf(),
        end.endOf('day').valueOf(),
      ]),
    );
  };

  const handleCvssSlider = (range: [number, number]) => {
    dispatch(setCvssRange(range));
  };

  const handleCvssInput = (value: number | null, index: number) => {
    const current = [...effectiveCvss] as [number, number];
    const safe = value === null ? 0 : value;
    if (index === 0) {
      current[0] = Math.min(safe, current[1]);
    } else {
      current[1] = Math.max(safe, current[0]);
    }
    dispatch(setCvssRange(current));
  };

  const handleSortChange = (value: string) => {
    dispatch(setSort({ sortBy: value as any, sortDirection: sort.sortDirection }));
  };

  const handleDirectionChange = (direction: 'asc' | 'desc') => {
    dispatch(setSort({ sortBy: sort.sortBy, sortDirection: direction }));
  };

  const handleClear = () => {
    dispatch(resetFilters());
  };

  const handleRefresh = () => {
    dispatch(fetchVulnerabilities());
  };

  const handleExport = (type: 'csv' | 'json') => {
    if (!rows.length) {
      return;
    }
    if (type === 'csv') {
      const blob = exportAsCsv(rows);
      saveBlob(blob, 'vulnerabilities.csv');
    } else {
      const blob = exportAsJson(rows);
      saveBlob(blob, 'vulnerabilities.json');
    }
  };

  const activeChips = useMemo(() => {
    // Gather every active filter into a single chip list so users can clear them quickly.
    const chips: Array<{ key: string; label: string; onClose: () => void }> = [];
    filters.kaiExclude.forEach((value) => {
      chips.push({
        key: `exclude-${value}`,
        label: `Exclude ${value}`,
        onClose: () => dispatch(toggleKaiFilter(value)),
      });
    });

    filters.kaiStatuses.forEach((value) => {
      chips.push({
        key: `kai-${value}`,
        label: `Kai: ${value}`,
        onClose: () =>
          dispatch(setKaiStatuses(filters.kaiStatuses.filter((statusValue) => statusValue !== value))),
      });
    });

    filters.severities.forEach((value) => {
      chips.push({
        key: `severity-${value}`,
        label: value,
        onClose: () => dispatch(toggleSeverity(value)),
      });
    });

    filters.riskFactors.forEach((value) => {
      chips.push({
        key: `risk-${value}`,
        label: value,
        onClose: () => dispatch(setRiskFactors(filters.riskFactors.filter((rf) => rf !== value))),
      });
    });

    if (filters.repo) {
      chips.push({
        key: 'repo',
        label: `Repo: ${filters.repo}`,
        onClose: () => dispatch(setRepoFilter(null)),
      });
    }

    if (filters.group) {
      chips.push({
        key: 'group',
        label: `Group: ${filters.group}`,
        onClose: () => dispatch(setGroupFilter(null)),
      });
    }

    if (filters.dateRange) {
      chips.push({
        key: 'dateRange',
        label: 'Published range',
        onClose: () => dispatch(setDateRange(null)),
      });
    }

    if (filters.cvssRange) {
      chips.push({
        key: 'cvss',
        label: `CVSS ${filters.cvssRange[0]}–${filters.cvssRange[1]}`,
        onClose: () => dispatch(setCvssRange(null)),
      });
    }

    if (filters.query) {
      chips.push({
        key: 'query',
        label: `q: “${filters.query}”`,
        onClose: () => dispatch(setQuery('')),
      });
    }

    return chips;
  }, [dispatch, filters]);

  const datePickerValue: [Dayjs, Dayjs] | null = filters.dateRange
    ? [dayjs(filters.dateRange[0]), dayjs(filters.dateRange[1])]
    : null;

  type CvssRange = [number, number];
  const DEFAULT_CVSS_RANGE: CvssRange = [0, 10];

  // Clamp CVSS values to the expected 0–10 range.
  const clampCvss = (value: number): number => {
    const clamped = Math.min(10, Math.max(0, value));
    return Math.round(clamped * 10) / 10;
  };

  // Normalise CVSS range so minimum stays below maximum and both stay in bounds.
  const normaliseCvssRange = (range: CvssRange): CvssRange => {
    let [min, max] = range;
    min = clampCvss(min);
    max = clampCvss(max);
    if (min > max) [min, max] = [max, min];
    return [min, max];
  };

  const isDefaultCvssRange = (range: CvssRange) =>
    range[0] === DEFAULT_CVSS_RANGE[0] && range[1] === DEFAULT_CVSS_RANGE[1];

  const currentCvss: CvssRange = filters.cvssRange ?? DEFAULT_CVSS_RANGE;

  // Apply slider adjustments through the normalised CVSS range helper.
  const handleCvssChange = (value: number | number[]) => {
    if (!Array.isArray(value)) return;
    const next = normaliseCvssRange(value as CvssRange);
    dispatch(setCvssRange(next));
  };

  // Drop the CVSS filter when the slider returns to default bounds.
  const handleCvssAfterChange = (value: number | number[]) => {
    if (!Array.isArray(value)) return;
    const next = normaliseCvssRange(value as CvssRange);
    if (isDefaultCvssRange(next)) {
      dispatch(setCvssRange(null));
    }
  };

  // Keep number inputs in sync with the slider while enforcing ordering and bounds.
  const handleCvssInputChange = (index: 0 | 1) => (val: number | null) => {
    if (typeof val !== 'number' || Number.isNaN(val)) return;
    const clamped = clampCvss(val);
    let next: CvssRange = [...currentCvss] as CvssRange;
    next[index] = clamped;

    if (index === 0 && next[0] > next[1]) next[1] = clamped;
    else if (index === 1 && next[1] < next[0]) next[0] = clamped;

    next = normaliseCvssRange(next);
    dispatch(isDefaultCvssRange(next) ? setCvssRange(null) : setCvssRange(next));
  };

  return (
    <Space
      direction="vertical"
      size={16}
      style={{
        width: '100%',
        background: '#ffffff',
        borderRadius: 16,
        border: '1px solid rgba(0, 0, 0, 0.06)',
        padding: '18px 24px',
        boxShadow: '0 8px 28px rgba(5, 10, 25, 0.08)',
      }}
    >
      <Space
        wrap
        align="center"
        style={{ width: '100%', gap: 12 }}
      >
        <AutoComplete
          style={{
            flex: '1',
            minWidth: 320,
            maxWidth: 520,
          }}
          value={searchValue}
          options={suggestions.map((item) => ({
            value: item.value,
            label: (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <strong>{item.value}</strong>
                {item.meta?.packageName && (
                  <span style={{ fontSize: 12, color: '#667085' }}>
                    Package • {item.meta.packageName}
                  </span>
                )}
                {item.meta?.repoName && (
                  <span style={{ fontSize: 12, color: '#667085' }}>
                    Repo • {item.meta.repoName}
                  </span>
                )}
              </div>
            ),
          }))}
          onChange={setSearchValue}
          onSearch={setSearchValue}
          onSelect={(value) => {
            setSearchValue(value);
            handleSearchSubmit(value);
          }}
          notFoundContent={fetchingSuggestions ? 'Searching…' : null}
        >
          <Input.Search
            allowClear
            placeholder="Search CVE, package, repo, risk factor..."
            enterButton="Search"
            onSearch={handleSearchSubmit}
            disabled={isLoading}
          />
        </AutoComplete>

        <Tooltip title="Exclude Analysis (no risk)">
          <Button
            type={analysisActive ? 'primary' : 'default'}
            onClick={() => handleKaiToggle(ANALYSIS_STATUS)}
            disabled={isLoading}
          >
            Analysis
          </Button>
        </Tooltip>
        <Tooltip title="Exclude AI Analysis (no risk)">
          <Button
            type={aiActive ? 'primary' : 'default'}
            onClick={() => handleKaiToggle(AI_ANALYSIS_STATUS)}
            disabled={isLoading}
          >
            AI Analysis
          </Button>
        </Tooltip>

        <Space wrap size="small">
          {severityConfigs.map((severity) => {
            const active = filters.severities.includes(severity.value);
            return (
              <Button
                key={severity.value}
                type={active ? 'primary' : 'default'}
                onClick={() => handleSeverityToggle(severity.value)}
                style={{
                  borderColor: severity.color,
                  color: active ? '#fff' : severity.color,
                  background: active ? severity.color : 'transparent',
                }}
                disabled={isLoading}
              >
                {severity.label}
              </Button>
            );
          })}
        </Space>
      </Space>

      <Space
        wrap
        align="center"
        size={[12, 12]}
        style={{ width: '100%' }}
      >
        <Select
          mode="multiple"
          allowClear
          placeholder="Risk factors"
          value={filters.riskFactors}
          options={options.riskFactors.map((value) => ({ label: value, value }))}
          onChange={handleRiskFactorChange}
          style={{ minWidth: 220 }}
          disabled={isLoading}
        />
        <Select
          mode="multiple"
          allowClear
          placeholder="Kai status"
          value={filters.kaiStatuses}
          options={options.kaiStatuses.map((value) => ({ label: value, value }))}
          onChange={handleKaiStatusesChange}
          style={{ minWidth: 200 }}
          disabled={isLoading}
        />
        <Select
          showSearch
          placeholder="Group"
          allowClear
          value={filters.group ?? undefined}
          options={groupOptions.map((value) => ({ label: value, value }))}
          onSearch={(input) => {
            const term = input.trim().toLowerCase();
            if (!term) {
              setGroupOptions(options.groups);
              return;
            }
            setGroupOptions(
              options.groups.filter((value) =>
                value.toLowerCase().includes(term),
              ),
            );
          }}
          filterOption={false}
          onChange={(value) => handleGroupChange(value ?? null)}
          style={{ minWidth: 180 }}
          disabled={isLoading}
        />
        <Select
          showSearch
          placeholder="Repository"
          allowClear
          value={filters.repo ?? undefined}
          options={repoOptions.map((value) => ({ label: value, value }))}
          onSearch={(input) => {
            const term = input.trim().toLowerCase();
            if (!term) {
              setRepoOptions(options.repos);
              return;
            }
            setRepoOptions(
              options.repos.filter((value) =>
                value.toLowerCase().includes(term),
              ),
            );
          }}
          filterOption={false}
          onChange={(value) => handleRepoChange(value ?? null)}
          style={{ minWidth: 200 }}
          disabled={isLoading}
        />
        <RangePicker
          value={datePickerValue}
          onChange={handleDateRangeChange}
          allowClear
          disabled={isLoading}
          placeholder={[ 'Published from', 'Published to' ]}
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

        <Space size="small" align="center">
          <Text type="secondary">Sort</Text>
          <Select
            value={sort.sortBy}
            options={SORT_OPTIONS}
            onChange={handleSortChange}
            style={{ width: 140 }}
            disabled={isLoading}
          />
          <Button
            type={sort.sortDirection === 'asc' ? 'primary' : 'default'}
            onClick={() => handleDirectionChange('asc')}
            disabled={isLoading}
          >
            Asc
          </Button>
          <Button
            type={sort.sortDirection === 'desc' ? 'primary' : 'default'}
            onClick={() => handleDirectionChange('desc')}
            disabled={isLoading}
          >
            Desc
          </Button>
        </Space>

        <Button onClick={handleClear} icon={null} danger>
          Clear All
        </Button>
        <Button onClick={() => handleExport('csv')} disabled={!rows.length}>
          Export CSV
        </Button>
        <Button onClick={() => handleExport('json')} disabled={!rows.length}>
          Export JSON
        </Button>
        <Button onClick={handleRefresh} disabled={isLoading}>
          Refresh
        </Button>
      </Space>

      {activeChips.length > 0 && (
        <Space
          wrap
          size={[8, 8]}
          style={{ marginTop: -4 }}
        >
          {activeChips.map((chip) => (
            <Tag
              key={chip.key}
              closable
              onClose={(e) => {
                e.preventDefault();
                chip.onClose();
              }}
            >
              {chip.label}
            </Tag>
          ))}
        </Space>
      )}
    </Space>
  );
}
