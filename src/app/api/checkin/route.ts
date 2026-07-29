import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Toggle endpoint: scanning a code opens a visit, scanning the same code again
 * (as the same user) closes it. The open/closed state lives entirely in
 * whether checked_out_at is null -- there is no separate "in progress" flag.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 503 },
      );
    }

    const { qrCodeId } = await request.json();

    if (!qrCodeId) {
      return NextResponse.json({ error: "qrCodeId is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in to check in" }, { status: 401 });
    }

    const { data: qrCode, error: qrError } = await supabase
      .from("qr_codes")
      .select("id, org_id, asset_id")
      .eq("id", qrCodeId)
      .maybeSingle();

    if (qrError) {
      return NextResponse.json({ error: qrError.message }, { status: 400 });
    }
    if (!qrCode) {
      return NextResponse.json({ error: "QR code not found" }, { status: 404 });
    }

    const { data: openVisit, error: openError } = await supabase
      .from("site_visits")
      .select("id")
      .eq("qr_code_id", qrCodeId)
      .eq("user_id", user.id)
      .is("checked_out_at", null)
      .maybeSingle();

    if (openError) {
      return NextResponse.json({ error: openError.message }, { status: 400 });
    }

    if (openVisit) {
      const { data, error } = await supabase
        .from("site_visits")
        .update({ checked_out_at: new Date().toISOString() })
        .eq("id", openVisit.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ action: "checked_out", visit: data });
    }

    const { data, error } = await supabase
      .from("site_visits")
      .insert({
        org_id: qrCode.org_id,
        asset_id: qrCode.asset_id,
        qr_code_id: qrCode.id,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ action: "checked_in", visit: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
