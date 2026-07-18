import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listFindings, getFindingsSummaryBySeverity } from "@/lib/data/filters";
import type { FindingFilters } from "@/lib/data/filters";

/**
 * GET /api/findings/list
 * List findings with filtering
 * Query params: disciplineIds[], severity, status, startDate, endDate, assetId, location, limit, offset
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

    const filters: FindingFilters = {
      disciplineIds: searchParams.getAll("disciplineIds[]"),
      severity: searchParams.get("severity") as any,
      status: searchParams.get("status") as any,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      assetId: searchParams.get("assetId") || undefined,
      location: searchParams.get("location") || undefined,
      limit: parseInt(searchParams.get("limit") || "50", 10),
      offset: parseInt(searchParams.get("offset") || "0", 10),
    };

    // Filter out empty discipline IDs
    if (filters.disciplineIds && filters.disciplineIds.length === 0) {
      filters.disciplineIds = undefined;
    }

    const result = await listFindings(filters);
    const summary = await getFindingsSummaryBySeverity();

    return NextResponse.json({
      findings: result.data,
      summary,
      pagination: {
        offset: filters.offset,
        limit: filters.limit,
        total: result.total,
      },
    });
  } catch (error) {
    console.error("Failed to list findings:", error);
    return NextResponse.json(
      { error: "Failed to list findings" },
      { status: 500 }
    );
  }
}
