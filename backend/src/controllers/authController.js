const AuthService = require('../services/authService');

class AuthController {
  // ── Candidate registration ────────────────────────────────────────────────
  static async register(req, res) {
    try {
      const { email, password, full_name, phone } = req.body;
      const result = await AuthService.register({ email, password, full_name, phone });
      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken },
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message || 'Registration failed' });
    }
  }

  // ── Organization registration ─────────────────────────────────────────────
  static async registerOrganization(req, res) {
    try {
      const { org_name, org_type, email, password, full_name, phone } = req.body;
      const result = await AuthService.registerOrganization({
        org_name, org_type, email, password, full_name, phone,
      });
      res.status(201).json({
        success: true,
        message: 'Organization registered successfully',
        data: { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken },
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message || 'Organization registration failed' });
    }
  }

  // ── Verify invite token (GET — before showing accept form) ────────────────
  static async verifyInvite(req, res) {
    try {
      const { token } = req.query;
      if (!token) return res.status(400).json({ success: false, message: 'Token is required' });

      const data = await AuthService.verifyInviteToken(token);
      res.status(200).json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // ── Accept invite (POST — recruiter sets name + password) ─────────────────
  static async acceptInvite(req, res) {
    try {
      const { token, full_name, password, phone } = req.body;
      if (!token) return res.status(400).json({ success: false, message: 'Token is required' });

      const result = await AuthService.acceptInvite({ token, full_name, password, phone });
      res.status(201).json({
        success: true,
        message: 'Account created successfully. Welcome to TalentProctor!',
        data: { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken },
      });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message || 'Failed to accept invitation' });
    }
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  static async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await AuthService.login(email, password);
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken },
      });
    } catch (error) {
      res.status(401).json({ success: false, message: error.message || 'Login failed' });
    }
  }

  static async getCurrentUser(req, res) {
    try {
      const user = await AuthService.getCurrentUser(req.userId);
      res.status(200).json({ success: true, data: { user } });
    } catch (error) {
      res.status(404).json({ success: false, message: error.message || 'User not found' });
    }
  }

  static async refreshToken(req, res) {
    try {
      const result = await AuthService.refreshToken(req.userId);
      res.status(200).json({ success: true, data: { accessToken: result.accessToken } });
    } catch (error) {
      res.status(401).json({ success: false, message: error.message || 'Token refresh failed' });
    }
  }

  static async logout(req, res) {
    res.status(200).json({ success: true, message: 'Logout successful' });
  }

  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      await AuthService.changePassword(req.userId, currentPassword, newPassword);
      res.status(200).json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message || 'Password change failed' });
    }
  }
}

module.exports = AuthController;