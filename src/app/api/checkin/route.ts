import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * The gate the compliance officer asked for: a person checking in for work at
 * an asset must hold, in date, every certification that asset's disciplines
 * require. Returns what's missing (empty = compliant) -- it never blocks the
 * check-in itself, see the comment in 0016_certifications.sql for why.
 */
async function findMissingCertifications(
  supabase: SupabaseClient,
  orgId: string,
  assetId: string,
  profileId: string,
): Promise<Array<{ id: string; name: string }>> {
  const { data: assetDisciplines } = await supabase
    .from("asset_disciplines")
    .select("discipline_id")
    .eq("asset_id", assetId)
    .eq("is_required", true);

  const disciplineIds = [...new Set((assetDisciplines ?? []).map((d) => d.discipline_id))];
  if (disciplineIds.length === 0) return [];

  const { data: requirements } = await supabase
    .from("discipline_certification_requirements_api")
    .select("certification_type_id, certification_name")
    .eq("org_id", orgId)
    .in("discipline_id", disciplineIds);

  const required = new Map(
    (requirements ?? []).map((r) => [r.certification_type_id as string, r.certification_name as string]),
  );
  if (required.size === 0) return [];

  const { data: held } = await supabase
    .from("certifications")
    .select("certification_type_id")
    .eq("org_id", orgId)
    .eq("profile_id", profileId)
    .in("certification_type_id", [...required.keys()])
    .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString().slice(0, 10)}`);

  const heldValidIds = new Set((held ?? []).map((h) => h.certification_type_id as string));

  return [...required.entries()]
    .filter(([id]) => !heldValidIds.has(id))
    .map(([id, name]) => ({ id, name }));
}

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

    const missing = await findMissingCertifications(supabase, qrCode.org_id, qrCode.asset_id, user.id);

    const { data, error } = await supabase
      .from("site_visits")
      .insert({
        org_id: qrCode.org_id,
        asset_id: qrCode.asset_id,
        qr_code_id: qrCode.id,
        user_id: user.id,
        compliance_flag: missing.length > 0 ? "missing_training" : null,
        flag_details: missing.length > 0 ? { missing } : null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ action: "checked_in", visit: data, missingTraining: missing });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
