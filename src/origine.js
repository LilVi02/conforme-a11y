/**
 * Da dove arriva il problema: dal sito, o da un componente di terze parti.
 *
 * Perché serve. Un report che dice "il tuo sito ha tredici problemi" mette
 * sullo stesso piano cose che si correggono in modi diversissimi. Su
 * comune.milano.it quattro segnalazioni su tredici non nascono dal codice del
 * Comune: vengono dal gestore del consenso ai cookie e da un modulo di
 * iscrizione incorporato da un fornitore esterno. Chi riceve quel report non
 * può aprire un editor e sistemarle: deve cambiare le impostazioni del
 * componente, aggiornarlo, chiederne la correzione al fornitore o sostituirlo.
 * Sapere quale delle due cose si ha davanti cambia il preventivo, il tempo e
 * la persona a cui assegnare il lavoro.
 *
 * Quello che l'attribuzione NON è. Non è una scusante. Per i soggetti della
 * Legge Stanca la direttiva (UE) 2016/2102 esclude i contenuti di terzi
 * all'articolo 1, paragrafo 4, lettera e), ma a tre condizioni che devono
 * valere tutte insieme: non finanziati, non sviluppati e non sottoposti al
 * controllo del soggetto obbligato. Un gestore del consenso che il sito ha
 * scelto, pagato e configurato è sotto il suo controllo, e quindi resta
 * dentro l'obbligo. L'esclusione riguarda semmai i contenuti che arrivano da
 * fuori senza che il sito possa intervenire.
 *
 * Il codice qui sotto attribuisce; non decide se l'esclusione si applichi.
 * Quella è una valutazione giuridica che richiede di sapere chi ha pagato
 * cosa, e il report lo dice apertamente invece di suggerire una risposta.
 */

/**
 * Componenti riconosciuti dai nomi che lasciano nel codice.
 *
 * È un elenco, e un elenco non sarà mai completo: riconosce i componenti più
 * diffusi, non tutti. Un componente non riconosciuto viene attribuito al
 * sito, che è l'ipotesi prudente — meglio attribuire al sito qualcosa di
 * terzi che assolvere il sito da qualcosa di suo.
 *
 * Gli indizi sono scelti fra i prefissi che i fornitori usano per non entrare
 * in conflitto con il codice altrui: sono per costruzione poco ambigui. Dove
 * un indizio sarebbe generico — `#launcher`, `hs-`, `st-` — è stato omesso,
 * anche a costo di non riconoscere il componente.
 */
export const COMPONENTI_NOTI = [
  { nome: 'OneTrust', tipo: 'gestore del consenso ai cookie', indizi: [/onetrust[-_]/i, /\boptanon/i, /\bot-sdk[-_]/i, /#ot-anchor\b/, /\bot-pc-/i, /\botFlat\b/] },
  { nome: 'Iubenda', tipo: 'gestore del consenso ai cookie', indizi: [/iubenda/i] },
  { nome: 'Cookiebot', tipo: 'gestore del consenso ai cookie', indizi: [/CybotCookiebot/i, /CookiebotWidget/i] },
  { nome: 'Usercentrics', tipo: 'gestore del consenso ai cookie', indizi: [/usercentrics/i, /\buc-banner/i] },
  { nome: 'CookieYes', tipo: 'gestore del consenso ai cookie', indizi: [/cookieyes/i, /\bcky-/i] },
  { nome: 'Didomi', tipo: 'gestore del consenso ai cookie', indizi: [/didomi[-_.]/i] },
  { nome: 'Cookie Script', tipo: 'gestore del consenso ai cookie', indizi: [/cookiescript/i] },

  { nome: 'Google reCAPTCHA', tipo: 'verifica anti-bot', indizi: [/grecaptcha/i, /g-recaptcha/i, /recaptcha\/api/i] },
  { nome: 'hCaptcha', tipo: 'verifica anti-bot', indizi: [/hcaptcha/i] },
  { nome: 'Google Tag Manager', tipo: 'raccolta di statistiche', indizi: [/googletagmanager\.com/i] },
  { nome: 'Hotjar', tipo: 'raccolta di statistiche', indizi: [/hotjar/i, /\b_hj/i] },

  { nome: 'YouTube', tipo: 'video incorporato', indizi: [/youtube(-nocookie)?\.com\/embed/i, /\bytp-/] },
  { nome: 'Vimeo', tipo: 'video incorporato', indizi: [/player\.vimeo\.com/i] },
  { nome: 'Google Maps', tipo: 'mappa incorporata', indizi: [/google\.[a-z.]+\/maps\/embed/i, /maps\.googleapis\.com/i] },
  { nome: 'OpenStreetMap', tipo: 'mappa incorporata', indizi: [/openstreetmap\.org\/export\/embed/i] },

  { nome: 'Zendesk', tipo: 'assistenza in chat', indizi: [/zendesk/i, /zdassets\.com/i] },
  { nome: 'Intercom', tipo: 'assistenza in chat', indizi: [/intercom[-_]/i, /intercomcdn/i] },
  { nome: 'Tawk.to', tipo: 'assistenza in chat', indizi: [/tawk\.to/i, /\btawk-/i] },
  { nome: 'Crisp', tipo: 'assistenza in chat', indizi: [/crisp-client/i, /crisp\.chat/i] },
  { nome: 'Freshworks', tipo: 'assistenza in chat', indizi: [/freshworks/i, /\bfc_frame\b/] },

  { nome: 'Facebook', tipo: 'contenuto di social network', indizi: [/facebook\.com\/plugins/i, /\bfb_iframe/i, /\bfb-root\b/] },
  { nome: 'X (Twitter)', tipo: 'contenuto di social network', indizi: [/platform\.twitter\.com/i, /twitter-widget/i] },
  { nome: 'Instagram', tipo: 'contenuto di social network', indizi: [/instagram\.com\/embed/i] },
  { nome: 'Trustpilot', tipo: 'recensioni incorporate', indizi: [/trustpilot/i] },

  // Le sovrapposizioni che promettono di rendere accessibile un sito senza
  // toccarlo. Riconoscerle è utile a prescindere dal giudizio: se una di
  // queste è presente, i risultati vanno letti sapendo che c'è uno strato che
  // modifica la pagina dopo il caricamento.
  { nome: 'AccessiBe', tipo: 'sovrapposizione di accessibilità', indizi: [/accessibe/i, /\bacsb[-_]/i] },
  { nome: 'UserWay', tipo: 'sovrapposizione di accessibilità', indizi: [/userway/i] },
  { nome: 'AccessiWay', tipo: 'sovrapposizione di accessibilità', indizi: [/accessiway/i] },
  { nome: 'EqualWeb', tipo: 'sovrapposizione di accessibilità', indizi: [/equalweb/i, /\bINDmenu\b/] },
];

/**
 * Riconosce un componente dai nomi che compaiono nel selettore o nel codice.
 * @returns {{nome: string, tipo: string}|null}
 */
export function riconosciComponente(...testi) {
  const testo = testi.filter(Boolean).join(' ');
  if (!testo) return null;
  for (const c of COMPONENTI_NOTI) {
    if (c.indizi.some((i) => i.test(testo))) return { nome: c.nome, tipo: c.tipo };
  }
  return null;
}

/** L'origine di una URL, o null se non è una URL utilizzabile. */
export function origineDi(url) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * Stabilisce da dove arriva una singola segnalazione.
 *
 * Due livelli di certezza, e il report li distingue perché non valgono
 * uguale. Un documento servito da un altro dominio dentro un iframe è un
 * fatto: si legge dall'indirizzo. Un componente riconosciuto dal nome delle
 * sue classi è un'ipotesi molto probabile ma pur sempre un'ipotesi.
 *
 * @param {{selettore?: string, html?: string, frameSrc?: string|null}} nodo
 * @param {string|null} originePagina
 */
export function attribuisciNodo(nodo, originePagina) {
  const { selettore, html, frameSrc } = nodo || {};

  // ── Certo: il contenuto sta dentro un documento servito da un altro dominio.
  if (frameSrc) {
    const origineFrame = origineDi(frameSrc);
    if (origineFrame && originePagina && origineFrame !== originePagina) {
      const componente = riconosciComponente(frameSrc, selettore, html);
      return {
        origine: 'terza-parte',
        certezza: 'certa',
        componente: componente?.nome || origineDi(frameSrc)?.replace(/^https?:\/\//, '') || null,
        tipo: componente?.tipo || 'documento incorporato',
        motivo: `il contenuto è dentro un documento servito da ${origineFrame}, non dal sito`,
      };
    }
  }

  // ── Probabile: il codice porta il nome di un componente conosciuto.
  const componente = riconosciComponente(selettore, html);
  if (componente) {
    return {
      origine: 'terza-parte',
      certezza: 'probabile',
      componente: componente.nome,
      tipo: componente.tipo,
      motivo: `il codice porta i nomi usati da ${componente.nome}`,
    };
  }

  return { origine: 'sito', certezza: 'predefinita', componente: null, tipo: null, motivo: null };
}

/**
 * Riassume le attribuzioni dei nodi di una regola.
 *
 * Una regola può avere occorrenze di entrambe le provenienze — il contrasto
 * insufficiente capita sia nel sito sia nel banner — e in quel caso dirlo a
 * metà sarebbe peggio che tacere: il report riporta i due numeri.
 */
export function riassumiOrigine(attribuzioni = []) {
  const terze = attribuzioni.filter((a) => a?.origine === 'terza-parte');
  if (terze.length === 0) return { tutteDalSito: true, daTerzi: 0, totale: attribuzioni.length, componenti: [] };

  const perComponente = new Map();
  for (const a of terze) {
    const chiave = a.componente || 'componente esterno';
    const e = perComponente.get(chiave);
    if (e) {
      e.occorrenze++;
      // Fra due letture della stessa provenienza vince quella dimostrata.
      if (a.certezza === 'certa') e.certezza = 'certa';
    } else {
      perComponente.set(chiave, {
        nome: chiave,
        tipo: a.tipo,
        certezza: a.certezza,
        motivo: a.motivo,
        occorrenze: 1,
      });
    }
  }

  return {
    tutteDalSito: false,
    daTerzi: terze.length,
    totale: attribuzioni.length,
    tutteDaTerzi: terze.length === attribuzioni.length,
    componenti: [...perComponente.values()].sort((a, b) => b.occorrenze - a.occorrenze),
  };
}

/**
 * Attribuisce le violazioni grezze, risolvendo gli indirizzi degli iframe.
 *
 * Va chiamata prima della normalizzazione, quando `nodes` contiene ancora
 * tutte le occorrenze: attribuire solo i cinque esempi tenuti nel report
 * darebbe conteggi sbagliati.
 *
 * axe indica i nodi dentro un frame con un `target` di più elementi: il primo
 * individua l'iframe nel documento principale, l'ultimo l'elemento al suo
 * interno. È da lì che si risale al dominio che serve quel documento.
 *
 * @param {import('playwright').Page} page
 * @param {object[]} violazioni violazioni nella forma dei risultati axe
 */
export async function attribuisciOrigine(page, violazioni = []) {
  const originePagina = origineDi(page.url());

  // Il nome del componente sta spesso su un antenato, non sull'elemento
  // segnalato: dentro il banner OneTrust un pulsante si chiama soltanto
  // "button", e l'unico posto dove compare "onetrust" è il contenitore.
  // Senza questo passaggio si riconoscevano solo i casi in cui il difetto
  // cadeva esattamente sul nodo che porta il nome.
  const firmaAntenati = async (selettori) => {
    if (!selettori.length) return {};
    try {
      return await page.evaluate((lista) => {
        const out = {};
        for (const s of lista) {
          let el = null;
          try {
            el = document.querySelector(s);
          } catch {
            el = null;
          }
          const parti = [];
          let n = el?.parentElement;
          for (let i = 0; n && i < 10; i++, n = n.parentElement) {
            if (n.id) parti.push(n.id);
            if (typeof n.className === 'string' && n.className) parti.push(n.className);
          }
          out[s] = parti.join(' ');
        }
        return out;
      }, selettori);
    } catch {
      return {};
    }
  };

  // Gli indirizzi dei frame si risolvono una volta sola: la stessa pagina può
  // avere decine di segnalazioni dentro lo stesso iframe.
  const indirizziFrame = new Map();
  const risolviFrame = async (selettore) => {
    if (indirizziFrame.has(selettore)) return indirizziFrame.get(selettore);
    let src = null;
    try {
      src = await page.getAttribute(selettore, 'src', { timeout: 1000 });
      if (src) src = new URL(src, page.url()).href;
    } catch {
      src = null;
    }
    indirizziFrame.set(selettore, src);
    return src;
  };

  // Primo giro: quello che si decide senza toccare la pagina.
  const daApprofondire = new Set();
  const stato = new Map();

  for (const v of violazioni) {
    for (const n of v.nodes || []) {
      const percorso = Array.isArray(n.target) ? n.target.map(String) : [String(n.target)];
      const selettore = percorso[percorso.length - 1];
      const frameSrc = percorso.length > 1 ? await risolviFrame(percorso[0]) : null;
      const a = attribuisciNodo({ selettore, html: n.html, frameSrc }, originePagina);
      n.origine = a;
      stato.set(n, { selettore, dentroFrame: percorso.length > 1 });
      // Un nodo già attribuito a terzi non ha bisogno di altro. Uno dentro un
      // frame nemmeno: i suoi antenati stanno in un altro documento, e
      // cercarli in questo darebbe una risposta sbagliata invece di nessuna.
      if (a.origine === 'sito' && percorso.length === 1) daApprofondire.add(selettore);
    }
  }

  // Secondo giro: una sola interrogazione della pagina per tutti i nodi
  // rimasti senza attribuzione.
  const firme = await firmaAntenati([...daApprofondire]);

  for (const v of violazioni) {
    const attribuzioni = [];
    for (const n of v.nodes || []) {
      const { selettore, dentroFrame } = stato.get(n) || {};
      if (n.origine?.origine === 'sito' && !dentroFrame && firme[selettore]) {
        const componente = riconosciComponente(firme[selettore]);
        if (componente) {
          n.origine = {
            origine: 'terza-parte',
            certezza: 'probabile',
            componente: componente.nome,
            tipo: componente.tipo,
            motivo: `l'elemento sta dentro un contenitore che porta i nomi usati da ${componente.nome}`,
          };
        }
      }
      attribuzioni.push(n.origine);
    }
    v.origine = riassumiOrigine(attribuzioni);
  }

  return violazioni;
}
