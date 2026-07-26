import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/lib/data/notifications";
import { z } from "zod";

const NotificationPreferencesUpdateSchema = z.object({
  notify_overdue: z.boolean().optional(),
  notify_due_soon: z.boolean().optional(),
  notify_on_finding: z.boolean().optional(),
  days_before_due: z.number().int().positive().optional(),
  email_frequency: z.enum(["immediate", "daily", "weekly"]).optional(),
  quiet_hours_start: z.string().nullable().optional(),
  quiet_hours_end: z.string().nullable().optional(),
});

/**
 * GET /api/notifications/preferences
 * Get current user's notification preferences
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get org_id from request header (should be set by auth middleware)
    const orgId = request.headers.get("x-org-id");
    if (!orgId) {
      return NextResponse.json({ error: "Missing org_id" }, { status: 400 });
    }

    const prefs = await getNotificationPreferences(user.id, orgId);

    return NextResponse.json({
      preferences: prefs || {
        notify_overdue: true,
        notify_due_soon: true,
        notify_on_finding: true,
        days_before_due: 7,
        email_frequency: "immediate",
        quiet_hours_start: null,
        quiet_hours_end: null,
      },
    });
  } catch (error) {
    console.error("Failed to fetch notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/preferences
 * Update current user's notification preferences
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = request.headers.get("x-org-id");
    if (!orgId) {
      return NextResponse.json({ error: "Missing org_id" }, { status: 400 });
    }

    const body = await request.json();
    const validated = NotificationPreferencesUpdateSchema.parse(body);

    // Get current prefs and merge with updates
    const current = await getNotificationPreferences(user.id, orgId);
    const updated = await updateNotificationPreferences(user.id, orgId, {
      notify_overdue: validated.notify_overdue ?? current?.notify_overdue ?? true,
      notify_due_soon:
        validated.notify_due_soon ?? current?.notify_due_soon ?? true,
      notify_on_finding:
        validated.notify_on_finding ?? current?.notify_on_finding ?? true,
      days_before_due: validated.days_before_due ?? current?.days_before_due ?? 7,
      email_frequency:
        validated.email_frequency ?? current?.email_frequency ?? "immediate",
    });

    return NextResponse.json({
      success: true,
      preferences: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    console.error("Failed to update notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
