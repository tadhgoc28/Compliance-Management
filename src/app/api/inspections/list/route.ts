import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listInspections, getAssetInspectionStats } from "@/lib/data/filters";
import type { InspectionFilters } from "@/lib/data/filters";

/**
 * GET /api/inspections/list
 * List inspections with filtering
 * Query params: disciplineIds[], status, startDate, endDate, inspectorId, assetId, complianceState, limit, offset
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const filters: InspectionFilters = {
      disciplineIds: searchParams.getAll("disciplineIds[]"),
      status: searchParams.get("status") as any,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      inspectorId: searchParams.get("inspectorId") || undefined,
      assetId: searchParams.get("assetId") || undefined,
      complianceState: searchParams.get("complianceState") as any,
      limit: parseInt(searchParams.get("limit") || "50", 10),
      offset: parseInt(searchParams.get("offset") || "0", 10),
    };

    // Filter out empty discipline IDs
    if (filters.disciplineIds && filters.disciplineIds.length === 0) {
      filters.disciplineIds = undefined;
    }

    const result = await listInspections(filters);

    return NextResponse.json({
      inspections: result.data,
      pagination: {
        offset: filters.offset,
        limit: filters.limit,
        total: result.total,
      },
    });
  } catch (error) {
    console.error("Failed to list inspections:", error);
    return NextResponse.json(
      { error: "Failed to list inspections" },
      { status: 500 }
    );
  }
}
