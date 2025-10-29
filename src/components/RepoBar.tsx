// components/RepoBar.tsx
import React from 'react';
import { Card } from 'antd';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

type RepoDatum = { name: string; value: number };

export default function RepoBar({ data }: { data: RepoDatum[] }) {
  const chartData = data.slice(0, 15);

  return (
    <Card
      title="Top Repositories by Vulnerabilities"
      bodyStyle={{ padding: '1.5rem' }}
      style={{ width: '100%' }}
    >
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData}>
          <XAxis dataKey="name" hide />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#52c41a" />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
