import { Input, Button, Space, Typography } from 'antd';
import { useDispatch } from 'react-redux';
import { setQuery, toggleKaiFilter } from '../features/vulns/slice';
import { FilterOutlined, ThunderboltOutlined } from '@ant-design/icons';

const { Search } = Input;
const { Text } = Typography;

export default function FilterBar() {
  const dispatch = useDispatch();

  return (
    <div style={{ marginBottom: 16 }}>
      <Space size="middle" wrap>
        <Search
          placeholder="Search CVE ID"
          allowClear
          enterButton
          onSearch={(value) => dispatch(setQuery(value))}
          style={{ width: 250 }}
        />
        <Button
          type="primary"
          icon={<FilterOutlined />}
          onClick={() => dispatch(toggleKaiFilter('invalid - norisk'))}
        >
          Analysis
        </Button>
        <Button
          type="default"
          icon={<ThunderboltOutlined />}
          onClick={() => dispatch(toggleKaiFilter('ai-invalid-norisk'))}
        >
          AI Analysis
        </Button>
        <Text type="secondary">
          Toggle buttons to exclude vulnerabilities by kaiStatus
        </Text>
      </Space>
    </div>
  );
}
