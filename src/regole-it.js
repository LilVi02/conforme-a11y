/**
 * Regole di axe-core: descrizione e correzione in italiano.
 *
 * Perché questo file esiste in questa forma — e la ragione viene da una prova
 * sul campo, non da un'idea a tavolino:
 *
 * Il criterio WCAG dice qual è il principio violato; la regola axe dice cosa
 * è rotto davvero. Un criterio ampio come 1.3.1 ("Informazioni e
 * correlazioni") copre decine di problemi diversissimi: liste malformate,
 * ruoli ARIA orfani, tabelle senza intestazioni. Dare a tutti il consiglio
 * generico del criterio ("usa HTML semantico") non aiuta nessuno a
 * risolvere il proprio.
 *
 * Quindi: `descrizione` dice cosa è rotto, `correzione` dice come si ripara
 * QUESTA regola. Dove manca la correzione specifica, il report ricade su
 * quella del criterio, che è meglio di niente ma meno utile.
 */

export const REGOLE = {
  // ── Controlli eseguiti pilotando il browser, non da axe.
  // Nascono dal fatto che axe analizza il DOM da fermo e non può premere Tab.
  'tastiera-trappola': {
    descrizione: 'Il focus resta bloccato e non avanza',
    correzione:
      'Qualcosa intercetta il tasto Tab e riporta il focus dov\'era. Di solito è un gestore di eventi con preventDefault() su keydown, oppure una finestra modale che cicla il focus senza offrire una via d\'uscita. Ogni componente che trattiene il focus deve poter essere chiuso con Esc e restituire il focus a chi l\'ha aperto.',
  },
  'tastiera-focus-confinato': {
    descrizione: 'Il focus resta chiuso dentro un contenitore',
    correzione:
      'Un contenitore — quasi sempre un banner di consenso o una finestra modale — trattiene il focus e non lo lascia uscire. Se è una modale il comportamento è corretto, ma deve potersi chiudere con Esc restituendo il focus a chi l\'ha aperta. Se è un banner dei cookie, il focus non deve restare intrappolato: chi naviga da tastiera deve poter raggiungere il resto della pagina anche senza rispondere. Verifica il gestore di keydown che intercetta Tab.',
  },
  'tastiera-irraggiungibile': {
    descrizione: 'Elementi interattivi non raggiungibili da tastiera',
    correzione:
      'L\'elemento risponde al clic ma non compare nell\'ordine di tabulazione: quasi sempre è un <div> o uno <span> con un gestore onclick. Sostituiscilo con <button> o <a>, che sono raggiungibili da soli. Se devi tenere l\'elemento generico servono tabindex="0", un role adeguato e la gestione di Invio e Spazio in keydown.',
  },
  'tastiera-focus-invisibile': {
    descrizione: 'Nessun indicatore visibile quando l\'elemento riceve il focus',
    correzione:
      'Quasi sempre è colpa di outline: none scritto per ragioni estetiche. Non rimuovere mai l\'outline senza sostituirlo: usa :focus-visible con un indicatore evidente e contrastato, per esempio outline: 3px solid con outline-offset: 2px.',
  },
  'tastiera-senza-salto-blocchi': {
    descrizione: 'Nessun link per saltare direttamente al contenuto',
    correzione:
      'Inserisci come primo elemento del <body> un link che punti al contenuto: <a href="#main" class="salta">Vai al contenuto principale</a>, con <main id="main"> più avanti. Può restare fuori schermo finché non riceve il focus, ma non nascosto con display:none, che lo escluderebbe dalla tabulazione.',
  },
  'area-alt': {
    descrizione: 'Aree delle mappe immagine senza testo alternativo',
    correzione: 'Ogni <area> dentro una <map> ha un attributo alt che ne descrive la destinazione.',
  },
  'aria-allowed-attr': {
    descrizione: 'Attributi ARIA non ammessi sul ruolo usato',
    correzione:
      'Ogni ruolo ARIA ammette solo certi attributi. Togli quelli non previsti o cambia il ruolo: un aria-checked su un role="link", per esempio, viene ignorato e confonde.',
  },
  'aria-hidden-body': {
    descrizione: 'aria-hidden applicato al body',
    correzione: 'Rimuovi aria-hidden dal <body>: nasconde l\'intera pagina alle tecnologie assistive.',
  },
  'aria-hidden-focus': {
    descrizione: 'Elementi nascosti agli screen reader ma raggiungibili da tastiera',
    correzione:
      'Un elemento con aria-hidden="true" non deve poter ricevere il focus. Aggiungi tabindex="-1", oppure togli aria-hidden se l\'elemento serve davvero.',
  },
  'aria-input-field-name': {
    descrizione: 'Campi ARIA senza nome accessibile',
    correzione:
      'Dai un nome al campo con aria-label, oppure con aria-labelledby che punta all\'id dell\'etichetta visibile.',
  },
  'aria-required-attr': {
    descrizione: 'Attributi ARIA obbligatori mancanti',
    correzione:
      'Alcuni ruoli richiedono attributi specifici: role="checkbox" vuole aria-checked, role="slider" vuole aria-valuenow. Aggiungili, o usa l\'elemento HTML nativo che li gestisce da solo.',
  },
  'aria-required-children': {
    descrizione: 'Ruoli ARIA senza gli elementi figli richiesti',
    correzione:
      'Certi ruoli esigono figli precisi: role="list" vuole role="listitem", role="menu" vuole role="menuitem", role="tablist" vuole role="tab". Aggiungi i figli mancanti o togli il ruolo dal contenitore.',
  },
  'aria-required-parent': {
    descrizione: 'Ruoli ARIA senza l\'elemento contenitore richiesto',
    correzione:
      'Certi ruoli valgono solo dentro un contenitore preciso: role="menuitem" richiede un genitore con role="menu" o "menubar"; role="listitem" richiede role="list"; role="tab" richiede role="tablist"; role="option" richiede role="listbox". Aggiungi il ruolo al contenitore, oppure — spesso la scelta migliore — togli il ruolo dai figli e lascia che sia l\'HTML nativo (<ul>/<li>, <nav>) a descrivere la struttura.',
  },
  'aria-roles': {
    descrizione: 'Ruoli ARIA non validi',
    correzione: 'Il valore di role non esiste nella specifica: correggi il refuso o togli l\'attributo.',
  },
  'aria-toggle-field-name': {
    descrizione: 'Controlli di attivazione senza nome accessibile',
    correzione: 'Checkbox, radio e interruttori personalizzati vogliono un nome: aria-label o aria-labelledby.',
  },
  'aria-valid-attr-value': {
    descrizione: 'Valori non validi negli attributi ARIA',
    correzione:
      'Controlla i valori: aria-labelledby e aria-describedby devono puntare a id che esistono davvero nella pagina; aria-expanded accetta solo "true" o "false".',
  },
  'aria-valid-attr': {
    descrizione: 'Attributi ARIA scritti in modo errato',
    correzione: 'Refuso nel nome dell\'attributo (per esempio aria-labeledby invece di aria-labelledby).',
  },
  'autocomplete-valid': {
    descrizione: 'Attributo autocomplete non valido',
    correzione:
      'Usa i valori previsti dalla specifica HTML: "email", "name", "given-name", "tel", "street-address", "postal-code", "cc-number".',
  },
  blink: {
    descrizione: 'Uso dell\'elemento blink',
    correzione: 'Rimuovi <blink>: è obsoleto e il lampeggio è un rischio per chi soffre di epilessia fotosensibile.',
  },
  'button-name': {
    descrizione: 'Pulsanti senza testo o nome accessibile',
    correzione:
      'Un pulsante deve avere un nome: testo dentro il tag, oppure aria-label se mostra solo un\'icona. Se l\'icona è un font o un <svg>, il testo non c\'è: aggiungi aria-label="Chiudi" o simile.',
  },
  bypass: {
    descrizione: 'Nessun modo per saltare i blocchi ripetuti e arrivare al contenuto',
    correzione:
      'Aggiungi come primo elemento della pagina un link "Vai al contenuto" che punta a <main id="main">, e usa i landmark (<header>, <nav>, <main>, <footer>).',
  },
  'color-contrast': {
    descrizione: 'Contrasto insufficiente tra testo e sfondo',
    correzione:
      'Scurisci il testo o schiarisci lo sfondo fino ad almeno 4.5:1 (3:1 per testo da 18pt, o 14pt in grassetto). Su fondo bianco il grigio più chiaro ammesso è #767676.',
  },
  'definition-list': {
    descrizione: 'Liste di definizioni strutturate in modo errato',
    correzione: 'Dentro <dl> possono stare solo <dt>, <dd> e <div> che li raggruppano. Sposta fuori il resto.',
  },
  dlitem: {
    descrizione: 'Elementi di lista di definizione fuori dal contenitore corretto',
    correzione: 'Ogni <dt> e <dd> deve stare dentro un <dl>.',
  },
  'document-title': {
    descrizione: 'Pagina senza titolo',
    correzione: 'Aggiungi un <title> nel <head>, unico e descrittivo: "Contatti — Nome Organizzazione".',
  },
  'duplicate-id-aria': {
    descrizione: 'Identificatori duplicati usati da ARIA',
    correzione:
      'Due elementi hanno lo stesso id e almeno uno è puntato da aria-labelledby o aria-describedby: il riferimento diventa ambiguo. Rendi gli id unici.',
  },
  'form-field-multiple-labels': {
    descrizione: 'Campi con più etichette in conflitto',
    correzione: 'Lascia una sola <label> per campo: con più etichette lo screen reader può leggerne una sola.',
  },
  'frame-title': {
    descrizione: 'Frame o iframe senza titolo',
    correzione:
      'Aggiungi title="…" all\'<iframe> descrivendone il contenuto ("Mappa della sede", "Video di presentazione"). Senza, lo screen reader annuncia solo "frame". Se l\'iframe è puramente decorativo, aggiungi title="" e aria-hidden="true".',
  },
  'html-has-lang': {
    descrizione: 'Lingua della pagina non dichiarata',
    correzione:
      'Aggiungi lang="it" al tag <html>. Senza, lo screen reader legge l\'italiano con la pronuncia della lingua predefinita del sistema, di solito l\'inglese: il risultato è incomprensibile. Sui siti multilingua il valore cambia con la versione della pagina.',
  },
  'html-lang-valid': {
    descrizione: 'Codice di lingua non valido',
    correzione: 'Il valore di lang dev\'essere un codice BCP 47: "it", "it-IT", "en". Non "italiano".',
  },
  'html-xml-lang-mismatch': {
    descrizione: 'Attributi lang e xml:lang discordanti',
    correzione: 'Allinea i due attributi allo stesso valore, o togli xml:lang.',
  },
  'image-alt': {
    descrizione: 'Immagini senza testo alternativo',
    correzione:
      'Aggiungi alt a ogni <img>. Se l\'immagine è decorativa, alt="" vuoto (non assente): così lo screen reader la salta invece di leggerne il nome del file.',
  },
  'input-button-name': {
    descrizione: 'Pulsanti input senza valore o nome accessibile',
    correzione: 'Dai un value all\'<input type="button|submit|reset">, oppure un aria-label.',
  },
  'input-image-alt': {
    descrizione: 'Pulsanti immagine senza testo alternativo',
    correzione: 'Aggiungi alt all\'<input type="image"> descrivendo l\'azione: alt="Cerca".',
  },
  label: {
    descrizione: 'Campi di modulo senza etichetta',
    correzione:
      'Associa una <label for="id"> visibile a ogni campo. Il placeholder non è un\'etichetta: sparisce appena si scrive. Se l\'etichetta non può essere visibile, usa aria-label.',
  },
  'link-in-text-block': {
    descrizione: 'Link distinguibili solo dal colore',
    correzione:
      'Un link dentro un paragrafo deve distinguersi anche senza colore: sottolinealo, oppure porta il contrasto rispetto al testo circostante ad almeno 3:1.',
  },
  'link-name': {
    descrizione: 'Link senza testo riconoscibile',
    correzione:
      'Ogni <a> deve avere un testo riconoscibile. Se contiene solo un\'icona o un\'immagine, metti l\'alt sull\'immagine o un aria-label sul link. Un link vuoto o con solo uno <svg> non viene annunciato: lo screen reader legge l\'indirizzo, oppure niente.',
  },
  list: {
    descrizione: 'Liste strutturate in modo errato',
    correzione:
      'Dentro <ul> e <ol> possono stare direttamente solo <li> (oltre a <script> e <template>). Causa più frequente: un <div> che avvolge gli <li>, o del testo messo direttamente nella lista. Sposta il contenitore dentro l\'<li>, oppure togli <ul> se non è davvero una lista.',
  },
  listitem: {
    descrizione: 'Elementi di lista fuori da un contenitore di lista',
    correzione: 'Ogni <li> deve stare dentro <ul>, <ol> o <menu>, senza altri elementi in mezzo.',
  },
  marquee: {
    descrizione: 'Uso dell\'elemento marquee',
    correzione: 'Rimuovi <marquee>: è obsoleto e il testo in movimento non si riesce a leggere né a fermare.',
  },
  'meta-refresh': {
    descrizione: 'Ricaricamento automatico della pagina',
    correzione:
      'Togli <meta http-equiv="refresh">: ricaricare da soli fa perdere il segno a chi legge lentamente o usa uno screen reader.',
  },
  'meta-viewport': {
    descrizione: 'Zoom disabilitato dal meta viewport',
    correzione:
      'Togli user-scalable="no" e maximum-scale dal meta viewport: impediscono di ingrandire a chi ha ipovisione.',
  },
  'nested-interactive': {
    descrizione: 'Controlli interattivi annidati uno dentro l\'altro',
    correzione:
      'Un pulsante dentro un link (o viceversa) rende ambiguo cosa viene attivato. Mettili affiancati invece che annidati.',
  },
  'object-alt': {
    descrizione: 'Elementi object senza testo alternativo',
    correzione: 'Metti un testo alternativo dentro l\'<object>, o descrivilo con aria-label.',
  },
  'role-img-alt': {
    descrizione: 'Elementi con role="img" senza testo alternativo',
    correzione: 'Aggiungi aria-label all\'elemento con role="img".',
  },
  'scrollable-region-focusable': {
    descrizione: 'Aree scorrevoli non raggiungibili da tastiera',
    correzione:
      'Un contenitore con overflow che scorre deve poter ricevere il focus: aggiungi tabindex="0", altrimenti chi usa la tastiera non può scorrerlo.',
  },
  'select-name': {
    descrizione: 'Menu a tendina senza nome accessibile',
    correzione: 'Associa una <label for> al <select>, oppure aggiungi aria-label.',
  },
  'server-side-image-map': {
    descrizione: 'Mappe immagine lato server',
    correzione: 'Sostituiscile con mappe lato client (<map>/<area> con alt) o con link testuali.',
  },
  'svg-img-alt': {
    descrizione: 'SVG informativi senza testo alternativo',
    correzione:
      'Un <svg> con role="img" vuole un <title> come primo figlio, oppure un aria-label. Se è decorativo: aria-hidden="true".',
  },
  'td-headers-attr': {
    descrizione: 'Celle di tabella con riferimenti di intestazione errati',
    correzione: 'L\'attributo headers deve contenere id di <th> presenti nella stessa tabella.',
  },
  'th-has-data-cells': {
    descrizione: 'Intestazioni di tabella senza celle associate',
    correzione:
      'Ogni <th> deve avere celle di dati che gli corrispondono, e scope="col" o scope="row" per dire a cosa si riferisce.',
  },
  'valid-lang': {
    descrizione: 'Codice di lingua non valido su un elemento',
    correzione: 'Usa un codice BCP 47 valido nell\'attributo lang dell\'elemento.',
  },
  'video-caption': {
    descrizione: 'Video senza sottotitoli',
    correzione:
      'Aggiungi <track kind="captions" srclang="it" src="…"> al <video>. I sottotitoli automatici non revisionati non sono sufficienti.',
  },
};

/** Descrizione in italiano della regola, con fallback alla descrizione di axe. */
export function descriviRegola(regola, descrizioneAxe) {
  return REGOLE[regola]?.descrizione || descrizioneAxe || regola;
}

/**
 * Correzione specifica per questa regola, o null se non la conosciamo.
 * Quando è null il report ricade sulla correzione del criterio WCAG.
 */
export function correggiRegola(regola) {
  return REGOLE[regola]?.correzione || null;
}

/** Mappa compatibile con la versione precedente della libreria. */
export const REGOLE_IT = Object.fromEntries(
  Object.entries(REGOLE).map(([k, v]) => [k, v.descrizione])
);
