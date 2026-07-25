import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { assigned_to } = await request.json();

    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 503 },
      );
    }

    const supabase = await createClient();

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("findings")
      .update({
        assigned_to,
        assigned_at: assigned_to ? now : null,
        status: assigned_to ? "assigned" : "open",
        updated_at: now,
      })
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
