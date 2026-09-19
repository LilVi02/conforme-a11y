/**
 * Interpretazione degli argomenti da riga di comando.
 *
 * Sta in un modulo a sé, separato da cli.js, per una ragione precisa: cli.js
 * importa lo scanner, che importa Playwright. Tenere qui la logica pura
 * permette di testarla — e di riusarla — senza che sia necessario avere un
 * browser installato.
 *
 * È la stessa ragione per cui esiste aggrega.js: ciò che non ha bisogno del
 * browser non deve dipenderne.
 */

/**
 * Normalizza quello che una persona scrive in una URL utilizzabile.
 * Accetta "esempio.it", "www.esempio.it/pagina", "https://…", "file://…".
 * Restituisce null se non è plausibilmente una URL.
 */
export function normalizzaUrl(voce) {
  const s = String(voce).trim();
  if (!s) return null;

  // Senza schema si assume https, tranne per gli indirizzi locali: un server
  // di sviluppo gira quasi sempre in chiaro e un https forzato fallirebbe.
  const locale = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?([/?#]|$)/i.test(s);
  const candidata = /^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `${locale ? 'http' : 'https'}://${s}`;

  try {
    const u = new URL(candidata);
    if (!['http:', 'https:', 'file:'].includes(u.protocol)) return null;
    // Un host senza punto, e che non sia localhost, di solito è un refuso.
    if (u.protocol !== 'file:' && !u.hostname.includes('.') && u.hostname !== 'localhost') return null;
    return u.href;
  } catch {
    return null;
  }
}

/**
 * Interpreta gli argomenti. Solleva un errore leggibile sulle opzioni
 * malformate, e raccoglie in `scartati` ciò che non è una URL invece di
 * ignorarlo in silenzio.
 */
export function parseArgs(argv) {
  const opts = { urls: [], out: 'report', json: false, headless: true, file: null, help: false };
  const scartati = [];

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];

    if (a === '--help' || a === '-h') {
      opts.help = true;
    } else if (a === '--json') {
      opts.json = true;
    } else if (a === '--no-headless') {
      opts.headless = false;
    } else if (a === '--out') {
      const v = argv[++i];
      if (!v || v.startsWith('--')) throw new Error('--out richiede il nome di una cartella');
      opts.out = v;
    } else if (a === '--file') {
      const v = argv[++i];
      if (!v || v.startsWith('--')) throw new Error('--file richiede il percorso di un file');
      opts.file = v;
    } else if (a.startsWith('--')) {
      throw new Error(`Opzione sconosciuta: ${a}`);
    } else {
      const u = normalizzaUrl(a);
      if (u) opts.urls.push(u);
      else scartati.push(a);
    }
  }

  opts.scartati = scartati;
  return opts;
}

/** Legge le URL da un file di testo: una per riga, # per i commenti. */
export function urlDaTesto(testo) {
  const urls = [];
  const scartati = [];
  for (const riga of String(testo).split('\n')) {
    const pulita = riga.trim();
    if (!pulita || pulita.startsWith('#')) continue;
    const u = normalizzaUrl(pulita);
    if (u) urls.push(u);
    else scartati.push(pulita);
  }
  return { urls, scartati };
}
