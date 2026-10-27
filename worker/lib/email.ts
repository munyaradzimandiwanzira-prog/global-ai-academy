/**
 * Transactional email via Brevo (free tier: 300 emails/day).
 * When BREVO_API_KEY is not set (local dev), emails are logged instead of sent and the
 * caller can surface the link in development so flows remain testable.
 */
export interface EmailMessage {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text: string;
}

export function emailConfigured(env: Env): boolean {
  return !!env.BREVO_API_KEY;
}

function parseFrom(from: string): { name: string; email: string } {
  const m = /^(.*)<(.+)>$/.exec(from.trim());
  return m ? { name: m[1].trim(), email: m[2].trim() } : { name: 'Global AI Academy', email: from.trim() };
}

export async function sendEmail(env: Env, msg: EmailMessage): Promise<boolean> {
  if (!env.BREVO_API_KEY) {
    console.log(`[email:dev] to=${msg.to} subject="${msg.subject}"\n${msg.text}`);
    return false;
  }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: parseFrom(env.EMAIL_FROM),
      to: [{ email: msg.to, name: msg.toName }],
      subject: msg.subject,
      htmlContent: msg.html,
      textContent: msg.text,
    }),
  });
  if (!res.ok) {
    console.error('[email] Brevo error', res.status, await res.text());
    return false;
  }
  return true;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

export function actionEmail(opts: { appName: string; name: string; heading: string; intro: string; cta: string; url: string; outro: string }) {
  const html = `<!doctype html><html><body style="margin:0;background:#F5F0E6;font-family:Inter,Arial,sans-serif;color:#142B52">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #E2D6BC">
  <tr><td style="background:#142B52;padding:20px 28px;color:#fff;font-family:Georgia,serif;font-size:20px;font-weight:bold">${esc(opts.appName)}</td></tr>
  <tr><td style="height:6px;background:repeating-linear-gradient(90deg,#D4A64A 0 10px,#142B52 10px 20px)"></td></tr>
  <tr><td style="padding:28px">
    <p style="margin:0 0 8px;font-size:15px">Mhoroi / Salibonani ${esc(opts.name)},</p>
    <h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:24px">${esc(opts.heading)}</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6">${esc(opts.intro)}</p>
    <p style="margin:0 0 24px"><a href="${esc(opts.url)}" style="display:inline-block;background:#23807F;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">${esc(opts.cta)}</a></p>
    <p style="margin:0;font-size:13px;color:#5b6577;line-height:1.6">${esc(opts.outro)}<br/>If the button does not work, paste this link into your browser:<br/><span style="word-break:break-all">${esc(opts.url)}</span></p>
  </td></tr></table></td></tr></table></body></html>`;
  const text = `Hi ${opts.name},\n\n${opts.heading}\n\n${opts.intro}\n\n${opts.cta}: ${opts.url}\n\n${opts.outro}\n\n— ${opts.appName}`;
  return { html, text };
}
