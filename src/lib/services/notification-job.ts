import { createClient } from "@/lib/supabase/server";
import {
  getPendingEmails,
  markEmailSent,
  markEmailFailed,
  createDeadlineNotification,
} from "@/lib/data/notifications";
import { sendEmail } from "./email";

/**
 * Process pending emails from queue and send them
 * Called by scheduled job (pg_cron)
 */
export async function processPendingEmails(limit = 100): Promise<{
  sent: number;
  failed: number;
  errors: Array<{ emailId: string; error: string }>;
}> {
  const errors: Array<{ emailId: string; error: string }> = [];
  let sent = 0;
  let failed = 0;

  try {
    const emails = await getPendingEmails(limit);

    if (emails.length === 0) {
      return { sent: 0, failed: 0, errors: [] };
    }

    for (const email of emails) {
      try {
        const result = await sendEmail({
          to: email.recipient_email,
          subject: email.subject,
          html: email.body_html,
        });

        if (result.success) {
          await markEmailSent(email.id, result.messageId);
          sent++;
        } else {
          // Retry up to 3 times
          if (email.retry_count < 3) {
            // Don't mark as failed yet, let it retry
            console.log(
              `Email ${email.id} failed, will retry (attempt ${email.retry_count + 1}/3)`
            );
          } else {
            await markEmailFailed(email.id, result.error || "Unknown error");
            failed++;
          }
          errors.push({ emailId: email.id, error: result.error || "Unknown error" });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        await markEmailFailed(email.id, errorMsg);
        failed++;
        errors.push({ emailId: email.id, error: errorMsg });
      }
    }
  } catch (error) {
    console.error("Failed to process emails:", error);
    throw error;
  }

  return { sent, failed, errors };
}

export interface DeadlineItem {
  asset_discipline_id: string;
  asset_id: string;
  asset_name: string;
  discipline_id: string;
  discipline_name: string;
  org_id: string;
  next_due_date: string;
  last_inspection_at: string | null;
  status: "overdue" | "due_soon";
  days_overdue_or_until_due: number;
  manager_emails: string[];
}

/**
 * Find deadline items and queue notifications for org managers
 * Called by scheduled job (pg_cron)
 */
export async function queueDeadlineNotifications(orgId: string): Promise<{
  queued: number;
  skipped: number;
  errors: Array<{ item: DeadlineItem; error: string }>;
}> {
  const supabase = await createClient();
  const jobErrors: Array<{ item: DeadlineItem; error: string }> = [];
  let queued = 0;
  let skipped = 0;

  try {
    // Query for overdue/due_soon items
    const { data: deadlineItems, error: queryError } = await supabase.rpc(
      "query_deadline_items_for_org",
      { org_id_param: orgId }
    );

    if (queryError) {
      console.error("Failed to query deadline items:", queryError);
      throw queryError;
    }

    if (!deadlineItems || deadlineItems.length === 0) {
      return { queued: 0, skipped: 0, errors: [] };
    }

    // Get org managers' emails
    const { data: managers, error: managersError } = await supabase
      .from("organization_members")
      .select("user_id, users!inner(email)")
      .eq("org_id", orgId)
      .in("role", ["manager", "admin"]);

    if (managersError) {
      console.error("Failed to fetch managers:", managersError);
      throw managersError;
    }

    const managerEmails =
      managers?.map((m) => (m.users as any)?.email).filter(Boolean) || [];

    // Queue notifications for each deadline item
    for (const item of deadlineItems) {
      try {
        // Check if notification was already sent recently (within 24 hours)
        const { data: recentNotification } = await supabase
          .from("deadline_notifications")
          .select("id")
          .eq("asset_discipline_id", item.asset_discipline_id)
          .eq("notification_type", item.status)
          .eq("status", "sent")
          .gte("sent_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1);

        if (recentNotification && recentNotification.length > 0) {
          skipped++;
          continue; // Don't spam users
        }

        // Queue email for each manager
        for (const email of managerEmails) {
          const { error: insertError } = await supabase
            .from("email_queue")
            .insert({
              org_id: orgId,
              recipient_email: email,
              subject: `${item.status === "overdue" ? "⚠️ OVERDUE" : "📅 DUE SOON"}: ${item.asset_name} - ${item.discipline_name}`,
              body_html: buildDeadlineEmailHtml(item, item.status),
              entity_type: item.status === "overdue" ? "inspection_overdue" : "inspection_due_soon",
              entity_id: item.asset_discipline_id,
            });

          if (insertError) {
            throw insertError;
          }
        }

        queued++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        jobErrors.push({ item, error: errorMsg });
      }
    }
  } catch (error) {
    console.error("Failed to queue notifications:", error);
    throw error;
  }

  return { queued, skipped, errors: jobErrors };
}

/**
 * Build HTML for deadline notification email
 */
function buildDeadlineEmailHtml(
  item: DeadlineItem,
  type: "overdue" | "due_soon"
): string {
  const statusColor = type === "overdue" ? "#c4462f" : "#d99a2b";
  const statusLabel = type === "overdue" ? "OVERDUE" : "DUE SOON";
  const daysText =
    type === "overdue"
      ? `is ${item.days_overdue_or_until_due} days overdue`
      : `is due in ${item.days_overdue_or_until_due} days`;

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${statusColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">⚠️ ${statusLabel}: ${item.asset_name} - ${item.discipline_name}</h1>
      </div>

      <div style="background: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px;">
        <p style="margin-top: 0; color: #333;">
          The <strong>${item.discipline_name}</strong> inspection for <strong>${item.asset_name}</strong> ${daysText}.
        </p>

        <div style="background: white; padding: 20px; border-left: 4px solid ${statusColor}; margin: 20px 0;">
          <p style="margin: 0 0 10px 0; color: #666; font-size: 12px; text-transform: uppercase;">Inspection Details</p>
          <p style="margin: 0; font-size: 16px;"><strong>${item.asset_name}</strong></p>
          <p style="margin: 5px 0 0 0; color: #666;">Discipline: ${item.discipline_name}</p>
          <p style="margin: 5px 0 0 0; color: #666;">Due: ${new Date(item.next_due_date).toLocaleDateString()}</p>
          ${item.last_inspection_at ? `<p style="margin: 5px 0 0 0; color: #666; font-size: 12px;">Last Inspection: ${new Date(item.last_inspection_at).toLocaleDateString()}</p>` : ""}
        </div>

        <div style="margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://app.complyra.io"}/assets/${item.asset_id}" style="background: #3b6fb0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
            View Asset
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;" />

        <p style="font-size: 12px; color: #999; margin: 0;">
          Complyra Compliance Management Platform | ${new Date().getFullYear()}
        </p>
      </div>
    </div>
  `;
}

/**
 * Send test notification (for debugging)
 */
export async function sendTestNotification(orgId: string): Promise<{
  success: boolean;
  message: string;
}> {
  const result = await queueDeadlineNotifications(orgId);
  return {
    success: true,
    message: `Queued ${result.queued} notifications, skipped ${result.skipped}, errors: ${result.errors.length}`,
  };
}
