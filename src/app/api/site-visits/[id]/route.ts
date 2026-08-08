import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const AssignWorkOrderSchema = z.object({
  workOrderId: z.string().uuid().nullable(),
});

/** PATCH /api/site-visits/[id] -- assigns (or clears) which work order a logged visit counts against. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
    }

    const { id } = await params;
    const body = AssignWorkOrderSchema.parse(await request.json());

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("site_visits")
      .update({ work_order_id: body.workOrderId })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ visit: data });
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
