/**
 * Verifica della navigazione da tastiera, pilotando il browser.
 *
 * Perché esiste: axe analizza il DOM da fermo e non può premere Tab. Tutti i
 * criteri sulla tastiera finiscono quindi fra quelli "da verificare a mano",
 * e restano la barriera più bloccante e meno controllata del web.
 *
 * Questo modulo preme Tab davvero e osserva cosa succede. Quattro controlli:
 *
 *   1. Raggiungibilità — gli elementi interattivi visibili ricevono il focus?
 *   2. Trappole        — il focus riesce sempre ad avanzare?
 *   3. Focus visibile  — si vede dove si è arrivati?
 *   4. Salto blocchi   — il primo Tab offre un link al contenuto?
 *
 * Quello che NON verifica, e che va detto perché è il limite del metodo:
 * osserva fatti meccanici, non usabilità. Sa dire che un elemento riceve il
 * focus, non che l'indicatore sia percepibile; sa dire che nessun elemento è
 * irraggiungibile, non che il percorso di acquisto si completi. Sposta questi
 * criteri da "non verificabile" a "parzialmente verificato", non a "conforme".
 */

/** Elementi che ci si aspetta siano raggiungibili da tastiera. */
const SELETTORE_INTERATTIVI = [
  'a[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  '[tabindex]:not([tabindex="-1"])',
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[contenteditable="true"]',
].join(',');

/**
 * Funzione eseguita nel browser: descrive un elemento in modo stabile,
 * abbastanza da ritrovarlo e da mostrarlo nel report.
 */
const DESCRIVI = `(el) => {
  if (!el || el === document.body || el === document.documentElement) return null;

  // Il selettore DEVE identificare un solo elemento: serve a ritrovarlo per
  // controllarne il focus. Un selettore generico come "a" riporterebbe sempre
  // il primo link della pagina, e il controllo verificherebbe sempre quello.
  const percorso = (n) => {
    if (n.id && document.querySelectorAll('#' + CSS.escape(n.id)).length === 1) {
      return '#' + CSS.escape(n.id);
    }
    const catena = [];
    let cur = n;
    while (cur && cur.nodeType === 1 && cur !== document.documentElement) {
      let passo = cur.tagName.toLowerCase();
      if (cur.id && document.querySelectorAll('#' + CSS.escape(cur.id)).length === 1) {
        catena.unshift('#' + CSS.escape(cur.id));
        break;
      }
      const padre = cur.parentElement;
      if (padre) {
        const fratelli = [...padre.children].filter((f) => f.tagName === cur.tagName);
        if (fratelli.length > 1) passo += ':nth-of-type(' + (fratelli.indexOf(cur) + 1) + ')';
      }
      catena.unshift(passo);
      cur = padre;
    }
    return catena.join(' > ');
  };

  // Etichetta leggibile, per il report: il percorso completo è illeggibile.
  const breve = (() => {
    const t = [el.tagName.toLowerCase()];
    if (el.id) t.push('#' + el.id);
    else if (el.className && typeof el.className === 'string') {
      const c = el.className.trim().split(/\\s+/).filter(Boolean).slice(0, 2);
      if (c.length) t.push('.' + c.join('.'));
    }
    return t.join('');
  })();

  const html = el.outerHTML || '';
  return {
    selettore: percorso(el),
    etichetta: breve,
    tag: el.tagName.toLowerCase(),
    html: html.length > 200 ? html.slice(0, 200) + '…' : html,
    testo: (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().slice(0, 60),
    href: el.getAttribute ? el.getAttribute('href') : null,
  };
}`;

/**
 * Gli stili che, cambiando, rendono visibile il focus.
 *
 * Deve essere una funzione vera, non una stringa: ElementHandle.evaluate()
 * con una stringa restituisce undefined, e il confronto fra due undefined
 * risulta sempre uguale — cioè "nessun indicatore" per qualunque elemento.
 */
function stiliFocus(el) {
  const s = getComputedStyle(el);
  return [
    s.outlineStyle, s.outlineWidth, s.outlineColor, s.outlineOffset,
    s.boxShadow, s.border, s.backgroundColor, s.color,
    s.textDecoration, s.transform, s.filter,
    // Alcuni siti segnalano il focus spostando l'elemento (tipico dei link
    // "salta al contenuto") o cambiandone visibilità e dimensioni.
    s.left, s.top, s.position, s.opacity, s.visibility, s.width, s.height,
  ].join('|');
}

/**
 * Percorre la pagina con Tab e registra dove arriva il focus.
 * @returns {Promise<{sequenza: object[], trappola: object|null, tabPremuti: number}>}
 */
async function percorriConTab(page, maxTab) {
  const sequenza = [];
  let trappola = null;

  // Si parte dall'inizio del documento, come farebbe una persona che carica
  // la pagina e preme Tab la prima volta.
  await page.evaluate(() => {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    document.body.setAttribute('tabindex', '-1');
    document.body.focus();
    document.body.removeAttribute('tabindex');
  });

  let precedente = null;
  let fermiSuStesso = 0;

  for (let i = 0; i < maxTab; i++) {
    await page.keyboard.press('Tab');

    const corrente = await page.evaluate(`(${DESCRIVI})(document.activeElement)`).catch(() => null);

    // Focus uscito dalla pagina (barra del browser): il giro è finito.
    if (!corrente) break;

    const chiave = corrente.selettore + '|' + corrente.testo;

    // Trappola vera: Tab non sposta più il focus.
    if (precedente === chiave) {
      fermiSuStesso++;
      // Tre tentativi a vuoto: non è un caso.
      if (fermiSuStesso >= 3) {
        trappola = { ...corrente, dopoTab: i + 1 };
        break;
      }
    } else {
      fermiSuStesso = 0;
    }

    // Tornati al primo elemento: il ciclo si è chiuso, la pagina è percorsa.
    if (sequenza.length > 1 && chiave === sequenza[0].selettore + '|' + sequenza[0].testo) break;

    sequenza.push(corrente);
    precedente = chiave;
  }

  return { sequenza, trappola, tabPremuti: sequenza.length };
}

/**
 * Fotografa l'elemento con un margine attorno.
 *
 * Serve perché l'outline del focus viene disegnato FUORI dal riquadro
 * dell'elemento: element.screenshot() lo taglierebbe via, e l'indicatore più
 * diffuso al mondo risulterebbe assente.
 */
async function ritaglioConMargine(page, el, margine = 6) {
  try {
    const box = await el.boundingBox();
    if (!box) return null;
    const vp = page.viewportSize() || { width: 1280, height: 720 };
    const clip = {
      x: Math.max(0, box.x - margine),
      y: Math.max(0, box.y - margine),
      width: Math.min(vp.width, box.width + margine * 2),
      height: Math.min(vp.height, box.height + margine * 2),
    };
    if (clip.width <= 0 || clip.height <= 0) return null;
    return await page.screenshot({ clip, timeout: 3000 });
  } catch {
    return null;
  }
}

/**
 * Verifica se il focus su un elemento produce un cambiamento percepibile.
 * Due passaggi: prima gli stili calcolati (veloce), poi — solo se non è
 * cambiato nulla — un confronto di immagine, che coglie anche gli indicatori
 * disegnati con pseudo-elementi.
 */
async function focusInvisibile(page, selettoreVivo) {
  try {
    const el = await page.$(selettoreVivo);
    if (!el) return null;

    await el.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});

    // Lo stato di partenza va misurato a elemento NON focalizzato, altrimenti
    // prima e dopo coincidono e si segnala un indicatore mancante che c'è.
    // Capitava al primo elemento, perché il percorso con Tab termina su di lui.
    await page.evaluate(() => {
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      document.body.setAttribute('tabindex', '-1');
      document.body.focus();
      document.body.removeAttribute('tabindex');
    });

    const prima = await el.evaluate(stiliFocus);
    const imgPrima = await ritaglioConMargine(page, el);

    await el.focus().catch(() => {});

    const dopo = await el.evaluate(stiliFocus);
    if (prima !== dopo) return false; // qualcosa è cambiato: indicatore presente

    const imgDopo = await ritaglioConMargine(page, el);
    if (!imgPrima || !imgDopo) return null; // non verificabile, non lo diciamo

    // Immagini identite byte per byte: sullo schermo non cambia nulla.
    return Buffer.compare(imgPrima, imgDopo) === 0;
  } catch {
    return null;
  }
}

/**
 * Esegue i controlli da tastiera su una pagina già caricata.
 *
 * @param {import('playwright').Page} page
 * @param {{maxTab?: number, maxFocusDaControllare?: number}} opzioni
 * @returns {Promise<{violazioni: object[], statistiche: object}>}
 *   Le violazioni hanno la forma dei risultati axe, così da attraversare la
 *   stessa pipeline di normalizzazione e finire nello stesso report.
 */
export async function verificaTastiera(page, opzioni = {}) {
  const { maxTab = 150, maxFocusDaControllare = 25 } = opzioni;
  const violazioni = [];

  // ── Elementi che ci si aspetta di raggiungere
  const attesi = await page.evaluate(
    ({ sel, descrivi }) => {
      const visibile = (el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return false;
        const s = getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
        if (el.closest('[aria-hidden="true"]')) return false;
        if (el.disabled) return false;
        return true;
      };
      const f = eval('(' + descrivi + ')');
      return [...document.querySelectorAll(sel)].filter(visibile).map(f).filter(Boolean);
    },
    { sel: SELETTORE_INTERATTIVI, descrivi: DESCRIVI }
  );

  // ── Percorso con Tab
  const { sequenza, trappola, tabPremuti } = await percorriConTab(page, maxTab);

  // ── 1. Trappola: il focus non avanza più
  if (trappola) {
    violazioni.push({
      id: 'tastiera-trappola',
      help: 'Il focus resta bloccato e non avanza',
      impact: 'critical',
      tags: ['wcag2a', 'wcag212'],
      nodes: [
        {
          target: [trappola.etichetta || trappola.selettore],
          html: trappola.html,
          failureSummary: `Dopo ${trappola.dopoTab} pressioni di Tab il focus è rimasto su questo elemento e non si è più spostato. Chi naviga da tastiera non può proseguire né uscire dalla pagina.`,
        },
      ],
    });
  }

  // ── 2. Raggiungibilità
  const raggiunti = new Set(sequenza.map((s) => s.selettore + '|' + s.testo));
  const irraggiungibili = attesi.filter((a) => !raggiunti.has(a.selettore + '|' + a.testo));

  // Se il percorso si è interrotto per una trappola, la lista non è
  // attendibile: non accusiamo elementi che semplicemente non abbiamo
  // raggiunto perché ci siamo fermati prima.
  if (!trappola && irraggiungibili.length) {
    violazioni.push({
      id: 'tastiera-irraggiungibile',
      help: 'Elementi interattivi non raggiungibili da tastiera',
      impact: 'critical',
      tags: ['wcag2a', 'wcag211'],
      nodes: irraggiungibili.slice(0, 10).map((e) => ({
        target: [e.etichetta || e.selettore],
        html: e.html,
        failureSummary: `Questo elemento è visibile e interattivo, ma premendo Tab non riceve mai il focus${e.testo ? ` ("${e.testo}")` : ''}.`,
      })),
    });
  }

  // ── 3. Focus visibile
  const senzaIndicatore = [];
  for (const el of sequenza.slice(0, maxFocusDaControllare)) {
    const invisibile = await focusInvisibile(page, el.selettore);
    if (invisibile === true) senzaIndicatore.push(el);
  }

  if (senzaIndicatore.length) {
    violazioni.push({
      id: 'tastiera-focus-invisibile',
      help: 'Nessun indicatore visibile quando l\'elemento riceve il focus',
      impact: 'serious',
      tags: ['wcag2aa', 'wcag247'],
      nodes: senzaIndicatore.slice(0, 10).map((e) => ({
        target: [e.etichetta || e.selettore],
        html: e.html,
        failureSummary:
          'Dando il focus a questo elemento non cambia nulla, né negli stili né sullo schermo: chi naviga da tastiera non vede dove si trova.',
      })),
    });
  }

  // ── 4. Salto blocchi
  const primo = sequenza[0];
  const haSkipLink =
    primo && primo.tag === 'a' && typeof primo.href === 'string' && primo.href.startsWith('#') && primo.href.length > 1;

  if (sequenza.length > 15 && !haSkipLink) {
    violazioni.push({
      id: 'tastiera-senza-salto-blocchi',
      help: 'Nessun link per saltare direttamente al contenuto',
      impact: 'serious',
      tags: ['wcag2a', 'wcag241'],
      nodes: [
        {
          target: [primo ? (primo.etichetta || primo.selettore) : 'body'],
          html: primo ? primo.html : '',
          failureSummary: `Il primo elemento che riceve il focus non è un link interno alla pagina. Con ${sequenza.length} elementi da attraversare, chi naviga da tastiera deve percorrere l'intera navigazione a ogni pagina prima di arrivare al contenuto.`,
        },
      ],
    });
  }

  return {
    violazioni,
    statistiche: {
      elementiAttesi: attesi.length,
      elementiRaggiunti: sequenza.length,
      tabPremuti,
      trappolaTrovata: Boolean(trappola),
      focusControllati: Math.min(sequenza.length, maxFocusDaControllare),
      senzaIndicatore: senzaIndicatore.length,
      skipLink: haSkipLink,
    },
  };
}
