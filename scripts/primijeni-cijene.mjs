// Iz data/cjenik-proizvoda.json ispisuje cjenike (price-list) u vina.html na hr/en/de.
// Pokreće se ručno (npm run cijene) i u dnevnom workflowu; bez promjena cijena ne mijenja ništa.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { sidreniDatum, proizvodi } = JSON.parse(readFileSync(join(ROOT, 'data', 'cjenik-proizvoda.json'), 'utf8'));

const NBSP = '&nbsp;';
const mjeseci = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const [d, m, g] = sidreniDatum.split('.').map(Number);
const datumEn = `${d} ${mjeseci[m - 1]} ${g}`;

const zarez = (n) => n.toFixed(2).replace('.', ',');

const JEZICI = [
  {
    datoteka: 'vina.html',
    oznake: { '1l': '1 L', rinfuza: 'Rinfuza', '075-navoj': '0,75 L (navoj)', '075-pluto': '0,75 L (pluto)', berba2022: 'Berba 2022.' },
    glavna: (n) => `${zarez(n)} €`,
    sidrena: (n) => `Cijena na ${sidreniDatum}: ${zarez(n)} €`,
  },
  {
    datoteka: 'en/vina.html',
    oznake: { '1l': '1 L', rinfuza: 'Bulk', '075-navoj': '0.75 L (screw cap)', '075-pluto': '0.75 L (cork)', berba2022: '2022 Harvest' },
    glavna: (n) => `€${n.toFixed(2)}`,
    sidrena: (n) => `Price on ${datumEn}: €${n.toFixed(2)}`,
  },
  {
    datoteka: 'de/vina.html',
    oznake: { '1l': '1 L', rinfuza: 'Offener Wein', '075-navoj': '0,75 L (Schraubverschluss)', '075-pluto': '0,75 L (Korken)', berba2022: 'Jahrgang 2022' },
    glavna: (n) => `${zarez(n)} €`,
    sidrena: (n) => `Preis am ${sidreniDatum}: ${zarez(n)} €`,
  },
];

// razmaci u iznosu se vežu (&nbsp;) da se redak lomi ispred iznosa, ne usred njega
const veziIznos = (tekst) => {
  const i = tekst.indexOf(': ');
  return tekst.slice(0, i + 2) + tekst.slice(i + 2).replace(/ /g, NBSP);
};

const poVinu = new Map();
for (const p of proizvodi) {
  if (!poVinu.has(p.vino)) poVinu.set(p.vino, []);
  poVinu.get(p.vino).push(p);
}

let ukupnoIzmjena = 0;
for (const jezik of JEZICI) {
  const putanja = join(ROOT, jezik.datoteka);
  let html = readFileSync(putanja, 'utf8');
  for (const [vino, stavke] of poVinu) {
    const redovi = stavke.map((p) => {
      const oznaka = jezik.oznake[p.pakiranje];
      if (!oznaka) throw new Error(`Nepoznato pakiranje "${p.pakiranje}" (${p.sifra})`);
      return `            <li><span>${oznaka}</span><span>${jezik.glavna(p.mpc)}<span class="anchor-price">${veziIznos(jezik.sidrena(p.sidrenaCijena))}</span></span></li>`;
    });
    const re = new RegExp(`(id="${vino}">[\\s\\S]*?<ul class="price-list">)[\\s\\S]*?(</ul>)`);
    if (!re.test(html)) throw new Error(`Kartica id="${vino}" nije pronađena u ${jezik.datoteka}`);
    html = html.replace(re, `$1\n${redovi.join('\n')}\n          $2`);
  }
  const staro = readFileSync(putanja, 'utf8');
  if (html !== staro) {
    writeFileSync(putanja, html, 'utf8');
    ukupnoIzmjena++;
    console.log(`Ažurirano: ${jezik.datoteka}`);
  }
}
console.log(ukupnoIzmjena ? `Gotovo, izmijenjeno datoteka: ${ukupnoIzmjena}` : 'Cijene na stranici već odgovaraju JSON-u, nema promjena.');
