'use strict';
/* ===== ኢሜይል መላኪያ — በነጻ እቅድ የሚሠሩ አቅራቢዎች (ቅድሚያ በዚህ ቅደም ተከተል) =====
   1) RESEND_API_KEY   (resend.com — ነጻ እቅድ አለው፤ ያለ ዶሜይን ማረጋገጫ ወደ ራስዎ ኢሜይል ብቻ ይልካል)
   2) BREVO_API_KEY    (brevo.com — ነጻ እቅድ አለው፤ MAIL_FROM የተረጋገጠ ላኪ መሆን አለበት)
   3) SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS (ለምሳሌ Gmail SMTP + App Password፤ `nodemailer` ያስፈልጋል)
   MAIL_FROM — ለምሳሌ "Etio Market <onboarding@resend.dev>" (Gmail SMTP ከሆነ ባዶ ቢሆን SMTP_USER ይጠቀማል) */
const FROM = () => process.env.MAIL_FROM || (process.env.SMTP_USER ? `Etio Digital Market <${process.env.SMTP_USER}>` : 'Etio Digital Market <onboarding@resend.dev>');
const configured = () => (process.env.RESEND_API_KEY ? 'resend' : process.env.BREVO_API_KEY ? 'brevo' : process.env.SMTP_HOST ? 'smtp' : '');
const parseFrom = f => { const m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(f); return m ? { name: m[1].trim() || 'Etio Digital Market', email: m[2].trim() } : { name: 'Etio Digital Market', email: f.trim() }; };
const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function send({ to, subject, text, html }) {
  const p = configured(); if (!p) throw new Error('mail_not_configured');
  html = html || `<div style="font-family:sans-serif;white-space:pre-wrap">${esc(text)}</div>`;
  if (p === 'resend') {
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'content-type': 'application/json' }, body: JSON.stringify({ from: FROM(), to: [to], subject, text, html }) });
    if (!r.ok) throw new Error('resend ' + r.status + ' ' + (await r.text()).slice(0, 200));
  } else if (p === 'brevo') {
    const f = parseFrom(FROM()), r = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json' }, body: JSON.stringify({ sender: f, to: [{ email: to }], subject, textContent: text, htmlContent: html }) });
    if (!r.ok) throw new Error('brevo ' + r.status + ' ' + (await r.text()).slice(0, 200));
  } else {
    let nm; try { nm = require('nodemailer'); } catch (e) { throw new Error('nodemailer_missing — run npm install'); }
    const port = Number(process.env.SMTP_PORT || 465);
    await nm.createTransport({ host: process.env.SMTP_HOST, port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }).sendMail({ from: FROM(), to, subject, text, html });
  }
}
module.exports = { send, configured };
