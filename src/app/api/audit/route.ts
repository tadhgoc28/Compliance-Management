import { NextRequest, NextResponse } from "next/server";
import { listAuditLogs, exportAuditLogsCsv } from "@/lib/data/audit";

/**
 * GET /api/audit
 * List audit logs with filtering
 * Query params: entityType, entityId, startDate, endDate, userId, action, limit, offset, format
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const entityType = searchParams.get("entityType") as any;
    const entityId = searchParams.get("entityId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const userId = searchParams.get("userId");
    const action = searchParams.get("action") as any;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const format = searchParams.get("format") || "json";

    const filters = {
      entityType: entityType || undefined,
      entityId: entityId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      userId: userId || undefined,
      action: action || undefined,
      limit,
      offset,
    };

    if (format === "csv") {
      const csv = await exportAuditLogsCsv(filters);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=audit-logs.csv",
        },
      });
    }

    const result = await listAuditLogs(filters);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
