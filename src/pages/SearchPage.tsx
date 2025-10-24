// pages/SearchPage.tsx
import React from 'react';
import { Layout, Typography, Card } from 'antd';
import { useSelector } from 'react-redux';
import { RootState } from '../app/store';
import { selectFiltered } from '../features/vulns/selectors';
import FilterBar from '../components/FilterBar';
import VulnTable from '../components/VulnTable';

const { Title } = Typography;

export default function SearchPage() {
  const filtered = useSelector((s: RootState) => selectFiltered(s));
  return (
    <Layout style={{ padding: '2rem', background: '#fff' }}>
      <Title level={2}>🔎 Advanced Search</Title>
      <FilterBar />
      <Card>
        <VulnTable data={filtered} />
      </Card>
    </Layout>
  );
}
