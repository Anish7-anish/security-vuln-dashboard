// src/data/types.ts

// All possible kaiStatus values (extendable)
export type KaiStatus = 'invalid - norisk' | 'ai-invalid-norisk' | string;

// Core vulnerability record definition
export interface Vulnerability {
  id: string;

  // Identifiers
  cve?: string;                 // ← added explicitly (used in detail & NVD links)
  package: string;
  version?: string;

  // Severity metrics
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN' | string;
  cvss?: number | string;       // ← renamed for consistency with your JSON (you used cvss in table)
  cvssScore?: number;           // optional alias (in case your JSON uses "cvssScore")

  // Dates
  publishedAt?: string;
  updatedAt?: string;

  // Risk metadata
  riskFactors?: string[];
  kaiStatus?: KaiStatus;
  summary?: string;
  references?: string[];
  link?: string;

  // Context
  groupName?: string;
  repoName?: string;
  imageName?: string;

  // fallback index signature (for unknown properties)
  [k: string]: unknown;
}
