import React from 'react';
import { AutoComplete, Input, Button, Space, Typography } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { setQuery, toggleKaiFilter } from '../features/vulns/slice';
import { FilterOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { RootState } from '../app/store';

const { Search } = Input;
const { Text } = Typography;

export default function FilterBar() {
  const dispatch = useDispatch();
  const query = useSelector((s: RootState) => s.vulns.query);
  const suggestions = useSelector((s: RootState) => s.vulns.suggestions);
  const kaiExclude = useSelector((s: RootState) => s.vulns.kaiExclude);

  const options = React.useMemo(
    () => suggestions.map((value) => ({ value, label: value })),
    [suggestions],
  );

  const handleQueryChange = (value: string) => {
    dispatch(setQuery(value));
  };

  const analysisActive = kaiExclude.includes('invalid - norisk');
  const aiActive = kaiExclude.includes('ai-invalid-norisk');

  return (
    <div style={{ marginBottom: 16 }}>
      <Space size="middle" wrap>
        <AutoComplete
          value={query}
          options={options}
          style={{ width: 320 }}
          onChange={handleQueryChange}
          onSearch={handleQueryChange}
          onSelect={handleQueryChange}
          filterOption={false}
        >
          <Search
            placeholder="Search CVE, package, repo, image…"
            allowClear
            enterButton
            onSearch={handleQueryChange}
            onChange={(e) => handleQueryChange(e.target.value)}
          />
        </AutoComplete>
        <Button
          type={analysisActive ? 'primary' : 'default'}
          icon={<FilterOutlined />}
          onClick={() => dispatch(toggleKaiFilter('invalid - norisk'))}
          aria-pressed={analysisActive}
        >
          Analysis
        </Button>
        <Button
          type={aiActive ? 'primary' : 'default'}
          icon={<ThunderboltOutlined />}
          onClick={() => dispatch(toggleKaiFilter('ai-invalid-norisk'))}
          aria-pressed={aiActive}
        >
          AI Analysis
        </Button>
        <Text type="secondary">
          Start typing to see live suggestions and combine filters instantly.
        </Text>
      </Space>
    </div>
  );
}
