import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createReport,
  listReports,
  getReportDownloadUrl,
  getReportStorageUsage,
} from "@/lib/data/reports";
import { z } from "zod";

const CreateReportSchema = z.object({
  report_type: z.enum([
    "compliance_summary",
    "findings_by_discipline",
    "asset_audit",
    "deadline_report",
  ]),
  title: z.string().min(1),
  description: z.string().optional(),
  file_format: z.enum(["pdf", "csv", "xlsx"]).default("pdf"),
  filters: z.record(z.any()).optional(),
});

/**
 * GET /api/reports
 * List reports for current org
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

    const orgId = request.headers.get("x-org-id");
    if (!orgId) {
      return NextResponse.json({ error: "Missing org_id" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const { data: reports, total } = await listReports(orgId, limit, offset);

    // Get storage usage
    const usage = await getReportStorageUsage(orgId);

    // Enrich reports with download URLs
    const enriched = await Promise.all(
      reports.map(async (report) => ({
        ...report,
        download_url:
          report.status === "generated" ? await getReportDownloadUrl(report.id) : null,
      }))
    );

    return NextResponse.json({
      reports: enriched,
      pagination: {
        offset,
        limit,
        total,
      },
      storage_usage: usage,
    });
  } catch (error) {
    console.error("Failed to fetch reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reports
 * Create a new report
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = request.headers.get("x-org-id");
    if (!orgId) {
      return NextResponse.json({ error: "Missing org_id" }, { status: 400 });
    }

    const body = await request.json();
    const validated = CreateReportSchema.parse(body);

    const report = await createReport(
      orgId,
      user.id,
      validated.report_type,
      validated.title,
      validated.filters || {},
      validated.file_format,
      validated.description
    );

    return NextResponse.json(
      {
        success: true,
        report,
        message: "Report queued for generation",
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    console.error("Failed to create report:", error);
    return NextResponse.json(
      { error: "Failed to create report" },
      { status: 500 }
    );
  }
}
