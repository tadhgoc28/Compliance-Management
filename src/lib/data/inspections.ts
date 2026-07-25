import "server-only";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { Inspection } from "@/lib/types";

export interface BulkCreateInspectionsRequest {
  assetIds: string[];
  disciplineId: string;
  scheduledFor: string;
  assignments?: { surveyorId: string; assetIds: string[] }[];
}

export interface BulkCreateInspectionsResponse {
  created: number;
  inspectionIds: string[];
}

export async function bulkCreateInspections(
  req: BulkCreateInspectionsRequest,
): Promise<BulkCreateInspectionsResponse> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase not configured");
  }

  const supabase = await createClient();

  // Fetch org_id from the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: memberships } = await supabase
    .from("memberships")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!memberships) throw new Error("User is not a member of any organization");

  const org_id = memberships.org_id;

  // Create inspection records
  const inspections: Inspection[] = [];

  for (const assetId of req.assetIds) {
    // Determine surveyor if assignments provided
    let surveyorId: string | null = null;
    if (req.assignments) {
      const assignment = req.assignments.find((a) =>
        a.assetIds.includes(assetId),
      );
      surveyorId = assignment?.surveyorId ?? null;
    }

    inspections.push({
      id: crypto.randomUUID ? crypto.randomUUID() : `temp-${Date.now()}`,
      reference: `INS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      asset_id: assetId,
      discipline_id: req.disciplineId,
      discipline_code: "",
      discipline_name: "",
      inspector_name: surveyorId ? null : null,
      status: "scheduled",
      scheduled_for: req.scheduledFor,
      completed_at: null,
      summary: null,
      payload: surveyorId ? { assigned_to: surveyorId } : {},
      schema_version: 1,
    });
  }

  // Batch insert
  const { data, error } = await supabase
    .from("inspections")
    .insert(
      inspections.map((i) => ({
        reference: i.reference,
        asset_id: i.asset_id,
        discipline_id: i.discipline_id,
        status: i.status,
        scheduled_for: i.scheduled_for,
        payload: i.payload,
        schema_version: i.schema_version,
        org_id,
      })),
    )
    .select("id");

  if (error) throw new Error(`Failed to create inspections: ${error.message}`);

  const inspectionIds = data?.map((d) => d.id) ?? [];

  return {
    created: inspectionIds.length,
    inspectionIds,
  };
}
