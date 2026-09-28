// Generira dnevni digitalni cjenik proizvoda u .csv formatu
// prema Odluci o objavi cjenika proizvoda i usluga (NN 101/2026), na snazi od 1.10.2026.
// Pokreće se svako radno jutro putem .github/workflows/dnevni-cjenik.yml

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILE = join(ROOT, 'data', 'cjenik-proizvoda.json');
const COUNTER_FILE = join(ROOT, 'data', 'pohrana-brojac.json');
const ARHIVA_DIR = join(ROOT, 'cjenik-arhiva');
const TRENUTNI_CSV = join(ROOT, 'cjenik-proizvoda.csv');
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
const nazivDatoteke = `${subjekt.oblikObjekta}_${slug(subjekt.adresaObjekta)}_${subjekt.oznakaObjekta}_${brojPohrane}_${datum}_${vrijeme}.csv`;

const csvBroj = (n) => n.toFixed(2);
const escapeCsv = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const zaglavlje = [
  'Naziv proizvoda', 'Šifra', 'Marka', 'Jedinica mjere', 'Cijena za jedinicu mjere + PDV',
  'Maloprodajna cijena + PDV', 'Poseban oblik prodaje (DA/NE)', 'Naziv posebnog oblika prodaje',
  `Sidrena cijena (${sidreniDatum}) + PDV`, 'Barkod', 'Dostupnost',
];

const redovi = proizvodi.map((p) => {
  const cijenaPoJedinici = p.kolicina ? csvBroj(p.mpc / p.kolicina) : '';
  return [
    p.naziv,
    p.sifra,
    subjekt.marka,
    p.jedinicaMjere ?? '',
    cijenaPoJedinici,
    csvBroj(p.mpc),
    'NE',
    '',
    csvBroj(p.sidrenaCijena),
    p.barkod ?? '',
    p.dostupno === false ? 'nedostupno' : 'dostupno',
  ].map(escapeCsv).join(',');
});

const csvSadrzaj = ['﻿' + zaglavlje.join(','), ...redovi].join('\r\n') + '\r\n';

if (!existsSync(ARHIVA_DIR)) mkdirSync(ARHIVA_DIR, { recursive: true });
writeFileSync(join(ARHIVA_DIR, nazivDatoteke), csvSadrzaj, 'utf8');
writeFileSync(TRENUTNI_CSV, csvSadrzaj, 'utf8');
writeFileSync(COUNTER_FILE, JSON.stringify(brojac), 'utf8');

// Očisti arhivu starije od ZADRZI_DANA dana (osim index.json)
const granica = Date.now() - ZADRZI_DANA * 24 * 60 * 60 * 1000;
const zadrzani = [];
for (const f of readdirSync(ARHIVA_DIR)) {
  if (f === 'index.xml') continue;
  const match = f.match(/_(\d{8})_(\d{4})\.csv$/);
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
const xmlEsc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  `<arhiva azurirano="${sada.toISOString()}">`,
  ...zadrzani.map((f) => `  <datoteka>${xmlEsc(f)}</datoteka>`),
  '</arhiva>',
  '',
].join('\n');
writeFileSync(ARHIVA_INDEX, xml, 'utf8');

console.log(`Generiran cjenik: ${nazivDatoteke} (${proizvodi.length} proizvoda)`);
