/**
 * User Controller
 * Handles user management HTTP requests (Admin only)
 *
 * FIX B-05: getUsersByRole previously rejected 'org_owner' as invalid.
 * The DB schema ENUM is ('admin','org_owner','recruiter','candidate').
 * Updated VALID_ROLES to match all four values.
 */

const User = require('../models/User');
const { hashPassword } = require('../utils/passwordHelper');

// All roles that exist in the DB ENUM — single source of truth for validation
const VALID_ROLES = ['admin', 'org_owner', 'recruiter', 'candidate'];

class UserController {
  /**
   * Get all users
   * GET /api/users
   */
  static async getAllUsers(req, res) {
    try {
      const users = await User.getAll();

      res.status(200).json({
        success: true,
        data: {
          users,
          count: users.length,
        },
      });
    } catch (error) {
      console.error('Get all users error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
      });
    }
  }

  /**
   * Get users by role
   * GET /api/users/role/:role
   *
   * FIX B-05: VALID_ROLES now includes 'org_owner'.
   */
  static async getUsersByRole(req, res) {
    try {
      const { role } = req.params;

      if (!VALID_ROLES.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`,
        });
      }

      const users = await User.getByRole(role);

      res.status(200).json({
        success: true,
        data: {
          users,
          count: users.length,
          role,
        },
      });
    } catch (error) {
      console.error('Get users by role error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
      });
    }
  }

  /**
   * Get user by ID
   * GET /api/users/:id
   */
  static async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await User.getById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      console.error('Get user by ID error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user',
      });
    }
  }

  /**
   * Create new user (Admin only)
   * POST /api/users
   */
  static async createUser(req, res) {
    try {
      const { email, password, full_name, role, phone, organization } = req.body;

      if (role && !VALID_ROLES.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`,
        });
      }

      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered',
        });
      }

      const password_hash = await hashPassword(password);

      const userId = await User.create({
        email,
        password_hash,
        full_name,
        role: role || 'candidate',
        phone,
        organization,
      });

      const user = await User.getById(userId);

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: { user },
      });
    } catch (error) {
      console.error('Create user error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to create user',
      });
    }
  }

  /**
   * Update user
   * PUT /api/users/:id
   */
  static async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { full_name, phone, organization, is_active } = req.body;

      const existingUser = await User.getById(id);
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const updateData = {};
      if (full_name  !== undefined) updateData.full_name  = full_name;
      if (phone      !== undefined) updateData.phone      = phone;
      if (organization !== undefined) updateData.organization = organization;
      if (is_active  !== undefined) updateData.is_active  = is_active;

      const updated = await User.update(id, updateData);

      if (!updated) {
        return res.status(400).json({
          success: false,
          message: 'No changes made',
        });
      }

      const user = await User.getById(id);

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: { user },
      });
    } catch (error) {
      console.error('Update user error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to update user',
      });
    }
  }

  /**
   * Delete user
   * DELETE /api/users/:id
   */
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;

      const existingUser = await User.getById(id);
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      if (parseInt(id) === req.userId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete your own account',
        });
      }

      const deleted = await User.delete(id);

      if (!deleted) {
        return res.status(500).json({
          success: false,
          message: 'Failed to delete user',
        });
      }

      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      console.error('Delete user error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user',
      });
    }
  }

  /**
   * Toggle user status
   * PATCH /api/users/:id/toggle-status
   */
  static async toggleUserStatus(req, res) {
    try {
      const { id } = req.params;

      const existingUser = await User.getById(id);
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      if (parseInt(id) === req.userId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot deactivate your own account',
        });
      }

      await User.toggleStatus(id);

      const user = await User.getById(id);

      res.status(200).json({
        success: true,
        message: `User ${user.is_active ? 'activated' : 'deactivated'} successfully`,
        data: { user },
      });
    } catch (error) {
      console.error('Toggle user status error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle user status',
      });
    }
  }

  /**
   * Get user statistics
   * GET /api/users/stats
   */
  static async getUserStats(req, res) {
    try {
      const allUsers = await User.getAll();
      const countByRole = await User.getCountByRole();

      const stats = {
        total: allUsers.length,
        active: allUsers.filter((u) => u.is_active).length,
        inactive: allUsers.filter((u) => !u.is_active).length,
        byRole: countByRole.reduce((acc, item) => {
          acc[item.role] = parseInt(item.count);
          return acc;
        }, {}),
      };

      res.status(200).json({
        success: true,
        data: { stats },
      });
    } catch (error) {
      console.error('Get user stats error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch statistics',
      });
    }
  }
}

module.exports = UserController;