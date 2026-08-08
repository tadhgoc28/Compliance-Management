/**
 * Data access.
 *
 * Every screen reads through these functions. Each one has two paths: the real
 * Supabase query, and the demo dataset used when no backend is configured.
 * Keeping the fork here — rather than in components — means the UI never knows
 * which mode it's in, and removing demo mode later is a matter of deleting the
 * `if (!isSupabaseConfigured)` branches and ./demo.ts.
 */

import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  demoAssets,
  demoCertificationTypes,
  demoCertifications,
  demoCompliance,
  demoDisciplineRequirements,
  demoDisciplines,
  demoDocuments,
  demoFindings,
  demoInspections,
  demoQrCodes,
  demoSiteVisits,
  demoSites,
  demoTeamMembers,
  demoWorkOrders,
} from "./demo";
import type {
  Asset,
  AssetComplianceStatus,
  Certification,
  CertificationType,
  DashboardSummary,
  Discipline,
  DisciplineCertificationRequirement,
  DisciplineSummary,
  DocumentRecord,
  Finding,
  Inspection,
  QrCode,
  Site,
  SiteVisit,
  TeamMember,
  WorkOrder,
} from "@/lib/types";

export interface AssetFilters {
  query?: string;
  siteId?: string;
  status?: string;
  disciplineCode?: string;
  complianceState?: string;
  page?: number;
  pageSize?: number;
}

export interface Paged<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

const DEFAULT_PAGE_SIZE = 25;

/* -------------------------------------------------------------------------- */
/* Disciplines and sites                                                       */
/* -------------------------------------------------------------------------- */

export async function listDisciplines(): Promise<Discipline[]> {
  if (!isSupabaseConfigured) return demoDisciplines;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("disciplines")
    .select("id, code, name, description, colour, icon, is_active")
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(`listDisciplines: ${error.message}`);
  return data ?? [];
}

export async function listSites(): Promise<Site[]> {
  if (!isSupabaseConfigured) return demoSites;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sites_api")
    .select("id, name, code, address, region, latitude, longitude")
    .order("name");

  if (error) throw new Error(`listSites: ${error.message}`);
  return data ?? [];
}

/* -------------------------------------------------------------------------- */
/* Assets                                                                      */
/* -------------------------------------------------------------------------- */

function applyDemoAssetFilters(filters: AssetFilters): Asset[] {
  let rows = [...demoAssets];

  if (filters.query) {
    const q = filters.query.toLowerCase();
    rows = rows.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.reference.toLowerCase().includes(q) ||
        (a.description ?? "").toLowerCase().includes(q) ||
        (a.site_name ?? "").toLowerCase().includes(q),
    );
  }
  if (filters.siteId) rows = rows.filter((a) => a.site_id === filters.siteId);
  if (filters.status) rows = rows.filter((a) => a.status === filters.status);

  if (filters.disciplineCode) {
    const ids = new Set(
      demoCompliance
        .filter((c) => c.discipline_code === filters.disciplineCode)
        .map((c) => c.asset_id),
    );
    rows = rows.filter((a) => ids.has(a.id));
  }
  if (filters.complianceState) {
    const ids = new Set(
      demoCompliance
        .filter((c) => c.compliance_state === filters.complianceState)
        .map((c) => c.asset_id),
    );
    rows = rows.filter((a) => ids.has(a.id));
  }

  return rows.sort((a, b) => a.reference.localeCompare(b.reference));
}

export async function listAssets(filters: AssetFilters = {}): Promise<Paged<Asset>> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;
  const from = (page - 1) * pageSize;

  if (!isSupabaseConfigured) {
    const all = applyDemoAssetFilters(filters);
    return {
      rows: all.slice(from, from + pageSize),
      total: all.length,
      page,
      pageSize,
    };
  }

  const supabase = await createClient();
  let q = supabase
    .from("assets_api")
    .select(
      "id, reference, name, description, status, site_id, site_name, asset_type_id, asset_type_name, parent_id, latitude, longitude, attributes, created_at, updated_at",
      { count: "exact" },
    );

  if (filters.query) {
    // Escape PostgREST's or() delimiters before interpolating user input.
    const safe = filters.query.replace(/[,()]/g, " ");
    q = q.or(`name.ilike.%${safe}%,reference.ilike.%${safe}%,description.ilike.%${safe}%`);
  }
  if (filters.siteId) q = q.eq("site_id", filters.siteId);
  if (filters.status) q = q.eq("status", filters.status);

  // Discipline and compliance live on a different relation, so resolve the
  // matching asset ids first and constrain on them. Fine at estate scale; if the
  // id list ever grows past a few thousand this wants to become a view.
  if (filters.disciplineCode || filters.complianceState) {
    let cq = supabase.from("asset_compliance_status").select("asset_id");
    if (filters.disciplineCode) cq = cq.eq("discipline_code", filters.disciplineCode);
    if (filters.complianceState) cq = cq.eq("compliance_state", filters.complianceState);

    const { data: matches, error: matchError } = await cq;
    if (matchError) throw new Error(`listAssets (compliance filter): ${matchError.message}`);

    const ids = [...new Set((matches ?? []).map((m) => m.asset_id))];
    if (ids.length === 0) return { rows: [], total: 0, page, pageSize };
    q = q.in("id", ids);
  }

  const { data, error, count } = await q
    .order("reference")
    .range(from, from + pageSize - 1);

  if (error) throw new Error(`listAssets: ${error.message}`);
  return { rows: data ?? [], total: count ?? 0, page, pageSize };
}

export async function getAsset(id: string): Promise<Asset | null> {
  if (!isSupabaseConfigured) {
    return demoAssets.find((a) => a.id === id) ?? null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assets_api")
    .select(
      "id, reference, name, description, status, site_id, site_name, asset_type_id, asset_type_name, parent_id, latitude, longitude, attributes, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`getAsset: ${error.message}`);
  return data;
}

/** Assets with coordinates, for the map. */
export async function listMapAssets(): Promise<Asset[]> {
  if (!isSupabaseConfigured) {
    return demoAssets.filter((a) => a.latitude !== null && a.longitude !== null);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assets_api")
    .select(
      "id, reference, name, description, status, site_id, site_name, asset_type_id, asset_type_name, parent_id, latitude, longitude, attributes, created_at, updated_at",
    )
    .not("latitude", "is", null)
    .limit(2000);

  if (error) throw new Error(`listMapAssets: ${error.message}`);
  return data ?? [];
}

/* -------------------------------------------------------------------------- */
/* Compliance, inspections, findings                                           */
/* -------------------------------------------------------------------------- */

export async function getAssetCompliance(
  assetId: string,
): Promise<AssetComplianceStatus[]> {
  if (!isSupabaseConfigured) {
    return demoCompliance.filter((c) => c.asset_id === assetId);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("asset_compliance_status")
    .select(
      "asset_id, discipline_id, discipline_code, discipline_name, frequency_months, last_inspection_at, next_due_date, is_required, compliance_state, days_until_due",
    )
    .eq("asset_id", assetId);

  if (error) throw new Error(`getAssetCompliance: ${error.message}`);
  return data ?? [];
}

export async function listAllCompliance(): Promise<AssetComplianceStatus[]> {
  if (!isSupabaseConfigured) return demoCompliance;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("asset_compliance_status")
    .select(
      "asset_id, discipline_id, discipline_code, discipline_name, frequency_months, last_inspection_at, next_due_date, is_required, compliance_state, days_until_due",
    );

  if (error) throw new Error(`listAllCompliance: ${error.message}`);
  return data ?? [];
}

export async function getAssetFindings(assetId: string): Promise<Finding[]> {
  if (!isSupabaseConfigured) {
    return demoFindings.filter((f) => f.asset_id === assetId);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("findings_api")
    .select(
      "id, reference, asset_id, asset_name, inspection_id, discipline_id, discipline_code, discipline_name, title, description, severity, status, location_note, identified_at, remediated_at, assigned_to, assigned_to_name, assigned_at, payload, schema_version",
    )
    .eq("asset_id", assetId)
    .order("identified_at", { ascending: false });

  if (error) throw new Error(`getAssetFindings: ${error.message}`);
  return data ?? [];
}

export async function listFindings(limit = 50): Promise<Finding[]> {
  if (!isSupabaseConfigured) {
    return [...demoFindings]
      .sort((a, b) => b.identified_at.localeCompare(a.identified_at))
      .slice(0, limit);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("findings_api")
    .select(
      "id, reference, asset_id, asset_name, inspection_id, discipline_id, discipline_code, discipline_name, title, description, severity, status, location_note, identified_at, remediated_at, assigned_to, assigned_to_name, assigned_at, payload, schema_version",
    )
    .order("identified_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`listFindings: ${error.message}`);
  return data ?? [];
}

export async function getFinding(id: string): Promise<Finding | null> {
  if (!isSupabaseConfigured) {
    return demoFindings.find((f) => f.id === id) ?? null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("findings_api")
    .select(
      "id, reference, asset_id, asset_name, inspection_id, discipline_id, discipline_code, discipline_name, title, description, severity, status, location_note, identified_at, remediated_at, assigned_to, assigned_to_name, assigned_at, payload, schema_version",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`getFinding: ${error.message}`);
  return data;
}

export async function listTeamMembers(): Promise<TeamMember[]> {
  if (!isSupabaseConfigured) {
    return demoTeamMembers;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .order("full_name");

  if (error) throw new Error(`listTeamMembers: ${error.message}`);
  return data ?? [];
}

export async function getAssetInspections(assetId: string): Promise<Inspection[]> {
  if (!isSupabaseConfigured) {
    return demoInspections.filter((i) => i.asset_id === assetId);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inspections_api")
    .select(
      "id, reference, asset_id, asset_name, discipline_id, discipline_code, discipline_name, inspector_name, status, scheduled_for, completed_at, summary, payload, schema_version",
    )
    .eq("asset_id", assetId)
    .order("scheduled_for", { ascending: false });

  if (error) throw new Error(`getAssetInspections: ${error.message}`);
  return data ?? [];
}

/* -------------------------------------------------------------------------- */
/* Documents                                                                   */
/* -------------------------------------------------------------------------- */

const DOC_COLUMNS =
  "id, title, description, kind, asset_id, asset_name, discipline_id, discipline_code, bucket, storage_path, external_url, mime_type, size_bytes, width, height, taken_at, issued_at, expires_at, uploaded_by_name, created_at";

export async function listDocuments(opts: {
  kind?: string;
  assetId?: string;
  query?: string;
  limit?: number;
} = {}): Promise<DocumentRecord[]> {
  if (!isSupabaseConfigured) {
    let rows = [...demoDocuments];
    if (opts.kind) rows = rows.filter((d) => d.kind === opts.kind);
    if (opts.assetId) rows = rows.filter((d) => d.asset_id === opts.assetId);
    if (opts.query) {
      const q = opts.query.toLowerCase();
      rows = rows.filter((d) => d.title.toLowerCase().includes(q));
    }
    return rows
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, opts.limit ?? 200);
  }

  const supabase = await createClient();
  let q = supabase.from("documents_api").select(DOC_COLUMNS);

  if (opts.kind) q = q.eq("kind", opts.kind);
  if (opts.assetId) q = q.eq("asset_id", opts.assetId);
  if (opts.query) {
    const safe = opts.query.replace(/[,()]/g, " ");
    q = q.ilike("title", `%${safe}%`);
  }

  const { data, error } = await q
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 200);

  if (error) throw new Error(`listDocuments: ${error.message}`);

  return withSignedUrls(supabase, data ?? []);
}

/**
 * Uploaded files live in a private bucket, so they need a short-lived signed
 * URL, batched per bucket rather than one round trip per row. Externally
 * linked reports (independent inspection teams' own portals) already have a
 * URL and skip signing entirely.
 */
async function withSignedUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: DocumentRecord[],
): Promise<DocumentRecord[]> {
  if (rows.length === 0) return rows;

  const uploaded = rows.filter(
    (r): r is DocumentRecord & { storage_path: string } => r.storage_path !== null,
  );

  let byPath = new Map<string, string | null>();
  if (uploaded.length > 0) {
    const paths = uploaded.map((r) => r.storage_path);
    const { data, error } = await supabase.storage
      .from(uploaded[0].bucket ?? "documents")
      .createSignedUrls(paths, 60 * 60);
    if (!error) {
      byPath = new Map(
        data.filter((d): d is typeof d & { path: string } => d.path !== null).map((d) => [d.path, d.signedUrl]),
      );
    }
  }

  return rows.map((r) => ({
    ...r,
    url: r.external_url ?? (r.storage_path ? (byPath.get(r.storage_path) ?? null) : null),
  }));
}

/* -------------------------------------------------------------------------- */
/* QR codes & site visits                                                     */
/* -------------------------------------------------------------------------- */

const QR_CODE_COLUMNS = "id, asset_id, asset_name, asset_reference, label, created_by_name, created_at";

export async function getAssetQrCodes(assetId: string): Promise<QrCode[]> {
  if (!isSupabaseConfigured) {
    return demoQrCodes.filter((q) => q.asset_id === assetId);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("qr_codes_api")
    .select(QR_CODE_COLUMNS)
    .eq("asset_id", assetId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`getAssetQrCodes: ${error.message}`);
  return data ?? [];
}

export async function getQrCode(qrCodeId: string): Promise<QrCode | null> {
  if (!isSupabaseConfigured) {
    return demoQrCodes.find((q) => q.id === qrCodeId) ?? null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("qr_codes_api")
    .select(QR_CODE_COLUMNS)
    .eq("id", qrCodeId)
    .maybeSingle();

  if (error) throw new Error(`getQrCode: ${error.message}`);
  return data;
}

const SITE_VISIT_COLUMNS =
  "id, asset_id, asset_name, qr_code_id, qr_code_label, user_id, visitor_name, inspection_id, inspection_reference, checked_in_at, checked_out_at, notes, compliance_flag, flag_details, work_order_id, work_order_reference";

export async function getAssetVisits(assetId: string, limit = 20): Promise<SiteVisit[]> {
  if (!isSupabaseConfigured) {
    return [...demoSiteVisits]
      .filter((v) => v.asset_id === assetId)
      .sort((a, b) => b.checked_in_at.localeCompare(a.checked_in_at))
      .slice(0, limit);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_visits_api")
    .select(SITE_VISIT_COLUMNS)
    .eq("asset_id", assetId)
    .order("checked_in_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getAssetVisits: ${error.message}`);
  return data ?? [];
}

/** Estate-wide, for the attendance view -- not scoped to one asset. */
export async function listSiteVisits(opts: { sinceDays?: number; limit?: number } = {}): Promise<SiteVisit[]> {
  const { sinceDays = 30, limit = 1000 } = opts;
  const since = new Date(Date.now() - sinceDays * 86400000).toISOString();

  if (!isSupabaseConfigured) {
    return [...demoSiteVisits]
      .filter((v) => v.checked_in_at >= since)
      .sort((a, b) => b.checked_in_at.localeCompare(a.checked_in_at))
      .slice(0, limit);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_visits_api")
    .select(SITE_VISIT_COLUMNS)
    .gte("checked_in_at", since)
    .order("checked_in_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`listSiteVisits: ${error.message}`);
  return data ?? [];
}

/** The scan page shows this so whoever's checking in can see who else has been through recently. */
export async function getRecentVisitsForQrCode(qrCodeId: string, limit = 10): Promise<SiteVisit[]> {
  if (!isSupabaseConfigured) {
    return [...demoSiteVisits]
      .filter((v) => v.qr_code_id === qrCodeId)
      .sort((a, b) => b.checked_in_at.localeCompare(a.checked_in_at))
      .slice(0, limit);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("site_visits_api")
    .select(SITE_VISIT_COLUMNS)
    .eq("qr_code_id", qrCodeId)
    .order("checked_in_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getRecentVisitsForQrCode: ${error.message}`);
  return data ?? [];
}

/** Whether the signed-in visitor already has an open visit against this code, to set the button's initial state. */
export async function getMyOpenVisit(qrCodeId: string): Promise<SiteVisit | null> {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("site_visits_api")
    .select(SITE_VISIT_COLUMNS)
    .eq("qr_code_id", qrCodeId)
    .eq("user_id", user.id)
    .is("checked_out_at", null)
    .maybeSingle();

  if (error) throw new Error(`getMyOpenVisit: ${error.message}`);
  return data;
}

/* -------------------------------------------------------------------------- */
/* Training & certifications                                                  */
/* -------------------------------------------------------------------------- */

export async function listCertificationTypes(): Promise<CertificationType[]> {
  if (!isSupabaseConfigured) {
    return demoCertificationTypes;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("certification_types")
    .select("id, code, name, description")
    .order("name");

  if (error) throw new Error(`listCertificationTypes: ${error.message}`);
  return data ?? [];
}

/** What every discipline currently requires the attending person to hold, org-wide. */
export async function listDisciplineRequirements(): Promise<DisciplineCertificationRequirement[]> {
  if (!isSupabaseConfigured) {
    return demoDisciplineRequirements;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("discipline_certification_requirements_api")
    .select(
      "id, discipline_id, discipline_code, discipline_name, certification_type_id, certification_code, certification_name",
    );

  if (error) throw new Error(`listDisciplineRequirements: ${error.message}`);
  return data ?? [];
}

/** Every held certification, org-wide -- the training register a manager checks before assigning work. */
export async function listCertifications(): Promise<Certification[]> {
  if (!isSupabaseConfigured) {
    return demoCertifications;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("certifications_api")
    .select(
      "id, profile_id, holder_name, certification_type_id, certification_code, certification_name, reference, issued_at, expires_at, document_id, created_at",
    )
    .order("holder_name");

  if (error) throw new Error(`listCertifications: ${error.message}`);
  return data ?? [];
}

/** Every work order, org-wide -- what the Site Visits page prices logged hours against. */
export async function listWorkOrders(): Promise<WorkOrder[]> {
  if (!isSupabaseConfigured) {
    return [...demoWorkOrders].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("work_orders_api")
    .select(
      "id, reference, description, asset_id, asset_name, agreed_rate, rate_unit, created_by_name, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(`listWorkOrders: ${error.message}`);
  return data ?? [];
}

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                   */
/* -------------------------------------------------------------------------- */

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [assets, sites, compliance, findings, disciplines] = await Promise.all([
    isSupabaseConfigured ? listAssets({ pageSize: 1 }) : Promise.resolve({ total: demoAssets.length } as Paged<Asset>),
    listSites(),
    listAllCompliance(),
    listFindings(1000),
    listDisciplines(),
  ]);

  const overdue = compliance.filter((c) => c.compliance_state === "overdue");
  const dueSoon = compliance.filter((c) => c.compliance_state === "due_soon");
  const compliant = compliance.filter((c) => c.compliance_state === "compliant");

  const openFindings = findings.filter(
    (f) => !["closed", "removed", "remediated"].includes(f.status),
  );

  const tracked = overdue.length + dueSoon.length + compliant.length;

  const by_discipline: DisciplineSummary[] = disciplines.map((d) => {
    const rows = compliance.filter((c) => c.discipline_id === d.id);
    return {
      discipline_id: d.id,
      code: d.code,
      name: d.name,
      colour: d.colour,
      total: rows.length,
      compliant: rows.filter((r) => r.compliance_state === "compliant").length,
      due_soon: rows.filter((r) => r.compliance_state === "due_soon").length,
      overdue: rows.filter((r) => r.compliance_state === "overdue").length,
      open_findings: openFindings.filter((f) => f.discipline_id === d.id).length,
    };
  });

  const findings_by_severity = {
    critical: findings.filter((f) => f.severity === "critical" && !["closed", "removed", "remediated"].includes(f.status)).length,
    high: findings.filter((f) => f.severity === "high" && !["closed", "removed", "remediated"].includes(f.status)).length,
    medium: findings.filter((f) => f.severity === "medium" && !["closed", "removed", "remediated"].includes(f.status)).length,
    low: findings.filter((f) => f.severity === "low" && !["closed", "removed", "remediated"].includes(f.status)).length,
    info: findings.filter((f) => f.severity === "info" && !["closed", "removed", "remediated"].includes(f.status)).length,
  };

  const findings_by_status = {
    open: findings.filter((f) => f.status === "open").length,
    monitoring: findings.filter((f) => f.status === "monitoring").length,
    in_remediation: findings.filter((f) => f.status === "in_remediation").length,
    remediated: findings.filter((f) => f.status === "remediated").length,
    removed: findings.filter((f) => f.status === "removed").length,
    closed: findings.filter((f) => f.status === "closed").length,
  };

  return {
    asset_count: assets.total,
    site_count: sites.length,
    overdue_count: overdue.length,
    due_soon_count: dueSoon.length,
    compliant_count: compliant.length,
    open_findings: openFindings.length,
    critical_findings: openFindings.filter((f) => f.severity === "critical").length,
    compliance_rate: tracked === 0 ? 0 : Math.round((compliant.length / tracked) * 100),
    by_discipline: by_discipline.filter((d) => d.total > 0),
    findings_by_severity,
    findings_by_status,
  };
}

/* -------------------------------------------------------------------------- */
/* Search                                                                      */
/* -------------------------------------------------------------------------- */

export interface SearchHit {
  kind: "asset" | "finding" | "document";
  id: string;
  title: string;
  subtitle: string;
}

export async function searchAll(query: string, limit = 20): Promise<SearchHit[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  if (!isSupabaseConfigured) {
    const q = trimmed.toLowerCase();
    const hits: SearchHit[] = [];

    for (const a of demoAssets) {
      if (`${a.name} ${a.reference} ${a.site_name}`.toLowerCase().includes(q)) {
        hits.push({ kind: "asset", id: a.id, title: a.name, subtitle: `${a.reference} · ${a.site_name}` });
      }
    }
    for (const f of demoFindings) {
      if (`${f.title} ${f.reference}`.toLowerCase().includes(q)) {
        hits.push({ kind: "finding", id: f.id, title: f.title, subtitle: `${f.reference} · ${f.discipline_name}` });
      }
    }
    for (const d of demoDocuments) {
      if (d.title.toLowerCase().includes(q)) {
        hits.push({ kind: "document", id: d.id, title: d.title, subtitle: d.kind });
      }
    }
    return hits.slice(0, limit);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_all", {
    query: trimmed,
    max_results: limit,
  });

  if (error) throw new Error(`searchAll: ${error.message}`);
  return (data ?? []) as SearchHit[];
}
