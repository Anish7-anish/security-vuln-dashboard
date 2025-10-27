import React, { useMemo, useState } from 'react';
import { Layout, Typography, Input, Button, Space, message, AutoComplete, Card } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../app/store';

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
  const navigate = useNavigate();
  const all = useSelector((s: RootState) => s.vulns.data);

  const suggestions = useMemo(() => {
    // build a quick list of suggestions so the dropdown feels instant
    const entries: Suggestion[] = [];
    const seen = new Set<string>();
    for (const vuln of all) {
      const cve = vuln.cve ? String(vuln.cve) : null;
      const id = vuln.id ? String(vuln.id) : null;

      if (cve && !seen.has(cve)) {
        seen.add(cve);
        entries.push({
          value: cve,
          primary: cve,
          label: <span>{cve}</span>,
        });
      }

      if (!cve && id && !seen.has(id)) {
        seen.add(id);
        entries.push({
          value: id,
          primary: id,
          label: <span>{id}</span>,
        });
      }

      if (entries.length > 6000) break;
    }
    return entries;
  }, [all]);

  const handleSearch = (input: string) => {
    setValue(input);
    const term = input.trim().toLowerCase();
    if (!term) {
      setOptions([]);
      return;
    }
    const matches: Suggestion[] = [];
    for (const candidate of suggestions) {
      if (candidate.value.toLowerCase().includes(term) || candidate.primary.toLowerCase().includes(term)) {
        matches.push(candidate);
        if (matches.length === 12) break;
      }
    }
    setOptions(matches);
  };

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
