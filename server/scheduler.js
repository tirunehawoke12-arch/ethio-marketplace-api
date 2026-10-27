'use strict';
/* ===== ጊዜ-ሰሌዳ ሥራዎች (ኢትዮጵያ ሰዓት = UTC+3) =====
   • በየ 5 ደቂቃ፦ ማንቂያዎች ይመሳሰላሉ
   • ዕለታዊ (ጠዋት 8 ሰዓት ሲያልፍ)፦ ለሻጭ/አሰሪ ማጠቃለያ፤ ለአድሚን የቀን ሪፖርት (7 ሰዓት)
   በሰርቨር እንደገና መጀመር ጊዜ እንዳይደገም «ዛሬ ተልኳል» ምልክት በ `al/meta` ይቀመጣል። */
const DAY = 24 * 3600e3, OFFSET = 3 * 3600e3;
const addis = ts => new Date(ts + OFFSET);
const dayKey = ts => addis(ts).toISOString().slice(0, 10);
const hourOf = ts => addis(ts).getUTCHours();

function sellerDigest(col, uid, now) {              // ለአንድ ተጠቃሚ የማጠቃለያ ጽሑፍ (ባዶ ከሆነ '')
  const since = now - DAY, lines = [], web = [];
  const shops = Object.values(col('mk/shops')).filter(s => s.uid === uid), sids = new Set(shops.map(s => s.id));
  if (sids.size) {
    const O = Object.values(col('mk/orders')).filter(o => sids.has(o.shopId));
    const todo = O.filter(o => ['paid', 'preparing'].includes(o.status)).length, fresh = O.filter(o => o.ts > since).length;
    if (todo) { lines.push(`📦 ለማዘጋጀት/ለመላክ የሚጠብቁ ትዕዛዞች፦ ${todo}`); web.push(['📦 ትዕዛዞች', '/orders']); }
    if (fresh) lines.push(`🆕 ባለፉት 24 ሰዓት አዲስ ትዕዛዝ፦ ${fresh}`);
  }
  const emp = Object.values(col('pp/employers')).find(e => e.uid === uid);
  if (emp) { const n = Object.values(col('pp/apps')).filter(a => a.employerUid === uid && !a.invite && a.ts > since).length; if (n) { lines.push(`👥 አዲስ አመልካቾች፦ ${n}`); web.push(['👥 አመልካቾች', '/me']); } }
  const pg = Object.values(col('pg/pages')).filter(p => p.uid === uid).map(p => p.id);
  if (pg.length) { const n = Object.values(col('pg/responses')).filter(r => pg.includes(r.pageId) && !r.seen).length; if (n) { lines.push(`📬 ያልተነበቡ የቅጽ መልሶች፦ ${n}`); web.push(['📬 መልሶች', '/me']); } }
  const un = Object.values(col('ch/threads')).filter(t => (t.members || []).includes(uid)).reduce((a, t) => a + ((t.unread || {})[uid] | 0), 0);
  if (un) { lines.push(`💬 ያልተመለሱ መልእክቶች፦ ${un}`); web.push(['💬 መልእክቶች', '/me/messages']); }
  return { text: lines.length ? '☀️ ቅድመ-ጠዋት ማጠቃለያ\n\n' + lines.join('\n') : '', web };
}
function adminReport(col, now, newUsers) {
  const since = now - DAY, O = Object.values(col('mk/orders')), paid = O.filter(o => o.ts > since && ['paid', 'preparing', 'shipped', 'delivered', 'settled'].includes(o.status));
  const lines = [
    `🆕 አዲስ አካውንቶች፦ ${newUsers | 0}`, `🧾 አዲስ ትዕዛዞች፦ ${O.filter(o => o.ts > since).length} · የተከፈለ፦ ${paid.length} (${paid.reduce((a, o) => a + (o.total || 0), 0).toLocaleString('en-US')} ብር)`,
    '', '⏳ የሚጠብቁ፦',
    `• ክፍያ ለማረጋገጥ፦ ${O.filter(o => o.status === 'payment_submitted').length}`, `• ክርክር፦ ${O.filter(o => o.status === 'disputed').length}`, `• ተመላሽ፦ ${O.filter(o => o.status === 'refund_pending').length}`,
    `• ለሻጭ ለመክፈል፦ ${O.filter(o => o.status === 'delivered').length}`, `• ሱቅ ለማጽደቅ፦ ${Object.values(col('mk/shops')).filter(s => s.status === 'pending').length}`,
    `• የባጅ ጥያቄ፦ ${Object.values(col('tr/requests')).filter(q => q.status === 'pending').length}`, `• ክፍት ሪፖርት፦ ${Object.values(col('tr/reports')).filter(r => r.status === 'open').length}`];
  return '📊 የቀን ሪፖርት\n\n' + lines.join('\n');
}

function start({ col, saveMany, notifyUser, notifyAdmin, alerts, baseUrl, prefsOf, users, now = () => Date.now() }) {
  const meta = () => col('al/meta').d || (col('al/meta').d = { id: 'd' });
  async function daily() {
    const t = now(), day = dayKey(t), h = hourOf(t), m = meta(); let changed = false;
    if (h >= 7 && m.adminDay !== day) { m.adminDay = day; changed = true; try { const rep = adminReport(col, t, users().filter(a => a.ts > t - DAY).length); notifyAdmin(rep, baseUrl && /^https:/.test(baseUrl) ? { rows: [[{ text: '🛡 አድሚን', callback_data: 'ad' }]] } : undefined); } catch (e) { console.warn('admin report', e.message); } }
    if (h >= 8 && m.digestDay !== day) {
      m.digestDay = day; changed = true;
      for (const uid of users().map(a => a.uid)) { try { const pf = prefsOf(uid); if (pf.mute || pf.digest === false) continue; const d = sellerDigest(col, uid, t); if (d.text) notifyUser(uid, d.text, { rows: /^https:/.test(baseUrl || '') ? d.web.map(([l, p]) => [{ text: l, url: baseUrl + p }]) : [] }); } catch (e) { } }
    }
    if (changed) { try { await saveMany([['al/meta', 'd']]); } catch (e) { } }
  }
  const timers = [setInterval(() => alerts.sweep().catch(e => console.warn('alerts', e.message)), 5 * 60e3), setInterval(() => daily().catch(e => console.warn('daily', e.message)), 10 * 60e3)];
  timers.forEach(t => t.unref && t.unref());
  return { daily, stop: () => timers.forEach(clearInterval) };
}
module.exports = { start, sellerDigest, adminReport, dayKey, hourOf };
