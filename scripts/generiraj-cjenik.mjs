// Generira dnevni digitalni cjenik proizvoda u .xml formatu
// prema Odluci o objavi cjenika proizvoda i usluga (NN 101/2026), na snazi od 1.10.2026.
// Pokreće se svako radno jutro putem .github/workflows/dnevni-cjenik.yml

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILE = join(ROOT, 'data', 'cjenik-proizvoda.json');
const COUNTER_FILE = join(ROOT, 'data', 'pohrana-brojac.json');
const ARHIVA_DIR = join(ROOT, 'cjenik-arhiva');
const TRENUTNI = join(ROOT, 'cjenik-proizvoda.xml');
const ARHIVA_INDEX = join(ARHIVA_DIR, 'index.xml');
const ZADRZI_DANA = 30;

const podaci = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
const { subjekt, sidreniDatum, proizvodi } = podaci;

let brojac = { zadnji: 0 };
if (existsSync(COUNTER_FILE)) {
  brojac = JSON.parse(readFileSync(COUNTER_FILE, 'utf8'));
}
brojac.zadnji += 1;
const brojPohrane = String(brojac.zadnji).padStart(4, '0');

const sada = new Date();
const dijelovi = Object.fromEntries(
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Zagreb', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(sada).map((p) => [p.type, p.value]),
);
const datum = `${dijelovi.year}${dijelovi.month}${dijelovi.day}`;
const vrijeme = `${dijelovi.hour}${dijelovi.minute}`;

const slug = (s) => s.replace(/\s+/g, '-');
const nazivDatoteke = `${subjekt.oblikObjekta}_${slug(subjekt.adresaObjekta)}_${subjekt.oznakaObjekta}_${brojPohrane}_${datum}_${vrijeme}.xml`;

const xmlEsc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const broj = (n) => n.toFixed(2);
const tag = (ime, vrijednost, atributi = '') => {
  const v = vrijednost === '' || vrijednost == null ? '' : xmlEsc(vrijednost);
  return v === '' && !atributi ? `<${ime}/>` : `<${ime}${atributi}>${v}</${ime}>`;
};
const cijenaAtr = ' valuta="EUR" pdv="ukljucen"';

const stavke = proizvodi.map((p) => {
  const cijenaPoJedinici = p.kolicina ? broj(p.mpc / p.kolicina) : '';
  return [
    '  <proizvod>',
    `    ${tag('naziv', p.naziv)}`,
    `    ${tag('sifra', p.sifra)}`,
    `    ${tag('marka', subjekt.marka)}`,
    `    ${tag('jedinica_mjere', p.jedinicaMjere ?? '')}`,
    `    ${tag('cijena_za_jedinicu_mjere', cijenaPoJedinici, cijenaPoJedinici ? cijenaAtr : '')}`,
    `    ${tag('maloprodajna_cijena', broj(p.mpc), cijenaAtr)}`,
    `    ${tag('poseban_oblik_prodaje', 'NE')}`,
    `    ${tag('naziv_posebnog_oblika_prodaje', '')}`,
    `    ${tag('sidrena_cijena', broj(p.sidrenaCijena), `${cijenaAtr} datum="${xmlEsc(sidreniDatum)}"`)}`,
    `    ${tag('barkod', p.barkod ?? '')}`,
    `    ${tag('dostupnost', p.dostupno === false ? 'nedostupno' : 'dostupno')}`,
    '  </proizvod>',
  ].join('\n');
});

const datumIso = `${dijelovi.year}-${dijelovi.month}-${dijelovi.day}`;
const sadrzaj = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  `<cjenik oblik_objekta="${xmlEsc(subjekt.oblikObjekta)}" adresa_objekta="${xmlEsc(subjekt.adresaObjekta)}" oznaka_objekta="${xmlEsc(subjekt.oznakaObjekta)}" broj_pohrane="${brojPohrane}" datum="${datumIso}" vrijeme="${dijelovi.hour}:${dijelovi.minute}">`,
  ...stavke,
  '</cjenik>',
  '',
].join('\n');

if (!existsSync(ARHIVA_DIR)) mkdirSync(ARHIVA_DIR, { recursive: true });
writeFileSync(join(ARHIVA_DIR, nazivDatoteke), sadrzaj, 'utf8');
writeFileSync(TRENUTNI, sadrzaj, 'utf8');
writeFileSync(COUNTER_FILE, JSON.stringify(brojac), 'utf8');

// Očisti arhivu starije od ZADRZI_DANA dana (osim index.xml)
const granica = Date.now() - ZADRZI_DANA * 24 * 60 * 60 * 1000;
const zadrzani = [];
for (const f of readdirSync(ARHIVA_DIR)) {
  if (f === 'index.xml') continue;
  const match = f.match(/_(\d{8})_(\d{4})\.xml$/);
  if (!match) continue;
  const [, d, t] = match;
  const kad = new Date(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T${t.slice(0, 2)}:${t.slice(2, 4)}:00Z`).getTime();
  if (kad < granica) {
    unlinkSync(join(ARHIVA_DIR, f));
  } else {
    zadrzani.push(f);
  }
}
zadrzani.sort().reverse();

const indexXml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  `<arhiva azurirano="${sada.toISOString()}">`,
  ...zadrzani.map((f) => `  <datoteka>${xmlEsc(f)}</datoteka>`),
  '</arhiva>',
  '',
].join('\n');
writeFileSync(ARHIVA_INDEX, indexXml, 'utf8');

console.log(`Generiran cjenik: ${nazivDatoteke} (${proizvodi.length} proizvoda)`);
