import { createClient } from "@/lib/supabase/server";
import type { Inspection, Finding, Asset } from "@/lib/types";

export interface InspectionFilters {
  disciplineIds?: string[];
  status?: "scheduled" | "in_progress" | "completed" | "cancelled";
  startDate?: string;
  endDate?: string;
  inspectorId?: string;
  assetId?: string;
  complianceState?: "overdue" | "due_soon" | "compliant" | "unknown";
  limit?: number;
  offset?: number;
}

export interface FindingFilters {
  disciplineIds?: string[];
  severity?: "low" | "medium" | "high";
  status?: "open" | "in_progress" | "resolved" | "closed";
  startDate?: string;
  endDate?: string;
  assetId?: string;
  location?: string;
  limit?: number;
  offset?: number;
}

/**
 * List inspections with filtering and pagination
 */
export async function listInspections(
  filters: InspectionFilters
): Promise<{
  data: Inspection[];
  total: number;
}> {
  const supabase = await createClient();
  const {
    disciplineIds,
    status,
    startDate,
    endDate,
    inspectorId,
    assetId,
    complianceState,
    limit = 50,
    offset = 0,
  } = filters;

  let query = supabase
    .from("inspections")
    .select(
      `*,
      assets(id, name, reference),
      disciplines(id, name, colour, icon),
      asset_disciplines!inner(compliance_state)`,
      { count: "exact" }
    );

  // Apply filters
  if (disciplineIds && disciplineIds.length > 0) {
    query = query.in("discipline_id", disciplineIds);
  }

  if (status) {
    query = query.eq("status", status);
  }

  if (startDate) {
    query = query.gte(
      "scheduled_for",
      new Date(startDate).toISOString()
    );
  }

  if (endDate) {
    query = query.lte(
      "scheduled_for",
      new Date(endDate).toISOString()
    );
  }

  if (inspectorId) {
    query = query.eq("inspector_id", inspectorId);
  }

  if (assetId) {
    query = query.eq("asset_id", assetId);
  }

  if (complianceState) {
    query = query.eq("asset_disciplines.compliance_state", complianceState);
  }

  const { data, error, count } = await query
    .order("scheduled_for", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return {
    data: data || [],
    total: count || 0,
  };
}

/**
 * List findings with filtering and pagination
 */
export async function listFindings(
  filters: FindingFilters
): Promise<{
  data: Finding[];
  total: number;
}> {
  const supabase = await createClient();
  const {
    disciplineIds,
    severity,
    status,
    startDate,
    endDate,
    assetId,
    location,
    limit = 50,
    offset = 0,
  } = filters;

  let query = supabase
    .from("findings")
    .select(
      `*,
      inspections(id, scheduled_for),
      assets(id, name, reference),
      disciplines(id, name, colour, icon)`,
      { count: "exact" }
    );

  // Apply filters
  if (disciplineIds && disciplineIds.length > 0) {
    query = query.in("discipline_id", disciplineIds);
  }

  if (severity) {
    query = query.eq("severity", severity);
  }

  if (status) {
    query = query.eq("status", status);
  }

  if (startDate) {
    query = query.gte(
      "identified_at",
      new Date(startDate).toISOString()
    );
  }

  if (endDate) {
    query = query.lte(
      "identified_at",
      new Date(endDate).toISOString()
    );
  }

  if (assetId) {
    query = query.eq("asset_id", assetId);
  }

  if (location) {
    // Simple text search in location field
    query = query.ilike("location_note", `%${location}%`);
  }

  const { data, error, count } = await query
    .order("identified_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return {
    data: data || [],
    total: count || 0,
  };
}

/**
 * Get inspection stats for an asset
 */
export async function getAssetInspectionStats(assetId: string): Promise<{
  total_inspections: number;
  last_inspection_date: string | null;
  inspections_by_discipline: Array<{
    discipline_id: string;
    discipline_name: string;
    count: number;
    last_inspection: string | null;
  }>;
  open_findings: number;
  critical_findings: number;
}> {
  const supabase = await createClient();

  // Get total inspections
  const { count: totalInspections } = await supabase
    .from("inspections")
    .select("id", { count: "exact", head: true })
    .eq("asset_id", assetId);

  // Get last inspection
  const { data: lastInspection } = await supabase
    .from("inspections")
    .select("completed_at")
    .eq("asset_id", assetId)
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  // Get inspections by discipline
  const { data: byDiscipline } = await supabase
    .from("inspections")
    .select(
      `discipline_id,
      disciplines(name),
      completed_at`
    )
    .eq("asset_id", assetId)
    .order("completed_at", { ascending: false });

  const inspectionsByDiscipline = byDiscipline
    ? Object.entries(
        byDiscipline.reduce(
          (acc, insp) => {
            const key = insp.discipline_id;
            if (!acc[key]) {
              acc[key] = {
                discipline_id: insp.discipline_id,
                discipline_name: (insp.disciplines as any)?.name || "Unknown",
                count: 0,
                last_inspection: null,
              };
            }
            acc[key].count++;
            if (!acc[key].last_inspection || insp.completed_at > acc[key].last_inspection) {
              acc[key].last_inspection = insp.completed_at;
            }
            return acc;
          },
          {} as Record<string, any>
        )
      ).map(([_, v]) => v)
    : [];

  // Get findings stats
  const { count: openFindings } = await supabase
    .from("findings")
    .select("id", { count: "exact", head: true })
    .eq("asset_id", assetId)
    .eq("status", "open");

  const { count: criticalFindings } = await supabase
    .from("findings")
    .select("id", { count: "exact", head: true })
    .eq("asset_id", assetId)
    .eq("severity", "high")
    .eq("status", "open");

  return {
    total_inspections: totalInspections || 0,
    last_inspection_date: lastInspection?.completed_at || null,
    inspections_by_discipline: inspectionsByDiscipline,
    open_findings: openFindings || 0,
    critical_findings: criticalFindings || 0,
  };
}

/**
 * Search assets by name or reference
 */
export async function searchAssets(
  query: string,
  limit = 20
): Promise<Array<{
  id: string;
  name: string;
  reference: string;
  site_name: string | null;
}>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assets")
    .select("id, name, reference, site_name")
    .or(`name.ilike.%${query}%,reference.ilike.%${query}%`)
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Get compliance summary by discipline
 */
export async function getComplianceSummaryByDiscipline(): Promise<
  Array<{
    discipline_id: string;
    discipline_name: string;
    total_assets: number;
    compliant: number;
    due_soon: number;
    overdue: number;
    unknown: number;
    compliance_percentage: number;
  }>
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("asset_disciplines")
    .select("discipline_id, disciplines(name), compliance_state")
    .eq("deleted_at", null);

  if (error) throw error;

  const items = data || [];

  const summary = Object.entries(
    items.reduce(
      (acc, item) => {
        const key = item.discipline_id;
        if (!acc[key]) {
          acc[key] = {
            discipline_id: item.discipline_id,
            discipline_name: (item.disciplines as any)?.name || "Unknown",
            total_assets: 0,
            compliant: 0,
            due_soon: 0,
            overdue: 0,
            unknown: 0,
          };
        }
        acc[key].total_assets++;

        if (item.compliance_state === "compliant") acc[key].compliant++;
        else if (item.compliance_state === "due_soon") acc[key].due_soon++;
        else if (item.compliance_state === "overdue") acc[key].overdue++;
        else acc[key].unknown++;

        return acc;
      },
      {} as Record<string, any>
    )
  ).map(([_, v]) => ({
    ...v,
    compliance_percentage:
      v.total_assets > 0
        ? Math.round((v.compliant / v.total_assets) * 100)
        : 0,
  }));

  return summary;
}

/**
 * Get findings summary by severity
 */
export async function getFindingsSummaryBySeverity(): Promise<{
  high: number;
  medium: number;
  low: number;
  total: number;
  open: number;
  resolved: number;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("findings")
    .select("severity, status");

  if (error) throw error;

  const findings = data || [];

  return {
    high: findings.filter((f) => f.severity === "high").length,
    medium: findings.filter((f) => f.severity === "medium").length,
    low: findings.filter((f) => f.severity === "low").length,
    total: findings.length,
    open: findings.filter((f) => f.status === "open").length,
    resolved: findings.filter((f) => f.status === "resolved").length,
  };
}
