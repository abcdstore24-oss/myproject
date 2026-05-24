/**
 * Invitation Model
 *
 * FIX B-17: Added findPendingByEmailAndOrg() and expireById() so authService
 * can explicitly expire a prior pending invite before creating a new one,
 * guaranteeing only one valid token per email+org at any time.
 *
 * Note: Invitation.create() already had an UPDATE-to-expire clause inline,
 * but authService was not using it correctly (it called create() directly
 * without a prior lookup). The new helper methods make the intent explicit
 * and testable.
 */

const { query } = require('../config/database');
const crypto = require('crypto');

class Invitation {
  static generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  static async create({ email, org_id, invited_by, role = 'recruiter' }) {
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await query(
      `INSERT INTO invitations (token, email, org_id, invited_by, role, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [token, email, org_id, invited_by, role, expiresAt]
    );

    return token;
  }

  static async findByToken(token) {
    const rows = await query(
      `SELECT i.*, o.name as org_name, o.type as org_type
       FROM invitations i
       JOIN organizations o ON i.org_id = o.org_id
       WHERE i.token = ?`,
      [token]
    );
    return rows[0] || null;
  }

  static async markAccepted(token) {
    await query(
      `UPDATE invitations SET status = 'accepted' WHERE token = ?`,
      [token]
    );
  }

  // Expire all invitations whose expiry timestamp has passed
  static async expireOld() {
    await query(
      `UPDATE invitations SET status = 'expired'
       WHERE status = 'pending' AND expires_at < NOW()`
    );
  }

  // FIX B-17: Find any live pending invite for this email in this org
  static async findPendingByEmailAndOrg(email, orgId) {
    const rows = await query(
      `SELECT * FROM invitations
       WHERE email = ? AND org_id = ? AND status = 'pending'
       LIMIT 1`,
      [email, orgId]
    );
    return rows[0] || null;
  }

  // FIX B-17: Explicitly expire a single invitation by its primary key
  static async expireById(invitationId) {
    await query(
      `UPDATE invitations SET status = 'expired' WHERE invitation_id = ?`,
      [invitationId]
    );
  }

  static async getByOrg(orgId) {
    return await query(
      `SELECT i.invitation_id, i.email, i.role, i.status, i.expires_at, i.created_at,
              u.full_name as invited_by_name
       FROM invitations i
       JOIN users u ON i.invited_by = u.user_id
       WHERE i.org_id = ?
       ORDER BY i.created_at DESC
       LIMIT 50`,
      [orgId]
    );
  }
}

module.exports = Invitation;