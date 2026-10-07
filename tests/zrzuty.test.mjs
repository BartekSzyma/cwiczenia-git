import { test } from 'node:test';
import assert from 'node:assert/strict';
import { osadz } from '../tools/osadz-zrzuty.mjs';

const HTML = '<p>a</p>\n<script id="zrzuty">\nconst ZRZUTY = {};\n</script>\n</body>';
const PLIKI = [{ klucz: '01-test', mime: 'image/png', dane: Buffer.from('abc') }];

test('osadz zastępuje blok zrzuty obiektem z data URI', () => {
  const wynik = osadz(HTML, PLIKI);
  assert.match(wynik, /<script id="zrzuty">\nconst ZRZUTY = \{/);
  assert.ok(wynik.includes('"01-test": "data:image/png;base64,YWJj"'));
  assert.ok(wynik.startsWith('<p>a</p>') && wynik.endsWith('</body>'));
});

test('osadz jest idempotentne', () => {
  assert.equal(osadz(osadz(HTML, PLIKI), PLIKI), osadz(HTML, PLIKI));
});

test('osadz zgłasza błąd bez bloku zrzuty', () => {
  assert.throws(() => osadz('<p>brak</p>', PLIKI), /Brak bloku/);
});
