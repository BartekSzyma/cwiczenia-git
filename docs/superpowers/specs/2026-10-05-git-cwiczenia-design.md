# Ćwiczenia z gita - symulator i instrukcja konsolowa (projekt)

- Data: 2026-10-07 (brainstorming rozpoczęty 2026-10-05)
- Status: do przeglądu przez użytkownika
- Historia ustaleń: `docs/superpowers/2026-10-05-git-cwiczenia-STAN-PRAC.md`

## 1. Cel i odbiorcy

Materiał do kursu ALX vibecoding dla początkujących, w trybie: warsztat z prowadzącym + materiał do samodzielnej powtórki. Uczestnicy mają konta na GitHubie i robili już pushe; ten warsztat jest bardziej „prowadzony za rączkę".

Materiał ma pokazać, co jest w repozytorium i jak zmienia się katalog roboczy oraz treść plików po przełączeniu gałęzi lub commita - najpierw bezpiecznie w przeglądarce, potem we własnym repo kursanta.

Kryteria sukcesu:

1. Kursant rozumie, że gałąź i HEAD to wskaźniki, a commit to migawka całego katalogu.
2. Kursant potrafi przełączyć się na gałąź, na commit (odczepiony HEAD), wrócić i utworzyć gałąź.
3. Kursant samodzielnie buduje to samo repo w konsoli, z PR na GitHubie, i widzi u siebie to, co widział w symulatorze.

## 2. Zakres

W zakresie: jeden plik HTML z trzema zakładkami - **1. Jak powstało repo**, **2. Symulator i ćwiczenia**, **3. Zrób to sam w konsoli**.

Poza zakresem (świadomie):

- prawdziwy git w przeglądarce, kontakt z repo kursanta;
- edycja plików, commit, merge, push, pull w symulatorze;
- konflikty scalania, `git status`/`git log` w symulatorze, etykiety `origin/...` w symulatorze;
- zapamiętywanie postępu po odświeżeniu strony;
- optymalizacja pod telefon (na wąskim ekranie panele układają się jeden pod drugim, bez dalszych zabiegów);
- instrukcje dla macOS/Linux (instrukcja zakłada Windows: Eksplorator, Notatnik).

## 3. Scenariusz repozytorium (jedno źródło prawdy)

Gałąź główna: `main`. Druga gałąź: `nowa-funkcja`. Prawdziwe rozwidlenie, C6 to commit scalający z dwoma rodzicami, powstały przez Pull Request na GitHubie.

| # | Hash (pokazywany) | Gałąź (tor) | Rodzice | Opis commita | Zmiana |
|---|---|---|---|---|---|
| C1 | `1c4e7a2` | main | - | `Pierwszy commit` | + `plik1.txt`: „to jest poczatkowa zawartosc pliku" |
| C2 | `5b8d0f3` | main | C1 | `Druga linia w plik1` | ~ `plik1.txt` + linia „to dodalismy w kolejnym commicie" |
| C3 | `9e2a6c4` | nowa-funkcja | C2 | `Dodano plik2` | + `plik2.txt`: „nowy plik tekstowy" |
| C4 | `d7f1b85` | nowa-funkcja | C3 | `Dodano plik3` | + `plik3.txt`: „zawartosc pliku nr 3" |
| C5 | `3a6c9e0` | main | C2 | `Linia na main` | ~ `plik1.txt` + linia „ta linia powstala na main" |
| C6 | `f0b4d27` | main | C5, C4 | `Merge pull request #1 from kursant/nowa-funkcja` | scalenie: `plik1.txt` z C5 + `plik2.txt`, `plik3.txt` z C4 |

- Hashe są wymyślone, stałe, 40-znakowe w danych (pokazywane pierwsze 7 znaków), z różnymi pierwszymi znakami - wystarczają 4 pierwsze znaki.
- `plik1.txt` ma tę samą treść w C2, C3 i C4 (ważne dla ćwiczenia 6).
- Stan po scaleniu (start symulatora): `main` -> C6, `nowa-funkcja` -> C4, HEAD -> `main`.

**Świadome odstępstwo od reguły polskich diakrytyków:** treść plików ćwiczeniowych i opisy commitów są bez ogonków. Powód: kursant przepisuje je do własnego repo, a git wypisuje je w konsoli Windows (`HEAD is now at ... <opis>`), gdzie ogonki potrafią wyjść jako krzaczki. Interfejs strony, objaśnienia i podpowiedzi mają pełne polskie znaki.

### Model danych

Plik HTML zawiera jeden obiekt `SCENARIUSZ`:

- `commity`: dla każdego - `id` (C1..C6), `hash` (40 znaków), `rodzice`, `tor` (`main` | `nowa-funkcja`), `opis`, `pliki` (pełna migawka: nazwa -> treść).
- `kroki`: uporządkowana lista kroków budowy repo (sekcja 5), z których korzystają zakładka 1 i zakładka 3.
- `startoweGalezie`, `startowyHead`.

Z tego obiektu powstają: graf i katalog w symulatorze, kroki zakładki 1, treści plików i komendy w zakładce 3, poprawne odpowiedzi sprawdzarki (np. zbiór commitów dla ćwiczenia 6 wyliczany z migawek). Ręcznie pisana jest tylko proza (objaśnienia, instrukcje GitHuba).

## 4. Architektura pliku

Jeden plik `cwiczenia-git.html`: vanilla JS, graf w SVG, bez bibliotek, bez internetu, otwierany dwuklikiem (`file://`).

Bloki skryptu:

1. `<script id="dane">` - `SCENARIUSZ` i teksty (tłumaczenia komunikatów, polecenia ćwiczeń).
2. `<script id="logika">` - czyste funkcje bez DOM:
   - `wykonaj(stan, linia) -> { stan, wynik }` - interpretuje komendę; `wynik` to lista linii z typem (`git` | `objasnienie` | `symulator`);
   - `sprawdz(cwiczenie, stan, ostatniaKomenda) -> { zaliczone, komunikat }`;
   - pomocnicze: `osiagalneZ(commit)`, `rozwiazRewizje(arg)`, `poprawnaNazwaGalezi(nazwa)`, `roznicaMigawek(a, b)`.
3. `<script id="widok">` - rysowanie grafu, katalogu, terminala, zakładek; obsługa zdarzeń.

`stan` = `{ head: { typ: 'galaz', nazwa } | { typ: 'odczepiony', commit }, galezie: { nazwa -> commitId }, poprzedniHead }`.

Przycisk „Kopiuj": `navigator.clipboard.writeText`, a gdy niedostępny lub odrzucony (`file://`) - zapasowo ukryte `textarea` + `document.execCommand('copy')`.

Zrzuty ekranu osadzone w HTML jako `data:` URI (base64), żeby pozostał jeden plik. Źródła zrzutów leżą w `zrzuty/`, a osadza je jednorazowy skrypt `tools/osadz-zrzuty.mjs`.

## 5. Kroki budowy repo (wspólne dla zakładek 1 i 3)

| # | Komenda / czynność | Graf u Ciebie | Na GitHubie |
|---|---|---|---|
| K1 | `git init -b main` | puste repo | - |
| K2 | Notatnik: `plik1.txt`; `git add .`; `git commit -m "Pierwszy commit"` | C1 | - |
| K3 | Notatnik: dopisz linię; `git add .`; `git commit -m "Druga linia w plik1"` | C2 | - |
| K4 | `git remote add origin <URL>`; `git push -u origin main` | C2 | `main` -> C2 |
| K5 | `git checkout -b nowa-funkcja` | C2, HEAD -> `nowa-funkcja` | `main` -> C2 |
| K6 | Notatnik: `plik2.txt`; `git add .`; `git commit -m "Dodano plik2"` | C3 | `main` -> C2 |
| K7 | Notatnik: `plik3.txt`; `git add .`; `git commit -m "Dodano plik3"` | C4 | `main` -> C2 |
| K8 | `git push -u origin nowa-funkcja` | C4 | + `nowa-funkcja` -> C4 |
| K9 | `git checkout main` | C2 (pliki 2 i 3 znikają) | bez zmian |
| K10 | Notatnik: dopisz linię; `git add .`; `git commit -m "Linia na main"` | C5 | bez zmian |
| K11 | `git push` | C5 | `main` -> C5 |
| K12 | GitHub: Pull Request `nowa-funkcja` -> `main`, „Merge pull request" | **bez zmian** (C5) | `main` -> C6 |
| K13 | `git pull` | C6 (pojawiają się `plik2.txt`, `plik3.txt`) | `main` -> C6 |

Kolumna „Na GitHubie" jest pokazywana w krokach K4-K13, żeby było jasne, że scalenie PR zmienia stan na GitHubie, a pliki u kursanta zmieniają się dopiero po `git pull`.

## 6. Zakładka 1 - „Jak powstało repo"

- Pokaz kroków K1-K13: przyciski „Wstecz" / „Dalej", licznik „krok n / 13".
- Każdy krok: komenda lub czynność, 2-3 zdania wyjaśnienia, linia „U Ciebie: ... / Na GitHubie: ..." (od K4), graf i panel katalogu w stanie po kroku.
- Graf rośnie z każdym krokiem; panel katalogu używa tych samych znaczników zmian co symulator.
- Używa tych samych komponentów rysowania co zakładka 2.

## 7. Zakładka 2 - symulator i ćwiczenia

### 7.1 Układ

```
+---------------------------------------------------------------+----------------------+
| GRAF (czas płynie od lewej do prawej)                         | ĆWICZENIE 3 / 8      |
|                                    [main]<--[HEAD]            | Przełącz się na      |
|  main         C1 -- C2 ----------- C5 -- C6                   | pierwszy commit.     |
|                       \                  /                    | [Podpowiedź] [Pomiń] |
|  nowa-funkcja          C3 ---- C4 ------+                     | v v * o o o o o      |
|                              [nowa-funkcja]                   +----------------------+
|                                                               | KATALOG ROBOCZY      |
|  Jesteś na: gałęzi main, commit f0b4d27                       |  plik1.txt  ~zmien.  |
|                                                               |  plik2.txt           |
+---------------------------------------------------------------+  plik3.txt           |
| TERMINAL                                                      | -------------------- |
| PS C:\cwiczenia-git> git checkout nowa-funkcja                | plik1.txt:           |
| Switched to branch 'nowa-funkcja'                             |  to jest poczatkowa..|
|   Przełączono na gałąź nowa-funkcja. ...                      |  to dodalismy w ...  |
| PS C:\cwiczenia-git> _                                        | - ta linia powstala..|
+---------------------------------------------------------------+----------------------+
```

### 7.2 Język wizualny

- Commit = kółko z krótkim hashem i opisem pod spodem; każda gałąź ma swój tor i kolor (`main` niebieski, `nowa-funkcja` zielony); C6 ma dwie linie wchodzące.
- Gałąź = kolorowa etykieta przypięta do commita. Gałęzie utworzone przez kursanta dostają kolejne kolory z palety.
- HEAD = żółta etykieta. Normalnie wskazuje etykietę gałęzi. Odczepiony HEAD wskazuje bezpośrednio commit: pomarańczowa przerywana ramka + pasek „Odczepiony HEAD: nie jesteś na żadnej gałęzi" z jednym zdaniem wyjaśnienia.
- Commit z HEAD ma grubą obwódkę i poświatę; pod grafem zdanie „Jesteś na: gałęzi X, commit abc1234" albo „Jesteś na: commicie abc1234 (odczepiony HEAD)".
- **Osiągalność:** commity osiągalne z HEAD (przez wszystkich rodziców) są w pełnym kolorze, pozostałe przygaszone. Na `nowa-funkcja` przygasają C5 i C6; na `main` widać, że C3 i C4 też należą do historii.
- Animacja: HEAD płynnie się przesuwa; pliki dostają znaczniki: + pojawił się (zielony), ~ zmienił się (żółty), - zniknął (czerwony, przekreślony, znika po chwili); w podglądzie treści podświetlone dodane i usunięte linie.
- Klik w commit wkleja jego 7-znakowy hash do terminala (bez wykonania). Klik w plik pokazuje jego treść.
- Znak zachęty terminala: `PS C:\cwiczenia-git> ` (instrukcja konsolowa otwiera PowerShell w folderze `cwiczenia-git`).

### 7.3 Komendy

Wejście: obcięcie spacji na brzegach, podział na tokeny z obsługą cudzysłowów `"..."`. Pusta linia - tylko nowy znak zachęty. Strzałki ↑/↓ przewijają historię komend.

Komendy symulatora (komunikaty po polsku, typ `symulator`):

- `help` - lista obsługiwanych komend z jednym zdaniem opisu.
- `clear` (oraz Ctrl+L) - czyści terminal.
- `restart` - przywraca stan startowy repo (gałęzie, HEAD); nie kasuje postępu ćwiczeń.
- inna komenda niż `git ...` - „Nie znam komendy „X". Wpisz help, żeby zobaczyć listę."

`git` (pierwszy token porównywany bez rozróżniania wielkości liter; podkomenda z rozróżnianiem, jak w gicie):

| Wejście | Zachowanie |
|---|---|
| `git` (sam) | komunikat symulatora: „Podaj komendę, np. git checkout main" |
| `git checkout` (bez argumentu) | brak wyniku gita (jak w prawdziwym gicie) + objaśnienie: „Sam checkout nic nie robi - podaj gałąź albo hash" |
| `git checkout <gałąź>` | przełączenie na gałąź (komunikaty w 7.4) |
| `git checkout <hash>` | 4-40 znaków szesnastkowych, bez rozróżniania wielkości liter, jednoznaczny prefiks hasha commita -> odczepiony HEAD |
| `git checkout -b <nazwa>` | nowa gałąź na bieżącym commicie + przełączenie na nią |
| `git checkout -b` (bez nazwy) | ``error: switch `b' requires a value`` |
| `git checkout -b <nazwa> <cokolwiek>` | komunikat symulatora: „W symulatorze nową gałąź tworzysz tam, gdzie stoisz: najpierw przełącz się na commit, potem git checkout -b nazwa" |
| `git checkout HEAD...`, `@`, `-`, argument z `~` lub `^` | komunikat symulatora: „Ta forma działa w prawdziwym gicie, ale symulator jej nie obsługuje - użyj nazwy gałęzi albo hasha" |
| `git checkout <nazwa pliku z bieżącej migawki>` lub `git checkout -- ...` | komunikat symulatora: „Przywracanie plików nie jest częścią tego ćwiczenia" |
| `git checkout <inne>` | `error: pathspec '<inne>' did not match any file(s) known to git` |
| `git <znana komenda gita>`: `add`, `commit`, `push`, `pull`, `fetch`, `merge`, `rebase`, `reset`, `restore`, `revert`, `stash`, `status`, `log`, `diff`, `show`, `branch`, `switch`, `init`, `clone`, `remote`, `config`, `tag` | komunikat symulatora: „W symulatorze tylko się poruszamy - tę komendę wykonasz we własnym repo (zakładka 3)" |
| `git <nieznana>` | `git: '<x>' is not a git command. See 'git --help'.` + jeśli dokładnie jedna komenda z listy obsługiwanej lub znanej ma odległość edycyjną <= 2 (bez rozróżniania wielkości liter): pusta linia, `The most similar command is`, `\t<komenda>` |

Kolejność rozstrzygania argumentu `checkout`: (1) dokładna nazwa gałęzi, (2) forma nieobsługiwana (`HEAD`, `@`, `-`, `~`, `^`), (3) nazwa pliku lub `--`, (4) prefiks hasha, (5) błąd pathspec.

Poprawna nazwa gałęzi (uproszczone `check-ref-format`): niepusta; bez spacji i znaków sterujących; bez `~ ^ : ? * [ \`; bez `..` i `@{`; nie zaczyna się od `-` ani `.`; nie kończy się na `/`, `.` ani `.lock`; nie jest `@`. Polskie litery są dozwolone (jak w gicie).

### 7.4 Komunikaty gita i objaśnienia

Komunikaty gita są dosłowne, po angielsku, jak w git 2.47.1 (zweryfikowane; Git for Windows nie ma tłumaczeń - angielski także przy `LANG=pl_PL.UTF-8`). Pod **każdym** komunikatem gita jest linia typu `objasnienie`: polskie tłumaczenie + wyjaśnienie, o co gitowi chodzi, wizualnie odróżniona (inny krój, lewa ramka, przygaszony kolor), żeby kursant wiedział, czego nie zobaczy w swojej konsoli.

`<h7>` = 7-znakowy hash, `<opis>` = opis commita.

| Sytuacja | Wynik gita | Objaśnienie (sens; ostateczne brzmienie w implementacji) |
|---|---|---|
| gałąź, już na niej | `Already on '<g>'` | Już jesteś na gałęzi g - nic się nie zmieniło. |
| gałąź, z innej gałęzi | `Switched to branch '<g>'` | Przełączono na gałąź g: HEAD wskazuje teraz gałąź g, a pliki wyglądają jak w commicie, na który ona wskazuje. |
| gałąź, z odczepionego HEAD na innym commicie | `Previous HEAD position was <h7> <opis>` + `Switched to branch '<g>'` | Git przypomina, z którego commita wychodzisz; potem jak wyżej. |
| gałąź, z odczepionego HEAD na tym samym commicie | `Switched to branch '<g>'` | jak wyżej |
| hash, z gałęzi (także na ten sam commit) | pełne ostrzeżenie „Note: switching to '<h7>'. ... advice.detachedHead to false" + pusta linia + `HEAD is now at <h7> <opis>` | Jesteś w stanie odczepionego HEAD: oglądasz commit, ale nie jesteś na żadnej gałęzi. Git podpowiada `git switch -c` i `git switch -` - to nowsze odpowiedniki `git checkout -b nazwa` i powrotu; w tym ćwiczeniu używamy `checkout`. |
| hash, z odczepionego na innym commicie | `Previous HEAD position was <h7> <opis>` + `HEAD is now at <h7> <opis>` | Przeskoczyłeś z jednego commita na inny, nadal bez gałęzi. |
| hash, z odczepionego na tym samym commicie | `HEAD is now at <h7> <opis>` | Już tu jesteś. |
| `-b`, nowa poprawna nazwa | `Switched to a new branch '<g>'` | Utworzono gałąź g na bieżącym commicie i przełączono na nią; jeśli HEAD był odczepiony, już nie jest. |
| `-b`, nazwa istnieje | `fatal: a branch named '<g>' already exists` | Taka gałąź już jest - wybierz inną nazwę albo przełącz się na nią bez -b. |
| `-b`, niepoprawna nazwa | `fatal: '<g>' is not a valid branch name` + ``hint: See `man git check-ref-format` `` + `hint: Disable this message with "git config advice.refSyntax false"` | Nazwa gałęzi nie może mieć spacji ani niektórych znaków - użyj np. myślnika: moja-galaz. |
| `-b` bez nazwy | ``error: switch `b' requires a value`` | Po -b musisz podać nazwę nowej gałęzi. |
| pathspec | `error: pathspec '<x>' did not match any file(s) known to git` | Git nie zna gałęzi ani commita „x". Sprawdź literówkę; hash musi mieć co najmniej 4 znaki. |
| nieznana komenda | `git: '<x>' is not a git command. ...` | „x" to nie jest komenda gita - może literówka? |

Pełny tekst ostrzeżenia o odczepionym HEAD (dosłownie):

```
Note: switching to '<h7>'.

You are in 'detached HEAD' state. You can look around, make experimental
changes and commit them, and you can discard any commits you make in this
state without impacting any branches by switching back to a branch.

If you want to create a new branch to retain commits you create, you may
do so (now or later) by using -c with the switch command. Example:

  git switch -c <new-branch-name>

Or undo this operation with:

  git switch -

Turn off this advice by setting config variable advice.detachedHead to false

HEAD is now at <h7> <opis>
```

Kolory w terminalu: wynik gita w kolorze tekstu terminala, `fatal:`/`error:` na czerwono, `hint:` przygaszone, objaśnienia w osobnym stylu, komunikaty symulatora w trzecim stylu.

### 7.5 Ćwiczenia

Start każdej sesji: stan startowy (sekcja 3). Ćwiczenia wykonuje się trzema formami `checkout`.

| # | Polecenie | Zaliczone, gdy | Komunikat po zaliczeniu (sens) |
|---|---|---|---|
| 1 | Przełącz się na gałąź `nowa-funkcja` | HEAD -> `nowa-funkcja` | `plik1.txt` stracił linię „ta linia powstala na main" - ta gałąź jej nie zna; C5 i C6 przygasły. |
| 2 | Wróć na `main` | HEAD -> `main` | Linia wróciła, a pliki są w stanie po scaleniu. |
| 3 | Przełącz się na pierwszy commit | HEAD odczepiony na C1 | Został tylko `plik1.txt` z jedną linią. Tak wygląda odczepiony HEAD. |
| 4 | Wróć na `main` | HEAD -> `main` | „Previous HEAD position was..." - tak wychodzisz z odczepionego HEAD. |
| 5 | Przełącz się na commit, w którym pojawił się `plik3.txt` | HEAD na C4 - odczepiony albo przez dowolną gałąź wskazującą C4 | Gałąź `nowa-funkcja` wskazuje ten sam commit. |
| 6 | Znajdź commit, w którym `plik1.txt` ma dwie linie i nie ma linii „ta linia powstala na main" | HEAD na commicie ze zbioru wyliczonego z migawek (C2, C3, C4) | „Ta sama treść `plik1.txt` jest też w ..." (wymienia pozostałe) - commit to migawka całego katalogu, a nie jednego pliku. |
| 7 | Przełącz się na commit „Druga linia w plik1" i utwórz tam gałąź `poprawka` | gałąź `poprawka` -> C2 i HEAD -> `poprawka` | `-b` tworzy gałąź tam, gdzie stoisz, i kończy odczepiony HEAD. |
| 8 | Przełącz się na commit scalający przez jego hash (nie przez `main`) | HEAD odczepiony na C6 | `checkout <hash>` odczepia HEAD, nawet gdy gałąź wskazuje ten sam commit. **Na koniec wróć na `main`.** |

Zasady sprawdzarki:

- Deterministyczna, uruchamiana po każdej komendzie `git checkout ...` zakończonej bez błędu (`fatal:`/`error:` nie uruchamia sprawdzenia); porównuje tylko `stan`.
- Ćwiczenie zalicza się dopiero po takiej komendzie wpisanej w trakcie tego ćwiczenia - stan spełniony już na starcie ćwiczenia nie wystarcza. Komenda bez zmiany stanu (np. `Already on 'main'`) się liczy, bo kursant wpisał właściwą komendę.
- „Podpowiedź" pokazuje formę komendy i skąd wziąć argument (np. „kliknij commit w grafie, żeby wkleić hash"), nigdy gotowy hash.
- „Pomiń" przechodzi do następnego ćwiczenia bez zaliczenia (kropka postępu inna niż przy zaliczeniu).
- Po ćwiczeniu 8: podsumowanie + zachęta do zakładki 3.
- `restart` nie zmienia postępu ćwiczeń.

## 8. Zakładka 3 - „Zrób to sam w konsoli"

Ponumerowane kroki; przy każdej komendzie i treści pliku przycisk „Kopiuj"; po etapach punkty kontrolne „Sprawdź: ...". Komendy i treści plików pochodzą z `SCENARIUSZ.kroki`.

0. **Przygotowanie:**
   - `git --version` - wymagana wersja co najmniej 2.28 (inaczej `git init -b` nie działa);
   - włączenie rozszerzeń plików w Eksploratorze (Widok -> Rozszerzenia nazw plików), inaczej powstanie `plik1.txt.txt`;
   - nowy folder `cwiczenia-git`; konsola w folderze: w pasku adresu Eksploratora wpisz `powershell` i Enter. Komendy są takie same w PowerShellu, cmd i Git Bashu.
1. `git config user.name` i `git config user.email` - sprawdzenie; jeśli puste, komendy ustawienia.
2. **Na GitHubie nowe, puste repo `cwiczenia-git` - bez README, bez .gitignore, bez licencji** (wytłuszczone; zrzut ekranu formularza). Inaczej pierwszy push zostanie odrzucony.
3. K1 `git init -b main` + dopisek: „Na GitHubie i w poradnikach spotkasz `master` albo `main` - to tylko nazwa gałęzi; w tym ćwiczeniu używamy `main`."
4. K2-K3: Notatnik (treść do skopiowania), `git add .`, `git commit -m "..."` - zawsze z `-m`. Sprawdź: `git status` pokazuje „nothing to commit, working tree clean".
5. K4: `git remote add origin <URL>` (URL ze strony pustego repo; zrzut), `git push -u origin main`. Uwaga: **okno logowania GitHuba (Git Credential Manager) może otworzyć się pod konsolą** - sprawdź pasek zadań. Odesłanie do ramki z promptem dla Claude Code.
6. K5-K8: `git checkout -b nowa-funkcja`, C3, C4, `git push -u origin nowa-funkcja`.
7. K9-K11: `git checkout main` (Sprawdź: `plik2.txt` i `plik3.txt` zniknęły z folderu), C5, **`git push` - KONIECZNIE przed założeniem Pull Requesta** (wytłuszczone). Sprawdź na GitHubie: na `main` w `plik1.txt` jest linia „ta linia powstala na main" - dopiero wtedy zakładaj PR.
8. K12: Pull Request na GitHubie: „Compare & pull request" -> „Create pull request" -> „Merge pull request" -> „Confirm merge" (zrzut każdego kroku). „Delete branch" można pominąć. Bez wzmianki o innych metodach scalania.
9. K13: `git pull`. Sprawdź: w folderze są `plik2.txt` i `plik3.txt`. **Notatnik nie odświeża otwartego pliku - zamknij go i otwórz ponownie** (dotyczy też ćwiczeń po każdym `checkout`).
10. GitHub -> Insights -> Network: to samo rozwidlenie co graf w symulatorze (zrzut).
11. **Dla chętnych / w domu:** powtórz ćwiczenia 1-8 we własnym repo. Przed startem `git status` musi pokazywać czysty katalog. Hashe weź z listy commitów na GitHubie (przycisk kopiowania; zrzut). Ćwiczenie 7 tworzy u Ciebie gałąź `poprawka` - to w porządku. **Na koniec `git checkout main`.**

Dopisek przy krokach z `checkout`: „Spotkasz też `git switch <gałąź>` - dla gałęzi robi to samo co `git checkout <gałąź>`."

Dopisek przy zrzutach: „Wygląd GitHuba mógł się zmienić od czasu przygotowania materiału - szukaj przycisków o tych samych nazwach."

**Ramka „Gdy coś pójdzie nie tak"** - jeden szablon promptu dla Claude Code (z przyciskiem „Kopiuj"):

> Jestem początkujący, robię ćwiczenie z gita. Wpisałem: [komenda]. Dostałem: [komunikat]. Wyjaśnij po polsku, co się stało i co mam zrobić.

oraz krótkie opisy typowych sytuacji, każda z odesłaniem do szablonu:

- okno logowania się nie pojawia (schowane pod konsolą);
- otworzył się dziwny edytor po `git commit` bez `-m` albo po `git pull` (vim): wyjście `Esc`, potem `:q!` i Enter (dla commita) lub `:wq` i Enter (dla pull - zapisuje domyślny opis scalenia). `git pull` otwiera edytor, gdy C5 nie został wypchnięty przed scaleniem PR - Git for Windows domyślnie wtedy scala (`pull.rebase=false`);
- `error: Your local changes to the following files would be overwritten by checkout` - zmieniłeś i zapisałeś plik; `git status` pokaże który;
- `plik1.txt.txt` - rozszerzenia ukryte w Eksploratorze.

## 9. Typografia i kodowanie

- Plik HTML w UTF-8 (`<meta charset="utf-8">`).
- Wszystkie teksty interfejsu z pełnymi polskimi znakami; zakaz długich myślników (tylko `-`).
- Wyjątek: treść plików ćwiczeniowych i opisy commitów bez ogonków (sekcja 3).
- Nazwy plików projektu w ASCII.

## 10. Testy

Narzędzie: Node 22, `node --test`, bez zależności i bez kroku budowania. `tests/logika.test.mjs` wczytuje `cwiczenia-git.html`, wyciąga bloki `dane` i `logika` i uruchamia je w `vm`.

Zakres:

1. **Komendy:** każdy wiersz tabel z 7.3 i 7.4 - wynik gita co do znaku (wzorce zweryfikowane na git 2.47.1) + obecność objaśnienia pod każdym komunikatem gita + poprawny nowy `stan`.
2. **Rozstrzyganie argumentu:** kolejność z 7.3, prefiksy 3/4/7/40 znaków, wielkie litery, nazwy plików, `HEAD~1`.
3. **Nazwy gałęzi:** poprawne (w tym z polskimi literami) i niepoprawne przypadki.
4. **Ćwiczenia:** dla każdego z 8 - wszystkie poprawne rozwiązania, przykładowe błędne, reguła „tylko po udanej komendzie w trakcie ćwiczenia" (komenda z błędem nie zalicza), `restart` nie zmienia postępu.
5. **Spójność scenariusza:** różnica migawek kolejnych commitów zgadza się z opisem kroku K; migawka C6 = `plik1.txt` z C5 + pliki z C4; pierwsze znaki hashy unikalne; zbiór dla ćwiczenia 6 = {C2, C3, C4}; osiągalność (z `nowa-funkcja` nieosiągalne tylko C5 i C6).
6. **Typografia:** plik HTML nie zawiera znaków U+2014 i U+2013 ani encji `&mdash;`, `&ndash;` (test sprawdza kody znaków).

Ręczny przegląd w Chrome (bez automatyzacji): trzy zakładki, animacje, odczepiony HEAD, przygaszanie, „Kopiuj" przy `file://`, zrzuty.

## 11. Ryzyka i środki zaradcze

| Ryzyko | Środek |
|---|---|
| Kursant przeklika ćwiczenia bez patrzenia na pliki | komunikat po zaliczeniu wskazuje, co się zmieniło; świadomie bez pytań kontrolnych |
| Czas warsztatu | krok 11 zakładki 3 oznaczony „dla chętnych / w domu" |
| Niewypchnięty C5 -> `git pull` otwiera vima | wytłuszczony punkt kontrolny w kroku 7 + opis w ramce |
| Okno logowania pod konsolą | uwaga w kroku 5 + ramka z promptem |
| Notatnik pokazuje starą treść po `checkout` | uwaga w kroku 9 i w opisie ćwiczeń konsolowych |
| Niezacommitowane zmiany blokują `checkout` | `git status` przed ćwiczeniami + opis błędu w ramce |
| Zmiana wyglądu GitHuba | dokładne nazwy przycisków + dopisek przy zrzutach |
| Stary git (< 2.28) | `git --version` w kroku 0 |
| Kursant zna `git switch` z Claude Code | dopisek o `switch` + objaśnienie ostrzeżenia o odczepionym HEAD |

## 12. Decyzje odrzucone

- isomorphic-git (przesada dla repo tylko do nawigacji) i statyczne slajdy (brak interakcji).
- `git switch`, `log`, `status`, `show`, `branch`, `ls`/`cat`, składnia `~n`/`^n` w symulatorze - minimalny zestaw komend.
- Prawdziwe hashe i testy wzorcowe generowane skryptem z prawdziwego gita - C6 tworzy GitHub; wzorce komunikatów sprawdzono jednorazowo ręcznie.
- Przewidywanie wyniku przed komendą (sugestia recenzji) - zbyt duży koszt interakcji.
- Wzmianki o squash/rebase przy scalaniu PR.
- Zapamiętywanie postępu w `localStorage`.
