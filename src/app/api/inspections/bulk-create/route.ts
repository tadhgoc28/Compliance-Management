import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { bulkCreateInspections } from "@/lib/data/inspections";

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 503 },
      );
    }

    const body = await request.json();

    const { assetIds, disciplineId, scheduledFor, assignments } = body;

    if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
      return NextResponse.json(
        { error: "assetIds must be a non-empty array" },
        { status: 400 },
      );
    }

    if (!disciplineId || typeof disciplineId !== "string") {
      return NextResponse.json(
        { error: "disciplineId is required and must be a string" },
        { status: 400 },
      );
    }

    if (!scheduledFor || typeof scheduledFor !== "string") {
      return NextResponse.json(
        { error: "scheduledFor is required and must be a string (ISO date)" },
        { status: 400 },
      );
    }

    // Validate scheduledFor is a valid date
    if (isNaN(new Date(scheduledFor).getTime())) {
      return NextResponse.json(
        { error: "scheduledFor must be a valid ISO date" },
        { status: 400 },
      );
    }

    const result = await bulkCreateInspections({
      assetIds,
      disciplineId,
      scheduledFor,
      assignments,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
