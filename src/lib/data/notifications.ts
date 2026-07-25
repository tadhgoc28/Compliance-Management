import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export type EmailFrequency = "immediate" | "daily" | "weekly";

export interface NotificationPreferences {
  id: string;
  org_id: string;
  user_id: string;
  notify_overdue: boolean;
  notify_due_soon: boolean;
  notify_on_finding: boolean;
  days_before_due: number;
  email_frequency: EmailFrequency;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeadlineNotification {
  id: string;
  org_id: string;
  asset_discipline_id: string;
  notification_type: "overdue" | "due_soon" | "finding_created";
  recipient_email: string;
  recipient_user_id: string | null;
  sent_at: string;
  status: "pending" | "sent" | "failed" | "bounced";
  error_message: string | null;
  metadata: Record<string, unknown>;
}

export interface EmailQueueItem {
  id: string;
  org_id: string;
  recipient_email: string;
  subject: string;
  body_html: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  processed_at: string | null;
  status: "pending" | "processing" | "sent" | "failed";
  retry_count: number;
  error_message: string | null;
}

const NotificationPreferencesSchema = z.object({
  notify_overdue: z.boolean().default(true),
  notify_due_soon: z.boolean().default(true),
  notify_on_finding: z.boolean().default(true),
  days_before_due: z.number().int().positive().default(7),
  email_frequency: z.enum(["immediate", "daily", "weekly"]).default("immediate"),
});

/**
 * Get notification preferences for a user
 */
export async function getNotificationPreferences(
  userId: string,
  orgId: string
): Promise<NotificationPreferences | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
  return data || null;
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  orgId: string,
  prefs: z.infer<typeof NotificationPreferencesSchema>
): Promise<NotificationPreferences> {
  const supabase = await createClient();
  const validated = NotificationPreferencesSchema.parse(prefs);

  const { data, error } = await supabase
    .from("notification_preferences")
    .upsert(
      {
        user_id: userId,
        org_id: orgId,
        ...validated,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id,user_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Query for deadline items (overdue/due_soon)
 */
export async function queryDeadlineItems(orgId: string): Promise<
  Array<{
    asset_discipline_id: string;
    asset_id: string;
    discipline_id: string;
    next_due_date: string;
    last_inspection_at: string | null;
    status: "overdue" | "due_soon";
    days_overdue_or_until_due: number;
  }>
> {
  const supabase = await createClient();

  // Get asset_disciplines that are overdue or due soon
  const { data, error } = await supabase.rpc("query_deadline_items", {
    org_id: orgId,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Check if notification was already sent recently (to avoid spam)
 */
export async function shouldSendNotification(
  assetDisciplineId: string,
  notificationType: "overdue" | "due_soon" | "finding_created",
  withinHours = 24
): Promise<boolean> {
  const supabase = await createClient();

  const cutoffTime = new Date(Date.now() - withinHours * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("deadline_notifications")
    .select("id")
    .eq("asset_discipline_id", assetDisciplineId)
    .eq("notification_type", notificationType)
    .eq("status", "sent")
    .gte("sent_at", cutoffTime.toISOString())
    .limit(1);

  if (error) throw error;
  return (data?.length || 0) === 0; // Should send if no recent notification
}

export interface NotificationItem {
  assetDisciplineId: string;
  type: "overdue" | "due_soon" | "finding_created";
  recipients: string[]; // Email addresses
  recipientUserIds: string[];
  subject: string;
  bodyHtml: string;
  metadata?: Record<string, unknown>;
}

/**
 * Queue notifications for sending
 */
export async function queueDeadlineNotifications(
  items: NotificationItem[]
): Promise<{ queued: number; errors: Array<{ item: NotificationItem; error: string }> }> {
  const supabase = await createClient();
  const errors: Array<{ item: NotificationItem; error: string }> = [];
  let queued = 0;

  for (const item of items) {
    for (let i = 0; i < item.recipients.length; i++) {
      const email = item.recipients[i];
      const userId = item.recipientUserIds[i] || null;

      const { error } = await supabase.from("email_queue").insert({
        recipient_email: email,
        subject: item.subject,
        body_html: item.bodyHtml,
        entity_type: `${item.type}_${item.type}`, // e.g., 'overdue_overdue'
        entity_id: item.assetDisciplineId,
        org_id: (item.metadata?.org_id as string) || null,
      });

      if (error) {
        errors.push({ item, error: error.message });
      } else {
        queued++;
      }
    }
  }

  return { queued, errors };
}

/**
 * Get pending emails from queue
 */
export async function getPendingEmails(
  limit = 100
): Promise<EmailQueueItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("email_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Mark email as sent
 */
export async function markEmailSent(
  emailId: string,
  messageId?: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("mark_email_sent", {
    email_id: emailId,
    message_id: messageId,
  });

  if (error) throw error;
}

/**
 * Mark email as failed
 */
export async function markEmailFailed(
  emailId: string,
  errorMsg?: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("mark_email_failed", {
    email_id: emailId,
    error_msg: errorMsg,
  });

  if (error) throw error;
}

/**
 * Create deadline notification record
 */
export async function createDeadlineNotification(
  assetDisciplineId: string,
  notificationType: "overdue" | "due_soon" | "finding_created",
  recipientEmail: string,
  recipientUserId: string | null,
  orgId: string
): Promise<DeadlineNotification> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("deadline_notifications")
    .insert({
      asset_discipline_id: assetDisciplineId,
      notification_type: notificationType,
      recipient_email: recipientEmail,
      recipient_user_id: recipientUserId,
      org_id: orgId,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get notification history for an asset_discipline
 */
export async function getNotificationHistory(
  assetDisciplineId: string,
  limit = 50
): Promise<DeadlineNotification[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("deadline_notifications")
    .select("*")
    .eq("asset_discipline_id", assetDisciplineId)
    .order("sent_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Queue notification for finding assignment
 */
export async function notifyFindingAssignment(
  orgId: string,
  assignedToUserId: string,
  recipientEmail: string,
  findingTitle: string,
  assetName: string,
  findingId: string
): Promise<void> {
  const supabase = await createClient();

  const subject = `Finding assigned: ${findingTitle}`;
  const bodyHtml = `
    <h2>${findingTitle}</h2>
    <p>You have been assigned a finding on asset: <strong>${assetName}</strong></p>
    <p><a href="https://complyra.app/findings/${findingId}">View finding details</a></p>
  `;

  const { error } = await supabase.from("email_queue").insert({
    org_id: orgId,
    recipient_email: recipientEmail,
    subject,
    body_html: bodyHtml,
    entity_type: "finding",
    entity_id: findingId,
    status: "pending",
  });

  if (error) throw error;
}

/**
 * Queue notification for inspection scheduling
 */
export async function notifyInspectionScheduled(
  orgId: string,
  recipientEmail: string,
  assetName: string,
  disciplineName: string,
  scheduledFor: string,
  inspectionCount: number
): Promise<void> {
  const supabase = await createClient();

  const subject = `${inspectionCount} inspection${inspectionCount > 1 ? "s" : ""} scheduled for ${assetName}`;
  const bodyHtml = `
    <h2>Inspection Scheduled</h2>
    <p>You have ${inspectionCount} new inspection${inspectionCount > 1 ? "s" : ""} scheduled:</p>
    <ul>
      <li>Asset: <strong>${assetName}</strong></li>
      <li>Discipline: <strong>${disciplineName}</strong></li>
      <li>Due date: <strong>${new Date(scheduledFor).toLocaleDateString()}</strong></li>
    </ul>
    <p><a href="https://complyra.app/assets">View assets</a></p>
  `;

  const { error } = await supabase.from("email_queue").insert({
    org_id: orgId,
    recipient_email: recipientEmail,
    subject,
    body_html: bodyHtml,
    entity_type: "inspection",
    entity_id: null,
    status: "pending",
  });

  if (error) throw error;
}
