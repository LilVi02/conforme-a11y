/**
 * Raccoglitore degli ascoltatori di eventi.
 *
 * Diversi criteri WCAG dipendono da COME la pagina reagisce agli eventi:
 * scorciatoie a tasto singolo (2.1.4), azioni che partono alla pressione
 * invece che al rilascio (2.5.2), funzioni attivate dal movimento del
 * dispositivo (2.5.4), gesti di trascinamento (2.5.1).
 *
 * Dal DOM non si vede nulla di tutto questo: gli ascoltatori registrati con
 * addEventListener non lasciano traccia negli attributi. getEventListeners()
 * esiste solo negli strumenti di sviluppo e non è raggiungibile da uno script.
 *
 * La via percorribile è sostituire addEventListener PRIMA che la pagina si
 * carichi, e annotare ogni registrazione. Lo script va iniettato con
 * page.addInitScript() prima di goto(): dopo sarebbe troppo tardi, perché gli
 * ascoltatori dei gestori di consenso e dei framework si registrano subito.
 *
 * Non altera il comportamento della pagina: annota e passa la chiamata
 * all'implementazione originale.
 */

export const RACCOGLITORE = `
(() => {
  if (window.__conforme) return;

  const registrazioni = [];
  const originale = EventTarget.prototype.addEventListener;

  const descrivi = (t) => {
    try {
      if (t === window) return { dove: 'window' };
      if (t === document) return { dove: 'document' };
      if (!t || t.nodeType !== 1) return { dove: 'altro' };
      const parti = [t.tagName.toLowerCase()];
      if (t.id) parti.push('#' + t.id);
      else if (t.className && typeof t.className === 'string') {
        const c = t.className.trim().split(/\\s+/).filter(Boolean).slice(0, 2);
        if (c.length) parti.push('.' + c.join('.'));
      }
      const html = t.outerHTML || '';
      return {
        dove: 'elemento',
        etichetta: parti.join(''),
        html: html.length > 160 ? html.slice(0, 160) + '…' : html,
        interattivo: ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName),
      };
    } catch {
      return { dove: 'sconosciuto' };
    }
  };

  EventTarget.prototype.addEventListener = function (tipo, gestore, opzioni) {
    try {
      registrazioni.push({ tipo: String(tipo), bersaglio: descrivi(this) });
    } catch {
      /* annotare non deve mai rompere la pagina */
    }
    return originale.call(this, tipo, gestore, opzioni);
  };

  window.__conforme = {
    registrazioni,
    perTipo(...tipi) {
      const cercati = new Set(tipi.map((t) => t.toLowerCase()));
      return registrazioni.filter((r) => cercati.has(r.tipo.toLowerCase()));
    },
  };
})();
`;

/**
 * Legge le registrazioni raccolte. Restituisce un elenco vuoto se lo script
 * non è stato iniettato: i controlli che se ne servono si limiteranno a non
 * dire nulla, invece di dire qualcosa di falso.
 */
export async function leggiAscoltatori(page) {
  try {
    return (await page.evaluate('window.__conforme ? window.__conforme.registrazioni : []')) || [];
  } catch {
    return [];
  }
}

/** Raggruppa gli ascoltatori per tipo di evento, con i bersagli. */
export function raggruppaPerTipo(registrazioni, ...tipi) {
  const cercati = new Set(tipi.map((t) => t.toLowerCase()));
  const trovati = registrazioni.filter((r) => cercati.has(String(r.tipo).toLowerCase()));
  // Uno stesso elemento può registrare lo stesso evento più volte: conta una.
  const visti = new Set();
  return trovati.filter((r) => {
    const chiave = r.tipo + '|' + (r.bersaglio?.etichetta || r.bersaglio?.dove);
    if (visti.has(chiave)) return false;
    visti.add(chiave);
    return true;
  });
}
