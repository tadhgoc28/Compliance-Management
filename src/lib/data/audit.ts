import { createClient } from "@/lib/supabase/server";

export interface AuditLog {
  id: string;
  org_id: string;
  user_id: string | null;
  entity_type: "inspection" | "finding" | "asset_discipline";
  entity_id: string;
  action: "insert" | "update" | "delete";
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_fields: string[];
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AuditFilters {
  entityType?: "inspection" | "finding" | "asset_discipline";
  entityId?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
  action?: "insert" | "update" | "delete";
  limit?: number;
  offset?: number;
}

/**
 * Get audit trail for a specific entity (inspection, finding, etc.)
 */
export async function getEntityAuditTrail(
  entityType: "inspection" | "finding" | "asset_discipline",
  entityId: string,
  limit = 50
): Promise<AuditLog[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * List audit logs with filtering and pagination
 */
export async function listAuditLogs(
  filters: AuditFilters
): Promise<{ data: AuditLog[]; total: number }> {
  const supabase = await createClient();
  const {
    entityType,
    entityId,
    startDate,
    endDate,
    userId,
    action,
    limit = 50,
    offset = 0,
  } = filters;

  let query = supabase.from("audit_logs").select("*", { count: "exact" });

  if (entityType) query = query.eq("entity_type", entityType);
  if (entityId) query = query.eq("entity_id", entityId);
  if (userId) query = query.eq("user_id", userId);
  if (action) query = query.eq("action", action);

  if (startDate) {
    query = query.gte("created_at", new Date(startDate).toISOString());
  }

  if (endDate) {
    query = query.lte("created_at", new Date(endDate).toISOString());
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return {
    data: data || [],
    total: count || 0,
  };
}

/**
 * Get audit log entries for a date range
 */
export async function getAuditLogsByDateRange(
  startDate: Date,
  endDate: Date,
  limit = 1000
): Promise<AuditLog[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString())
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Compare two versions of an entity using audit logs
 */
export async function getAuditDiff(
  entityType: "inspection" | "finding" | "asset_discipline",
  entityId: string
): Promise<
  Array<{
    timestamp: string;
    action: string;
    changedFields: string[];
    oldValues: Record<string, unknown> | null;
    newValues: Record<string, unknown> | null;
  }>
> {
  const logs = await getEntityAuditTrail(entityType, entityId, 1000);

  return logs.map((log) => ({
    timestamp: log.created_at,
    action: log.action,
    changedFields: log.changed_fields,
    oldValues: log.old_values,
    newValues: log.new_values,
  }));
}

/**
 * Export audit logs as CSV
 */
export async function exportAuditLogsCsv(
  filters: AuditFilters
): Promise<string> {
  const logs = (await listAuditLogs(filters)).data;

  const headers = [
    "Created At",
    "Action",
    "Entity Type",
    "Entity ID",
    "Changed Fields",
    "User ID",
  ];
  const rows = logs.map((log) => [
    log.created_at,
    log.action,
    log.entity_type,
    log.entity_id,
    log.changed_fields.join("; "),
    log.user_id || "System",
  ]);

  const csv = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return csv;
}
