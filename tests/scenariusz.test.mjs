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

const K = () => A.SCENARIUSZ.kroki;
const krok = (id) => K().find((k) => k.id === id);

test('13 kroków K1-K13 z tytułem i opisem', () => {
  assert.deepEqual(j(K().map((k) => k.id)), ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8', 'K9', 'K10', 'K11', 'K12', 'K13']);
  for (const k of K()) {
    assert.ok(k.tytul.length > 0, k.id);
    assert.ok(k.opis.length > 40, k.id);
  }
});

test('krok z commitem: commit dochodzi do lokalnych, gałąź HEAD na nim, katalog = poprzedni + akcja na pliku = migawka commita', () => {
  const kroki = K();
  const zCommitem = kroki.filter((k) => k.commit).map((k) => k.id);
  assert.deepEqual(j(zCommitem), ['K2', 'K3', 'K6', 'K7', 'K10']);
  for (let i = 1; i < kroki.length; i++) {
    const k = kroki[i], p = kroki[i - 1];
    if (!k.commit) continue;
    assert.deepEqual(j(k.lokalnie.commity), [...j(p.lokalnie.commity), k.commit], k.id);
    assert.equal(k.lokalnie.galezie[k.lokalnie.head.nazwa], k.commit, k.id);
    const przed = j(A.katalogKroku(p));
    const nazwa = k.plik.nazwa;
    const oczekiwane = { ...przed, [nazwa]: k.plik.akcja === 'nowy' ? j(k.plik.linie) : [...(przed[nazwa] || []), ...j(k.plik.linie)] };
    assert.deepEqual(j(A.katalogKroku(k)), oczekiwane, k.id);
    assert.deepEqual(j(A.commitPoId(k.commit).pliki), oczekiwane, k.id);
  }
});

test('komendy kroków z commitem biorą opis z commita', () => {
  assert.deepEqual(j(A.komendyKroku(krok('K2'))), ['git add .', 'git commit -m "Pierwszy commit"']);
  assert.deepEqual(j(A.komendyKroku(krok('K10'))), ['git add .', 'git commit -m "Linia na main"']);
  assert.deepEqual(j(A.komendyKroku(krok('K1'))), ['git init -b main']);
  assert.deepEqual(j(A.komendyKroku(krok('K12'))), []);
  assert.deepEqual(j(A.komendyKroku(krok('K13'))), ['git pull']);
});

test('przejścia katalogu między krokami', () => {
  const r = (a, b) => j(A.roznicaMigawek(A.katalogKroku(krok(a)), A.katalogKroku(krok(b))));
  assert.deepEqual(r('K8', 'K9'), { dodane: [], zmienione: [], usuniete: ['plik2.txt', 'plik3.txt'] });
  assert.deepEqual(r('K11', 'K12'), { dodane: [], zmienione: [], usuniete: [] });
  assert.deepEqual(r('K12', 'K13'), { dodane: ['plik2.txt', 'plik3.txt'], zmienione: [], usuniete: [] });
  assert.deepEqual(j(A.katalogKroku(krok('K1'))), {});
});

test('stan GitHuba: pusty przed K4, C6 w K12 tylko na GitHubie', () => {
  for (const id of ['K1', 'K2', 'K3']) assert.deepEqual(j(krok(id).github.galezie), {}, id);
  assert.deepEqual(j(krok('K4').github.galezie), { main: 'C2' });
  assert.deepEqual(j(krok('K8').github.galezie), { main: 'C2', 'nowa-funkcja': 'C4' });
  assert.deepEqual(j(krok('K11').github.galezie), { main: 'C5', 'nowa-funkcja': 'C4' });
  assert.deepEqual(j(krok('K12').github.galezie), { main: 'C6', 'nowa-funkcja': 'C4' });
  assert.ok(!krok('K12').lokalnie.commity.includes('C6'));
  assert.ok(krok('K13').lokalnie.commity.includes('C6'));
});

test('K1: HEAD na main bez commitów; K13 = stan startowy symulatora', () => {
  assert.deepEqual(j(krok('K1').lokalnie), { commity: [], galezie: {}, head: { typ: 'galaz', nazwa: 'main' } });
  assert.deepEqual(j(krok('K13').lokalnie.galezie), j(A.SCENARIUSZ.startoweGalezie));
  assert.deepEqual(j(krok('K13').lokalnie.head), j(A.SCENARIUSZ.startowyHead));
});

test('gałęzie w każdym kroku wskazują istniejące commity', () => {
  for (const k of K()) {
    for (const id of Object.values(k.lokalnie.galezie)) assert.ok(k.lokalnie.commity.includes(id), `${k.id} lokalnie ${id}`);
    for (const id of Object.values(k.github.galezie)) assert.ok(A.commitPoId(id), `${k.id} github ${id}`);
  }
});

test('opisGalezi', () => {
  assert.equal(A.opisGalezi({}), 'brak gałęzi');
  assert.equal(A.opisGalezi({ main: 'C6', 'nowa-funkcja': 'C4' }), 'main: f0b4d27, nowa-funkcja: d7f1b85');
});
