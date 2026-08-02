import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
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
  filters: z.record(z.string(), z.any()).optional(),
});

/** The org the current session belongs to -- never trusted from a client-sent header. */
async function getCurrentOrgId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("memberships")
    .select("org_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return data?.org_id ?? null;
}

/**
 * GET /api/reports
 * List reports for current org
 */
export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      const { data: reports } = await listReports("demo");
      return NextResponse.json({
        reports: reports.map((r) => ({ ...r, download_url: null })),
        pagination: { offset: 0, limit: reports.length, total: reports.length },
        storage_usage: { totalBytes: 0, reportCount: reports.length, averageSize: 0 },
      });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = await getCurrentOrgId(supabase, user.id);
    if (!orgId) {
      return NextResponse.json({ error: "Not a member of any organisation" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const { data: reports, total } = await listReports(orgId, limit, offset);

    const usage = await getReportStorageUsage(orgId);

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

    const orgId = await getCurrentOrgId(supabase, user.id);
    if (!orgId) {
      return NextResponse.json({ error: "Not a member of any organisation" }, { status: 400 });
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
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    console.error("Failed to create report:", error);
    return NextResponse.json(
      { error: "Failed to create report" },
      { status: 500 }
    );
  }
}
