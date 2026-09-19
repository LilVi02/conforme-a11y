/**
 * Aggregazione e normalizzazione dei risultati.
 *
 * Deliberatamente separato da scan.js: questo modulo è logica pura, senza
 * Playwright né browser. Così chi elabora risultati già raccolti (una CI, un
 * backend, un altro scanner) può usare la libreria senza installare Chromium.
 */

import { criteriDaTag, prioritaViolazione, scheda } from './wcag-it.js';

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
  const pagineAnalizzate = pagine.filter((p) => !p.errore);

  return {
    pagineScansionate: pagine.length,
    controlliSuperati,
    controlliSuperatiMin: pagineAnalizzate.length
      ? Math.min(...pagineAnalizzate.map((p) => p.superati || 0))
      : 0,
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
