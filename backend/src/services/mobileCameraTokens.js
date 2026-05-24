/**
 * mobileCameraTokens.js
 * In-memory store for short-lived mobile camera session tokens.
 * Token → { assignmentId, testId, candidateId, expiresAt }
 * Expires after 10 minutes (enough time to scan QR and connect).
 */

const crypto = require('crypto');

const tokenStore = new Map();
const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Create a new mobile camera token
 */
function createToken(assignmentId, testId, candidateId) {
  const token = crypto.randomBytes(24).toString('hex');
  tokenStore.set(token, {
    assignmentId,
    testId,
    candidateId,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });
  return token;
}

/**
 * Validate and consume a token (one-time use after connection)
 * Returns the session data or null if invalid/expired
 */
function validateToken(token) {
  const session = tokenStore.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    tokenStore.delete(token);
    return null;
  }
  return session;
}

/**
 * Delete a token explicitly
 */
function deleteToken(token) {
  tokenStore.delete(token);
}

// Clean up expired tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of tokenStore.entries()) {
    if (now > session.expiresAt) {
      tokenStore.delete(token);
    }
  }
}, 5 * 60 * 1000);

module.exports = { createToken, validateToken, deleteToken };
