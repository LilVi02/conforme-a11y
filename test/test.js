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
import {
  riepiloga,
  normalizzaViolazioni,
  troncaHtml,
  percorsoUtilizzabile,
  separaIncerte,
  REGOLE_DA_VALUTARE,
  fondiOrigini,
} from '../src/aggrega.js';
import { reportMarkdown, reportJson, smentisciVerifica } from '../src/report.js';
import { schedaPreparatoria, statoSuggerito } from '../src/dichiarazione.js';
import { VERIFICHE_MANUALI, notaCopertura, criteriCopertiDaVerifiche, criteriScoperti } from '../src/manuale.js';
import { normalizzaUrl, parseArgs, urlDaTesto, cartellaPerSito } from '../src/argomenti.js';
import { plurale, conArticolo } from '../src/testo.js';
import {
  riconosciComponente,
  attribuisciNodo,
  riassumiOrigine,
  origineDi,
  COMPONENTI_NOTI,
} from '../src/origine.js';
import { descriviProvenienza } from '../src/report.js';

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

test('le motivazioni della scheda sono quelle del modello AgID', () => {
  // La versione precedente offriva "contenuto di terzi" come terza casella da
  // spuntare. Non è una categoria del modello, ed è un invito all'abuso:
  // l'esclusione dei contenuti di terzi è un caso particolare della lettera c)
  // e vale solo a tre condizioni cumulative.
  const d = schedaPreparatoria(esito, { sito: 'https://a.it' });
  assert.match(d, /a\) inosservanza della normativa/);
  assert.match(d, /b\) onere sproporzionato/);
  assert.match(d, /c\) contenuto non rientrante nell'ambito di applicazione/);
  assert.doesNotMatch(d, /\[ \] contenuto di terzi/);
});

test('la scheda cita i numeri veri della copertura, non un "4 su 50" scritto a mano', () => {
  const d = schedaPreparatoria(esito, { sito: 'https://a.it' });
  assert.match(d, new RegExp(`Dei ${COPERTURA.totale} criteri`));
  assert.match(d, new RegExp(`verificano pienamente ${COPERTURA.automatici}`));
  assert.match(d, new RegExp(`restanti ${COPERTURA.manuali}`));
});

test('la scheda riporta i riferimenti normativi di entrambi i regimi', () => {
  const d = schedaPreparatoria(esito, { sito: 'https://a.it' });
  assert.match(d, /2016\/2102/);
  assert.match(d, /Linee Guida.*servizi.*2026/i);
});

test('la scheda descrive le prove eseguite, non genericamente "analisi automatica"', () => {
  // È la sezione che documenta la diligenza: elencare solo axe nasconderebbe
  // metà del lavoro svolto, e in caso di controllo conta quello che si è
  // fatto, non quello che si è scritto di aver fatto.
  const pg = [{ url: 'https://a.it', errore: null, violazioni: [], superati: 20,
    tastiera: { percorsoCompleto: true, elementiRaggiunti: 30, focusControllati: 25, trappolaTrovata: false, skipLink: true },
    reflow: { scorrimentoA320: 0, tagliatiDallaSpaziatura: 0 } }];
  const d = schedaPreparatoria(
    { dataScansione: new Date().toISOString(), pagine: pg, riepilogo: riepiloga(pg) },
    { sito: 'https://a.it' }
  );
  assert.match(d, /axe-core/);
  assert.match(d, /premendo Tab/);
  assert.match(d, /320 px/);
  assert.match(d, /ascoltatori di eventi/);
});

test('nella scheda l\'origine esterna non diventa una motivazione di esclusione', () => {
  const [v] = normalizzaViolazioni([
    { id: 'link-name', tags: ['wcag2a', 'wcag244'], nodes: [{ target: ['#onetrust-a'], html: '<a>' }] },
  ]);
  v.origine = riassumiOrigine([
    { origine: 'terza-parte', certezza: 'probabile', componente: 'OneTrust', tipo: 'gestore del consenso ai cookie' },
  ]);
  const pg = [{ url: 'https://a.it', errore: null, violazioni: [v], superati: 20 }];
  const d = schedaPreparatoria(
    { dataScansione: new Date().toISOString(), pagine: pg, riepilogo: riepiloga(pg) },
    { sito: 'https://a.it' }
  );
  assert.match(d, /Origine:.*OneTrust/);
  assert.match(d, /Non basta a invocare la lettera c\)/);
  assert.match(d, /Componenti di terze parti rilevati/);
  assert.match(d, /Non è una motivazione di esclusione/);
  assert.match(d, /né finanziati, né sviluppati, né sottoposti al controllo/);
});

test('la scheda non scrive mai "1 occorrenze"', () => {
  const [v] = normalizzaViolazioni([
    { id: 'link-name', tags: ['wcag2a', 'wcag244'], nodes: [{ target: ['#a'], html: '<a>' }, { target: ['#b'], html: '<a>' }] },
  ]);
  v.origine = riassumiOrigine([
    { origine: 'terza-parte', certezza: 'probabile', componente: 'OneTrust', tipo: 'x' },
    { origine: 'sito' },
  ]);
  const pg = [{ url: 'https://a.it', errore: null, violazioni: [v], superati: 20 }];
  const d = schedaPreparatoria(
    { dataScansione: new Date().toISOString(), pagine: pg, riepilogo: riepiloga(pg) },
    { sito: 'https://a.it' }
  );
  assert.match(d, /1 occorrenza su 2/);
  assert.doesNotMatch(d, /\b1 (occorrenze|segnalazioni|pagine)\b/);
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

test('il riepilogo espone i controlli superati come prova di scansione', () => {
  const r = riepiloga([
    { url:'https://w3.org', errore:null, violazioni:[], superati:29 },
    { url:'https://mdn.org', errore:null, violazioni:[], superati:24 },
  ]);
  assert.equal(r.controlliSuperati, 53);
  assert.equal(r.controlliSuperatiMin, 24);
});

test('un report senza violazioni mostra la prova che la scansione è avvenuta', () => {
  // Senza questo dato, "sito pulito" e "pagina mai caricata" si leggono
  // allo stesso modo: entrambi danno zero violazioni.
  const pg = [{ url:'https://www.w3.org/', errore:null, violazioni:[], superati:29 }];
  const md = reportMarkdown({
    dataScansione:new Date().toISOString(), pagine:pg, riepilogo:riepiloga(pg),
  }, { sito:'https://www.w3.org/' });
  assert.match(md, /Prova che la scansione è avvenuta/);
  assert.match(md, /29 controlli superati/);
  assert.match(md, /inattendibile/);
});

console.log('\nProva da tastiera');

test('le regole della tastiera hanno descrizione e correzione', () => {
  for (const r of ['tastiera-trappola','tastiera-irraggiungibile','tastiera-focus-invisibile','tastiera-senza-salto-blocchi']) {
    assert.ok(REGOLE[r], r + ' non è definita');
    assert.ok(REGOLE[r].correzione.length > 60, r + ': correzione troppo vaga');
  }
});

test('le violazioni da tastiera si agganciano ai criteri WCAG giusti', () => {
  // Le produce tastiera.js con la forma di axe, così attraversano la stessa
  // pipeline: se i tag fossero sbagliati finirebbero senza criterio.
  const casi = [
    { id:'tastiera-irraggiungibile', tags:['wcag2a','wcag211'], atteso:'2.1.1' },
    { id:'tastiera-trappola',        tags:['wcag2a','wcag212'], atteso:'2.1.2' },
    { id:'tastiera-focus-invisibile',tags:['wcag2aa','wcag247'], atteso:'2.4.7' },
    { id:'tastiera-senza-salto-blocchi', tags:['wcag2a','wcag241'], atteso:'2.4.1' },
  ];
  for (const c of casi) {
    const [v] = normalizzaViolazioni([{ id:c.id, help:'x', tags:c.tags, nodes:[{target:['x'],html:'<x>'}] }]);
    assert.equal(v.criteri[0].codice, c.atteso, c.id + ' mappa sul criterio sbagliato');
    assert.ok(v.criteri[0].titolo, c.id + ' non trova la scheda del criterio');
  }
});

test('i criteri sulla tastiera non sono più dichiarati non verificabili', () => {
  // La prova da tastiera li sposta da 'no' a 'parziale': non a 'si', perché
  // osserva fatti meccanici e non l'usabilità.
  for (const c of ['2.1.1','2.1.2','2.4.3','2.4.7','2.4.1']) {
    assert.notEqual(CRITERI[c].auto, 'no', c + ' dovrebbe essere almeno parziale');
    assert.notEqual(CRITERI[c].auto, 'si', c + ' non può essere pienamente automatico');
  }
});

test('il riepilogo espone le statistiche della prova da tastiera', () => {
  const r = riepiloga([
    { url:'https://a.it', errore:null, violazioni:[], superati:20,
      tastiera:{ elementiAttesi:21, elementiRaggiunti:20, focusControllati:20, trappolaTrovata:false, percorsoCompleto:true, skipLink:true } },
  ]);
  assert.equal(r.tastiera.elementiPercorsi, 20);
  assert.equal(r.tastiera.trappole, 0);
  assert.equal(r.tastiera.conSkipLink, 1);
});

test('il report racconta la prova da tastiera e ne dichiara i limiti', () => {
  const pg = [{ url:'https://a.it', errore:null, violazioni:[], superati:20,
    tastiera:{ elementiAttesi:21, elementiRaggiunti:20, focusControllati:20, trappolaTrovata:false, percorsoCompleto:true, skipLink:true } }];
  const md = reportMarkdown({ dataScansione:new Date().toISOString(), pagine:pg, riepilogo:riepiloga(pg) }, { sito:'https://a.it' });
  assert.match(md, /Prova da tastiera/);
  assert.match(md, /20 elementi raggiunti/);
  assert.match(md, /non l'usabilità/);
});

test('un percorso fermatosi in un contenitore non accusa nessuno', () => {
  // Il caso che ha rivelato il difetto, due volte. Su comune.milano.it il
  // banner dei cookie interrompeva il percorso dopo 4 elementi: prima il
  // report dichiarava irraggiungibili 10 elementi fra cui un link "salta al
  // contenuto" funzionante, poi dichiarava il banner una barriera bloccante
  // del 2.1.2 — e anche quello era falso, verificato a mano.
  //
  // Conforme non ha più alcuna regola che accerti il confinamento del focus:
  // non sa distinguerlo dalla propria interferenza, e una regola che sbaglia
  // due volte sullo stesso sito reale non va tarata, va tolta.
  assert.ok(!REGOLE['tastiera-focus-confinato'], 'la regola accertativa è tornata');

  const [v] = normalizzaViolazioni([
    { id:'tastiera-percorso-interrotto', help:'x', tags:['wcag2a','wcag211','wcag212'], nodes:[{target:['div#banner'],html:'<div>'}] },
  ]);
  assert.deepEqual(v.criteri.map((c) => c.codice).sort(), ['2.1.1', '2.1.2']);
  assert.ok(REGOLE_DA_VALUTARE.has('tastiera-percorso-interrotto'), 'deve restare fra le cose da guardare');

  // La spiegazione deve dire come verificarlo, non lasciarlo in sospeso.
  assert.match(REGOLE['tastiera-percorso-interrotto'].correzione, /finestra anonima/);
  assert.match(REGOLE['tastiera-percorso-interrotto'].correzione, /2\.1\.2/);
});

test('il riepilogo distingue i percorsi completi da quelli interrotti', () => {
  const r = riepiloga([
    { url:'https://a.it', errore:null, violazioni:[], superati:20,
      tastiera:{ percorsoCompleto:false, confinato:true, elementiRaggiunti:4, focusControllati:4, trappolaTrovata:false, skipLink:false } },
    { url:'https://b.it', errore:null, violazioni:[], superati:20,
      tastiera:{ percorsoCompleto:true, confinato:false, elementiRaggiunti:30, focusControllati:25, trappolaTrovata:false, skipLink:true } },
  ]);
  assert.equal(r.tastiera.percorsiFermatiInUnContenitore, 1);
  assert.equal(r.tastiera.percorsiCompleti, 1);
});

test('il riepilogo non dichiara mai un focus "rimasto chiuso"', () => {
  // È la formulazione che asseriva la barriera. Conforme riferisce dove il
  // percorso si è fermato, e si ferma lì.
  const pg = [
    { url:'https://a.it', errore:null, violazioni:[], superati:20,
      tastiera:{ percorsoCompleto:false, confinato:true, confinamentoConUscita:false, elementiRaggiunti:4, focusControllati:4, trappolaTrovata:false, skipLink:false } },
  ];
  const r = riepiloga(pg);
  assert.equal(r.tastiera.percorsiFermatiInUnContenitore, 1);
  assert.equal(r.tastiera.confinate, undefined, 'il conteggio accertativo è tornato');

  const md = reportMarkdown({ dataScansione:new Date().toISOString(), pagine:pg, riepilogo:r }, { sito:'https://a.it' });
  assert.doesNotMatch(md, /focus è rimasto chiuso/);
  assert.match(md, /percorso si è fermato dentro un contenitore/);
});

test('la checklist non chiede di rifare ciò che è già stato verificato', () => {
  const v = VERIFICHE_MANUALI.find((x) => x.id === 'tastiera');
  assert.match(v.come, /ha già percorso la pagina/);
  assert.match(v.come, /si vede davvero/);
});

console.log('\nReflow e spaziatura');

test('le regole di reflow hanno descrizione e correzione', () => {
  for (const r of ['reflow-scorrimento-orizzontale','reflow-da-valutare','spaziatura-testo-tagliato']) {
    assert.ok(REGOLE[r], r + ' non è definita');
    assert.ok(REGOLE[r].correzione.length > 60, r + ': correzione troppo vaga');
  }
});

test('le violazioni di reflow si agganciano ai criteri giusti', () => {
  const casi = [
    { id:'reflow-scorrimento-orizzontale', tags:['wcag21aa','wcag1410'], atteso:'1.4.10' },
    { id:'spaziatura-testo-tagliato',      tags:['wcag21aa','wcag1412'], atteso:'1.4.12' },
  ];
  for (const c of casi) {
    const [v] = normalizzaViolazioni([{ id:c.id, help:'x', tags:c.tags, nodes:[{target:['x'],html:'<x>'}] }]);
    assert.equal(v.criteri[0].codice, c.atteso, c.id + ' mappa sul criterio sbagliato');
    assert.ok(v.criteri[0].titolo);
  }
});

test('reflow e spaziatura non sono più dichiarati non verificabili', () => {
  assert.equal(CRITERI['1.4.10'].auto, 'parziale');
  assert.equal(CRITERI['1.4.12'].auto, 'parziale');
});

test('il ridimensionamento del testo è ora verificato', () => {
  // Il criterio riguarda l'ingrandimento del SOLO testo, diverso dallo zoom
  // della pagina: si prova portando html a font-size 200% e guardando cosa
  // viene tagliato. Resta 'parziale' perché il taglio si misura, ma non si
  // può giudicare se il risultato sia ancora leggibile.
  assert.equal(CRITERI['1.4.4'].auto, 'parziale');
});

test('il riepilogo espone le statistiche di reflow', () => {
  const r = riepiloga([
    { url:'https://a.it', errore:null, violazioni:[], superati:20,
      reflow:{ scorrimentoA320: 604, elementiSbordanti: 2, tagliatiDallaSpaziatura: 1 } },
    { url:'https://b.it', errore:null, violazioni:[], superati:20,
      reflow:{ scorrimentoA320: 0, elementiSbordanti: 0, tagliatiDallaSpaziatura: 0 } },
  ]);
  assert.equal(r.reflow.pagine, 2);
  assert.equal(r.reflow.conScorrimento, 1);
  assert.equal(r.reflow.scorrimentoMax, 604);
  assert.equal(r.reflow.tagliatiDallaSpaziatura, 1);
});

test('il report racconta la prova di reflow e ne dichiara i limiti', () => {
  const pg = [{ url:'https://a.it', errore:null, violazioni:[], superati:20,
    reflow:{ scorrimentoA320: 604, elementiSbordanti: 2, tagliatiDallaSpaziatura: 1 } }];
  const md = reportMarkdown({ dataScansione:new Date().toISOString(), pagine:pg, riepilogo:riepiloga(pg) }, { sito:'https://a.it' });
  assert.match(md, /Prova di reflow/);
  assert.match(md, /320 px/);
  assert.match(md, /604 px/);
  assert.match(md, /menu che copre il contenuto/);
});

test('la checklist dello zoom non chiede di rifare le misure', () => {
  const v = VERIFICHE_MANUALI.find((x) => x.id === 'zoom-reflow');
  assert.match(v.come, /ha già ridotto la finestra/);
  assert.match(v.come, /ancora comprensibile/);
});

console.log('\nControlli su media, interazione e struttura');

test('tutte le nuove regole hanno descrizione e correzione', () => {
  const nuove = [
    'media-autoplay-sonoro','media-senza-alternative',
    'movimento-senza-pausa','orientamento-bloccato','azionamento-da-movimento',
    'scorciatoie-da-verificare','azione-alla-pressione','gesti-senza-alternativa',
    'cambio-contesto-al-focus','cambio-contesto-all-input','ordine-lettura-diverso',
    'poche-vie-di-navigazione','testo-ingrandito-tagliato',
  ];
  for (const r of nuove) {
    assert.ok(REGOLE[r], r + ' non è definita');
    assert.ok(REGOLE[r].correzione.length > 80, r + ': correzione troppo vaga');
  }
});

test('nessuna regola propria è documentata senza essere mai prodotta', () => {
  // Una voce in regole-it.js che nessun controllo emette è una promessa
  // falsa: dice che Conforme verifica qualcosa che non verifica. È successo
  // con il ricaricamento automatico, lasciato documentato dopo che il
  // controllo era stato tolto perché axe lo fa già con meta-refresh.
  const sorgenti = fs
    .readdirSync(new URL('../src/', import.meta.url))
    .filter((f) => f.endsWith('.js') && f !== 'regole-it.js')
    .map((f) => fs.readFileSync(new URL('../src/' + f, import.meta.url), 'utf8'))
    .join('\n');
  const proprie = Object.keys(REGOLE).filter((r) =>
    /^(tastiera|reflow|media|movimento|orientamento|azionamento|scorciatoie|azione|gesti|cambio|ordine|poche|spaziatura|testo-|tempo)/.test(r)
  );
  for (const r of proprie) {
    assert.ok(sorgenti.includes(`id: '${r}'`), `${r} è documentata ma nessun controllo la produce`);
  }
});

test('ogni nuova regola si aggancia al criterio WCAG corretto', () => {
  const attesi = {
    'media-autoplay-sonoro': ['wcag142', '1.4.2'],
    'media-senza-alternative': ['wcag121', '1.2.1'],
    'movimento-senza-pausa': ['wcag222', '2.2.2'],
    'orientamento-bloccato': ['wcag134', '1.3.4'],
    'azionamento-da-movimento': ['wcag254', '2.5.4'],
    'scorciatoie-da-verificare': ['wcag214', '2.1.4'],
    'azione-alla-pressione': ['wcag252', '2.5.2'],
    'gesti-senza-alternativa': ['wcag251', '2.5.1'],
    'cambio-contesto-al-focus': ['wcag321', '3.2.1'],
    'cambio-contesto-all-input': ['wcag322', '3.2.2'],
    'ordine-lettura-diverso': ['wcag132', '1.3.2'],
    'poche-vie-di-navigazione': ['wcag245', '2.4.5'],
    'testo-ingrandito-tagliato': ['wcag144', '1.4.4'],
  };
  for (const [regola, [tag, criterio]] of Object.entries(attesi)) {
    const [v] = normalizzaViolazioni([{ id: regola, help: 'x', tags: ['wcag2a', tag], nodes: [{ target: ['x'], html: '<x>' }] }]);
    assert.equal(v.criteri[0]?.codice, criterio, regola + ' mappa sul criterio sbagliato');
    assert.ok(v.criteri[0]?.titolo, regola + ' non trova la scheda del criterio');
  }
});

test('i criteri ora provati non sono più dichiarati non verificabili', () => {
  for (const c of ['1.2.1','1.3.2','1.3.4','1.4.2','1.4.4','2.1.4','2.2.1','2.2.2','2.4.5','2.5.1','2.5.2','2.5.4','3.2.1','3.2.2']) {
    assert.equal(CRITERI[c].auto, 'parziale', c + ' dovrebbe essere parziale');
  }
});

test('restano dichiarati non verificabili solo quelli che lo sono davvero', () => {
  // Qualità delle audiodescrizioni, linguaggio, testo dentro le immagini,
  // lampeggio, coerenza fra pagine, giudizio sui messaggi di errore.
  const nonVerificabili = CODICI.filter((c) => CRITERI[c].auto === 'no');
  for (const c of ['1.2.3','1.2.4','1.2.5','1.3.3','1.4.5','2.3.1','3.3.1','3.3.3','3.3.4']) {
    assert.ok(nonVerificabili.includes(c), c + ' non può essere dichiarato verificato');
  }
});

console.log('\nIndipendenza dal browser');

test('nessun modulo sotto test tira dentro Playwright', () => {
  // Questo test nasce da un difetto reale: i test importavano cli.js, che
  // importa lo scanner, che importa Playwright. Risultato: senza npm install
  // fallivano tutti, pur non avendo bisogno di un browser.
  // Solo scan.js e cli.js possono dipendere dal browser.
  const consentiti = new Set(['scan.js', 'cli.js', 'tastiera.js', 'reflow.js', 'media.js', 'interazione.js', 'struttura.js', 'ascoltatori.js']);
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

test('la cartella prende il nome del sito', () => {
  // Cartelle tutte chiamate "report" si sovrascrivono a vicenda.
  assert.equal(cartellaPerSito('https://www.comune.milano.it/'), 'report_comune-milano-it');
  assert.equal(cartellaPerSito('esempio.it'), 'report_esempio-it');
  assert.equal(cartellaPerSito('https://sotto.dominio.gov.it/pagina'), 'report_sotto-dominio-gov-it');
  assert.equal(cartellaPerSito('localhost:3000'), 'report_localhost-3000');
});

test('cartellaPerSito regge input strani senza rompersi', () => {
  assert.equal(cartellaPerSito('non-una-url'), 'report');
  assert.equal(cartellaPerSito(''), 'report');
  assert.match(cartellaPerSito('file:///tmp/pagina-rotta.html'), /^report_/);
  // Niente caratteri che darebbero noie al filesystem.
  for (const v of ['https://a--b..c.it', 'https://WWW.MAIUSCOLO.IT']) {
    assert.match(cartellaPerSito(v), /^report_[a-z0-9-]+$/);
  }
});

test('parseArgs non impone una cartella predefinita', () => {
  // Deve restare null, così la CLI può ricavarla dal sito.
  assert.equal(parseArgs(['esempio.it']).out, null);
  assert.equal(parseArgs(['esempio.it', '--out', 'mia']).out, 'mia');
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

// ══════════════════════════════════════════ Prudenza della prova da tastiera

console.log('\nProva da tastiera: quando si può accusare e quando si deve tacere');

test('il caso comune.milano.it non produce più accuse', () => {
  // 4 elementi raggiunti su 118 presenti: il percorso si è fermato, e quello
  // che non ha toccato non può essere dichiarato irraggiungibile. È il difetto
  // che aveva fatto segnalare come assente un link "salta al contenuto".
  assert.equal(
    percorsoUtilizzabile({ attesi: 118, nonRaggiunti: 114, trappola: false, confinamento: false }),
    false
  );
});

test('qualche elemento non raggiunto su molti resta un risultato valido', () => {
  assert.equal(percorsoUtilizzabile({ attesi: 100, nonRaggiunti: 8 }), true);
  assert.equal(percorsoUtilizzabile({ attesi: 100, nonRaggiunti: 31 }), false);
});

test('su pagine piccole vale il minimo assoluto, non la percentuale', () => {
  // 2 su 4 è il 50%, ma sono due casi veri che vanno detti.
  assert.equal(percorsoUtilizzabile({ attesi: 4, nonRaggiunti: 2 }), true);
  assert.equal(percorsoUtilizzabile({ attesi: 4, nonRaggiunti: 4 }), false);
});

test('una trappola o un confinamento annullano il percorso comunque', () => {
  assert.equal(percorsoUtilizzabile({ attesi: 100, nonRaggiunti: 1, trappola: true }), false);
  assert.equal(percorsoUtilizzabile({ attesi: 100, nonRaggiunti: 1, confinamento: true }), false);
});

test('senza elementi attesi non si conclude nulla', () => {
  assert.equal(percorsoUtilizzabile({ attesi: 0, nonRaggiunti: 0 }), false);
});

test('un percorso interrotto non finisce fra i problemi accertati', () => {
  const { accertate, incerte } = separaIncerte([
    { regola: 'tastiera-percorso-interrotto' },
    { regola: 'tastiera-non-focalizzabile' },
  ]);
  assert.deepEqual(incerte.map((v) => v.regola), ['tastiera-percorso-interrotto']);
  assert.deepEqual(accertate.map((v) => v.regola), ['tastiera-non-focalizzabile']);
  assert.ok(REGOLE_DA_VALUTARE.has('tastiera-percorso-interrotto'));
});

test('ogni regola propria dello scanner ha una spiegazione e una correzione', () => {
  const proprie = Object.keys(REGOLE).filter((r) => /^(tastiera|reflow|media|movimento|orientamento|azionamento|scorciatoie|azione|gesti|cambio|ordine|poche)/.test(r));
  for (const r of proprie) {
    assert.ok(REGOLE[r].descrizione?.length > 10, `${r}: descrizione mancante`);
    assert.ok(REGOLE[r].correzione?.length > 40, `${r}: correzione troppo scarna`);
  }
  for (const r of ['tastiera-non-focalizzabile', 'tastiera-percorso-interrotto']) {
    assert.ok(REGOLE[r], `${r} non è documentata in regole-it.js`);
  }
});

test('lo stesso elemento segnalato due volte conta una sola occorrenza', () => {
  // Capitava ai controlli basati sugli ascoltatori: un contenitore che
  // ascolta sia touchmove sia pointermove finiva nell'elenco due volte.
  const [v] = normalizzaViolazioni([
    {
      id: 'gesti-senza-alternativa',
      tags: ['wcag21a', 'wcag251'],
      nodes: [
        { target: ['div#tooltipContainer'], html: '<div id="tooltipContainer"></div>' },
        { target: ['div#tooltipContainer'], html: '<div id="tooltipContainer"></div>' },
        { target: ['div#altro'], html: '<div id="altro"></div>' },
      ],
    },
  ]);
  assert.equal(v.occorrenze, 2);
  assert.equal(v.esempi.length, 2);
});

test('il link di salto non si conta dove il percorso non è arrivato in fondo', () => {
  const r = riepiloga([
    { url: 'a', violazioni: [], superati: 30, tastiera: { elementiRaggiunti: 4, focusControllati: 4, trappolaTrovata: false, confinato: true, percorsoCompleto: false, skipLink: false } },
    { url: 'b', violazioni: [], superati: 30, tastiera: { elementiRaggiunti: 40, focusControllati: 25, trappolaTrovata: false, confinato: false, percorsoCompleto: true, skipLink: true } },
  ]);
  assert.equal(r.tastiera.percorsiCompleti, 1);
  assert.equal(r.tastiera.conSkipLink, 1);
});

// ══════════════════════════════════════════ Da dove arriva il problema

console.log('\nAttribuzione: sito o componente di terze parti');

test('un documento servito da un altro dominio è attribuito con certezza', () => {
  const a = attribuisciNodo(
    { selettore: '#email', html: '<input id="email">', frameSrc: 'https://a0e0d4.emailsp.com/forms/x' },
    'https://www.comune.milano.it'
  );
  assert.equal(a.origine, 'terza-parte');
  assert.equal(a.certezza, 'certa');
  assert.match(a.motivo, /emailsp\.com/);
});

test('un iframe della stessa origine resta del sito', () => {
  const a = attribuisciNodo(
    { selettore: '#x', html: '<div id="x">', frameSrc: 'https://www.comune.milano.it/widget' },
    'https://www.comune.milano.it'
  );
  assert.equal(a.origine, 'sito');
});

test('i componenti noti si riconoscono dai nomi nel codice', () => {
  assert.equal(riconosciComponente('#onetrust-banner-sdk')?.nome, 'OneTrust');
  assert.equal(riconosciComponente('#onetrust-pc-sdk.ot-shw-fltr #ot-anchor')?.nome, 'OneTrust');
  assert.equal(riconosciComponente('', '<div class="iubenda-cs-container">')?.nome, 'Iubenda');
  assert.equal(riconosciComponente('#CybotCookiebotDialog')?.nome, 'Cookiebot');
  assert.equal(riconosciComponente('.grecaptcha-badge')?.nome, 'Google reCAPTCHA');
});

test('il riconoscimento è dichiarato come probabile, non come certo', () => {
  const a = attribuisciNodo({ selettore: '#onetrust-banner-sdk', html: '' }, 'https://x.it');
  assert.equal(a.origine, 'terza-parte');
  assert.equal(a.certezza, 'probabile');
});

test('gli indizi non colpiscono il codice di un sito qualsiasi', () => {
  // Il rischio dell'elenco è questo: un indizio troppo generico che assolve
  // il sito da problemi suoi. Questi selettori vengono da siti reali.
  const innocui = [
    '.navbar-nav',
    'div.card-text.font-sans-serif',
    '#main-content',
    '.footer-list.link-list.clearfix',
    'a.nav-link.dropdown-toggle',
    '#layout_223787 > .nav-link[role="menuitem"]',
    'button.btn.btn-primary',
    '.splide__track',
    '#tooltipContainer',
    'input[name="email"]',
    '.container > .row > .col-md-6',
    'header.it-header-wrapper',
  ];
  for (const s of innocui) {
    assert.equal(riconosciComponente(s), null, `attribuito a terzi per sbaglio: ${s}`);
  }
});

test('ogni componente dell\'elenco ha nome, tipo e almeno un indizio', () => {
  for (const c of COMPONENTI_NOTI) {
    assert.ok(c.nome?.length, 'componente senza nome');
    assert.ok(c.tipo?.length > 4, `${c.nome}: tipo mancante`);
    assert.ok(c.indizi?.length, `${c.nome}: nessun indizio`);
    for (const i of c.indizi) {
      assert.ok(i instanceof RegExp, `${c.nome}: indizio non è un'espressione regolare`);
      // Un indizio di due caratteri colpirebbe mezzo web.
      assert.ok(i.source.length > 4, `${c.nome}: indizio troppo corto, "${i.source}"`);
    }
  }
});

test('origineDi non esplode su indirizzi non validi', () => {
  assert.equal(origineDi('non-una-url'), null);
  assert.equal(origineDi(''), null);
  assert.equal(origineDi(undefined), null);
  assert.equal(origineDi('https://x.it/a/b'), 'https://x.it');
});

test('una regola tutta del sito non produce alcuna nota di provenienza', () => {
  const r = riassumiOrigine([{ origine: 'sito' }, { origine: 'sito' }]);
  assert.equal(r.tutteDalSito, true);
  assert.equal(descriviProvenienza(r), null);
});

test('una regola mista riporta i due numeri invece di scegliere', () => {
  const r = riassumiOrigine([
    { origine: 'terza-parte', certezza: 'probabile', componente: 'OneTrust', tipo: 'gestore del consenso ai cookie' },
    { origine: 'sito' },
    { origine: 'sito' },
  ]);
  assert.equal(r.daTerzi, 1);
  assert.equal(r.totale, 3);
  assert.equal(r.tutteDaTerzi, false);
  const testo = descriviProvenienza(r);
  assert.match(testo, /in parte/);
  assert.match(testo, /una occorrenza su 3/);

  // Il singolare non deve diventare "1 occorrenze": il report lo legge
  // qualcuno che paga per sistemare il sito, e la sciatteria si nota.
  const tre = riassumiOrigine([
    { origine: 'terza-parte', certezza: 'probabile', componente: 'OneTrust', tipo: 'x' },
    { origine: 'terza-parte', certezza: 'probabile', componente: 'OneTrust', tipo: 'x' },
    { origine: 'sito' },
  ]);
  assert.match(descriviProvenienza(tre), /2 occorrenze su 3/);
});

test('una regola tutta di terze parti dice che non si corregge nel sito', () => {
  const r = riassumiOrigine([
    { origine: 'terza-parte', certezza: 'certa', componente: 'OneTrust', tipo: 'gestore del consenso ai cookie' },
  ]);
  assert.equal(r.tutteDaTerzi, true);
  const testo = descriviProvenienza(r);
  assert.match(testo, /OneTrust/);
  assert.match(testo, /non si corregge modificando il sito/i);
});

test('fra due letture della stessa provenienza vince quella dimostrata', () => {
  const r = riassumiOrigine([
    { origine: 'terza-parte', certezza: 'probabile', componente: 'OneTrust', tipo: 'x' },
    { origine: 'terza-parte', certezza: 'certa', componente: 'OneTrust', tipo: 'x' },
  ]);
  assert.equal(r.componenti[0].certezza, 'certa');
  assert.equal(r.componenti[0].occorrenze, 2);
});

test('le origini della stessa regola su pagine diverse si sommano', () => {
  const a = riassumiOrigine([{ origine: 'terza-parte', certezza: 'probabile', componente: 'OneTrust', tipo: 'x' }]);
  const b = riassumiOrigine([
    { origine: 'terza-parte', certezza: 'certa', componente: 'OneTrust', tipo: 'x' },
    { origine: 'sito' },
  ]);
  const u = fondiOrigini(a, b);
  assert.equal(u.daTerzi, 2);
  assert.equal(u.totale, 3);
  assert.equal(u.tutteDaTerzi, false);
  assert.equal(u.componenti[0].occorrenze, 2);
  assert.equal(u.componenti[0].certezza, 'certa');
});

test('il percorso attraverso un iframe non diventa un selettore falso', () => {
  // `iframe[...] #email` sembra un selettore valido e non seleziona nulla:
  // quell'elemento vive in un altro documento.
  const [v] = normalizzaViolazioni([
    {
      id: 'label',
      tags: ['wcag2a', 'wcag412'],
      nodes: [{ target: ['.newsletter > iframe', '#email'], html: '<input id="email">' }],
    },
  ]);
  assert.equal(v.esempi[0].selettore, '#email');
  assert.deepEqual(v.esempi[0].dentroFrame, ['.newsletter > iframe']);
});

test('il report dice dentro quale iframe si trova l\'elemento', () => {
  const pg = [
    {
      url: 'https://a.it',
      errore: null,
      superati: 20,
      violazioni: normalizzaViolazioni([
        {
          id: 'label',
          tags: ['wcag2a', 'wcag412'],
          nodes: [{ target: ['.newsletter > iframe', '#email'], html: '<input id="email">' }],
        },
      ]),
    },
  ];
  const md = reportMarkdown(
    { dataScansione: new Date().toISOString(), pagine: pg, riepilogo: riepiloga(pg) },
    { sito: 'https://a.it' }
  );
  assert.match(md, /Dentro l'iframe/);
  assert.doesNotMatch(md, /iframe` #email|iframe #email/);
});

test('la sezione sui componenti esterni compare solo se ce ne sono', () => {
  const pulita = [{ url: 'https://a.it', errore: null, superati: 20, violazioni: [] }];
  const md = reportMarkdown(
    { dataScansione: new Date().toISOString(), pagine: pulita, riepilogo: riepiloga(pulita) },
    { sito: 'https://a.it' }
  );
  assert.doesNotMatch(md, /Quello che non è nel codice del sito/);
});

test('anche i casi da guardare dicono da dove arrivano', () => {
  // Senza questa riga la tabella dei componenti contava segnalazioni che il
  // lettore non riusciva a ritrovare nel report: su comune.milano.it ne
  // dichiarava quattro riconducibili a OneTrust e solo tre le indicavano.
  const incerte = normalizzaViolazioni([
    { id: 'color-contrast', tags: ['wcag2aa', 'wcag143'], nodes: [{ target: ['#onetrust-policy-text'], html: '<p id="onetrust-policy-text">' }] },
  ]);
  incerte[0].origine = riassumiOrigine([
    { origine: 'terza-parte', certezza: 'probabile', componente: 'OneTrust', tipo: 'gestore del consenso ai cookie' },
  ]);
  const pg = [{ url: 'https://a.it', errore: null, superati: 20, violazioni: [], daVerificare: incerte }];
  const md = reportMarkdown(
    { dataScansione: new Date().toISOString(), pagine: pg, riepilogo: riepiloga(pg) },
    { sito: 'https://a.it' }
  );
  const sezione = md.slice(md.indexOf('## Da guardare'));
  assert.match(sezione, /Da dove arriva:.*OneTrust/);

  // Fra i casi da guardare non è ancora detto che ci sia qualcosa da
  // correggere: la frase non deve darlo per assodato.
  assert.match(sezione, /Se c'è qualcosa da correggere/);
  assert.doesNotMatch(sezione, /\. Non si corregge modificando il sito/);
});

test('fra i problemi accertati la correzione si afferma, non si ipotizza', () => {
  const r = riassumiOrigine([
    { origine: 'terza-parte', certezza: 'certa', componente: 'OneTrust', tipo: 'x' },
  ]);
  assert.match(descriviProvenienza(r), /Non si corregge modificando il sito/);
  assert.match(descriviProvenienza(r, { accertato: false }), /Se c'è qualcosa da correggere/);
});

test('il conteggio in sintesi e la tabella dei componenti tornano', () => {
  const conOrigine = (id, tag, sel, html, componente) => {
    const [v] = normalizzaViolazioni([{ id, tags: tag, nodes: [{ target: [sel], html }] }]);
    v.origine = riassumiOrigine([
      { origine: 'terza-parte', certezza: 'probabile', componente, tipo: 'gestore del consenso ai cookie' },
    ]);
    return v;
  };
  const pg = [
    {
      url: 'https://a.it',
      errore: null,
      superati: 20,
      violazioni: [conOrigine('link-name', ['wcag2a', 'wcag244'], '#onetrust-a', '<a>', 'OneTrust')],
      daVerificare: [conOrigine('color-contrast', ['wcag2aa', 'wcag143'], '#onetrust-b', '<p>', 'OneTrust')],
    },
  ];
  const r = riepiloga(pg);
  assert.equal(r.problemiDaTerzi, 1);
  assert.equal(r.daVerificareDaTerzi, 1);
  // La tabella in fondo conta entrambe: il totale deve corrispondere.
  const totaleTabella = r.componentiEsterni.reduce((n, c) => n + c.regole, 0);
  assert.equal(totaleTabella, r.problemiDaTerzi + r.daVerificareDaTerzi);

  const md = reportMarkdown({ dataScansione: new Date().toISOString(), pagine: pg, riepilogo: r }, { sito: 'https://a.it' });
  assert.match(md, /Con occorrenze da componenti di terze parti \| 1 problemi e 1 casi da guardare/);
});

test('la spiegazione sui componenti esterni sta vicino ai problemi, non in fondo', () => {
  const [v] = normalizzaViolazioni([
    { id: 'link-name', tags: ['wcag2a', 'wcag244'], nodes: [{ target: ['#onetrust-a'], html: '<a>' }] },
  ]);
  v.origine = riassumiOrigine([
    { origine: 'terza-parte', certezza: 'probabile', componente: 'OneTrust', tipo: 'x' },
  ]);
  const pg = [{ url: 'https://a.it', errore: null, superati: 20, violazioni: [v] }];
  const md = reportMarkdown(
    { dataScansione: new Date().toISOString(), pagine: pg, riepilogo: riepiloga(pg) },
    { sito: 'https://a.it' }
  );
  // Chi legge incontra le note di provenienza nell'elenco dei problemi: la
  // spiegazione deve arrivare lì, non dopo quindici verifiche manuali.
  assert.ok(
    md.indexOf('## Quello che non è nel codice del sito') < md.indexOf('## Verifiche manuali da fare'),
    'la sezione sui componenti esterni è finita dopo la checklist'
  );
});

test('le tre condizioni dell\'esclusione non si possono citare a metà', () => {
  const t = CONTESTO_NORMATIVO.contenutiDiTerzi;
  for (const parola of ['finanziati', 'sviluppati', 'controllo']) {
    assert.match(t.condizioni, new RegExp(parola), `condizione mancante: ${parola}`);
  }
  assert.match(t.fonte, /2016\/2102/);
  assert.match(t.fonte, /1, par\. 4, lett\. e\)/);
  assert.match(t.eaa, /non risulta un'esclusione analoga/);
});

test('ogni regime cita le proprie fonti', () => {
  for (const reg of CONTESTO_NORMATIVO.regimi) {
    assert.ok(reg.riferimenti?.length, `${reg.id}: nessun riferimento`);
  }
  const eaa = CONTESTO_NORMATIVO.regimi.find((r) => r.id === 'eaa');
  // Le Linee Guida AgID sui servizi sono del 4 marzo 2026: sono successive
  // alla prima stesura di questo file, e il contesto normativo deve seguirle.
  assert.ok(
    eaa.riferimenti.some((r) => /Linee Guida.*servizi.*2026/i.test(r)),
    'manca il riferimento alle Linee Guida AgID sui servizi'
  );
});

test('il report non presenta l\'origine esterna come una scusante', () => {
  const violazioni = normalizzaViolazioni([
    { id: 'aria-prohibited-attr', tags: ['wcag2a', 'wcag412'], nodes: [{ target: ['#onetrust-banner-sdk'], html: '<div id="onetrust-banner-sdk">' }] },
  ]);
  violazioni[0].origine = riassumiOrigine([
    { origine: 'terza-parte', certezza: 'probabile', componente: 'OneTrust', tipo: 'gestore del consenso ai cookie' },
  ]);
  const pg = [{ url: 'https://a.it', errore: null, superati: 20, violazioni }];
  const md = reportMarkdown(
    { dataScansione: new Date().toISOString(), pagine: pg, riepilogo: riepiloga(pg) },
    { sito: 'https://a.it' }
  );
  assert.match(md, /Quello che non è nel codice del sito/);
  assert.match(md, /Questo non riduce l'obbligo/);
  // Le tre condizioni dell'esclusione vanno citate tutte: citarne una sola
  // farebbe credere che basti che il componente sia di qualcun altro.
  assert.match(md, /né finanziati, né sviluppati, né sottoposti al controllo/);
  assert.match(md, /2016\/2102/);
});

// ══════════════════════════════════════════ La checklist non promette il falso

console.log('\nLa scansione smentisce sé stessa quando serve');

test('se il percorso con Tab non è arrivato in fondo, la checklist lo dice', () => {
  // Il testo della voce è scritto una volta per tutte e recita "Conforme ha
  // già percorso la pagina con Tab e verificato che…". Su comune.milano.it
  // il percorso si fermava dopo quattro elementi e la checklist continuava a
  // dichiararlo svolto: chi legge salta la verifica più importante di tutte
  // credendola già coperta.
  const pg = [
    { url:'https://a.it', errore:null, violazioni:[], superati:20,
      tastiera:{ percorsoCompleto:false, confinato:true, elementiRaggiunti:4, focusControllati:4, trappolaTrovata:false, skipLink:false } },
  ];
  const r = riepiloga(pg);
  const md = reportMarkdown({ dataScansione:new Date().toISOString(), pagine:pg, riepilogo:r }, { sito:'https://a.it' });

  const sezione = md.slice(md.indexOf('## Verifiche manuali da fare'));
  assert.match(sezione, /In questa scansione non è andata così/);
  assert.match(sezione, /va svolta per intero, non come ripasso/);
});

test('se il percorso è riuscito, la checklist non si smentisce', () => {
  const pg = [
    { url:'https://a.it', errore:null, violazioni:[], superati:20,
      tastiera:{ percorsoCompleto:true, confinato:false, elementiRaggiunti:30, focusControllati:25, trappolaTrovata:false, skipLink:true } },
  ];
  const r = riepiloga(pg);
  assert.equal(smentisciVerifica('tastiera', r), null);
  const md = reportMarkdown({ dataScansione:new Date().toISOString(), pagine:pg, riepilogo:r }, { sito:'https://a.it' });
  assert.doesNotMatch(md, /In questa scansione non è andata così/);
});

test('la smentita riguarda solo la voce sulla tastiera', () => {
  const r = riepiloga([
    { url:'https://a.it', errore:null, violazioni:[], superati:20,
      tastiera:{ percorsoCompleto:false, confinato:true, elementiRaggiunti:4, focusControllati:4, trappolaTrovata:false, skipLink:false } },
  ]);
  assert.ok(smentisciVerifica('tastiera', r));
  assert.equal(smentisciVerifica('screen-reader', r), null);
  assert.equal(smentisciVerifica('tastiera', { tastiera: null }), null);
});

test('un controllo non riuscito non viene introdotto come se fosse un difetto', () => {
  const incerte = normalizzaViolazioni([
    { id:'tastiera-percorso-interrotto', tags:['wcag2a','wcag211','wcag212'], nodes:[{ target:['div#banner'], html:'<div>' }] },
  ]);
  const pg = [{ url:'https://a.it', errore:null, violazioni:[], superati:20, daVerificare:incerte }];
  const md = reportMarkdown({ dataScansione:new Date().toISOString(), pagine:pg, riepilogo:riepiloga(pg) }, { sito:'https://a.it' });
  assert.match(md, /Come completare la verifica:/);
});

// ══════════════════════════════════════════ Italiano corretto

console.log('\nI documenti generati sono scritti in italiano, non in barre');

test('plurale e conArticolo accordano il sostantivo', () => {
  assert.equal(plurale(1, 'pagina', 'pagine'), '1 pagina');
  assert.equal(plurale(3, 'pagina', 'pagine'), '3 pagine');
  assert.equal(plurale(0, 'pagina', 'pagine'), '0 pagine');
  assert.equal(conArticolo(1, 'una pagina', 'pagine'), 'una pagina');
  assert.equal(conArticolo(4, 'una pagina', 'pagine'), '4 pagine');
});

test('nessun documento generato contiene "pagina/e" e simili', () => {
  // La barra è la scorciatoia di chi non vuole gestire il plurale, e fa
  // leggere il documento come l'uscita di una macchina. Questi documenti
  // finiscono allegati a un preventivo.
  const [v] = normalizzaViolazioni([
    { id:'link-name', tags:['wcag2a','wcag244'], nodes:[{ target:['#a'], html:'<a>' }] },
  ]);
  const incerte = normalizzaViolazioni([
    { id:'color-contrast', tags:['wcag2aa','wcag143'], nodes:[{ target:['#b'], html:'<p>' }] },
  ]);
  const pg = [
    { url:'https://a.it', errore:null, violazioni:[v], daVerificare:incerte, superati:20,
      tastiera:{ percorsoCompleto:false, confinato:true, elementiRaggiunti:4, focusControllati:4, trappolaTrovata:true, skipLink:false },
      reflow:{ scorrimentoA320:12, tagliatiDallaSpaziatura:1 } },
  ];
  const esitoPl = { dataScansione:new Date().toISOString(), pagine:pg, riepilogo:riepiloga(pg) };

  for (const [nome, testo] of [
    ['report', reportMarkdown(esitoPl, { sito:'https://a.it' })],
    ['scheda', schedaPreparatoria(esitoPl, { sito:'https://a.it' })],
  ]) {
    assert.doesNotMatch(testo, /\b\w+\/[ei]\b/, `${nome}: contiene un plurale con la barra`);
    assert.doesNotMatch(testo, /\b1 (pagine|occorrenze|segnalazioni|trappole|contenitori|casi)\b/, `${nome}: plurale sbagliato al singolare`);
  }
});

// ══════════════════════════════════════════ README in due lingue

console.log('\nLe due versioni del README dicono la stessa cosa');

test('i due README hanno la stessa struttura e gli stessi numeri', () => {
  // Un README bilingue si guasta sempre allo stesso modo: si aggiorna una
  // versione e l'altra resta indietro. Questo test non verifica la
  // traduzione, verifica che le due versioni non divergano.
  const en = fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  const it = fs.readFileSync(new URL('../README.it.md', import.meta.url), 'utf8');

  // Ciascuna rimanda all'altra.
  assert.match(en, /\[Italiano\]\(README\.it\.md\)/, 'README.md non rimanda alla versione italiana');
  assert.match(it, /\[English\]\(README\.md\)/, 'README.it.md non rimanda alla versione inglese');

  const conta = (testo, re) => (testo.match(re) || []).length;
  assert.equal(conta(en, /^## /gm), conta(it, /^## /gm), 'numero di sezioni diverso');
  assert.equal(conta(en, /^### /gm), conta(it, /^### /gm), 'numero di sottosezioni diverso');
  assert.equal(conta(en, /^```/gm), conta(it, /^```/gm), 'numero di blocchi di codice diverso');

  // Il numero dei test e quello della copertura devono coincidere fra le
  // due versioni, e la copertura deve coincidere con i dati.
  const testEn = en.match(/(\d+) tests, no dependencies/)?.[1];
  const testIt = it.match(/(\d+) test, senza dipendenze/)?.[1];
  assert.ok(testEn && testIt, 'numero dei test non trovato');
  assert.equal(testEn, testIt, 'i due README dichiarano un numero di test diverso');

  assert.match(en, new RegExp(`fully verifies ${COPERTURA.automatici}, partially catches ${COPERTURA.parziali}, and cannot say anything about the remaining ${COPERTURA.manuali}`));
  assert.match(it, new RegExp(`ne verifica pienamente ${COPERTURA.automatici}, ne intercetta parzialmente ${COPERTURA.parziali} e sui restanti ${COPERTURA.manuali}`));
});

console.log(`\n${passati} test superati${process.exitCode ? ' — CI SONO ERRORI' : ''}\n`);
