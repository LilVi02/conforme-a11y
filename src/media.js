/**
 * Media, movimento, tempo e orientamento.
 *
 * Criteri coperti: 1.2.1 (solo audio e solo video), 1.4.2 (controllo del
 * sonoro), 2.2.1 (limiti di tempo), 2.2.2 (pausa, stop, nascondi),
 * 1.3.4 (orientamento), 2.5.4 (azionamento da movimento).
 *
 * Il criterio 2.2.1 non compare qui: il ricaricamento automatico lo rileva
 * già axe con la regola meta-refresh.
 *
 * Sono tutti fatti osservabili nel documento — attributi, regole CSS,
 * ascoltatori registrati — che però axe non guarda perché esulano dalle sue
 * regole sul markup.
 *
 * Dove il giudizio è inevitabile non si emette un verdetto: si segnala che
 * c'è qualcosa da guardare. Un'animazione infinita può essere una barriera o
 * un dettaglio decorativo innocuo, e la differenza la vede una persona.
 */

import { raggruppaPerTipo } from './ascoltatori.js';

/** Raccoglie dal documento tutto ciò che serve ai controlli. */
function RILEVA() {
  const breve = (el) => {
    const t = [el.tagName.toLowerCase()];
    if (el.id) t.push('#' + el.id);
    else if (el.className && typeof el.className === 'string') {
      const c = el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2);
      if (c.length) t.push('.' + c.join('.'));
    }
    return t.join('');
  };
  const codice = (el) => {
    const h = el.outerHTML || '';
    return h.length > 200 ? h.slice(0, 200) + '…' : h;
  };

  // ── Sonoro che parte da solo
  const autoplay = [];
  for (const el of document.querySelectorAll('audio[autoplay], video[autoplay]')) {
    // Un video muto non produce suono: non copre la voce dello screen reader.
    if (el.muted || el.hasAttribute('muted')) continue;
    autoplay.push({ etichetta: breve(el), html: codice(el), tag: el.tagName.toLowerCase() });
  }

  // ── Media senza traccia di sottotitoli né trascrizione vicina
  const mediaSenzaTracce = [];
  for (const el of document.querySelectorAll('audio, video')) {
    if (el.querySelector('track')) continue;
    // Una trascrizione può stare accanto al player: cerchiamo un link o un
    // testo che la annunci nelle vicinanze, per non accusare chi l'ha messa.
    const vicino = (el.closest('figure, section, div, article') || el.parentElement);
    const testoVicino = ((vicino && vicino.textContent) || '').toLowerCase();
    const haTrascrizione = /trascrizione|transcript|sottotitol|caption|testo integrale/.test(testoVicino);
    if (haTrascrizione) continue;
    mediaSenzaTracce.push({ etichetta: breve(el), html: codice(el), tag: el.tagName.toLowerCase() });
  }

  // Il ricaricamento automatico (meta refresh) lo rileva già axe con la
  // regola meta-refresh, che ricade sullo stesso criterio 2.2.1: duplicarlo
  // qui produrrebbe due voci identiche nel report.

  // ── Animazioni che non finiscono mai
  const animazioni = [];
  for (const el of document.querySelectorAll('body *')) {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') continue;

    const durata = (v) =>
      String(v || '0s')
        .split(',')
        .map((x) => (x.trim().endsWith('ms') ? parseFloat(x) / 1000 : parseFloat(x) || 0))
        .reduce((a, b) => Math.max(a, b), 0);

    const infinita = String(s.animationIterationCount || '').split(',').some((x) => x.trim() === 'infinite');
    const durataAnim = durata(s.animationDuration);
    const durataTrans = durata(s.transitionDuration);

    // Interessa ciò che si muove da solo e non smette: oltre i 5 secondi la
    // norma chiede un comando per fermarlo.
    if (!infinita && durataAnim <= 5 && durataTrans <= 5) continue;
    if (!infinita && durataAnim === 0) continue;

    const r = el.getBoundingClientRect();
    if (r.width < 40 || r.height < 20) continue; // decorazioni minute

    animazioni.push({
      etichetta: breve(el),
      html: codice(el),
      infinita,
      durata: Math.round(Math.max(durataAnim, durataTrans) * 10) / 10,
      conTesto: (el.textContent || '').trim().length > 20,
      area: Math.round(r.width * r.height),
    });
    if (animazioni.length >= 20) break;
  }

  // ── Blocco dell'orientamento
  // Si cerca fra le regole dei fogli di stile una media query che nasconda
  // il contenuto in una delle due direzioni.
  const orientamento = [];
  try {
    for (const foglio of document.styleSheets) {
      let regole;
      try {
        regole = foglio.cssRules;
      } catch {
        continue; // foglio di un'altra origine: non leggibile
      }
      for (const regola of regole || []) {
        if (regola.type !== CSSRule.MEDIA_RULE) continue;
        const testo = String(regola.conditionText || regola.media?.mediaText || '');
        if (!/orientation\s*:\s*(portrait|landscape)/i.test(testo)) continue;
        for (const interna of regola.cssRules || []) {
          const css = String(interna.cssText || '');
          if (/display\s*:\s*none|transform\s*:\s*rotate|visibility\s*:\s*hidden/i.test(css)) {
            orientamento.push({ media: testo, regola: css.slice(0, 160) });
          }
        }
      }
    }
  } catch {
    /* niente da fare: si tace */
  }

  // ── Comandi di pausa presenti nella pagina
  //
  // Si cercano i COMANDI, non le parole. Una prima versione cercava
  // "pausa|ferma|stop" nel testo dell'intera pagina, e una frase come "non si
  // ferma mai" bastava a silenziare il controllo. Il testo di una pagina non
  // dice nulla su cosa si possa fare: lo dicono i pulsanti.
  const haComandiPausa = [
    ...document.querySelectorAll('button, a[href], [role="button"], input[type="button"], video[controls], audio[controls]'),
  ].some((el) => {
    if (['VIDEO', 'AUDIO'].includes(el.tagName)) return true; // i controlli nativi includono la pausa
    const nome = (
      (el.textContent || '') + ' ' +
      (el.getAttribute('aria-label') || '') + ' ' +
      (el.getAttribute('title') || '') + ' ' +
      (el.className && typeof el.className === 'string' ? el.className : '')
    ).toLowerCase();
    return /\bpausa\b|\bpause\b|\bferma\b|\bstop\b|\bsospendi\b/.test(nome);
  });

  // ── Rispetto di prefers-reduced-motion
  let rispettaMotoRidotto = false;
  try {
    for (const foglio of document.styleSheets) {
      let regole;
      try {
        regole = foglio.cssRules;
      } catch {
        continue;
      }
      for (const regola of regole || []) {
        if (regola.type === CSSRule.MEDIA_RULE && /prefers-reduced-motion/i.test(String(regola.conditionText || ''))) {
          rispettaMotoRidotto = true;
        }
      }
    }
  } catch {
    /* non determinabile */
  }

  return { autoplay, mediaSenzaTracce, animazioni, orientamento, haComandiPausa, rispettaMotoRidotto };
}

/**
 * @param {import('playwright').Page} page
 * @param {object[]} ascoltatori registrazioni raccolte da ascoltatori.js
 */
export async function verificaMedia(page, ascoltatori = []) {
  const violazioni = [];
  let d;
  try {
    d = await page.evaluate(`(${RILEVA.toString()})()`);
  } catch {
    return { violazioni: [], statistiche: null };
  }
  if (!d) return { violazioni: [], statistiche: null };

  // ── 1.4.2 Controllo del sonoro
  if (d.autoplay.length) {
    violazioni.push({
      id: 'media-autoplay-sonoro',
      help: 'Audio che parte automaticamente',
      impact: 'serious',
      tags: ['wcag2a', 'wcag142'],
      nodes: d.autoplay.slice(0, 5).map((e) => ({
        target: [e.etichetta],
        html: e.html,
        failureSummary: `Questo ${e.tag} parte da solo al caricamento e non è silenziato. Il suono si sovrappone alla voce dello screen reader e rende la pagina inutilizzabile a chi la ascolta.`,
      })),
    });
  }

  // ── 1.2.1 e 1.2.2 Media senza alternative
  if (d.mediaSenzaTracce.length) {
    violazioni.push({
      id: 'media-senza-alternative',
      help: 'Media senza sottotitoli né trascrizione',
      impact: 'serious',
      tags: ['wcag2a', 'wcag121'],
      nodes: d.mediaSenzaTracce.slice(0, 5).map((e) => ({
        target: [e.etichetta],
        html: e.html,
        failureSummary: `Questo ${e.tag} non ha un elemento <track> e nelle vicinanze non compare una trascrizione. Se contiene parlato, chi è sordo non ne ricava nulla.`,
      })),
    });
  }

  // ── 2.2.2 Pausa, stop, nascondi
  // Qui il giudizio è inevitabile: si segnala solo se non si vede alcun
  // comando di pausa nella pagina e l'animazione non è trascurabile.
  const animazioniRilevanti = d.animazioni.filter((a) => a.infinita && (a.conTesto || a.area > 20000));
  if (animazioniRilevanti.length && !d.haComandiPausa) {
    violazioni.push({
      id: 'movimento-senza-pausa',
      help: 'Movimento continuo senza un comando per fermarlo',
      impact: 'moderate',
      tags: ['wcag2a', 'wcag222'],
      nodes: animazioniRilevanti.slice(0, 5).map((e) => ({
        target: [e.etichetta],
        html: e.html,
        failureSummary: `Questo elemento è animato senza fine${e.conTesto ? ' e contiene testo' : ''}, e nella pagina non si trova un comando per mettere in pausa. La norma chiede che ogni movimento automatico che dura più di 5 secondi si possa fermare.${d.rispettaMotoRidotto ? ' La pagina rispetta prefers-reduced-motion, che aiuta ma non sostituisce un comando esplicito.' : ''}`,
      })),
    });
  }

  // ── 1.3.4 Orientamento
  if (d.orientamento.length) {
    violazioni.push({
      id: 'orientamento-bloccato',
      help: 'Il contenuto è nascosto in uno dei due orientamenti',
      impact: 'serious',
      tags: ['wcag21aa', 'wcag134'],
      nodes: d.orientamento.slice(0, 3).map((e) => ({
        target: ['@media ' + e.media],
        html: e.regola,
        failureSummary: `Una regola CSS nasconde o ruota il contenuto in base all'orientamento dello schermo. Chi tiene il dispositivo fissato a un supporto — una carrozzina, per esempio — non può ruotarlo e resta escluso.`,
      })),
    });
  }

  // ── 2.5.4 Azionamento da movimento
  const daMovimento = raggruppaPerTipo(ascoltatori, 'devicemotion', 'deviceorientation', 'deviceorientationabsolute');
  if (daMovimento.length) {
    violazioni.push({
      id: 'azionamento-da-movimento',
      help: 'Funzioni attivate muovendo il dispositivo',
      impact: 'moderate',
      tags: ['wcag21a', 'wcag254'],
      nodes: daMovimento.slice(0, 3).map((e) => ({
        target: [e.bersaglio?.etichetta || e.bersaglio?.dove || 'window'],
        html: e.bersaglio?.html || `addEventListener('${e.tipo}', …)`,
        failureSummary: `La pagina ascolta l'evento ${e.tipo}: qualcosa si attiva scuotendo o inclinando il dispositivo. Serve un comando alternativo nell'interfaccia, e la funzione dev'essere disattivabile: chi ha tremori la farebbe partire per sbaglio, chi tiene il dispositivo fissato non potrebbe usarla.`,
      })),
    });
  }

  return {
    violazioni,
    statistiche: {
      autoplaySonoro: d.autoplay.length,
      mediaSenzaAlternative: d.mediaSenzaTracce.length,
      animazioniInfinite: d.animazioni.filter((a) => a.infinita).length,
      comandiPausaPresenti: d.haComandiPausa,
      rispettaMotoRidotto: d.rispettaMotoRidotto,
      orientamentoBloccato: d.orientamento.length > 0,
    },
  };
}
