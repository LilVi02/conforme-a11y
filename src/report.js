/**
 * Generazione dei report.
 *
 * Il criterio di scrittura: il report lo legge spesso chi deve decidere se
 * spendere, non chi scrive il codice. Quindi prima cosa è rotto e per chi,
 * poi come si ripara, e sempre cosa manca ancora per poter dire qualcosa
 * sulla conformità.
 */

import { CONTESTO_NORMATIVO, PRINCIPI, COPERTURA } from './wcag-it.js';
import { descriviRegola, correggiRegola } from './regole-it.js';
import { VERIFICHE_MANUALI, notaCopertura, criteriScoperti } from './manuale.js';
import { statoSuggerito } from './dichiarazione.js';

const ETICHETTA_PRIORITA = {
  1: 'BLOCCANTE — impedisce di usare il sito',
  2: 'GRAVE — ostacolo serio',
  3: 'DA SISTEMARE — attrito',
};

const dataIt = (iso) =>
  new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });

export function reportMarkdown(esito, opzioni = {}) {
  const { sito = esito.pagine?.[0]?.url || '' } = opzioni;
  const r = esito.riepilogo;
  const righe = [];

  righe.push(`# Report di accessibilità`);
  righe.push(``);
  righe.push(`**Sito analizzato:** ${sito}  `);
  righe.push(`**Data:** ${dataIt(esito.dataScansione)}  `);
  righe.push(`**Standard di riferimento:** ${CONTESTO_NORMATIVO.standard}  `);
  righe.push(
    `**Pagine analizzate:** ${r.pagineScansionate}${r.pagineInErrore ? ` (${r.pagineInErrore} non raggiungibili)` : ''}`
  );
  righe.push(``);
  righe.push(`> ⚠️ **Questo report non attesta la conformità.** ${notaCopertura()}`);
  righe.push(``);

  // ── Sintesi
  righe.push(`## In sintesi`);
  righe.push(``);
  righe.push(`| | |`);
  righe.push(`|---|---|`);
  righe.push(`| Problemi distinti rilevati | ${r.problemiDistinti} |`);
  righe.push(`| Di cui bloccanti | ${r.bloccanti} |`);
  righe.push(`| Occorrenze totali nel codice | ${r.occorrenzeTotali} |`);
  if (r.occorrenzeDaVerificare) {
    righe.push(`| Casi che axe non ha saputo decidere | ${r.occorrenzeDaVerificare} |`);
  }
  righe.push(`| Controlli superati | ${r.controlliSuperati ?? 0} |`);
  righe.push(`| Criteri verificabili in automatico | ${COPERTURA.automatici} su ${COPERTURA.totale} |`);
  righe.push(`| Criteri che richiedono verifica umana | ${COPERTURA.manuali + COPERTURA.parziali} su ${COPERTURA.totale} |`);
  righe.push(``);
  righe.push(`Indicazione preliminare, dai soli dati automatici: **${statoSuggerito(r)}**.`);
  righe.push(``);

  if (r.pagineInErrore) {
    righe.push(`### Pagine non raggiunte`);
    righe.push(``);
    for (const p of (esito.pagine || []).filter((x) => x.errore)) {
      righe.push(`- \`${p.url}\` — ${String(p.errore).split('\n')[0]}`);
    }
    righe.push(``);
    righe.push(`Queste pagine non sono state analizzate: il risultato è incompleto finché non lo sono.`);
    righe.push(``);
  }

  if (r.pagineSospette) {
    righe.push(`### ⚠️ Pagine che potrebbero non essere quelle giuste`);
    righe.push(``);
    righe.push(
      `Queste hanno risposto correttamente, ma non sembrano il sito richiesto: ` +
        `possono essere schermate anti-bot, muri di consenso o pagine di manutenzione. ` +
        `**I risultati che le riguardano vanno ignorati**: descrivono la schermata intermedia, non il sito.`
    );
    righe.push(``);
    for (const p of (esito.pagine || []).filter((x) => x.sospetto)) {
      righe.push(`- \`${p.url}\` — ${p.sospetto}`);
      if (p.titolo) righe.push(`  - Titolo della pagina: "${p.titolo}"`);
    }
    righe.push(``);
  }

  // ── Problemi
  if (r.problemiDistinti === 0) {
    righe.push(`## Nessun problema rilevato dai controlli automatici`);
    righe.push(``);
    righe.push(
      `I controlli automatizzabili non hanno trovato errori. Restano da verificare a mano ` +
        `i criteri elencati più sotto: è lì che si trovano la maggior parte delle barriere reali.`
    );
    righe.push(``);
    // Senza questo dato, "sito pulito" e "scanner che non ha caricato la
    // pagina" si leggono allo stesso modo. Il numero di controlli superati
    // dice che la scansione è davvero avvenuta.
    righe.push(
      `*Prova che la scansione è avvenuta:* ${r.controlliSuperati} controlli superati ` +
        `in totale, almeno ${r.controlliSuperatiMin} per pagina. Una pagina che non si carica, ` +
        `o una schermata di errore, ne supera pochissimi: se questo numero fosse sotto 5, ` +
        `il risultato andrebbe considerato inattendibile.`
    );
    righe.push(``);
  } else {
    righe.push(`## Cosa correggere, in ordine di priorità`);
    righe.push(``);
    righe.push(
      `L'ordine segue la conseguenza sull'utente, non la severità tecnica: prima ciò che impedisce di usare il sito.`
    );
    righe.push(``);

    for (const [i, p] of r.problemi.entries()) {
      righe.push(`### ${i + 1}. ${descriviRegola(p.regola, p.descrizioneAxe)}`);
      righe.push(``);
      righe.push(`**${ETICHETTA_PRIORITA[p.priorita]}**  `);
      righe.push(`Occorrenze: ${p.occorrenze} su ${p.pagine.length} pagina/e  `);
      righe.push(`Regola tecnica: \`${p.regola}\``);
      righe.push(``);

      // La correzione specifica della regola, quando esiste, è molto più utile
      // di quella del criterio: un criterio ampio come 1.3.1 copre problemi
      // diversissimi e il suo consiglio generico non aiuta a risolverne uno.
      const correzioneRegola = correggiRegola(p.regola);
      if (correzioneRegola) {
        righe.push(`*Come si corregge:* ${correzioneRegola}`);
        righe.push(``);
      }

      for (const c of p.criteri) {
        if (!c.titolo) continue;
        righe.push(
          `**Criterio WCAG ${c.codice} — ${c.titolo}** · livello ${c.livello} · ${PRINCIPI[c.principio]}`
        );
        righe.push(``);
        righe.push(`*Chi viene escluso:* ${c.impatto}`);
        righe.push(``);
        if (!correzioneRegola) {
          righe.push(`*Come si corregge:* ${c.correzione}`);
          righe.push(``);
        }
        if (c.nota) {
          righe.push(`*Da sapere:* ${c.nota}`);
          righe.push(``);
        }
      }

      if (p.esempi?.length) {
        const n = Math.min(p.esempi.length, 3);
        righe.push(n === 1 ? `*Dove si trova:*` : `*Dove si trova (primi ${n} casi):*`);
        righe.push(``);
        for (const e of p.esempi.slice(0, 3)) {
          righe.push(`\`${e.selettore}\``);
          righe.push(``);
          righe.push('```html');
          righe.push(e.html);
          righe.push('```');
          righe.push(``);
        }
      }

      righe.push(`*Pagine interessate:*`);
      for (const u of p.pagine.slice(0, 10)) righe.push(`- ${u}`);
      if (p.pagine.length > 10) righe.push(`- …e altre ${p.pagine.length - 10}`);
      righe.push(``);
    }
  }

  // ── Casi che axe non ha saputo decidere
  if (r.daVerificare?.length) {
    righe.push(`## Da guardare: casi che il controllo automatico non ha saputo decidere`);
    righe.push(``);
    righe.push(
      `Non sono violazioni accertate, e per questo non compaiono sopra. Ma non sono ` +
        `nemmeno esiti puliti: axe non è riuscito a stabilire se il criterio sia rispettato ` +
        `e ha lasciato la decisione a una persona. Il caso più comune è il contrasto su ` +
        `sfondi con immagini o gradienti, dove il colore effettivo dietro il testo non è ` +
        `calcolabile dal codice. Vanno verificati a occhio.`
    );
    righe.push(``);

    for (const p of r.daVerificare) {
      righe.push(`### ${descriviRegola(p.regola, p.descrizioneAxe)}`);
      righe.push(``);
      righe.push(`Casi da controllare: ${p.occorrenze} su ${p.pagine.length} pagina/e · regola \`${p.regola}\``);
      righe.push(``);
      const cor = correggiRegola(p.regola);
      if (cor) {
        righe.push(`*Se il problema c'è, si corregge così:* ${cor}`);
        righe.push(``);
      }
      if (p.esempi?.length) {
        righe.push(`*Dove guardare:*`);
        righe.push(``);
        for (const e of p.esempi.slice(0, 2)) {
          righe.push(`\`${e.selettore}\``);
          righe.push(``);
          righe.push('```html');
          righe.push(e.html);
          righe.push('```');
          righe.push(``);
        }
      }
    }
  }

  // ── Verifiche manuali
  righe.push(`## Verifiche manuali da fare`);
  righe.push(``);
  righe.push(
    `Nessuna di queste è automatizzabile, e senza di esse la valutazione di conformità non sta in piedi. ` +
      `Il tempo indicato vale per un sito di poche pagine.`
  );
  righe.push(``);

  for (const v of VERIFICHE_MANUALI) {
    const criteriLeggibili = v.criteri.filter((c) => /^\d/.test(c));
    righe.push(`### ☐ ${v.titolo}`);
    righe.push(``);
    righe.push(
      `*Criteri coperti:* ${criteriLeggibili.length ? criteriLeggibili.join(', ') : v.criteri.join(', ')} · *Tempo stimato:* ${v.tempo}`
    );
    righe.push(``);
    righe.push(v.come);
    righe.push(``);
    if (v.seFallisce) {
      righe.push(`> ${v.seFallisce}`);
      righe.push(``);
    }
  }

  const scoperti = criteriScoperti();
  if (scoperti.length) {
    righe.push(`### Criteri non coperti né dall'automazione né dalla checklist`);
    righe.push(``);
    righe.push(
      `Restano da valutare caso per caso: ${scoperti.join(', ')}. ` +
        `Li segnaliamo invece di ometterli, perché una checklist che sembra completa e non lo è fa più danni di una dichiaratamente parziale.`
    );
    righe.push(``);
  }

  // ── Normativa
  righe.push(`## Contesto normativo`);
  righe.push(``);
  righe.push(
    `In Italia gli obblighi sono due e distinti. Stabilire quale si applica è il primo passo, perché cambiano formato e procedura.`
  );
  righe.push(``);
  for (const reg of CONTESTO_NORMATIVO.regimi) {
    righe.push(`**${reg.nome}**`);
    righe.push(``);
    righe.push(`- *Chi riguarda:* ${reg.soggetti}`);
    righe.push(`- *Dichiarazione:* ${reg.dichiarazione}`);
    righe.push(`- *Tempi:* ${reg.scadenza}`);
    righe.push(``);
  }
  righe.push(`**Vigilanza:** ${CONTESTO_NORMATIVO.vigilanza}`);
  righe.push(``);
  righe.push(`---`);
  righe.push(``);
  righe.push(`*Report generato con Conforme.*`);
  righe.push(``);
  righe.push(`*Titoli dei criteri: ${CONTESTO_NORMATIVO.fonteTitoli}*`);
  righe.push(``);
  righe.push(`*${CONTESTO_NORMATIVO.avvertenza}*`);

  return righe.join('\n');
}

export function reportJson(esito) {
  return JSON.stringify(esito, null, 2);
}

export { schedaPreparatoria, statoSuggerito, bozzaDichiarazione } from './dichiarazione.js';
