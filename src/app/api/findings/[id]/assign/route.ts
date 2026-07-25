import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { notifyFindingAssignment } from "@/lib/data/notifications";

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

    // Fetch finding details and assigned user info
    const { data: finding, error: findingError } = await supabase
      .from("findings_api")
      .select("id, title, asset_name, org_id")
      .eq("id", id)
      .maybeSingle();

    if (findingError || !finding) {
      return NextResponse.json(
        { error: "Finding not found" },
        { status: 404 },
      );
    }

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

    // Send notification if assigned
    if (assigned_to) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", assigned_to)
          .maybeSingle();

        if (profile?.email) {
          await notifyFindingAssignment(
            finding.org_id,
            assigned_to,
            profile.email,
            finding.title,
            finding.asset_name || "Unknown asset",
            id
          );
        }
      } catch (notifyError) {
        // Log but don't fail the assignment if notification fails
        console.error("Failed to send notification:", notifyError);
      }
    }

    return NextResponse.json({ success: true, finding: data[0] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
