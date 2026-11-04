const test = require('node:test'), assert = require('node:assert'), zlib = require('zlib');
const D = require('../server/docout'), AIM = require('../server/ai');
const items = [{ n: 1, title: 'Cell', en: 'Cell membrane\n• Lipid bilayer', am: 'የሕዋስ ሽፋን\n• የስብ ንብርብር' }, { n: 2, en: 'Long. '.repeat(400), am: 'ረዥም። '.repeat(400) }];
test('PDF፦ ትክክለኛ ራስጌ/ፋይል፣ ፎንት ተካቷል፣ ገጾች ይፈጠራሉ', () => { const b = D.buildPdf('Bio', items); assert.equal(b.slice(0, 5).toString(), '%PDF-'); assert.match(b.toString('latin1'), /FontFile2/); assert.match(b.toString('latin1'), /%%EOF$/); assert.ok(b.length > 20000); });
test('PPTX፦ ዚፕ ትክክል፣ ስላይዶች በ ዋና+ትርጉም አምድ፣ ረዥም ጽሑፍ ወደ ብዙ ስላይድ ይከፈላል', () => {
  const b = D.buildPptx('Bio', items), names = []; let p = b.readUInt32LE(b.length - 6), n = b.readUInt16LE(b.length - 12);
  const cd = b.readUInt32LE(b.length - 6); let q = cd; for (let i = 0; i < n; i++) { const nl = b.readUInt16LE(q + 28), xl = b.readUInt16LE(q + 30), cl = b.readUInt16LE(q + 32); names.push(b.slice(q + 46, q + 46 + nl).toString()); q += 46 + nl + xl + cl; }
  assert.ok(names.includes('ppt/slides/slide1.xml') && names.includes('[Content_Types].xml') && names.includes('ppt/presentation.xml')); assert.ok(names.filter(x => /slides\/slide\d+\.xml$/.test(x)).length >= 3);
  const off = b.readUInt32LE(cd + 42), nl = b.readUInt16LE(off + 26), csz = b.readUInt32LE(off + 18); assert.equal(b.slice(off + 30, off + 30 + nl).toString(), '[Content_Types].xml'); assert.match(zlib.inflateRawSync(b.slice(off + 30 + nl, off + 30 + nl + csz)).toString(), /presentationml/);
});
test('splitBoth፦ [[EN]]/[[AM]] ይለያል፤ ምልክት ከሌለ ሁሉም አማርኛ', () => { assert.deepEqual(D.splitBoth('[[EN]]\nHi\n[[AM]]\nሰላም'), { en: 'Hi', am: 'ሰላም' }); assert.deepEqual(D.splitBoth('ሰላም'), { en: '', am: 'ሰላም' }); });
test('AI፦ Gemini ፍለጋ ምንጮች ከመልሱ በኋላ ይጨመራሉ፤ ፍለጋ ሲከለከል ያለሱ ይመልሳል', async () => {
  let n = 0, tools = [];
  const f = async (u, o) => { const b = JSON.parse(o.body); tools.push(!!b.tools); n++; if (b.tools && n === 1) return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'መልስ' }] }, groundingMetadata: { groundingChunks: [{ web: { uri: 'https://who.int/x', title: 'who.int' } }, { web: { uri: 'https://who.int/x', title: 'dup' } }] } }] }) }; return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'ያለ ምንጭ' }] } }] }) }; };
  const ai = AIM.create({ GEMINI_API_KEY: 'g', AI_GROUNDING: '1' }, f); const r = await ai.chat('a', 'ሰላም'); assert.match(r, /መልስ[\s\S]*📚 ምንጮች፦\n• who\.int — https:\/\/who\.int\/x$/); assert.equal(tools[0], true);
  const f2 = async (u, o) => { const b = JSON.parse(o.body); if (b.tools) return { ok: false, status: 400, json: async () => ({ error: { message: 'bad' } }) }; return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'ቀላል' }] } }] }) }; };
  assert.equal(await AIM.create({ GEMINI_API_KEY: 'g', AI_GROUNDING: '1' }, f2).chat('b', 'x'), 'ቀላል');
  const f3 = async (u, o) => { const b = JSON.parse(o.body); if (b.tools) return { ok: false, status: 429, json: async () => ({ error: { message: 'quota' } }) }; return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'ያለ ፍለጋ' }] } }] }) }; };
  assert.equal(await AIM.create({ GEMINI_API_KEY: 'g', AI_GROUNDING: '1' }, f3).chat('c', 'x'), 'ያለ ፍለጋ'); const f4 = async (u, o) => { assert.ok(!JSON.parse(o.body).tools); return f3(u, o); }; assert.equal(await AIM.create({ GEMINI_API_KEY: 'g' }, f4).chat('d', 'x'), 'ያለ ፍለጋ'); assert.match(AIM.SYS, /📚 ምንጭ/);
});
test('ድምፅ፦ transcribe (Gemini ኦዲዮ inlineData) እና speak (PCM)፤ Claude ላይ ግልጽ ስህተት', async () => {
  let seen = null; const f = async (u, o) => { const b = JSON.parse(o.body); if (/tts/.test(u)) { seen = { u, rm: b.generationConfig.responseModalities }; return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;codec=pcm;rate=24000', data: Buffer.alloc(480).toString('base64') } }] } }] }) }; } seen = { audio: b.contents[0].parts[0].inlineData }; return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'ሰላም' }] } }] }) }; };
  const ai = AIM.create({ GEMINI_API_KEY: 'g' }, f); assert.equal(await ai.transcribe(Buffer.from('OggS'), 'audio/ogg'), 'ሰላም'); assert.equal(seen.audio.mimeType, 'audio/ogg');
  const a = await ai.speak('ሰላም'); assert.equal(a.rate, 24000); assert.equal(a.pcm.length, 480); assert.deepEqual(seen.rm, ['AUDIO']);
  const f2 = async (u) => (/tts/.test(u) ? { ok: false, status: 404, json: async () => ({}) } : { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '[[EMPTY]]' }] } }] }) }); const ai2 = AIM.create({ GEMINI_API_KEY: 'g' }, f2); assert.equal(await ai2.speak('x'), null); assert.equal(await ai2.transcribe(Buffer.from('x')), '');
  await assert.rejects(() => AIM.create({ ANTHROPIC_API_KEY: 'k' }, f).transcribe(Buffer.from('x')), /ai_no_audio/);
});
function entry(b, name) { const n = b.readUInt16LE(b.length - 12); let q = b.readUInt32LE(b.length - 6); for (let i = 0; i < n; i++) { const nl = b.readUInt16LE(q + 28), xl = b.readUInt16LE(q + 30), cl = b.readUInt16LE(q + 32), nm = b.slice(q + 46, q + 46 + nl).toString(), off = b.readUInt32LE(q + 42); if (nm === name) { const l = b.readUInt16LE(off + 26), csz = b.readUInt32LE(q + 20); return zlib.inflateRawSync(b.slice(off + 30 + l, off + 30 + l + csz)).toString(); } q += 46 + nl + xl + cl; } return ''; }
test('ፎንት ምርጫ፦ PPTX በተመረጠው ፎንት፣ መጠን ይለወጣል፤ PDF ይሠራል፤ ያልታወቀ ምርጫ → ነባሪ', () => {
  const x = entry(D.buildPptx('B', items, { preset: 'modern', size: 'l' }), 'ppt/slides/slide1.xml'); assert.match(x, /typeface="Ebrima"/); assert.match(x, /typeface="Arial"/); assert.doesNotMatch(x, /Nyala/); assert.match(x, /sz="1[89]00"|sz="2000"/);
  assert.match(entry(D.buildPptx('B', items, { preset: 'zzz' }), 'ppt/slides/slide1.xml'), /typeface="Nyala"/);
  for (const k of Object.keys(D.PRESETS)) assert.equal(D.buildPdf('B', items, { preset: k, size: 's' }).slice(0, 5).toString(), '%PDF-'); assert.ok(D.buildPdf('B', items, { size: 'l' }).length > 20000);
});
test('አውድ፦ ርዕስ፣ ቀዳሚ/ቀጣይ ስላይድ እና ቋሚ ቃላት ወደ ትርጉም ጥያቄ ይገባሉ', async () => {
  let sys = ''; const f = async (u, o) => { sys = JSON.parse(o.body).system; return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: 'ትርጉም' }] }) }; };
  const ai = AIM.create({ ANTHROPIC_API_KEY: 'k' }, f); await ai.slideTr('Bio', { title: 'Cell', blocks: [{ k: 'p', t: 'x' }] }, 1, 3, { prev: 'PREV TEXT', next: 'NEXT TEXT', gloss: [['cell membrane', 'የሕዋስ ሽፋን']], outline: '1. A; 2. B' });
  assert.match(sys, /ርዕስ፦ Bio/); assert.match(sys, /PREV TEXT/); assert.match(sys, /NEXT TEXT/); assert.match(sys, /cell membrane = የሕዋስ ሽፋን/); assert.match(sys, /1\. A; 2\. B/);
});
