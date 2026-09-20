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
import { plurale, conArticolo } from './testo.js';

const ETICHETTA_PRIORITA = {
  1: 'BLOCCANTE — impedisce di usare il sito',
  2: 'GRAVE — ostacolo serio',
  3: 'DA SISTEMARE — attrito',
};

/**
 * Descrive in una riga da dove arriva un problema.
 *
 * Restituisce null quando tutto viene dal sito: è il caso normale, e scriverlo
 * ogni volta aggiungerebbe rumore senza aggiungere nulla.
 */
export function descriviProvenienza(origine, { accertato = true } = {}) {
  if (!origine || origine.tutteDalSito || !origine.componenti?.length) return null;

  const elenco = origine.componenti
    .map((c) => {
      const come = c.certezza === 'certa' ? '' : ', riconosciuto dal nome nel codice';
      return `**${c.nome}**${c.tipo ? ` (${c.tipo})` : ''}${come}`;
    })
    .join(', ');

  // Fra i casi da guardare non è ancora detto che ci sia qualcosa da
  // correggere: dire "non si corregge modificando il sito" darebbe per
  // assodato proprio ciò che quella sezione lascia in sospeso. La distinzione
  // fra accertato e da valutare è il cardine del report, e una frase
  // riutilizzata tale e quale la cancellava.
  const rimedio = accertato
    ? 'Non si corregge modificando il sito:'
    : 'Se c\'è qualcosa da correggere, non si corregge modificando il sito:';

  if (origine.tutteDaTerzi) {
    return `non dal codice del sito, ma da ${elenco}. ${rimedio} si interviene sulle impostazioni del componente, lo si aggiorna, se ne chiede la correzione al fornitore o lo si sostituisce.`;
  }

  const n = origine.daTerzi;
  const chiusa = accertato
    ? 'Le altre sono nel codice del sito, e le due metà si correggono in modi diversi.'
    : 'Le altre sono nel codice del sito: se risultassero da correggere, le due metà richiedono interventi diversi.';
  return `in parte da ${elenco}: ${n === 1 ? 'una occorrenza' : `${n} occorrenze`} su ${origine.totale}. ${chiusa}`;
}

/**
 * Quando una voce della checklist promette più di quanto la scansione abbia
 * fatto davvero, restituisce la frase che la smentisce.
 *
 * Le voci sono scritte una volta per tutte e dicono "Conforme ha già
 * verificato che…". È vero quando i controlli riescono, e falso quando si
 * fermano: in quel caso il testo rassicura su un lavoro non svolto, proprio
 * dove serviva il contrario.
 */
export function smentisciVerifica(id, r) {
  if (id !== 'tastiera' || !r?.tastiera) return null;
  const t = r.tastiera;
  if (t.percorsiCompleti >= t.pagine) return null;

  const fermate = t.pagine - t.percorsiCompleti;
  const dove =
    t.pagine === 1
      ? 'sull\'unica pagina analizzata'
      : `su ${plurale(fermate, 'pagina', 'pagine')} su ${t.pagine}`;
  return (
    `Il percorso con Tab non è arrivato in fondo ${dove}` +
    `${t.percorsiFermatiInUnContenitore ? ' — si è fermato dentro un contenitore, di solito un banner di consenso o una finestra modale' : ''}. ` +
    `${t.pagine === 1 ? 'Lì' : 'Su quelle pagine'} Conforme non ha verificato né la raggiungibilità degli elementi, né l'indicatore di focus, né la presenza del link di salto al contenuto: ` +
    `questa voce va svolta per intero, non come ripasso.`
  );
}

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
  // Questo conteggio e la tabella dei componenti in fondo devono tornare:
  // una prima versione contava qui i soli problemi accertati e là anche i casi
  // da guardare, e il lettore trovava due numeri diversi per la stessa cosa.
  if (r.problemiDaTerzi || r.daVerificareDaTerzi) {
    const parti = [];
    if (r.problemiDaTerzi) parti.push(`${r.problemiDaTerzi} problemi`);
    if (r.daVerificareDaTerzi) parti.push(`${r.daVerificareDaTerzi} casi da guardare`);
    righe.push(`| Con occorrenze da componenti di terze parti | ${parti.join(' e ')} |`);
  }
  righe.push(`| Occorrenze totali nel codice | ${r.occorrenzeTotali} |`);
  if (r.occorrenzeDaVerificare) {
    righe.push(`| Casi che richiedono un giudizio umano | ${r.occorrenzeDaVerificare} |`);
  }
  righe.push(`| Controlli superati | ${r.controlliSuperati ?? 0} |`);
  // Tre righe invece di una: dire "46 criteri richiedono verifica umana"
  // accanto a "33 intercettati parzialmente" sembrava una contraddizione,
  // perché i due numeri contano cose diverse. Separarli toglie l'ambiguità.
  righe.push(`| Criteri verificati per intero in automatico | ${COPERTURA.automatici} su ${COPERTURA.totale} |`);
  righe.push(`| Criteri intercettati solo in parte | ${COPERTURA.parziali} su ${COPERTURA.totale} |`);
  righe.push(`| Criteri fuori dalla portata di un controllo automatico | ${COPERTURA.manuali} su ${COPERTURA.totale} |`);
  righe.push(``);
  righe.push(`Indicazione preliminare, dai soli dati automatici: **${statoSuggerito(r)}**.`);
  righe.push(``);

  if (r.tastiera) {
    const t = r.tastiera;
    righe.push(
      `*Prova da tastiera:* la pagina è stata percorsa premendo Tab. ` +
        `${t.elementiPercorsi} elementi raggiunti, ${t.focusControllati} indicatori di focus controllati, ` +
        `${t.trappole === 0 ? 'nessuna trappola' : plurale(t.trappole, 'trappola', 'trappole')}, ` +
        `${
          t.percorsiFermatiInUnContenitore
            ? `${conArticolo(t.percorsiFermatiInUnContenitore, 'una pagina', 'pagine')} in cui il percorso si è fermato dentro un contenitore, `
            : ''
        }` +
        // Il link di salto si può dire assente solo dove il percorso è arrivato
        // in fondo. Dove si è fermato prima, "assente" significherebbe soltanto
        // che non ci siamo passati.
        `${
          t.percorsiCompleti === 0
            ? 'nessun percorso completato per intero, quindi sul link di salto al contenuto non si può dire nulla'
            : t.conSkipLink === 0
              ? `nessuna delle ${plurale(t.percorsiCompleti, 'pagina percorsa', 'pagine percorse')} per intero offre un link di salto al contenuto`
              : `link di salto al contenuto presente su ${t.conSkipLink} delle ${plurale(t.percorsiCompleti, 'pagina percorsa', 'pagine percorse')} per intero`
        }. ` +
        `Verifica i fatti meccanici, non l'usabilità: restano da controllare a mano i percorsi completi ` +
        `e la reale percepibilità dell'indicatore di focus.`
    );
    righe.push(``);
  }

  if (r.reflow) {
    const f = r.reflow;
    righe.push(
      `*Prova di reflow:* la finestra è stata ridotta a 320 px — l'equivalente di uno zoom al 400% — ` +
        `e poi è stata applicata la spaziatura del testo prevista dalla norma. ` +
        `${f.conScorrimento === 0 ? 'Nessuna pagina produce scorrimento orizzontale' : `${plurale(f.conScorrimento, 'pagina', 'pagine')} su ${f.pagine} ${f.conScorrimento === 1 ? 'produce' : 'producono'} scorrimento orizzontale, fino a ${f.scorrimentoMax} px`}; ` +
        `${f.tagliatiDallaSpaziatura === 0 ? 'nessun contenitore taglia il testo con più spaziatura' : `${plurale(f.tagliatiDallaSpaziatura, 'contenitore taglia', 'contenitori tagliano')} il testo con più spaziatura`}. ` +
        `Resta da guardare a occhio se il layout ricalcolato sia ancora comprensibile: ` +
        `una pagina può non scorrere in orizzontale e avere comunque il menu che copre il contenuto.`
    );
    righe.push(``);
  }

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
      righe.push(`Occorrenze: ${p.occorrenze} su ${plurale(p.pagine.length, 'pagina', 'pagine')}  `);
      righe.push(`Regola tecnica: \`${p.regola}\``);
      righe.push(``);

      // La correzione specifica della regola, quando esiste, è molto più utile
      // di quella del criterio: un criterio ampio come 1.3.1 copre problemi
      // diversissimi e il suo consiglio generico non aiuta a risolverne uno.
      // Chi deve mettere mano al codice: è un'informazione diversa dalla
      // gravità, e va prima della correzione perché la correzione cambia.
      const provenienza = descriviProvenienza(p.origine);
      if (provenienza) {
        righe.push(`*Da dove arriva:* ${provenienza}`);
        righe.push(``);
      }

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
          // Un elemento dentro un iframe vive in un altro documento: il
          // selettore da solo non lo trova, e non dirlo manda a cercare nel
          // posto sbagliato.
          if (e.dentroFrame?.length) {
            righe.push(``);
            righe.push(`Dentro l'iframe \`${e.dentroFrame.join(' ')}\`, quindi in un documento diverso dalla pagina.`);
          }
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

  // ── Componenti di terze parti
  //
  // Compare solo se ce ne sono. È la sezione che risponde alla domanda "e
  // questo chi lo sistema", che il resto del report lascia senza risposta.
  if (r.componentiEsterni?.length) {
    righe.push(`## Quello che non è nel codice del sito`);
    righe.push(``);
    righe.push(
      `Parte delle segnalazioni non nasce dalle pagine, ma da componenti forniti da altri e incorporati nel sito. ` +
        `Cambia chi deve intervenire, e come: un gestore del consenso si configura o si aggiorna, un modulo incorporato ` +
        `si chiede al fornitore o si sostituisce. Nessuna di queste correzioni si fa aprendo il codice del sito.`
    );
    righe.push(``);
    righe.push(`| Componente | Che cos'è | Segnalazioni | Occorrenze | Come è stato riconosciuto |`);
    righe.push(`|---|---|---|---|---|`);
    for (const c of r.componentiEsterni) {
      const come =
        c.certezza === 'certa'
          ? 'documento servito da un altro dominio'
          : 'nomi usati dal componente nel codice';
      righe.push(`| ${c.nome} | ${c.tipo || '—'} | ${c.regole} | ${c.occorrenze} | ${come} |`);
    }
    righe.push(``);
    righe.push(
      `Il riconoscimento per nome è un'ipotesi molto probabile, non una certezza, e l'elenco dei componenti ` +
        `conosciuti non è completo: un componente non riconosciuto viene attribuito al sito.`
    );
    righe.push(``);
    const t = CONTESTO_NORMATIVO.contenutiDiTerzi;
    righe.push(`**Questo non riduce l'obbligo.**`);
    righe.push(``);
    righe.push(
      `Per i soggetti della Legge Stanca un'esclusione per i contenuti di terzi esiste. ${t.condizioni} ${t.conseguenza}`
    );
    righe.push(``);
    righe.push(`${t.eaa} Stabilire quale posizione si applichi al proprio caso è una valutazione giuridica, e questo report non la sostituisce.`);
    righe.push(``);
    righe.push(`*Fonte:* ${t.fonte}`);
    righe.push(``);
  }

  // ── Casi che axe non ha saputo decidere
  if (r.daVerificare?.length) {
    righe.push(`## Da guardare: casi che il controllo automatico non ha saputo decidere`);
    righe.push(``);
    righe.push(
      `Non sono violazioni accertate, e per questo non compaiono sopra. Ma non sono ` +
        `nemmeno esiti puliti: il codice da solo non basta a decidere, e la decisione ` +
        `resta a una persona. Il caso più comune è il contrasto su sfondi con immagini o ` +
        `gradienti, dove il colore effettivo dietro il testo non è calcolabile. Ci finisce ` +
        `anche ciò che dipende dall'intenzione — una tabella larga può essere un'eccezione ` +
        `legittima, un gesto di trascinamento può servire solo a far scorrere la pagina — ` +
        `e i controlli che non sono riusciti a completarsi, che è bene sapere. ` +
        `Vanno guardati uno per uno.`
    );
    righe.push(``);

    for (const p of r.daVerificare) {
      righe.push(`### ${descriviRegola(p.regola, p.descrizioneAxe)}`);
      righe.push(``);
      righe.push(
        `Casi da controllare: ${p.occorrenze} su ${plurale(p.pagine.length, 'pagina', 'pagine')} · regola \`${p.regola}\``
      );
      righe.push(``);
      // Anche qui va detto da dove arriva. Senza, la tabella dei componenti in
      // fondo conta segnalazioni che il lettore non riesce a ritrovare: su
      // comune.milano.it dichiarava quattro voci riconducibili a OneTrust e
      // solo tre ne portavano l'indicazione.
      const daDove = descriviProvenienza(p.origine, { accertato: false });
      if (daDove) {
        righe.push(`*Da dove arriva:* ${daDove}`);
        righe.push(``);
      }
      const cor = correggiRegola(p.regola);
      if (cor) {
        // Non tutte le voci di questa sezione sono "problemi possibili": una
        // è un controllo che non si è completato, e per quella "se il problema
        // c'è, si corregge così" introduce un testo che dice l'opposto.
        righe.push(
          p.regola === 'tastiera-percorso-interrotto'
            ? `*Come completare la verifica:* ${cor}`
            : `*Se il problema c'è, si corregge così:* ${cor}`
        );
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
    // Il testo della checklist dice "Conforme ha già verificato che…", ed è
    // vero solo quando la verifica è riuscita. Su comune.milano.it il percorso
    // con Tab si fermava dopo quattro elementi e la checklist continuava a
    // dichiararlo svolto: chi legge salta la verifica più importante di tutte
    // credendola già coperta a metà. Qui la scansione smentisce sé stessa.
    const smentita = smentisciVerifica(v.id, r);
    if (smentita) {
      righe.push(`> ⚠️ **In questa scansione non è andata così.** ${smentita}`);
      righe.push(``);
    }
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
    if (reg.riferimenti?.length) {
      righe.push(`- *Riferimenti:* ${reg.riferimenti.join(' · ')}`);
    }
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
