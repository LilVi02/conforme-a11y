/**
 * Verifica di reflow, zoom e spaziatura del testo.
 *
 * Criteri coperti: 1.4.10 (ricalcolo del flusso), 1.4.12 (spaziatura del
 * testo) e in parte 1.4.4 (ridimensionamento del testo).
 *
 * axe non può farlo: sono prove che richiedono di ridimensionare la finestra
 * e di modificare gli stili, poi guardare che cosa si rompe. Servono un
 * browser vero e un po' di pazienza.
 *
 * Il metodo è deterministico e non richiede alcun modello: si misura la
 * larghezza del contenuto, si inietta il CSS previsto dalle WCAG e si
 * confronta che cosa viene tagliato prima e dopo. Nessun giudizio, solo
 * misure.
 *
 * Quello che resta fuori: se il layout ricalcolato sia ANCORA COMPRENSIBILE.
 * Una pagina può non produrre scorrimento orizzontale e avere comunque il
 * menu che copre il contenuto. Quello lo vede solo una persona.
 */

/** Larghezza a cui le WCAG chiedono che il contenuto non scorra in orizzontale. */
const LARGHEZZA_STRETTA = 320;
const ALTEZZA_STRETTA = 800;

/**
 * Qualche pixel di sbordo è quasi sempre arrotondamento o un'ombra: sotto
 * questa soglia non vale la pena disturbare chi legge il report.
 */
const TOLLERANZA_PX = 5;

/**
 * CSS di prova per il criterio 1.4.12, con i valori indicati dalla norma.
 * Sono le impostazioni che usa chi legge con difficoltà: se il layout si
 * rompe, quelle persone non possono usare il sito.
 */
const CSS_SPAZIATURA = `
  * {
    line-height: 1.5 !important;
    letter-spacing: 0.12em !important;
    word-spacing: 0.16em !important;
  }
  p, li, blockquote, dd, figcaption {
    margin-bottom: 2em !important;
  }
`;

/**
 * Trova gli elementi che sbordano oltre la larghezza della finestra.
 *
 * Restituisce solo i "colpevoli" veri: se un contenitore sborda, sbordano
 * anche tutti i suoi figli, ed elencarli tutti renderebbe il report
 * illeggibile. Si tengono quindi gli elementi il cui genitore sta dentro.
 */
function TROVA_SBORDANTI(tolleranza) {
  const limite = document.documentElement.clientWidth + tolleranza;
  const sbordanti = new Set();

  for (const el of document.querySelectorAll('body *')) {
    const s = getComputedStyle(el);
    // Gli elementi fissi o fuori flusso volutamente non contano.
    if (s.position === 'fixed' || s.display === 'none' || s.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > limite || r.left < -tolleranza) sbordanti.add(el);
  }

  const radici = [...sbordanti].filter((el) => {
    let p = el.parentElement;
    while (p && p !== document.body) {
      if (sbordanti.has(p)) return false;
      p = p.parentElement;
    }
    return true;
  });

  const descrivi = (el) => {
    const r = el.getBoundingClientRect();
    const t = [el.tagName.toLowerCase()];
    if (el.id) t.push('#' + el.id);
    else if (el.className && typeof el.className === 'string') {
      const c = el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2);
      if (c.length) t.push('.' + c.join('.'));
    }
    const html = el.outerHTML || '';
    // Tabelle, immagini e mappe possono legittimamente richiedere più spazio:
    // le WCAG ammettono l'eccezione per i contenuti che hanno bisogno di una
    // disposizione bidimensionale. Lo segnaliamo invece di accusare.
    const eccezionePossibile = ['TABLE', 'IMG', 'SVG', 'VIDEO', 'IFRAME', 'CANVAS', 'PRE'].includes(el.tagName)
      || Boolean(el.querySelector('table, img, svg, video, iframe, canvas, pre'));
    return {
      etichetta: t.join(''),
      html: html.length > 200 ? html.slice(0, 200) + '…' : html,
      larghezza: Math.round(r.width),
      sborda: Math.round(Math.max(r.right - document.documentElement.clientWidth, -r.left)),
      eccezionePossibile,
    };
  };

  return {
    scorrimento: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    elementi: radici.slice(0, 15).map(descrivi),
    totale: radici.length,
  };
}

/** Elementi in cui il testo viene tagliato dal contenitore. */
function TROVA_TAGLIATI() {
  const tagliati = [];
  for (const el of document.querySelectorAll('body *')) {
    const s = getComputedStyle(el);
    if (!['hidden', 'clip'].includes(s.overflowY) && !['hidden', 'clip'].includes(s.overflow)) continue;
    if (s.display === 'none' || s.visibility === 'hidden') continue;
    // Deve contenere testo proprio, non solo figli.
    const testo = (el.textContent || '').trim();
    if (testo.length < 10) continue;
    if (el.scrollHeight > el.clientHeight + 2) {
      const t = [el.tagName.toLowerCase()];
      if (el.id) t.push('#' + el.id);
      else if (el.className && typeof el.className === 'string') {
        const c = el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2);
        if (c.length) t.push('.' + c.join('.'));
      }
      const html = el.outerHTML || '';
      tagliati.push({
        chiave: t.join('') + '|' + testo.slice(0, 40),
        etichetta: t.join(''),
        html: html.length > 200 ? html.slice(0, 200) + '…' : html,
        altezzaVisibile: el.clientHeight,
        altezzaReale: el.scrollHeight,
        altezzaFissa: s.height !== 'auto' && !s.height.includes('%'),
      });
    }
  }
  return tagliati;
}

/**
 * Esegue le prove su una pagina già caricata.
 *
 * Attenzione: ridimensiona la finestra e inietta CSS. Va quindi eseguita
 * dopo axe e dopo la prova da tastiera, e ripristina lo stato alla fine.
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<{violazioni: object[], statistiche: object}>}
 */
export async function verificaReflow(page, opzioni = {}) {
  const { attesaRiflusso = 400 } = opzioni;
  const violazioni = [];
  const viewportIniziale = page.viewportSize();

  let reflow = null;
  let tagliatiNuovi = [];

  try {
    // ── 1.4.10 — nessuno scorrimento orizzontale a 320 px
    await page.setViewportSize({ width: LARGHEZZA_STRETTA, height: ALTEZZA_STRETTA });
    await page.waitForTimeout(attesaRiflusso);

    reflow = await page.evaluate(
      ([fn, toll]) => eval('(' + fn + ')')(toll),
      [TROVA_SBORDANTI.toString(), TOLLERANZA_PX]
    );

    if (reflow.scorrimento > TOLLERANZA_PX && reflow.elementi.length) {
      const sicuri = reflow.elementi.filter((e) => !e.eccezionePossibile);
      const daValutare = reflow.elementi.filter((e) => e.eccezionePossibile);

      if (sicuri.length) {
        violazioni.push({
          id: 'reflow-scorrimento-orizzontale',
          help: 'Scorrimento orizzontale a 320 px di larghezza',
          impact: 'serious',
          tags: ['wcag21aa', 'wcag1410'],
          nodes: sicuri.slice(0, 10).map((e) => ({
            target: [e.etichetta],
            html: e.html,
            failureSummary: `A 320 px di larghezza — quanto si ottiene ingrandendo al 400% — questo elemento è largo ${e.larghezza} px e sborda di ${e.sborda} px, costringendo a scorrere in orizzontale per leggere.`,
          })),
        });
      }

      // I contenuti che richiedono una disposizione bidimensionale sono
      // un'eccezione prevista dalla norma: vanno guardati, non accusati.
      if (daValutare.length) {
        violazioni.push({
          id: 'reflow-da-valutare',
          help: 'Contenuti larghi che potrebbero rientrare nelle eccezioni',
          impact: 'moderate',
          tags: ['wcag21aa', 'wcag1410'],
          nodes: daValutare.slice(0, 5).map((e) => ({
            target: [e.etichetta],
            html: e.html,
            failureSummary: `Sborda di ${e.sborda} px a 320 px di larghezza, ma contiene una tabella, un'immagine o un blocco preformattato. Le WCAG ammettono l'eccezione per i contenuti che richiedono davvero una disposizione bidimensionale: va stabilito caso per caso se questo sia uno di quelli.`,
          })),
        });
      }
    }

    // ── 1.4.12 — la spaziatura del testo non deve rompere il layout
    await page.setViewportSize(viewportIniziale || { width: 1280, height: 720 });
    await page.waitForTimeout(attesaRiflusso);

    // Si misura PRIMA, per non attribuire alla spaziatura un testo che era
    // già tagliato di suo.
    const tagliatiPrima = await page.evaluate(`(${TROVA_TAGLIATI.toString()})()`);
    const chiaviPrima = new Set(tagliatiPrima.map((t) => t.chiave));

    await page.addStyleTag({ content: CSS_SPAZIATURA });
    await page.waitForTimeout(attesaRiflusso);

    const tagliatiDopo = await page.evaluate(`(${TROVA_TAGLIATI.toString()})()`);
    tagliatiNuovi = tagliatiDopo.filter((t) => !chiaviPrima.has(t.chiave));

    if (tagliatiNuovi.length) {
      violazioni.push({
        id: 'spaziatura-testo-tagliato',
        help: 'Il testo viene tagliato aumentando la spaziatura',
        impact: 'serious',
        tags: ['wcag21aa', 'wcag1412'],
        nodes: tagliatiNuovi.slice(0, 10).map((e) => ({
          target: [e.etichetta],
          html: e.html,
          failureSummary: `Applicando la spaziatura prevista dalla norma (interlinea 1.5, spazio fra paragrafi 2em, fra lettere 0.12em, fra parole 0.16em) il contenuto di questo elemento passa da ${e.altezzaVisibile} a ${e.altezzaReale} px e viene tagliato${e.altezzaFissa ? ', perché il contenitore ha un\'altezza fissa' : ''}.`,
        })),
      });
    }
  } catch {
    // Una prova che non riesce non deve far cadere l'intera scansione.
  } finally {
    // Ripristino: la pagina potrebbe servire ad altri controlli.
    try {
      if (viewportIniziale) await page.setViewportSize(viewportIniziale);
    } catch {
      /* la pagina potrebbe essere già chiusa */
    }
  }

  return {
    violazioni,
    statistiche: reflow
      ? {
          scorrimentoA320: Math.max(0, reflow.scorrimento),
          elementiSbordanti: reflow.totale,
          tagliatiDallaSpaziatura: tagliatiNuovi.length,
        }
      : null,
  };
}
