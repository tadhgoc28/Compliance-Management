import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { demoAuditLogs } from "./demo";
import type { AuditLog } from "@/lib/types";

export type { AuditLog };

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

function matchesFilters(log: AuditLog, filters: AuditFilters): boolean {
  if (filters.entityType && log.entity_type !== filters.entityType) return false;
  if (filters.entityId && log.entity_id !== filters.entityId) return false;
  if (filters.userId && log.user_id !== filters.userId) return false;
  if (filters.action && log.action !== filters.action) return false;
  if (filters.startDate && log.created_at < new Date(filters.startDate).toISOString()) return false;
  if (filters.endDate && log.created_at > new Date(filters.endDate).toISOString()) return false;
  return true;
}

/**
 * Get audit trail for a specific entity (inspection, finding, etc.)
 */
export async function getEntityAuditTrail(
  entityType: "inspection" | "finding" | "asset_discipline",
  entityId: string,
  limit = 50,
): Promise<AuditLog[]> {
  if (!isSupabaseConfigured) {
    return demoAuditLogs
      .filter((l) => l.entity_type === entityType && l.entity_id === entityId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("audit_logs_api")
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
  filters: AuditFilters,
): Promise<{ data: AuditLog[]; total: number }> {
  const { limit = 50, offset = 0 } = filters;

  if (!isSupabaseConfigured) {
    const matching = [...demoAuditLogs]
      .filter((l) => matchesFilters(l, filters))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return {
      data: matching.slice(offset, offset + limit),
      total: matching.length,
    };
  }

  const supabase = await createClient();
  let query = supabase.from("audit_logs_api").select("*", { count: "exact" });

  if (filters.entityType) query = query.eq("entity_type", filters.entityType);
  if (filters.entityId) query = query.eq("entity_id", filters.entityId);
  if (filters.userId) query = query.eq("user_id", filters.userId);
  if (filters.action) query = query.eq("action", filters.action);
  if (filters.startDate) query = query.gte("created_at", new Date(filters.startDate).toISOString());
  if (filters.endDate) query = query.lte("created_at", new Date(filters.endDate).toISOString());

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
 * Compare two versions of an entity using audit logs
 */
export async function getAuditDiff(
  entityType: "inspection" | "finding" | "asset_discipline",
  entityId: string,
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
 * Export audit logs as CSV -- the evidence pack format an insurer or lawyer
 * would actually be handed.
 */
export async function exportAuditLogsCsv(filters: AuditFilters): Promise<string> {
  const logs = (await listAuditLogs({ ...filters, limit: filters.limit ?? 10000 })).data;

  const headers = ["Created At", "Action", "Entity Type", "Entity ID", "Changed Fields", "User"];
  const rows = logs.map((log) => [
    log.created_at,
    log.action,
    log.entity_type,
    log.entity_id,
    log.changed_fields.join("; "),
    log.user_name || log.user_id || "System",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  return csv;
}
