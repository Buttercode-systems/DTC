export type Approval = {
  id: string;
  title: string;
  detail: string | null;
  amount: number | null;
  status: string;
  due_date: string | null;
  decision_note: string | null;
  decided_at: string | null;
  created_at: string;
};

export type AttentionItem = {
  id: string;
  reference: string;
  title: string;
  status: string;
  assigned_name: string | null;
  priority: number;
  next_action: string | null;
  due_date: string | null;
  blocked_reason: string | null;
  last_outcome_code: string | null;
  updated_at: string;
};

export type ServiceReport = {
  id: string;
  period_start: string;
  period_end: string;
  metrics: Record<string, number>;
  summary: string | null;
  status: string;
  client_response: string | null;
  client_response_note: string | null;
  client_responded_at: string | null;
  updated_at: string;
};

export type ServiceDesk = {
  can_manage: boolean;
  business: {
    id: string;
    name: string;
    industry: string | null;
    managed_by_tad: boolean;
    service_status: string;
    primary_contact_name: string | null;
    primary_contact_email: string | null;
  } | null;
  engagement: {
    id: string;
    department: string;
    service_level: string;
    status: string;
    start_date: string | null;
    next_review_date: string | null;
    template_key: string | null;
  } | null;
  summary: {
    pending_approvals: number;
    open_workflow_records: number;
    blocked_workflow_records: number;
    overdue_workflow_records: number;
    actions_due: number;
    reports_ready: number;
  };
  approvals: Approval[];
  workflow: {
    template_name: string;
    department: string;
    statuses: string[];
    closed_statuses: string[];
    data_warning: string | null;
    status_counts: Record<string, number>;
    attention_items: AttentionItem[];
  } | null;
  reports: ServiceReport[];
};

export const EMPTY_SERVICE_DESK: ServiceDesk = {
  can_manage: false,
  business: null,
  engagement: null,
  summary: {
    pending_approvals: 0,
    open_workflow_records: 0,
    blocked_workflow_records: 0,
    overdue_workflow_records: 0,
    actions_due: 0,
    reports_ready: 0,
  },
  approvals: [],
  workflow: null,
  reports: [],
};
