/**
 * Motore di scansione: Playwright + axe-core.
 *
 * Nota dichiarata apertamente: l'analisi automatica copre solo una parte dei
 * criteri WCAG (le stime indipendenti parlano del 30-40%). Il risultato di
 * questo modulo NON è una valutazione di conformità: è la base su cui
 * innestare la verifica manuale (vedi src/manuale.js).
 *
 * La logica di aggregazione vive in aggrega.js, senza dipendenze dal browser.
 */

import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { normalizzaViolazioni, riepiloga } from './aggrega.js';
import { verificaTastiera } from './tastiera.js';
import { verificaReflow } from './reflow.js';

const TAG_WCAG_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/**
 * Scansiona una singola URL.
 * @param {import('playwright').Browser} browser
 * @param {string} url
 * @param {{timeout?: number, attesa?: number}} opzioni
 */
export async function scansionaPagina(browser, url, opzioni = {}) {
  const { timeout = 30000, attesa = 1000, tastiera = true, reflow = true } = opzioni;
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const risposta = await page.goto(url, { waitUntil: 'domcontentloaded', timeout });

    // Una pagina di errore HTTP va scartata, non analizzata.
    //
    // Senza questo controllo lo scanner analizza la pagina di errore del
    // server o della CDN come se fosse il sito, e attribuisce al cliente
    // violazioni che appartengono alla schermata d'errore di qualcun altro.
    // È successo davvero: agid.gov.it ha risposto con una pagina di errore
    // CloudFront, e il report le ha addebitato un lang mancante.
    const stato = risposta?.status();
    if (stato && stato >= 400) {
      return esitoVuoto(url, `il server ha risposto ${stato} ${risposta.statusText() || ''}`.trim());
    }

    // Molti siti caricano contenuto dopo il primo paint: diamo respiro.
    await page.waitForTimeout(attesa);

    const risultati = await new AxeBuilder({ page }).withTags(TAG_WCAG_AA).analyze();
    const titolo = await page.title();

    // La prova da tastiera va fatta dopo axe: preme davvero i tasti e sposta
    // il focus, quindi altererebbe lo stato della pagina prima dell'analisi.
    let daTastiera = { violazioni: [], statistiche: null };
    if (tastiera) {
      daTastiera = await verificaTastiera(page, opzioni).catch(() => ({
        violazioni: [],
        statistiche: null,
      }));
    }

    // Il reflow ridimensiona la finestra e inietta CSS: va per ultimo,
    // quando nessun altro controllo deve più guardare la pagina com'era.
    let daReflow = { violazioni: [], statistiche: null };
    if (reflow) {
      daReflow = await verificaReflow(page, opzioni).catch(() => ({
        violazioni: [],
        statistiche: null,
      }));
    }

    return {
      url,
      urlFinale: page.url(),
      stato: stato ?? null,
      titolo,
      lingua: await page.getAttribute('html', 'lang'),
      violazioni: normalizzaViolazioni([
        ...risultati.violations,
        ...daTastiera.violazioni,
        ...daReflow.violazioni,
      ]),
      tastiera: daTastiera.statistiche,
      reflow: daReflow.statistiche,
      // axe segnala come "incomplete" i controlli che non è riuscito a
      // decidere da solo: tipicamente il contrasto su sfondi con immagini o
      // gradienti. Non sono violazioni accertate, ma nemmeno esiti puliti:
      // vanno guardati da una persona, e quindi vanno riportati.
      daVerificare: normalizzaViolazioni(risultati.incomplete),
      superati: risultati.passes.length,
      errore: null,
      sospetto: rilevaPaginaSospetta(titolo, risultati.passes.length),
    };
  } catch (e) {
    return esitoVuoto(url, e.message);
  } finally {
    await context.close();
  }
}

/** Esito di una pagina che non è stato possibile analizzare. */
function esitoVuoto(url, errore) {
  return {
    url,
    urlFinale: null,
    stato: null,
    titolo: null,
    lingua: null,
    violazioni: [],
    daVerificare: [],
    superati: 0,
    errore,
    sospetto: null,
  };
}

/**
 * Riconosce le pagine che hanno risposto 200 ma non sono il sito richiesto:
 * schermate anti-bot, muri di consenso, pagine di manutenzione. Non le
 * scarta — potremmo sbagliarci — ma le segnala, perché un report basato su
 * una di queste non dice nulla del sito vero.
 *
 * Il numero di controlli superati è l'indizio più affidabile: una pagina
 * reale ne supera decine, una schermata di blocco pochissimi.
 */
function rilevaPaginaSospetta(titolo, superati) {
  const t = String(titolo || '').toLowerCase();

  const indizi = [
    [/(^|\W)(error|errore)(\W|$)|request could not be satisfied|access denied|forbidden/i, 'il titolo è quello di una pagina di errore'],
    [/just a moment|attendere|checking your browser|verifica.*browser|are you a robot|captcha/i, 'sembra una schermata di verifica anti-bot'],
    [/manutenzione|maintenance|temporarily unavailable|servizio non disponibile/i, 'sembra una pagina di manutenzione'],
    [/cookie|consenso|consent/i, 'il titolo parla di cookie: potrebbe essere un muro di consenso'],
  ];

  for (const [regola, motivo] of indizi) {
    if (regola.test(t)) return motivo;
  }

  // Meno di 5 controlli superati significa una pagina quasi vuota.
  if (superati < 5) return 'la pagina ha superato pochissimi controlli: probabilmente è quasi vuota';

  return null;
}

/**
 * Scansiona un elenco di URL in sequenza.
 * @param {string[]} urls
 * @param {{headless?: boolean, onProgress?: (url: string, i: number, tot: number) => void}} opzioni
 */
export async function scansiona(urls, opzioni = {}) {
  const { headless = true, onProgress } = opzioni;
  // In CI o in container si usa spesso un Chrome/Chromium già presente nel
  // sistema: CONFORME_BROWSER_PATH evita di scaricarne un secondo.
  const executablePath = opzioni.executablePath || process.env.CONFORME_BROWSER_PATH || undefined;
  const browser = await chromium.launch({ headless, executablePath });
  const pagine = [];

  try {
    for (let i = 0; i < urls.length; i++) {
      if (onProgress) onProgress(urls[i], i + 1, urls.length);
      pagine.push(await scansionaPagina(browser, urls[i], opzioni));
    }
  } finally {
    await browser.close();
  }

  return { dataScansione: new Date().toISOString(), pagine, riepilogo: riepiloga(pagine) };
}

export { riepiloga, normalizzaViolazioni } from './aggrega.js';
