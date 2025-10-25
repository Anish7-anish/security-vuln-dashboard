import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Typography, Tag, Descriptions, Spin } from 'antd';
import { useSelector } from 'react-redux';
import type { RootState } from '../app/store';
import type { Vulnerability } from '../data/types';
import { getAllVulnerabilities } from '../data/loader';

const { Title, Paragraph } = Typography;

const VulnDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const all = useSelector((s: RootState) => s.vulns.data);

  const [vuln, setVuln] = useState<Vulnerability | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const target = decodeURIComponent(id ?? '').trim();
      const targetLower = target.toLowerCase();
      let found =
        all.find((v) => (v.id || '').toLowerCase() === targetLower) ||
        all.find((v) => (v.cve || '').toLowerCase() === targetLower);
      if (!found) {
        // fallback: read directly from IndexedDB
        const stored = await getAllVulnerabilities();
        found =
          stored.find((v) => (v.id || '').toLowerCase() === targetLower) ||
          stored.find((v) => (v.cve || '').toLowerCase() === targetLower);
      }
      setVuln(found ?? null);
      setLoading(false);
    };
    load();
  }, [id, all]);

  if (loading) return <Spin size="large" style={{ marginTop: 100, display: 'block' }} />;

  if (!vuln)
    return (
      <div style={{ padding: '2rem' }}>
        <Button type="link" onClick={() => navigate(-1)}>
          ← Back to Dashboard
        </Button>
        <Title level={3} style={{ marginTop: '1rem' }}>
          CVE not found
        </Title>
        <Paragraph>This vulnerability could not be located in the dataset.</Paragraph>
      </div>
    );

  const sev = (vuln.severity || '').toUpperCase();
  const sevColor =
    sev === 'CRITICAL' ? 'magenta' :
    sev === 'HIGH' ? 'red' :
    sev === 'MEDIUM' ? 'orange' :
    sev === 'LOW' ? 'green' : 'blue';

  const riskFactorList = (() => {
    if (!vuln.riskFactors) return [];
    if (Array.isArray(vuln.riskFactors)) return vuln.riskFactors;
    return Object.keys(vuln.riskFactors as Record<string, unknown>);
  })();

  const nvdLink =
    (typeof vuln.link === 'string' && vuln.link.trim())
      ? vuln.link
      : (vuln.cve ? `https://nvd.nist.gov/vuln/detail/${String(vuln.cve)}` : undefined);

  return (
    <div style={{ padding: '2rem' }}>
      <Button type="link" onClick={() => navigate(-1)}>
        ← Back to Dashboard
      </Button>

      <Card style={{ marginTop: '1rem' }}>
        <Title level={3}>{vuln.cve || vuln.id}</Title>
        <Tag color={sevColor}>{sev || 'N/A'}</Tag>
        {vuln.kaiStatus && (
          <Tag color={vuln.kaiStatus.includes('ai') ? 'purple' : 'geekblue'}>
            {vuln.kaiStatus}
          </Tag>
        )}

        <Descriptions bordered column={1} size="middle" style={{ marginTop: '1rem' }}>
          <Descriptions.Item label="CVE ID">{vuln.cve || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Severity">
            <Tag color={sevColor}>{sev || 'N/A'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="CVSS Score">{vuln.cvss || '—'}</Descriptions.Item>
          <Descriptions.Item label="Package">{vuln.package || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Repository">{vuln.repoName || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Image">{vuln.imageName || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Group">{vuln.groupName || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Kai Status">
            {vuln.kaiStatus || 'N/A'}
          </Descriptions.Item>
          <Descriptions.Item label="Published">
            {vuln.publishedAt ? new Date(vuln.publishedAt).toLocaleString() : 'N/A'}
          </Descriptions.Item>
          <Descriptions.Item label="Risk Factors">
            {riskFactorList.length > 0
              ? riskFactorList.map((r) => (
                  <Tag key={r} color="volcano">{r}</Tag>
                ))
              : 'None'}
          </Descriptions.Item>
          <Descriptions.Item label="Summary">
            {vuln.summary || '—'}
          </Descriptions.Item>
        </Descriptions>

        <Paragraph style={{ marginTop: '1rem', color: '#555' }}>
          {vuln.summary
            ? vuln.summary
            : 'Detailed information about this vulnerability will appear here, including potential impact, CVSS vector, and mitigation notes.'}
        </Paragraph>

        {nvdLink && (
          <Button
            type="primary"
            href={nvdLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginTop: '1rem' }}
          >
            View on NVD
          </Button>
        )}
      </Card>
    </div>
  );
};

export default VulnDetail;
