export type KaiStatus = 'invalid - norisk' | 'ai-invalid-norisk' | string;

export interface Vulnerability {
  id: string;
  package: string;
  version?: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN' | string;
  cvssScore?: number;
  publishedAt?: string;
  updatedAt?: string;
  riskFactors?: string[];
  kaiStatus?: KaiStatus;
  summary?: string;
  references?: string[];
  [k: string]: unknown;
  groupName?: string;
  repoName?: string;
  imageName?: string;
}