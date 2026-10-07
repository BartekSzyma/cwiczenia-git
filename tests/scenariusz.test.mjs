import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zaladuj, j } from './zaladuj.mjs';

const A = zaladuj();
const L1 = 'to jest poczatkowa zawartosc pliku';
const L2 = 'to dodalismy w kolejnym commicie';
const L3 = 'ta linia powstala na main';

test('commity C1-C6 z hashami i opisami ze spec', () => {
  const oczekiwane = {
    C1: ['1c4e7a2', 'Pierwszy commit'], C2: ['5b8d0f3', 'Druga linia w plik1'], C3: ['9e2a6c4', 'Dodano plik2'],
    C4: ['d7f1b85', 'Dodano plik3'], C5: ['3a6c9e0', 'Linia na main'], C6: ['f0b4d27', 'Merge pull request #1 from kursant/nowa-funkcja'],
  };
  assert.deepEqual(j(A.SCENARIUSZ.commity.map((c) => c.id)), ['C1', 'C2', 'C3', 'C4', 'C5', 'C6']);
  for (const c of A.SCENARIUSZ.commity) {
    assert.match(c.hash, /^[0-9a-f]{40}$/);
    assert.equal(c.hash.slice(0, 7), oczekiwane[c.id][0]);
    assert.equal(c.opis, oczekiwane[c.id][1]);
    assert.equal(A.skrot(c.id), oczekiwane[c.id][0]);
  }
  assert.equal(new Set(A.SCENARIUSZ.commity.map((c) => c.hash[0])).size, 6, 'pierwsze znaki hashy unikalne');
});

test('rodzice i tory', () => {
  const r = Object.fromEntries(A.SCENARIUSZ.commity.map((c) => [c.id, [j(c.rodzice), c.tor]]));
  assert.deepEqual(r, {
    C1: [[], 'main'], C2: [['C1'], 'main'], C3: [['C2'], 'nowa-funkcja'],
    C4: [['C3'], 'nowa-funkcja'], C5: [['C2'], 'main'], C6: [['C5', 'C4'], 'main'],
  });
});

test('treść plików: plik1 identyczny w C2, C3, C4; C6 = plik1 z C5 + pliki z C4', () => {
  const p = (id) => j(A.migawka(id));
  assert.deepEqual(p('C1'), { 'plik1.txt': [L1] });
  for (const id of ['C2', 'C3', 'C4']) assert.deepEqual(p(id)['plik1.txt'], [L1, L2]);
  assert.deepEqual(p('C3')['plik2.txt'], ['nowy plik tekstowy']);
  assert.deepEqual(p('C4')['plik3.txt'], ['zawartosc pliku nr 3']);
  assert.deepEqual(p('C5'), { 'plik1.txt': [L1, L2, L3] });
  assert.deepEqual(p('C6'), { 'plik1.txt': p('C5')['plik1.txt'], 'plik2.txt': p('C4')['plik2.txt'], 'plik3.txt': p('C4')['plik3.txt'] });
});

test('zmiana każdego commita liczona względem pierwszego rodzica', () => {
  const zmiana = (id) => {
    const c = A.commitPoId(id);
    return j(A.roznicaMigawek(A.migawka(c.rodzice[0] ?? null), c.pliki));
  };
  const bez = { zmienione: [], usuniete: [] };
  assert.deepEqual(zmiana('C1'), { dodane: ['plik1.txt'], ...bez });
  assert.deepEqual(zmiana('C2'), { dodane: [], zmienione: ['plik1.txt'], usuniete: [] });
  assert.deepEqual(zmiana('C3'), { dodane: ['plik2.txt'], ...bez });
  assert.deepEqual(zmiana('C4'), { dodane: ['plik3.txt'], ...bez });
  assert.deepEqual(zmiana('C5'), { dodane: [], zmienione: ['plik1.txt'], usuniete: [] });
  assert.deepEqual(zmiana('C6'), { dodane: ['plik2.txt', 'plik3.txt'], ...bez });
});

test('osiagalneZ idzie po wszystkich rodzicach', () => {
  assert.deepEqual(j(A.osiagalneZ('C4')), ['C1', 'C2', 'C3', 'C4']);
  assert.deepEqual(j(A.osiagalneZ('C5')), ['C1', 'C2', 'C5']);
  assert.deepEqual(j(A.osiagalneZ('C6')), ['C1', 'C2', 'C3', 'C4', 'C5', 'C6']);
  assert.deepEqual(j(A.osiagalneZ(null)), []);
});

test('roznicaLinii', () => {
  assert.deepEqual(j(A.roznicaLinii(['a', 'b'], ['a', 'b', 'c'])), [{ typ: '=', tekst: 'a' }, { typ: '=', tekst: 'b' }, { typ: '+', tekst: 'c' }]);
  assert.deepEqual(j(A.roznicaLinii(['a', 'b', 'c'], ['a', 'b'])), [{ typ: '=', tekst: 'a' }, { typ: '=', tekst: 'b' }, { typ: '-', tekst: 'c' }]);
  assert.deepEqual(j(A.roznicaLinii([], ['x'])), [{ typ: '+', tekst: 'x' }]);
});

test('stanStartowy: main na C6, nowa-funkcja na C4, HEAD na main; każde wywołanie to nowa kopia', () => {
  const s = A.stanStartowy();
  assert.deepEqual(j(s), { head: { typ: 'galaz', nazwa: 'main' }, galezie: { main: 'C6', 'nowa-funkcja': 'C4' }, poprzedniHead: null });
  s.galezie.main = 'C1';
  s.head.nazwa = 'x';
  assert.equal(A.stanStartowy().galezie.main, 'C6');
  assert.equal(A.stanStartowy().head.nazwa, 'main');
});

test('biezacyCommit i opisPolozenia', () => {
  const s = A.stanStartowy();
  assert.equal(A.biezacyCommit(s), 'C6');
  assert.equal(A.opisPolozenia(s), 'Jesteś na: gałęzi main, commit f0b4d27');
  const odcz = { ...s, head: { typ: 'odczepiony', commit: 'C1' } };
  assert.equal(A.biezacyCommit(odcz), 'C1');
  assert.equal(A.opisPolozenia(odcz), 'Jesteś na: commicie 1c4e7a2 (odczepiony HEAD)');
});

test('domyslnyPlik: najpierw zmieniony, potem dodany, potem obecny, potem pierwszy', () => {
  const C6 = A.migawka('C6'), C4 = A.migawka('C4'), C1 = A.migawka('C1');
  assert.equal(A.domyslnyPlik(C4, C6, 'plik3.txt'), 'plik1.txt');
  assert.equal(A.domyslnyPlik(C4, A.migawka('C2'), null), 'plik2.txt');
  assert.equal(A.domyslnyPlik(C6, C6, 'plik2.txt'), 'plik2.txt');
  assert.equal(A.domyslnyPlik(C1, C1, 'plik3.txt'), 'plik1.txt');
  assert.equal(A.domyslnyPlik({}, {}, null), null);
});
