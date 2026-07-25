import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { FindingStatus } from "@/lib/types";

const VALID_STATUSES: FindingStatus[] = [
  "open",
  "assigned",
  "monitoring",
  "in_remediation",
  "remediated",
  "removed",
  "closed",
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { status } = await request.json();

    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 503 },
      );
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("findings")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Finding not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, finding: data[0] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
