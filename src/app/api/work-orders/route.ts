import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const CreateWorkOrderSchema = z.object({
  reference: z.string().min(1),
  description: z.string().optional(),
  assetId: z.string().uuid().optional(),
  agreedRate: z.number().positive().optional(),
  rateUnit: z.enum(["hourly", "daily", "fixed"]).default("hourly"),
});

/**
 * POST /api/work-orders
 * Records the rate a job was agreed at, see 0017_work_orders.sql. Visits are
 * linked to it afterwards (PATCH /api/site-visits/[id]) so hours logged via
 * QR check-in can be priced against it.
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

    const body = CreateWorkOrderSchema.parse(await request.json());

    const { data, error } = await supabase
      .from("work_orders")
      .insert({
        org_id: membership.org_id,
        reference: body.reference,
        description: body.description || null,
        asset_id: body.assetId || null,
        agreed_rate: body.agreedRate ?? null,
        rate_unit: body.rateUnit,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ workOrder: data }, { status: 201 });
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
