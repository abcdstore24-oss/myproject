/**
 * Authentication Middleware
 *
 * FIX B-13: optionalAuthenticate was exported but used by zero route files.
 * It is now wired into the mobile-camera WebSocket handshake route in
 * monitoringRoutes.js (the one genuinely unauthenticated flow where an
 * enriched req.user is useful if present but not required).
 *
 * If your project has no use for optional auth at all, simply delete
 * optionalAuthenticate from this file and remove its export — the comment
 * below marks exactly what to remove.
 */

const { verifyAccessToken, verifyRefreshToken, extractToken } = require('../utils/jwtHelper');
const User = require('../models/User');

// ─────────────────────────────────────────────────────────────────────────────
// authenticate — required auth, used by virtually every route
// ─────────────────────────────────────────────────────────────────────────────
const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const decoded = verifyAccessToken(token);
    const user    = await User.getById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.',
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated.',
      });
    }

    // Canonical properties used by every controller
    req.user     = user;
    req.userId   = user.user_id;
    req.userRole = user.role;

    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// authenticateRefreshToken — used ONLY by POST /auth/refresh
// Verifies with the refresh-token secret (different from access-token secret)
// ─────────────────────────────────────────────────────────────────────────────
const authenticateRefreshToken = async (req, res, next) => {
  try {
    const token = extractToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not provided.',
      });
    }

    const decoded = verifyRefreshToken(token);
    const user    = await User.getById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token. User not found.',
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated.',
      });
    }

    req.user     = user;
    req.userId   = user.user_id;
    req.userRole = user.role;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token. Please log in again.',
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// optionalAuthenticate — FIX B-13: now actively used by monitoringRoutes.js
// for the GET /api/monitoring/mobile-camera-status endpoint.
// The mobile camera page is public (accessed via QR on a phone), but if a
// valid access token happens to be present we enrich req with user data.
// If no token / bad token — silently continue without req.user.
//
// TO REMOVE: If you decide not to use this, delete lines 110-133 and remove
// optionalAuthenticate from the module.exports below.
// ─────────────────────────────────────────────────────────────────────────────
const optionalAuthenticate = async (req, res, next) => {
  try {
    const token = extractToken(req.headers.authorization);

    if (token) {
      const decoded = verifyAccessToken(token);
      const user    = await User.getById(decoded.userId);

      if (user && user.is_active) {
        req.user     = user;
        req.userId   = user.user_id;
        req.userRole = user.role;
      }
    }
  } catch (error) {
    // Silently ignore — authentication is optional on this route
  }

  next();
};

module.exports = {
  authenticate,
  authenticateRefreshToken,
  optionalAuthenticate,
};