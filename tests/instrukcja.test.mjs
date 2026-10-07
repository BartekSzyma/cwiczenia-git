import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zaladuj, j } from './zaladuj.mjs';

const A = zaladuj();
const elementy = () => A.INSTRUKCJA.flatMap((s) => s.elementy);
const TYPY = new Set(['tekst', 'komenda', 'sprawdz', 'uwaga', 'wazne', 'zrzut', 'krok']);

test('sekcje 0-11 z tytułami', () => {
  assert.equal(A.INSTRUKCJA.length, 12);
  A.INSTRUKCJA.forEach((s, i) => assert.ok(s.tytul.startsWith(`${i}.`), s.tytul));
});

test('każdy element ma znany typ i treść', () => {
  for (const e of elementy()) {
    assert.ok(TYPY.has(e.typ), e.typ);
    if (['tekst', 'sprawdz', 'uwaga', 'wazne'].includes(e.typ)) assert.ok(e.html.length > 0);
    if (e.typ === 'komenda') assert.ok(e.tekst.length > 0);
    if ('html' in e) assert.doesNotMatch(e.html, /<script/i);
  }
});

test('kroki K1-K13 występują dokładnie raz i w kolejności', () => {
  assert.deepEqual(j(elementy().filter((e) => e.typ === 'krok').map((e) => e.id)), j(A.SCENARIUSZ.kroki.map((k) => k.id)));
});

test('każdy zrzut z listy użyty dokładnie raz', () => {
  assert.equal(A.LISTA_ZRZUTOW.length, 8);
  const uzyte = elementy().filter((e) => e.typ === 'zrzut').map((e) => e.klucz).sort();
  assert.deepEqual(j(uzyte), j(A.LISTA_ZRZUTOW.map((z) => z.klucz).sort()));
  for (const z of A.LISTA_ZRZUTOW) assert.match(z.klucz, /^[0-9]{2}-[a-z-]+$/);
});

test('komendy do uzupełnienia tylko w K4', () => {
  const zKrokow = A.SCENARIUSZ.kroki.flatMap((k) => A.komendyKroku(k).map((c) => [k.id, c]));
  const zInstrukcji = elementy().filter((e) => e.typ === 'komenda').map((e) => ['instrukcja', e.tekst]);
  const doUzupelnienia = [...zKrokow, ...zInstrukcji].filter(([, c]) => /<[^>]+>/.test(c));
  assert.deepEqual(j(doUzupelnienia), [['K4', 'git remote add origin <adres-repozytorium-z-GitHuba>']]);
});

test('kluczowe ostrzeżenia ze spec są w instrukcji', () => {
  const tekst = [...A.INSTRUKCJA.map((s) => s.tytul), ...elementy().map((e) => e.html || e.tekst || '')].join('\n');
  for (const fraza of ['git --version', '2.28', 'Rozszerzenia nazw plików', '--global', 'Public', 'README', 'master', 'POD konsolą',
    'KONIECZNIE przed założeniem Pull Requesta', 'base: main', 'compare: nowa-funkcja', 'New pull request', 'Notatnik nie odświeża',
    'Insights', 'git switch', 'Dla chętnych', 'git checkout main']) {
    assert.ok(tekst.includes(fraza), fraza);
  }
});

test('ramka pomocy: szablon promptu i cztery sytuacje', () => {
  assert.match(A.RAMKA_POMOCY.szablon, /\[komenda\].*\[komunikat\]/);
  assert.equal(A.RAMKA_POMOCY.sytuacje.length, 4);
  assert.ok(A.RAMKA_POMOCY.sytuacje.some((s) => s.html.includes(':q!') && s.html.includes(':wq')));
});
