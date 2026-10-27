const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.claimpointsolutions.com').replace(/\/$/, '');

function esc(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// One shared HTML wrapper, brand colors from the locked palette, so every
// email looks consistent without repeating the header/footer markup.
function wrapper(bodyHtml) {
  return `
  <div style="font-family: Arial, sans-serif; background: #F1EFFF; padding: 32px 16px;">
    <div style="max-width: 480px; margin: 0 auto; background: #FCFBF8; border-radius: 16px; overflow: hidden;">
      <div style="background: #17152B; padding: 24px 32px;">
        <span style="color: #FCFBF8; font-size: 18px; font-weight: 700;">ClaimPoint</span>
      </div>
      <div style="padding: 32px;">
        ${bodyHtml}
      </div>
      <div style="padding: 20px 32px; border-top: 1px solid #E7E5F0; font-size: 12px; color: #686579;">
        ClaimPoint Solutions provides banking and recovery services through licensed financial partners. Recovery outcomes are not guaranteed.
      </div>
    </div>
  </div>`;
}

function button(text, url) {
  return `<a href="${url}" style="display:inline-block; background:#5B4BFF; color:#FCFBF8; padding:12px 24px; border-radius:10px; text-decoration:none; font-weight:600; margin-top:16px;">${text}</a>`;
}

export const emailTemplates = {
  welcome: (name) => ({
    subject: 'Welcome to ClaimPoint',
    html: wrapper(`
      <h2 style="color:#17152B;">Welcome, ${esc(name)}</h2>
      <p style="color:#686579; line-height:1.6;">Your ClaimPoint account is ready. Verify your identity to unlock full access to deposits, withdrawals, and transfers.</p>
      ${button('Verify your identity', `${APP_URL}/verify`)}
    `),
  }),

  claimSubmitted: (name, reference) => ({
    subject: `Claim ${reference} received`,
    html: wrapper(`
      <h2 style="color:#17152B;">Claim submitted</h2>
      <p style="color:#686579; line-height:1.6;">Hi ${esc(name)}, your claim <strong>${esc(reference)}</strong> is now under review. We typically respond within 24 to 72 hours.</p>
      ${button('View your claim', `${APP_URL}/dashboard`)}
    `),
  }),

  claimStatusChanged: (name, reference, status) => ({
    subject: `Update on claim ${reference}`,
    html: wrapper(`
      <h2 style="color:#17152B;">Claim status updated</h2>
      <p style="color:#686579; line-height:1.6;">Hi ${esc(name)}, your claim <strong>${esc(reference)}</strong> is now <strong>${status.replace(/_/g, ' ')}</strong>.</p>
      ${button('View details', `${APP_URL}/dashboard`)}
    `),
  }),

  verificationSubmitted: (name) => ({
    subject: 'Verification received',
    html: wrapper(`
      <h2 style="color:#17152B;">Documents received</h2>
      <p style="color:#686579; line-height:1.6;">Hi ${esc(name)}, your identity verification is under review. This typically takes 24 to 72 hours.</p>
    `),
  }),

  verificationStatusChanged: (name, status) => {
    const messages = {
      verified: 'Your identity has been verified. All account features are now available.',
      rejected: 'Your verification could not be approved. Please contact support for next steps.',
      additional_info_required: 'We need more information to complete your verification.',
    };
    return {
      subject: 'Verification update',
      html: wrapper(`
        <h2 style="color:#17152B;">Verification update</h2>
        <p style="color:#686579; line-height:1.6;">Hi ${esc(name)}, ${messages[status] || `your verification status is now ${status.replace(/_/g, ' ')}.`}</p>
        ${button('View your account', `${APP_URL}/dashboard`)}
      `),
    };
  },

  transactionConfirmation: (name, type, amount, reference) => ({
    subject: `${type} confirmation - ${reference}`,
    html: wrapper(`
      <h2 style="color:#17152B;">${type} received</h2>
      <p style="color:#686579; line-height:1.6;">Hi ${esc(name)}, your ${type.toLowerCase()} of $${amount.toLocaleString()} (${esc(reference)}) is being processed.</p>
    `),
  }),

  passwordChanged: (name) => ({
    subject: 'Your password was changed',
    html: wrapper(`
      <h2 style="color:#17152B;">Security alert</h2>
      <p style="color:#686579; line-height:1.6;">Hi ${esc(name)}, your ClaimPoint password was just changed. If this wasn't you, contact support immediately.</p>
    `),
  }),

  newLogin: (name) => ({
    subject: 'New login to your account',
    html: wrapper(`
      <h2 style="color:#17152B;">Security alert</h2>
      <p style="color:#686579; line-height:1.6;">Hi ${esc(name)}, there was a new login to your ClaimPoint account. If this wasn't you, change your password and contact support immediately.</p>
    `),
  }),

  productUpdate: (name, subject, message) => ({
    subject,
    html: wrapper(`
      <h2 style="color:#17152B;">${esc(subject)}</h2>
      <p style="color:#686579; line-height:1.6;">Hi ${esc(name)},</p>
      <p style="color:#686579; line-height:1.6; white-space:pre-line;">${esc(message)}</p>
    `),
  }),

  claimComment: (name, reference, category, message) => ({
    subject: `Update on your claim ${reference}`,
    html: `
        <p>Hi ${esc(name)},</p>
        <p>ClaimPoint has posted an update on your ${esc(category)} claim (${esc(reference)}):</p>
        <blockquote style="border-left: 3px solid #5B4BFF; padding-left: 12px; color: #333;">${esc(message)}</blockquote>
        <p>You can view the full claim and reply from your ClaimPoint dashboard.</p>
      `,
  }),
};
