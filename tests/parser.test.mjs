import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zaladuj, j } from './zaladuj.mjs';

const A = zaladuj();

test('tokenizuj: spacje, tabulatory, cudzysłowy', () => {
  assert.deepEqual(j(A.tokenizuj('git checkout main')), { tokeny: ['git', 'checkout', 'main'] });
  assert.deepEqual(j(A.tokenizuj('  git\tcheckout    main  ')), { tokeny: ['git', 'checkout', 'main'] });
  assert.deepEqual(j(A.tokenizuj('git checkout -b "zla nazwa"')), { tokeny: ['git', 'checkout', '-b', 'zla nazwa'] });
  assert.deepEqual(j(A.tokenizuj('git checkout ""')), { tokeny: ['git', 'checkout', ''] });
  assert.deepEqual(j(A.tokenizuj('git checkout ma"in"')), { tokeny: ['git', 'checkout', 'main'] });
  assert.deepEqual(j(A.tokenizuj('')), { tokeny: [] });
  assert.deepEqual(j(A.tokenizuj('git checkout "main')), { blad: 'cudzyslow' });
});

test('poprawnaNazwaGalezi: poprawne', () => {
  for (const n of ['poprawka', 'moja-galaz', 'feature/login', 'gałąź', 'x.y', 'Main', 'constructor', '__proto__']) {
    assert.equal(A.poprawnaNazwaGalezi(n), true, n);
  }
});

test('poprawnaNazwaGalezi: niepoprawne', () => {
  for (const n of ['', 'HEAD', '@', 'a b', 'tab\tx', 'a//b', 'a/.b', '.ukryta', 'a.lock', 'a.lock/b', 'x.', 'x/', '-x', '/abc',
    'a..b', 'a~1', 'a^', 'a:b', 'a?', 'a*', 'a[', 'a\\b', 'a@{b']) {
    assert.equal(A.poprawnaNazwaGalezi(n), false, JSON.stringify(n));
  }
});

test('rozwiazRewizje w stanie startowym', () => {
  const s = A.stanStartowy();
  const r = (arg) => j(A.rozwiazRewizje(s, arg));
  assert.deepEqual(r('main'), { typ: 'galaz', nazwa: 'main' });
  assert.deepEqual(r('nowa-funkcja'), { typ: 'galaz', nazwa: 'nowa-funkcja' });
  for (const arg of ['HEAD', 'HEAD~1', 'main~1', 'main^', '@', '-', '@{-1}']) assert.deepEqual(r(arg), { typ: 'nieobslugiwana' }, arg);
  assert.deepEqual(r('plik1.txt'), { typ: 'plik' });
  assert.deepEqual(r('f0b4'), { typ: 'commit', id: 'C6' });
  assert.deepEqual(r('F0B4D27'), { typ: 'commit', id: 'C6' });
  assert.deepEqual(r('f0b4d27742fbe7716cc1fdef3e9a8d5c58b0d693'), { typ: 'commit', id: 'C6' });
  for (const arg of ['f0b', 'f0b4d28', 'zzzz', 'constructor', 'toString', '__proto__']) assert.deepEqual(r(arg), { typ: 'brak' }, arg);
});

test('rozwiazRewizje: plik liczy się tylko z bieżącej migawki', () => {
  const s = { ...A.stanStartowy(), head: { typ: 'odczepiony', commit: 'C1' } };
  assert.deepEqual(j(A.rozwiazRewizje(s, 'plik1.txt')), { typ: 'plik' });
  assert.deepEqual(j(A.rozwiazRewizje(s, 'plik2.txt')), { typ: 'brak' });
});
