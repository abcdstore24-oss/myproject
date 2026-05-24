/**
 * User Model
 *
 * FIX B-02: Removed User.findById().
 * It was a bare SELECT * that returned a partial row (no org JOIN, no is_active
 * accessible to callers). authService.changePassword() was calling it, meaning a
 * deactivated user could still change their password.
 *
 * All callers now use User.getById() which does the proper LEFT JOIN with
 * organizations and returns the full, consistent user shape used everywhere else.
 */

const { query } = require('../config/database');

class User {
  static async create({ email, password_hash, full_name, role, phone, org_id }) {
    const sql = `
      INSERT INTO users (email, password_hash, full_name, role, phone, org_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const result = await query(sql, [
      email,
      password_hash,
      full_name,
      role,
      phone || null,
      org_id || null,
    ]);
    return result.insertId;
  }

  static async findByEmail(email) {
    // Intentionally returns password_hash — needed only by login flow.
    const rows = await query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] || null;
  }

  // FIX B-02: ONLY canonical lookup — includes org JOIN + is_active field.
  // Used by authMiddleware, authService, and every controller.
  static async getById(userId) {
    const sql = `
      SELECT u.user_id, u.email, u.full_name, u.role, u.phone, u.org_id,
             u.is_active, u.created_at, u.updated_at,
             o.name AS org_name, o.type AS org_type
      FROM users u
      LEFT JOIN organizations o ON u.org_id = o.org_id
      WHERE u.user_id = ?
    `;
    const rows = await query(sql, [userId]);
    return rows[0] || null;
  }

  static async getAll() {
    const sql = `
      SELECT u.user_id, u.email, u.full_name, u.role, u.phone, u.org_id,
             u.is_active, u.created_at, u.updated_at,
             o.name AS org_name
      FROM users u
      LEFT JOIN organizations o ON u.org_id = o.org_id
      ORDER BY u.created_at DESC
    `;
    return await query(sql);
  }

  static async getByRole(role) {
    const sql = `
      SELECT u.user_id, u.email, u.full_name, u.role, u.phone, u.org_id,
             u.is_active, u.created_at, u.updated_at,
             o.name AS org_name
      FROM users u
      LEFT JOIN organizations o ON u.org_id = o.org_id
      WHERE u.role = ?
      ORDER BY u.created_at DESC
    `;
    return await query(sql, [role]);
  }

  static async update(userId, data) {
    const allowedFields = ['full_name', 'phone', 'is_active'];
    const updates = [];
    const values = [];

    Object.keys(data).forEach((key) => {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(data[key]);
      }
    });

    if (updates.length === 0) return false;

    values.push(userId);
    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  static async delete(userId) {
    const result = await query('DELETE FROM users WHERE user_id = ?', [userId]);
    return result.affectedRows > 0;
  }

  static async emailExists(email) {
    const rows = await query('SELECT user_id FROM users WHERE email = ?', [email]);
    return rows.length > 0;
  }

  static async updatePassword(userId, password_hash) {
    const result = await query(
      'UPDATE users SET password_hash = ? WHERE user_id = ?',
      [password_hash, userId]
    );
    return result.affectedRows > 0;
  }

  static async toggleStatus(userId) {
    const result = await query(
      'UPDATE users SET is_active = NOT is_active WHERE user_id = ?',
      [userId]
    );
    return result.affectedRows > 0;
  }

  static async getCountByRole() {
    return await query('SELECT role, COUNT(*) as count FROM users GROUP BY role');
  }

  static async getCandidates() {
    return await query(`
      SELECT user_id, email, full_name, phone, is_active, created_at
      FROM users
      WHERE role = 'candidate' AND is_active = TRUE
      ORDER BY full_name ASC
    `);
  }

  static async getByIds(userIds) {
    if (!userIds || userIds.length === 0) return [];
    const placeholders = userIds.map(() => '?').join(',');
    return await query(
      `SELECT user_id, email, full_name, role, phone, is_active
       FROM users WHERE user_id IN (${placeholders})`,
      userIds
    );
  }

  // All recruiters — used by admin. Org-scoped version is getRecruitersByOrg().
  static async getRecruiters() {
    const sql = `
      SELECT u.user_id, u.email, u.full_name, u.phone, u.org_id,
             u.is_active, u.created_at,
             o.name AS org_name
      FROM users u
      LEFT JOIN organizations o ON u.org_id = o.org_id
      WHERE u.role = 'recruiter' AND u.is_active = TRUE
      ORDER BY u.full_name ASC
    `;
    return await query(sql);
  }

  // Recruiters scoped to one org — used by org owner's team page.
  static async getRecruitersByOrg(orgId) {
    const sql = `
      SELECT user_id, email, full_name, phone, is_active, created_at
      FROM users
      WHERE role = 'recruiter' AND org_id = ?
      ORDER BY full_name ASC
    `;
    return await query(sql, [orgId]);
  }
}

module.exports = User;