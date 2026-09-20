#!/usr/bin/env node
/**
 * Conforme — interfaccia da riga di comando.
 *
 * Questo file è il solo punto che mette insieme scanner e report, ed è quindi
 * l'unico che richiede Playwright. La logica degli argomenti sta in
 * argomenti.js proprio per restare testabile senza browser.
 */

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { scansiona } from './scan.js';
import { reportMarkdown, reportJson } from './report.js';
import { schedaPreparatoria } from './dichiarazione.js';
import { parseArgs, urlDaTesto, cartellaPerSito } from './argomenti.js';
import { plurale } from './testo.js';

const AIUTO = `
Conforme — scanner di accessibilità con contesto normativo italiano

  conforme <url...> [opzioni]

Opzioni:
  --file <path>     File di testo con una URL per riga (# per i commenti)
  --out <dir>       Cartella di output (default: report_<nome-del-sito>)
  --json            Salva anche il risultato grezzo in JSON
  --no-headless     Mostra il browser durante la scansione
  --help            Mostra questo messaggio

Esempi:
  conforme esempio.it
  conforme https://esempio.it https://esempio.it/contatti --json
  conforme --file urls.txt --out report-settembre

Nota: i controlli automatici verificano pienamente solo 4 dei 50 criteri
WCAG 2.1 A/AA. Il report include sempre le verifiche manuali necessarie.
`;

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`\n${e.message}\n`);
    console.log(AIUTO);
    process.exit(1);
  }

  if (opts.help) {
    console.log(AIUTO);
    process.exit(0);
  }

  if (opts.file) {
    let testo;
    try {
      testo = await readFile(opts.file, 'utf8');
    } catch {
      console.error(`\nNon riesco a leggere il file: ${opts.file}\n`);
      process.exit(1);
    }
    const { urls, scartati } = urlDaTesto(testo);
    opts.urls.push(...urls);
    opts.scartati.push(...scartati);
  }

  for (const s of opts.scartati) console.warn(`Ignorato, non sembra una URL: ${s}`);

  if (!opts.urls.length) {
    console.error('\nNessuna URL valida da analizzare.\n');
    console.log(AIUTO);
    process.exit(1);
  }

  // Le duplicate costano tempo e non aggiungono nulla.
  const uniche = [...new Set(opts.urls)];
  if (uniche.length < opts.urls.length) {
    console.log(`(${opts.urls.length - uniche.length} URL duplicate ignorate)`);
  }

  // Senza --out la cartella prende il nome del sito: così scansioni diverse
  // non si sovrascrivono e si riconoscono a colpo d'occhio.
  const cartella = opts.out || cartellaPerSito(uniche[0]);

  console.log(`\nScansione di ${plurale(uniche.length, 'pagina', 'pagine')}…\n`);

  let esito;
  try {
    esito = await scansiona(uniche, {
      headless: opts.headless,
      onProgress: (url, i, tot) => console.log(`  [${i}/${tot}] ${url}`),
    });
  } catch (e) {
    // L'errore più frequente al primo utilizzo è il browser mancante:
    // meglio dire come si risolve che stampare lo stack di Playwright.
    if (/Executable doesn't exist|browserType\.launch/i.test(e.message)) {
      console.error(`\nIl browser non è disponibile.\n`);
      console.error(`  Installalo con:  npx playwright install chromium`);
      console.error(`  Oppure indica un Chrome già presente nel sistema:`);
      console.error(`    export CONFORME_BROWSER_PATH=/percorso/del/chrome\n`);
      process.exit(2);
    }
    throw e;
  }

  await mkdir(cartella, { recursive: true });

  await writeFile(path.join(cartella, 'report.md'), reportMarkdown(esito, { sito: uniche[0] }), 'utf8');
  await writeFile(
    path.join(cartella, 'scheda-dichiarazione.md'),
    schedaPreparatoria(esito, { sito: uniche[0] }),
    'utf8'
  );
  if (opts.json) {
    await writeFile(path.join(cartella, 'risultato.json'), reportJson(esito), 'utf8');
  }

  const r = esito.riepilogo;
  console.log(`\n── Risultato ──`);
  console.log(`  Problemi distinti:  ${r.problemiDistinti}`);
  console.log(`  Di cui bloccanti:   ${r.bloccanti}`);
  console.log(`  Occorrenze totali:  ${r.occorrenzeTotali}`);
  if (r.pagineInErrore) {
    console.log(`  Pagine non raggiunte: ${r.pagineInErrore}`);
    for (const p of esito.pagine.filter((x) => x.errore)) {
      console.log(`    ${p.url} — ${String(p.errore).split('\n')[0]}`);
    }
  }
  console.log(`\n  Report:               ${path.join(cartella, 'report.md')}`);
  console.log(`  Scheda dichiarazione: ${path.join(cartella, 'scheda-dichiarazione.md')}`);
  console.log(
    `\n  I controlli automatici coprono solo una parte dei criteri.\n  Le verifiche manuali sono elencate in fondo al report.\n`
  );

  // Exit code utile in CI: 1 se ci sono problemi bloccanti o pagine irraggiungibili.
  process.exit(r.bloccanti > 0 || r.pagineInErrore > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(`\nErrore: ${e.message}\n`);
  process.exit(2);
});
