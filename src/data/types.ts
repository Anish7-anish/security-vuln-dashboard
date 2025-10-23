export type KaiStatus = 'invalid - norisk' | 'ai-invalid-norisk' | string;

export interface Vulnerability {
  id: string;
  cve?: string;
  package: string;
  packageName?: string;
  packageVersion?: string;
  version?: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN' | string;
  cvss?: number;
  cvssScore?: number;
  published?: string;
  publishedAt?: string;
  updatedAt?: string;
  fixDate?: string;
  description?: string;
  riskFactors?: string[] | Record<string, unknown>;
  kaiStatus?: KaiStatus;
  summary?: string;
  references?: string[];
  groupName?: string;
  repoName?: string;
  imageName?: string;
  [k: string]: unknown;
}
