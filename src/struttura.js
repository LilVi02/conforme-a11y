/**
 * Ordine di lettura e vie per raggiungere le pagine.
 *
 * Criteri coperti: 1.3.2 (sequenza significativa) e 2.4.5 (differenti
 * modalità).
 *
 * Il primo si verifica confrontando l'ordine del codice con la posizione
 * reale sullo schermo: se il CSS ha riordinato i blocchi, chi ascolta la
 * pagina la riceve in un ordine diverso da chi la guarda. Il confronto è
 * deterministico e non richiede giudizio.
 *
 * Il secondo si verifica cercando le vie di accesso previste dalla norma:
 * una ricerca, una mappa del sito, le briciole di pane, un menu.
 */

/**
 * Confronta l'ordine del codice con la posizione a schermo.
 *
 * Non si guardano i figli di body: su una pagina vera il contenuto è annidato
 * dentro contenitori, e un controllo superficiale non vedrebbe nulla. Si
 * esaminano invece i contenitori flex e grid, che sono il meccanismo con cui
 * il CSS riordina davvero i blocchi — insieme alle posizioni assolute.
 */
function CONFRONTA_ORDINE() {
  const breve = (el) => {
    const t = [el.tagName.toLowerCase()];
    if (el.id) t.push('#' + el.id);
    else if (el.className && typeof el.className === 'string') {
      const c = el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2);
      if (c.length) t.push('.' + c.join('.'));
    }
    return t.join('');
  };

  const visibile = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || s.position === 'fixed') return false;
    const r = el.getBoundingClientRect();
    // La soglia in altezza serve solo a escludere separatori e righe sottili.
    // Una prima versione chiedeva 20 px e scartava i paragrafi su una riga,
    // che sono alti 18: proprio i blocchi che contano di più.
    return r.width >= 50 && r.height >= 12;
  };

  // I contenitori in cui il CSS può riordinare i figli.
  const contenitori = [...document.querySelectorAll('body *')].filter((el) => {
    const s = getComputedStyle(el);
    if (!/flex|grid/.test(s.display)) return false;
    return el.children.length >= 3;
  });

  const scambi = [];
  let blocchiConfrontati = 0;

  for (const contenitore of contenitori) {
    const figli = [...contenitore.children].filter(
      (el) => visibile(el) && (el.textContent || '').trim().length > 20
    );
    if (figli.length < 3) continue;
    blocchiConfrontati += figli.length;

    const conPosizione = figli.map((el, i) => {
      const r = el.getBoundingClientRect();
      return {
        indiceCodice: i,
        etichetta: breve(el),
        html: (el.outerHTML || '').slice(0, 160),
        top: Math.round(r.top + window.scrollY),
        left: Math.round(r.left),
        testo: (el.textContent || '').trim().slice(0, 50),
        dentro: breve(contenitore),
      };
    });

    // Ordine visivo: dall'alto al basso; a parità di riga da sinistra a
    // destra. La tolleranza evita di considerare sfalsati blocchi affiancati.
    const visivo = [...conPosizione].sort((a, b) =>
      Math.abs(a.top - b.top) > 30 ? a.top - b.top : a.left - b.left
    );

    for (let i = 0; i < visivo.length; i++) {
      const distanza = visivo[i].indiceCodice - i;
      // Solo gli spostamenti veri: uno scarto di una posizione capita per
      // margini e allineamenti, e non cambia la comprensione del discorso.
      if (Math.abs(distanza) >= 2) {
        scambi.push({
          ...visivo[i],
          posizioneVisiva: i + 1,
          posizioneNelCodice: visivo[i].indiceCodice + 1,
        });
      }
    }
    if (scambi.length >= 8) break;
  }

  return { scambi: scambi.slice(0, 5), blocchiConfrontati, contenitoriEsaminati: contenitori.length };
}

/** Cerca le vie previste per raggiungere una pagina. */
function CERCA_VIE() {
  const haRicerca = Boolean(
    document.querySelector(
      'input[type="search"], [role="search"], form[role="search"], input[name*="search" i], input[name*="cerca" i], input[id*="search" i], input[id*="cerca" i]'
    )
  );

  const testoLink = [...document.querySelectorAll('a[href]')]
    .map((a) => ((a.textContent || '') + ' ' + (a.getAttribute('title') || '')).toLowerCase())
    .join(' | ');

  const haMappaSito = /mappa del sito|sitemap|mappa sito|indice del sito/.test(testoLink);
  const haBriciole = Boolean(
    document.querySelector('[class*="breadcrumb" i], [aria-label*="breadcrumb" i], [aria-label*="briciole" i], nav ol, nav.breadcrumb')
  );
  const haMenu = Boolean(document.querySelector('nav a[href], [role="navigation"] a[href]'));
  const numeroLink = document.querySelectorAll('a[href]').length;

  return { haRicerca, haMappaSito, haBriciole, haMenu, numeroLink };
}

/**
 * @param {import('playwright').Page} page
 */
export async function verificaStruttura(page) {
  const violazioni = [];
  let ordine = { scambi: [], blocchiConfrontati: 0 };
  let vie = null;

  try {
    ordine = await page.evaluate(`(${CONFRONTA_ORDINE.toString()})()`);
    vie = await page.evaluate(`(${CERCA_VIE.toString()})()`);
  } catch {
    return { violazioni: [], statistiche: null };
  }

  // ── 1.3.2 Sequenza significativa
  if (ordine.scambi?.length) {
    violazioni.push({
      id: 'ordine-lettura-diverso',
      help: 'L\'ordine del codice non corrisponde a quello visivo',
      impact: 'serious',
      tags: ['wcag2a', 'wcag132'],
      nodes: ordine.scambi.slice(0, 5).map((e) => ({
        target: [e.etichetta],
        html: e.html,
        failureSummary: `Dentro ${e.dentro} questo blocco appare come ${e.posizioneVisiva}° sullo schermo ma è il ${e.posizioneNelCodice}° nel codice${e.testo ? ` ("${e.testo}…")` : ''}. Chi ascolta la pagina con uno screen reader la riceve nell'ordine del codice: il discorso arriva scomposto. Causa tipica: flex order, grid-area o position assoluta che riordinano i blocchi.`,
      })),
    });
  }

  // ── 2.4.5 Differenti modalità
  // Si segnala solo su pagine con navigazione consistente: su una pagina di
  // atterraggio con quattro link la norma non si applica allo stesso modo.
  if (vie && vie.numeroLink > 15) {
    const modi = [vie.haRicerca, vie.haMappaSito, vie.haBriciole, vie.haMenu].filter(Boolean).length;
    if (modi < 2) {
      const mancanti = [];
      if (!vie.haRicerca) mancanti.push('una ricerca');
      if (!vie.haMappaSito) mancanti.push('un link alla mappa del sito');
      if (!vie.haBriciole) mancanti.push('le briciole di pane');
      if (!vie.haMenu) mancanti.push('un menu di navigazione');
      violazioni.push({
        id: 'poche-vie-di-navigazione',
        help: 'Un solo modo per raggiungere le pagine',
        impact: 'moderate',
        tags: ['wcag2aa', 'wcag245'],
        nodes: [
          {
            target: ['body'],
            html: `<body> con ${vie.numeroLink} link`,
            failureSummary: `Si trova una sola via per raggiungere le pagine del sito. La norma ne chiede almeno due, perché chi fatica a orientarsi in un menu deve avere un'alternativa. Mancano: ${mancanti.join(', ')}.`,
          },
        ],
      });
    }
  }

  return {
    violazioni,
    statistiche: {
      blocchiConfrontati: ordine.blocchiConfrontati || 0,
      blocchiFuoriOrdine: ordine.scambi?.length || 0,
      ricerca: vie?.haRicerca || false,
      mappaSito: vie?.haMappaSito || false,
      briciole: vie?.haBriciole || false,
      menu: vie?.haMenu || false,
    },
  };
}
