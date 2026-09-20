/**
 * Aggregazione e normalizzazione dei risultati.
 *
 * Deliberatamente separato da scan.js: questo modulo è logica pura, senza
 * Playwright né browser. Così chi elabora risultati già raccolti (una CI, un
 * backend, un altro scanner) può usare la libreria senza installare Chromium.
 */

import { criteriDaTag, prioritaViolazione, scheda } from './wcag-it.js';

/**
 * Controlli che segnalano qualcosa da guardare, non una violazione accertata.
 *
 * Una tabella larga può essere un'eccezione legittima; una scorciatoia da
 * tastiera può già usare un modificatore; un gestore su mousedown può servire
 * solo a preparare un trascinamento. In tutti questi casi il codice non basta
 * a decidere, e presentarli come colpe — per giunta etichettati "GRAVE" —
 * farebbe perdere fiducia nel resto del report.
 *
 * Finiscono quindi nella stessa sezione dei controlli che axe non ha saputo
 * risolvere, e non vengono conteggiati fra i problemi.
 */
export const REGOLE_DA_VALUTARE = new Set([
  'reflow-da-valutare',
  'scorciatoie-da-verificare',
  'azione-alla-pressione',
  'gesti-senza-alternativa',
  // Un percorso con Tab che si ferma presto è un controllo non riuscito, non
  // una colpa del sito: va detto, ma fra le cose da guardare.
  'tastiera-percorso-interrotto',
]);

/**
 * Stabilisce se il percorso con Tab può essere usato per accusare qualcuno.
 *
 * Sta qui, fuori dal modulo che pilota il browser, perché è la decisione più
 * delicata dello scanner e deve poter essere verificata dai test senza
 * avviare Chromium.
 *
 * Il ragionamento: qualche elemento non raggiunto su molti è un'informazione
 * sugli elementi — sono loro il problema. La maggioranza non raggiunta è
 * un'informazione sul percorso: si è fermato, e dell'elenco non si sa nulla.
 * Nel secondo caso l'unica cosa onesta è tacere e dirlo.
 *
 * Esiste perché lo scanner ha commesso esattamente questo errore: su
 * comune.milano.it il focus veniva trattenuto da un banner di consenso, il
 * percorso toccava 4 elementi su oltre cento, e il report dichiarava
 * irraggiungibile un link "salta al contenuto" che funzionava.
 *
 * @param {{attesi:number, nonRaggiunti:number, trappola?:boolean, confinamento?:boolean}} dati
 */
export function percorsoUtilizzabile({ attesi, nonRaggiunti, trappola, confinamento }) {
  if (trappola || confinamento) return false;
  if (!attesi) return false;
  // Il minimo assoluto serve alle pagine piccole: su quattro comandi, due non
  // raggiunti sono il 50% e restano comunque due casi veri da guardare.
  return nonRaggiunti <= Math.max(3, Math.round(attesi * 0.3));
}

/** Divide le violazioni accertate da quelle che richiedono un giudizio. */
export function separaIncerte(violazioni = []) {
  const accertate = [];
  const incerte = [];
  for (const v of violazioni) {
    (REGOLE_DA_VALUTARE.has(v.regola) ? incerte : accertate).push(v);
  }
  return { accertate, incerte };
}

/** Arricchisce le violazioni grezze di axe con la scheda normativa italiana. */
export function normalizzaViolazioni(lista = []) {
  return lista.map((v) => {
    const codici = criteriDaTag(v.tags);
    const nodi = deduplicaNodi(v.nodes);
    return {
      regola: v.id,
      descrizioneAxe: v.help,
      gravitaAxe: v.impact,
      criteri: codici.map((c) => ({ codice: c, ...(scheda(c) || {}) })),
      priorita: prioritaViolazione(codici),
      occorrenze: nodi.length,
      origine: v.origine || null,
      esempi: nodi.slice(0, 5).map((n) => {
        // axe indica con più elementi i nodi che stanno dentro un iframe: il
        // primo individua l'iframe, l'ultimo l'elemento al suo interno.
        // Unirli con uno spazio produceva un selettore che sembra valido e non
        // lo è — `iframe[...] #email` non seleziona nulla, perché quell'elemento
        // vive in un altro documento.
        const percorso = Array.isArray(n.target) ? n.target.map(String) : [String(n.target)];
        return {
          selettore: percorso[percorso.length - 1],
          dentroFrame: percorso.length > 1 ? percorso.slice(0, -1) : null,
          origine: n.origine || null,
          html: troncaHtml(n.html),
          dettaglio: n.failureSummary || null,
        };
      }),
      documentazione: v.helpUrl,
    };
  });
}

/**
 * Uno stesso elemento segnalato due volte dalla stessa regola è un problema
 * solo, e contarlo due volte gonfia il totale delle occorrenze.
 *
 * Capita ai controlli costruiti sugli ascoltatori di eventi: un contenitore
 * che ascolta sia touchmove sia pointermove finisce nell'elenco una volta per
 * evento. Il lettore vede la stessa riga ripetuta e smette di fidarsi.
 */
function deduplicaNodi(nodes = []) {
  const visti = new Set();
  return (nodes || []).filter((n) => {
    const chiave = (Array.isArray(n.target) ? n.target.join(' ') : String(n.target)) + '|' + (n.html || '');
    if (visti.has(chiave)) return false;
    visti.add(chiave);
    return true;
  });
}

export function troncaHtml(html, max = 220) {
  if (!html) return '';
  const pulito = String(html).replace(/\s+/g, ' ').trim();
  return pulito.length > max ? pulito.slice(0, max) + '…' : pulito;
}

/**
 * Unisce le attribuzioni della stessa regola su pagine diverse.
 *
 * Serve perché la stessa regola può venire dal sito su una pagina e da un
 * componente esterno su un'altra: sommare i conteggi senza unire i componenti
 * farebbe sparire uno dei due.
 */
export function fondiOrigini(a, b) {
  if (!a) return b || null;
  if (!b) return a;

  const componenti = new Map();
  for (const c of [...(a.componenti || []), ...(b.componenti || [])]) {
    const e = componenti.get(c.nome);
    if (e) {
      e.occorrenze += c.occorrenze;
      if (c.certezza === 'certa') e.certezza = 'certa';
    } else {
      componenti.set(c.nome, { ...c });
    }
  }

  const daTerzi = (a.daTerzi || 0) + (b.daTerzi || 0);
  const totale = (a.totale || 0) + (b.totale || 0);
  return {
    tutteDalSito: daTerzi === 0,
    tutteDaTerzi: daTerzi > 0 && daTerzi === totale,
    daTerzi,
    totale,
    componenti: [...componenti.values()].sort((x, y) => y.occorrenze - x.occorrenze),
  };
}

/** Aggrega le violazioni per regola su tutte le pagine scansionate. */
export function riepiloga(pagine = []) {
  const perRegola = new Map();
  let occorrenzeTotali = 0;

  for (const p of pagine) {
    for (const v of p.violazioni || []) {
      occorrenzeTotali += v.occorrenze;
      const esistente = perRegola.get(v.regola);
      if (esistente) {
        esistente.occorrenze += v.occorrenze;
        esistente.pagine.add(p.url);
        esistente.origine = fondiOrigini(esistente.origine, v.origine);
        // Teniamo qualche esempio in più solo se ne abbiamo pochi: servono a
        // far vedere il problema, non a elencare ogni occorrenza.
        for (const e of v.esempi || []) {
          if (esistente.esempi.length < 5) esistente.esempi.push({ ...e, pagina: p.url });
        }
      } else {
        perRegola.set(v.regola, {
          regola: v.regola,
          descrizioneAxe: v.descrizioneAxe,
          criteri: v.criteri,
          priorita: v.priorita,
          occorrenze: v.occorrenze,
          origine: v.origine || null,
          pagine: new Set([p.url]),
          esempi: (v.esempi || []).slice(0, 5).map((e) => ({ ...e, pagina: p.url })),
        });
      }
    }
  }

  const problemi = [...perRegola.values()]
    .map((r) => ({ ...r, pagine: [...r.pagine] }))
    // Prima ciò che blocca, poi ciò che è più diffuso, poi ciò che è più frequente.
    .sort(
      (a, b) =>
        a.priorita - b.priorita ||
        b.pagine.length - a.pagine.length ||
        b.occorrenze - a.occorrenze
    );

  // I controlli che axe non è riuscito a decidere: non sono violazioni
  // accertate, ma nemmeno esiti puliti. Ometterli farebbe sembrare il sito
  // migliore di quanto si sappia, ed è il tipo di silenzio che rende
  // inaffidabile un report.
  const perRegolaIncerta = new Map();
  for (const p of pagine) {
    for (const v of p.daVerificare || []) {
      const e = perRegolaIncerta.get(v.regola);
      if (e) {
        e.occorrenze += v.occorrenze;
        e.pagine.add(p.url);
        e.origine = fondiOrigini(e.origine, v.origine);
      } else {
        perRegolaIncerta.set(v.regola, {
          regola: v.regola,
          descrizioneAxe: v.descrizioneAxe,
          criteri: v.criteri,
          priorita: v.priorita,
          occorrenze: v.occorrenze,
          origine: v.origine || null,
          pagine: new Set([p.url]),
          esempi: (v.esempi || []).slice(0, 3).map((x) => ({ ...x, pagina: p.url })),
        });
      }
    }
  }

  const daVerificare = [...perRegolaIncerta.values()]
    .map((r) => ({ ...r, pagine: [...r.pagine] }))
    .sort((a, b) => a.priorita - b.priorita || b.occorrenze - a.occorrenze);

  // Quanti controlli sono stati effettivamente superati: è la prova che la
  // scansione è avvenuta. Senza questo dato, "zero violazioni" e "lo scanner
  // non ha caricato la pagina" si leggono allo stesso modo.
  const controlliSuperati = pagine.reduce((n, p) => n + (p.superati || 0), 0);

  // Riepilogo delle prove di reflow.
  const conReflow = pagine.filter((p) => p.reflow);
  const reflow = conReflow.length
    ? {
        pagine: conReflow.length,
        conScorrimento: conReflow.filter((p) => p.reflow.scorrimentoA320 > 0).length,
        scorrimentoMax: Math.max(...conReflow.map((p) => p.reflow.scorrimentoA320)),
        tagliatiDallaSpaziatura: conReflow.reduce((n, p) => n + p.reflow.tagliatiDallaSpaziatura, 0),
      }
    : null;

  // Riepilogo della prova da tastiera, che non passa da axe.
  const conTastiera = pagine.filter((p) => p.tastiera);
  const tastiera = conTastiera.length
    ? {
        pagine: conTastiera.length,
        elementiPercorsi: conTastiera.reduce((n, p) => n + p.tastiera.elementiRaggiunti, 0),
        focusControllati: conTastiera.reduce((n, p) => n + p.tastiera.focusControllati, 0),
        trappole: conTastiera.filter((p) => p.tastiera.trappolaTrovata).length,
        // Non esiste più un conteggio dei "focus rimasti chiusi": Conforme
        // non sa accertarlo senza misurare la propria interferenza. Resta il
        // fatto osservato, cioè dove il percorso si è fermato.
        percorsiFermatiInUnContenitore: conTastiera.filter((p) => p.tastiera.confinato).length,
        percorsiCompleti: conTastiera.filter((p) => p.tastiera.percorsoCompleto).length,
        // Contate solo le pagine percorse fino in fondo: altrove la presenza
        // del link di salto non è stata verificata, e un conteggio che mescola
        // le due cose fa leggere "assente" dove si sarebbe dovuto leggere
        // "non verificato".
        conSkipLink: conTastiera.filter((p) => p.tastiera.skipLink && p.tastiera.percorsoCompleto)
          .length,
      }
    : null;
  const pagineAnalizzate = pagine.filter((p) => !p.errore);

  // Quanto del lavoro non si corregge nel codice del sito. È la cifra che
  // cambia chi deve intervenire, e va letta accanto al totale, non al posto suo.
  const daTerzi = problemi.filter((p) => p.origine && !p.origine.tutteDalSito);
  const incerteDaTerzi = daVerificare.filter((p) => p.origine && !p.origine.tutteDalSito);
  const componentiEsterni = new Map();
  for (const p of [...problemi, ...daVerificare]) {
    for (const c of p.origine?.componenti || []) {
      const e = componentiEsterni.get(c.nome);
      if (e) {
        e.occorrenze += c.occorrenze;
        e.regole++;
        if (c.certezza === 'certa') e.certezza = 'certa';
      } else {
        componentiEsterni.set(c.nome, { ...c, regole: 1 });
      }
    }
  }

  return {
    pagineScansionate: pagine.length,
    controlliSuperati,
    problemiDaTerzi: daTerzi.length,
    daVerificareDaTerzi: incerteDaTerzi.length,
    occorrenzeDaTerzi: daTerzi.reduce((n, p) => n + (p.origine?.daTerzi || 0), 0),
    componentiEsterni: [...componentiEsterni.values()].sort((a, b) => b.occorrenze - a.occorrenze),
    controlliSuperatiMin: pagineAnalizzate.length
      ? Math.min(...pagineAnalizzate.map((p) => p.superati || 0))
      : 0,
    tastiera,
    reflow,
    pagineInErrore: pagine.filter((p) => p.errore).length,
    pagineSospette: pagine.filter((p) => p.sospetto).length,
    problemiDistinti: problemi.length,
    occorrenzeTotali,
    bloccanti: problemi.filter((p) => p.priorita === 1).length,
    problemi,
    daVerificare,
    occorrenzeDaVerificare: daVerificare.reduce((n, r) => n + r.occorrenze, 0),
  };
}
