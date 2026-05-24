const User         = require('../models/User');
const Organization = require('../models/Organization');
const Invitation   = require('../models/Invitation');
const AuthService  = require('../services/authService');

class OrgController {
  // GET /api/org/me — org details + stats for the owner's dashboard
  static async getMyOrg(req, res) {
    try {
      const org = await Organization.getById(req.user.org_id);
      if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

      const memberCount = await Organization.getMemberCount(req.user.org_id);

      res.status(200).json({
        success: true,
        data: { org: { ...org, member_count: memberCount } },
      });
    } catch (error) {
      console.error('getMyOrg error:', error.message);
      res.status(500).json({ success: false, message: 'Failed to fetch organization' });
    }
  }

  // GET /api/org/team — list all recruiters in the org
  static async getTeam(req, res) {
    try {
      const recruiters  = await User.getRecruitersByOrg(req.user.org_id);
      const invitations = await Invitation.getByOrg(req.user.org_id);

      res.status(200).json({
        success: true,
        data: { recruiters, invitations },
      });
    } catch (error) {
      console.error('getTeam error:', error.message);
      res.status(500).json({ success: false, message: 'Failed to fetch team' });
    }
  }

  // POST /api/org/invite — send a recruiter invite
  static async inviteRecruiter(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      const org = await Organization.getById(req.user.org_id);

      await AuthService.sendInvite({
        inviterUserId: req.userId,
        email,
        orgId:    req.user.org_id,
        orgName:  org.name,
        inviterName: req.user.full_name,
      });

      res.status(200).json({
        success: true,
        message: `Invitation sent to ${email}`,
      });
    } catch (error) {
      console.error('inviteRecruiter error:', error.message);
      res.status(400).json({ success: false, message: error.message || 'Failed to send invitation' });
    }
  }

  // DELETE /api/org/team/:userId — remove a recruiter from the org
  static async removeRecruiter(req, res) {
    try {
      const { userId } = req.params;

      // Confirm the user actually belongs to this org
      const member = await User.getById(userId);
      if (!member || member.org_id !== req.user.org_id || member.role !== 'recruiter') {
        return res.status(404).json({ success: false, message: 'Recruiter not found in your organization' });
      }

      // Deactivate rather than hard-delete to preserve historical test data
      await User.update(userId, { is_active: false });

      res.status(200).json({ success: true, message: 'Recruiter removed from organization' });
    } catch (error) {
      console.error('removeRecruiter error:', error.message);
      res.status(500).json({ success: false, message: 'Failed to remove recruiter' });
    }
  }
}

module.exports = OrgController;