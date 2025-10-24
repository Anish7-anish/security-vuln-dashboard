// components/RepoBar.tsx
import React from 'react';
import { Card } from 'antd';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Vulnerability } from '../data/types';

export default function RepoBar({ data }: { data: Vulnerability[] }) {
  const byRepo = Object.entries(
    data.reduce((acc: Record<string, number>, v) => {
      const k = v.repoName || 'unknown';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }))
   .sort((a, b) => b.value - a.value)
   .slice(0, 15);

  return (
    <Card
      title="Top Repositories by Vulnerabilities"
      bodyStyle={{ padding: '1.5rem' }}
      style={{ width: '100%' }}
    >
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={byRepo}>
          <XAxis dataKey="name" hide />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#52c41a" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
