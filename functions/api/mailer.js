/**
 * Sending mail as a consumer Gmail account.
 *
 * A service account cannot do this. Domain-wide delegation, the mechanism that
 * lets a service account impersonate a user, requires Google Workspace, and
 * @gmail.com addresses are not Workspace. So the function authenticates as the
 * user with an OAuth refresh token instead, exchanging it for a short-lived
 * access token on each cold start.
 *
 * The refresh token comes from the same OAuth client the gmail skill already
 * uses, which carries the gmail.compose scope. compose covers sending, so no
 * new consent screen is needed.
 *
 * ONE OPERATIONAL GOTCHA: if that OAuth client is still in "Testing" publishing
 * status in the Google Cloud console, consumer refresh tokens expire after
 * seven days and this will start failing every week. The client has to be in
 * "In production" for an unattended function to keep working. See README.
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

let cachedAccessToken = null;
let cachedExpiry = 0;

function creds() {
  const raw = process.env.GMAIL_OAUTH;
  if (!raw) throw new Error('GMAIL_OAUTH secret not configured');
  return JSON.parse(raw);
}

/** Access tokens last an hour; reuse one across warm invocations. */
async function getAccessToken() {
  if (cachedAccessToken && Date.now() < cachedExpiry - 60_000) return cachedAccessToken;

  const { client_id, client_secret, refresh_token } = creds();

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id,
      client_secret,
      refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  const body = await res.json();
  if (!res.ok) {
    // invalid_grant almost always means the refresh token was revoked or aged
    // out under Testing-mode publishing status. Say so, because the fix is a
    // console setting rather than a code change.
    throw new Error(
      `gmail token refresh failed (${res.status}): ${body.error || 'unknown'}. ` +
        'If this is invalid_grant, the OAuth client is probably still in Testing ' +
        'publishing status, which expires consumer refresh tokens after 7 days.',
    );
  }

  cachedAccessToken = body.access_token;
  cachedExpiry = Date.now() + body.expires_in * 1000;
  return cachedAccessToken;
}

/** RFC 2047 encoding, so non-ASCII in a name or subject does not mangle. */
function encodeHeader(value) {
  // eslint-disable-next-line no-control-regex
  return /^[\x00-\x7F]*$/.test(value)
    ? value
    : `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
}

function base64url(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * @param {Object} opts
 * @param {string} opts.to
 * @param {string} opts.subject
 * @param {string} opts.html
 * @param {string} [opts.replyTo]
 * @param {Array<{filename: string, mimeType: string, content: Buffer}>} [opts.attachments]
 */
async function sendMail({ to, subject, html, replyTo, attachments = [] }) {
  const token = await getAccessToken();
  const boundary = `jj_${Math.random().toString(36).slice(2)}_${process.pid}`;

  const headers = [
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
  ];
  if (replyTo) headers.push(`Reply-To: ${replyTo}`);

  let raw;
  if (attachments.length === 0) {
    raw = [
      ...headers,
      'Content-Type: text/html; charset=UTF-8',
      '',
      html,
    ].join('\r\n');
  } else {
    const parts = [
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      '',
      html,
    ];
    for (const a of attachments) {
      parts.push(
        `--${boundary}`,
        `Content-Type: ${a.mimeType}; name="${a.filename}"`,
        `Content-Disposition: attachment; filename="${a.filename}"`,
        'Content-Transfer-Encoding: base64',
        '',
        // Gmail rejects unwrapped base64 past 998 chars per line.
        Buffer.from(a.content).toString('base64').replace(/(.{76})/g, '$1\r\n'),
      );
    }
    parts.push(`--${boundary}--`, '');

    raw = [
      ...headers,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      ...parts,
    ].join('\r\n');
  }

  const res = await fetch(SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: base64url(raw) }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`gmail send failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  return res.json();
}

module.exports = { sendMail };
