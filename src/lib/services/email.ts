import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

/**
 * Send email via Resend
 */
export async function sendEmail(payload: EmailPayload): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not configured, skipping email send");
      return { success: false, error: "Email service not configured" };
    }

    const response = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@complyra.io",
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      replyTo: payload.replyTo,
      headers: payload.headers,
    });

    if (response.error) {
      console.error("Resend error:", response.error);
      return { success: false, error: response.error.message };
    }

    return { success: true, messageId: response.data?.id };
  } catch (error) {
    console.error("Failed to send email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send deadline alert email
 */
export async function sendDeadlineAlertEmail(params: {
  to: string;
  assetName: string;
  disciplineName: string;
  dueDate: string;
  nextInspectionDate?: string;
  daysOverdue?: number;
  type: "overdue" | "due_soon";
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const {
    to,
    assetName,
    disciplineName,
    dueDate,
    daysOverdue,
    type,
  } = params;

  const subject =
    type === "overdue"
      ? `⚠️ OVERDUE: ${assetName} - ${disciplineName} Inspection`
      : `📅 DUE SOON: ${assetName} - ${disciplineName} Inspection`;

  const statusText = type === "overdue"
    ? `is <strong>${daysOverdue} days overdue</strong>`
    : `is due on <strong>${dueDate}</strong>`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${type === "overdue" ? "#c4462f" : "#d99a2b"}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">${subject}</h1>
      </div>

      <div style="background: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px;">
        <p style="margin-top: 0; color: #333;">
          The <strong>${disciplineName}</strong> inspection for <strong>${assetName}</strong> ${statusText}.
        </p>

        <div style="background: white; padding: 20px; border-left: 4px solid ${type === "overdue" ? "#c4462f" : "#d99a2b"}; margin: 20px 0;">
          <p style="margin: 0 0 10px 0; color: #666; font-size: 12px; text-transform: uppercase;">Inspection Details</p>
          <p style="margin: 0; font-size: 16px;"><strong>${assetName}</strong></p>
          <p style="margin: 5px 0 0 0; color: #666;">Due: ${dueDate}</p>
        </div>

        <p style="color: #666;">
          Please log into Complyra to ${type === "overdue" ? "schedule the overdue inspection" : "prepare for the upcoming inspection"}.
        </p>

        <div style="margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://app.complyra.io"}/dashboard" style="background: #3b6fb0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
            View Dashboard
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;" />

        <p style="font-size: 12px; color: #999; margin: 0;">
          Complyra Compliance Management Platform | ${new Date().getFullYear()}
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
  });
}

/**
 * Send finding notification email
 */
export async function sendFindingNotificationEmail(params: {
  to: string;
  assetName: string;
  findingTitle: string;
  severity: "low" | "medium" | "high";
  inspectorName?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to, assetName, findingTitle, severity, inspectorName } = params;

  const severityColor =
    severity === "high" ? "#c4462f" : severity === "medium" ? "#d99a2b" : "#3f9a5f";
  const severityLabel = severity.charAt(0).toUpperCase() + severity.slice(1);

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${severityColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">🔍 New Finding Logged</h1>
      </div>

      <div style="background: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px;">
        <p style="margin-top: 0; color: #333;">
          A new finding has been logged for <strong>${assetName}</strong>.
        </p>

        <div style="background: white; padding: 20px; border-left: 4px solid ${severityColor}; margin: 20px 0;">
          <p style="margin: 0 0 5px 0; font-size: 16px;"><strong>${findingTitle}</strong></p>
          <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">
            Severity: <span style="color: ${severityColor}; font-weight: 500;">${severityLabel}</span>
          </p>
          ${inspectorName ? `<p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Inspector: ${inspectorName}</p>` : ""}
        </div>

        <p style="color: #666;">
          Review the finding in Complyra to assess remediation requirements and assign follow-up actions.
        </p>

        <div style="margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://app.complyra.io"}/findings" style="background: #3b6fb0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
            View Finding
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;" />

        <p style="font-size: 12px; color: #999; margin: 0;">
          Complyra Compliance Management Platform | ${new Date().getFullYear()}
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject: `New Finding: ${findingTitle}`,
    html,
  });
}

/**
 * Send report ready email
 */
export async function sendReportReadyEmail(params: {
  to: string;
  reportTitle: string;
  reportType: string;
  downloadUrl: string;
  expiresAt?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to, reportTitle, reportType, downloadUrl, expiresAt } = params;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #3f9a5f; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 20px;">✅ Your Report is Ready</h1>
      </div>

      <div style="background: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px;">
        <p style="margin-top: 0; color: #333;">
          Your compliance report has been generated and is ready for download.
        </p>

        <div style="background: white; padding: 20px; border-left: 4px solid #3f9a5f; margin: 20px 0;">
          <p style="margin: 0 0 5px 0; font-size: 16px;"><strong>${reportTitle}</strong></p>
          <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Type: ${reportType}</p>
          ${expiresAt ? `<p style="margin: 5px 0 0 0; color: #999; font-size: 12px;">Expires: ${expiresAt}</p>` : ""}
        </div>

        <div style="margin-top: 30px;">
          <a href="${downloadUrl}" style="background: #3b6fb0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
            Download Report
          </a>
        </div>

        <p style="margin-top: 20px; color: #666; font-size: 14px;">
          ${expiresAt ? "This download link expires on " + expiresAt + "." : "Keep this link safe for future access to your report."}
        </p>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;" />

        <p style="font-size: 12px; color: #999; margin: 0;">
          Complyra Compliance Management Platform | ${new Date().getFullYear()}
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Report Ready: ${reportTitle}`,
    html,
  });
}

/**
 * Test email (for debugging)
 */
export async function sendTestEmail(to: string): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  return sendEmail({
    to,
    subject: "🧪 Complyra Test Email",
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h1>Hello from Complyra!</h1>
        <p>This is a test email to verify your email configuration is working correctly.</p>
        <p>If you're seeing this, email notifications are enabled.</p>
      </div>
    `,
  });
}
