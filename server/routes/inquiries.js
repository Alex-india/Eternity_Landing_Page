/* ============================================================
   ETERNITY — Inquiry Routes
   POST /api/inquiries      — Submit a new project inquiry
   GET  /api/inquiries      — List inquiries (authenticated)
   ============================================================ */

const express = require('express');
const { query } = require('../db/connection');
const { requireAuth } = require('../middleware/auth');
const { sendInquiryReceipt } = require('../services/email');

const router = express.Router();

/* ─── Validation ─── */

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateInquiryInput(body) {
  const errors = {};

  if (!body.name || body.name.trim().length === 0) {
    errors.name = 'Name is required.';
  } else if (body.name.trim().length > 200) {
    errors.name = 'Name must be under 200 characters.';
  }

  if (!body.email || body.email.trim().length === 0) {
    errors.email = 'Email is required.';
  } else if (!isValidEmail(body.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (!body.service) {
    errors.service = 'Please select a service.';
  }

  if (!body.budget) {
    errors.budget = 'Please select a budget tier.';
  }

  if (!body.message || body.message.trim().length === 0) {
    errors.message = 'Please provide a project summary.';
  } else if (body.message.trim().length > 5000) {
    errors.message = 'Message must be under 5000 characters.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/* ─── POST /api/inquiries ─── */

router.post('/', async (req, res) => {
  try {
    const { isValid, errors } = validateInquiryInput(req.body);
    if (!isValid) {
      return res.status(400).json({ error: 'Validation failed', errors });
    }

    const name = req.body.name.trim();
    const email = req.body.email.trim().toLowerCase();
    const service = req.body.service;
    const budget = req.body.budget;
    const message = req.body.message.trim();

    const result = await query(
      `INSERT INTO inquiries (name, email, service, budget, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at`,
      [name, email, service, budget, message]
    );

    const inquiry = result.rows[0];

    console.log(`  ✓ New inquiry from ${name} (${email}) — ID: ${inquiry.id}`);

    const meetingUrl = process.env.MEETING_URL || 'https://cal.com/aryan-raj-eternity/quick-talk';

    // Send confirmation email to client via Brevo (asynchronous)
    sendInquiryReceipt({
      name,
      email,
      service,
      budget,
      meetingUrl,
    }).catch((e) => console.error('  ✗ Error sending inquiry receipt email:', e.message));

    res.status(201).json({
      message: `Thank you, ${name}! Your inquiry has been received. We will get back to you within 24 hours.`,
      inquiry: {
        id: inquiry.id,
        createdAt: inquiry.created_at,
      },
      meetingUrl: meetingUrl,
    });
  } catch (err) {
    console.error('  ✗ Inquiry submission error:', err.message);
    res.status(500).json({
      error: 'Server error',
      message: 'Something went wrong. Please try again.',
    });
  }
});

/* ─── GET /api/inquiries (admin/authenticated) ─── */

router.get('/', requireAuth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [inquiriesResult, countResult] = await Promise.all([
      query(
        `SELECT id, name, email, service, budget, message, status, created_at
         FROM inquiries
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      query('SELECT COUNT(*) FROM inquiries'),
    ]);

    res.json({
      inquiries: inquiriesResult.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      },
    });
  } catch (err) {
    console.error('  ✗ List inquiries error:', err.message);
    res.status(500).json({
      error: 'Server error',
      message: 'Something went wrong. Please try again.',
    });
  }
});

module.exports = router;
