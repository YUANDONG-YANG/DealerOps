import { http } from './http';

export type ComplianceRule = {
  ruleId: string;
  enabled: boolean;
  severity: 'BLOCK' | 'REVIEW';
  message: string;
  updatedBy: string;
  updatedAt: string | null;
};

/** Platform-admin editor for the shared ad-compliance rule catalog. */
export const complianceRulesApi = {
  list: () => http.get<ComplianceRule[]>('/api/v1/admin/compliance-rules'),
  update: (ruleId: string, rule: Pick<ComplianceRule, 'enabled' | 'severity' | 'message'>) =>
    http.put<ComplianceRule>(`/api/v1/admin/compliance-rules/${encodeURIComponent(ruleId)}`, rule),
};
