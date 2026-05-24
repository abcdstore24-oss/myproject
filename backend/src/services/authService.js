/**
 * AuthService
 *
 * FIX B-02 (changePassword): Was calling User.findById() — a bare SELECT *
 * that has no is_active check, allowing deactivated users to change their
 * password. Now calls User.getById() and explicitly checks is_active.
 *
 * FIX B-17 (sendInvite): Added a duplicate pending-invite guard. If a pending
 * invitation already exists for this email+org, it is expired before a new
 * one is created, preventing multiple valid tokens for the same address.
 */

const User         = require('../models/User');
const Organization = require('../models/Organization');
const Invitation   = require('../models/Invitation');
const { hashPassword, comparePassword } = require('../utils/passwordHelper');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwtHelper');
const { sendRecruiterInvite } = require('./emailService');

class AuthService {
  // ── Candidate self-registration ───────────────────────────────────────────
  static async register({ email, password, full_name, phone }) {
    if (await User.emailExists(email)) {
      throw new Error('Email already registered');
    }

    const password_hash = await hashPassword(password);
    const userId = await User.create({
      email,
      password_hash,
      full_name,
      role: 'candidate',
      phone,
      org_id: null,
    });

    const user = await User.getById(userId);
    return {
      user,
      accessToken:  generateAccessToken({ userId: user.user_id, email: user.email, role: user.role }),
      refreshToken: generateRefreshToken({ userId: user.user_id }),
    };
  }

  // ── Organization registration ─────────────────────────────────────────────
  static async registerOrganization({ org_name, org_type, email, password, full_name, phone }) {
    if (await User.emailExists(email)) {
      throw new Error('Email already registered');
    }

    const orgId = await Organization.create({ name: org_name, type: org_type });

    const password_hash = await hashPassword(password);
    const userId = await User.create({
      email,
      password_hash,
      full_name,
      role: 'org_owner',
      phone,
      org_id: orgId,
    });

    const user = await User.getById(userId);
    return {
      user,
      accessToken:  generateAccessToken({ userId: user.user_id, email: user.email, role: user.role }),
      refreshToken: generateRefreshToken({ userId: user.user_id }),
    };
  }

  // ── Recruiter invite ──────────────────────────────────────────────────────
  // FIX B-17: Expire any existing pending invite for this email+org before
  // creating a new one, so only one valid token exists at a time.
  static async sendInvite({ inviterUserId, email, orgId, orgName, inviterName }) {
    if (await User.emailExists(email)) {
      throw new Error('This email is already registered on TalentProctor');
    }

    // Expire any existing pending invitation for this email in this org
    const existingInvite = await Invitation.findPendingByEmailAndOrg(email, orgId);
    if (existingInvite) {
      await Invitation.expireById(existingInvite.invitation_id);
    }

    const token = await Invitation.create({
      email,
      org_id: orgId,
      invited_by: inviterUserId,
    });

    await sendRecruiterInvite({ toEmail: email, orgName, inviterName, token });

    return token;
  }

  // ── Verify invite token ───────────────────────────────────────────────────
  static async verifyInviteToken(token) {
    await Invitation.expireOld();

    const invite = await Invitation.findByToken(token);
    if (!invite)                      throw new Error('Invitation not found');
    if (invite.status === 'accepted') throw new Error('This invitation has already been used');
    if (invite.status === 'expired')  throw new Error('This invitation has expired');

    return {
      email:   invite.email,
      orgName: invite.org_name,
      orgType: invite.org_type,
      orgId:   invite.org_id,
    };
  }

  // ── Accept invite ─────────────────────────────────────────────────────────
  static async acceptInvite({ token, full_name, password, phone }) {
    await Invitation.expireOld();

    const invite = await Invitation.findByToken(token);
    if (!invite)                      throw new Error('Invitation not found');
    if (invite.status === 'accepted') throw new Error('This invitation has already been used');
    if (invite.status === 'expired')  throw new Error('This invitation has expired');

    if (await User.emailExists(invite.email)) {
      throw new Error('An account with this email already exists');
    }

    const password_hash = await hashPassword(password);
    const userId = await User.create({
      email:    invite.email,
      password_hash,
      full_name,
      role:     invite.role,
      phone,
      org_id:   invite.org_id,
    });

    await Invitation.markAccepted(token);

    const user = await User.getById(userId);
    return {
      user,
      accessToken:  generateAccessToken({ userId: user.user_id, email: user.email, role: user.role }),
      refreshToken: generateRefreshToken({ userId: user.user_id }),
    };
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  static async login(email, password) {
    const user = await User.findByEmail(email);
    if (!user) throw new Error('Invalid email or password');
    if (!user.is_active) throw new Error('Account is deactivated. Please contact administrator.');

    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) throw new Error('Invalid email or password');

    const { password_hash, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      accessToken:  generateAccessToken({ userId: user.user_id, email: user.email, role: user.role }),
      refreshToken: generateRefreshToken({ userId: user.user_id }),
    };
  }

  static async getCurrentUser(userId) {
    const user = await User.getById(userId);
    if (!user) throw new Error('User not found');
    return user;
  }

  static async refreshToken(userId) {
    const user = await User.getById(userId);
    if (!user)           throw new Error('User not found');
    if (!user.is_active) throw new Error('Account is deactivated');
    return {
      accessToken: generateAccessToken({ userId: user.user_id, email: user.email, role: user.role }),
    };
  }

  // ── Change password ───────────────────────────────────────────────────────
  // FIX B-02: Was using User.findById() (bare SELECT *) — no active-user check.
  // Now uses User.getById() and explicitly guards deactivated accounts.
  static async changePassword(userId, currentPassword, newPassword) {
    const user = await User.getById(userId);
    if (!user)           throw new Error('User not found');
    if (!user.is_active) throw new Error('Account is deactivated');

    // getById does not return password_hash (it selects specific columns).
    // Fetch password_hash separately via findByEmail using the known email.
    const fullUser = await User.findByEmail(user.email);
    const isPasswordValid = await comparePassword(currentPassword, fullUser.password_hash);
    if (!isPasswordValid) throw new Error('Current password is incorrect');

    await User.updatePassword(userId, await hashPassword(newPassword));
    return true;
  }
}

module.exports = AuthService;