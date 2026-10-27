'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const makeBot = require('../server/bot');

function setup() {
  const calls = [];
  const tg = async (method, body) => { calls.push({ method, body }); return {}; };
  const store = { docs: { 'data/users/U1': { acct: { phone: '0911000000', email: 'a@b.co' }, private: { fullName: 'Abebe' } } } };
  const db = { accounts: { 'k1': { chatId: 111 } } };
  const bot = makeBot({
    tg, tokFor: () => 't', port: 1, baseUrl: 'https://example.com', adminChat: null, bindAdmin() {},
    adminPhone: null, token: 'T', getDb: () => db, getStore: () => store, accKey: () => 'k1',
    findUid: () => null, normPhoneET: x => x, authApi: {}, pool: null, pgUpsert: async () => {}, isSusp: () => false,
  });
  return { bot, calls };
}

test('tapping an inline button edits the tapped text message in place', async () => {
  const { bot, calls } = setup();
  await bot.handle({ callback_query: { id: 'cb1', data: 'cart', message: { message_id: 55, text: 'menu', chat: { id: 111 } } } });
  const edit = calls.find(c => c.method === 'editMessageText');
  assert.ok(edit, 'expected editMessageText');
  assert.equal(edit.body.message_id, 55);
  assert.equal(calls.filter(c => c.method === 'sendMessage').length, 0, 'should not spawn a new message');
});

test('a typed text message is answered as a new message, not an edit', async () => {
  const { bot, calls } = setup();
  await bot.handle({ message: { message_id: 7, chat: { id: 111, type: 'private' }, text: '/help' } });
  assert.equal(calls.filter(c => c.method === 'editMessageText').length, 0);
  assert.ok(calls.some(c => c.method === 'sendMessage'));
});

test('typing indicator is sent for every incoming update', async () => {
  const { bot, calls } = setup();
  await bot.handle({ message: { message_id: 8, chat: { id: 111, type: 'private' }, text: '/help' } });
  assert.ok(calls.some(c => c.method === 'sendChatAction' && c.body.action === 'typing'));
});

test('inline query returns product articles and answers via answerInlineQuery', async () => {
  const calls = [];
  const tg = async (method, body) => { calls.push({ method, body }); return true; };
  const origFetch = global.fetch;
  global.fetch = async (url) => {
    assert.match(String(url), /\/api\/market\/products\?/);
    return { json: async () => ({ ok: true, total: 30, items: [
      { id: 'p1', title: 'ቡና', price: 250, unit: 'ኪሎ', stock: 4, imgs: ['img1'], shop: { name: 'ሱቅ', city: 'አዲስ አበባ' } },
      { id: 'p2', title: 'ሻይ', price: 80, unit: 'ጥቅል', stock: 0, imgs: [], shop: { name: 'ሱቅ2' } },
    ] }) };
  };
  try {
    const { bot } = setupWith(tg);
    await bot.handle({ inline_query: { id: 'iq1', from: { id: 9 }, query: 'ቡና', offset: '' } });
  } finally { global.fetch = origFetch; }
  const ans = calls.find(c => c.method === 'answerInlineQuery');
  assert.ok(ans, 'expected answerInlineQuery');
  assert.equal(ans.body.inline_query_id, 'iq1');
  assert.equal(ans.body.results.length, 2);
  assert.equal(ans.body.results[0].type, 'article');
  assert.equal(ans.body.results[0].id, 'p1');
  assert.equal(ans.body.next_offset, '2');
  assert.match(ans.body.results[0].reply_markup.inline_keyboard[0][0].url, /\/p\/p1$/);
});

function setupWith(tg) {
  const store = { docs: {} }, db = { accounts: {} };
  return { bot: makeBot({
    tg, tokFor: () => 't', port: 1, baseUrl: 'https://example.com', adminChat: null, bindAdmin() {},
    adminPhone: null, token: 'T', getDb: () => db, getStore: () => store, accKey: () => 'k', findUid: () => null,
    normPhoneET: x => x, authApi: {}, pool: null, pgUpsert: async () => {}, isSusp: () => false,
  }) };
}
