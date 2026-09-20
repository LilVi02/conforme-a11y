/**
 * Puntatore, scorciatoie da tastiera e cambi di contesto.
 *
 * Criteri coperti: 2.1.4 (tasti di scelta rapida), 2.5.1 (movimenti del
 * puntatore), 2.5.2 (cancellazione delle azioni del puntatore),
 * 3.2.1 (al focus), 3.2.2 (all'input).
 *
 * I primi tre si leggono dagli ascoltatori registrati; gli ultimi due
 * richiedono di provare: si dà il focus a un campo, si cambia un valore, e si
 * guarda se la pagina cambia da sola.
 *
 * La prova sui cambi di contesto è deliberatamente cauta. Si osservano solo
 * segnali inequivocabili — la pagina naviga altrove, si apre una finestra, il
 * modulo viene inviato — perché "cambio di contesto" ha una definizione
 * precisa nella norma e non comprende un semplice aggiornamento visivo.
 */

import { raggruppaPerTipo } from './ascoltatori.js';

/**
 * Prova a dare il focus ai campi e a cambiarne il valore, osservando se la
 * pagina reagisce navigando o inviando.
 *
 * Non tocca moduli che sembrano fare cose serie: pagamenti, cancellazioni,
 * acquisti. Provocare un invio vero durante una scansione sarebbe un danno.
 */
function PROVA_CAMBI_CONTESTO() {
  const risultati = { alFocus: [], allInput: [], campiProvati: 0 };

  const breve = (el) => {
    const t = [el.tagName.toLowerCase()];
    if (el.id) t.push('#' + el.id);
    else if (el.name) t.push('[name="' + el.name + '"]');
    else if (el.className && typeof el.className === 'string') {
      const c = el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2);
      if (c.length) t.push('.' + c.join('.'));
    }
    return t.join('');
  };
  const codice = (el) => {
    const h = el.outerHTML || '';
    return h.length > 180 ? h.slice(0, 180) + '…' : h;
  };

  // Moduli il cui invio accidentale avrebbe conseguenze: non li tocchiamo.
  const pericoloso = (el) => {
    const f = el.form;
    const testo = ((f ? f.textContent : '') + ' ' + (f ? f.action || '' : '') + ' ' + (el.name || '')).toLowerCase();
    return /pag|acquist|ordin|checkout|cancell|elimin|delete|logout|esci|password|carta|iban/.test(testo);
  };

  // Si intercettano i modi in cui una pagina cambia contesto, senza lasciarli
  // accadere davvero: si annota il tentativo e lo si blocca.
  const tentativi = [];
  const apriOriginale = window.open;
  window.open = function (...a) {
    tentativi.push({ tipo: 'nuova finestra', dettaglio: String(a[0] || '') });
    return null;
  };
  const inviaOriginale = HTMLFormElement.prototype.submit;
  HTMLFormElement.prototype.submit = function () {
    tentativi.push({ tipo: 'invio del modulo', dettaglio: this.action || '' });
  };
  const bloccaInvio = (e) => {
    tentativi.push({ tipo: 'invio del modulo', dettaglio: (e.target && e.target.action) || '' });
    e.preventDefault();
    e.stopPropagation();
  };
  const bloccaUscita = (e) => {
    tentativi.push({ tipo: 'uscita dalla pagina', dettaglio: '' });
    e.preventDefault();
  };
  document.addEventListener('submit', bloccaInvio, true);
  window.addEventListener('beforeunload', bloccaUscita, true);

  const urlIniziale = location.href;
  const campi = [...document.querySelectorAll('input:not([type="hidden"]), select, textarea')]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.display !== 'none' && !el.disabled && !el.readOnly;
    })
    .filter((el) => !pericoloso(el))
    .slice(0, 12);

  for (const campo of campi) {
    risultati.campiProvati++;

    // ── 3.2.1 Al focus
    tentativi.length = 0;
    try {
      campo.focus();
    } catch {
      continue;
    }
    if (tentativi.length || location.href !== urlIniziale) {
      risultati.alFocus.push({
        etichetta: breve(campo),
        html: codice(campo),
        cosa: tentativi[0] ? tentativi[0].tipo : 'la pagina è cambiata di indirizzo',
      });
      continue;
    }

    // ── 3.2.2 All'input
    tentativi.length = 0;
    try {
      if (campo.tagName === 'SELECT') {
        if (campo.options.length > 1) {
          const prima = campo.selectedIndex;
          campo.selectedIndex = prima === 0 ? 1 : 0;
          campo.dispatchEvent(new Event('change', { bubbles: true }));
          campo.selectedIndex = prima;
        }
      } else if (['checkbox', 'radio'].includes(campo.type)) {
        // Non li tocchiamo: cambiarli può avere effetti voluti dall'utente.
        continue;
      } else {
        const prima = campo.value;
        campo.value = (prima || '') + 'a';
        campo.dispatchEvent(new Event('input', { bubbles: true }));
        campo.dispatchEvent(new Event('change', { bubbles: true }));
        campo.value = prima;
      }
    } catch {
      continue;
    }

    if (tentativi.length || location.href !== urlIniziale) {
      risultati.allInput.push({
        etichetta: breve(campo),
        html: codice(campo),
        cosa: tentativi[0] ? tentativi[0].tipo : 'la pagina è cambiata di indirizzo',
      });
    }
  }

  // Si rimette tutto com'era: la pagina potrebbe servire ad altri controlli.
  window.open = apriOriginale;
  HTMLFormElement.prototype.submit = inviaOriginale;
  document.removeEventListener('submit', bloccaInvio, true);
  window.removeEventListener('beforeunload', bloccaUscita, true);
  try {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  } catch {
    /* ignorabile */
  }

  return risultati;
}

/** Elementi che reagiscono al trascinamento senza un'alternativa visibile. */
function RILEVA_TRASCINAMENTO() {
  const breve = (el) => {
    const t = [el.tagName.toLowerCase()];
    if (el.id) t.push('#' + el.id);
    else if (el.className && typeof el.className === 'string') {
      const c = el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2);
      if (c.length) t.push('.' + c.join('.'));
    }
    return t.join('');
  };
  const out = [];
  for (const el of document.querySelectorAll('[draggable="true"]')) {
    const h = el.outerHTML || '';
    out.push({ etichetta: breve(el), html: h.length > 180 ? h.slice(0, 180) + '…' : h });
    if (out.length >= 5) break;
  }
  return out;
}

/**
 * @param {import('playwright').Page} page
 * @param {object[]} ascoltatori registrazioni raccolte da ascoltatori.js
 */
export async function verificaInterazione(page, ascoltatori = []) {
  const violazioni = [];

  // ── 2.1.4 Tasti di scelta rapida
  // Un ascoltatore di tastiera su document o window suggerisce scorciatoie
  // globali. Non possiamo sapere se siano a carattere singolo senza leggere
  // il codice, quindi lo diciamo come cosa da guardare, non come colpa.
  const tastieraGlobale = raggruppaPerTipo(ascoltatori, 'keydown', 'keypress', 'keyup').filter(
    (r) => r.bersaglio?.dove === 'document' || r.bersaglio?.dove === 'window'
  );
  if (tastieraGlobale.length) {
    violazioni.push({
      id: 'scorciatoie-da-verificare',
      help: 'Scorciatoie da tastiera attive su tutta la pagina',
      impact: 'minor',
      tags: ['wcag21a', 'wcag214'],
      nodes: tastieraGlobale.slice(0, 3).map((e) => ({
        target: [e.bersaglio?.dove || 'document'],
        html: `addEventListener('${e.tipo}', …)`,
        failureSummary: `La pagina ascolta i tasti su ${e.bersaglio?.dove}: ci sono scorciatoie globali. Se qualcuna si attiva con un carattere singolo, va resa disattivabile o rimappabile, oppure deve valere solo quando il componente ha il focus: chi usa il comando vocale o ha tremori le fa partire per sbaglio. Da verificare nel codice.`,
      })),
    });
  }

  // ── 2.5.2 Cancellazione delle azioni del puntatore
  const suPressione = raggruppaPerTipo(ascoltatori, 'mousedown', 'pointerdown', 'touchstart').filter(
    (r) => r.bersaglio?.dove === 'elemento' && r.bersaglio?.interattivo
  );
  if (suPressione.length) {
    violazioni.push({
      id: 'azione-alla-pressione',
      help: 'Azioni che partono alla pressione invece che al rilascio',
      impact: 'moderate',
      tags: ['wcag21a', 'wcag252'],
      nodes: suPressione.slice(0, 5).map((e) => ({
        target: [e.bersaglio?.etichetta || 'elemento'],
        html: e.bersaglio?.html || `addEventListener('${e.tipo}', …)`,
        failureSummary: `Questo elemento interattivo reagisce a ${e.tipo}, cioè nel momento in cui si preme. Chi ha tremori o imprecisione tocca per sbaglio e l'azione parte comunque, senza poterla annullare allontanando il dito. L'azione dovrebbe completarsi al rilascio, con click o pointerup. Da verificare: se ${e.tipo} serve solo a preparare qualcosa e l'azione vera avviene al rilascio, va bene così.`,
      })),
    });
  }

  // ── 2.5.1 Movimenti del puntatore
  const conGesti = raggruppaPerTipo(ascoltatori, 'touchmove', 'gesturestart', 'gesturechange', 'pointermove');
  const trascinabili = await page.evaluate(`(${RILEVA_TRASCINAMENTO.toString()})()`).catch(() => []);
  if (trascinabili.length || conGesti.length) {
    const nodi = [
      ...trascinabili.map((e) => ({
        target: [e.etichetta],
        html: e.html,
        failureSummary:
          'Questo elemento si sposta trascinandolo. Chi ha difficoltà motorie non riesce a compiere un percorso preciso col puntatore: serve un\'alternativa a tocco singolo, per esempio dei pulsanti per spostare su e giù, oppure un campo dove digitare la posizione.',
      })),
      ...conGesti.slice(0, 3).map((e) => ({
        target: [e.bersaglio?.etichetta || e.bersaglio?.dove || 'document'],
        html: e.bersaglio?.html || `addEventListener('${e.tipo}', …)`,
        failureSummary: `La pagina ascolta ${e.tipo}: qualcosa risponde a gesti di trascinamento o a più dita. Ogni funzione basata su un percorso o su gesti multipunto deve avere un'alternativa a tocco singolo. Da verificare: se serve solo a far scorrere la pagina, va bene così.`,
      })),
    ];
    if (nodi.length) {
      violazioni.push({
        id: 'gesti-senza-alternativa',
        help: 'Funzioni basate su trascinamento o gesti complessi',
        impact: 'moderate',
        tags: ['wcag21a', 'wcag251'],
        nodes: nodi.slice(0, 5),
      });
    }
  }

  // ── 3.2.1 e 3.2.2 Cambi di contesto
  let cambi = { alFocus: [], allInput: [], campiProvati: 0 };
  try {
    cambi = await page.evaluate(`(${PROVA_CAMBI_CONTESTO.toString()})()`);
  } catch {
    /* la prova non è riuscita: non si dice nulla */
  }

  if (cambi.alFocus?.length) {
    violazioni.push({
      id: 'cambio-contesto-al-focus',
      help: 'La pagina cambia solo arrivando su un campo',
      impact: 'serious',
      tags: ['wcag2a', 'wcag321'],
      nodes: cambi.alFocus.slice(0, 5).map((e) => ({
        target: [e.etichetta],
        html: e.html,
        failureSummary: `Il solo arrivare su questo campo con Tab provoca ${e.cosa}. Chi naviga da tastiera attraversa i campi per leggerli: se ognuno fa partire qualcosa, si perde l'orientamento e non si riesce più a compilare.`,
      })),
    });
  }

  if (cambi.allInput?.length) {
    violazioni.push({
      id: 'cambio-contesto-all-input',
      help: 'La pagina cambia da sola quando si scrive o si sceglie',
      impact: 'serious',
      tags: ['wcag2a', 'wcag322'],
      nodes: cambi.allInput.slice(0, 5).map((e) => ({
        target: [e.etichetta],
        html: e.html,
        failureSummary: `Cambiare il valore di questo campo provoca ${e.cosa} senza che nessuno l'abbia chiesto. Il caso tipico è il menu a tendina che invia il modulo appena si sceglie: chi naviga da tastiera lo attraversa con le frecce e parte alla prima voce.`,
      })),
    });
  }

  return {
    violazioni,
    statistiche: {
      campiProvati: cambi.campiProvati || 0,
      cambiAlFocus: cambi.alFocus?.length || 0,
      cambiAllInput: cambi.allInput?.length || 0,
      scorciatoieGlobali: tastieraGlobale.length,
      azioniAllaPressione: suPressione.length,
      elementiTrascinabili: trascinabili.length,
    },
  };
}
