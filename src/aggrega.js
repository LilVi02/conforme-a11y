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
]);

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
    return {
      regola: v.id,
      descrizioneAxe: v.help,
      gravitaAxe: v.impact,
      criteri: codici.map((c) => ({ codice: c, ...(scheda(c) || {}) })),
      priorita: prioritaViolazione(codici),
      occorrenze: v.nodes?.length ?? 0,
      esempi: (v.nodes || []).slice(0, 5).map((n) => ({
        selettore: Array.isArray(n.target) ? n.target.join(' ') : String(n.target),
        html: troncaHtml(n.html),
        dettaglio: n.failureSummary || null,
      })),
      documentazione: v.helpUrl,
    };
  });
}

export function troncaHtml(html, max = 220) {
  if (!html) return '';
  const pulito = String(html).replace(/\s+/g, ' ').trim();
  return pulito.length > max ? pulito.slice(0, max) + '…' : pulito;
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
      } else {
        perRegolaIncerta.set(v.regola, {
          regola: v.regola,
          descrizioneAxe: v.descrizioneAxe,
          criteri: v.criteri,
          priorita: v.priorita,
          occorrenze: v.occorrenze,
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
        confinate: conTastiera.filter((p) => p.tastiera.confinato).length,
        percorsiCompleti: conTastiera.filter((p) => p.tastiera.percorsoCompleto).length,
        conSkipLink: conTastiera.filter((p) => p.tastiera.skipLink).length,
      }
    : null;
  const pagineAnalizzate = pagine.filter((p) => !p.errore);

  return {
    pagineScansionate: pagine.length,
    controlliSuperati,
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
