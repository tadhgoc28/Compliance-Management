import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getReport } from "@/lib/data/reports";
import { generateReport } from "@/lib/services/report-generator";
import type { ReportGenerationTask } from "@/lib/services/report-generator";

/**
 * POST /api/reports/generate
 * Trigger report generation for a specific report
 * In production, this would queue the job for async processing
 */
export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 503 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reportId } = await request.json();

    if (!reportId) {
      return NextResponse.json({ error: "Missing reportId" }, { status: 400 });
    }

    // Get the report
    const report = await getReport(reportId);
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Check authorization
    if (report.created_by !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // The report already carries the org it belongs to -- no need to trust a
    // client-sent header for something the row already knows.
    const task: ReportGenerationTask = {
      reportId: report.id,
      orgId: report.org_id,
      reportType: report.report_type,
      filters: report.filters as any,
      fileFormat: report.file_format,
    };

    const result = await generateReport(task);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Report generation failed" },
        { status: 500 }
      );
    }

    // Get updated report
    const updatedReport = await getReport(reportId);

    return NextResponse.json({
      success: true,
      report: updatedReport,
      message: "Report generated successfully",
    });
  } catch (error) {
    console.error("Failed to generate report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
