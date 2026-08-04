import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const CreateCertificationSchema = z.object({
  profileId: z.string().uuid(),
  certificationTypeId: z.string().uuid(),
  reference: z.string().optional(),
  issuedAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

/**
 * POST /api/certifications
 * Record that someone holds a certification -- the training register a
 * manager maintains, not a self-reported profile field (see RLS in
 * 0016_certifications.sql).
 */
export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from("memberships")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (!membership) {
      return NextResponse.json({ error: "Not a member of any organisation" }, { status: 400 });
    }

    const body = CreateCertificationSchema.parse(await request.json());

    const { data, error } = await supabase
      .from("certifications")
      .insert({
        org_id: membership.org_id,
        profile_id: body.profileId,
        certification_type_id: body.certificationTypeId,
        reference: body.reference || null,
        issued_at: body.issuedAt || null,
        expires_at: body.expiresAt || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ certification: data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
