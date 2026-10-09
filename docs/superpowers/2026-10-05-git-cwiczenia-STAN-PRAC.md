# Ćwiczenia z gita - stan prac (brainstorming, wstrzymany 2026-10-05)

Plik służy do wznowienia pracy po restarcie. To NIE jest jeszcze spec - to zapis ustaleń z brainstormingu.

## Jak wznowić

Napisz w nowej sesji: **„wznów brainstorming ćwiczeń z gita z pliku docs/superpowers/2026-10-05-git-cwiczenia-STAN-PRAC.md"**.

Gdzie jesteśmy w procesie (superpowers:brainstorming, ścieżka architektoniczna):

- [x] Rozpoznanie kontekstu (folder pusty, git 2.47.1 na Windows)
- [x] Pytania doprecyzowujące
- [x] Wybór podejścia (A - jeden plik HTML)
- [x] Sekcja 1 projektu: układ ekranu i język wizualny - **ZAAKCEPTOWANA**
- [x] Sekcja 2: komendy symulatora - **ZAAKCEPTOWANA 2026-10-07** (z poprawkami, patrz niżej)
- [x] Sekcja 3: lista ćwiczeń + sposób sprawdzania - **ZAAKCEPTOWANA 2026-10-07** (8 ćwiczeń, ćw. 2 zostaje)
- [x] Sekcja 4: zakładki 1 i 3, technikalia, testy - **ZAAKCEPTOWANA 2026-10-07** (ze zrzutami ekranu GitHuba)
- [x] Recenzja kierunku - **zamiast external-review: sam Codex `gpt-6.1-sol`, reasoning high** (decyzja użytkownika 2026-10-07; wywołanie: `codex exec -m gpt-6.1-sol -c model_reasoning_effort=high -s read-only --skip-git-repo-check -` z promptem na stdin). Przyjęte poprawki: patrz sekcja „Wynik recenzji kierunku".
- [x] `git init -b main` w folderze projektu (zgoda użytkownika 2026-10-07)
- [x] Spec w `docs/superpowers/specs/2026-10-05-git-cwiczenia-design.md` + self-review
- [x] Recenzja spec (Codex sol high): 12 uwag, wszystkie przyjęte przez użytkownika i wdrożone 2026-10-07
- [x] Przegląd spec przez użytkownika - zaakceptowany 2026-10-07
- [x] Plan `docs/superpowers/plans/2026-10-07-git-cwiczenia-symulator.md` (13 zadań) + recenzja Codex sol high: 10 uwag przyjętych i wdrożonych 2026-10-08
- [x] Decyzje: wykonanie Native (Claude w sesji, gałąź `symulator`), na końcu recenzja całej gałęzi Codexem sol high; 8 zrzutów GitHuba robi użytkownik, przechodząc zakładkę 3 (Task 12, krok 6)
- [x] Implementacja wg planu na gałęzi `symulator` - Task 1-11 gotowe, Task 12 kroki 1-5 (narzędzie `tools/osadz-zrzuty.mjs`) gotowe; `npm test` 72/72 (2026-10-08). Rejestr decyzji: `.superpowers/sdd/2026-10-07-git-cwiczenia-symulator/progress.md` (git-ignored).
- [x] Recenzja całej gałęzi Codexem sol high: poprawiona obsługa klawiatury (commit `3cd826c`); 2 drobne uwagi odłożone (kolory przy gałęzi o nazwie liczbowej, krawędź C4->C6 przecina etykietę `nowa-funkcja`).
- [ ] **Użytkownik: 8 zrzutów GitHuba do `zrzuty/` (nazwy w planie, Task 12 krok 6) przy przejściu zakładki 3 + ręczny test „Kopiuj" w prawdziwym Chrome przy `file://`** <- TU WZNOWIĆ
- [ ] Potem: `node tools/osadz-zrzuty.mjs`, test kompletu zrzutów (Task 12 kroki 7-10), Task 13
- [x] 2026-10-09: objaśnienie „gałąź już istnieje" wskazuje `restart` (gałąź utworzona na złym commicie); `npm test` 73/73
- [x] 2026-10-09: scalenie `symulator` -> `main` (fast-forward) i publikacja na życzenie użytkownika: repo publiczne https://github.com/BartekSzyma/cwiczenia-git, GitHub Pages z `main` (katalog `/`), adres https://bartekszyma.github.io/cwiczenia-git/ (`index.html` przekierowuje na `cwiczenia-git.html`). Zakładka 3 opublikowana z pustymi ramkami na zrzuty. Kolejne wydanie = commit na `main` + `git push`.

## Cel i kontekst (ustalone)

- Materiał do kursu (ALX vibecoding) dla początkujących. Tryb **C**: warsztat z prowadzącym + materiał do samodzielnej powtórki.
- **Przeglądarka tylko symuluje** gita (bez prawdziwego gita, bez kontaktu z repo kursanta). Cel: zwizualizować, co jest w repozytorium i jak zmienia się katalog oraz treść plików po komendzie - to samo kursant może sprawdzić we własnym repo.
- Symulator **startuje od gotowego repo w stanie po merge'u**. Kursant się tylko porusza (gałęzie, commity, oglądanie, tworzenie gałęzi). Nie edytuje plików w symulatorze.
- Na starcie kursant widzi historię powstawania repo krok po kroku z krótkimi opisami.
- Na żywo kursant buduje repo sam: pliki tworzy w Eksploratorze Windows, edytuje w Notatniku, w konsoli wpisuje tylko komendy gita.
- Kursant **wpisuje komendy** w okienko terminala na stronie (nie tylko klika „dalej").

## Scenariusz repozytorium (ustalony, wariant A - prawdziwe rozwidlenie)

| # | Gałąź | Co się dzieje |
|---|---|---|
| C1 | master | `plik1.txt`: „to jest poczatkowa zawartosc pliku" |
| C2 | master | `plik1.txt` + linia „to dodalismy w kolejnym commicie" |
| - | - | `git switch -c nowa-funkcja` |
| C3 | nowa-funkcja | `plik2.txt`: „nowy plik tekstowy" |
| C4 | nowa-funkcja | `plik3.txt`: „zawartosc pliku nr 3" |
| - | - | `git switch master` |
| C5 | master | `plik1.txt` + linia „ta linia powstala na masterze" |
| C6 | master | `git merge nowa-funkcja -m "..."` (commit scalający, dwóch rodziców) |

- Repo zakładane przez `git init -b master` (niezależnie od `init.defaultBranch`).
- Nazwa gałęzi `nowa-funkcja` i treść C5 - propozycja Claude'a, użytkownik nie zgłosił zmian.
- `plik1.txt` ma tę samą treść w C2, C3, C4 (branch go nie zmienia) - ważne dla ćwiczeń „znajdź commit".

### Świadome odstępstwo od reguły polskich diakrytyków

Treść plików ćwiczeniowych (te, które kursant tworzy/przepisuje) jest **bez ogonków** - decyzja użytkownika.
Powód: `git show` / `git log -p` w cmd/PowerShell potrafi wyświetlić ogonki jako krzaczki (strona kodowa konsoli).
Odstępstwo dotyczy WYŁĄCZNIE treści plików ćwiczeniowych. Interfejs strony, opisy, podpowiedzi - pełne polskie znaki.

## Ryzyka / pułapki zidentyfikowane (do uwzględnienia)

1. `git switch <hash>` w prawdziwym gicie daje błąd („a branch is expected, got commit"). Na commit: `git checkout <hash>` lub `git switch --detach <hash>`. Symulator ma zwracać ten sam błąd z podpowiedzią.
2. „Znajdź commit z treścią X" bywa niejednoznaczne (C2/C3/C4 mają ten sam `plik1.txt`). Rekomendacja: sprawdzarka przyjmuje każdy pasujący commit + komentarz „ta sama treść jest też w...", co uczy, że commit to migawka całego katalogu.
3. Instrukcja konsolowa musi zawierać: włączenie rozszerzeń w Eksploratorze (inaczej `plik1.txt.txt`), zawsze `-m "..."` przy commit/merge (inaczej vim), `git config user.name/user.email` przed pierwszym commitem.
4. Ćwiczenia nie odwołują się do hashy (w konsoli każdy ma inne), tylko do treści.
5. Odczepiony HEAD (detached) - najbardziej mylący stan; musi być wizualnie wyraźny i objaśniony.
6. Notatnik w Win10 zapisuje UTF-8, więc problem UTF-16 z `echo >` w PowerShell nie występuje (pliki nie są tworzone z konsoli).

## Podejście (ustalone): A

Jeden samodzielny plik HTML: vanilla JS, graf w SVG, bez bibliotek, bez internetu, otwierany dwuklikiem.
Scenariusz jako jeden obiekt danych (commity z pełnymi migawkami plików) = jedno źródło prawdy dla symulatora, historii i instrukcji konsolowej.
Odrzucone: B (isomorphic-git - przesada dla repo tylko do nawigacji), C (statyczne slajdy - brak interakcji).

## Sekcja 1 - układ ekranu i język wizualny (ZAAKCEPTOWANA)

Trzy zakładki: **1. Jak powstało repo** -> **2. Symulator i ćwiczenia** -> **3. Zrób to sam w konsoli**.

Zakładka 2:

```
+---------------------------------------------------------------+----------------------+
| GRAF (czas płynie od lewej do prawej)                         | ĆWICZENIE 3 / 10     |
|                                    [master]<--[HEAD]          | Przełącz się na      |
|  master       C1 -- C2 ----------- C5 -- C6                   | gałąź nowa-funkcja.  |
|                       \                  /                    | [Podpowiedź] [Pomiń] |
|  nowa-funkcja          C3 ---- C4 ------+                     | v v * o o o o o o o  |
|                              [nowa-funkcja]                   +----------------------+
|                                                               | KATALOG ROBOCZY      |
|  Jesteś na: gałęzi master, commit 9f3c2a1                     |  plik1.txt  ~zmien.  |
|                                                               |  plik2.txt           |
+---------------------------------------------------------------+  plik3.txt           |
| TERMINAL                                                      | -------------------- |
| $ git switch nowa-funkcja                                     | plik1.txt:           |
| Switched to branch 'nowa-funkcja'                             |  to jest poczatkowa..|
| $ _                                                           |  to dodalismy w ...  |
|                                                               | - ta linia powstala..|
+---------------------------------------------------------------+----------------------+
```

- Commit = kółko z krótkim hashem + opis pod spodem; każda gałąź ma swój tor i kolor (master niebieski, nowa-funkcja zielony); C6 ma dwie linie wchodzące.
- Gałąź = kolorowa etykieta przypięta do commita (gałąź to wskaźnik).
- HEAD = żółta etykieta. Normalnie wskazuje na etykietę gałęzi (HEAD -> master -> C6). Odczepiony HEAD: wskazuje bezpośrednio na commit, pomarańczowa przerywana ramka + pasek „Odczepiony HEAD: nie jesteś na żadnej gałęzi" z jednym zdaniem wyjaśnienia.
- „Jesteś tutaj": commit z HEAD ma grubą obwódkę i poświatę; pod grafem zdanie „Jesteś na: gałęzi master, commit 9f3c2a1".
- Animacja: HEAD płynnie się przesuwa; pliki dostają znaczniki: + pojawił się (zielony), ~ zmienił się (żółty), - zniknął (czerwony, przekreślony, znika po chwili); w podglądzie treści podświetlone dodane/usunięte linie.
- Klik w commit wkleja jego hash do terminala (bez wykonywania).
- Klik w plik pokazuje jego treść.
- Hashe stałe, 7-znakowe, różne początki - wystarczą 4 pierwsze znaki.
- Desktop (laptop/rzutnik); na telefonie panele jeden pod drugim, bez optymalizacji.

## Sekcja 2 - komendy (ZAAKCEPTOWANA 2026-10-07)

Zasada użytkownika: minimum komend, bez zbędnych. Zmiany względem wcześniejszych ustaleń:

- **Gałąź główna: `main`** (nie `master`) - tak jak domyślnie na GitHubie. W instrukcji dopisać, że u kursanta może być `master` albo `main`.
- **C6 powstaje przez Pull Request na GitHubie** (kursanci mają konta GH i robili już pushe), potem `git pull` na `main`. Opis C6 u każdego inny („Merge pull request #1 from <login>/nowa-funkcja") - bez znaczenia, ćwiczenia opierają się na treści.
- **Hash commita kursant znajduje na GitHubie** (lista commitów, przycisk kopiowania) - bez `git log`. Hashe są na GH dopiero po push, więc ćwiczenia konsolowe z checkout na commit idą po scaleniu PR.
- Hashe w symulatorze: wymyślone, stałe (jak w sekcji 1). Propozycja prawdziwych hashy + testów wzorcowych WYCOFANA (C6 tworzy GitHub, nie da się odtworzyć skryptem).
- Ryzyko nr 1 (`git switch <hash>`) nieaktualne - nie używamy `switch`.

**Symulator obsługuje tylko:** `git checkout <gałąź>`, `git checkout <hash>` (prefiks >= 4 znaki), `git checkout -b <nazwa>`, oraz `help`, `clear`, `restart`, historia ↑/↓.
Każda inna komenda `git ...` -> „W symulatorze tylko się poruszamy - tę komendę wykonasz we własnym repo (zakładka 3)".

**Komunikaty gita:** dosłownie po angielsku (git 2.47.1, zweryfikowane: Git for Windows nie ma tłumaczeń, angielski nawet przy `LANG=pl_PL.UTF-8`), a pod KAŻDYM komunikatem polskie „tłumaczenie" + wyjaśnienie, o co gitowi chodzi (wizualnie odróżnione od wyniku gita).

**Instrukcja „Zrób to sam" (prowadzenie za rączkę):** `git config`, `git init`, `git remote add`, `git add .`, `git commit -m`, `git push` (pierwszy raz `-u`), `git checkout` (`-b` przy tworzeniu gałęzi), PR na GitHubie, `git pull`. Wymagania:
- przy scalaniu PR tylko „kliknij Merge pull request" - **bez wzmianki o squash/rebase**;
- **WYTŁUSZCZONY punkt kontrolny: C5 musi być wypchnięty (`git push`) przed założeniem PR** - inaczej `git pull` kończy się błędem o rozbieżnych gałęziach;
- przy pierwszym push: info, że okno logowania (Git Credential Manager) może schować się pod konsolą + gotowy prompt dla Claude Code (kursanci mają własny), żeby im wyjaśnił, co się dzieje;
- warto wpleść GitHub Insights -> Network (to samo rozwidlenie co graf w symulatorze).

## Sekcja 3 - ćwiczenia (ZAAKCEPTOWANA 2026-10-07)

Start: `main` na C6, `nowa-funkcja` na C4, HEAD -> `main`. Wszystko trzema formami `checkout`.

| # | Polecenie | Zaliczone, gdy | Komunikat po zaliczeniu |
|---|---|---|---|
| 1 | Przełącz się na gałąź `nowa-funkcja` | HEAD -> `nowa-funkcja` | `plik1.txt` traci linię z `main` |
| 2 | Wróć na `main` | HEAD -> `main` | linia wraca, pliki po scaleniu |
| 3 | Przełącz się na pierwszy commit | HEAD odczepiony na C1 | tylko `plik1.txt` z jedną linią; co to odczepiony HEAD |
| 4 | Wróć na `main` | HEAD -> `main` | „Previous HEAD position was..." - wyjście z odczepionego HEAD |
| 5 | Przełącz się na commit, w którym pojawił się `plik3.txt` | HEAD na C4 (odczepiony lub przez `nowa-funkcja`) | `nowa-funkcja` wskazuje ten sam commit |
| 6 | Znajdź commit, w którym `plik1.txt` ma dwie linie i nie ma linii z `main` | HEAD na C2, C3 lub C4 | „ta sama treść jest też w..." (wymienić pozostałe) - commit to migawka |
| 7 | Przełącz się na commit z opisem „…" (C2) i utwórz tam gałąź `poprawka` | `poprawka` na C2, HEAD -> `poprawka` | `-b` tworzy gałąź tam, gdzie stoisz, i kończy odczepiony HEAD |
| 8 | Przełącz się na commit scalający przez hash (nie przez `main`) | HEAD odczepiony na C6 | `checkout <hash>` odczepia HEAD nawet, gdy gałąź wskazuje ten commit |

Sprawdzanie: deterministyczne, po każdej komendzie, porównanie stanu (HEAD + gałęzie). Zaliczenie tylko po komendzie wpisanej w trakcie danego ćwiczenia. „Podpowiedź" daje formę komendy, nigdy gotowy hash. „Pomiń". `restart` nie kasuje postępu. Brak zapamiętywania postępu (bez localStorage).
Instrukcja konsolowa kończy się: „powtórz ćwiczenia 1-8 we własnym repo, hashe weź z GitHuba".

## Sekcja 4 - zakładki 1 i 3, technikalia, testy (ZAAKCEPTOWANA 2026-10-07)

**Jedno źródło prawdy:** obiekt `SCENARIUSZ` (commity: hash, rodzice, tor, opis, pełna migawka plików, krok). Z niego: graf i katalog symulatora, kroki zakładki 1, treści plików i komendy w zakładce 3, poprawne odpowiedzi sprawdzarki (np. C2/C3/C4 w ćw. 6 wyliczane z migawek). Ręcznie tylko proza.

**Treść scenariusza:** opisy commitów „Pierwszy commit", „Druga linia w plik1", „Dodano plik2", „Dodano plik3", „Linia na main" (C6 - opis z GitHuba). Linia C5: „ta linia powstala na main". Opisy commitów bez ogonków - świadome rozszerzenie odstępstwa (git wypisuje opisy w konsoli). UI strony z pełnymi polskimi znakami.

**Zakładka 1 „Jak powstało repo":** pokaz krok po kroku (Wstecz/Dalej, „krok n / 11"): init, C1, C2, utworzenie gałęzi, C3, C4, powrót na main, C5, push, scalenie PR (C6), pull. Każdy krok: komenda (lub „na GitHubie: ..."), 2-3 zdania, ten sam graf i panel katalogu co w symulatorze (te same komponenty, znaczniki +/~/-).

**Zakładka 3 „Zrób to sam w konsoli":** numerowane kroki, przycisk „Kopiuj" przy każdej komendzie i treści pliku, punkty kontrolne „Sprawdź: ...".
0. rozszerzenia plików w Eksploratorze, nowy folder, konsola w folderze (pasek adresu Eksploratora -> `powershell`); komendy identyczne w PowerShell/cmd/Git Bash;
1. sprawdzenie `git config user.name/user.email` (+ komendy ustawienia, gdyby brak);
2. **puste repo na GitHubie - bez README, .gitignore, licencji** (wytłuszczone);
3. `git init -b main` + uwaga „może być master lub main";
4. C1, C2 (Notatnik, `git add .`, `git commit -m`);
5. `git remote add origin <URL>`, `git push -u origin main` + uwaga o oknie logowania pod konsolą;
6. `git checkout -b nowa-funkcja`, C3, C4, `git push -u origin nowa-funkcja`;
7. `git checkout main`, C5, **`git push` przed PR** (wytłuszczone) + punkt kontrolny na GitHubie;
8. PR: „Compare & pull request" -> „Create pull request" -> „Merge pull request" -> „Confirm merge" (bez wzmianki o squash/rebase; „Delete branch" można pominąć);
9. `git pull` + sprawdź pliki; **Notatnik nie odświeża otwartego pliku - zamknij i otwórz** (dotyczy też ćwiczeń po każdym checkout);
10. GitHub Insights -> Network;
11. powtórz ćwiczenia 1-8 z hashami z GitHuba.
Ramka „Gdy coś pójdzie nie tak": jeden szablon promptu dla Claude Code („Jestem początkujący, robię ćwiczenie z gita. Wpisałem: [komenda]. Dostałem: [komunikat]. Wyjaśnij po polsku, co się stało i co mam zrobić."), przywołany przy logowaniu i przy kroku 9.
**Zrzuty ekranu GitHuba: TAK** (decyzja użytkownika) + uwaga „wygląd GitHuba mógł się zmienić od czasu przygotowania materiału". Do ustalenia w planie: kto robi zrzuty i osadzenie jako base64 (żeby został jeden plik).

**Technikalia:** jeden plik HTML, vanilla JS, SVG, offline, dwuklik. Czysta logika w `<script id="logika">`: `wykonaj(stan, linia) -> {stan, wynik}`, `sprawdz(cwiczenie, stan)`; rysowanie osobno. „Kopiuj": `navigator.clipboard` z zapasowym `execCommand('copy')` dla `file://`.

**Testy:** Node 22 (zainstalowany), test wczytuje HTML, wyciąga blok `logika`, uruchamia w `vm` - bez kroku budowania. Zakres: każda forma `checkout` z komunikatem co do znaku + polskie tłumaczenie; wszystkie poprawne i przykładowe błędne rozwiązania 8 ćwiczeń (w tym „zaliczenie tylko po komendzie w trakcie ćwiczenia"); spójność scenariusza (różnice migawek = opisy kroków zakładki 1, unikalne pierwsze znaki hashy). Ręczny przegląd w Chrome (zakładki, animacje, odczepiony HEAD). Rysowania nie testujemy automatycznie.

## Wynik recenzji kierunku (Codex sol high, 2026-10-07) - przyjęte przez użytkownika

1. **Korekta ryzyka `pull`:** Git for Windows ustawia `pull.rebase=false` w systemowym gitconfig, więc przy niewypchniętym C5 `git pull` NIE kończy się błędem, tylko robi commit scalający i **otwiera vima**. Opisać w ramce „Gdy coś pójdzie nie tak". Punkt kontrolny „push przed PR" zostaje.
2. Zakładka 1: w krokach push / PR / pull linia „u Ciebie: ..., na GitHubie: ..."; w kroku PR panel katalogu się nie zmienia (zmienia się dopiero przy pull).
3. Instrukcja konsolowa: `git status` jako sprawdzenie „czysto?" przed ćwiczeniami (symulator bez status).
4. Po ćwiczeniu 8 (symulator i konsola): „wróć na `main`".
5. Graf: commity osiągalne z HEAD pełnym kolorem, pozostałe przygaszone.
6. Dopisek o nazwie gałęzi: „Na GitHubie i w poradnikach spotkasz `master` albo `main` - to tylko nazwa gałęzi; w tym ćwiczeniu używamy `main`".
7. (Claude) Krok 11 w konsoli oznaczony „dla chętnych / w domu".
8. (Claude) Zdanie: „Spotkasz też `git switch <gałąź>` - dla gałęzi robi to samo co `checkout`".
9. (Claude) Krok 0: `git --version` (wymagane >= 2.28 dla `git init -b`).
Odrzucone: przewidywanie przed komendą (zostaje decyzja z sekcji 3), kontrola metody scalania (decyzja: bez wzmianki o squash/rebase), odtwarzanie C6 skryptem (bez znaczenia).

Komunikaty `checkout` zweryfikowane na git 2.47.1: `Switched to branch 'x'`, `Switched to a new branch 'x'`, `Already on 'x'`, `error: pathspec 'x' did not match any file(s) known to git`, `fatal: a branch named 'x' already exists`, `Previous HEAD position was <hash> <opis>`, długie ostrzeżenie „Note: switching to '<hash>'. You are in 'detached HEAD' state..." zakończone `HEAD is now at <hash> <opis>`.
