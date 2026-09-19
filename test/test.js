/**
 * Test senza dipendenze esterne: `npm test`.
 *
 * Coprono la logica pura. Alcuni test presidiano la CORRETTEZZA DEL CONTENUTO,
 * non solo il funzionamento del codice: che i titoli siano quelli ufficiali,
 * che la copertura dichiarata corrisponda ai dati, che la scheda non si spacci
 * per una dichiarazione valida. Sono quelli che impediscono al progetto di
 * tornare a essere contenuto plausibile e non verificato.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import { CRITERI, CODICI, COPERTURA, CONTESTO_NORMATIVO, criteriDaTag, prioritaViolazione, scheda, criteriNonAutomatizzabili } from '../src/wcag-it.js';
import { descriviRegola, correggiRegola, REGOLE, REGOLE_IT } from '../src/regole-it.js';
import { riepiloga, normalizzaViolazioni, troncaHtml } from '../src/aggrega.js';
import { reportMarkdown, reportJson } from '../src/report.js';
import { schedaPreparatoria, statoSuggerito } from '../src/dichiarazione.js';
import { VERIFICHE_MANUALI, notaCopertura, criteriCopertiDaVerifiche, criteriScoperti } from '../src/manuale.js';
import { normalizzaUrl, parseArgs, urlDaTesto } from '../src/argomenti.js';

let passati = 0;
const test = (nome, fn) => {
  try {
    fn();
    console.log(`  ok  ${nome}`);
    passati++;
  } catch (e) {
    console.error(`  FAIL  ${nome}\n        ${e.message}`);
    process.exitCode = 1;
  }
};

// ══════════════════════════════════════════ Correttezza del contenuto

console.log('\nCorrettezza dei criteri WCAG');

test('la copertura è completa: 30 criteri A e 20 AA', () => {
  const A = CODICI.filter((c) => CRITERI[c].livello === 'A').length;
  const AA = CODICI.filter((c) => CRITERI[c].livello === 'AA').length;
  assert.equal(A, 30, `livello A: ${A}`);
  assert.equal(AA, 20, `livello AA: ${AA}`);
  assert.equal(CODICI.length, 50);
});

test('i titoli corrispondono alla traduzione ufficiale W3C', () => {
  // Campione verificato su https://www.w3.org/Translations/WCAG21-it/
  // Se un titolo qui non combacia, è un errore da correggere nel codice,
  // non nel test: il titolo ufficiale è quello che vale negli atti.
  const ufficiali = {
    '1.1.1': 'Contenuti non testuali',
    '1.3.5': 'Identificare lo scopo degli input',
    '1.4.3': 'Contrasto (minimo)',
    '1.4.10': 'Ricalcolo del flusso',
    '1.4.11': 'Contrasto in contenuti non testuali',
    '2.1.2': 'Nessun impedimento all\'uso della tastiera',
    '2.4.2': 'Titolazione della pagina',
    '2.4.4': 'Scopo del collegamento (nel contesto)',
    '3.1.1': 'Lingua della pagina',
    '3.1.2': 'Parti in lingua',
    '3.2.2': 'All\'input',
    '3.3.1': 'Identificazione di errori',
    '4.1.1': 'Analisi sintattica (parsing)',
    '4.1.2': 'Nome, ruolo, valore',
  };
  for (const [codice, titolo] of Object.entries(ufficiali)) {
    assert.equal(CRITERI[codice]?.titolo, titolo, `${codice} ha un titolo non ufficiale`);
  }
});

test('i livelli di conformità sono quelli corretti', () => {
  // 3.1.2 è AA, non A: errore comune nelle fonti secondarie.
  assert.equal(CRITERI['3.1.2'].livello, 'AA');
  assert.equal(CRITERI['3.1.1'].livello, 'A');
  assert.equal(CRITERI['1.4.3'].livello, 'AA');
  assert.equal(CRITERI['2.1.1'].livello, 'A');
  assert.equal(CRITERI['4.1.3'].livello, 'AA');
});

test('ogni criterio ha tutti i campi, con valori ammessi', () => {
  for (const codice of CODICI) {
    const c = CRITERI[codice];
    assert.match(codice, /^\d\.\d\.\d+$/, `codice malformato: ${codice}`);
    for (const campo of ['titolo', 'livello', 'principio', 'impatto', 'correzione', 'priorita', 'auto']) {
      assert.ok(c[campo], `${codice} manca il campo ${campo}`);
    }
    assert.ok(['A', 'AA'].includes(c.livello), `${codice}: livello ${c.livello}`);
    assert.ok([1, 2, 3, 4].includes(c.principio), `${codice}: principio ${c.principio}`);
    assert.ok([1, 2, 3].includes(c.priorita), `${codice}: priorità ${c.priorita}`);
    assert.ok(['si', 'parziale', 'no'].includes(c.auto), `${codice}: auto ${c.auto}`);
  }
});

test('il numero del criterio corrisponde al suo principio', () => {
  for (const codice of CODICI) {
    assert.equal(CRITERI[codice].principio, Number(codice[0]), `${codice}: principio incoerente col numero`);
  }
});

test('impatto e correzione sono scritti, non segnaposto', () => {
  for (const codice of CODICI) {
    const c = CRITERI[codice];
    assert.ok(c.impatto.length > 40, `${codice}: impatto troppo breve per dire qualcosa`);
    assert.ok(c.correzione.length > 30, `${codice}: correzione troppo breve`);
    assert.doesNotMatch(c.impatto, /TODO|da scrivere|lorem/i, `${codice}: impatto è un segnaposto`);
    assert.doesNotMatch(c.correzione, /TODO|da scrivere|lorem/i, `${codice}: correzione è un segnaposto`);
  }
});

console.log('\nOnestà sui limiti');

test('la copertura calcolata corrisponde ai dati', () => {
  assert.equal(COPERTURA.automatici + COPERTURA.parziali + COPERTURA.manuali, COPERTURA.totale);
  assert.equal(COPERTURA.totale, 50);
  // Se un giorno l'automazione coprisse la maggioranza dei criteri sarebbe una
  // notizia: fino ad allora, questo test impedisce di dichiararlo per sbaglio.
  assert.ok(COPERTURA.automatici < COPERTURA.totale / 2, 'copertura automatica dichiarata troppo alta');
});

test('la nota sui limiti cita numeri reali, non una percentuale a memoria', () => {
  const n = notaCopertura();
  assert.match(n, new RegExp(`${COPERTURA.totale} criteri`));
  assert.match(n, new RegExp(`ne verifica pienamente ${COPERTURA.automatici}`));
  assert.match(n, /non che il sito sia conforme/);
});

test('criteriNonAutomatizzabili esclude solo quelli pienamente automatici', () => {
  const nonAuto = criteriNonAutomatizzabili();
  assert.equal(nonAuto.length, COPERTURA.parziali + COPERTURA.manuali);
  assert.ok(!nonAuto.includes('1.4.3'), '1.4.3 è pienamente automatico');
  assert.ok(nonAuto.includes('2.1.1'), '2.1.1 non è pienamente automatico');
});

test('le verifiche manuali citano criteri esistenti', () => {
  for (const v of VERIFICHE_MANUALI) {
    assert.ok(v.criteri.length, `${v.id} non cita alcun criterio`);
    for (const c of v.criteri) {
      if (/^\d/.test(c)) assert.ok(CRITERI[c], `${v.id} cita un criterio inesistente: ${c}`);
    }
    assert.ok(v.come.length > 60, `${v.id}: istruzioni troppo vaghe`);
  }
});

test('automazione e checklist insieme coprono tutti i criteri', () => {
  // Se questo test fallisce, il report dichiarerà quali criteri restano fuori:
  // meglio saperlo qui che scoprirlo davanti a un cliente.
  assert.deepEqual(criteriScoperti(), [], 'restano criteri senza copertura');
});

test('la checklist copre le barriere più bloccanti', () => {
  const coperti = criteriCopertiDaVerifiche();
  for (const c of ['2.1.1', '1.1.1', '3.3.2', '4.1.2', '2.4.7']) {
    assert.ok(coperti.includes(c), `criterio bloccante ${c} non coperto da nessuna verifica`);
  }
});

console.log('\nContesto normativo');

test('i due regimi italiani sono distinti e non confusi', () => {
  const ids = CONTESTO_NORMATIVO.regimi.map((r) => r.id);
  assert.deepEqual(ids.sort(), ['eaa', 'stanca']);
  const stanca = CONTESTO_NORMATIVO.regimi.find((r) => r.id === 'stanca');
  const eaa = CONTESTO_NORMATIVO.regimi.find((r) => r.id === 'eaa');
  assert.match(stanca.soggetti, /500 milioni/);
  assert.match(stanca.dichiarazione, /form\.agid\.gov\.it/);
  assert.match(eaa.soggetti, /microimprese/);
  assert.match(eaa.dichiarazione, /non lo è|formato AgID/);
});

test('la fonte dei titoli è dichiarata', () => {
  assert.match(CONTESTO_NORMATIVO.fonteTitoli, /w3\.org\/Translations\/WCAG21-it/);
});

// ══════════════════════════════════════════ Meccanica

console.log('\nMappatura e aggregazione');

test('criteriDaTag estrae i codici corretti', () => {
  assert.deepEqual(criteriDaTag(['wcag2aa', 'wcag143', 'cat.color']), ['1.4.3']);
  assert.deepEqual(criteriDaTag(['wcag412']), ['4.1.2']);
  assert.deepEqual(criteriDaTag(['wcag1410']), ['1.4.10']);
  assert.deepEqual(criteriDaTag(['wcag2a', 'wcag21aa']), []);
  assert.deepEqual(criteriDaTag(), []);
});

test('prioritaViolazione prende la più grave', () => {
  assert.equal(prioritaViolazione(['1.4.3', '2.1.1']), 1);
  assert.equal(prioritaViolazione(['1.3.5']), 3);
  assert.equal(prioritaViolazione(['9.9.9']), 3);
  assert.equal(prioritaViolazione([]), 3);
});

test('scheda restituisce il criterio giusto', () => {
  assert.equal(scheda('2.4.7').titolo, 'Focus visibile');
  assert.equal(scheda('nonesiste'), null);
});

test('descriviRegola traduce e ripiega correttamente', () => {
  assert.equal(descriviRegola('color-contrast', 'English'), 'Contrasto insufficiente tra testo e sfondo');
  assert.equal(descriviRegola('regola-ignota', 'English'), 'English');
  assert.equal(descriviRegola('regola-ignota'), 'regola-ignota');
});

test('le traduzioni delle regole sono in italiano', () => {
  for (const [regola, testo] of Object.entries(REGOLE_IT)) {
    assert.ok(testo.length > 10, `${regola}: traduzione troppo corta`);
    assert.doesNotMatch(testo, /\bmust have\b|\bshould\b|\belements\b/i, `${regola}: sembra inglese`);
  }
});

test('ogni regola ha una correzione specifica e concreta', () => {
  // Nasce da una prova su un sito reale: aria-required-parent e list
  // ricadevano entrambe sul consiglio generico del criterio 1.3.1
  // ("usa HTML semantico"), inutile per entrambe.
  for (const [regola, v] of Object.entries(REGOLE)) {
    assert.ok(v.descrizione, `${regola}: manca la descrizione`);
    assert.ok(v.correzione, `${regola}: manca la correzione specifica`);
    assert.ok(v.correzione.length > 35, `${regola}: correzione troppo vaga`);
  }
});

test('la correzione della regola è diversa da quella generica del criterio', () => {
  // Il caso che ha rivelato il difetto: due regole molto diverse, stesso
  // criterio. Devono ricevere consigli diversi, o il report non serve.
  const a = correggiRegola('aria-required-parent');
  const b = correggiRegola('list');
  assert.ok(a && b);
  assert.notEqual(a, b, 'due regole dello stesso criterio hanno la stessa correzione');
  assert.match(a, /menu|listitem|tablist/i, 'la correzione non parla del problema reale');
  assert.match(b, /<li>|<ul>/i, 'la correzione non parla del problema reale');
});

test('correggiRegola restituisce null per le regole sconosciute', () => {
  assert.equal(correggiRegola('regola-inventata'), null);
});

const violazioneAxe = {
  id: 'color-contrast',
  help: 'Elements must have sufficient color contrast',
  impact: 'serious',
  tags: ['wcag2aa', 'wcag143'],
  helpUrl: 'https://esempio/regola',
  nodes: [
    { target: ['p.intro'], html: '<p class="intro">ciao</p>', failureSummary: 'contrasto 2.1:1' },
    { target: ['a.link'], html: '<a class="link">vai</a>', failureSummary: null },
  ],
};

test('normalizzaViolazioni aggancia la scheda italiana', () => {
  const [v] = normalizzaViolazioni([violazioneAxe]);
  assert.equal(v.occorrenze, 2);
  assert.equal(v.priorita, 2);
  assert.equal(v.criteri[0].codice, '1.4.3');
  assert.equal(v.criteri[0].titolo, 'Contrasto (minimo)');
  assert.equal(v.esempi[0].selettore, 'p.intro');
});

test('normalizzaViolazioni regge input malformati', () => {
  assert.deepEqual(normalizzaViolazioni([]), []);
  assert.deepEqual(normalizzaViolazioni(), []);
  const [v] = normalizzaViolazioni([{ id: 'x', tags: [], nodes: undefined }]);
  assert.equal(v.occorrenze, 0);
});

test('troncaHtml accorcia e normalizza gli spazi', () => {
  assert.equal(troncaHtml('<p>  a\n  b </p>'), '<p> a b </p>');
  assert.equal(troncaHtml('x'.repeat(300)).length, 221);
  assert.equal(troncaHtml(null), '');
});

const pagine = [
  {
    url: 'https://a.it',
    errore: null,
    violazioni: [
      ...normalizzaViolazioni([violazioneAxe]),
      ...normalizzaViolazioni([
        { id: 'button-name', help: 'Buttons must have discernible text', tags: ['wcag2a', 'wcag412'], nodes: [{ target: ['button'], html: '<button></button>' }] },
      ]),
    ],
  },
  { url: 'https://a.it/b', errore: null, violazioni: normalizzaViolazioni([violazioneAxe]) },
  { url: 'https://a.it/c', errore: 'net::ERR_NAME_NOT_RESOLVED', violazioni: [] },
];

test('riepiloga aggrega, conta e ordina', () => {
  const r = riepiloga(pagine);
  assert.equal(r.pagineScansionate, 3);
  assert.equal(r.pagineInErrore, 1);
  assert.equal(r.problemiDistinti, 2);
  assert.equal(r.occorrenzeTotali, 5);
  assert.equal(r.bloccanti, 1);
  assert.equal(r.problemi[0].regola, 'button-name', 'il bloccante deve venire per primo');
  assert.equal(r.problemi.find((p) => p.regola === 'color-contrast').pagine.length, 2);
});

test('riepiloga regge una lista vuota', () => {
  const r = riepiloga([]);
  assert.equal(r.problemiDistinti, 0);
  assert.equal(r.bloccanti, 0);
});

console.log('\nReport');

const esito = { dataScansione: new Date().toISOString(), pagine, riepilogo: riepiloga(pagine) };

test('il report dice impatto, correzione, esempi e pagine', () => {
  const md = reportMarkdown(esito, { sito: 'https://a.it' });
  assert.match(md, /Chi viene escluso/);
  assert.match(md, /Come si corregge/);
  assert.match(md, /Dove si trova/);
  assert.match(md, /<button><\/button>/);
});

test('il report è in italiano anche nei titoli', () => {
  const md = reportMarkdown(esito, { sito: 'https://a.it' });
  assert.match(md, /Contrasto insufficiente tra testo e sfondo/);
  assert.doesNotMatch(md, /Elements must have sufficient/);
});

test('il report nega esplicitamente di attestare la conformità', () => {
  const md = reportMarkdown(esito, { sito: 'https://a.it' });
  assert.match(md, /non attesta la conformità/);
  assert.match(md, /Verifiche manuali da fare/);
});

test('il report segnala le pagine non raggiunte', () => {
  const md = reportMarkdown(esito, { sito: 'https://a.it' });
  assert.match(md, /Pagine non raggiunte/);
  assert.match(md, /ERR_NAME_NOT_RESOLVED/);
  assert.match(md, /il risultato è incompleto/);
});

test('il report espone entrambi i regimi normativi', () => {
  const md = reportMarkdown(esito, { sito: 'https://a.it' });
  assert.match(md, /Legge Stanca/);
  assert.match(md, /European Accessibility Act/);
  assert.match(md, /form\.agid\.gov\.it/);
});

test('un report senza violazioni avverte comunque', () => {
  const vuoto = { dataScansione: new Date().toISOString(), pagine: [], riepilogo: riepiloga([]) };
  const md = reportMarkdown(vuoto, { sito: 'https://x.it' });
  assert.match(md, /Nessun problema rilevato dai controlli automatici/);
  assert.match(md, /non attesta la conformità/);
});

test('il JSON è valido e completo', () => {
  const j = JSON.parse(reportJson(esito));
  assert.equal(j.riepilogo.problemiDistinti, 2);
  assert.ok(j.dataScansione);
});

console.log('\nScheda per la dichiarazione');

test('la scheda non si presenta come una dichiarazione valida', () => {
  const d = schedaPreparatoria(esito, { sito: 'https://a.it' });
  assert.match(d, /NON è una dichiarazione di accessibilità/);
  assert.match(d, /Scheda preparatoria/);
});

test('la scheda indica che per la Legge Stanca vale solo il form AgID', () => {
  const d = schedaPreparatoria(esito, { sito: 'https://a.it' });
  assert.match(d, /form\.agid\.gov\.it/);
  assert.match(d, /nient'altro vale|non soddisfa il requisito/);
});

test('la scheda distingue i due regimi', () => {
  const d = schedaPreparatoria(esito, { sito: 'https://a.it' });
  assert.match(d, /500 milioni/);
  assert.match(d, /microimprese/);
  assert.match(d, /23 settembre/);
});

test('statoSuggerito riflette la gravità', () => {
  assert.equal(statoSuggerito({ bloccanti: 1, problemiDistinti: 3 }), 'non conforme');
  assert.equal(statoSuggerito({ bloccanti: 0, problemiDistinti: 2 }), 'parzialmente conforme');
  assert.match(statoSuggerito({ bloccanti: 0, problemiDistinti: 0 }), /non determinabile/);
});

test('la scheda non invita a dichiarare la conformità senza verifiche', () => {
  const pulito = { dataScansione: new Date().toISOString(), pagine: [], riepilogo: riepiloga([]) };
  const d = schedaPreparatoria(pulito, { sito: 'https://x.it' });
  assert.match(d, /non determinabile senza le verifiche manuali/);
  assert.match(d, /espone a responsabilità/);
});

console.log('\nPagine non valide e casi incerti');

test('riepiloga conta le pagine sospette', () => {
  // Nasce da un caso reale: agid.gov.it ha risposto con una pagina di errore
  // CloudFront e il report le ha addebitato un lang mancante che non era suo.
  const r = riepiloga([
    { url: 'https://a.it', errore: null, violazioni: [], sospetto: null },
    { url: 'https://b.it', errore: null, violazioni: [], sospetto: 'il titolo è quello di una pagina di errore' },
  ]);
  assert.equal(r.pagineSospette, 1);
});

test('riepiloga aggrega i casi che axe non ha deciso', () => {
  const incerti = normalizzaViolazioni([
    { id: 'color-contrast', help: 'x', tags: ['wcag2aa', 'wcag143'],
      nodes: [{ target: ['.hero'], html: '<div class="hero">' }] },
  ]);
  const r = riepiloga([
    { url: 'https://a.it', errore: null, violazioni: [], daVerificare: incerti },
    { url: 'https://b.it', errore: null, violazioni: [], daVerificare: incerti },
  ]);
  assert.equal(r.daVerificare.length, 1);
  assert.equal(r.occorrenzeDaVerificare, 2);
  assert.equal(r.daVerificare[0].pagine.length, 2);
  // Non devono contare come violazioni accertate.
  assert.equal(r.problemiDistinti, 0);
  assert.equal(r.bloccanti, 0);
});

test('il report avverte sulle pagine sospette e invita a ignorarle', () => {
  const pagineSosp = [
    { url: 'https://agid.gov.it/', errore: null, violazioni: [],
      sospetto: 'il titolo è quello di una pagina di errore',
      titolo: 'ERROR: The request could not be satisfied' },
  ];
  const md = reportMarkdown({
    dataScansione: new Date().toISOString(),
    pagine: pagineSosp,
    riepilogo: riepiloga(pagineSosp),
  }, { sito: 'https://agid.gov.it/' });
  assert.match(md, /potrebbero non essere quelle giuste/);
  assert.match(md, /vanno ignorati/);
  assert.match(md, /ERROR: The request could not be satisfied/);
});

test('il report mostra i casi incerti senza spacciarli per violazioni', () => {
  const incerti = normalizzaViolazioni([
    { id: 'color-contrast', help: 'x', tags: ['wcag2aa', 'wcag143'],
      nodes: [{ target: ['.hero'], html: '<div class="hero">testo</div>' }] },
  ]);
  const pg = [{ url: 'https://a.it', errore: null, violazioni: [], daVerificare: incerti }];
  const md = reportMarkdown({
    dataScansione: new Date().toISOString(), pagine: pg, riepilogo: riepiloga(pg),
  }, { sito: 'https://a.it' });
  assert.match(md, /non ha saputo decidere/);
  assert.match(md, /Non sono violazioni accertate/);
  // La sintesi non deve conteggiarli tra i problemi.
  assert.match(md, /\| Problemi distinti rilevati \| 0 \|/);
});

console.log('\nIndipendenza dal browser');

test('nessun modulo sotto test tira dentro Playwright', () => {
  // Questo test nasce da un difetto reale: i test importavano cli.js, che
  // importa lo scanner, che importa Playwright. Risultato: senza npm install
  // fallivano tutti, pur non avendo bisogno di un browser.
  // Solo scan.js e cli.js possono dipendere dal browser.
  const consentiti = new Set(['scan.js', 'cli.js']);
  for (const file of fs.readdirSync(new URL('../src/', import.meta.url))) {
    if (!file.endsWith('.js') || consentiti.has(file)) continue;
    const testo = fs.readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(testo, /from\s+'(playwright|@axe-core\/playwright)'/,
      `${file} importa il browser: spostane la logica pura in un modulo a sé`);
  }
});

test('urlDaTesto legge un elenco e separa gli scarti', () => {
  const { urls, scartati } = urlDaTesto('esempio.it\n# commento\n\nnon-una-url\nhttps://altro.it/x');
  assert.deepEqual(urls, ['https://esempio.it/', 'https://altro.it/x']);
  assert.deepEqual(scartati, ['non-una-url']);
});

console.log('\nCLI');

test('normalizzaUrl aggiunge lo schema mancante', () => {
  assert.equal(normalizzaUrl('esempio.it'), 'https://esempio.it/');
  assert.equal(normalizzaUrl('www.esempio.it/pagina'), 'https://www.esempio.it/pagina');
  assert.equal(normalizzaUrl('http://esempio.it'), 'http://esempio.it/');
});

test('normalizzaUrl usa http per gli indirizzi locali', () => {
  assert.equal(normalizzaUrl('localhost:3000'), 'http://localhost:3000/');
  assert.equal(normalizzaUrl('127.0.0.1:8080/x'), 'http://127.0.0.1:8080/x');
});

test('normalizzaUrl scarta quello che non è una URL', () => {
  assert.equal(normalizzaUrl('pippo'), null);
  assert.equal(normalizzaUrl(''), null);
  assert.equal(normalizzaUrl('   '), null);
  assert.equal(normalizzaUrl('ftp://esempio.it'), null);
});

test('parseArgs legge opzioni e URL', () => {
  const o = parseArgs(['esempio.it', '--json', '--out', 'cartella']);
  assert.deepEqual(o.urls, ['https://esempio.it/']);
  assert.equal(o.json, true);
  assert.equal(o.out, 'cartella');
});

test('parseArgs segnala le opzioni sbagliate', () => {
  assert.throws(() => parseArgs(['--out']), /richiede il nome di una cartella/);
  assert.throws(() => parseArgs(['--out', '--json']), /richiede il nome di una cartella/);
  assert.throws(() => parseArgs(['--boh']), /Opzione sconosciuta/);
});

test('parseArgs raccoglie gli scartati invece di ignorarli', () => {
  const o = parseArgs(['esempio.it', 'non-una-url']);
  assert.deepEqual(o.urls, ['https://esempio.it/']);
  assert.deepEqual(o.scartati, ['non-una-url']);
});

console.log(`\n${passati} test superati${process.exitCode ? ' — CI SONO ERRORI' : ''}\n`);
