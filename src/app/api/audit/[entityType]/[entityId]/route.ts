import { NextRequest, NextResponse } from "next/server";
import { getEntityAuditTrail } from "@/lib/data/audit";

interface RouteParams {
  params: {
    entityType: string;
    entityId: string;
  };
}

/**
 * GET /api/audit/[entityType]/[entityId]
 * Get audit trail for a specific entity
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { entityType, entityId } = params;

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: "Missing entityType or entityId" },
        { status: 400 }
      );
    }

    const validEntityTypes = ["inspection", "finding", "asset_discipline"];
    if (!validEntityTypes.includes(entityType)) {
      return NextResponse.json(
        { error: "Invalid entityType" },
        { status: 400 }
      );
    }

    const limit = parseInt(
      new URL(request.url).searchParams.get("limit") || "50",
      10
    );

    const logs = await getEntityAuditTrail(
      entityType as "inspection" | "finding" | "asset_discipline",
      entityId,
      limit
    );

    return NextResponse.json({
      entityType,
      entityId,
      count: logs.length,
      logs,
    });
  } catch (error) {
    console.error("Failed to fetch audit trail:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit trail" },
      { status: 500 }
    );
  }
}
