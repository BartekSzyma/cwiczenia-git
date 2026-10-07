import { test } from 'node:test';
import assert from 'node:assert/strict';
import { j } from './zaladuj.mjs';
import { A, seria, gitLinie, typy, objasnionyPoGicie } from './pomocnicze.mjs';

test('pusta linia: nic się nie dzieje', () => {
  const s = A.stanStartowy();
  const r = A.wykonaj(s, '   ');
  assert.equal(r.stan, s);
  assert.deepEqual(j(r.wynik), []);
  assert.equal(r.wykonanie, null);
});

test('help wypisuje listę komend symulatora', () => {
  const r = seria(['help']);
  assert.ok(r.wynik.length >= 5);
  assert.ok(r.wynik.every((l) => l.typ === 'symulator'));
  assert.ok(r.wynik.some((l) => l.tekst.includes('git checkout -b <nazwa>')));
});

test('clear zwraca akcję clear', () => {
  assert.equal(seria(['clear']).akcja, 'clear');
});

test('restart przywraca stan startowy', () => {
  const s = { head: { typ: 'odczepiony', commit: 'C1' }, galezie: { main: 'C6', 'nowa-funkcja': 'C4', x: 'C2' }, poprzedniHead: null };
  const r = A.wykonaj(s, 'restart');
  assert.deepEqual(j(r.stan), j(A.stanStartowy()));
  assert.equal(r.akcja, 'restart');
  assert.equal(r.wykonanie, null);
  assert.match(r.wynik[0].tekst, /main: f0b4d27, nowa-funkcja: d7f1b85/);
});

test('nieznana komenda spoza gita', () => {
  const r = seria(['ls']);
  assert.deepEqual(j(r.wynik), [{ typ: 'symulator', tekst: 'Nie znam komendy „ls". Wpisz help, żeby zobaczyć listę.' }]);
});

test('sam git', () => {
  assert.equal(seria(['git']).wynik[0].tekst, 'Podaj komendę, np. git checkout main');
});

test('znane komendy gita i opcje gita: tylko komunikat symulatora, stan bez zmian', () => {
  for (const linia of ['git status', 'git commit -m "x"', 'git switch main', 'git log --oneline', 'git push', 'git --version']) {
    const s = A.stanStartowy();
    const r = A.wykonaj(s, linia);
    assert.equal(r.stan, s, linia);
    assert.equal(r.wykonanie, null, linia);
    assert.deepEqual(j(r.wynik), [{ typ: 'symulator', tekst: 'W symulatorze tylko się poruszamy - tę komendę wykonasz we własnym repo (zakładka 3)' }], linia);
  }
});

test('literówka w komendzie gita: komunikat gita z podpowiedzią', () => {
  assert.deepEqual(gitLinie(seria(['git swtich main'])), ["git: 'swtich' is not a git command. See 'git --help'.", '', 'The most similar command is', '\tswitch']);
  assert.deepEqual(gitLinie(seria(['git Checkout main'])), ["git: 'Checkout' is not a git command. See 'git --help'.", '', 'The most similar command is', '\tcheckout']);
  assert.deepEqual(gitLinie(seria(['git stauts'])), ["git: 'stauts' is not a git command. See 'git --help'.", '', 'The most similar command is', '\tstatus']);
  assert.deepEqual(gitLinie(seria(['git xyzabc'])), ["git: 'xyzabc' is not a git command. See 'git --help'."]);
  // dwie komendy w odległości <= 2 (add, tag) - bez podpowiedzi
  assert.deepEqual(gitLinie(seria(['git ad'])), ["git: 'ad' is not a git command. See 'git --help'."]);
  for (const linia of ['git swtich main', 'git xyzabc']) assert.ok(objasnionyPoGicie(seria([linia])), linia);
});

test('niedomknięty cudzysłów', () => {
  const r = seria(['git checkout "main']);
  assert.deepEqual(j(r.wynik), [{ typ: 'symulator', tekst: 'Brakuje zamykającego cudzysłowu - komenda nie została wykonana.' }]);
  assert.equal(r.wykonanie, null);
});

test('git checkout bez argumentu: brak wyniku gita, samo objaśnienie', () => {
  const r = seria(['git checkout']);
  assert.deepEqual(typy(r), ['objasnienie']);
  assert.equal(r.wykonanie, null);
});
