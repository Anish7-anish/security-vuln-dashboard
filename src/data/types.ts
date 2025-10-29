// src/data/types.ts

// All possible kaiStatus values (extendable)
export type KaiStatus = 'invalid - norisk' | 'ai-invalid-norisk' | string;

// Core vulnerability record definition
export interface Vulnerability {
  id: string;

  // Identifiers
  cve?: string;                 // ← added explicitly (used in detail & NVD links)
  package?: string;
  version?: string;

  // Severity metrics
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN' | string;
  severityNormalized?: string;
  severityScore?: number;
  cvss?: number | string;
  cvssScore?: number;

  // Dates
  publishedAt?: string;
  updatedAt?: string;
  published?: string;
  fixDate?: string;

  // Risk metadata
  riskFactors?: string[] | Record<string, unknown>;
  riskFactorList?: string[];
  kaiStatus?: KaiStatus;
  status?: string;
  summary?: string;
  references?: string[];
  link?: string;

  // Context
  groupName?: string;
  repoName?: string;
  imageName?: string;
  packageName?: string;

  // fallback index signature (for unknown properties)
  [k: string]: unknown;
}
