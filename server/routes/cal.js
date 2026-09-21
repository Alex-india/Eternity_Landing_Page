/* ============================================================
   ETERNITY — Cal.com & Meeting Routes
   GET  /api/cal/url               — Returns configured meeting URL
   GET  /api/cal/bookings          — List all bookings (authenticated)
   POST /api/cal/webhook           — Cal.com Webhook receiver (syncs + emails)
   POST /api/cal/send-confirmation — Trigger confirmation email to client
   GET  /api/cal/email-status      — Check Brevo connection & IP status
   ============================================================ */

const express = require('express');
const { query } = require('../db/connection');
const { requireAuth } = require('../middleware/auth');
const {
  sendBookingConfirmation,
  sendBookingAdminAlert,
  sendBookingStatusUpdate,
} = require('../services/email');

const router = express.Router();

const DEFAULT_MEETING_URL = 'https://cal.com/aryan-raj-eternity/quick-talk';

/* ─── GET /api/cal/url (Public) ─── */
router.get('/url', (req, res) => {
  const meetingUrl = process.env.MEETING_URL || DEFAULT_MEETING_URL;
  res.json({
    meetingUrl,
    host: 'Aryan Raj',
    agency: 'ETERNITY',
    eventType: 'quick-talk',
  });
});

/* ─── GET /api/cal/email-status (Diagnostics for Brevo) ─── */
router.get('/email-status', async (req, res) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return res.json({
      configured: false,
      message: 'BREVO_API_KEY is not set in server/.env',
    });
  }

  try {
    const checkRes = await fetch('https://api.brevo.com/v3/account', {
      headers: { 'api-key': apiKey },
    });
    const data = await checkRes.json();

    if (!checkRes.ok) {
      const isIpRestricted = Boolean(data.message && data.message.includes('authorised_ips'));
      return res.status(200).json({
        configured: true,
        connected: false,
        ipRestricted: isIpRestricted,
        message: data.message,
        help: isIpRestricted
          ? 'Visit https://app.brevo.com/security/authorised_ips and add your IP or disable IP restrictions.'
          : 'Check your Brevo API key and permissions.',
      });
    }

    res.json({
      configured: true,
      connected: true,
      email: data.email,
      companyName: data.companyName,
      plan: data.plan,
    });
  } catch (err) {
    res.status(500).json({
      configured: true,
      connected: false,
      error: err.message,
    });
  }
});

/* ─── GET /api/cal/bookings (Authenticated) ─── */
router.get('/bookings', requireAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const countResult = await query('SELECT COUNT(*) FROM bookings');
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await query(
      `SELECT id, booking_uid, event_type, title, start_time, end_time,
              attendee_name, attendee_email, status, meeting_url, created_at
       FROM bookings
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      bookings: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('  ✗ Error fetching bookings:', err.message);
    res.status(500).json({ error: 'Server error', message: 'Failed to retrieve bookings.' });
  }
});

/* ─── POST /api/cal/send-confirmation (Send Booking Email Directly) ─── */
router.post('/send-confirmation', async (req, res) => {
  try {
    const { attendeeName, attendeeEmail, startTime, endTime, title } = req.body;

    if (!attendeeEmail || !attendeeEmail.includes('@')) {
      return res.status(400).json({ error: 'A valid attendeeEmail is required.' });
    }

    const meetingUrl = process.env.MEETING_URL || DEFAULT_MEETING_URL;

    console.log(`  [email] Triggering confirmation email to ${attendeeEmail}...`);

    const emailResult = await sendBookingConfirmation({
      attendeeName: (attendeeName || 'Valued Client').trim(),
      attendeeEmail: attendeeEmail.trim().toLowerCase(),
      startTime: startTime || new Date(),
      endTime: endTime || null,
      meetingUrl,
      title: title || 'Quick Talk with Aryan Raj',
    });

    if (!emailResult.success) {
      return res.status(502).json({
        error: 'Brevo email delivery failed',
        details: emailResult.error,
        ipRestricted: emailResult.ipRestricted,
        help: emailResult.ipRestricted
          ? 'Add your current IP to https://app.brevo.com/security/authorised_ips'
          : undefined,
      });
    }

    // Also send admin notification
    sendBookingAdminAlert({
      attendeeName: attendeeName || 'Valued Client',
      attendeeEmail: attendeeEmail.trim().toLowerCase(),
      startTime: startTime || new Date(),
      endTime,
      eventType: 'quick-talk',
    }).catch((e) => console.error('  ✗ Admin alert error:', e.message));

    res.json({
      message: `Confirmation email sent successfully to ${attendeeEmail}`,
      messageId: emailResult.messageId,
    });
  } catch (err) {
    console.error('  ✗ Error in send-confirmation endpoint:', err.message);
    res.status(500).json({ error: 'Server error', message: err.message });
  }
});

/* ─── POST /api/cal/webhook (Cal.com Webhook Listener) ─── */
router.post('/webhook', async (req, res) => {
  try {
    const event = req.body;
    console.log(`  [cal] Webhook received: ${event.triggerEvent || 'UNKNOWN'}`);

    const triggerEvent = event.triggerEvent || event.event;
    const payload = event.payload || event;

    if (!payload) {
      return res.status(400).json({ error: 'Empty payload' });
    }

    const bookingUid = payload.uid || payload.bookingUid || `manual-${Date.now()}`;
    const eventType = payload.eventTitle || payload.type || 'quick-talk';
    const title = payload.title || 'Quick talk with Aryan Raj';
    const startTime = payload.startTime ? new Date(payload.startTime) : null;
    const endTime = payload.endTime ? new Date(payload.endTime) : null;

    let attendeeName = 'Unknown';
    let attendeeEmail = 'unknown@example.com';

    if (Array.isArray(payload.attendees) && payload.attendees.length > 0) {
      attendeeName = payload.attendees[0].name || attendeeName;
      attendeeEmail = payload.attendees[0].email || attendeeEmail;
    } else if (payload.organizer) {
      attendeeName = payload.name || attendeeName;
      attendeeEmail = payload.email || attendeeEmail;
    }

    let status = 'ACCEPTED';
    if (triggerEvent === 'BOOKING_CANCELLED') {
      status = 'CANCELLED';
    } else if (triggerEvent === 'BOOKING_RESCHEDULED') {
      status = 'RESCHEDULED';
    }

    const meetingUrl = process.env.MEETING_URL || DEFAULT_MEETING_URL;

    // Upsert booking into PostgreSQL
    await query(
      `INSERT INTO bookings (
         booking_uid, event_type, title, start_time, end_time,
         attendee_name, attendee_email, status, meeting_url, raw_payload, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       ON CONFLICT (booking_uid) DO UPDATE SET
         status = EXCLUDED.status,
         start_time = EXCLUDED.start_time,
         end_time = EXCLUDED.end_time,
         raw_payload = EXCLUDED.raw_payload,
         updated_at = NOW()`,
      [
        bookingUid,
        eventType,
        title,
        startTime,
        endTime,
        attendeeName,
        attendeeEmail,
        status,
        meetingUrl,
        JSON.stringify(payload),
      ]
    );

    console.log(`  ✓ Cal.com booking synced: ${attendeeName} (${attendeeEmail}) [${status}]`);

    // ── Send Transactional Emails via Brevo ──
    if (status === 'ACCEPTED') {
      // 1. Send confirmation to client
      sendBookingConfirmation({
        attendeeName,
        attendeeEmail,
        startTime,
        endTime,
        meetingUrl,
        title,
        eventType,
      }).catch((e) => console.error('  ✗ Error sending booking confirmation:', e.message));

      // 2. Send alert to Aryan Raj / ETERNITY Admin
      sendBookingAdminAlert({
        attendeeName,
        attendeeEmail,
        startTime,
        endTime,
        eventType,
        rawPayload: payload,
      }).catch((e) => console.error('  ✗ Error sending admin alert:', e.message));
    } else if (status === 'CANCELLED' || status === 'RESCHEDULED') {
      // Send cancellation or rescheduling notice to client
      sendBookingStatusUpdate({
        attendeeName,
        attendeeEmail,
        startTime,
        status,
        meetingUrl,
      }).catch((e) => console.error('  ✗ Error sending status update email:', e.message));
    }

    res.status(200).json({ received: true, status, bookingUid });
  } catch (err) {
    console.error('  ✗ Cal.com webhook error:', err.message);
    res.status(500).json({ error: 'Webhook processing failed', message: err.message });
  }
});

module.exports = router;
