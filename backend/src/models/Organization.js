const { query } = require('../config/database');

class Organization {
  static async create({ name, type, domain }) {
    const sql = `INSERT INTO organizations (name, type, domain) VALUES (?, ?, ?)`;
    const result = await query(sql, [name, type || 'company', domain || null]);
    return result.insertId;
  }

  static async getById(orgId) {
    const rows = await query('SELECT * FROM organizations WHERE org_id = ?', [orgId]);
    return rows[0] || null;
  }

  static async getAll() {
    return await query('SELECT * FROM organizations ORDER BY created_at DESC');
  }

  static async getMemberCount(orgId) {
    const rows = await query(
      `SELECT COUNT(*) as count FROM users WHERE org_id = ? AND role IN ('recruiter','org_owner')`,
      [orgId]
    );
    return rows[0].count;
  }
}

module.exports = Organization;