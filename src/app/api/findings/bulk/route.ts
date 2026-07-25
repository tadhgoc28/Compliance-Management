import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { FindingStatus } from "@/lib/types";

export async function PATCH(request: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 503 },
      );
    }

    const { findingIds, status, assigned_to } = await request.json();

    if (!findingIds || !Array.isArray(findingIds) || findingIds.length === 0) {
      return NextResponse.json(
        { error: "findingIds must be a non-empty array" },
        { status: 400 },
      );
    }

    if (!status && assigned_to === undefined) {
      return NextResponse.json(
        { error: "At least one of status or assigned_to must be provided" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const now = new Date().toISOString();

    const updateData: Record<string, any> = { updated_at: now };
    if (status) updateData.status = status as FindingStatus;
    if (assigned_to !== undefined) {
      updateData.assigned_to = assigned_to;
      updateData.assigned_at = assigned_to ? now : null;
      // Auto-transition to assigned if assigning
      if (assigned_to && !status) {
        updateData.status = "assigned";
      }
    }

    const { data, error } = await supabase
      .from("findings")
      .update(updateData)
      .in("id", findingIds)
      .select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      updated: data?.length ?? 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
