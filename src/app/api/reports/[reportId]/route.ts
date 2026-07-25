import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getReport, deleteReport, getReportDownloadUrl } from "@/lib/data/reports";

/**
 * GET /api/reports/[reportId]
 * Get a specific report
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reportId } = await params;
    if (!reportId) {
      return NextResponse.json({ error: "Missing reportId" }, { status: 400 });
    }

    const report = await getReport(reportId);
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Check authorization
    if (
      report.created_by !== user.id &&
      report.org_id !== (request.headers.get("x-org-id") || null)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const downloadUrl =
      report.status === "generated" ? await getReportDownloadUrl(reportId) : null;

    return NextResponse.json({
      report: {
        ...report,
        download_url: downloadUrl,
      },
    });
  } catch (error) {
    console.error("Failed to fetch report:", error);
    return NextResponse.json(
      { error: "Failed to fetch report" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/reports/[reportId]
 * Delete a report
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reportId } = await params;
    if (!reportId) {
      return NextResponse.json({ error: "Missing reportId" }, { status: 400 });
    }

    const report = await getReport(reportId);
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Check authorization (only creator can delete)
    if (report.created_by !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await deleteReport(reportId);

    return NextResponse.json({
      success: true,
      message: "Report deleted",
    });
  } catch (error) {
    console.error("Failed to delete report:", error);
    return NextResponse.json(
      { error: "Failed to delete report" },
      { status: 500 }
    );
  }
}
