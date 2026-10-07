import { test } from 'node:test';
import assert from 'node:assert/strict';
import { j } from './zaladuj.mjs';
import { A, seria, gitLinie, typy, objasnionyPoGicie } from './pomocnicze.mjs';

const NOTE = (arg) => [
  `Note: switching to '${arg}'.`, '',
  "You are in 'detached HEAD' state. You can look around, make experimental",
  'changes and commit them, and you can discard any commits you make in this',
  'state without impacting any branches by switching back to a branch.', '',
  'If you want to create a new branch to retain commits you create, you may',
  'do so (now or later) by using -c with the switch command. Example:', '',
  '  git switch -c <new-branch-name>', '',
  'Or undo this operation with:', '',
  '  git switch -', '',
  'Turn off this advice by setting config variable advice.detachedHead to false', '',
];
const HINTY = ['hint: See `man git check-ref-format`', 'hint: Disable this message with "git config advice.refSyntax false"'];
const PATHSPEC = (x) => `error: pathspec '${x}' did not match any file(s) known to git`;

function bezZmian(linia, stan = A.stanStartowy()) {
  const r = A.wykonaj(stan, linia);
  assert.equal(r.stan, stan, `${linia}: stan miał się nie zmienić`);
  assert.equal(r.wykonanie, null, `${linia}: wykonanie miało być null`);
  return r;
}

test('gałąź, na której już jesteś', () => {
  const r = seria(['git checkout main']);
  assert.deepEqual(gitLinie(r), ["Already on 'main'"]);
  assert.deepEqual(j(r.wykonanie), { forma: 'galaz', argument: 'main' });
});

test('gałąź z innej gałęzi', () => {
  const r = seria(['git checkout nowa-funkcja']);
  assert.deepEqual(gitLinie(r), ["Switched to branch 'nowa-funkcja'"]);
  assert.deepEqual(j(r.stan.head), { typ: 'galaz', nazwa: 'nowa-funkcja' });
  assert.deepEqual(j(r.stan.poprzedniHead), { typ: 'galaz', nazwa: 'main' });
});

test('hash z gałęzi: pełne ostrzeżenie z argumentem w postaci wpisanej', () => {
  const r = seria(['git checkout 1c4e']);
  assert.deepEqual(gitLinie(r), [...NOTE('1c4e'), 'HEAD is now at 1c4e7a2 Pierwszy commit']);
  assert.deepEqual(j(r.stan.head), { typ: 'odczepiony', commit: 'C1' });
  assert.deepEqual(j(r.wykonanie), { forma: 'hash', argument: '1c4e' });
  assert.equal(gitLinie(seria(['git checkout F0B4D27']))[0], "Note: switching to 'F0B4D27'.");
  const pelny = 'f0b4d27742fbe7716cc1fdef3e9a8d5c58b0d693';
  const rp = seria([`git checkout ${pelny}`]);
  assert.equal(gitLinie(rp)[0], `Note: switching to '${pelny}'.`);
  assert.equal(gitLinie(rp).at(-1), 'HEAD is now at f0b4d27 Merge pull request #1 from kursant/nowa-funkcja');
});

test('hash z odczepionego: na inny commit i na ten sam', () => {
  assert.deepEqual(gitLinie(seria(['git checkout 1c4e', 'git checkout 5b8d0f3'])),
    ['Previous HEAD position was 1c4e7a2 Pierwszy commit', 'HEAD is now at 5b8d0f3 Druga linia w plik1']);
  assert.deepEqual(gitLinie(seria(['git checkout 5b8d', 'git checkout 5B8D'])), ['HEAD is now at 5b8d0f3 Druga linia w plik1']);
});

test('gałąź z odczepionego: z innego commita i z tego samego', () => {
  assert.deepEqual(gitLinie(seria(['git checkout 5b8d', 'git checkout main'])),
    ['Previous HEAD position was 5b8d0f3 Druga linia w plik1', "Switched to branch 'main'"]);
  assert.deepEqual(gitLinie(seria(['git checkout f0b4', 'git checkout main'])), ["Switched to branch 'main'"]);
});

test('-b: nowa gałąź na bieżącym commicie, także z odczepionego HEAD', () => {
  const r = seria(['git checkout 5b8d', 'git checkout -b poprawka']);
  assert.deepEqual(gitLinie(r), ["Switched to a new branch 'poprawka'"]);
  assert.equal(r.stan.galezie.poprawka, 'C2');
  assert.deepEqual(j(r.stan.head), { typ: 'galaz', nazwa: 'poprawka' });
  assert.deepEqual(j(r.wykonanie), { forma: 'nowaGalaz', argument: 'poprawka' });
});

test('-b: błędy', () => {
  assert.deepEqual(gitLinie(bezZmian('git checkout -b main')), ["fatal: a branch named 'main' already exists"]);
  assert.deepEqual(gitLinie(bezZmian('git checkout -b Main')), ["fatal: a branch named 'Main' already exists"]);
  assert.deepEqual(gitLinie(bezZmian('git checkout -b')), ["error: switch `b' requires a value"]);
  assert.deepEqual(gitLinie(bezZmian('git checkout -b "zla nazwa"')), ["fatal: 'zla nazwa' is not a valid branch name", ...HINTY]);
  assert.deepEqual(gitLinie(bezZmian('git checkout -b HEAD')), ["fatal: 'HEAD' is not a valid branch name", ...HINTY]);
  assert.deepEqual(gitLinie(bezZmian('git checkout -b main/temat')),
    ["fatal: cannot lock ref 'refs/heads/main/temat': 'refs/heads/main' exists; cannot create 'refs/heads/main/temat'"]);
  const zTematem = seria(['git checkout -b x/temat']).stan;
  assert.deepEqual(gitLinie(bezZmian('git checkout -b x', zTematem)),
    ["fatal: cannot lock ref 'refs/heads/x': 'refs/heads/x/temat' exists; cannot create 'refs/heads/x'"]);
  assert.deepEqual(j(bezZmian('git checkout -b nowa x').wynik), [{ typ: 'symulator', tekst: 'W symulatorze nową gałąź tworzysz tam, gdzie stoisz: najpierw przełącz się na commit, potem git checkout -b nazwa' }]);
});

test('formy nieobsługiwane i przywracanie plików', () => {
  for (const linia of ['git checkout HEAD~1', 'git checkout HEAD', 'git checkout -', 'git checkout @', 'git checkout main~1']) {
    assert.deepEqual(typy(bezZmian(linia)), ['symulator'], linia);
  }
  for (const linia of ['git checkout plik1.txt', 'git checkout -- plik1.txt']) {
    assert.deepEqual(j(bezZmian(linia).wynik), [{ typ: 'symulator', tekst: 'Przywracanie plików nie jest częścią tego ćwiczenia' }], linia);
  }
});

test('błędy pathspec, pusty napis, nieznane opcje', () => {
  assert.deepEqual(gitLinie(bezZmian('git checkout xyz')), [PATHSPEC('xyz')]);
  assert.deepEqual(gitLinie(bezZmian('git checkout f0b')), [PATHSPEC('f0b')]);
  const naNowej = seria(['git checkout nowa-funkcja']).stan;
  assert.deepEqual(gitLinie(bezZmian('git checkout main dodatkowy', naNowej)), [PATHSPEC('dodatkowy')]);
  // jak git 2.47.1: błąd dla każdego nadmiarowego argumentu
  assert.deepEqual(gitLinie(bezZmian('git checkout main jeden dwa', naNowej)), [PATHSPEC('jeden'), PATHSPEC('dwa')]);
  assert.deepEqual(gitLinie(bezZmian('git checkout nieistnieje drugi')), [PATHSPEC('nieistnieje'), PATHSPEC('drugi')]);
  assert.deepEqual(gitLinie(bezZmian('git checkout ""')), ['fatal: empty string is not a valid pathspec. please use . instead if you meant to match all paths']);
  assert.deepEqual(gitLinie(bezZmian('git checkout -x')), ["error: unknown switch `x'", 'usage: git checkout [<options>] <branch>']);
  assert.deepEqual(gitLinie(bezZmian('git checkout --foo')), ["error: unknown option `foo'", 'usage: git checkout [<options>] <branch>']);
});

test('Review Focus: nazwy jak klucze Object.prototype', () => {
  assert.deepEqual(gitLinie(bezZmian('git checkout toString')), [PATHSPEC('toString')]);
  assert.deepEqual(gitLinie(bezZmian('git checkout constructor')), [PATHSPEC('constructor')]);
  for (const nazwa of ['constructor', '__proto__']) {
    const r = seria([`git checkout -b ${nazwa}`, 'git checkout main', `git checkout ${nazwa}`]);
    assert.deepEqual(gitLinie(r), [`Switched to branch '${nazwa}'`], nazwa);
    assert.ok(Object.prototype.hasOwnProperty.call(r.stan.galezie, nazwa), nazwa);
  }
});

test('Review Focus: białe znaki i wielkość liter w wejściu', () => {
  for (const linia of ['GIT checkout nowa-funkcja', '  git   checkout\tnowa-funkcja  ', 'Git checkout nowa-funkcja ']) {
    assert.deepEqual(gitLinie(seria([linia])), ["Switched to branch 'nowa-funkcja'"], JSON.stringify(linia));
  }
});

test('gałąź z polskimi literami', () => {
  assert.deepEqual(gitLinie(seria(['git checkout -b gałąź', 'git checkout main', 'git checkout gałąź'])), ["Switched to branch 'gałąź'"]);
});

test('każdy wynik gita kończy się objaśnieniem', () => {
  const linie = ['git checkout main', 'git checkout nowa-funkcja', 'git checkout 1c4e', 'git checkout -b main', 'git checkout -b',
    'git checkout -b "zla nazwa"', 'git checkout -b main/temat', 'git checkout xyz', 'git checkout ""', 'git checkout -x',
    'git checkout --foo', 'git checkout main dodatkowy', 'git checkout -b nowa'];
  for (const linia of linie) {
    const r = seria([linia]);
    assert.ok(typy(r).includes('git'), linia);
    assert.ok(objasnionyPoGicie(r), linia);
  }
  assert.ok(objasnionyPoGicie(seria(['git checkout 1c4e', 'git checkout 5b8d'])));
  assert.ok(objasnionyPoGicie(seria(['git checkout 1c4e', 'git checkout main'])));
});
