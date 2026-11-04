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
  const ai = AIM.create({ GEMINI_API_KEY: 'g' }, f); const r = await ai.chat('a', 'ሰላም'); assert.match(r, /መልስ[\s\S]*📚 ምንጮች፦\n• who\.int — https:\/\/who\.int\/x$/); assert.equal(tools[0], true);
  const f2 = async (u, o) => { const b = JSON.parse(o.body); if (b.tools) return { ok: false, status: 400, json: async () => ({ error: { message: 'bad' } }) }; return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'ቀላል' }] } }] }) }; };
  assert.equal(await AIM.create({ GEMINI_API_KEY: 'g' }, f2).chat('b', 'x'), 'ቀላል'); assert.match(AIM.SYS, /📚 ምንጭ/);
});
