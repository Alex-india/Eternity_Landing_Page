/* ============================================================
   ETERNITY — JWT Authentication Middleware
   Verifies Bearer token from Authorization header or cookie.
   Attaches decoded user to req.user on success.
   ============================================================ */

const jwt = require('jsonwebtoken');

/**
 * Required auth — rejects request if no valid token.
 */
function requireAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please log in to access this resource.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      firstName: decoded.firstName,
      lastName: decoded.lastName,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired. Please log in again.',
      });
    }
    return res.status(401).json({
      error: 'Invalid token',
      message: 'Authentication failed. Please log in again.',
    });
  }
}

/**
 * Optional auth — attaches user if token present, but doesn't reject.
 */
function optionalAuth(req, res, next) {
  const token = extractToken(req);

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = {
        id: decoded.id,
        email: decoded.email,
        firstName: decoded.firstName,
        lastName: decoded.lastName,
      };
    } catch (err) {
      // Token invalid/expired — proceed without user
      req.user = null;
    }
  } else {
    req.user = null;
  }

  next();
}

/**
 * Extract JWT from Authorization header or cookie.
 */
function extractToken(req) {
  // Check Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Fallback to cookie
  if (req.cookies && req.cookies.eternity_token) {
    return req.cookies.eternity_token;
  }

  return null;
}

/**
 * Generate a JWT for a user.
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

module.exports = { requireAuth, optionalAuth, generateToken };
