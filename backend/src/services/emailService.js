/**
 * Email Service
 * Sends transactional emails (invite links etc.)
 *
 * Setup: add these to your .env
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_USER=you@gmail.com
 *   SMTP_PASS=your-app-password
 *   SMTP_FROM=TalentProctor <no-reply@talentproctor.com>
 *   FRONTEND_URL=http://localhost:5173
 *
 * If SMTP_HOST is not set, emails are logged to the console instead
 * (useful during local development — grab the invite link from terminal).
 */

const nodemailer = require('nodemailer');

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

// Build transporter lazily so a missing SMTP config doesn't crash startup
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  if (!process.env.SMTP_HOST) return null;

  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return _transporter;
}

async function sendMail({ to, subject, html }) {
  const transporter = getTransporter();

  if (!transporter) {
    // Dev fallback — print to console so you can still test the invite flow
    console.log('\n========== EMAIL (no SMTP configured) ==========');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:    ${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}`);
    console.log('================================================\n');
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'TalentProctor <no-reply@talentproctor.com>',
    to,
    subject,
    html,
  });
}

/**
 * Send recruiter invite email
 */
async function sendRecruiterInvite({ toEmail, orgName, inviterName, token }) {
  const acceptUrl = `${frontendUrl}/invite/accept?token=${token}`;

  await sendMail({
    to: toEmail,
    subject: `You've been invited to join ${orgName} on TalentProctor`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#1e40af">TalentProctor</h2>
        <p>Hi,</p>
        <p><strong>${inviterName}</strong> has invited you to join
           <strong>${orgName}</strong> as a Recruiter on TalentProctor.</p>
        <p>Click the button below to set up your account.
           This link expires in <strong>24 hours</strong>.</p>
        <a href="${acceptUrl}"
           style="display:inline-block;background:#1e40af;color:#fff;
                  padding:12px 24px;border-radius:6px;text-decoration:none;
                  font-weight:600;margin:16px 0">
          Accept Invitation
        </a>
        <p style="color:#6b7280;font-size:13px">
          Or paste this link in your browser:<br/>
          <a href="${acceptUrl}">${acceptUrl}</a>
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>
        <p style="color:#9ca3af;font-size:12px">
          If you weren't expecting this invitation, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

module.exports = { sendRecruiterInvite };