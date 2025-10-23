import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from 'antd';
import { Vulnerability } from '../data/types';

const COLORS = ['#cf1322', '#fa8c16', '#faad14', '#52c41a'];

export const SeverityChart = ({ data }: { data: Vulnerability[] }) => {
  const summary = Object.entries(
    data.reduce((acc: Record<string, number>, v) => {
      acc[v.severity] = (acc[v.severity] || 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  return (
    <Card title="Severity Distribution" style={{ width: '100%', marginBottom: 16 }}>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie data={summary} dataKey="value" nameKey="name" outerRadius={80}>
            {summary.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
};
