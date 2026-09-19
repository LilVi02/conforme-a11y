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

const TAG_WCAG_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/**
 * Scansiona una singola URL.
 * @param {import('playwright').Browser} browser
 * @param {string} url
 * @param {{timeout?: number, attesa?: number}} opzioni
 */
export async function scansionaPagina(browser, url, opzioni = {}) {
  const { timeout = 30000, attesa = 1000 } = opzioni;
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
    // Molti siti caricano contenuto dopo il primo paint: diamo respiro.
    await page.waitForTimeout(attesa);

    const risultati = await new AxeBuilder({ page }).withTags(TAG_WCAG_AA).analyze();

    return {
      url,
      titolo: await page.title(),
      lingua: await page.getAttribute('html', 'lang'),
      violazioni: normalizzaViolazioni(risultati.violations),
      daVerificare: normalizzaViolazioni(risultati.incomplete),
      superati: risultati.passes.length,
      errore: null,
    };
  } catch (e) {
    return {
      url,
      titolo: null,
      lingua: null,
      violazioni: [],
      daVerificare: [],
      superati: 0,
      errore: e.message,
    };
  } finally {
    await context.close();
  }
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
