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
