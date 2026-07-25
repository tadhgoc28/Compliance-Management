/**
 * Domain types.
 *
 * These are hand-written for now. Once the migrations are applied you can
 * generate the row-level types from the live schema instead:
 *
 *   npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts
 *
 * and narrow these to view models on top of the generated rows.
 */

export type OrgRole = "owner" | "admin" | "manager" | "surveyor" | "viewer";

export type AssetStatus = "planned" | "active" | "inactive" | "demolished";

export type InspectionStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export type FindingStatus =
  | "open"
  | "assigned"
  | "monitoring"
  | "in_remediation"
  | "remediated"
  | "removed"
  | "closed";

export type FindingSeverity = "critical" | "high" | "medium" | "low" | "info";

export type DocumentKind =
  | "report"
  | "certificate"
  | "drawing"
  | "photo"
  | "permit"
  | "other";

/** Derived in SQL by the asset_compliance_status view, never stored. */
export type ComplianceState =
  | "compliant"
  | "due_soon"
  | "overdue"
  | "unknown"
  | "not_applicable";

/** The open-ended part of a record, validated against a discipline's JSON Schema. */
export type Payload = Record<string, unknown>;

export interface Discipline {
  id: string;
  code: string;
  name: string;
  description: string | null;
  colour: string;
  icon: string | null;
  is_active: boolean;
}

export interface Site {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface AssetType {
  id: string;
  name: string;
  category: string;
}

export interface Asset {
  id: string;
  reference: string;
  name: string;
  description: string | null;
  status: AssetStatus;
  site_id: string | null;
  site_name: string | null;
  asset_type_id: string | null;
  asset_type_name: string | null;
  parent_id: string | null;
  latitude: number | null;
  longitude: number | null;
  attributes: Payload;
  created_at: string;
  updated_at: string;
}

export interface AssetComplianceStatus {
  asset_id: string;
  discipline_id: string;
  discipline_code: string;
  discipline_name: string;
  frequency_months: number | null;
  last_inspection_at: string | null;
  next_due_date: string | null;
  is_required: boolean;
  compliance_state: ComplianceState;
  days_until_due: number | null;
}

export interface Inspection {
  id: string;
  reference: string;
  asset_id: string;
  asset_name?: string | null;
  discipline_id: string;
  discipline_code: string;
  discipline_name: string;
  inspector_name: string | null;
  status: InspectionStatus;
  scheduled_for: string | null;
  completed_at: string | null;
  summary: string | null;
  payload: Payload;
  schema_version: number;
}

export interface Finding {
  id: string;
  reference: string;
  asset_id: string;
  asset_name?: string | null;
  inspection_id: string | null;
  discipline_id: string;
  discipline_code: string;
  discipline_name: string;
  title: string;
  description: string | null;
  severity: FindingSeverity;
  status: FindingStatus;
  location_note: string | null;
  identified_at: string;
  remediated_at: string | null;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  assigned_at?: string | null;
  payload: Payload;
  schema_version: number;
}

export interface DocumentRecord {
  id: string;
  title: string;
  description: string | null;
  kind: DocumentKind;
  asset_id: string | null;
  asset_name?: string | null;
  discipline_id: string | null;
  discipline_code: string | null;
  bucket: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  taken_at: string | null;
  issued_at: string | null;
  expires_at: string | null;
  uploaded_by_name: string | null;
  created_at: string;
  /** Signed URL, resolved at read time. Demo mode substitutes a placeholder. */
  url?: string | null;
}

/** Headline numbers for the dashboard. */
export interface DashboardSummary {
  asset_count: number;
  site_count: number;
  overdue_count: number;
  due_soon_count: number;
  compliant_count: number;
  open_findings: number;
  critical_findings: number;
  compliance_rate: number;
  by_discipline: DisciplineSummary[];
  findings_by_severity: SeverityBreakdown;
  findings_by_status: StatusBreakdown;
}

export interface DisciplineSummary {
  discipline_id: string;
  code: string;
  name: string;
  colour: string;
  total: number;
  compliant: number;
  due_soon: number;
  overdue: number;
  open_findings: number;
}

export interface SeverityBreakdown {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface StatusBreakdown {
  open: number;
  monitoring: number;
  in_remediation: number;
  remediated: number;
  removed: number;
  closed: number;
}
