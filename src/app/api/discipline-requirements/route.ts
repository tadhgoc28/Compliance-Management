import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const CreateRequirementSchema = z.object({
  disciplineId: z.string().uuid(),
  certificationTypeId: z.string().uuid(),
});

/**
 * POST /api/discipline-requirements
 * Sets "work in this discipline requires this training" -- what the QR
 * check-in gate (src/app/api/checkin/route.ts) actually checks against.
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

    const body = CreateRequirementSchema.parse(await request.json());

    const { data, error } = await supabase
      .from("discipline_certification_requirements")
      .insert({
        org_id: membership.org_id,
        discipline_id: body.disciplineId,
        certification_type_id: body.certificationTypeId,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ requirement: data }, { status: 201 });
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
