/**
 * Test dei controlli che pilotano il browser: `npm run test:browser`.
 *
 * Separati da `npm test` perché richiedono Chromium, e i test della logica
 * pura devono poter girare senza installare nulla.
 *
 * Perché esistono. I controlli da tastiera producono accuse gravi — "questo
 * elemento non si raggiunge" — e finora nessun test li presidiava: ogni
 * verifica era manuale e non ripetibile. Il risultato è stato un falso
 * positivo che ha attraversato due versioni, dichiarando irraggiungibile un
 * link "salta al contenuto" che funzionava.
 *
 * C'è un secondo motivo, più insidioso. Questi controlli avvolgono ogni
 * chiamata al browser in un try/catch che, in caso di errore, restituisce
 * "non ho trovato niente". È la scelta giusta — un controllo che fallisce non
 * deve far cadere la scansione — ma significa che un difetto nel codice e una
 * pagina pulita si presentano allo stesso modo. Durante la scrittura di questo
 * file un argomento dimenticato ha disattivato per intero il rilevamento del
 * confinamento, senza un errore, senza un avviso, e senza che si notasse.
 *
 * Da qui il criterio: ogni controllo ha una pagina che lo fa scattare e una
 * che non deve farlo scattare. La seconda conta più della prima, perché è
 * quella che smaschera le accuse false — e perché un test che verifica solo
 * il silenzio passerebbe anche a codice completamente spento.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { verificaTastiera } from '../src/tastiera.js';
import { scansionaPagina } from '../src/scan.js';

const CARTELLA = path.join(path.dirname(fileURLToPath(import.meta.url)), 'pagine');

/**
 * Le pagine vanno servite via HTTP, non aperte da disco.
 *
 * Con file:// l'origine è opaca, e l'attribuzione a terze parti si basa
 * proprio sul confronto fra origini: un test su file:// direbbe sempre "stessa
 * origine" e passerebbe anche a codice sbagliato. Due porte diverse sono due
 * origini diverse, che è esattamente ciò che va distinto.
 */
function servi(radice, porta) {
  const server = http.createServer((req, res) => {
    const nome = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const file = path.join(radice, nome);
    if (!file.startsWith(radice) || !fs.existsSync(file)) {
      res.writeHead(404).end('no');
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(file));
  });
  return new Promise((ok) => server.listen(porta, '127.0.0.1', () => ok(server)));
}

let BASE = '';
let BASE_TERZE = '';

let passati = 0;
const esiti = [];

const test = (nome, fn) => esiti.push({ nome, fn });

/** Esegue i controlli da tastiera su una pagina di prova. */
async function analizza(browser, file) {
  const page = await browser.newPage();
  try {
    await page.goto(BASE + file);
    const r = await verificaTastiera(page);
    return { ...r, regole: r.violazioni.map((v) => v.id) };
  } finally {
    await page.close();
  }
}

// ── Il caso che ha rivelato il difetto, e il limite che ne è seguito
//
// Qui il focus è davvero chiuso: trenta pressioni di Tab ed Esc non lo
// liberano. Eppure Conforme non accerta nulla, e non è prudenza eccessiva.
// Su comune.milano.it questa prova dava lo stesso identico risultato, e la
// barriera non c'era: dal banner si usciva premendo Tab, verificato a mano.
// Finché il controllo non sa distinguere il comportamento del sito dalla
// propria interferenza, riferisce e non accusa.
test('nemmeno un banner senza via d\'uscita viene dichiarato una barriera', async (b) => {
  const r = await analizza(b, 'banner-rimanda.html');

  assert.ok(!r.regole.includes('tastiera-focus-confinato'), 'la regola accertativa è tornata');
  assert.ok(
    r.regole.includes('tastiera-percorso-interrotto'),
    'il fatto osservato va comunque riferito'
  );
  assert.ok(
    !r.regole.includes('tastiera-irraggiungibile'),
    'sono stati accusati elementi che il percorso non ha raggiunto'
  );
  assert.equal(r.statistiche.confinamentoConUscita, false, 'la prova di uscita doveva fallire qui');
  assert.equal(r.statistiche.percorsoCompleto, false);

  const nodo = r.violazioni.find((v) => v.id === 'tastiera-percorso-interrotto').nodes[0];
  // Il contenitore va nominato in modo da poterlo ritrovare nel codice.
  assert.notEqual(nodo.target[0], 'div', 'il contenitore è indicato solo come "div"');
  // E la spiegazione deve dire a chi legge come verificarlo in mezzo minuto.
  assert.match(nodo.failureSummary, /Va verificato a mano/);
  assert.match(nodo.failureSummary, /2\.1\.2/);
});

// ── Il difetto peggiore: lo scanner che misura sé stesso
//
// Per partire dall'inizio della pagina il percorso sposta il focus sul
// documento, uno stato che una persona non produce mai. I gestori di consenso
// reagiscono proprio a quello e riprendono il focus. Conforme osservava la
// propria interferenza e la dichiarava barriera bloccante del 2.1.2: è
// successo su comune.milano.it, ed è stato smentito provando a mano.
test('un banner da cui si esce con Tab non viene dichiarato una barriera', async (b) => {
  const r = await analizza(b, 'banner-reagisce-al-body.html');

  assert.ok(
    !r.regole.includes('tastiera-focus-confinato'),
    'dichiarata una barriera da cui si esce premendo Tab'
  );
  assert.equal(r.statistiche.confinamentoConUscita, true, 'la prova doveva trovare la via d\'uscita');
  assert.equal(r.statistiche.confinamentoUscitaVia, 'tab', 'si esce con Tab, senza bisogno di Esc');
  assert.ok(!r.regole.includes('tastiera-irraggiungibile'));
  // Il percorso non ha comunque coperto la pagina, e tacerlo del tutto
  // farebbe leggere il silenzio come esito pulito.
  assert.ok(r.regole.includes('tastiera-percorso-interrotto'));
});

// ── La differenza fra un difetto e il comportamento previsto
//
// Stesso confinamento, ma Esc chiude il contenitore. Le WCAG lo prevedono:
// accusarlo sarebbe sbagliato quanto tacere che il percorso si è fermato.
test('da un contenitore che si chiude con Esc non si viene accusati', async (b) => {
  const r = await analizza(b, 'banner-con-esc.html');

  assert.equal(r.statistiche.confinato, true, 'il confinamento va comunque rilevato');
  assert.equal(r.statistiche.confinamentoConUscita, true, 'Esc doveva liberare il focus');
  assert.ok(
    !r.regole.includes('tastiera-focus-confinato'),
    'un contenitore da cui si esce non è una violazione'
  );
  assert.ok(
    r.regole.includes('tastiera-percorso-interrotto'),
    'va detto comunque che il percorso non ha coperto la pagina'
  );
  assert.ok(!r.regole.includes('tastiera-irraggiungibile'));
});

// ── Il test che conta di più
//
// Una pagina senza difetti da tastiera, con dentro i casi che in passato
// venivano scambiati per difetti: schede governate da aria-activedescendant,
// un comando disattivato, un elemento nascosto.
test('una pagina corretta non produce alcuna segnalazione', async (b) => {
  const r = await analizza(b, 'pulita.html');

  assert.deepEqual(r.regole, [], `segnalazioni su una pagina corretta: ${r.regole.join(', ')}`);
  assert.equal(r.statistiche.percorsoCompleto, true, 'il percorso doveva coprire la pagina');
  assert.equal(r.statistiche.skipLink, true, 'il link di salto c\'è e va riconosciuto');
});

// ── Il controllo che non dipende dal percorso
//
// Serve a dimostrare che i test qui sopra non passano perché il codice tace
// sempre: qui deve parlare, e deve distinguere i finti comandi dai veri.
test('i comandi che non possono ricevere il focus vengono trovati', async (b) => {
  const r = await analizza(b, 'finti-comandi.html');

  assert.ok(r.regole.includes('tastiera-non-focalizzabile'));
  const nodi = r.violazioni.find((v) => v.id === 'tastiera-non-focalizzabile').nodes;
  assert.equal(nodi.length, 3, `attesi 3 finti comandi, trovati ${nodi.length}`);
  // Il <div role="button" tabindex="0">, il <button> e l'<a href> della stessa
  // pagina non devono comparire: sono raggiungibili.
  assert.ok(!nodi.some((n) => /button|a\[/.test(n.html.slice(0, 8))), 'accusato un comando valido');
  // E non va segnalato due volte sotto un'altra regola.
  assert.ok(!r.regole.includes('tastiera-irraggiungibile'), 'stesso elemento accusato due volte');
});

// ── Quando la causa non si trova
//
// Il percorso si ferma, ma gli elementi toccati non stanno in un contenitore
// sovrapposto: non c'è nessuno da incolpare. Conforme deve dichiarare il
// controllo non riuscito, non inventare un colpevole — in una versione
// intermedia accusava l'intestazione per il solo fatto di contenerli.
test('senza una causa identificabile non si incolpa nessuno', async (b) => {
  const r = await analizza(b, 'senza-causa.html');

  assert.deepEqual(r.regole, ['tastiera-percorso-interrotto']);
  assert.equal(r.statistiche.confinato, false, 'è stato incolpato un contenitore qualsiasi');
});

// ── Da dove arriva il problema
//
// Tre provenienze nella stessa pagina: un difetto del sito, uno dentro un
// documento servito da un'altra origine, uno in un componente riconoscibile
// dal nome. Il terzo test qui sotto è quello che conta: il difetto del sito
// NON deve essere attribuito a terzi, altrimenti l'attribuzione diventa un
// modo per assolvere chi ha sbagliato.
test('un documento di un\'altra origine viene attribuito con certezza', async (b) => {
  const r = await scansionaPagina(b, BASE + 'con-terze-parti.html', { tastiera: false, reflow: false });

  const dentroFrame = r.violazioni.find((v) =>
    v.esempi.some((e) => e.dentroFrame?.length)
  );
  assert.ok(dentroFrame, 'nessuna violazione rilevata dentro l\'iframe');
  assert.equal(dentroFrame.origine.tutteDaTerzi, true);
  assert.equal(dentroFrame.origine.componenti[0].certezza, 'certa');

  // Il selettore non deve più essere la catena unita che non seleziona nulla.
  const esempio = dentroFrame.esempi.find((e) => e.dentroFrame?.length);
  assert.doesNotMatch(esempio.selettore, /iframe/, 'il percorso del frame è finito nel selettore');
});

test('un componente riconosciuto dal nome viene attribuito come probabile', async (b) => {
  const r = await scansionaPagina(b, BASE + 'con-terze-parti.html', { tastiera: false, reflow: false });

  const daOneTrust = r.violazioni.filter((v) =>
    v.origine?.componenti?.some((c) => c.nome === 'OneTrust')
  );
  assert.ok(daOneTrust.length, 'il componente non è stato riconosciuto');
  const c = daOneTrust[0].origine.componenti.find((x) => x.nome === 'OneTrust');
  assert.equal(c.certezza, 'probabile', 'un riconoscimento per nome non è una certezza');
});

test('un difetto del sito non viene attribuito a terzi', async (b) => {
  const r = await scansionaPagina(b, BASE + 'con-terze-parti.html', { tastiera: false, reflow: false });

  // L'immagine senza alt sta nel <main>, non in un componente esterno.
  const immagini = r.violazioni.find((v) => v.regola === 'image-alt');
  assert.ok(immagini, 'l\'immagine senza alt non è stata rilevata');
  const suoi = immagini.esempi.filter((e) => e.origine?.origine === 'sito');
  assert.ok(suoi.length, 'l\'immagine del sito è stata attribuita a terzi');
});

test('una pagina senza componenti esterni non ne dichiara nessuno', async (b) => {
  const r = await scansionaPagina(b, BASE + 'finti-comandi.html', { tastiera: false, reflow: false });
  for (const v of r.violazioni) {
    assert.ok(
      !v.origine || v.origine.tutteDalSito,
      `attribuito a terzi senza motivo: ${v.regola} → ${JSON.stringify(v.origine?.componenti)}`
    );
  }
});

// L'iframe della pagina di prova punta all'altra origine, che si conosce solo
// a server avviato: l'indirizzo viene sostituito qui.
const servers = [await servi(CARTELLA, 0), await servi(path.join(CARTELLA, 'terze'), 0)];
BASE = `http://127.0.0.1:${servers[0].address().port}/`;
BASE_TERZE = `http://127.0.0.1:${servers[1].address().port}/`;

const sorgente = path.join(CARTELLA, 'con-terze-parti.html');
const originale = fs.readFileSync(sorgente, 'utf8');
fs.writeFileSync(sorgente, originale.replace('IFRAME_SRC', BASE_TERZE + 'modulo.html'));

const browser = await chromium.launch({
  executablePath: process.env.CONFORME_BROWSER_PATH || undefined,
});

console.log('\nControlli da tastiera e attribuzione, su pagine reali');
try {
  for (const { nome, fn } of esiti) {
    try {
      await fn(browser);
      console.log(`  ok  ${nome}`);
      passati++;
    } catch (e) {
      console.error(`  FAIL  ${nome}\n        ${e.message}`);
      process.exitCode = 1;
    }
  }
} finally {
  await browser.close();
  // La pagina di prova torna com'era: l'indirizzo dell'altra origine cambia a
  // ogni avvio, e lasciarlo scritto dentro sporcherebbe il repository.
  fs.writeFileSync(sorgente, originale);
  for (const s of servers) s.close();
}

console.log(`\n${passati} test superati${process.exitCode ? ' — CI SONO ERRORI' : ''}\n`);
