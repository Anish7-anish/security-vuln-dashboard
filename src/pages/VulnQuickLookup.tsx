import React, { useEffect, useState } from 'react';
import { Layout, Typography, Input, Button, Space, message, AutoComplete, Card } from 'antd';
import { useNavigate } from 'react-router-dom';
import { fetchSuggestions, type Suggestion } from '../data/api';

const { Content } = Layout;
const { Title, Text } = Typography;

type Suggestion = {
  value: string;
  label: React.ReactNode;
  primary: string;
};

export default function VulnQuickLookup() {
  const [value, setValue] = useState('');
  const [options, setOptions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (input: string) => {
    setValue(input);
  };

  // Quick debounce before hitting the suggestion endpoint so we don't spam requests while typing.
  useEffect(() => {
    const term = value.trim();
    if (!term) {
      setOptions([]);
      return;
    }

    const handle = setTimeout(async () => {
      try {
        setLoading(true);
        const results = await fetchSuggestions(term, 15);
        setOptions(results);
      } catch (err) {
        console.error('Failed to fetch suggestions', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(handle);
  }, [value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      message.warning('Enter a CVE ID or vulnerability identifier');
      return;
    }
    navigate(`/vuln/${encodeURIComponent(trimmed)}`);
  };

  return (
    <Layout style={{ minHeight: '100vh', background: 'radial-gradient(circle at top, rgba(23, 61, 89, 0.75), #0a1c2c)' }}>
      <Content
        style={{
          maxWidth: 560,
          margin: '0 auto',
          padding: '6rem 1.5rem',
        }}
      >
        <Card
          style={{
            background: 'rgba(9, 20, 33, 0.78)',
            borderRadius: 20,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 18px 48px rgba(4, 10, 20, 0.45)',
            backdropFilter: 'blur(10px)',
            color: '#f0f4f9',
          }}
          bodyStyle={{ padding: '3rem 3.5rem' }}
        >
          <Title level={3} style={{ marginBottom: '0.5rem', color: '#ffffff' }}>
            Vulnerability Detail Lookup
          </Title>
          <Text style={{ color: 'rgba(240, 244, 249, 0.75)' }}>
            Paste a CVE or the ID shown in the dashboard table and we’ll jump right into the detailed view.
          </Text>
          <Space direction="vertical" size="large" style={{ width: '100%', marginTop: '2.5rem' }}>
            <AutoComplete
              value={value}
              options={options}
              style={{ width: '100%' }}
              onChange={(next) => setValue(next)}
              onSearch={handleSearch}
              onSelect={(next) => {
                setValue(next);
                navigate(`/vuln/${encodeURIComponent(next)}`);
              }}
              notFoundContent={loading ? 'Searching…' : null}
            >
              <Input
                size="large"
                placeholder="Try CVE-2024-12345"
                style={{
                  padding: '0.8rem 1rem',
                  borderRadius: 12,
                }}
                onPressEnter={handleSubmit}
              />
            </AutoComplete>
            <Button
              type="primary"
              size="large"
              onClick={handleSubmit}
              style={{
                borderRadius: 12,
                height: 48,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #2777ff 0%, #00d4ff 100%)',
                border: 'none',
              }}
              block
            >
              View Details
            </Button>
          </Space>
        </Card>
      </Content>
    </Layout>
  );
}
