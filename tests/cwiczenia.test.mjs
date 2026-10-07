import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zaladuj, j } from './zaladuj.mjs';

const A = zaladuj();

// '#pomin' symuluje przycisk „Pomiń".
function sesjaPo(linie, sesja = A.nowaSesja()) {
  const zaliczenia = [];
  for (const linia of linie) {
    if (linia === '#pomin') { sesja = A.pomin(sesja); continue; }
    const r = A.przetworz(sesja, linia);
    sesja = r.sesja;
    if (r.zaliczenie) zaliczenia.push(r.zaliczenie);
  }
  return { sesja, zaliczenia };
}
const biezace = (linie) => sesjaPo(linie).sesja.postep.biezace;
const DO_6 = ['git checkout nowa-funkcja', 'git checkout main', 'git checkout 1c4e', 'git checkout main', 'git checkout d7f1'];

test('8 ćwiczeń z kompletem pól', () => {
  assert.equal(A.CWICZENIA.length, 8);
  for (const c of A.CWICZENIA) {
    assert.ok(c.polecenie && c.podpowiedz && c.warunek && typeof c.poZaliczeniu === 'function');
    assert.doesNotMatch(c.podpowiedz, /[0-9a-f]{7}/, 'podpowiedź nie podaje gotowego hasha');
  }
});

test('zbiory odpowiedzi liczone z migawek', () => {
  assert.deepEqual(j(A.commityPasujace(A.CWICZENIA[4].warunek)), ['C4']);
  assert.deepEqual(j(A.commityPasujace(A.CWICZENIA[5].warunek)), ['C2', 'C3', 'C4']);
});

test('pełne przejście 1-8', () => {
  const { sesja, zaliczenia } = sesjaPo([...DO_6, 'git checkout 9e2a', 'git checkout 5b8d', 'git checkout -b poprawka', 'git checkout f0b4']);
  assert.deepEqual(j(sesja.postep), { biezace: 8, wyniki: new Array(8).fill('zaliczone') });
  assert.deepEqual(zaliczenia.map((z) => z.nr), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.ok(zaliczenia.every((z) => z.komunikat.length > 20));
});

test('ćwiczenie 5 zaliczone także przez gałąź nowa-funkcja', () => {
  assert.equal(biezace([...DO_6.slice(0, 4), 'git checkout nowa-funkcja']), 5);
});

test('ćwiczenie 6: C2, C3, C4 zaliczają i komunikat wymienia pozostałe; C1, C5, C6 nie', () => {
  for (const [hash, inne] of [['5b8d', ['9e2a6c4', 'd7f1b85']], ['9e2a', ['5b8d0f3', 'd7f1b85']], ['d7f1', ['5b8d0f3', '9e2a6c4']]]) {
    const { zaliczenia } = sesjaPo([...DO_6, 'git checkout 1c4e', `git checkout ${hash}`]);
    const z = zaliczenia.at(-1);
    assert.equal(z.nr, 5, hash);
    for (const h of inne) assert.ok(z.komunikat.includes(h), `${hash}: brak ${h}`);
  }
  for (const hash of ['1c4e', '3a6c', 'f0b4']) assert.equal(biezace([...DO_6, `git checkout ${hash}`]), 5, hash);
});

test('odrzucone wejścia nie zaliczają, nawet przy spełnionym warunku', () => {
  // po ćwiczeniu 5 HEAD stoi na C4, które spełnia warunek ćwiczenia 6
  for (const linia of ['git checkout HEAD~1', 'git checkout xyz', 'help', 'git status', 'git checkout -b main', 'git checkout']) {
    assert.equal(biezace([...DO_6, linia]), 5, linia);
  }
});

test('stan spełniony na starcie ćwiczenia nie zalicza; właściwa komenda bez zmiany stanu - tak', () => {
  assert.equal(biezace(['#pomin']), 1);
  assert.equal(biezace(['#pomin', 'git status']), 1);
  assert.equal(biezace(['#pomin', 'git checkout main']), 2);
});

test('ćwiczenie 7 wymaga utworzenia gałęzi w trakcie ćwiczenia', () => {
  const przygotowanie = ['git checkout nowa-funkcja', 'git checkout main', 'git checkout 1c4e', 'git checkout main',
    'git checkout 5b8d', 'git checkout -b poprawka', 'git checkout d7f1', 'git checkout 5b8d'];
  assert.equal(biezace(przygotowanie), 6);
  assert.equal(biezace([...przygotowanie, 'git checkout poprawka']), 6);
  assert.equal(biezace([...przygotowanie, 'git checkout -b poprawka']), 6);
  assert.equal(biezace([...przygotowanie, 'restart', 'git checkout 5b8d', 'git checkout -b poprawka']), 7);
  assert.equal(biezace([...DO_6, 'git checkout 9e2a', 'git checkout 1c4e', 'git checkout -b poprawka']), 6, 'gałąź na złym commicie');
});

test('ćwiczenie 8 wymaga hasha, nie nazwy main', () => {
  const do8 = [...DO_6, 'git checkout 9e2a', 'git checkout 5b8d', 'git checkout -b poprawka'];
  assert.equal(biezace([...do8, 'git checkout main']), 7);
  assert.equal(biezace([...do8, 'git checkout f0b4']), 8);
});

test('pomijanie zapisuje „pominiete"', () => {
  assert.deepEqual(j(sesjaPo(['#pomin', '#pomin']).sesja.postep.wyniki.slice(0, 3)), ['pominiete', 'pominiete', null]);
});

test('restart nie zmienia postępu', () => {
  const przed = sesjaPo(['git checkout nowa-funkcja']).sesja;
  const r = A.przetworz(przed, 'restart');
  assert.deepEqual(j(r.sesja.postep), j(przed.postep));
  assert.deepEqual(j(A.krokPostepu(przed.postep, { typ: 'restart' })), j(przed.postep));
});

test('Review Focus: po ukończeniu wszystkich ćwiczeń komendy i Pomiń nic nie psują', () => {
  let { sesja } = sesjaPo(['#pomin', '#pomin', '#pomin', '#pomin', '#pomin', '#pomin', '#pomin', '#pomin']);
  assert.equal(sesja.postep.biezace, 8);
  const r = A.przetworz(sesja, 'git checkout nowa-funkcja');
  assert.equal(r.zaliczenie, null);
  assert.deepEqual(j(r.sesja.postep), j(sesja.postep));
  assert.deepEqual(j(A.pomin(r.sesja).postep), j(sesja.postep));
});

test('Review Focus: restart usuwa gałęzie kursanta i wraca z odczepionego HEAD', () => {
  const { sesja } = sesjaPo(['git checkout 5b8d', 'git checkout -b x', 'git checkout 1c4e', 'restart']);
  assert.deepEqual(j(sesja.stan), j(A.stanStartowy()));
});
