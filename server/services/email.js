/* ============================================================
   ETERNITY — Transactional Email Service (Brevo API v3)
   Professional, human-crafted transactional email delivery.
   Zero emojis, clean typographic hierarchy, executive layout.
   ============================================================ */

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Formats a Date or ISO string into a standard, professional date string.
 */
function formatDateTime(dateInput) {
  if (!dateInput) return 'To be confirmed';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  } catch {
    return String(dateInput);
  }
}

/**
 * Core Brevo API client via native fetch.
 */
async function sendBrevoEmail({ to, subject, htmlContent, textContent, replyTo }) {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    console.warn('[email] BREVO_API_KEY is not configured. Email skipped.');
    return { success: false, skipped: true, reason: 'BREVO_API_KEY missing' };
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'harshraj1603@gmail.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'Aryan Raj | ETERNITY';

  const recipients = Array.isArray(to)
    ? to.map((t) => (typeof t === 'string' ? { email: t } : t))
    : [{ email: to.email || to, name: to.name || undefined }];

  const payload = {
    sender: {
      name: senderName,
      email: senderEmail,
    },
    to: recipients,
    subject: subject,
    htmlContent: htmlContent,
    textContent: textContent || subject,
  };

  if (replyTo) {
    payload.replyTo = typeof replyTo === 'string' ? { email: replyTo } : replyTo;
  } else {
    payload.replyTo = { name: senderName, email: senderEmail };
  }

  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error(`[email] Brevo API error (${response.status}):`, data.message || JSON.stringify(data));
      return {
        success: false,
        status: response.status,
        error: data.message || 'Failed to send email via Brevo',
        code: data.code,
        ipRestricted: Boolean(data.message && data.message.includes('authorised_ips')),
      };
    }

    console.log(`[email] Delivered via Brevo to ${recipients.map((r) => r.email).join(', ')} [${data.messageId || 'ok'}]`);
    return {
      success: true,
      messageId: data.messageId,
    };
  } catch (err) {
    console.error('[email] Network error sending email:', err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Minimalist, elegant container layout.
 * Strictly no pill badges, no bubbly card borders, no AI aesthetic.
 */
function wrapEmailTemplate({ title, subtitle, contentHtml, ctaText, ctaUrl }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b0c10;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #cbd5e1;
      -webkit-font-smoothing: antialiased;
      line-height: 1.6;
    }
    table {
      border-collapse: collapse;
    }
    .wrapper {
      width: 100%;
      background-color: #0b0c10;
      padding: 48px 16px;
      box-sizing: border-box;
    }
    .container {
      max-width: 560px;
      margin: 0 auto;
      background-color: #12141a;
      border: 1px solid #1e222d;
      border-radius: 8px;
      padding: 40px;
      box-sizing: border-box;
    }
    .brand-header {
      padding-bottom: 24px;
      border-bottom: 1px solid #1e222d;
      margin-bottom: 32px;
    }
    .brand-name {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #ffffff;
    }
    .brand-sub {
      font-size: 11px;
      color: #64748b;
      letter-spacing: 0.05em;
      margin-top: 4px;
      text-transform: uppercase;
    }
    h1 {
      font-size: 20px;
      font-weight: 600;
      color: #ffffff;
      margin: 0 0 16px 0;
      letter-spacing: -0.01em;
      line-height: 1.3;
    }
    p {
      margin: 0 0 16px 0;
      font-size: 14px;
      color: #94a3b8;
      line-height: 1.6;
    }
    .meta-table {
      width: 100%;
      margin: 28px 0;
      border: 1px solid #1e222d;
      border-radius: 6px;
      background-color: #0e1015;
    }
    .meta-table td {
      padding: 12px 16px;
      font-size: 13px;
      border-bottom: 1px solid #1a1d26;
    }
    .meta-table tr:last-child td {
      border-bottom: none;
    }
    .meta-label {
      color: #64748b;
      width: 130px;
      font-weight: 500;
    }
    .meta-value {
      color: #f1f5f9;
      font-weight: 500;
    }
    .cta-wrap {
      margin: 32px 0 28px 0;
    }
    .cta-button {
      display: inline-block;
      background-color: #ffffff;
      color: #0b0c10 !important;
      text-decoration: none;
      font-size: 13px;
      font-weight: 600;
      padding: 12px 24px;
      border-radius: 6px;
      letter-spacing: 0.01em;
    }
    .footer {
      margin-top: 36px;
      padding-top: 24px;
      border-top: 1px solid #1e222d;
      font-size: 12px;
      color: #475569;
      line-height: 1.6;
    }
    .footer a {
      color: #64748b;
      text-decoration: underline;
    }
    .signature {
      margin-top: 28px;
      font-size: 13px;
      color: #94a3b8;
    }
    .signature-name {
      color: #ffffff;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="brand-header">
        <div class="brand-name">ETERNITY</div>
        <div class="brand-sub">Web & Mobile Engineering</div>
      </div>

      <h1>${title}</h1>
      ${subtitle ? `<p>${subtitle}</p>` : ''}

      ${contentHtml}

      ${ctaText && ctaUrl ? `
      <div class="cta-wrap">
        <a href="${ctaUrl}" class="cta-button" target="_blank">${ctaText}</a>
      </div>` : ''}

      <div class="signature">
        <div class="signature-name">Aryan Raj</div>
        <div>Founder & Technical Lead, ETERNITY</div>
      </div>

      <div class="footer">
        <div>Meeting Host: <a href="mailto:harshraj1603@gmail.com">Aryan Raj</a> &middot; <a href="https://cal.com/aryan-raj-eternity/quick-talk">cal.com/aryan-raj-eternity/quick-talk</a></div>
        <div style="margin-top: 6px;">ETERNITY Software Studio &middot; New Delhi, India</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * 1. Booking Confirmation (Client)
 * Professional, clean confirmation for scheduled calls.
 */
async function sendBookingConfirmation({ attendeeName, attendeeEmail, startTime, endTime, meetingUrl, title, eventType }) {
  const formattedStart = formatDateTime(startTime);
  const formattedEnd = formatDateTime(endTime);
  const eventName = title || eventType || 'Quick Talk (Engineering & Architecture)';
  const url = meetingUrl || process.env.MEETING_URL || 'https://cal.com/aryan-raj-eternity/quick-talk';
  const name = attendeeName && attendeeName !== 'Valued Client' ? attendeeName : 'there';

  const contentHtml = `
    <p>Hi ${name},</p>
    <p>Your meeting with Aryan Raj has been scheduled. The details of the session are outlined below:</p>

    <table class="meta-table">
      <tr>
        <td class="meta-label">Session</td>
        <td class="meta-value">${eventName}</td>
      </tr>
      <tr>
        <td class="meta-label">Host</td>
        <td class="meta-value">Aryan Raj (ETERNITY)</td>
      </tr>
      <tr>
        <td class="meta-label">Scheduled Time</td>
        <td class="meta-value">${formattedStart}</td>
      </tr>
      ${endTime ? `
      <tr>
        <td class="meta-label">End Time</td>
        <td class="meta-value">${formattedEnd}</td>
      </tr>` : ''}
      <tr>
        <td class="meta-label">Platform</td>
        <td class="meta-value">Google Meet / Cal Video</td>
      </tr>
    </table>

    <p>If you have an existing codebase, technical documentation, or specific architecture requirements you would like reviewed prior to the discussion, feel free to reply directly to this email.</p>
    <p>If you need to reschedule or adjust your time, you can do so at any time using the link below.</p>
  `;

  const html = wrapEmailTemplate({
    title: 'Meeting Scheduled',
    subtitle: `Confirmed for ${formattedStart}`,
    contentHtml,
    ctaText: 'View Booking & Meeting Link',
    ctaUrl: url,
  });

  return sendBrevoEmail({
    to: { email: attendeeEmail, name: attendeeName },
    subject: `Meeting Confirmed: Quick Talk with Aryan Raj`,
    htmlContent: html,
    textContent: `Hi ${name},\n\nYour meeting with Aryan Raj is confirmed for ${formattedStart}.\n\nSession: ${eventName}\nPlatform: Google Meet / Cal Video\nBooking Link: ${url}\n\nIf you have materials to review in advance, reply directly to this email.\n\nAryan Raj\nETERNITY`,
  });
}

/**
 * 2. Admin Alert (Notification to Aryan Raj)
 * Concise internal notification.
 */
async function sendBookingAdminAlert({ attendeeName, attendeeEmail, startTime, endTime, eventType }) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.BREVO_SENDER_EMAIL || 'harshraj1603@gmail.com';
  const formattedStart = formatDateTime(startTime);

  const contentHtml = `
    <p>A new meeting has been booked via Cal.com.</p>

    <table class="meta-table">
      <tr>
        <td class="meta-label">Attendee</td>
        <td class="meta-value">${attendeeName || 'Unknown'}</td>
      </tr>
      <tr>
        <td class="meta-label">Email</td>
        <td class="meta-value"><a href="mailto:${attendeeEmail}" style="color: #ffffff; text-decoration: underline;">${attendeeEmail}</a></td>
      </tr>
      <tr>
        <td class="meta-label">Time</td>
        <td class="meta-value">${formattedStart}</td>
      </tr>
      <tr>
        <td class="meta-label">Event Type</td>
        <td class="meta-value">${eventType || 'quick-talk'}</td>
      </tr>
    </table>
  `;

  const html = wrapEmailTemplate({
    title: 'New Booking Notification',
    subtitle: `${attendeeName || 'Client'} has scheduled a session.`,
    contentHtml,
    ctaText: 'Open Cal.com Dashboard',
    ctaUrl: 'https://app.cal.com/bookings',
  });

  return sendBrevoEmail({
    to: { email: adminEmail, name: 'Aryan Raj' },
    subject: `New Booking: ${attendeeName || 'Client'} (${formattedStart})`,
    htmlContent: html,
    textContent: `New booking: ${attendeeName} (${attendeeEmail}) at ${formattedStart}. Event: ${eventType || 'quick-talk'}.`,
  });
}

/**
 * 3. Booking Status Update (Reschedule or Cancellation)
 */
async function sendBookingStatusUpdate({ attendeeName, attendeeEmail, startTime, status, meetingUrl }) {
  const isCancelled = status === 'CANCELLED';
  const formattedStart = formatDateTime(startTime);
  const url = meetingUrl || process.env.MEETING_URL || 'https://cal.com/aryan-raj-eternity/quick-talk';
  const name = attendeeName || 'there';

  const contentHtml = `
    <p>Hi ${name},</p>
    <p>${isCancelled
      ? `Your meeting originally scheduled for <strong>${formattedStart}</strong> has been cancelled.`
      : `Your meeting has been updated to <strong>${formattedStart}</strong>.`}</p>
    <p>If you need to select a different time or have questions, you can view available slots directly below.</p>
  `;

  const html = wrapEmailTemplate({
    title: isCancelled ? 'Meeting Cancelled' : 'Meeting Rescheduled',
    subtitle: isCancelled ? 'Your appointment has been cancelled' : `Rescheduled to ${formattedStart}`,
    contentHtml,
    ctaText: 'Select New Time Slot',
    ctaUrl: url,
  });

  return sendBrevoEmail({
    to: { email: attendeeEmail, name: attendeeName },
    subject: `Meeting Update: Quick Talk with Aryan Raj (${status})`,
    htmlContent: html,
    textContent: `Hi ${name},\n\nYour meeting has been ${status.toLowerCase()}. Reference time: ${formattedStart}.\n\nManage booking: ${url}\n\nAryan Raj\nETERNITY`,
  });
}

/**
 * 4. Inquiry Acknowledgment (Client)
 * Professional receipt acknowledging the project inquiry.
 */
async function sendInquiryReceipt({ name, email, service, budget, meetingUrl }) {
  const url = meetingUrl || process.env.MEETING_URL || 'https://cal.com/aryan-raj-eternity/quick-talk';
  const clientName = name || 'there';

  const contentHtml = `
    <p>Hi ${clientName},</p>
    <p>Thank you for contacting ETERNITY. We have received your project inquiry and our engineering team is reviewing your requirements.</p>

    <table class="meta-table">
      <tr>
        <td class="meta-label">Focus Area</td>
        <td class="meta-value">${service || 'Engineering & Architecture'}</td>
      </tr>
      <tr>
        <td class="meta-label">Budget Tier</td>
        <td class="meta-value">${budget || 'Flexible'}</td>
      </tr>
      <tr>
        <td class="meta-label">Response Time</td>
        <td class="meta-value">Within 24 business hours</td>
      </tr>
    </table>

    <p>If your project is time-critical or you prefer to discuss the technical scope directly, you can also schedule a brief 15 to 30 minute introductory call with Aryan Raj using the link below.</p>
  `;

  const html = wrapEmailTemplate({
    title: 'Inquiry Received',
    subtitle: 'We are reviewing your submission',
    contentHtml,
    ctaText: 'Schedule Technical Discussion',
    ctaUrl: url,
  });

  return sendBrevoEmail({
    to: { email, name: clientName },
    subject: `Inquiry Received — ETERNITY`,
    htmlContent: html,
    textContent: `Hi ${clientName},\n\nThank you for reaching out to ETERNITY. We have received your inquiry for ${service || 'Engineering'}.\n\nWe will review your submission and respond within 24 hours. To book a technical discussion directly, visit: ${url}\n\nAryan Raj\nETERNITY`,
  });
}

module.exports = {
  sendBrevoEmail,
  sendBookingConfirmation,
  sendBookingAdminAlert,
  sendBookingStatusUpdate,
  sendInquiryReceipt,
  formatDateTime,
};
