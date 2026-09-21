/* ============================================================
   ETERNITY — Authentication Routes
   POST /api/auth/signup   — Register new user
   POST /api/auth/login    — Login with credentials
   GET  /api/auth/me       — Get current user from JWT
   POST /api/auth/logout   — Clear session
   ============================================================ */

const express = require('express');
const bcrypt = require('bcrypt');
const { query } = require('../db/connection');
const { requireAuth, generateToken } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 12;

/* ─── Validation Helpers ─── */

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateSignupInput(body) {
  const errors = {};

  if (!body.firstName || body.firstName.trim().length === 0) {
    errors.firstName = 'First name is required.';
  } else if (body.firstName.trim().length > 100) {
    errors.firstName = 'First name must be under 100 characters.';
  }

  if (!body.lastName || body.lastName.trim().length === 0) {
    errors.lastName = 'Last name is required.';
  } else if (body.lastName.trim().length > 100) {
    errors.lastName = 'Last name must be under 100 characters.';
  }

  if (!body.email || body.email.trim().length === 0) {
    errors.email = 'Email is required.';
  } else if (!isValidEmail(body.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (!body.password) {
    errors.password = 'Password is required.';
  } else if (body.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

function validateLoginInput(body) {
  const errors = {};

  if (!body.email || body.email.trim().length === 0) {
    errors.email = 'Email is required.';
  } else if (!isValidEmail(body.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (!body.password) {
    errors.password = 'Password is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/* ─── POST /api/auth/signup ─── */

router.post('/signup', async (req, res) => {
  try {
    const { isValid, errors } = validateSignupInput(req.body);
    if (!isValid) {
      return res.status(400).json({ error: 'Validation failed', errors });
    }

    const firstName = req.body.firstName.trim();
    const lastName = req.body.lastName.trim();
    const email = req.body.email.trim().toLowerCase();
    const password = req.body.password;

    // Check if email already exists
    const existing = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: 'Email already registered',
        message: 'An account with this email already exists.',
        errors: { email: 'Email already registered.' },
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert user
    const result = await query(
      `INSERT INTO users (first_name, last_name, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, first_name, last_name, email, created_at`,
      [firstName, lastName, email, passwordHash]
    );

    const user = result.rows[0];

    // Generate JWT
    const token = generateToken(user);

    console.log(`  ✓ New user registered: ${email}`);

    res.status(201).json({
      message: `Account created! Welcome to Eternity, ${firstName}!`,
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('  ✗ Signup error:', err.message);
    res.status(500).json({
      error: 'Server error',
      message: 'Something went wrong. Please try again.',
    });
  }
});

/* ─── POST /api/auth/login ─── */

router.post('/login', async (req, res) => {
  try {
    const { isValid, errors } = validateLoginInput(req.body);
    if (!isValid) {
      return res.status(400).json({ error: 'Validation failed', errors });
    }

    const email = req.body.email.trim().toLowerCase();
    const password = req.body.password;

    // Find user by email
    const result = await query(
      'SELECT id, first_name, last_name, email, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Incorrect email or password. Please try again.',
      });
    }

    const user = result.rows[0];

    // Compare password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Incorrect email or password. Please try again.',
      });
    }

    // Generate JWT
    const token = generateToken(user);

    // Update last login timestamp
    await query(
      'UPDATE users SET updated_at = NOW() WHERE id = $1',
      [user.id]
    );

    console.log(`  ✓ User logged in: ${email}`);

    res.json({
      message: `Welcome back, ${user.first_name}!`,
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('  ✗ Login error:', err.message);
    res.status(500).json({
      error: 'Server error',
      message: 'Something went wrong. Please try again.',
    });
  }
});

/* ─── GET /api/auth/me ─── */

router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, first_name, last_name, email, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'Your account could not be found.',
      });
    }

    const user = result.rows[0];

    res.json({
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    console.error('  ✗ Get user error:', err.message);
    res.status(500).json({
      error: 'Server error',
      message: 'Something went wrong. Please try again.',
    });
  }
});

/* ─── POST /api/auth/logout ─── */

router.post('/logout', (req, res) => {
  // JWT is stateless — client discards token.
  // This endpoint exists for consistency and future token blacklisting.
  res.json({ message: 'Logged out successfully.' });
});

module.exports = router;
