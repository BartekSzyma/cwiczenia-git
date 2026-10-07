# Ćwiczenia z gita - symulator i instrukcja: plan implementacji

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jeden plik `cwiczenia-git.html` z trzema zakładkami (historia powstania repo, symulator `git checkout` z 8 ćwiczeniami, instrukcja „Zrób to sam w konsoli" z PR na GitHubie) plus testy logiki w Node.

**Architecture:** Plik HTML ma cztery bloki skryptu: `dane` (scenariusz, teksty, ćwiczenia, instrukcja), `logika` (czyste funkcje bez DOM: interpreter komend, sprawdzarka, postęp), `widok` (DOM/SVG) i `zrzuty` (obrazy base64). Testy wycinają bloki `dane` i `logika` z HTML i uruchamiają je w `node:vm`. Jedno źródło prawdy: obiekt `SCENARIUSZ`, z którego powstają graf, kroki obu zakładek i poprawne odpowiedzi sprawdzarki.

**Tech Stack:** HTML5, CSS, vanilla JavaScript (ES2022), SVG; testy: Node 22 (`node --test`, `node:assert/strict`, `node:vm`), bez zależności npm.

**Spec:** `docs/superpowers/specs/2026-10-05-git-cwiczenia-design.md` (czytaj razem z tym planem).

## Global Constraints

- Dostarczany jest jeden plik `cwiczenia-git.html`: vanilla JS, SVG, bez bibliotek, bez internetu, działa po otwarciu dwuklikiem (`file://`).
- Testy: Node 22, `npm test` = `node --test "tests/*.test.mjs"`, bez zależności npm i bez kroku budowania.
- Kodowanie UTF-8 wszędzie; teksty interfejsu z pełnymi polskimi znakami.
- Zakaz znaków U+2014 i U+2013 oraz encji mdash/ndash w KAŻDYM pliku (kod, komentarze, dokumenty, commit messages) - tylko zwykły dywiz `-`.
- Świadome odstępstwo: treść plików ćwiczeniowych i opisy commitów scenariusza są bez polskich znaków (spec, sekcja 3).
- Nazwy plików projektu w ASCII.
- Komunikaty gita dosłownie jak w git 2.47.1 (po angielsku); po każdym bloku komunikatów gita linia `objasnienie` po polsku.
- Gałąź główna `main`; hashe scenariusza z sekcji 3 spec (pokazywane 7 znaków).
- Prace na gałęzi `symulator` (nie na `main`). Każdy commit kończy się linią `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; opisy commitów po polsku z polskimi znakami.

## Review Focus

1. Nazwy gałęzi pokrywające się z kluczami `Object.prototype` (`constructor`, `toString`, `__proto__`) jako argument `checkout` lub nazwa w `-b` - mają działać jak zwykłe nazwy, a nieistniejące mają dawać błąd pathspec. Test: Task 6.
2. Wariant wielkości liter istniejącej gałęzi (`git checkout -b Main` przy istniejącym `main`) - git for Windows odpowiada `fatal: a branch named 'Main' already exists` (zweryfikowane na 2.47.1). Test: Task 6.
3. Białe znaki i wielkość liter w wejściu: tabulatory, wielokrotne spacje, spacje na końcu, `GIT checkout main` - komenda ma się wykonać normalnie. Test: Task 6.
4. Komendy po ukończeniu wszystkich 8 ćwiczeń oraz „Pomiń" na ostatnim ćwiczeniu - bez błędu, postęp bez zmian. Test: Task 7.
5. `restart` po utworzeniu własnych gałęzi i w stanie odczepionego HEAD - gałęzie kursanta znikają, HEAD wraca na `main`, postęp zostaje. Test: Task 7.

---

## Struktura plików

| Plik | Odpowiedzialność |
|---|---|
| `cwiczenia-git.html` | cały produkt: style, szkielet zakładek, bloki `dane`, `logika`, `widok`, `zrzuty` |
| `package.json` | tylko skrypt `npm test` |
| `tests/zaladuj.mjs` | wczytanie HTML, wycięcie bloków, uruchomienie w `vm`, helper `j` |
| `tests/typografia.test.mjs` | zakaz długich myślników we wszystkich plikach tekstowych, struktura HTML, kompilacja bloków |
| `tests/scenariusz.test.mjs` | spójność commitów i kroków K1-K13, funkcje pomocnicze |
| `tests/parser.test.mjs` | tokenizer, walidacja nazw gałęzi, rozstrzyganie argumentu |
| `tests/pomocnicze.mjs` | wspólne helpery testów interpretera (`A`, `seria`, `gitLinie`, `typy`, `objasnionyPoGicie`) |
| `tests/komendy.test.mjs` | interpreter: komendy symulatora i git ogólnie |
| `tests/checkout.test.mjs` | interpreter: `git checkout` co do znaku |
| `tests/cwiczenia.test.mjs` | sprawdzarka, postęp, `przetworz` |
| `tests/instrukcja.test.mjs` | dane zakładki 3 |
| `tests/zrzuty.test.mjs` | narzędzie osadzania zrzutów i komplet zrzutów |
| `tools/osadz-zrzuty.mjs` | jednorazowe osadzenie `zrzuty/*` jako base64 w bloku `zrzuty` |
| `zrzuty/*.png` | źródła zrzutów ekranu GitHuba |

Rejestry eksportu: na końcu bloku `dane` stoi `const DANE = { ... };`, na końcu bloku `logika` - `const LOGIKA = { ... };`. Każde zadanie, które dodaje nazwę używaną w testach, dopisuje ją do właściwego rejestru (podana jest pełna nowa linia).

---

### Task 1: Szkielet HTML, uruchamianie testów, test typografii

**Files:**
- Create: `cwiczenia-git.html`
- Create: `package.json`
- Create: `tests/zaladuj.mjs`
- Test: `tests/typografia.test.mjs`

**Interfaces:**
- Consumes: nic.
- Produces: `zaladuj({ zrzuty = false } = {}) -> object` (wszystkie nazwy z `DANE` i `LOGIKA`, opcjonalnie `ZRZUTY`), `wczytajHtml() -> string`, `blok(html, id) -> string`, `j(x)` (głęboka kopia przez JSON - porównania między realmami `vm`). W widoku: `pokazZakladke(id)`, `start()`.

- [ ] **Step 1: Utwórz gałąź roboczą**

Run: `git checkout -b symulator`
Expected: `Switched to a new branch 'symulator'`

- [ ] **Step 2: Napisz `tests/zaladuj.mjs`**

```js
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

export const SCIEZKA_HTML = new URL('../cwiczenia-git.html', import.meta.url);

export function wczytajHtml() {
  return readFileSync(SCIEZKA_HTML, 'utf8');
}

export function blok(html, id) {
  const m = html.match(new RegExp(`<script id="${id}">([\\s\\S]*?)</script>`));
  if (!m) throw new Error(`Brak bloku <script id="${id}"> w cwiczenia-git.html`);
  return m[1];
}

export function zaladuj({ zrzuty = false } = {}) {
  const html = wczytajHtml();
  const kod = [
    blok(html, 'dane'),
    blok(html, 'logika'),
    zrzuty ? blok(html, 'zrzuty') : '',
    `globalThis.__api = { ...DANE, ...LOGIKA${zrzuty ? ', ZRZUTY' : ''} };`,
  ].join('\n;\n');
  const kontekst = vm.createContext({});
  vm.runInContext(kod, kontekst, { filename: 'cwiczenia-git.html' });
  return kontekst.__api;
}

// Obiekty z innego realmu vm mają inne prototypy - przed deepEqual kopiujemy je przez JSON.
export const j = (x) => JSON.parse(JSON.stringify(x));
```

- [ ] **Step 3: Napisz test `tests/typografia.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { wczytajHtml, blok, zaladuj } from './zaladuj.mjs';

const KORZEN = fileURLToPath(new URL('..', import.meta.url));
const ROZSZERZENIA = new Set(['.html', '.mjs', '.js', '.md', '.json']);
const POMIJANE = new Set(['.git', 'node_modules', 'zrzuty']);

function plikiTekstowe(katalog) {
  const wynik = [];
  for (const wpis of readdirSync(katalog, { withFileTypes: true })) {
    if (POMIJANE.has(wpis.name)) continue;
    const sciezka = join(katalog, wpis.name);
    if (wpis.isDirectory()) wynik.push(...plikiTekstowe(sciezka));
    else if (ROZSZERZENIA.has(extname(wpis.name))) wynik.push(sciezka);
  }
  return wynik;
}

// Wzorce sklejane z części, żeby ten plik sam nie zawierał zakazanych encji.
const ZAKAZANE = [
  ['U+2014', new RegExp('\\u2014')],
  ['U+2013', new RegExp('\\u2013')],
  ['encja mdash', new RegExp('&' + 'mdash;')],
  ['encja ndash', new RegExp('&' + 'ndash;')],
];

test('żaden plik tekstowy nie zawiera długich myślników', () => {
  const pliki = plikiTekstowe(KORZEN);
  assert.ok(pliki.length > 0);
  for (const p of pliki) {
    const tresc = readFileSync(p, 'utf8');
    for (const [nazwa, wzor] of ZAKAZANE) assert.ok(!wzor.test(tresc), `${p}: znaleziono ${nazwa}`);
  }
});

test('HTML deklaruje UTF-8 i język polski', () => {
  const html = wczytajHtml();
  assert.match(html, /<meta charset="utf-8">/);
  assert.match(html, /<html lang="pl">/);
});

test('wszystkie bloki skryptu się kompilują', () => {
  const html = wczytajHtml();
  for (const id of ['dane', 'logika', 'widok', 'zrzuty']) {
    assert.doesNotThrow(() => new vm.Script(blok(html, id)), `blok ${id}`);
  }
});

test('zaladuj zwraca obiekt API', () => {
  assert.equal(typeof zaladuj(), 'object');
});
```

- [ ] **Step 4: Utwórz `package.json`**

```json
{
  "name": "cwiczenia-git",
  "private": true,
  "scripts": {
    "test": "node --test \"tests/*.test.mjs\""
  }
}
```

- [ ] **Step 5: Uruchom testy - mają nie przejść**

Run: `npm test`
Expected: FAIL - `ENOENT` przy odczycie `cwiczenia-git.html`.

- [ ] **Step 6: Utwórz `cwiczenia-git.html` (szkielet z pełnym CSS)**

```html
<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Ćwiczenia z gita - symulator</title>
<style>
:root {
  --tlo: #f8fafc; --panel: #ffffff; --tekst: #0f172a; --przygaszony: #64748b; --ramka: #e2e8f0;
  --main: #2563eb; --nowa: #16a34a; --head: #facc15; --odczepiony: #f97316;
  --plus: #16a34a; --tylda: #ca8a04; --minus: #dc2626;
  --terminal-tlo: #0f172a; --terminal-tekst: #e2e8f0;
}
* { box-sizing: border-box; }
body { margin: 0; font-family: "Segoe UI", system-ui, sans-serif; background: var(--tlo); color: var(--tekst); }
code, pre { font-family: Consolas, "Cascadia Mono", monospace; }
.naglowek { padding: 12px 20px; background: var(--panel); border-bottom: 1px solid var(--ramka); display: flex; gap: 24px; align-items: center; flex-wrap: wrap; }
.naglowek h1 { font-size: 20px; margin: 0; }
.zakladki { display: flex; gap: 4px; flex-wrap: wrap; }
.zakladki button { border: 1px solid var(--ramka); background: var(--tlo); padding: 8px 14px; border-radius: 6px; cursor: pointer; font: inherit; }
.zakladki button[aria-selected="true"] { background: var(--main); color: #fff; border-color: var(--main); }
main { padding: 16px 20px; }
.panel { background: var(--panel); border: 1px solid var(--ramka); border-radius: 8px; padding: 12px; }
.panel h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .05em; color: var(--przygaszony); margin: 0 0 8px; }
button { font: inherit; }

/* graf */
svg.graf { width: 100%; height: auto; display: block; }
.nazwa-toru { font: 600 13px "Segoe UI", sans-serif; }
.commit circle { stroke-width: 3; fill: #fff; }
.commit.przygaszony { opacity: .3; }
.commit.biezacy circle { stroke-width: 6; filter: drop-shadow(0 0 6px #facc15); }
.commit text.hash { font: 12px Consolas, monospace; fill: var(--tekst); }
.commit text.opis { font: 11px "Segoe UI", sans-serif; fill: var(--przygaszony); }
.krawedz { fill: none; stroke-width: 3; }
.krawedz.przygaszona { opacity: .3; }
.etykieta text { font: 600 12px "Segoe UI", sans-serif; fill: #fff; }
.head-etykieta { transition: transform .45s ease; }
.head-etykieta rect { fill: var(--head); stroke: #a16207; stroke-width: 1.5; }
.head-etykieta text { fill: #422006; font: 700 12px "Segoe UI", sans-serif; }
.head-etykieta.odczepiony rect { fill: #ffedd5; stroke: var(--odczepiony); stroke-dasharray: 4 3; stroke-width: 2; }
.polozenie { margin-top: 8px; font-size: 14px; }
.pasek-odczepiony { margin-top: 8px; padding: 8px 12px; border: 2px dashed var(--odczepiony); background: #fff7ed; border-radius: 6px; }

/* katalog */
.katalog ul { list-style: none; padding: 0; margin: 0; }
.katalog li { padding: 4px 6px; border-radius: 4px; cursor: pointer; display: flex; justify-content: space-between; gap: 8px; font-family: Consolas, monospace; }
.katalog li.wybrany { background: #eff6ff; }
.znacznik { font-weight: 700; font-family: "Segoe UI", sans-serif; font-size: 12px; }
.znacznik.plus { color: var(--plus); } .znacznik.tylda { color: var(--tylda); } .znacznik.minus { color: var(--minus); }
.katalog li.usuniety { color: var(--minus); text-decoration: line-through; animation: znikanie 1.8s forwards; pointer-events: none; }
@keyframes znikanie { 0%, 60% { opacity: 1; } 100% { opacity: 0; } }
.podglad { margin-top: 10px; border-top: 1px solid var(--ramka); padding-top: 8px; }
.podglad pre { margin: 0; white-space: pre-wrap; font-size: 13px; }
.linia-plus { background: #dcfce7; } .linia-minus { background: #fee2e2; text-decoration: line-through; }
.pusty-katalog { color: var(--przygaszony); font-style: italic; }

/* zakładka 2 */
.uklad-symulatora { display: grid; grid-template-columns: minmax(0, 1fr) 320px; grid-template-areas: "graf cwiczenie" "terminal katalog"; gap: 12px; }
.obszar-graf { grid-area: graf; } .obszar-cwiczenie { grid-area: cwiczenie; } .obszar-terminal { grid-area: terminal; } .obszar-katalog { grid-area: katalog; }
.terminal { background: var(--terminal-tlo); color: var(--terminal-tekst); border-radius: 8px; padding: 10px 12px; font: 13px/1.45 Consolas, "Cascadia Mono", monospace; height: 360px; overflow-y: auto; cursor: text; }
.terminal .linia { white-space: pre-wrap; word-break: break-word; }
.terminal .linia.blad { color: #f87171; }
.terminal .linia.hint { color: #94a3b8; }
.terminal .linia.objasnienie { font-family: "Segoe UI", sans-serif; color: #fde68a; border-left: 3px solid #fde68a; padding-left: 8px; margin: 4px 0 8px; }
.terminal .linia.symulator { font-family: "Segoe UI", sans-serif; color: #93c5fd; font-style: italic; margin: 4px 0; }
.terminal .wejscie { display: flex; }
.terminal .wejscie input { flex: 1; background: transparent; border: 0; color: inherit; font: inherit; outline: none; }
.cwiczenie .polecenie { font-size: 16px; margin: 6px 0 10px; }
.cwiczenie button { padding: 6px 12px; border-radius: 6px; border: 1px solid var(--ramka); background: var(--tlo); cursor: pointer; }
.kropki { display: flex; gap: 6px; margin-top: 10px; }
.kropka { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--przygaszony); }
.kropka.zaliczone { background: var(--plus); border-color: var(--plus); }
.kropka.pominiete { background: repeating-linear-gradient(45deg, #cbd5e1 0 3px, #fff 3px 6px); }
.kropka.biezace { border-color: var(--main); box-shadow: 0 0 0 3px #bfdbfe; }
.podpowiedz { margin-top: 8px; padding: 8px; background: #eff6ff; border-radius: 6px; }
.zaliczenie { margin: 8px 0; padding: 10px; background: #dcfce7; border-radius: 6px; }

/* zakładka 1 */
.historia-uklad { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 12px; }
.nawigacja-krokow { display: flex; gap: 8px; align-items: center; margin-bottom: 10px; }
.nawigacja-krokow button { padding: 6px 14px; border-radius: 6px; border: 1px solid var(--ramka); background: var(--panel); cursor: pointer; }
.nawigacja-krokow button:disabled { opacity: .4; cursor: default; }
.stan-zdalny { margin: 8px 0; padding: 8px; background: var(--tlo); border-radius: 6px; font-size: 14px; }

/* zakładka 3 */
.instrukcja { max-width: 880px; }
.instrukcja section { margin-bottom: 22px; }
.komenda { display: flex; align-items: center; gap: 8px; background: var(--terminal-tlo); color: var(--terminal-tekst); padding: 6px 10px; border-radius: 6px; margin: 6px 0; }
.komenda code { flex: 1; white-space: pre-wrap; }
.komenda.do-uzupelnienia { outline: 2px dashed var(--tylda); }
.kopiuj { font: 12px "Segoe UI", sans-serif; padding: 4px 8px; border-radius: 4px; border: 1px solid #475569; background: #1e293b; color: #e2e8f0; cursor: pointer; }
.plik { border: 1px solid var(--ramka); border-radius: 6px; margin: 6px 0; background: var(--panel); }
.plik .naglowek-pliku { display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; background: var(--tlo); font-family: Consolas, monospace; }
.plik pre { margin: 0; padding: 8px; }
.sprawdz { border-left: 4px solid var(--plus); background: #f0fdf4; padding: 8px 12px; margin: 8px 0; }
.uwaga { border-left: 4px solid var(--tylda); background: #fefce8; padding: 8px 12px; margin: 8px 0; }
.wazne { border-left: 4px solid var(--minus); background: #fef2f2; padding: 8px 12px; margin: 8px 0; font-weight: 600; }
figure.zrzut { margin: 10px 0; }
figure.zrzut img { max-width: 100%; border: 1px solid var(--ramka); border-radius: 6px; }
figure.zrzut figcaption { font-size: 13px; color: var(--przygaszony); }
.brak-zrzutu { border: 2px dashed var(--ramka); padding: 24px; text-align: center; color: var(--przygaszony); }
.ramka-pomocy { border: 2px solid var(--main); border-radius: 8px; padding: 12px 16px; background: #eff6ff; }

@media (max-width: 900px) {
  .uklad-symulatora { grid-template-columns: 1fr; grid-template-areas: "cwiczenie" "graf" "terminal" "katalog"; }
  .historia-uklad { grid-template-columns: 1fr; }
}
</style>
</head>
<body>
<header class="naglowek">
  <h1>Ćwiczenia z gita</h1>
  <nav class="zakladki" role="tablist">
    <button role="tab" data-zakladka="historia" aria-selected="true">1. Jak powstało repo</button>
    <button role="tab" data-zakladka="symulator" aria-selected="false">2. Symulator i ćwiczenia</button>
    <button role="tab" data-zakladka="konsola" aria-selected="false">3. Zrób to sam w konsoli</button>
  </nav>
</header>
<main>
  <section id="historia" class="panel-zakladki"></section>
  <section id="symulator" class="panel-zakladki" hidden></section>
  <section id="konsola" class="panel-zakladki" hidden></section>
</main>
<script id="dane">
const DANE = {};
</script>
<script id="logika">
const LOGIKA = {};
</script>
<script id="widok">
function pokazZakladke(id) {
  for (const b of document.querySelectorAll('.zakladki button')) b.setAttribute('aria-selected', String(b.dataset.zakladka === id));
  for (const s of document.querySelectorAll('.panel-zakladki')) s.hidden = s.id !== id;
  if (id === 'symulator') document.getElementById('sym-wejscie')?.focus();
}

function start() {
  for (const b of document.querySelectorAll('.zakladki button')) b.addEventListener('click', () => pokazZakladke(b.dataset.zakladka));
  pokazZakladke('historia');
}

window.addEventListener('load', start);
</script>
<script id="zrzuty">
const ZRZUTY = {};
</script>
</body>
</html>
```

- [ ] **Step 7: Uruchom testy - mają przejść**

Run: `npm test`
Expected: PASS (4 testy, 0 fail).

- [ ] **Step 8: Sprawdź ręcznie w przeglądarce**

Otwórz `cwiczenia-git.html` dwuklikiem (Chrome). Kliknięcie każdej z trzech zakładek podświetla ją na niebiesko i pokazuje pustą sekcję. Konsola deweloperska (F12) bez błędów.

- [ ] **Step 9: Commit**

```bash
git add cwiczenia-git.html package.json tests/zaladuj.mjs tests/typografia.test.mjs
git commit -m "Szkielet strony z zakładkami i uruchamianie testów" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Scenariusz commitów i funkcje pomocnicze

**Files:**
- Modify: `cwiczenia-git.html` (blok `dane`, blok `logika`)
- Test: `tests/scenariusz.test.mjs`

**Interfaces:**
- Consumes: `zaladuj`, `j` (Task 1).
- Produces (blok `dane`): `SCENARIUSZ = { commity: [{ id, hash, rodzice, tor, opis, pliki: { nazwa: string[] } }], startoweGalezie, startowyHead, kroki: [] }` (kroki uzupełnia Task 3).
- Produces (blok `logika`): `commitPoId(id) -> commit|null`, `skrot(id) -> string(7)`, `migawka(id|null) -> pliki ({} dla null)`, `stanStartowy() -> stan`, `biezacyCommit(stan) -> id|null`, `osiagalneZ(id|null) -> id[]` (kolejność jak w `SCENARIUSZ.commity`), `roznicaMigawek(a, b) -> { dodane, zmienione, usuniete }` (nazwy plików), `roznicaLinii(stare, nowe) -> [{ typ: '=' | '+' | '-', tekst }]`, `domyslnyPlik(pliki, poprzednie, obecny) -> nazwa|null`, `opisPolozenia(stan) -> string`.
- `stan` = `{ head: { typ: 'galaz', nazwa } | { typ: 'odczepiony', commit }, galezie: { nazwa: commitId }, poprzedniHead: head|null }`.

- [ ] **Step 1: Napisz test `tests/scenariusz.test.mjs`**

```js
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
```

- [ ] **Step 2: Uruchom - ma nie przejść**

Run: `npm test`
Expected: FAIL - `Cannot read properties of undefined (reading 'commity')` / `A.skrot is not a function`.

- [ ] **Step 3: Zastąp zawartość bloku `dane`**

```js
const SCENARIUSZ = (() => {
  const L1 = 'to jest poczatkowa zawartosc pliku';
  const L2 = 'to dodalismy w kolejnym commicie';
  const L3 = 'ta linia powstala na main';
  const P2 = ['nowy plik tekstowy'];
  const P3 = ['zawartosc pliku nr 3'];
  return {
    commity: [
      { id: 'C1', hash: '1c4e7a228c27031fe7162d732a1c2e209a40bbfc', rodzice: [], tor: 'main', opis: 'Pierwszy commit',
        pliki: { 'plik1.txt': [L1] } },
      { id: 'C2', hash: '5b8d0f3cb7d29f43f4a81ff1f3a1202c80293337', rodzice: ['C1'], tor: 'main', opis: 'Druga linia w plik1',
        pliki: { 'plik1.txt': [L1, L2] } },
      { id: 'C3', hash: '9e2a6c40371438f82b01efb31e37cd12a4a6b6c8', rodzice: ['C2'], tor: 'nowa-funkcja', opis: 'Dodano plik2',
        pliki: { 'plik1.txt': [L1, L2], 'plik2.txt': P2 } },
      { id: 'C4', hash: 'd7f1b85aaa025b3826509827b773a79dde61238b', rodzice: ['C3'], tor: 'nowa-funkcja', opis: 'Dodano plik3',
        pliki: { 'plik1.txt': [L1, L2], 'plik2.txt': P2, 'plik3.txt': P3 } },
      { id: 'C5', hash: '3a6c9e0fbeff7287bb8d46577504b6c72d5ba3e5', rodzice: ['C2'], tor: 'main', opis: 'Linia na main',
        pliki: { 'plik1.txt': [L1, L2, L3] } },
      { id: 'C6', hash: 'f0b4d27742fbe7716cc1fdef3e9a8d5c58b0d693', rodzice: ['C5', 'C4'], tor: 'main', opis: 'Merge pull request #1 from kursant/nowa-funkcja',
        pliki: { 'plik1.txt': [L1, L2, L3], 'plik2.txt': P2, 'plik3.txt': P3 } },
    ],
    startoweGalezie: { 'main': 'C6', 'nowa-funkcja': 'C4' },
    startowyHead: { typ: 'galaz', nazwa: 'main' },
    kroki: [],
  };
})();

const DANE = { SCENARIUSZ };
```

- [ ] **Step 4: Zastąp zawartość bloku `logika`**

```js
const maWlasne = (obiekt, klucz) => Object.prototype.hasOwnProperty.call(obiekt, klucz);

function commitPoId(id) {
  return SCENARIUSZ.commity.find((c) => c.id === id) || null;
}

function skrot(id) {
  return commitPoId(id).hash.slice(0, 7);
}

function migawka(id) {
  return id ? commitPoId(id).pliki : {};
}

function stanStartowy() {
  return { head: { ...SCENARIUSZ.startowyHead }, galezie: { ...SCENARIUSZ.startoweGalezie }, poprzedniHead: null };
}

function biezacyCommit(stan) {
  if (stan.head.typ === 'galaz') return maWlasne(stan.galezie, stan.head.nazwa) ? stan.galezie[stan.head.nazwa] : null;
  return stan.head.commit;
}

function osiagalneZ(id) {
  const odwiedzone = new Set();
  const stos = id ? [id] : [];
  while (stos.length) {
    const c = stos.pop();
    if (odwiedzone.has(c)) continue;
    odwiedzone.add(c);
    stos.push(...commitPoId(c).rodzice);
  }
  return SCENARIUSZ.commity.map((c) => c.id).filter((x) => odwiedzone.has(x));
}

function roznicaMigawek(a, b) {
  const dodane = [], zmienione = [], usuniete = [];
  for (const n of Object.keys(b)) {
    if (!maWlasne(a, n)) dodane.push(n);
    else if (a[n].join('\n') !== b[n].join('\n')) zmienione.push(n);
  }
  for (const n of Object.keys(a)) if (!maWlasne(b, n)) usuniete.push(n);
  return { dodane, zmienione, usuniete };
}

function roznicaLinii(stare, nowe) {
  const n = stare.length, m = nowe.length;
  const d = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let k = m - 1; k >= 0; k--) d[i][k] = stare[i] === nowe[k] ? d[i + 1][k + 1] + 1 : Math.max(d[i + 1][k], d[i][k + 1]);
  }
  const wynik = [];
  let i = 0, k = 0;
  while (i < n && k < m) {
    if (stare[i] === nowe[k]) { wynik.push({ typ: '=', tekst: stare[i] }); i++; k++; }
    else if (d[i + 1][k] >= d[i][k + 1]) { wynik.push({ typ: '-', tekst: stare[i] }); i++; }
    else { wynik.push({ typ: '+', tekst: nowe[k] }); k++; }
  }
  while (i < n) wynik.push({ typ: '-', tekst: stare[i++] });
  while (k < m) wynik.push({ typ: '+', tekst: nowe[k++] });
  return wynik;
}

function domyslnyPlik(pliki, poprzednie, obecny) {
  const r = roznicaMigawek(poprzednie, pliki);
  const zmienione = [...r.zmienione, ...r.dodane];
  if (zmienione.length) return zmienione[0];
  if (obecny && maWlasne(pliki, obecny)) return obecny;
  return Object.keys(pliki)[0] ?? null;
}

function opisPolozenia(stan) {
  const c = biezacyCommit(stan);
  if (stan.head.typ === 'galaz') return `Jesteś na: gałęzi ${stan.head.nazwa}, commit ${skrot(c)}`;
  return `Jesteś na: commicie ${skrot(c)} (odczepiony HEAD)`;
}

const LOGIKA = { commitPoId, skrot, migawka, stanStartowy, biezacyCommit, osiagalneZ, roznicaMigawek, roznicaLinii, domyslnyPlik, opisPolozenia };
```

- [ ] **Step 5: Uruchom - ma przejść**

Run: `npm test`
Expected: PASS (wszystkie testy z Task 1 i Task 2).

- [ ] **Step 6: Commit**

```bash
git add cwiczenia-git.html tests/scenariusz.test.mjs
git commit -m "Scenariusz commitów C1-C6 i funkcje pomocnicze logiki" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Kroki budowy repo K1-K13

**Files:**
- Modify: `cwiczenia-git.html` (blok `dane`: `kroki`; blok `logika`)
- Test: `tests/scenariusz.test.mjs` (dopisanie testów)

**Interfaces:**
- Consumes: `SCENARIUSZ`, `migawka`, `skrot`, `roznicaMigawek` (Task 2).
- Produces: `SCENARIUSZ.kroki[i] = { id, tytul, opis, plik?: { nazwa, akcja: 'nowy' | 'dopisz', linie }, commit?: id, komendy?: string[], naGithubie?: string, lokalnie: { commity, galezie, head }, github: { galezie } }`; `katalogKroku(krok) -> pliki`; `komendyKroku(krok) -> string[]` (dla kroków z `commit`: `git add .` i `git commit -m "<opis commita>"`); `opisGalezi(galezie) -> string`.

- [ ] **Step 1: Dopisz testy na końcu `tests/scenariusz.test.mjs`**

```js
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
```

- [ ] **Step 2: Uruchom - ma nie przejść**

Run: `npm test`
Expected: FAIL - `13 kroków` (pusta lista) oraz `A.katalogKroku is not a function`.

- [ ] **Step 3: W bloku `dane` zastąp linię `    kroki: [],` pełną listą kroków**

```js
    kroki: [
      { id: 'K1', tytul: 'Zakładamy repozytorium', komendy: ['git init -b main'],
        opis: 'git init tworzy w folderze ukryty katalog .git - to właśnie jest repozytorium. Opcja -b main nadaje pierwszej gałęzi nazwę main. Nie ma jeszcze żadnego commita, więc gałąź main na nic nie wskazuje.',
        lokalnie: { commity: [], galezie: {}, head: { typ: 'galaz', nazwa: 'main' } }, github: { galezie: {} } },
      { id: 'K2', tytul: 'Pierwszy commit', plik: { nazwa: 'plik1.txt', akcja: 'nowy', linie: [L1] }, commit: 'C1',
        opis: 'W Notatniku tworzymy plik1.txt. git add . dodaje zmiany do poczekalni (staging), a git commit zapisuje migawkę całego katalogu. Gałąź main wskazuje teraz ten commit, a HEAD wskazuje gałąź main.',
        lokalnie: { commity: ['C1'], galezie: { main: 'C1' }, head: { typ: 'galaz', nazwa: 'main' } }, github: { galezie: {} } },
      { id: 'K3', tytul: 'Drugi commit', plik: { nazwa: 'plik1.txt', akcja: 'dopisz', linie: [L2] }, commit: 'C2',
        opis: 'Dopisujemy linię i robimy kolejny commit. Nowy commit pamięta swojego rodzica (poprzedni commit), a gałąź main przesuwa się na nowy commit.',
        lokalnie: { commity: ['C1', 'C2'], galezie: { main: 'C2' }, head: { typ: 'galaz', nazwa: 'main' } }, github: { galezie: {} } },
      { id: 'K4', tytul: 'Wysyłamy repozytorium na GitHuba', komendy: ['git remote add origin <adres-repozytorium-z-GitHuba>', 'git push -u origin main'],
        opis: 'git remote add zapamiętuje adres repozytorium na GitHubie pod nazwą origin. git push wysyła commity - od teraz gałąź main na GitHubie wskazuje ten sam commit co u Ciebie. Opcja -u zapamiętuje to powiązanie, więc później wystarczy samo git push.',
        lokalnie: { commity: ['C1', 'C2'], galezie: { main: 'C2' }, head: { typ: 'galaz', nazwa: 'main' } }, github: { galezie: { main: 'C2' } } },
      { id: 'K5', tytul: 'Nowa gałąź', komendy: ['git checkout -b nowa-funkcja'],
        opis: 'checkout -b tworzy gałąź nowa-funkcja dokładnie tam, gdzie stoisz, i od razu na nią przełącza. Pliki się nie zmieniają - obie gałęzie wskazują ten sam commit. Zmienia się tylko to, na co wskazuje HEAD.',
        lokalnie: { commity: ['C1', 'C2'], galezie: { main: 'C2', 'nowa-funkcja': 'C2' }, head: { typ: 'galaz', nazwa: 'nowa-funkcja' } }, github: { galezie: { main: 'C2' } } },
      { id: 'K6', tytul: 'Commit na nowej gałęzi', plik: { nazwa: 'plik2.txt', akcja: 'nowy', linie: P2 }, commit: 'C3',
        opis: 'Nowy commit trafia na gałąź, na którą wskazuje HEAD, czyli nowa-funkcja. Gałąź main zostaje w miejscu.',
        lokalnie: { commity: ['C1', 'C2', 'C3'], galezie: { main: 'C2', 'nowa-funkcja': 'C3' }, head: { typ: 'galaz', nazwa: 'nowa-funkcja' } }, github: { galezie: { main: 'C2' } } },
      { id: 'K7', tytul: 'Kolejny commit na nowej gałęzi', plik: { nazwa: 'plik3.txt', akcja: 'nowy', linie: P3 }, commit: 'C4',
        opis: 'Gałąź nowa-funkcja ma już dwa commity, których main nie zna. Gałąź main nadal wskazuje drugi commit.',
        lokalnie: { commity: ['C1', 'C2', 'C3', 'C4'], galezie: { main: 'C2', 'nowa-funkcja': 'C4' }, head: { typ: 'galaz', nazwa: 'nowa-funkcja' } }, github: { galezie: { main: 'C2' } } },
      { id: 'K8', tytul: 'Wysyłamy nową gałąź', komendy: ['git push -u origin nowa-funkcja'],
        opis: 'Nowa gałąź trafia na GitHuba. Przy pierwszym wysłaniu nowej gałęzi podajemy jej nazwę i -u; później znowu wystarczy samo git push.',
        lokalnie: { commity: ['C1', 'C2', 'C3', 'C4'], galezie: { main: 'C2', 'nowa-funkcja': 'C4' }, head: { typ: 'galaz', nazwa: 'nowa-funkcja' } }, github: { galezie: { main: 'C2', 'nowa-funkcja': 'C4' } } },
      { id: 'K9', tytul: 'Wracamy na main', komendy: ['git checkout main'],
        opis: 'Przełączenie na main zmienia pliki w folderze: plik2.txt i plik3.txt znikają, bo commit, na który wskazuje main, ich nie zawiera. Nic nie przepadło - są bezpiecznie zapisane w commitach gałęzi nowa-funkcja.',
        lokalnie: { commity: ['C1', 'C2', 'C3', 'C4'], galezie: { main: 'C2', 'nowa-funkcja': 'C4' }, head: { typ: 'galaz', nazwa: 'main' } }, github: { galezie: { main: 'C2', 'nowa-funkcja': 'C4' } } },
      { id: 'K10', tytul: 'Commit na main', plik: { nazwa: 'plik1.txt', akcja: 'dopisz', linie: [L3] }, commit: 'C5',
        opis: 'Commit na main ma tego samego rodzica co pierwszy commit gałęzi nowa-funkcja. Historia się rozwidla: dwie gałęzie rozwijają się niezależnie.',
        lokalnie: { commity: ['C1', 'C2', 'C3', 'C4', 'C5'], galezie: { main: 'C5', 'nowa-funkcja': 'C4' }, head: { typ: 'galaz', nazwa: 'main' } }, github: { galezie: { main: 'C2', 'nowa-funkcja': 'C4' } } },
      { id: 'K11', tytul: 'Wysyłamy main', komendy: ['git push'],
        opis: 'Wysyłamy nowy commit z main na GitHuba. To ważne: Pull Request scali gałęzie na GitHubie, więc GitHub musi znać ten commit.',
        lokalnie: { commity: ['C1', 'C2', 'C3', 'C4', 'C5'], galezie: { main: 'C5', 'nowa-funkcja': 'C4' }, head: { typ: 'galaz', nazwa: 'main' } }, github: { galezie: { main: 'C5', 'nowa-funkcja': 'C4' } } },
      { id: 'K12', tytul: 'Pull Request na GitHubie', komendy: [], naGithubie: 'Pull Request z nowa-funkcja do main, przycisk „Merge pull request"',
        opis: 'Na GitHubie scalamy nowa-funkcja do main. Powstaje commit scalający z dwoma rodzicami - ale tylko na GitHubie. U Ciebie na dysku nic się jeszcze nie zmieniło.',
        lokalnie: { commity: ['C1', 'C2', 'C3', 'C4', 'C5'], galezie: { main: 'C5', 'nowa-funkcja': 'C4' }, head: { typ: 'galaz', nazwa: 'main' } }, github: { galezie: { main: 'C6', 'nowa-funkcja': 'C4' } } },
      { id: 'K13', tytul: 'Pobieramy zmiany', komendy: ['git pull'],
        opis: 'git pull pobiera commit scalający z GitHuba i przesuwa Twoją gałąź main. W folderze pojawiają się plik2.txt i plik3.txt, a plik1.txt ma wszystkie trzy linie. Od tego stanu startuje symulator w zakładce 2.',
        lokalnie: { commity: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'], galezie: { main: 'C6', 'nowa-funkcja': 'C4' }, head: { typ: 'galaz', nazwa: 'main' } }, github: { galezie: { main: 'C6', 'nowa-funkcja': 'C4' } } },
    ],
```

- [ ] **Step 4: W bloku `logika` dopisz funkcje przed linią `const LOGIKA = ...` i zastąp tę linię**

```js
function katalogKroku(krok) {
  const l = krok.lokalnie;
  return migawka(maWlasne(l.galezie, l.head.nazwa) ? l.galezie[l.head.nazwa] : null);
}

function komendyKroku(krok) {
  if (krok.commit) return ['git add .', `git commit -m "${commitPoId(krok.commit).opis}"`];
  return krok.komendy || [];
}

function opisGalezi(galezie) {
  const wpisy = Object.entries(galezie);
  if (wpisy.length === 0) return 'brak gałęzi';
  return wpisy.map(([n, id]) => `${n}: ${skrot(id)}`).join(', ');
}

const LOGIKA = { commitPoId, skrot, migawka, stanStartowy, biezacyCommit, osiagalneZ, roznicaMigawek, roznicaLinii, domyslnyPlik, opisPolozenia, katalogKroku, komendyKroku, opisGalezi };
```

- [ ] **Step 5: Uruchom - ma przejść**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add cwiczenia-git.html tests/scenariusz.test.mjs
git commit -m "Kroki budowy repo K1-K13 ze stanem lokalnym i GitHuba" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Tokenizer, walidacja nazw gałęzi, rozstrzyganie argumentu

**Files:**
- Modify: `cwiczenia-git.html` (blok `logika`)
- Test: `tests/parser.test.mjs`

**Interfaces:**
- Consumes: `maWlasne`, `migawka`, `biezacyCommit`, `SCENARIUSZ` (Task 2).
- Produces: `tokenizuj(linia) -> { tokeny: string[] } | { blad: 'cudzyslow' }`; `poprawnaNazwaGalezi(nazwa) -> boolean`; `rozwiazRewizje(stan, arg) -> { typ: 'galaz', nazwa } | { typ: 'commit', id } | { typ: 'nieobslugiwana' } | { typ: 'plik' } | { typ: 'brak' }` (kolejność ze spec 7.3: gałąź, forma nieobsługiwana, plik, prefiks hasha, brak).

- [ ] **Step 1: Napisz test `tests/parser.test.mjs`**

```js
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
```

- [ ] **Step 2: Uruchom - ma nie przejść**

Run: `npm test`
Expected: FAIL - `A.tokenizuj is not a function`.

- [ ] **Step 3: W bloku `logika` dopisz funkcje przed `const LOGIKA = ...` i zastąp tę linię**

```js
function tokenizuj(linia) {
  const tokeny = [];
  let biezacy = null;
  let wCudzyslowie = false;
  for (const znak of linia) {
    if (znak === '"') {
      wCudzyslowie = !wCudzyslowie;
      if (biezacy === null) biezacy = '';
      continue;
    }
    if (!wCudzyslowie && /\s/.test(znak)) {
      if (biezacy !== null) { tokeny.push(biezacy); biezacy = null; }
      continue;
    }
    biezacy = (biezacy ?? '') + znak;
  }
  if (wCudzyslowie) return { blad: 'cudzyslow' };
  if (biezacy !== null) tokeny.push(biezacy);
  return { tokeny };
}

function poprawnaNazwaGalezi(nazwa) {
  if (!nazwa || nazwa === 'HEAD' || nazwa === '@') return false;
  if (/[\x00-\x20\x7f~^:?*[\\]/.test(nazwa)) return false;
  if (nazwa.includes('..') || nazwa.includes('//') || nazwa.includes('@{')) return false;
  if (nazwa.startsWith('-') || nazwa.startsWith('/')) return false;
  if (nazwa.endsWith('/') || nazwa.endsWith('.')) return false;
  return nazwa.split('/').every((czesc) => !czesc.startsWith('.') && !czesc.endsWith('.lock'));
}

function rozwiazRewizje(stan, arg) {
  if (maWlasne(stan.galezie, arg)) return { typ: 'galaz', nazwa: arg };
  if (arg === '@' || arg === '-' || arg.startsWith('HEAD') || /[~^]|@\{/.test(arg)) return { typ: 'nieobslugiwana' };
  if (maWlasne(migawka(biezacyCommit(stan)), arg)) return { typ: 'plik' };
  if (/^[0-9a-f]{4,40}$/i.test(arg)) {
    const pasujace = SCENARIUSZ.commity.filter((c) => c.hash.startsWith(arg.toLowerCase()));
    if (pasujace.length === 1) return { typ: 'commit', id: pasujace[0].id };
  }
  return { typ: 'brak' };
}

const LOGIKA = { commitPoId, skrot, migawka, stanStartowy, biezacyCommit, osiagalneZ, roznicaMigawek, roznicaLinii, domyslnyPlik, opisPolozenia, katalogKroku, komendyKroku, opisGalezi, tokenizuj, poprawnaNazwaGalezi, rozwiazRewizje };
```

- [ ] **Step 4: Uruchom - ma przejść**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add cwiczenia-git.html tests/parser.test.mjs
git commit -m "Tokenizer, walidacja nazw gałęzi i rozstrzyganie argumentu checkout" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Interpreter - komendy symulatora i git ogólnie

**Files:**
- Modify: `cwiczenia-git.html` (blok `dane`: `TEKSTY`, `OBJASNIENIA`, `ZNANE_KOMENDY_GITA`; blok `logika`)
- Create: `tests/pomocnicze.mjs`
- Test: `tests/komendy.test.mjs`

**Interfaces:**
- Consumes: `tokenizuj`, `stanStartowy`, `opisGalezi` (Task 2-4).
- Produces: `wykonaj(stan, linia) -> { stan, wynik: [{ typ: 'git' | 'objasnienie' | 'symulator', tekst }], wykonanie: null | { forma: 'galaz' | 'hash' | 'nowaGalaz', argument }, akcja: null | 'clear' | 'restart' }`. Przy braku zmian zwracany jest TEN SAM obiekt `stan`. Wewnętrznie: `checkout(stan, argumenty)` (w tym zadaniu wersja minimalna, pełna w Task 6), helpery `git(t)`, `obj(t)`, `sym(t)`.

- [ ] **Step 1: Napisz helpery `tests/pomocnicze.mjs`**

```js
import { zaladuj, j } from './zaladuj.mjs';

export const A = zaladuj();

export function seria(linie, stan = A.stanStartowy()) {
  let r = null;
  for (const linia of linie) { r = A.wykonaj(stan, linia); stan = r.stan; }
  return r;
}
// Tablice z realmu vm normalizujemy przez j(), inaczej assert/strict odrzuci je przez inny prototyp.
export const gitLinie = (r) => j(r.wynik.filter((l) => l.typ === 'git').map((l) => l.tekst));
export const typy = (r) => j(r.wynik.map((l) => l.typ));
export function objasnionyPoGicie(r) {
  const t = typy(r);
  const ostatni = t.lastIndexOf('git');
  return ostatni === -1 || t.slice(ostatni + 1).includes('objasnienie');
}
```

- [ ] **Step 1b: Napisz test `tests/komendy.test.mjs`**

```js
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
```

- [ ] **Step 2: Uruchom - ma nie przejść**

Run: `npm test`
Expected: FAIL - `A.wykonaj is not a function`.

- [ ] **Step 3: W bloku `dane` dopisz przed `const DANE = ...` i zastąp tę linię**

```js
const ZNANE_KOMENDY_GITA = ['add', 'commit', 'push', 'pull', 'fetch', 'merge', 'rebase', 'reset', 'restore', 'revert', 'stash',
  'status', 'log', 'diff', 'show', 'branch', 'switch', 'init', 'clone', 'remote', 'config', 'tag'];

const TEKSTY = {
  pomoc: [
    'Obsługiwane komendy:',
    '  git checkout <gałąź>     - przełącza na gałąź',
    '  git checkout <hash>      - przełącza na commit (odczepiony HEAD); hash wkleisz, klikając commit w grafie',
    '  git checkout -b <nazwa>  - tworzy gałąź tam, gdzie stoisz, i od razu na nią przełącza',
    '  help                     - ta lista',
    '  clear                    - czyści terminal (także Ctrl+L)',
    '  restart                  - przywraca repozytorium do stanu po scaleniu (postęp ćwiczeń zostaje)',
  ],
  cudzyslow: 'Brakuje zamykającego cudzysłowu - komenda nie została wykonana.',
  nieznanaKomenda: (x) => `Nie znam komendy „${x}". Wpisz help, żeby zobaczyć listę.`,
  samoGit: 'Podaj komendę, np. git checkout main',
  tylkoPoruszanie: 'W symulatorze tylko się poruszamy - tę komendę wykonasz we własnym repo (zakładka 3)',
  restart: (opis) => `Repozytorium wróciło do stanu po scaleniu (${opis}, HEAD wskazuje main). Postęp ćwiczeń został.`,
  bStartPoint: 'W symulatorze nową gałąź tworzysz tam, gdzie stoisz: najpierw przełącz się na commit, potem git checkout -b nazwa',
  nieobslugiwanaForma: 'Ta forma działa w prawdziwym gicie, ale symulator jej nie obsługuje - użyj nazwy gałęzi albo hasha',
  przywracaniePlikow: 'Przywracanie plików nie jest częścią tego ćwiczenia',
  powitanie: 'Witaj w symulatorze. Repozytorium jest w stanie po scaleniu. Wpisz help, żeby zobaczyć komendy.',
};

const OBJASNIENIA = {
  juzNaGalezi: (g) => `Tłumaczenie: „Już jesteś na gałęzi ${g}". Nic się nie zmieniło - HEAD już wskazuje tę gałąź.`,
  przelaczono: (g) => `Tłumaczenie: „Przełączono na gałąź ${g}". HEAD wskazuje teraz gałąź ${g}, a pliki w katalogu wyglądają tak jak w commicie, na który ta gałąź wskazuje.`,
  wyjscieZOdczepionego: (h, g) => `Tłumaczenie: „Poprzednio HEAD był na commicie ${h}. Przełączono na gałąź ${g}". Git przypomina, z którego commita wychodzisz, bo stałeś tam bez gałęzi (odczepiony HEAD). Teraz HEAD znowu wskazuje gałąź ${g}.`,
  odczepiony: (arg, h) => `Tłumaczenie w skrócie: „Przełączam na ${arg}. Jesteś w stanie odczepionego HEAD (detached HEAD): możesz się rozglądać, a nawet robić commity, ale nie będą należeć do żadnej gałęzi. Żeby je zachować, utwórz gałąź. HEAD jest teraz na ${h}". O co chodzi: oglądasz commit ${h}, ale nie jesteś na żadnej gałęzi. Git podpowiada komendy git switch -c oraz git switch -: to nowsze odpowiedniki git checkout -b <nazwa> i powrotu na poprzednią gałąź. W tym ćwiczeniu używamy checkout.`,
  przeskok: (hp, h) => `Tłumaczenie: „Poprzednio HEAD był na ${hp}. HEAD jest teraz na ${h}". Przeskoczyłeś z jednego commita na inny - nadal bez gałęzi (odczepiony HEAD).`,
  juzNaCommicie: (h) => `Tłumaczenie: „HEAD jest teraz na ${h}". Już tu byłeś - nic się nie zmieniło.`,
  nowaGalaz: (g) => `Tłumaczenie: „Przełączono na nową gałąź ${g}". Gałąź ${g} powstała na commicie, na którym stoisz, i HEAD od razu na nią wskazuje. Jeśli HEAD był odczepiony, teraz już nie jest.`,
  galazIstnieje: (g, istniejaca) => `Tłumaczenie: „błąd krytyczny: gałąź o nazwie ${g} już istnieje". Wybierz inną nazwę albo przełącz się na istniejącą gałąź bez -b.` +
    (g !== istniejaca ? ` W Windows git nie odróżnia wielkości liter w nazwach gałęzi: ${g} to dla niego to samo co ${istniejaca}.` : ''),
  zlaNazwa: (g) => `Tłumaczenie: „${g} nie jest poprawną nazwą gałęzi" (linie hint odsyłają do dokumentacji). Nazwa gałęzi nie może zawierać spacji ani znaków takich jak ~ ^ : ? * [ \\ i nie może zaczynać się od minusa. Użyj np. moja-galaz.`,
  kolizja: (g, k) => `Tłumaczenie: „nie można utworzyć ${g}, bo istnieje ${k}". Git zapisuje gałęzie jak pliki w folderach, więc gałąź ${k} blokuje nazwę ${g} (i odwrotnie). Wybierz inną nazwę.`,
  brakNazwy: 'Tłumaczenie: „opcja b wymaga wartości". Po -b podaj nazwę nowej gałęzi, np. git checkout -b moja-galaz.',
  pathspec: (x) => `Tłumaczenie: „ścieżka ${x} nie pasuje do żadnego pliku znanego gitowi". Git nie znalazł gałęzi, commita ani pliku o nazwie „${x}". Sprawdź literówkę; hash musi mieć co najmniej 4 znaki.`,
  pustyNapis: 'Tłumaczenie: „pusty napis nie jest poprawną ścieżką". Między cudzysłowami nic nie ma - podaj gałąź albo hash.',
  nieznanaOpcja: (x) => `Tłumaczenie: „nieznana opcja ${x}", a pod spodem początek opisu użycia. Symulator rozumie tylko opcję -b (prawdziwy git wypisuje tu jeszcze długą listę wszystkich opcji).`,
  checkoutBezArgumentu: 'Prawdziwy git nic tu nie wypisuje. Sam checkout nic nie robi - podaj gałąź albo hash, np. git checkout main.',
  nieKomendaGita: (x, p) => `Tłumaczenie: „${x} nie jest komendą gita". Może literówka?` + (p ? ` Git podpowiada najbardziej podobną komendę: ${p}.` : ''),
};

const DANE = { SCENARIUSZ, ZNANE_KOMENDY_GITA, TEKSTY, OBJASNIENIA };
```

- [ ] **Step 4: W bloku `logika` dopisz funkcje przed `const LOGIKA = ...` i zastąp tę linię**

```js
const git = (tekst) => ({ typ: 'git', tekst });
const obj = (tekst) => ({ typ: 'objasnienie', tekst });
const sym = (tekst) => ({ typ: 'symulator', tekst });

function odleglosc(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let k = 1; k <= b.length; k++) d[0][k] = k;
  for (let i = 1; i <= a.length; i++) {
    for (let k = 1; k <= b.length; k++) {
      d[i][k] = Math.min(d[i - 1][k] + 1, d[i][k - 1] + 1, d[i - 1][k - 1] + (a[i - 1] === b[k - 1] ? 0 : 1));
    }
  }
  return d[a.length][b.length];
}

function nieznanaKomendaGita(pod) {
  const kandydaci = ['checkout', ...ZNANE_KOMENDY_GITA];
  const bliskie = kandydaci.filter((k) => odleglosc(pod.toLowerCase(), k) <= 2);
  const podpowiedz = bliskie.length === 1 ? bliskie[0] : null;
  const wynik = [git(`git: '${pod}' is not a git command. See 'git --help'.`)];
  if (podpowiedz) wynik.push(git(''), git('The most similar command is'), git('\t' + podpowiedz));
  wynik.push(obj(OBJASNIENIA.nieKomendaGita(pod, podpowiedz)));
  return wynik;
}

// Wersja minimalna - pełna obsługa w Task 6.
function checkout(stan, argumenty) {
  if (argumenty.length === 0) return { stan, wynik: [obj(OBJASNIENIA.checkoutBezArgumentu)], wykonanie: null, akcja: null };
  return { stan, wynik: [git(`error: pathspec '${argumenty[0]}' did not match any file(s) known to git`), obj(OBJASNIENIA.pathspec(argumenty[0]))], wykonanie: null, akcja: null };
}

function wykonaj(stan, linia) {
  const nic = (wynik, akcja = null) => ({ stan, wynik, wykonanie: null, akcja });
  const t = tokenizuj(linia.trim());
  if (t.blad) return nic([sym(TEKSTY.cudzyslow)]);
  const [komenda, ...reszta] = t.tokeny;
  if (komenda === undefined) return nic([]);
  const mala = komenda.toLowerCase();
  if (mala === 'help') return nic(TEKSTY.pomoc.map(sym));
  if (mala === 'clear') return nic([], 'clear');
  if (mala === 'restart') {
    const nowy = stanStartowy();
    return { stan: nowy, wynik: [sym(TEKSTY.restart(opisGalezi(nowy.galezie)))], wykonanie: null, akcja: 'restart' };
  }
  if (mala !== 'git') return nic([sym(TEKSTY.nieznanaKomenda(komenda))]);
  if (reszta.length === 0) return nic([sym(TEKSTY.samoGit)]);
  const [pod, ...argumenty] = reszta;
  if (pod === 'checkout') return checkout(stan, argumenty);
  if (pod.startsWith('-') || ZNANE_KOMENDY_GITA.includes(pod)) return nic([sym(TEKSTY.tylkoPoruszanie)]);
  return nic(nieznanaKomendaGita(pod));
}

const LOGIKA = { commitPoId, skrot, migawka, stanStartowy, biezacyCommit, osiagalneZ, roznicaMigawek, roznicaLinii, domyslnyPlik, opisPolozenia, katalogKroku, komendyKroku, opisGalezi, tokenizuj, poprawnaNazwaGalezi, rozwiazRewizje, wykonaj };
```

- [ ] **Step 5: Uruchom - ma przejść**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add cwiczenia-git.html tests/pomocnicze.mjs tests/komendy.test.mjs
git commit -m "Interpreter: komendy symulatora i rozpoznawanie komend gita" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Interpreter - `git checkout` co do znaku

**Files:**
- Modify: `cwiczenia-git.html` (blok `logika`: zastąpienie funkcji `checkout`)
- Test: `tests/checkout.test.mjs`

**Interfaces:**
- Consumes: `wykonaj`, `git`, `obj`, `sym`, `rozwiazRewizje`, `poprawnaNazwaGalezi`, `biezacyCommit`, `skrot`, `commitPoId`, `maWlasne`, `TEKSTY`, `OBJASNIENIA` (Task 2-5); helpery testowe `A`, `seria`, `gitLinie`, `typy`, `objasnionyPoGicie` z `tests/pomocnicze.mjs`.
- Produces: pełna obsługa `git checkout` wg tabel 7.3 i 7.4 spec; `wykonanie` niepuste tylko dla udanego przełączenia na gałąź (`galaz`), commit (`hash`) albo utworzenia gałęzi (`nowaGalaz`).

- [ ] **Step 1: Napisz test `tests/checkout.test.mjs`**

```js
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
```

- [ ] **Step 2: Uruchom - ma nie przejść**

Run: `npm test`
Expected: FAIL - m.in. `gałąź, na której już jesteś` (minimalny `checkout` zwraca błąd pathspec).

- [ ] **Step 3: W bloku `logika` zastąp całą funkcję `checkout` (razem z komentarzem „Wersja minimalna") poniższym kodem**

```js
function ostrzezenieOdczepiony(argument) {
  return [
    `Note: switching to '${argument}'.`, '',
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
}

const polozenieCommita = (id) => `${skrot(id)} ${commitPoId(id).opis}`;

function naGalaz(stan, nazwa) {
  const wykonanie = { forma: 'galaz', argument: nazwa };
  if (stan.head.typ === 'galaz' && stan.head.nazwa === nazwa) {
    return { stan, wynik: [git(`Already on '${nazwa}'`), obj(OBJASNIENIA.juzNaGalezi(nazwa))], wykonanie, akcja: null };
  }
  const cel = stan.galezie[nazwa];
  const poprzedni = stan.head.typ === 'odczepiony' && stan.head.commit !== cel ? stan.head.commit : null;
  const wynik = [];
  if (poprzedni) wynik.push(git(`Previous HEAD position was ${polozenieCommita(poprzedni)}`));
  wynik.push(git(`Switched to branch '${nazwa}'`));
  wynik.push(obj(poprzedni ? OBJASNIENIA.wyjscieZOdczepionego(skrot(poprzedni), nazwa) : OBJASNIENIA.przelaczono(nazwa)));
  return { stan: { ...stan, head: { typ: 'galaz', nazwa }, poprzedniHead: stan.head }, wynik, wykonanie, akcja: null };
}

function naCommit(stan, id, argument) {
  const teraz = git(`HEAD is now at ${polozenieCommita(id)}`);
  let wynik;
  if (stan.head.typ === 'galaz') {
    wynik = [...ostrzezenieOdczepiony(argument).map(git), teraz, obj(OBJASNIENIA.odczepiony(argument, skrot(id)))];
  } else if (stan.head.commit !== id) {
    const p = stan.head.commit;
    wynik = [git(`Previous HEAD position was ${polozenieCommita(p)}`), teraz, obj(OBJASNIENIA.przeskok(skrot(p), skrot(id)))];
  } else {
    wynik = [teraz, obj(OBJASNIENIA.juzNaCommicie(skrot(id)))];
  }
  return { stan: { ...stan, head: { typ: 'odczepiony', commit: id }, poprzedniHead: stan.head }, wynik, wykonanie: { forma: 'hash', argument }, akcja: null };
}

function nowaGalaz(stan, dalsze) {
  const nic = (wynik) => ({ stan, wynik, wykonanie: null, akcja: null });
  if (dalsze.length === 0) return nic([git("error: switch `b' requires a value"), obj(OBJASNIENIA.brakNazwy)]);
  if (dalsze.length > 1) return nic([sym(TEKSTY.bStartPoint)]);
  const nazwa = dalsze[0];
  if (!poprawnaNazwaGalezi(nazwa)) {
    return nic([git(`fatal: '${nazwa}' is not a valid branch name`), git('hint: See `man git check-ref-format`'),
      git('hint: Disable this message with "git config advice.refSyntax false"'), obj(OBJASNIENIA.zlaNazwa(nazwa))]);
  }
  const istniejace = Object.keys(stan.galezie);
  // Git for Windows nie odróżnia wielkości liter w nazwach gałęzi (zweryfikowane na 2.47.1).
  const taSama = istniejace.find((g) => g.toLowerCase() === nazwa.toLowerCase());
  if (taSama !== undefined) return nic([git(`fatal: a branch named '${nazwa}' already exists`), obj(OBJASNIENIA.galazIstnieje(nazwa, taSama))]);
  const kolizja = istniejace.find((g) => g.toLowerCase().startsWith(nazwa.toLowerCase() + '/') || nazwa.toLowerCase().startsWith(g.toLowerCase() + '/'));
  if (kolizja !== undefined) {
    return nic([git(`fatal: cannot lock ref 'refs/heads/${nazwa}': 'refs/heads/${kolizja}' exists; cannot create 'refs/heads/${nazwa}'`), obj(OBJASNIENIA.kolizja(nazwa, kolizja))]);
  }
  const galezie = { ...stan.galezie, [nazwa]: biezacyCommit(stan) };
  return {
    stan: { head: { typ: 'galaz', nazwa }, galezie, poprzedniHead: stan.head },
    wynik: [git(`Switched to a new branch '${nazwa}'`), obj(OBJASNIENIA.nowaGalaz(nazwa))],
    wykonanie: { forma: 'nowaGalaz', argument: nazwa },
    akcja: null,
  };
}

function checkout(stan, argumenty) {
  const nic = (wynik) => ({ stan, wynik, wykonanie: null, akcja: null });
  if (argumenty.length === 0) return nic([obj(OBJASNIENIA.checkoutBezArgumentu)]);
  const [pierwszy, ...dalsze] = argumenty;
  if (pierwszy === '-b') return nowaGalaz(stan, dalsze);
  if (pierwszy === '--') return nic([sym(TEKSTY.przywracaniePlikow)]);
  if (pierwszy === '-') return nic([sym(TEKSTY.nieobslugiwanaForma)]);
  const uzycie = git('usage: git checkout [<options>] <branch>');
  if (pierwszy.startsWith('--')) return nic([git(`error: unknown option \`${pierwszy.slice(2)}'`), uzycie, obj(OBJASNIENIA.nieznanaOpcja(pierwszy))]);
  if (pierwszy.startsWith('-')) return nic([git(`error: unknown switch \`${pierwszy[1]}'`), uzycie, obj(OBJASNIENIA.nieznanaOpcja(pierwszy))]);
  if (pierwszy === '') return nic([git('fatal: empty string is not a valid pathspec. please use . instead if you meant to match all paths'), obj(OBJASNIENIA.pustyNapis)]);
  const cel = rozwiazRewizje(stan, pierwszy);
  if (cel.typ === 'nieobslugiwana') return nic([sym(TEKSTY.nieobslugiwanaForma)]);
  if (cel.typ === 'plik') return nic([sym(TEKSTY.przywracaniePlikow)]);
  const bledne = cel.typ === 'brak' ? argumenty : dalsze;
  if (bledne.length > 0) {
    return nic([...bledne.map((x) => git(`error: pathspec '${x}' did not match any file(s) known to git`)), obj(OBJASNIENIA.pathspec(bledne[0]))]);
  }
  return cel.typ === 'galaz' ? naGalaz(stan, cel.nazwa) : naCommit(stan, cel.id, pierwszy);
}
```

- [ ] **Step 4: Uruchom - ma przejść**

Run: `npm test`
Expected: PASS (wszystkie pliki testów).

- [ ] **Step 5: Commit**

```bash
git add cwiczenia-git.html tests/checkout.test.mjs
git commit -m "Interpreter: pełna obsługa git checkout z komunikatami gita 2.47.1" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Ćwiczenia, sprawdzarka i postęp

**Files:**
- Modify: `cwiczenia-git.html` (blok `dane`: `CWICZENIA`; blok `logika`)
- Test: `tests/cwiczenia.test.mjs`

**Interfaces:**
- Consumes: `wykonaj`, `biezacyCommit`, `skrot`, `commitPoId`, `SCENARIUSZ` (Task 2-6).
- Produces: `CWICZENIA[i] = { polecenie, podpowiedz, warunek, poZaliczeniu(kontekst) -> string }`, gdzie `warunek` to jedno z: `{ typ: 'naGalezi', nazwa }`, `{ typ: 'odczepionyNa', commit }`, `{ typ: 'plikPojawilSie', plik }`, `{ typ: 'plikJakW', plik, commit }` (treść pliku taka jak w podanym commicie - linie brane z migawki), `{ typ: 'nowaGalazNaCommicie', nazwa, opis }`; `commityPasujace(warunek) -> id[]`; `sprawdz(cwiczenie, stan, wykonanie) -> { zaliczone, komunikat }`; `krokPostepu(postep, zdarzenie) -> postep` (`postep = { biezace, wyniki }`, zdarzenia `{ typ: 'wykonanie', zaliczone }`, `{ typ: 'pomin' }`, `{ typ: 'restart' }`); `nowaSesja() -> { stan, postep }`; `przetworz(sesja, linia) -> { sesja, wynik, akcja, zaliczenie: null | { nr, komunikat } }`; `pomin(sesja) -> sesja`.

- [ ] **Step 1: Napisz test `tests/cwiczenia.test.mjs`**

```js
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
```

- [ ] **Step 2: Uruchom - ma nie przejść**

Run: `npm test`
Expected: FAIL - `Cannot read properties of undefined (reading 'length')` (brak `CWICZENIA`).

- [ ] **Step 3: W bloku `dane` dopisz przed `const DANE = ...` i zastąp tę linię**

```js
const CWICZENIA = [
  { polecenie: 'Przełącz się na gałąź nowa-funkcja.',
    podpowiedz: 'Użyj: git checkout <nazwa-gałęzi>',
    warunek: { typ: 'naGalezi', nazwa: 'nowa-funkcja' },
    poZaliczeniu: () => 'Zobacz katalog: plik1.txt stracił linię „ta linia powstala na main" - gałąź nowa-funkcja jej nie zna. plik2.txt i plik3.txt zostały, bo powstały właśnie na tej gałęzi. Dwa ostatnie commity z main przygasły: nie należą do historii nowa-funkcja.' },
  { polecenie: 'Wróć na gałąź main.',
    podpowiedz: 'Użyj: git checkout <nazwa-gałęzi>. Nazwy gałęzi widać na kolorowych etykietach w grafie.',
    warunek: { typ: 'naGalezi', nazwa: 'main' },
    poZaliczeniu: () => 'Linia „ta linia powstala na main" wróciła - jesteś znowu w stanie po scaleniu. Gałąź to tylko wskaźnik: przełączenie podmienia pliki na te z commita, na który gałąź wskazuje.' },
  { polecenie: 'Przełącz się na pierwszy commit w historii.',
    podpowiedz: 'Wpisz git checkout i spację, potem kliknij pierwszy commit z lewej w grafie - jego hash wklei się do terminala. Naciśnij Enter.',
    warunek: { typ: 'odczepionyNa', commit: 'C1' },
    poZaliczeniu: () => 'Został tylko plik1.txt z jedną linią - tak wyglądało repozytorium na samym początku. HEAD wskazuje teraz bezpośrednio commit, a nie gałąź: to odczepiony HEAD (detached HEAD).' },
  { polecenie: 'Wróć na gałąź main.',
    podpowiedz: 'git checkout <nazwa-gałęzi> działa także z odczepionego HEAD.',
    warunek: { typ: 'naGalezi', nazwa: 'main' },
    poZaliczeniu: () => 'Git wypisał „Previous HEAD position was..." - przypomina, z którego commita wychodzisz. Tak opuszcza się odczepiony HEAD: przełączając się na gałąź.' },
  { polecenie: 'Przełącz się na commit, w którym pojawił się plik3.txt.',
    podpowiedz: 'Użyj: git checkout <hash> (hash wkleisz, klikając commit w grafie) albo git checkout <nazwa-gałęzi>. Pomyśl, na której gałęzi powstał plik3.txt, albo przełączaj się na kolejne commity i obserwuj katalog.',
    warunek: { typ: 'plikPojawilSie', plik: 'plik3.txt' },
    poZaliczeniu: () => 'To commit „Dodano plik3". Wskazuje na niego także gałąź nowa-funkcja - dlatego git checkout nowa-funkcja prowadzi w to samo miejsce, tyle że bez odczepiania HEAD.' },
  { polecenie: 'Znajdź commit, w którym plik1.txt ma dokładnie dwie linie i nie ma linii „ta linia powstala na main". Przełącz się na niego.',
    podpowiedz: 'Przełączaj się na kolejne commity (git checkout i hash z grafu) i patrz na podgląd plik1.txt w katalogu.',
    warunek: { typ: 'plikJakW', plik: 'plik1.txt', commit: 'C2' },
    poZaliczeniu: (k) => `Pasuje! Ta sama treść plik1.txt jest też w: ${k.pozostale.join(', ')}. Każdy commit to migawka całego katalogu - plik1.txt jest w nich identyczny, ale pozostałe pliki już nie.` },
  { polecenie: 'Przełącz się na commit „Druga linia w plik1" i utwórz tam gałąź poprawka.',
    podpowiedz: 'Dwie komendy: najpierw git checkout <hash>, potem git checkout -b poprawka. Jeśli gałąź poprawka już istnieje (z wcześniejszych prób), wpisz restart i zacznij od nowa.',
    warunek: { typ: 'nowaGalazNaCommicie', nazwa: 'poprawka', opis: 'Druga linia w plik1' },
    poZaliczeniu: () => 'Gałąź poprawka powstała dokładnie tam, gdzie stałeś, i HEAD od razu na nią wskazuje - odczepiony HEAD się skończył.' },
  { polecenie: 'Przełącz się na commit scalający (ten z dwiema wchodzącymi liniami) przez jego hash - nie przez nazwę main.',
    podpowiedz: 'Wpisz git checkout i spację, potem kliknij ostatni commit w grafie.',
    warunek: { typ: 'odczepionyNa', commit: 'C6' },
    poZaliczeniu: () => 'Gałąź main wskazuje ten sam commit, a jednak HEAD jest odczepiony: git checkout <hash> zawsze odczepia HEAD. Na koniec wróć na main: git checkout main.' },
];

const DANE = { SCENARIUSZ, ZNANE_KOMENDY_GITA, TEKSTY, OBJASNIENIA, CWICZENIA };
```

- [ ] **Step 4: W bloku `logika` dopisz funkcje przed `const LOGIKA = ...` i zastąp tę linię**

```js
function commityPasujace(warunek) {
  const cs = SCENARIUSZ.commity;
  if (warunek.typ === 'plikPojawilSie') {
    return cs.filter((c) => maWlasne(c.pliki, warunek.plik) && c.rodzice.every((r) => !maWlasne(commitPoId(r).pliki, warunek.plik))).map((c) => c.id);
  }
  if (warunek.typ === 'plikJakW') {
    const wzor = commitPoId(warunek.commit).pliki[warunek.plik].join('\n');
    return cs.filter((c) => maWlasne(c.pliki, warunek.plik) && c.pliki[warunek.plik].join('\n') === wzor).map((c) => c.id);
  }
  return [];
}

function sprawdz(cwiczenie, stan, wykonanie) {
  const w = cwiczenie.warunek;
  const c = biezacyCommit(stan);
  const kontekst = { pozostale: [] };
  let ok = false;
  if (w.typ === 'naGalezi') ok = stan.head.typ === 'galaz' && stan.head.nazwa === w.nazwa;
  else if (w.typ === 'odczepionyNa') ok = stan.head.typ === 'odczepiony' && stan.head.commit === w.commit;
  else if (w.typ === 'plikPojawilSie' || w.typ === 'plikJakW') {
    const zbior = commityPasujace(w);
    ok = zbior.includes(c);
    kontekst.pozostale = zbior.filter((x) => x !== c).map((x) => `${skrot(x)} „${commitPoId(x).opis}"`);
  } else if (w.typ === 'nowaGalazNaCommicie') {
    const cel = SCENARIUSZ.commity.find((x) => x.opis === w.opis).id;
    ok = wykonanie.forma === 'nowaGalaz' && wykonanie.argument === w.nazwa && stan.galezie[w.nazwa] === cel;
  }
  return { zaliczone: ok, komunikat: ok ? cwiczenie.poZaliczeniu(kontekst) : null };
}

function krokPostepu(postep, zdarzenie) {
  if (postep.biezace >= postep.wyniki.length || zdarzenie.typ === 'restart') return postep;
  if (zdarzenie.typ === 'wykonanie' && !zdarzenie.zaliczone) return postep;
  const wyniki = postep.wyniki.slice();
  wyniki[postep.biezace] = zdarzenie.typ === 'pomin' ? 'pominiete' : 'zaliczone';
  return { biezace: postep.biezace + 1, wyniki };
}

function nowaSesja() {
  return { stan: stanStartowy(), postep: { biezace: 0, wyniki: new Array(CWICZENIA.length).fill(null) } };
}

function przetworz(sesja, linia) {
  const r = wykonaj(sesja.stan, linia);
  let postep = sesja.postep;
  let zaliczenie = null;
  if (r.wykonanie && postep.biezace < CWICZENIA.length) {
    const wynik = sprawdz(CWICZENIA[postep.biezace], r.stan, r.wykonanie);
    postep = krokPostepu(postep, { typ: 'wykonanie', zaliczone: wynik.zaliczone });
    if (wynik.zaliczone) zaliczenie = { nr: sesja.postep.biezace, komunikat: wynik.komunikat };
  }
  return { sesja: { stan: r.stan, postep }, wynik: r.wynik, akcja: r.akcja, zaliczenie };
}

function pomin(sesja) {
  return { ...sesja, postep: krokPostepu(sesja.postep, { typ: 'pomin' }) };
}

const LOGIKA = { commitPoId, skrot, migawka, stanStartowy, biezacyCommit, osiagalneZ, roznicaMigawek, roznicaLinii, domyslnyPlik, opisPolozenia, katalogKroku, komendyKroku, opisGalezi, tokenizuj, poprawnaNazwaGalezi, rozwiazRewizje, wykonaj, commityPasujace, sprawdz, krokPostepu, nowaSesja, przetworz, pomin };
```

- [ ] **Step 5: Uruchom - ma przejść**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add cwiczenia-git.html tests/cwiczenia.test.mjs
git commit -m "Ćwiczenia 1-8, sprawdzarka i postęp" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Widok - graf, katalog i statyczna zakładka 2

**Files:**
- Modify: `cwiczenia-git.html` (blok `widok`)

**Interfaces:**
- Consumes: `SCENARIUSZ`, `commitPoId`, `migawka`, `biezacyCommit`, `osiagalneZ`, `roznicaMigawek`, `roznicaLinii`, `domyslnyPlik`, `opisPolozenia`, `nowaSesja` (Task 2-7).
- Produces: `htmlEl(tag, atrybuty, ...dzieci)`, `svgEl(nazwa, atrybuty, rodzic)`, `kolorGalezi(nazwa, galezie)`, `rysujGraf(svg, { commity, galezie, head, osiagalne, naKlik })`, `rysujKatalog(kontener, { pliki, poprzednie, wybrany, naWybor, pokazUsuniete = true })`, stan widoku `W = { sesja, pliki, poprzedniePliki, wybranyPlik, historiaKomend, pozycjaHistorii, zaliczenie, podpowiedz }`, `budujSymulator()`, `odswiezSymulator()`, `rysujKatalogSym(pokazUsuniete = true)`, `nowySvg(id)`.

Ten blok nie ma testów automatycznych (spec 10: rysowanie sprawdzane ręcznie). Test `wszystkie bloki skryptu się kompilują` z Task 1 pilnuje składni.

- [ ] **Step 1: W bloku `widok` dopisz na początku (przed `function pokazZakladke`)**

```js
const SVG_NS = 'http://www.w3.org/2000/svg';
const KOLORY_GALEZI = { 'main': '#2563eb', 'nowa-funkcja': '#16a34a' };
const PALETA_DODATKOWA = ['#9333ea', '#db2777', '#0891b2', '#b45309'];
const GRAF = { x0: 140, dx: 110, y: { 'main': 140, 'nowa-funkcja': 310 }, szerokosc: 140 + 5 * 110 + 100, wysokosc: 380 };

function htmlEl(tag, atrybuty = {}, ...dzieci) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(atrybuty)) {
    if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const d of dzieci.flat()) if (d !== null && d !== undefined && d !== false && d !== '') e.append(d);
  return e;
}

function svgEl(nazwa, atrybuty = {}, rodzic = null) {
  const e = document.createElementNS(SVG_NS, nazwa);
  for (const [k, v] of Object.entries(atrybuty)) e.setAttribute(k, v);
  if (rodzic) rodzic.appendChild(e);
  return e;
}

function nowySvg(id) {
  return svgEl('svg', { id, class: 'graf', role: 'img', 'aria-label': 'Graf commitów repozytorium' });
}

const maKolorStaly = (nazwa) => Object.prototype.hasOwnProperty.call(KOLORY_GALEZI, nazwa);

function kolorGalezi(nazwa, galezie) {
  if (maKolorStaly(nazwa)) return KOLORY_GALEZI[nazwa];
  const dodatkowe = Object.keys(galezie).filter((g) => !maKolorStaly(g));
  return PALETA_DODATKOWA[Math.max(0, dodatkowe.indexOf(nazwa)) % PALETA_DODATKOWA.length];
}

function pozycja(id) {
  const i = SCENARIUSZ.commity.findIndex((c) => c.id === id);
  return { x: GRAF.x0 + i * GRAF.dx, y: GRAF.y[SCENARIUSZ.commity[i].tor] };
}

function rysujGraf(svg, { commity, galezie, head, osiagalne, naKlik }) {
  const granice = { minX: 0, minY: 0, maxX: GRAF.szerokosc, maxY: GRAF.wysokosc };
  const obejmij = (x1, y1, x2, y2) => {
    granice.minX = Math.min(granice.minX, x1); granice.minY = Math.min(granice.minY, y1);
    granice.maxX = Math.max(granice.maxX, x2); granice.maxY = Math.max(granice.maxY, y2);
  };
  let tlo = svg.querySelector('g.tlo');
  if (!tlo) tlo = svgEl('g', { class: 'tlo' }, svg);
  tlo.replaceChildren();
  let headG = svg.querySelector('g.head-etykieta');
  if (!headG) {
    headG = svgEl('g', { class: 'head-etykieta' }, svg);
    svgEl('line', { class: 'head-strzalka', stroke: '#a16207', 'stroke-width': 2 }, headG);
    svgEl('polygon', { class: 'head-grot', fill: '#a16207' }, headG);
    svgEl('rect', { x: -26, y: 0, width: 52, height: 22, rx: 4 }, headG);
    svgEl('text', { x: 0, y: 15, 'text-anchor': 'middle' }, headG).textContent = 'HEAD';
    headG.style.transition = 'none';
    requestAnimationFrame(() => requestAnimationFrame(() => { headG.style.transition = ''; }));
  }
  svg.appendChild(headG);

  const widoczne = new Set(commity);
  const aktywne = new Set(osiagalne);

  for (const [tor, y] of Object.entries(GRAF.y)) {
    if (!commity.some((id) => commitPoId(id).tor === tor)) continue;
    svgEl('text', { x: 10, y: y + 5, class: 'nazwa-toru', fill: KOLORY_GALEZI[tor] }, tlo).textContent = tor;
  }

  for (const id of commity) {
    for (const r of commitPoId(id).rodzice) {
      if (!widoczne.has(r)) continue;
      const a = pozycja(r), b = pozycja(id);
      const tor = commitPoId(id).tor === 'main' ? commitPoId(r).tor : commitPoId(id).tor;
      const d = a.y === b.y ? `M ${a.x} ${a.y} L ${b.x} ${b.y}` : `M ${a.x} ${a.y} C ${a.x + 60} ${a.y}, ${b.x - 60} ${b.y}, ${b.x} ${b.y}`;
      svgEl('path', { d, class: 'krawedz' + (aktywne.has(id) ? '' : ' przygaszona'), stroke: KOLORY_GALEZI[tor] }, tlo);
    }
  }

  const biezacy = head ? (head.typ === 'galaz' ? galezie[head.nazwa] : head.commit) : undefined;
  for (const id of commity) {
    const c = commitPoId(id), p = pozycja(id);
    const g = svgEl('g', { class: 'commit' + (aktywne.has(id) ? '' : ' przygaszony') + (id === biezacy ? ' biezacy' : ''), transform: `translate(${p.x} ${p.y})` }, tlo);
    svgEl('circle', { r: 16, stroke: KOLORY_GALEZI[c.tor] }, g);
    svgEl('text', { y: 36, 'text-anchor': 'middle', class: 'hash' }, g).textContent = c.hash.slice(0, 7);
    svgEl('text', { y: 51, 'text-anchor': 'middle', class: 'opis' }, g).textContent = c.opis.length > 18 ? c.opis.slice(0, 17) + '…' : c.opis;
    svgEl('title', {}, g).textContent = `${c.hash.slice(0, 7)} ${c.opis}` + (naKlik ? ' (kliknij, żeby wkleić hash do terminala)' : '');
    if (naKlik) { g.style.cursor = 'pointer'; g.addEventListener('click', () => naKlik(id)); }
  }

  const naCommicie = {};
  for (const [nazwa, id] of Object.entries(galezie)) (naCommicie[id] ||= []).push(nazwa);
  for (const [id, nazwy] of Object.entries(naCommicie)) {
    if (!widoczne.has(id)) continue;
    const p = pozycja(id);
    if (head && head.typ === 'galaz') nazwy.sort((a, b) => (a === head.nazwa) - (b === head.nazwa));
    nazwy.forEach((nazwa, i) => {
      const szer = nazwa.length * 7.5 + 16;
      obejmij(p.x - szer / 2, p.y - 48 - 26 * i, p.x + szer / 2, p.y - 26 - 26 * i);
      const g = svgEl('g', { class: 'etykieta', transform: `translate(${p.x - szer / 2} ${p.y - 48 - 26 * i})` }, tlo);
      svgEl('rect', { width: szer, height: 22, rx: 4, fill: kolorGalezi(nazwa, galezie) }, g);
      svgEl('text', { x: szer / 2, y: 15, 'text-anchor': 'middle' }, g).textContent = nazwa;
    });
  }

  if (biezacy && widoczne.has(biezacy)) {
    const p = pozycja(biezacy);
    const odczepiony = head.typ === 'odczepiony';
    const linia = headG.querySelector('.head-strzalka');
    const grot = headG.querySelector('.head-grot');
    let x, y;
    if (odczepiony) {
      // HEAD obok kółka, strzałka prosto na commit - wyraźnie inaczej niż HEAD wskazujący gałąź.
      x = p.x + 58; y = p.y - 11;
      for (const [k, v] of Object.entries({ x1: -26, y1: 11, x2: -36, y2: 11 })) linia.setAttribute(k, v);
      grot.setAttribute('points', '-35,6 -35,16 -42,11');
    } else {
      // Gałąź wskazywana przez HEAD leży na szczycie stosu etykiet tego commita.
      const n = naCommicie[biezacy].length;
      x = p.x; y = p.y - 48 - 26 * (n - 1) - 34;
      for (const [k, v] of Object.entries({ x1: 0, y1: 22, x2: 0, y2: 30 })) linia.setAttribute(k, v);
      grot.setAttribute('points', '-5,29 5,29 0,35');
    }
    obejmij(x - 42, y, x + 26, y + 36);
    headG.style.display = '';
    headG.classList.toggle('odczepiony', odczepiony);
    headG.style.transform = `translate(${x}px, ${y}px)`;
  } else {
    headG.style.display = 'none';
  }
  svg.setAttribute('viewBox', `${granice.minX - 8} ${granice.minY - 8} ${granice.maxX - granice.minX + 16} ${granice.maxY - granice.minY + 16}`);
}

// pokazUsuniete = false przy samym wyborze pliku - animacja znikania nie odtwarza się ponownie.
function rysujKatalog(kontener, { pliki, poprzednie, wybrany, naWybor, pokazUsuniete = true }) {
  const r = roznicaMigawek(poprzednie, pliki);
  const nazwy = [...new Set([...Object.keys(pliki), ...(pokazUsuniete ? r.usuniete : [])])].sort();
  const lista = htmlEl('ul');
  for (const n of nazwy) {
    const usuniety = r.usuniete.includes(n);
    const znak = r.dodane.includes(n) ? ['+ nowy', 'plus'] : r.zmienione.includes(n) ? ['~ zmieniony', 'tylda'] : usuniety ? ['- zniknął', 'minus'] : null;
    lista.append(htmlEl('li', { class: [n === wybrany ? 'wybrany' : '', usuniety ? 'usuniety' : ''].join(' ').trim(), title: 'Kliknij, żeby zobaczyć treść', onclick: () => naWybor(n) },
      htmlEl('span', {}, n), znak ? htmlEl('span', { class: 'znacznik ' + znak[1] }, znak[0]) : null));
  }
  const podglad = htmlEl('div', { class: 'podglad' });
  if (wybrany && (Object.prototype.hasOwnProperty.call(pliki, wybrany) || Object.prototype.hasOwnProperty.call(poprzednie, wybrany))) {
    const linie = roznicaLinii(poprzednie[wybrany] || [], pliki[wybrany] || []);
    podglad.append(htmlEl('div', {}, htmlEl('strong', {}, wybrany + ':')),
      htmlEl('pre', {}, ...linie.map((l) => htmlEl('div', { class: l.typ === '+' ? 'linia-plus' : l.typ === '-' ? 'linia-minus' : '' }, (l.typ === '=' ? '  ' : l.typ + ' ') + l.tekst))));
  }
  kontener.replaceChildren(htmlEl('h2', {}, 'Katalog roboczy'),
    nazwy.length ? lista : htmlEl('p', { class: 'pusty-katalog' }, 'Katalog jest pusty.'), podglad);
}

const W = { sesja: null, pliki: {}, poprzedniePliki: {}, wybranyPlik: null, historiaKomend: [], pozycjaHistorii: 0, zaliczenie: null, podpowiedz: false };

function budujSymulator() {
  W.sesja = nowaSesja();
  W.pliki = migawka(biezacyCommit(W.sesja.stan));
  W.poprzedniePliki = W.pliki;
  document.getElementById('symulator').replaceChildren(htmlEl('div', { class: 'uklad-symulatora' },
    htmlEl('div', { class: 'panel obszar-graf' }, htmlEl('h2', {}, 'Graf repozytorium (czas płynie od lewej do prawej)'), nowySvg('sym-graf'),
      htmlEl('div', { id: 'sym-polozenie', class: 'polozenie' }), htmlEl('div', { id: 'sym-odczepiony' })),
    htmlEl('div', { class: 'panel obszar-cwiczenie cwiczenie', id: 'sym-cwiczenie' }),
    htmlEl('div', { class: 'obszar-terminal', id: 'sym-obszar-terminala' }),
    htmlEl('div', { class: 'panel obszar-katalog katalog', id: 'sym-katalog' })));
  odswiezSymulator();
}

function rysujKatalogSym(pokazUsuniete = true) {
  rysujKatalog(document.getElementById('sym-katalog'), {
    pliki: W.pliki, poprzednie: W.poprzedniePliki, wybrany: W.wybranyPlik, pokazUsuniete,
    naWybor: (n) => { W.wybranyPlik = n; rysujKatalogSym(false); },
  });
}

function odswiezSymulator() {
  const { stan } = W.sesja;
  const biezacy = biezacyCommit(stan);
  rysujGraf(document.getElementById('sym-graf'), {
    commity: SCENARIUSZ.commity.map((c) => c.id), galezie: stan.galezie, head: stan.head,
    osiagalne: osiagalneZ(biezacy), naKlik: typeof wklejHash === 'function' ? wklejHash : null,
  });
  document.getElementById('sym-polozenie').textContent = opisPolozenia(stan);
  document.getElementById('sym-odczepiony').replaceChildren(...(stan.head.typ === 'odczepiony'
    ? [htmlEl('div', { class: 'pasek-odczepiony' }, htmlEl('strong', {}, 'Odczepiony HEAD: nie jesteś na żadnej gałęzi. '),
        'HEAD wskazuje bezpośrednio commit. Żeby wrócić, przełącz się na gałąź (git checkout main) albo utwórz tu nową (git checkout -b nazwa).')]
    : []));
  W.wybranyPlik = domyslnyPlik(W.pliki, W.poprzedniePliki, W.wybranyPlik);
  rysujKatalogSym();
}
```

- [ ] **Step 2: W funkcji `start()` dodaj budowę symulatora**

Zastąp:

```js
  pokazZakladke('historia');
}
```

na:

```js
  budujSymulator();
  pokazZakladke('historia');
}
```

- [ ] **Step 3: Uruchom testy**

Run: `npm test`
Expected: PASS (w tym kompilacja bloku `widok`).

- [ ] **Step 4: Sprawdź ręcznie w Chrome**

Otwórz `cwiczenia-git.html`, przejdź do zakładki 2. Sprawdź:
- Graf: dwa tory (`main` niebieski u góry, `nowa-funkcja` zielony u dołu), 6 kółek z hashami `1c4e7a2` ... `f0b4d27` i skróconymi opisami, z C6 wchodzą dwie linie.
- Etykieta `main` nad C6, etykieta `nowa-funkcja` nad C4, żółta etykieta HEAD nad `main` ze strzałką.
- C6 ma grubą obwódkę z żółtą poświatą; nic nie jest przygaszone.
- Pod grafem: „Jesteś na: gałęzi main, commit f0b4d27"; brak pomarańczowego paska.
- Panel katalogu: trzy pliki, bez znaczników; podgląd `plik1.txt` z trzema liniami; kliknięcie `plik2.txt` pokazuje jego treść.
- Konsola deweloperska bez błędów.

- [ ] **Step 5: Commit**

```bash
git add cwiczenia-git.html
git commit -m "Widok: graf SVG, katalog roboczy i statyczna zakładka symulatora" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Widok - terminal i panel ćwiczeń

**Files:**
- Modify: `cwiczenia-git.html` (blok `widok`)

**Interfaces:**
- Consumes: `W`, `htmlEl`, `odswiezSymulator`, `rysujKatalogSym` (Task 8); `przetworz`, `pomin`, `migawka`, `biezacyCommit`, `commitPoId`, `CWICZENIA`, `TEKSTY` (Task 5-7); `pokazZakladke` (Task 1).
- Produces: `ZNAK_ZACHETY`, `wypisz(linie)`, `wykonajLinie(linia)`, `wklejHash(id)`, `rysujCwiczenie()`, `pominCwiczenie()`, `budujTerminal()`.

- [ ] **Step 1: W bloku `widok` dopisz po funkcji `odswiezSymulator`**

```js
const ZNAK_ZACHETY = 'PS C:\\cwiczenia-git> ';

function budujTerminal() {
  const wejscie = htmlEl('input', { id: 'sym-wejscie', type: 'text', spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Wpisz komendę' });
  wejscie.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const linia = wejscie.value;
      wejscie.value = '';
      wykonajLinie(linia);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (W.pozycjaHistorii > 0) { W.pozycjaHistorii--; wejscie.value = W.historiaKomend[W.pozycjaHistorii]; }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (W.pozycjaHistorii < W.historiaKomend.length) { W.pozycjaHistorii++; wejscie.value = W.historiaKomend[W.pozycjaHistorii] ?? ''; }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      document.getElementById('sym-wyjscie').replaceChildren();
    }
  });
  const terminal = htmlEl('div', { class: 'terminal', id: 'sym-terminal' },
    htmlEl('h2', { style: 'color:#94a3b8' }, 'Terminal'),
    htmlEl('div', { id: 'sym-wyjscie' }),
    htmlEl('div', { class: 'wejscie' }, htmlEl('span', {}, ZNAK_ZACHETY), wejscie));
  terminal.addEventListener('click', () => { if (!window.getSelection().toString()) wejscie.focus(); });
  return terminal;
}

function wypisz(linie) {
  const wyjscie = document.getElementById('sym-wyjscie');
  for (const l of linie) {
    let klasa = 'linia ' + l.typ;
    if (l.typ === 'git' && /^(fatal|error):/.test(l.tekst)) klasa += ' blad';
    if (l.typ === 'git' && /^hint:/.test(l.tekst)) klasa += ' hint';
    wyjscie.append(htmlEl('div', { class: klasa }, l.tekst === '' ? '\u00a0' : l.tekst));
  }
  const terminal = document.getElementById('sym-terminal');
  terminal.scrollTop = terminal.scrollHeight;
}

function wykonajLinie(linia) {
  wypisz([{ typ: 'komenda', tekst: ZNAK_ZACHETY + linia }]);
  if (linia.trim()) W.historiaKomend.push(linia);
  W.pozycjaHistorii = W.historiaKomend.length;
  const r = przetworz(W.sesja, linia);
  if (r.akcja === 'clear') document.getElementById('sym-wyjscie').replaceChildren();
  wypisz(r.wynik);
  const zmianaStanu = r.sesja.stan !== W.sesja.stan;
  W.sesja = r.sesja;
  if (r.zaliczenie) { W.zaliczenie = r.zaliczenie; W.podpowiedz = false; }
  if (zmianaStanu) {
    W.poprzedniePliki = W.pliki;
    W.pliki = migawka(biezacyCommit(W.sesja.stan));
    odswiezSymulator();
  }
  rysujCwiczenie();
}

function wklejHash(id) {
  const wejscie = document.getElementById('sym-wejscie');
  const h = commitPoId(id).hash.slice(0, 7);
  wejscie.value += (wejscie.value && !wejscie.value.endsWith(' ') ? ' ' : '') + h;
  wejscie.focus();
}

function pominCwiczenie() {
  W.sesja = pomin(W.sesja);
  W.zaliczenie = null;
  W.podpowiedz = false;
  rysujCwiczenie();
}

function rysujCwiczenie() {
  const { postep } = W.sesja;
  const kontener = document.getElementById('sym-cwiczenie');
  const kropki = htmlEl('div', { class: 'kropki' }, ...postep.wyniki.map((w, i) => htmlEl('span', {
    class: ['kropka', w || '', i === postep.biezace ? 'biezace' : ''].join(' ').trim(),
    title: `Ćwiczenie ${i + 1}` + (w === 'zaliczone' ? ': zaliczone' : w === 'pominiete' ? ': pominięte' : ''),
  })));
  const zaliczenie = W.zaliczenie
    ? htmlEl('div', { class: 'zaliczenie' }, htmlEl('strong', {}, `Ćwiczenie ${W.zaliczenie.nr + 1} zaliczone! `), W.zaliczenie.komunikat)
    : null;
  if (postep.biezace >= CWICZENIA.length) {
    const ile = postep.wyniki.filter((w) => w === 'zaliczone').length;
    kontener.replaceChildren(htmlEl('h2', {}, 'Koniec ćwiczeń'), zaliczenie,
      htmlEl('p', {}, `Zaliczone: ${ile} z ${CWICZENIA.length}. Teraz zrób to samo we własnym repozytorium: `,
        htmlEl('a', { href: '#', onclick: (e) => { e.preventDefault(); pokazZakladke('konsola'); } }, 'zakładka 3. Zrób to sam w konsoli'), '.'),
      kropki);
    return;
  }
  const cw = CWICZENIA[postep.biezace];
  kontener.replaceChildren(
    htmlEl('h2', {}, `Ćwiczenie ${postep.biezace + 1} / ${CWICZENIA.length}`),
    zaliczenie,
    htmlEl('p', { class: 'polecenie' }, cw.polecenie),
    htmlEl('div', {},
      htmlEl('button', { onclick: () => { W.podpowiedz = !W.podpowiedz; rysujCwiczenie(); } }, W.podpowiedz ? 'Ukryj podpowiedź' : 'Podpowiedź'), ' ',
      htmlEl('button', { onclick: pominCwiczenie }, 'Pomiń')),
    W.podpowiedz ? htmlEl('div', { class: 'podpowiedz' }, cw.podpowiedz) : null,
    kropki);
}
```

- [ ] **Step 2: W funkcji `budujSymulator` podepnij terminal i panel ćwiczeń**

Zastąp ostatnią linię funkcji `budujSymulator`:

```js
  odswiezSymulator();
}
```

na:

```js
  document.getElementById('sym-obszar-terminala').append(budujTerminal());
  wypisz([{ typ: 'symulator', tekst: TEKSTY.powitanie }]);
  odswiezSymulator();
  rysujCwiczenie();
}
```

- [ ] **Step 3: Uruchom testy**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Sprawdź ręcznie w Chrome (pełne przejście)**

Otwórz plik od nowa, zakładka 2:
- Terminal pokazuje powitanie i znak zachęty `PS C:\cwiczenia-git>`; kliknięcie w terminal ustawia kursor w polu.
- `git checkout nowa-funkcja`: komunikat gita, pod nim żółte objaśnienie; HEAD płynnie przesuwa się nad `nowa-funkcja`; C5 i C6 przygasają; `plik1.txt` ma znacznik „~ zmieniony", podgląd pokazuje przekreśloną linię „ta linia powstala na main"; ćwiczenie 1 zaliczone (zielona ramka), wyświetla się ćwiczenie 2.
- Wpisz `git checkout ` i kliknij pierwszy commit - hash `1c4e7a2` wkleja się bez wykonania; Enter: długie ostrzeżenie, pomarańczowy pasek „Odczepiony HEAD", przerywana pomarańczowa etykieta HEAD nad C1, `plik2.txt` i `plik3.txt` przekreślone i znikają.
- W stanie odczepionym etykieta HEAD stoi z prawej strony kółka commita ze strzałką skierowaną na commit (nie nad etykietą gałęzi) - także po `git checkout <hash C6>`, gdy `main` wskazuje ten sam commit.
- Po przełączeniu z C6 na C1 kliknij `plik1.txt` - przekreślone `plik2.txt` i `plik3.txt` nie pojawiają się ponownie.
- `git checkout -b a`, `-b b`, `-b c`, `-b d` na C6: wszystkie etykiety i HEAD mieszczą się w ramce grafu.
- Strzałki ↑/↓ przewijają historię komend; Ctrl+L i `clear` czyszczą terminal.
- `Podpowiedź` pokazuje i ukrywa tekst; `Pomiń` przechodzi dalej i kropka jest kreskowana.
- Przejdź wszystkie 8 ćwiczeń (wzorzec: `git checkout nowa-funkcja`, `git checkout main`, hash C1, `git checkout main`, `git checkout nowa-funkcja`, hash C3, hash C2 + `git checkout -b poprawka`, hash C6). Po 8.: „Koniec ćwiczeń", link przełącza na zakładkę 3.
- Wpisz szybko kilka komend jedna po drugiej (np. 5 razy na zmianę hash C1 i `git checkout main`) - po zakończeniu animacji HEAD, graf, katalog i „Jesteś na" zgadzają się z ostatnią komendą.
- `restart`: znika gałąź `poprawka`, HEAD na `main`, kropki postępu bez zmian.
- Konsola deweloperska bez błędów.

- [ ] **Step 5: Commit**

```bash
git add cwiczenia-git.html
git commit -m "Widok: terminal z historią komend i panel ćwiczeń" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Widok - zakładka 1 „Jak powstało repo"

**Files:**
- Modify: `cwiczenia-git.html` (blok `widok`)

**Interfaces:**
- Consumes: `htmlEl`, `nowySvg`, `rysujGraf`, `rysujKatalog` (Task 8); `SCENARIUSZ.kroki`, `komendyKroku`, `katalogKroku`, `opisGalezi`, `osiagalneZ`, `domyslnyPlik`, `maWlasne` (Task 2-3).
- Produces: `H = { krok, wybrany }`, `budujHistorie()`, `odswiezHistorie()`.

- [ ] **Step 1: W bloku `widok` dopisz przed `function pokazZakladke`**

```js
const H = { krok: 0, wybrany: null };

function budujHistorie() {
  document.getElementById('historia').replaceChildren(
    htmlEl('div', { class: 'nawigacja-krokow' },
      htmlEl('button', { id: 'hist-wstecz', onclick: () => { if (H.krok > 0) { H.krok--; odswiezHistorie(); } } }, '← Wstecz'),
      htmlEl('span', { id: 'hist-licznik' }),
      htmlEl('button', { id: 'hist-dalej', onclick: () => { if (H.krok < SCENARIUSZ.kroki.length - 1) { H.krok++; odswiezHistorie(); } } }, 'Dalej →')),
    htmlEl('div', { class: 'historia-uklad' },
      htmlEl('div', { class: 'panel' }, htmlEl('div', { id: 'hist-opis' }), nowySvg('hist-graf')),
      htmlEl('div', { class: 'panel katalog', id: 'hist-katalog' })));
  odswiezHistorie();
}

function odswiezHistorie() {
  const kroki = SCENARIUSZ.kroki;
  const k = kroki[H.krok];
  const poprzedni = H.krok > 0 ? kroki[H.krok - 1] : null;
  document.getElementById('hist-licznik').textContent = `krok ${H.krok + 1} / ${kroki.length}`;
  document.getElementById('hist-wstecz').disabled = H.krok === 0;
  document.getElementById('hist-dalej').disabled = H.krok === kroki.length - 1;

  const czesci = [htmlEl('h2', {}, `${k.id}. ${k.tytul}`)];
  if (k.plik) {
    czesci.push(htmlEl('p', {}, k.plik.akcja === 'nowy' ? `Notatnik: utwórz ${k.plik.nazwa} z treścią:` : `Notatnik: dopisz na końcu ${k.plik.nazwa} linię:`),
      htmlEl('div', { class: 'plik' }, htmlEl('pre', {}, k.plik.linie.join('\n'))));
  }
  if (k.naGithubie) czesci.push(htmlEl('p', {}, htmlEl('strong', {}, 'Na GitHubie: '), k.naGithubie));
  for (const kom of komendyKroku(k)) czesci.push(htmlEl('div', { class: 'komenda' }, htmlEl('code', {}, kom)));
  czesci.push(htmlEl('p', {}, k.opis));
  if (Object.keys(k.github.galezie).length > 0) {
    czesci.push(htmlEl('div', { class: 'stan-zdalny' },
      htmlEl('strong', {}, 'U Ciebie: '), opisGalezi(k.lokalnie.galezie), htmlEl('br'),
      htmlEl('strong', {}, 'Na GitHubie: '), opisGalezi(k.github.galezie)));
  }
  document.getElementById('hist-opis').replaceChildren(...czesci);

  const l = k.lokalnie;
  const biezacy = maWlasne(l.galezie, l.head.nazwa) ? l.galezie[l.head.nazwa] : null;
  rysujGraf(document.getElementById('hist-graf'), { commity: l.commity, galezie: l.galezie, head: l.head, osiagalne: osiagalneZ(biezacy), naKlik: null });

  const pliki = katalogKroku(k);
  const poprzednie = poprzedni ? katalogKroku(poprzedni) : {};
  H.wybrany = domyslnyPlik(pliki, poprzednie, H.wybrany);
  const rysuj = (pokazUsuniete) => rysujKatalog(document.getElementById('hist-katalog'), {
    pliki, poprzednie, wybrany: H.wybrany, pokazUsuniete, naWybor: (n) => { H.wybrany = n; rysuj(false); },
  });
  rysuj(true);
}
```

- [ ] **Step 2: W funkcji `start()` dodaj budowę zakładki 1**

Zastąp:

```js
  budujSymulator();
```

na:

```js
  budujHistorie();
  budujSymulator();
```

- [ ] **Step 3: Uruchom testy**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Sprawdź ręcznie w Chrome**

Zakładka 1 po otwarciu:
- K1: „krok 1 / 13", „Wstecz" wyszarzony, komenda `git init -b main`, pusty graf bez etykiety HEAD, katalog „Katalog jest pusty.", brak linii „U Ciebie / Na GitHubie".
- „Dalej" do K2: pojawia się C1 z etykietami `main` i HEAD, treść do wpisania w Notatniku, komendy `git add .` i `git commit -m "Pierwszy commit"`, `plik1.txt` ze znacznikiem „+ nowy".
- K4: pojawia się linia „U Ciebie: main: 5b8d0f3 / Na GitHubie: main: 5b8d0f3".
- K9: `plik2.txt` i `plik3.txt` przekreślone i znikają; C3 i C4 przygaszone.
- K12: graf i katalog bez zmian względem K11, „Na GitHubie: main: f0b4d27, ..."; K13: pojawia się C6 z dwiema liniami wchodzącymi, pliki 2 i 3 ze znacznikiem „+ nowy".
- „Dalej" wyszarzony na K13; przejście „Wstecz" do K1 działa w każdym kroku.

- [ ] **Step 5: Commit**

```bash
git add cwiczenia-git.html
git commit -m "Widok: zakładka Jak powstało repo z krokami K1-K13" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Instrukcja „Zrób to sam w konsoli" (dane i widok)

**Files:**
- Modify: `cwiczenia-git.html` (blok `dane`: `LISTA_ZRZUTOW`, `INSTRUKCJA`, `RAMKA_POMOCY`; blok `widok`)
- Test: `tests/instrukcja.test.mjs`

**Interfaces:**
- Consumes: `SCENARIUSZ.kroki`, `komendyKroku` (Task 3); `htmlEl` (Task 8); `ZRZUTY` (Task 1).
- Produces: `LISTA_ZRZUTOW = [{ klucz, opis }]` (8 pozycji), `INSTRUKCJA = [{ tytul, elementy: [{ typ: 'tekst' | 'komenda' | 'sprawdz' | 'uwaga' | 'wazne' | 'zrzut' | 'krok', ... }] }]`, `RAMKA_POMOCY = { szablon, sytuacje: [{ tytul, html }] }`; w widoku: `kopiuj(tekst, przycisk)`, `blokKomendy(tekst)`, `blokPliku(nazwa, linie)`, `elementyKroku(krok)`, `budujInstrukcje()`.

- [ ] **Step 1: Napisz test `tests/instrukcja.test.mjs`**

```js
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
```

- [ ] **Step 2: Uruchom - ma nie przejść**

Run: `npm test`
Expected: FAIL - `Cannot read properties of undefined (reading 'length')` (brak `INSTRUKCJA`).

- [ ] **Step 3: W bloku `dane` dopisz przed `const DANE = ...` i zastąp tę linię**

```js
const LISTA_ZRZUTOW = [
  { klucz: '01-nowe-repo', opis: 'Formularz New repository: nazwa cwiczenia-git, Public, bez README, .gitignore i licencji' },
  { klucz: '02-puste-repo-adres', opis: 'Strona pustego repozytorium z gotową komendą git remote add origin' },
  { klucz: '03-compare-pull-request', opis: 'Pasek „Compare & pull request" przy gałęzi nowa-funkcja' },
  { klucz: '04-create-pull-request', opis: 'Formularz Pull Requesta: base: main, compare: nowa-funkcja, przycisk Create pull request' },
  { klucz: '05-merge-pull-request', opis: 'Przycisk Merge pull request' },
  { klucz: '06-confirm-merge', opis: 'Przycisk Confirm merge' },
  { klucz: '07-lista-commitow', opis: 'Lista commitów na gałęzi main z przyciskiem kopiowania hasha' },
  { klucz: '08-network', opis: 'Insights -> Network: rozwidlenie i scalenie gałęzi' },
];

const INSTRUKCJA = [
  { tytul: '0. Przygotowanie', elementy: [
    { typ: 'tekst', html: 'Ta instrukcja prowadzi Cię krok po kroku przez zbudowanie tego samego repozytorium, które oglądałeś w symulatorze - tym razem naprawdę, na Twoim komputerze i na GitHubie. Pliki tworzysz w Eksploratorze i Notatniku, a w konsoli wpisujesz tylko komendy gita.' },
    { typ: 'tekst', html: 'Sprawdź wersję gita:' },
    { typ: 'komenda', tekst: 'git --version' },
    { typ: 'sprawdz', html: 'Wersja musi być co najmniej <code>2.28</code> (np. <code>git version 2.47.1.windows.1</code>). Starsza nie zna opcji <code>git init -b</code> - zainstaluj nowszego gita ze strony git-scm.com.' },
    { typ: 'tekst', html: 'Włącz pokazywanie rozszerzeń plików: w Eksploratorze <strong>Widok -> Rozszerzenia nazw plików</strong> (w Windows 11: Widok -> Pokaż -> Rozszerzenia nazw plików). Bez tego Notatnik zapisze <code>plik1.txt.txt</code>.' },
    { typ: 'tekst', html: 'Utwórz nowy, pusty folder <code>cwiczenia-git</code> (np. w Dokumentach). Otwórz go w Eksploratorze, kliknij w pasek adresu, wpisz <code>powershell</code> i naciśnij Enter - konsola otworzy się od razu w tym folderze. Komendy są takie same w PowerShellu, cmd i Git Bashu.' },
  ] },
  { tytul: '1. Kim jesteś dla gita', elementy: [
    { typ: 'tekst', html: 'Każdy commit jest podpisany imieniem i adresem e-mail. Sprawdź, czy są ustawione:' },
    { typ: 'komenda', tekst: 'git config --global user.name' },
    { typ: 'komenda', tekst: 'git config --global user.email' },
    { typ: 'tekst', html: 'Jeśli któraś komenda nic nie wypisała, ustaw brakującą wartość (wpisz swoje dane):' },
    { typ: 'komenda', tekst: 'git config --global user.name "Imię Nazwisko"' },
    { typ: 'komenda', tekst: 'git config --global user.email "adres@z-githuba.pl"' },
    { typ: 'uwaga', html: 'Opcja <code>--global</code> jest tu potrzebna - bez niej, poza repozytorium, git odpowie <code>fatal: not in a git directory</code>.' },
  ] },
  { tytul: '2. Puste repozytorium na GitHubie', elementy: [
    { typ: 'tekst', html: 'Na GitHubie kliknij <strong>+</strong> (prawy górny róg) -> <strong>New repository</strong>. Nazwa: <code>cwiczenia-git</code>.' },
    { typ: 'wazne', html: 'Zaznacz Public i NIE dodawaj README, .gitignore ani licencji - repozytorium musi być zupełnie puste, inaczej pierwszy push zostanie odrzucony. Public jest potrzebne, żeby na darmowym koncie działał widok Insights -> Network (krok 10).' },
    { typ: 'zrzut', klucz: '01-nowe-repo' },
    { typ: 'tekst', html: 'Kliknij <strong>Create repository</strong> i zostaw tę stronę otwartą - w kroku 5 będzie potrzebny adres repozytorium.' },
  ] },
  { tytul: '3. Repozytorium na Twoim komputerze', elementy: [
    { typ: 'krok', id: 'K1' },
    { typ: 'uwaga', html: 'Na GitHubie i w poradnikach spotkasz gałąź główną o nazwie <code>master</code> albo <code>main</code> - to tylko nazwa gałęzi. W tym ćwiczeniu używamy <code>main</code>.' },
  ] },
  { tytul: '4. Dwa pierwsze commity', elementy: [
    { typ: 'krok', id: 'K2' },
    { typ: 'krok', id: 'K3' },
    { typ: 'uwaga', html: 'Przy <code>git commit</code> zawsze dodawaj <code>-m "opis"</code>. Bez tego git otworzy edytor vim - jak z niego wyjść, opisuje <a href="#gdy-cos-nie-tak">ramka na dole strony</a>.' },
    { typ: 'komenda', tekst: 'git status' },
    { typ: 'sprawdz', html: '<code>git status</code> pokazuje <code>nothing to commit, working tree clean</code> - wszystko jest zapisane w commitach.' },
  ] },
  { tytul: '5. Wysyłamy repozytorium na GitHuba', elementy: [
    { typ: 'tekst', html: 'Na stronie pustego repozytorium GitHub pokazuje gotową komendę <code>git remote add origin ...</code> z Twoim adresem (sekcja „...or push an existing repository from the command line"). Skopiuj ją stamtąd. Pozostałe linie z tej sekcji możesz pominąć - <code>git branch -M main</code> niczego nie zepsuje, bo gałąź już nazywa się main.' },
    { typ: 'zrzut', klucz: '02-puste-repo-adres' },
    { typ: 'krok', id: 'K4' },
    { typ: 'wazne', html: 'Przy pierwszym <code>git push</code> może pojawić się okno logowania do GitHuba (Git Credential Manager). Często otwiera się POD konsolą - jeśli push „wisi", sprawdź pasek zadań. Gdy coś nie działa, skorzystaj z <a href="#gdy-cos-nie-tak">szablonu pytania do Claude Code</a>.' },
    { typ: 'sprawdz', html: 'Odśwież stronę repozytorium na GitHubie - widać <code>plik1.txt</code> z dwiema liniami.' },
  ] },
  { tytul: '6. Gałąź nowa-funkcja', elementy: [
    { typ: 'krok', id: 'K5' },
    { typ: 'krok', id: 'K6' },
    { typ: 'krok', id: 'K7' },
    { typ: 'krok', id: 'K8' },
    { typ: 'uwaga', html: 'Spotkasz też <code>git switch &lt;gałąź&gt;</code> (oraz <code>git switch -c</code> zamiast <code>git checkout -b</code>) - dla gałęzi robi to samo co <code>git checkout</code>.' },
    { typ: 'sprawdz', html: 'Na GitHubie przełącznik gałęzi nad listą plików pokazuje teraz <code>main</code> i <code>nowa-funkcja</code>.' },
  ] },
  { tytul: '7. Commit na main', elementy: [
    { typ: 'krok', id: 'K9' },
    { typ: 'sprawdz', html: '<code>plik2.txt</code> i <code>plik3.txt</code> zniknęły z folderu - main ich nie zna. Nic nie przepadło: są w commitach gałęzi <code>nowa-funkcja</code>.' },
    { typ: 'krok', id: 'K10' },
    { typ: 'krok', id: 'K11' },
    { typ: 'wazne', html: 'Ten git push zrób KONIECZNIE przed założeniem Pull Requesta.' },
    { typ: 'sprawdz', html: 'Na GitHubie, na gałęzi <code>main</code>, otwórz <code>plik1.txt</code> - musi mieć linię „ta linia powstala na main". Dopiero wtedy przejdź dalej.' },
  ] },
  { tytul: '8. Pull Request: scalamy nowa-funkcja do main', elementy: [
    { typ: 'krok', id: 'K12' },
    { typ: 'tekst', html: 'Na stronie repozytorium kliknij <strong>Compare &amp; pull request</strong> na pasku z informacją o gałęzi <code>nowa-funkcja</code>. Jeśli paska nie ma: zakładka <strong>Pull requests</strong> -> <strong>New pull request</strong>.' },
    { typ: 'zrzut', klucz: '03-compare-pull-request' },
    { typ: 'wazne', html: 'Sprawdź kierunek scalania: base: main, compare: nowa-funkcja.' },
    { typ: 'tekst', html: 'Kliknij <strong>Create pull request</strong>.' },
    { typ: 'zrzut', klucz: '04-create-pull-request' },
    { typ: 'tekst', html: 'Na stronie Pull Requesta kliknij <strong>Merge pull request</strong>, a potem <strong>Confirm merge</strong>. Przycisk <strong>Delete branch</strong>, który pojawi się potem, możesz pominąć.' },
    { typ: 'zrzut', klucz: '05-merge-pull-request' },
    { typ: 'zrzut', klucz: '06-confirm-merge' },
  ] },
  { tytul: '9. Pobieramy scalenie', elementy: [
    { typ: 'krok', id: 'K13' },
    { typ: 'sprawdz', html: 'W folderze są <code>plik1.txt</code>, <code>plik2.txt</code> i <code>plik3.txt</code>, a <code>plik1.txt</code> ma trzy linie.' },
    { typ: 'wazne', html: 'Notatnik nie odświeża otwartego pliku. Po git pull i po każdym git checkout zamknij plik i otwórz go ponownie - inaczej zobaczysz starą treść.' },
  ] },
  { tytul: '10. Zobacz graf na GitHubie', elementy: [
    { typ: 'tekst', html: 'Na GitHubie: <strong>Insights</strong> -> <strong>Network</strong>. To samo rozwidlenie i scalenie, które widziałeś w symulatorze.' },
    { typ: 'zrzut', klucz: '08-network' },
  ] },
  { tytul: '11. Dla chętnych / w domu: ćwiczenia we własnym repozytorium', elementy: [
    { typ: 'tekst', html: 'Powtórz ćwiczenia 1-8 z zakładki 2, tym razem w konsoli. Hasha nie wkleisz kliknięciem - weź go z listy commitów na GitHubie (<strong>Commits</strong> nad listą plików, przycisk kopiowania obok commita).' },
    { typ: 'zrzut', klucz: '07-lista-commitow' },
    { typ: 'komenda', tekst: 'git status' },
    { typ: 'sprawdz', html: 'Przed startem <code>git status</code> musi pokazywać <code>nothing to commit, working tree clean</code>. Jeśli coś zmieniłeś w plikach, git może odmówić przełączenia (patrz <a href="#gdy-cos-nie-tak">ramka niżej</a>).' },
    { typ: 'tekst', html: 'Hashe u Ciebie są inne niż w symulatorze - każdy commit ma unikalny hash. Ćwiczenie 7 utworzy u Ciebie gałąź <code>poprawka</code> - to w porządku.' },
    { typ: 'wazne', html: 'Na koniec wróć na gałąź main:' },
    { typ: 'komenda', tekst: 'git checkout main' },
  ] },
];

const RAMKA_POMOCY = {
  szablon: 'Jestem początkujący, robię ćwiczenie z gita. Wpisałem: [komenda]. Dostałem: [komunikat]. Wyjaśnij po polsku, co się stało i co mam zrobić.',
  sytuacje: [
    { tytul: 'Okno logowania się nie pojawia, a git push „wisi"', html: 'Okno logowania GitHuba (Git Credential Manager) mogło otworzyć się pod konsolą - sprawdź pasek zadań.' },
    { tytul: 'Otworzył się dziwny edytor (vim)', html: 'Tak się dzieje po <code>git commit</code> bez <code>-m</code> albo po <code>git pull</code>, gdy commit z main nie został wypchnięty przed scaleniem Pull Requesta (Git for Windows domyślnie wtedy scala gałęzie i prosi o opis). Naciśnij <code>Esc</code>, potem wpisz <code>:q!</code> i Enter (przy commicie - przerywa commit) albo <code>:wq</code> i Enter (przy pull - zapisuje domyślny opis scalenia).' },
    { tytul: 'error: Your local changes to the following files would be overwritten by checkout', html: 'Zmieniłeś i zapisałeś plik, a git nie chce nadpisać tej zmiany. <code>git status</code> pokaże, o który plik chodzi.' },
    { tytul: 'Powstał plik1.txt.txt', html: 'Rozszerzenia nazw plików są ukryte w Eksploratorze - włącz je (krok 0) i zmień nazwę pliku na <code>plik1.txt</code>.' },
  ],
};

const DANE = { SCENARIUSZ, ZNANE_KOMENDY_GITA, TEKSTY, OBJASNIENIA, CWICZENIA, LISTA_ZRZUTOW, INSTRUKCJA, RAMKA_POMOCY };
```

- [ ] **Step 4: Uruchom - ma przejść**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: W bloku `widok` dopisz przed `function pokazZakladke`**

```js
async function kopiuj(tekst, przycisk) {
  let ok = false;
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(tekst); ok = true; }
  } catch (e) { ok = false; }
  if (!ok) {
    const pole = htmlEl('textarea', { style: 'position:fixed;opacity:0' });
    pole.value = tekst;
    document.body.append(pole);
    pole.select();
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    pole.remove();
  }
  przycisk.textContent = ok ? 'Skopiowano' : 'Zaznacz i skopiuj ręcznie (Ctrl+C)';
  setTimeout(() => { przycisk.textContent = 'Kopiuj'; }, 1800);
}

function przyciskKopiuj(tekst) {
  const b = htmlEl('button', { class: 'kopiuj', type: 'button' }, 'Kopiuj');
  b.addEventListener('click', () => kopiuj(tekst, b));
  return b;
}

function blokKomendy(tekst) {
  if (/<[^>]+>/.test(tekst)) {
    return htmlEl('div', { class: 'komenda do-uzupelnienia', title: 'Zamiast tekstu w nawiasach ostrych wstaw swoje dane' },
      htmlEl('code', {}, tekst), htmlEl('span', { style: 'font: 12px "Segoe UI", sans-serif' }, 'zamień adres na swój (z GitHuba)'), przyciskKopiuj(tekst));
  }
  return htmlEl('div', { class: 'komenda' }, htmlEl('code', {}, tekst), przyciskKopiuj(tekst));
}

function blokPliku(nazwa, linie) {
  return htmlEl('div', { class: 'plik' },
    htmlEl('div', { class: 'naglowek-pliku' }, nazwa, przyciskKopiuj(linie.join('\r\n'))),
    htmlEl('pre', {}, linie.join('\n')));
}

function elementyKroku(k) {
  const wezly = [];
  if (k.plik) {
    wezly.push(htmlEl('p', {}, k.plik.akcja === 'nowy' ? `W Notatniku utwórz plik ${k.plik.nazwa} z treścią:` : `W Notatniku dopisz na końcu pliku ${k.plik.nazwa} nową linię:`),
      blokPliku(k.plik.nazwa, k.plik.linie),
      htmlEl('p', {}, 'Zapisz plik (Ctrl+S), potem w konsoli:'));
  }
  for (const kom of komendyKroku(k)) wezly.push(blokKomendy(kom));
  return wezly;
}

function elementInstrukcji(e) {
  if (e.typ === 'tekst') return htmlEl('p', { html: e.html });
  if (e.typ === 'komenda') return blokKomendy(e.tekst);
  if (e.typ === 'sprawdz') return htmlEl('div', { class: 'sprawdz', html: '<strong>Sprawdź:</strong> ' + e.html });
  if (e.typ === 'uwaga') return htmlEl('div', { class: 'uwaga', html: e.html });
  if (e.typ === 'wazne') return htmlEl('div', { class: 'wazne', html: e.html });
  if (e.typ === 'krok') return elementyKroku(SCENARIUSZ.kroki.find((k) => k.id === e.id));
  if (e.typ === 'zrzut') {
    const opis = LISTA_ZRZUTOW.find((z) => z.klucz === e.klucz).opis;
    const podpis = `${opis}. Wygląd GitHuba mógł się zmienić od czasu przygotowania materiału - szukaj przycisków o tych samych nazwach.`;
    return ZRZUTY[e.klucz]
      ? htmlEl('figure', { class: 'zrzut' }, htmlEl('img', { src: ZRZUTY[e.klucz], alt: opis, loading: 'lazy' }), htmlEl('figcaption', {}, podpis))
      : htmlEl('div', { class: 'brak-zrzutu' }, `Zrzut ekranu: ${opis}`);
  }
  return null;
}

function budujInstrukcje() {
  const sekcje = INSTRUKCJA.map((s) => htmlEl('section', {}, htmlEl('h2', {}, s.tytul), ...s.elementy.map(elementInstrukcji)));
  const ramka = htmlEl('section', { id: 'gdy-cos-nie-tak', class: 'ramka-pomocy' },
    htmlEl('h2', {}, 'Gdy coś pójdzie nie tak'),
    htmlEl('p', {}, 'Skopiuj ten szablon, uzupełnij nawiasy kwadratowe i wklej do Claude Code - wyjaśni, co się stało:'),
    htmlEl('div', { class: 'plik' }, htmlEl('div', { class: 'naglowek-pliku' }, 'Pytanie do Claude Code', przyciskKopiuj(RAMKA_POMOCY.szablon)), htmlEl('pre', { style: 'white-space:pre-wrap' }, RAMKA_POMOCY.szablon)),
    ...RAMKA_POMOCY.sytuacje.map((s) => htmlEl('div', {}, htmlEl('h3', {}, s.tytul), htmlEl('p', { html: s.html + ' Utknąłeś? Użyj szablonu wyżej.' }))));
  document.getElementById('konsola').replaceChildren(htmlEl('div', { class: 'instrukcja' }, ...sekcje, ramka));
}
```

- [ ] **Step 6: W funkcji `start()` dodaj budowę zakładki 3**

Zastąp:

```js
  budujSymulator();
  pokazZakladke('historia');
```

na:

```js
  budujSymulator();
  budujInstrukcje();
  pokazZakladke('historia');
```

- [ ] **Step 7: Uruchom testy**

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Sprawdź ręcznie w Chrome**

Zakładka 3:
- Sekcje 0-11, potem niebieska ramka „Gdy coś pójdzie nie tak"; linki „ramka na dole strony" przewijają do ramki.
- „Kopiuj" przy `git --version` zmienia napis na „Skopiowano"; wklej w Notatniku - jest `git --version`. Sprawdź to przy otwarciu przez `file://` (dwuklik).
- Krok 4: plik `plik1.txt` z przyciskiem „Kopiuj" - wklejona treść ma jedną linię; przy K3 kopiuje się tylko dopisywana linia.
- K4: komenda `git remote add origin <adres-repozytorium-z-GitHuba>` w przerywanej ramce, z dopiskiem „zamień adres na swój (z GitHuba)" i przyciskiem „Kopiuj".
- Miejsca na zrzuty pokazują szare pola „Zrzut ekranu: ..." (zrzuty dochodzą w Task 12).
- Wytłuszczone ostrzeżenia (czerwone ramki) w krokach 2, 5, 7, 8, 9, 11.

- [ ] **Step 9: Commit**

```bash
git add cwiczenia-git.html tests/instrukcja.test.mjs
git commit -m "Zakładka Zrób to sam w konsoli z ramką pomocy" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Zrzuty ekranu GitHuba

**Files:**
- Create: `tools/osadz-zrzuty.mjs`
- Create: `zrzuty/01-nowe-repo.png` ... `zrzuty/08-network.png` (8 plików, nazwy = klucze z `LISTA_ZRZUTOW`)
- Modify: `cwiczenia-git.html` (blok `zrzuty`, wyłącznie przez narzędzie)
- Test: `tests/zrzuty.test.mjs`

**Interfaces:**
- Consumes: `LISTA_ZRZUTOW` (Task 11), `zaladuj({ zrzuty: true })` (Task 1).
- Produces: `osadz(html, pliki: [{ klucz, mime, dane: Buffer }]) -> html` (eksport z `tools/osadz-zrzuty.mjs`), uruchamiane jako `node tools/osadz-zrzuty.mjs`.

- [ ] **Step 1: Napisz test `tests/zrzuty.test.mjs` (część o narzędziu)**

```js
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
```

- [ ] **Step 2: Uruchom - ma nie przejść**

Run: `npm test`
Expected: FAIL - `Cannot find module '.../tools/osadz-zrzuty.mjs'`.

- [ ] **Step 3: Napisz `tools/osadz-zrzuty.mjs`**

```js
// Jednorazowe osadzenie zrzutów z katalogu zrzuty/ w bloku <script id="zrzuty"> pliku cwiczenia-git.html.
// Użycie: node tools/osadz-zrzuty.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { extname, basename } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const WZOR_BLOKU = /<script id="zrzuty">[\s\S]*?<\/script>/;

export function osadz(html, pliki) {
  if (!WZOR_BLOKU.test(html)) throw new Error('Brak bloku <script id="zrzuty"> w HTML');
  const obiekt = Object.fromEntries(pliki.map((p) => [p.klucz, `data:${p.mime};base64,${p.dane.toString('base64')}`]));
  const blok = `<script id="zrzuty">\nconst ZRZUTY = ${JSON.stringify(obiekt, null, 1)};\n</script>`;
  return html.replace(WZOR_BLOKU, () => blok);
}

function main() {
  const katalog = fileURLToPath(new URL('../zrzuty/', import.meta.url));
  const sciezkaHtml = fileURLToPath(new URL('../cwiczenia-git.html', import.meta.url));
  const pliki = readdirSync(katalog)
    .filter((n) => MIME[extname(n).toLowerCase()])
    .sort()
    .map((n) => ({ klucz: basename(n, extname(n)), mime: MIME[extname(n).toLowerCase()], dane: readFileSync(katalog + n) }));
  const html = osadz(readFileSync(sciezkaHtml, 'utf8'), pliki);
  writeFileSync(sciezkaHtml, html, 'utf8');
  const megabajty = (Buffer.byteLength(html) / 1024 / 1024).toFixed(2);
  console.log(`Osadzono ${pliki.length} zrzutów: ${pliki.map((p) => p.klucz).join(', ')}. Rozmiar HTML: ${megabajty} MB.`);
  if (megabajty > 5) console.log('Uwaga: HTML ma ponad 5 MB - rozważ zapis zrzutów jako JPG lub ich przycięcie.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
```

- [ ] **Step 4: Uruchom - ma przejść**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit narzędzia**

```bash
git add tools/osadz-zrzuty.mjs tests/zrzuty.test.mjs
git commit -m "Narzędzie osadzania zrzutów ekranu jako base64" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Zrzuty ekranu - krok z udziałem człowieka**

Zrzuty powstają przy przejściu zakładki 3 na prawdziwym koncie GitHub (sposób - użytkownik sam albo agent przez Claude in Chrome na zalogowanej karcie - ustala się przy wyborze trybu wykonania). Zapisz je w `zrzuty/` dokładnie pod tymi nazwami (PNG; przytnij do istotnego fragmentu strony, szerokość do ok. 1200 px):

| Plik | Co ma być widać |
|---|---|
| `01-nowe-repo.png` | formularz New repository: nazwa `cwiczenia-git`, zaznaczone Public, odznaczone README/.gitignore/licencja |
| `02-puste-repo-adres.png` | strona pustego repo z sekcją „...or push an existing repository from the command line" |
| `03-compare-pull-request.png` | pasek „Compare & pull request" przy `nowa-funkcja` |
| `04-create-pull-request.png` | formularz PR z `base: main`, `compare: nowa-funkcja` i przyciskiem Create pull request |
| `05-merge-pull-request.png` | przycisk Merge pull request |
| `06-confirm-merge.png` | przycisk Confirm merge |
| `07-lista-commitow.png` | lista commitów `main` z przyciskiem kopiowania hasha |
| `08-network.png` | Insights -> Network z rozwidleniem i scaleniem |

Przejście instrukcji krok po kroku jest jednocześnie testem akceptacyjnym zakładki 3 - zanotuj każdą rozbieżność między instrukcją a tym, co widać na ekranie, i popraw `INSTRUKCJA` (z ponownym `npm test`).

- [ ] **Step 7: Dopisz test kompletu zrzutów na końcu `tests/zrzuty.test.mjs`**

```js
import { zaladuj } from './zaladuj.mjs';

test('każdy zrzut z LISTA_ZRZUTOW jest osadzony', () => {
  const A = zaladuj({ zrzuty: true });
  for (const { klucz } of A.LISTA_ZRZUTOW) {
    assert.match(A.ZRZUTY[klucz] || '', /^data:image\/(png|jpeg|webp);base64,/, klucz);
  }
});
```

Run: `npm test`
Expected: FAIL - `01-nowe-repo` (zrzuty nie są jeszcze osadzone).

- [ ] **Step 8: Osadź zrzuty**

Run: `node tools/osadz-zrzuty.mjs`
Expected: `Osadzono 8 zrzutów: 01-nowe-repo, ... 08-network. Rozmiar HTML: ... MB.`

Run: `npm test`
Expected: PASS.

- [ ] **Step 9: Sprawdź ręcznie w Chrome**

Zakładka 3: w miejscu szarych pól są obrazy z podpisami zakończonymi zdaniem o możliwej zmianie wyglądu GitHuba. Rozmiar `cwiczenia-git.html` poniżej 5 MB.

- [ ] **Step 10: Commit**

```bash
git add zrzuty cwiczenia-git.html tests/zrzuty.test.mjs
git commit -m "Zrzuty ekranu GitHuba osadzone w instrukcji" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Przegląd końcowy i zapis stanu prac

**Files:**
- Modify: `docs/superpowers/2026-10-05-git-cwiczenia-STAN-PRAC.md`

**Interfaces:**
- Consumes: cały produkt.
- Produces: zaktualizowany stan prac.

- [ ] **Step 1: Pełne testy**

Run: `npm test`
Expected: PASS, 0 fail.

- [ ] **Step 2: Ręczny przegląd w Chrome (spec, sekcja 10)**

Otwórz `cwiczenia-git.html` dwuklikiem (bez serwera, bez internetu - np. z wyłączonym Wi-Fi) i sprawdź:
- trzy zakładki przełączają się; przełączenie zakładki w trakcie ćwiczeń i powrót zachowuje terminal, graf i postęp;
- zakładka 1: „Wstecz"/„Dalej" w obu kierunkach przez K1-K13;
- zakładka 2: animacja HEAD, odczepiony HEAD (pomarańczowa ramka i pasek), przygaszanie nieosiągalnych commitów, szybkie kolejne komendy dają spójny stan, pełne przejście 8 ćwiczeń;
- zakładka 3: „Kopiuj" przy `file://`, zrzuty, ramka pomocy;
- okno zwężone poniżej 900 px: panele jeden pod drugim;
- konsola deweloperska bez błędów.

- [ ] **Step 3: Zaktualizuj STAN-PRAC**

W checkliście `docs/superpowers/2026-10-05-git-cwiczenia-STAN-PRAC.md` oznacz wykonanie planu i dopisz pod checklistą:

```markdown
- [x] Implementacja wg `docs/superpowers/plans/2026-10-07-git-cwiczenia-symulator.md` - gałąź `symulator`, testy `npm test` zielone
- [ ] Recenzja całej gałęzi (Codex gpt-6.1-sol, high) i decyzja o scaleniu do `main`
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/2026-10-05-git-cwiczenia-STAN-PRAC.md
git commit -m "Stan prac: implementacja symulatora zakończona" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
