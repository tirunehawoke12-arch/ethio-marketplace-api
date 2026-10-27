const test = require('node:test'), assert = require('node:assert');
const { norm, hit } = require('../server/amnorm');
test('ተመሳሳይ ድምጽ ፊደላት ይመሳሰላሉ', () => {
  assert.equal(norm('ሰላም'), norm('ሠላም')); assert.equal(norm('ሀገር'), norm('ሐገር')); assert.equal(norm('ሀገር'), norm('ኀገር'));
  assert.equal(norm('አበበ'), norm('ዐበበ')); assert.equal(norm('ፀሐይ'), norm('ጸሐይ')); assert.equal(norm('ሃይማኖት'), norm('ሓይማኖት'));
});
test('hit፦ ብዙ ቃል ቅደም ተከተል አይመለከትም፣ ሥርዓተ ነጥብ እና ትላልቅ ፊደል አይለይም', () => {
  assert.ok(hit('አናጺ በአዲስ አበባ፣ ልምድ ያለው', 'አበባ አናጺ')); assert.ok(hit('Hotel Selam', 'selam hotel')); assert.ok(hit('ሠላም ሱቅ', 'ሰላም'));
  assert.ok(!hit('አናጺ', 'ሹፌር')); assert.ok(hit('anything', ''));
});
