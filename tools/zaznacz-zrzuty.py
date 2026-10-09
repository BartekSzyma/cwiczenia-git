# Nanosi na zrzuty GitHuba czerwone ramki i podpisy wskazujące, co kliknąć.
# Czyta oryginały z zrzuty/oryginaly/, zapisuje wynik do zrzuty/ (stamtąd bierze je tools/osadz-zrzuty.mjs).
# Użycie: PYTHONUTF8=1 python tools/zaznacz-zrzuty.py
# Współrzędne w pikselach zrzutu (szerokość 1568): (x0, y0, x1, y1).
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

KATALOG = Path(__file__).resolve().parent.parent / "zrzuty"
ORYGINALY = KATALOG / "oryginaly"
KOLOR = (255, 59, 48)
GRUBOSC = 4
MARGINES = 6
CZCIONKA = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 20)

# Dla każdego zrzutu: lista (ramka, podpis, strona podpisu: nad / pod / lewo / prawo[, margines, grubość]).
# Własny margines i grubość przydają się, gdy ramka nie może zachodzić na sąsiedni wiersz.
ZAZNACZENIA = {
    "01-nowe-repo": [
        ((639, 199, 1066, 243), "1. Nazwa repozytorium", "prawo"),
        ((963, 410, 1051, 437), "2. Public", "prawo"),
        ((491, 532, 1066, 694), "3. Bez README, .gitignore i licencji", "lewo"),
        ((954, 713, 1065, 733), "4. Kliknij", "lewo"),
    ],
    "02-puste-repo-adres": [
        ((299, 530, 762, 551), "Skopiuj tę linię", "prawo", 0, 3),
    ],
    "03-compare-pull-request": [
        ((868, 165, 1012, 192), "Kliknij", "lewo"),
    ],
    "04-create-pull-request": [
        ((321, 175, 555, 200), "base: main, compare: nowa-funkcja", "pod"),
        ((853, 596, 1013, 622), "Kliknij", "lewo"),
    ],
    "05-merge-pull-request": [
        ((340, 580, 486, 607), "Kliknij", "pod"),
    ],
    "06-confirm-merge": [
        ((340, 712, 434, 733), "Kliknij", "prawo"),
    ],
    "07-lista-commitow": [
        ((1238, 240, 1250, 259), "Kopiuj hash", "nad"),
    ],
    "08-network": [
        ((697, 51, 766, 74), "1. Insights", "pod"),
        ((288, 352, 528, 381), "2. Network", "lewo"),
        ((858, 200, 976, 321), "3. Rozwidlenie i scalenie gałęzi", "prawo"),
    ],
}


def podpis(rysunek, ramka, tekst, strona):
    x0, y0, x1, y1 = ramka
    lewo, gora, prawo, dol = rysunek.textbbox((0, 0), tekst, font=CZCIONKA)
    szer, wys = prawo - lewo + 16, dol - gora + 10
    odstep = 10
    if strona == "pod":
        px, py = x0, y1 + odstep
    elif strona == "nad":
        px, py = x0, y0 - odstep - wys
    elif strona == "lewo":
        px, py = x0 - odstep - szer, (y0 + y1 - wys) // 2
    else:
        px, py = x1 + odstep, (y0 + y1 - wys) // 2
    szerokosc_obrazu, wysokosc_obrazu = rysunek.im.size
    px = max(2, min(px, szerokosc_obrazu - szer - 2))
    py = max(2, min(py, wysokosc_obrazu - wys - 2))
    rysunek.rounded_rectangle((px, py, px + szer, py + wys), radius=6, fill=KOLOR)
    rysunek.text((px + 8 - lewo, py + 5 - gora), tekst, font=CZCIONKA, fill=(255, 255, 255))


def main():
    for klucz, zaznaczenia in ZAZNACZENIA.items():
        obraz = Image.open(ORYGINALY / f"{klucz}.jpg").convert("RGB")
        rysunek = ImageDraw.Draw(obraz)
        for (x0, y0, x1, y1), tekst, strona, *styl in zaznaczenia:
            margines, grubosc = styl or (MARGINES, GRUBOSC)
            ramka = (x0 - margines, y0 - margines, x1 + margines, y1 + margines)
            rysunek.rounded_rectangle(ramka, radius=8 if margines else 4, outline=KOLOR, width=grubosc)
            podpis(rysunek, ramka, tekst, strona)
        obraz.save(KATALOG / f"{klucz}.jpg", quality=90)
        print(f"{klucz}: {len(zaznaczenia)} zaznaczeń")


if __name__ == "__main__":
    main()
