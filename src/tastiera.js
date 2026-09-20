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

import { percorsoUtilizzabile } from './aggrega.js';

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
  let motivoFine = 'limite';

  for (let i = 0; i < maxTab; i++) {
    await page.keyboard.press('Tab');

    const corrente = await page.evaluate(`(${DESCRIVI})(document.activeElement)`).catch(() => null);

    // Focus uscito dalla pagina (barra del browser): il giro è finito.
    if (!corrente) {
      motivoFine = 'uscito';
      break;
    }

    const chiave = corrente.selettore + '|' + corrente.testo;

    // Trappola vera: Tab non sposta più il focus.
    if (precedente === chiave) {
      fermiSuStesso++;
      // Tre tentativi a vuoto: non è un caso.
      if (fermiSuStesso >= 3) {
        trappola = { ...corrente, dopoTab: i + 1 };
        motivoFine = 'trappola';
        break;
      }
    } else {
      fermiSuStesso = 0;
    }

    // Tornati al primo elemento: il focus ha chiuso un ciclo. NON significa
    // per forza che la pagina sia stata percorsa: potrebbe essere un ciclo
    // dentro una finestra modale. Chi chiama deve distinguere i due casi.
    if (sequenza.length > 1 && chiave === sequenza[0].selettore + '|' + sequenza[0].testo) {
      motivoFine = 'ciclo';
      break;
    }

    sequenza.push(corrente);
    precedente = chiave;
  }

  return { sequenza, trappola, tabPremuti: sequenza.length, motivoFine };
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
 * Stabilisce se il focus è rimasto confinato dentro un contenitore.
 *
 * Il caso tipico è il banner dei cookie: cattura il focus e lo fa girare al
 * proprio interno. Senza questo controllo il percorso si chiude dopo pochi
 * elementi e TUTTO il resto della pagina risulta irraggiungibile — comprese
 * cose che esistono e funzionano. È successo su comune.milano.it: il report
 * dichiarava assente un link "salta al contenuto" che era lì.
 *
 * Il segnale non è una soglia ma un fatto: tutti gli elementi raggiunti
 * stanno dentro un unico contenitore, e altri elementi interattivi stanno
 * fuori da quello.
 */
async function rilevaConfinamento(page, raggiunti, attesi) {
  if (raggiunti.length === 0 || attesi.length <= raggiunti.length) return null;

  try {
    return await page.evaluate(
      ({ selRaggiunti, selAttesi, descrivi }) => {
        const nodi = selRaggiunti.map((s) => document.querySelector(s)).filter(Boolean);
        // Se i selettori non si risolvono più — la pagina è cambiata, oppure
        // il percorso ha attraversato uno shadow DOM — l'antenato calcolato su
        // quel che resta non descrive niente. Meglio non rispondere.
        if (nodi.length === 0 || nodi.length < selRaggiunti.length / 2) return null;

        // Antenato comune a tutti gli elementi raggiunti.
        let comune = nodi[0];
        for (const n of nodi.slice(1)) {
          while (comune && !comune.contains(n)) comune = comune.parentElement;
          if (!comune) return null;
        }
        if (!comune || comune === document.body || comune === document.documentElement) return null;

        // Ci sono elementi interattivi fuori da quel contenitore?
        const fuori = selAttesi
          .map((s) => document.querySelector(s))
          .filter((e) => e && !comune.contains(e));
        if (fuori.length === 0) return null;

        // Condividere un antenato non significa essere trattenuti da lui.
        // Se il percorso si ferma dopo due link, quei due link stanno dentro
        // l'intestazione: incolpare l'intestazione sarebbe inventare una causa.
        //
        // Chi trattiene il focus è sempre qualcosa che sta sopra la pagina —
        // una finestra di dialogo o uno strato sovrapposto. Se il contenitore
        // non lo è, la causa resta ignota, e va detto che resta ignota.
        const ruoloContenitore = comune.getAttribute('role');
        const stile = getComputedStyle(comune);
        const sovrapposto =
          comune.tagName === 'DIALOG' ||
          comune.getAttribute('aria-modal') === 'true' ||
          ruoloContenitore === 'dialog' ||
          ruoloContenitore === 'alertdialog' ||
          stile.position === 'fixed' ||
          stile.position === 'sticky' ||
          (stile.position === 'absolute' && Number(stile.zIndex) > 1);
        if (!sovrapposto) return null;

        const html = comune.outerHTML || '';
        const ruolo = comune.getAttribute('role');
        const etichettaAria = comune.getAttribute('aria-label');

        // L'etichetta serve a ritrovare il contenitore nel codice. Un banner di
        // consenso spesso non ha né id né classi sul nodo esterno, e la sola
        // parola "div" non aiuta nessuno: in quel caso valgono il ruolo e il
        // nome accessibile, che sono ciò che lo distingue davvero.
        const et = [comune.tagName.toLowerCase()];
        if (comune.id) et.push('#' + comune.id);
        else if (comune.className && typeof comune.className === 'string') {
          const c = comune.className.trim().split(/\s+/).filter(Boolean).slice(0, 2);
          if (c.length) et.push('.' + c.join('.'));
        }
        let etichetta = et.join('');
        if (etichetta === comune.tagName.toLowerCase()) {
          if (ruolo) etichetta += `[role="${ruolo}"]`;
          if (etichettaAria) etichetta += `[aria-label="${etichettaAria.slice(0, 40)}"]`;
        }

        // Un riferimento univoco, per poter tornare a interrogare il
        // contenitore dopo aver premuto Esc.
        const f = eval('(' + descrivi + ')');
        const descrizione = f(comune);

        return {
          etichetta,
          selettore: descrizione ? descrizione.selettore : null,
          html: html.length > 200 ? html.slice(0, 200) + '…' : html,
          ruolo: ruolo || null,
          etichettaAria: etichettaAria || null,
          elementiFuori: fuori.length,
        };
      },
      {
        selRaggiunti: raggiunti.map((r) => r.selettore),
        selAttesi: attesi.map((a) => a.selettore),
        descrivi: DESCRIVI,
      }
    );
  } catch {
    return null;
  }
}

/**
 * Il focus riesce a uscire dal contenitore?
 *
 * È la domanda che decide se quello trovato è un difetto o un comportamento
 * previsto — e, ancora prima, se è un fatto del sito o un effetto della
 * scansione.
 *
 * Perché è fatta così. Per partire dall'inizio della pagina, il percorso con
 * Tab sposta il focus sul <body>: uno stato che una persona non produce mai.
 * I gestori di consenso reagiscono proprio a quello, riportando il focus
 * dentro di sé, e il risultato era che Conforme osservava la propria
 * interferenza e la dichiarava barriera. Su comune.milano.it ha segnalato come
 * violazione bloccante del 2.1.2 un banner da cui, premendo Tab, si esce senza
 * difficoltà: verificato a mano.
 *
 * Questa prova non tocca il focus. Preme Tab e basta, come farebbe una
 * persona, e guarda se prima o poi si arriva fuori. Trenta pressioni sono
 * molte più degli elementi di qualunque banner: se in trenta non si esce, il
 * focus non gira, è chiuso. Solo allora si prova Esc, e solo se fallisce
 * anche quello si parla di violazione.
 *
 * Gli stati del focus sono tre, non due, ed è la distinzione che fa
 * funzionare la prova. "Dentro il contenitore" e "su un elemento della
 * pagina" sono chiari. Il terzo è il <body>: lì il focus non è né trattenuto
 * né arrivato da nessuna parte. Contarlo come dentro faceva dichiarare
 * barriere che non esistono; contarlo come fuori assolveva le trappole vere,
 * che il focus lo scaricano proprio sul documento prima di riprenderselo.
 * È un limbo: non conclude niente, si preme ancora Tab.
 *
 * Uscire significa una cosa sola: arrivare su un elemento vero fuori dal
 * contenitore, cioè raggiungere il resto della pagina.
 *
 * @returns {Promise<{esce: boolean|null, via: string|null}>}
 *   esce null quando la prova non è riuscita: allora non si dice nulla.
 */
async function provaUscita(page, selettoreContenitore, { maxTab = 30 } = {}) {
  if (!selettoreContenitore) return { esce: null, via: null };

  /** @returns {Promise<'fuori'|'dentro'|'limbo'>} */
  const dove = () =>
    page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return 'fuori'; // il contenitore non c'è più
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden') return 'fuori';
      const a = document.activeElement;
      if (!a || a === document.body || a === document.documentElement) return 'limbo';
      return el.contains(a) ? 'dentro' : 'fuori';
    }, selettoreContenitore);

  try {
    // ── Prima prova: solo Tab, senza toccare il focus, come farebbe una persona.
    for (let i = 0; i < maxTab; i++) {
      await page.keyboard.press('Tab');
      if ((await dove()) === 'fuori') return { esce: true, via: 'tab' };
    }

    // ── Seconda prova: Esc, che è la via d'uscita prevista per una modale.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    if ((await dove()) === 'fuori') return { esce: true, via: 'esc' };

    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      if ((await dove()) === 'fuori') return { esce: true, via: 'esc' };
    }

    return { esce: false, via: null };
  } catch {
    return { esce: null, via: null };
  }
}

/**
 * Filtri condivisi, eseguiti nel browser.
 *
 * Stanno qui in un pezzo solo perché i due controlli sulla raggiungibilità —
 * quello che percorre la pagina con Tab e quello che legge il DOM — devono
 * escludere esattamente le stesse cose. Quando le due liste divergevano, una
 * scheda governata da aria-activedescendant finiva accusata dal primo e
 * assolta dal secondo.
 */
const FILTRI = `{
  // Elementi che ricevono il focus da soli, senza bisogno di tabindex.
  nativi: 'a[href],button,input:not([type="hidden"]),select,textarea,[contenteditable="true"],[contenteditable=""]',

  visibile(el) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    const s = getComputedStyle(el);
    return !(s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0');
  },

  // Casi in cui non ricevere il focus è corretto, e segnalarli sarebbe un
  // errore: comandi disattivati, sottoalberi dichiarati fuori uso o nascosti
  // alla tecnologia assistiva, e widget compositi in cui è il contenitore a
  // tenere il focus mentre aria-activedescendant indica l'elemento corrente
  // — il modello previsto dallo standard per menu, schede ed elenchi.
  fuoriGioco(el) {
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') return true;
    if (el.closest('[aria-activedescendant]')) return true;
    if (el.closest('[inert]')) return true;
    if (el.closest('[aria-hidden="true"]')) return true;
    return false;
  },

  // Può ricevere il focus: o per natura, o perché tabindex lo dichiara.
  focalizzabile(el) {
    if (el.matches(this.nativi)) return true;
    const t = el.getAttribute('tabindex');
    return t !== null && Number(t) >= 0;
  },
}`;

/**
 * Ruoli che dichiarano un comando: chi li porta deve poter ricevere il focus.
 * `option` resta fuori di proposito: nelle listbox è quasi sempre governato da
 * aria-activedescendant, e segnalarlo produrrebbe solo rumore.
 */
const RUOLI_COMANDO = [
  'button', 'link', 'checkbox', 'radio', 'switch',
  'menuitem', 'menuitemcheckbox', 'menuitemradio',
  'tab', 'treeitem', 'combobox', 'textbox', 'searchbox',
  'slider', 'spinbutton',
];

/**
 * Elementi che non possono ricevere il focus — dimostrato dal DOM, non dedotto
 * dal percorso con Tab.
 *
 * Nasce da un errore vero: la raggiungibilità veniva stabilita soltanto
 * premendo Tab, e quando il percorso si fermava presto (un banner dei cookie,
 * una modale) tutto il resto della pagina finiva accusato. Un link "salta al
 * contenuto" perfettamente funzionante è stato segnalato come irraggiungibile
 * su comune.milano.it.
 *
 * Questo controllo non dipende dal percorso. Guarda un fatto che si legge
 * nel documento: un <div> o uno <span> con role="button" e senza tabindex non
 * entra nell'ordine di tabulazione, punto. Nessuna interazione può cambiarlo.
 *
 * Le eccezioni legittime sono escluse per costruzione: i widget compositi che
 * spostano il focus con aria-activedescendant, i sottoalberi inerti, gli
 * elementi disabilitati e quelli nascosti agli screen reader.
 */
async function rilevaNonFocalizzabili(page) {
  try {
    return await page.evaluate(
      ({ ruoli, descrivi, filtri }) => {
        const f = eval('(' + descrivi + ')');
        const q = eval('(' + filtri + ')');

        const sel = ruoli.map((r) => '[role="' + r + '"]').join(',');
        return [...document.querySelectorAll(sel)]
          .filter((el) => {
            if (el.hasAttribute('tabindex')) return false; // il focus è dichiarato
            if (q.focalizzabile(el)) return false; // lo riceve per natura
            if (q.fuoriGioco(el)) return false;
            return q.visibile(el);
          })
          .map((el) => {
            const d = f(el);
            return d ? { ...d, ruolo: el.getAttribute('role') } : null;
          })
          .filter(Boolean);
      },
      { ruoli: RUOLI_COMANDO, descrivi: DESCRIVI, filtri: FILTRI }
    );
  } catch {
    return [];
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
  //
  // Sono gli elementi che il focus dovrebbe toccare: visibili, attivi, e già
  // in grado di ricevere il focus. Chi non può riceverlo resta fuori di
  // proposito — lo segnala rilevaNonFocalizzabili, che lo dimostra dal DOM
  // invece di dedurlo, e tenerlo anche qui produrrebbe la stessa riga due
  // volte in due sezioni diverse del report.
  const attesi = await page.evaluate(
    ({ sel, descrivi, filtri }) => {
      const f = eval('(' + descrivi + ')');
      const q = eval('(' + filtri + ')');
      return [...document.querySelectorAll(sel)]
        .filter((el) => q.visibile(el) && !q.fuoriGioco(el) && q.focalizzabile(el))
        .map(f)
        .filter(Boolean);
    },
    { sel: SELETTORE_INTERATTIVI, descrivi: DESCRIVI, filtri: FILTRI }
  );

  // ── Elementi esclusi dall'ordine di tabulazione, letti dal DOM
  // Indipendente dal percorso: vale anche quando il percorso fallisce.
  const nonFocalizzabili = await rilevaNonFocalizzabili(page);

  // ── Percorso con Tab
  const { sequenza, trappola, tabPremuti, motivoFine } = await percorriConTab(page, maxTab);

  const raggiunti = new Set(sequenza.map((s) => s.selettore + '|' + s.testo));
  const nonRaggiunti = attesi.filter((a) => !raggiunti.has(a.selettore + '|' + a.testo));

  // ── Il focus è rimasto chiuso dentro un contenitore?
  // Va stabilito prima di ogni altra cosa: se il giro non ha coperto la
  // pagina, gli altri risultati non valgono e riportarli sarebbe peggio che
  // tacerli.
  //
  // Il tentativo va fatto qualunque sia stato il motivo per cui il percorso
  // si è fermato. Limitarlo al caso "ciclo" è stato un errore: su
  // comune.milano.it il giro finiva con il focus rimandato al documento —
  // motivo "uscito" — e il controllo non veniva nemmeno eseguito.
  const confinamento =
    !trappola && nonRaggiunti.length ? await rilevaConfinamento(page, sequenza, attesi) : null;

  // ── Da quel contenitore si esce davvero?
  //
  // Decide due cose insieme: se quello trovato è un difetto o il
  // comportamento previsto, e prima ancora se è un fatto del sito o un
  // effetto del modo in cui il percorso è stato avviato.
  //
  // Va provato qui, subito: preme tasti e può chiudere il contenitore,
  // quindi cambia la pagina sotto ai controlli che seguono — ma quei
  // controlli guardano elementi che, se il contenitore si chiude, non
  // riguardano più nessuno.
  const uscita = confinamento
    ? await provaUscita(page, confinamento.selettore)
    : { esce: null, via: null };

  // ── Il percorso ha davvero coperto la pagina?
  //
  // È la domanda che decide se i risultati del percorso valgono qualcosa.
  // Qualche elemento non raggiunto su molti è un'informazione: sono quelli il
  // problema. La maggioranza non raggiunta significa il contrario — il
  // problema è il percorso, e l'elenco non dice nulla sugli elementi.
  //
  // La decisione vive in aggrega.js, dove i test possono raggiungerla senza
  // avviare un browser.
  const percorsoAttendibile = percorsoUtilizzabile({
    attesi: attesi.length,
    nonRaggiunti: nonRaggiunti.length,
    trappola: Boolean(trappola),
    confinamento: Boolean(confinamento),
  });

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

  // ── 2. Il percorso si è fermato dentro un contenitore
  //
  // Qui Conforme non accusa, e la ragione merita di essere scritta per esteso
  // perché è costata due tentativi sbagliati.
  //
  // Un contenitore che trattiene il focus senza via d'uscita è una barriera
  // piena, criterio 2.1.2. Ma per stabilirlo servirebbe distinguere il
  // comportamento del sito da quello che il sito assume *a causa della
  // scansione*, e questo metodo non ci riesce. Per partire dall'inizio della
  // pagina il percorso sposta il focus sul documento, uno stato che una
  // persona non produce mai; i gestori di consenso reagiscono riprendendosi
  // il focus, e da lì in poi tutto quello che si osserva è la propria
  // interferenza.
  //
  // Su comune.milano.it Conforme ha dichiarato una violazione bloccante del
  // 2.1.2. Verificato a mano: dal banner si esce premendo Tab, senza
  // difficoltà. Una prima correzione ha aggiunto la prova con Esc, e la
  // violazione è rimasta. Una seconda ha aggiunto trenta pressioni di Tab
  // senza toccare il focus, e la violazione è rimasta ancora.
  //
  // Un controllo che sbaglia due volte sullo stesso sito reale non va tarato
  // una terza: va tolto dalle affermazioni. Quello che resta è vero e utile —
  // il percorso si è fermato lì, quindi sul resto della pagina la prova da
  // tastiera non dice nulla — e va fra le cose da guardare, dove una persona
  // decide in mezzo minuto ciò che il codice non sa decidere.
  if (confinamento) {
    const chi = confinamento.etichettaAria
      ? `"${confinamento.etichettaAria}"`
      : confinamento.ruolo
        ? `con role="${confinamento.ruolo}"`
        : confinamento.etichetta;
    const comune = `Percorrendo la pagina con Tab il focus ha toccato ${sequenza.length} elementi, tutti dentro il contenitore ${chi}, e sono rimasti fuori ${confinamento.elementiFuori} elementi interattivi. È il comportamento tipico dei gestori di consenso e delle finestre modali.`;

    // Cosa ha trovato la prova di uscita. È un'informazione, non un verdetto:
    // serve a orientare la verifica manuale, non a sostituirla.
    const esito = {
      tab: 'Premendo ancora Tab il focus ne esce, quindi non c\'è nessuna barriera: il percorso si era fermato per via dello spostamento iniziale del focus.',
      esc: 'Premendo Esc il focus si libera, che è il comportamento previsto per una finestra modale.',
    }[uscita.via];

    const nonEsce =
      uscita.esce === false
        ? 'Il controllo automatico non è riuscito a uscirne, né premendo Tab trenta volte né premendo Esc — ma questo da solo non dimostra nulla, perché è proprio lo spostamento iniziale del focus a provocare il comportamento che si sta misurando. **Va verificato a mano, e ci vuole mezzo minuto:** apri la pagina in una finestra anonima, premi Tab finché non sei dentro il contenitore, poi continua a premere Tab. Se ne esci, qui non c\'è niente da correggere. Se non ne esci nemmeno premendo Esc, è una barriera che blocca l\'intero sito e va segnalata come violazione del criterio 2.1.2.'
        : 'Non è stato possibile stabilire se da lì si esca. Va provato a mano: metti via il mouse e premi Tab ripetutamente.';

    violazioni.push({
      id: 'tastiera-percorso-interrotto',
      help: 'Il percorso con Tab non ha coperto la pagina',
      impact: 'serious',
      tags: ['wcag2a', 'wcag211', 'wcag212'],
      nodes: [
        {
          target: [confinamento.etichetta],
          html: confinamento.html,
          failureSummary: `${comune} ${esito || nonEsce} In ogni caso il controllo automatico non ha percorso il resto della pagina: su quei ${confinamento.elementiFuori} elementi non dice nulla, e vanno provati a mano.`,
        },
      ],
    });
  }

  // ── 3. Elementi fuori dall'ordine di tabulazione (dimostrato dal DOM)
  if (nonFocalizzabili.length) {
    violazioni.push({
      id: 'tastiera-non-focalizzabile',
      help: 'Comandi che non possono ricevere il focus',
      impact: 'critical',
      tags: ['wcag2a', 'wcag211'],
      nodes: nonFocalizzabili.slice(0, 10).map((e) => ({
        target: [e.etichetta || e.selettore],
        html: e.html,
        failureSummary: `Questo elemento dichiara role="${e.ruolo}", quindi si presenta come un comando, ma non è un elemento nativamente focalizzabile e non ha l'attributo tabindex: non entra nell'ordine di tabulazione e da tastiera non si può raggiungere${e.testo ? ` ("${e.testo}")` : ''}.`,
      })),
    });
  }

  // ── 4. Raggiungibilità osservata premendo Tab
  //
  // Vale solo se il percorso ha coperto la pagina. Se si è fermato per una
  // trappola, è rimasto chiuso in un contenitore o ha lasciato fuori la
  // maggioranza degli elementi, quelli non raggiunti non sono irraggiungibili:
  // semplicemente non ci siamo arrivati. Accusarli sarebbe un errore
  // grossolano — ed è esattamente l'errore che questo scanner ha commesso,
  // dichiarando assente un link "salta al contenuto" che funzionava.
  if (percorsoAttendibile && nonRaggiunti.length) {
    violazioni.push({
      id: 'tastiera-irraggiungibile',
      help: 'Elementi interattivi non raggiungibili da tastiera',
      impact: 'critical',
      tags: ['wcag2a', 'wcag211'],
      nodes: nonRaggiunti.slice(0, 10).map((e) => ({
        target: [e.etichetta || e.selettore],
        html: e.html,
        failureSummary: `Questo elemento è visibile e interattivo, ma percorrendo l'intera pagina con Tab non riceve mai il focus${e.testo ? ` ("${e.testo}")` : ''}.`,
      })),
    });
  }

  // Percorso interrotto senza una causa identificabile: va detto, perché
  // altrimenti l'assenza di segnalazioni sulla tastiera si legge come un esito
  // pulito mentre è un controllo non riuscito.
  if (!percorsoAttendibile && !trappola && !confinamento && nonRaggiunti.length) {
    violazioni.push({
      id: 'tastiera-percorso-interrotto',
      help: 'Il percorso con Tab non ha coperto la pagina',
      impact: 'serious',
      tags: ['wcag2a', 'wcag211'],
      nodes: [
        {
          target: [sequenza[0] ? sequenza[0].etichetta || sequenza[0].selettore : 'body'],
          html: sequenza[0] ? sequenza[0].html : '',
          failureSummary: `Premendo Tab il focus ha toccato ${sequenza.length} elementi su ${attesi.length} presenti nella pagina, poi il giro si è chiuso (${spiegaFine(motivoFine)}). Non è possibile dire se gli altri ${nonRaggiunti.length} siano raggiungibili: il controllo automatico non è arrivato fino a loro, e non vengono segnalati. Le cause tipiche sono un banner di consenso o una finestra modale che trattiene il focus, oppure uno script che lo riporta all'inizio del documento. Va ripetuto a mano, partendo dalla pagina nello stato in cui la trova una persona.`,
        },
      ],
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

  if (percorsoAttendibile && sequenza.length > 15 && !haSkipLink) {
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
      percorsoCompleto: percorsoAttendibile,
      confinato: Boolean(confinamento),
      motivoFine,
      elementiAttesi: attesi.length,
      elementiRaggiunti: sequenza.length,
      nonRaggiunti: nonRaggiunti.length,
      nonFocalizzabili: nonFocalizzabili.length,
      tabPremuti,
      confinamentoConUscita: uscita.esce,
      confinamentoUscitaVia: uscita.via,
      // Nessun campo dichiara più "trappola accertata": vedi il commento al
      // punto 2. Resta il fatto osservato, che è dove il percorso si è fermato.
      trappolaTrovata: Boolean(trappola),
      focusControllati: Math.min(sequenza.length, maxFocusDaControllare),
      senzaIndicatore: senzaIndicatore.length,
      // Il link di salto si può affermare presente comunque; si può dire
      // assente solo se il percorso è arrivato in fondo.
      skipLink: haSkipLink,
      skipLinkVerificato: percorsoAttendibile,
    },
  };
}

/** Traduce in italiano il motivo per cui il percorso con Tab si è fermato. */
function spiegaFine(motivo) {
  switch (motivo) {
    case 'ciclo':
      return 'il focus è tornato al primo elemento';
    case 'uscito':
      return 'il focus ha lasciato il documento';
    case 'trappola':
      return 'il focus ha smesso di spostarsi';
    default:
      return 'raggiunto il limite di pressioni previsto';
  }
}
