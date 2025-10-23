import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Typography } from 'antd';

const { Title, Paragraph } = Typography;

const VulnDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <div style={{ padding: '2rem' }}>
      <Button type="link" onClick={() => navigate(-1)}>
        ← Back to Dashboard
      </Button>
      <Card style={{ marginTop: '1rem' }}>
        <Title level={3}>Vulnerability Details</Title>
        <Paragraph>
          <strong>ID:</strong> {id}
        </Paragraph>
        <Paragraph>
          This page will show detailed information about a single vulnerability,
          including description, severity, package details, and risk factors.
        </Paragraph>
      </Card>
    </div>
  );
};

export default VulnDetail;
