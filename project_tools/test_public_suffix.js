'use strict';
require('../public-suffix.js');
const assert = require('assert');
const psl = globalThis.WebClipPublicSuffix;
assert(psl, 'WebClipPublicSuffix is not available');
const cases = [
  ['example.com', 'example.com', 'example.com', 'com'],
  ['sub.example.com', 'example.com', 'sub.example.com', 'com'],
  ['a.b.example.co.uk', 'example.co.uk', 'b.example.co.uk', 'co.uk'],
  ['foo.github.io', 'foo.github.io', 'foo.github.io', 'github.io'],
  ['bar.foo.github.io', 'foo.github.io', 'bar.foo.github.io', 'github.io'],
  ['www.city.kawasaki.jp', 'city.kawasaki.jp', 'www.city.kawasaki.jp', 'kawasaki.jp'],
  ['a.www.ck', 'www.ck', 'a.www.ck', 'ck'],
  ['пример.рф', 'xn--e1afmkfd.xn--p1ai', 'xn--e1afmkfd.xn--p1ai', 'xn--p1ai'],
  ['127.0.0.1', '127.0.0.1', '127.0.0.1', '127.0.0.1']
];
for (const [host, base, third, suffix] of cases) {
  const h = psl.hierarchy(host);
  assert.strictEqual(h.base, base, `${host}: base`);
  assert.strictEqual(h.third, third, `${host}: third`);
  assert.strictEqual(h.publicSuffix, suffix, `${host}: suffix`);
}
assert(psl.ruleCounts.exact > 9000, 'PSL exact rules unexpectedly small');
assert(psl.ruleCounts.wildcard > 200, 'PSL wildcard rules unexpectedly small');
assert(psl.ruleCounts.exception >= 8, 'PSL exception rules unexpectedly small');
console.log(`PSL OK: exact=${psl.ruleCounts.exact}, wildcard=${psl.ruleCounts.wildcard}, exception=${psl.ruleCounts.exception}`);
