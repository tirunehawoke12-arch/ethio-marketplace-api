'use strict';
/* AI ቀርፋፋ/ጠፍቶ ሲሆን ቪድዮው እንዳይቆም — ከተጠቃሚው ጽሑፍ በቀጥታ ቀላል እቅድ (ያለ AI) */
const clip = (s, n) => { s = String(s || '').trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };
function localPlan({ kind = 'other', sec = 30, notes = '', nPhotos = 0, brand = '' }) {
  const text = String(notes || ''), phone = (/(?:\+?251|0)[\s-]?\d{2}[\s\d-]{6,12}\d/.exec(text) || [''])[0].trim();
  const lines = text.split(/\n+|(?<=[።!?])\s+/).map(x => x.replace(/^[-•*\d.)\s]+/, '').trim()).filter(x => x.length > 2 && !(phone && x.replace(/\s|-/g, '').includes(phone.replace(/\s|-/g, '')))), addrL = lines.find(x => /አድራሻ|ባሕር ዳር|አዲስ አበባ|ጎንደር|ሐዋሳ|ሀዋሳ|መቀሌ|ድሬዳዋ|ጂማ|አዳማ|ፒያሳ|ቦሌ/.test(x)) || '', body = lines.filter(x => x !== addrL);
  const nm = String((/ስም[ዬዎ]?\s*[:፦]?\s*([^\s,፣።]+(?:\s+[^\s,፣።]+)?)/.exec(text) || [])[1] || brand || (body[0] && body[0].length <= 24 ? body[0] : '')).replace(/^(ስሜ|ስማችን|የንግዱ ስም)\s*(ነው)?\s*[:፦]?\s*/, '').replace(/\s*ነው$/, '').trim();
  const sc = [], rest = body.slice(); let hook = rest.shift() || nm || 'ሰላም'; if (/^(ስሜ|ስማችን|የንግዱ ስም)/.test(hook) && nm) hook = nm; const sub = rest.length > 3 ? rest.shift() : '';
  sc.push({ type: 'hook', head: clip(hook, 38), sub: clip(sub, 70), narr: clip([hook, sub].filter(Boolean).join('። '), 160), dur: 5 });
  while (rest.length > 1 && sc.length < 6) { const g = rest.splice(0, Math.min(3, rest.length)); sc.push({ type: 'list', head: clip(nm || 'ዋና ዋና ነጥቦች', 30), bullets: g.map(x => clip(x, 28)), narr: clip(g.join('። '), 200), dur: 6 }); }
  if (rest.length) sc.push({ type: 'text', head: clip(rest[0], 38), narr: clip(rest[0], 160), dur: 5 });
  sc.push({ type: 'cta', head: clip(nm || 'ያግኙን', 30), sub: 'አሁኑኑ ያግኙን', phone, addr: clip(addrL.replace(/^አድራሻ\s*[:፦]?\s*/, ''), 50), narr: phone ? 'ለበለጠ መረጃ ይደውሉ።' : 'አሁኑኑ ያግኙን።', dur: 5 });
  const total = sc.reduce((a, b) => a + b.dur, 0), k = Math.max(0.6, Math.min(2.2, sec / total)); sc.forEach((s, i) => { s.dur = Math.max(3, Math.min(12, Math.round(s.dur * k))); s.img = nPhotos ? i % nPhotos : -1; });
  return { brand: clip(nm, 30), theme: kind === 'greet' ? 5 : kind === 'edu' ? 6 : kind === 'story' ? 4 : 3, music: kind === 'ad' || kind === 'product' ? 'energetic' : 'calm', caption: clip(nm ? nm + ' — ' + hook : hook, 300), scenes: sc, local: true };
}
module.exports = { localPlan };
