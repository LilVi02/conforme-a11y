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
  'tastiera-irraggiungibile': {
    descrizione: 'Elementi interattivi non raggiungibili da tastiera',
    correzione:
      'L\'elemento risponde al clic ma non compare nell\'ordine di tabulazione: quasi sempre è un <div> o uno <span> con un gestore onclick. Sostituiscilo con <button> o <a>, che sono raggiungibili da soli. Se devi tenere l\'elemento generico servono tabindex="0", un role adeguato e la gestione di Invio e Spazio in keydown.',
  },
  'tastiera-non-focalizzabile': {
    descrizione: 'Comandi che non possono ricevere il focus',
    correzione:
      'L\'elemento dichiara un ruolo da comando — role="button", role="link", role="tab" — ma è un <div> o uno <span>, che di suo non entra nell\'ordine di tabulazione, e non ha tabindex. Da tastiera è irraggiungibile: non serve provare, lo dice il DOM. La correzione migliore è sostituirlo con <button> o <a href>, che sono focalizzabili e gestiscono Invio e Spazio da soli. Se l\'elemento generico deve restare, aggiungi tabindex="0" e un gestore di keydown per Invio e Spazio. Dentro menu, elenchi a discesa e schede è ammesso che il focus resti sul contenitore, ma allora serve aria-activedescendant.',
  },
  'tastiera-percorso-interrotto': {
    descrizione: 'Il percorso con Tab non ha coperto la pagina',
    correzione:
      'Non è un\'accusa al sito: è un controllo che non è riuscito, e che è meglio sapere non riuscito che credere superato. Premendo Tab il focus ha toccato pochi elementi e poi il giro si è chiuso, quindi sul resto della pagina la prova da tastiera non dice nulla — e infatti non segnala nulla. La causa più frequente è un banner di consenso o una finestra modale: per partire dall\'inizio della pagina il controllo sposta il focus sul documento, uno stato che una persona non produce mai, e quei componenti reagiscono riprendendoselo. Da lì in poi il controllo misura la propria interferenza, e per questo Conforme non conclude nulla da solo. Tocca a te, e sono trenta secondi: apri la pagina in una finestra anonima, premi Tab finché non sei dentro il contenitore, poi continua a premere Tab. Se ne esci, qui non c\'è niente da correggere e resta solo da percorrere a mano la parte di pagina che il controllo non ha raggiunto. Se non ne esci nemmeno premendo Esc, quella è una barriera che blocca l\'intero sito: criterio 2.1.2, e va corretta agendo sul gestore di keydown che intercetta Tab, facendo in modo che Esc chiuda il contenitore e restituisca il focus a chi l\'ha aperto.',
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
  'reflow-scorrimento-orizzontale': {
    descrizione: 'Scorrimento orizzontale a 320 px di larghezza',
    correzione:
      'Qualcosa ha una larghezza fissa che non si adatta. Cerca width in pixel sui contenitori, min-width troppo alti, tabelle o immagini senza max-width: 100%. Usa layout flessibili — flex con wrap, oppure grid con minmax — e imposta le larghezze in percentuale o con clamp(). Verifica anche che ci sia il meta viewport con width=device-width.',
  },
  'reflow-da-valutare': {
    descrizione: 'Contenuti larghi che potrebbero rientrare nelle eccezioni',
    correzione:
      'Le WCAG ammettono lo scorrimento orizzontale per i contenuti che richiedono davvero una disposizione bidimensionale: tabelle di dati, mappe, diagrammi, codice preformattato. Se è uno di questi, va bene così, ma conviene racchiuderlo in un contenitore con overflow-x: auto e role="region" più un\'etichetta, così chi naviga da tastiera può scorrerlo. Se invece è solo un blocco disegnato largo, va reso flessibile.',
  },
  'spaziatura-testo-tagliato': {
    descrizione: 'Il testo viene tagliato aumentando la spaziatura',
    correzione:
      'Il contenitore ha un\'altezza fissa che non lascia crescere il testo. Sostituisci height con min-height e togli overflow: hidden dove serve solo a nascondere il problema. Chi è dislessico o ipovedente aumenta interlinea e spaziatura con fogli di stile propri: se il layout non regge, quelle persone perdono del contenuto senza nemmeno accorgersene.',
  },
  'media-autoplay-sonoro': {
    descrizione: 'Audio che parte automaticamente',
    correzione:
      'Togli l\'attributo autoplay, oppure aggiungi muted se il video deve partire comunque. Se il suono serve, mettilo dietro un pulsante: il criterio ammette la riproduzione automatica solo entro 3 secondi, o con un comando per fermarla indipendente dal volume di sistema.',
  },
  'media-senza-alternative': {
    descrizione: 'Media senza sottotitoli né trascrizione',
    correzione:
      'Per i video con parlato aggiungi <track kind="captions" srclang="it" src="…">. Per i contenuti solo audio serve una trascrizione testuale, che può stare accanto al player o dietro un link chiaramente etichettato. I sottotitoli generati automaticamente e non revisionati non soddisfano il criterio.',
  },
  'tempo-ricaricamento-automatico': {
    descrizione: 'La pagina si ricarica da sola',
    correzione:
      'Togli il meta refresh. Se il contenuto deve aggiornarsi, fallo aggiornare da un pulsante, oppure avvisa prima della scadenza e offri la possibilità di prolungare. Un ricaricamento imprevisto fa perdere il segno a chi legge lentamente e il lavoro a chi sta compilando un modulo.',
  },
  'movimento-senza-pausa': {
    descrizione: 'Movimento continuo senza un comando per fermarlo',
    correzione:
      'Aggiungi un pulsante che metta in pausa il movimento, con un\'etichetta esplicita. Rispettare prefers-reduced-motion è buona pratica ma non basta: la norma chiede un comando raggiungibile nella pagina. In alternativa, fai durare l\'animazione meno di 5 secondi.',
  },
  'orientamento-bloccato': {
    descrizione: 'Il contenuto è nascosto in uno dei due orientamenti',
    correzione:
      'Togli la regola che nasconde o ruota il contenuto in base all\'orientamento. Il sito deve funzionare sia in verticale sia in orizzontale, salvo i casi in cui un orientamento è essenziale — un pianoforte virtuale, per dire. Chi ha il dispositivo fissato a un supporto non può girarlo.',
  },
  'azionamento-da-movimento': {
    descrizione: 'Funzioni attivate muovendo il dispositivo',
    correzione:
      'Ogni funzione attivata scuotendo o inclinando il dispositivo deve avere un comando equivalente nell\'interfaccia, e deve potersi disattivare. Chi ha tremori la fa partire senza volerlo; chi tiene il dispositivo su un supporto non può usarla affatto.',
  },
  'scorciatoie-da-verificare': {
    descrizione: 'Scorciatoie da tastiera attive su tutta la pagina',
    correzione:
      'Le scorciatoie a carattere singolo devono poter essere disattivate, rimappate, oppure valere solo quando il componente ha il focus. Chi usa il comando vocale le fa scattare parlando, chi ha tremori premendo per sbaglio. Se le tue usano già un modificatore come Ctrl o Alt, va bene così.',
  },
  'azione-alla-pressione': {
    descrizione: 'Azioni che partono alla pressione invece che al rilascio',
    correzione:
      'Sposta l\'azione da mousedown o pointerdown all\'evento click, oppure a pointerup. Così chi tocca per sbaglio può allontanare il dito e annullare. Se l\'evento sulla pressione serve solo a preparare qualcosa — evidenziare, iniziare un trascinamento — e l\'azione vera avviene al rilascio, il criterio è rispettato.',
  },
  'gesti-senza-alternativa': {
    descrizione: 'Funzioni basate su trascinamento o gesti complessi',
    correzione:
      'Ogni funzione che richiede di tracciare un percorso, pizzicare o trascinare deve avere un\'alternativa a tocco singolo: pulsanti per spostare, un campo dove digitare il valore, comandi espliciti. Chi ha difficoltà motorie non riesce a compiere gesti precisi.',
  },
  'cambio-contesto-al-focus': {
    descrizione: 'La pagina cambia solo arrivando su un campo',
    correzione:
      'Ricevere il focus non deve mai cambiare il contesto. Togli le aperture di finestre e gli invii legati all\'evento focus: chi naviga da tastiera attraversa i campi per leggerli, e non si aspetta che succeda qualcosa.',
  },
  'cambio-contesto-all-input': {
    descrizione: 'La pagina cambia da sola quando si scrive o si sceglie',
    correzione:
      'Il caso più frequente è il menu a tendina che invia il modulo con onchange: chi lo attraversa con le frecce fa partire la prima voce. Aggiungi un pulsante di invio esplicito. Se serve aggiornare qualcosa senza ricaricare, annuncialo in una regione con aria-live invece di cambiare pagina.',
  },
  'ordine-lettura-diverso': {
    descrizione: 'L\'ordine del codice non corrisponde a quello visivo',
    correzione:
      'Riordina gli elementi nel codice HTML invece che con il CSS, e togli le proprietà order o grid-area che li spostano. Chi usa uno screen reader riceve la pagina nell\'ordine del codice: se non coincide con quello visivo, il discorso arriva scomposto. Si verifica anche disattivando i CSS e rileggendo.',
  },
  'poche-vie-di-navigazione': {
    descrizione: 'Un solo modo per raggiungere le pagine',
    correzione:
      'Servono almeno due vie fra: un menu di navigazione, una ricerca interna, una mappa del sito, le briciole di pane. Chi fatica a orientarsi in un menu a più livelli deve poter arrivare altrimenti. Il criterio non si applica alle pagine che sono un passaggio di un processo, come i passi di un acquisto.',
  },
  'testo-ingrandito-tagliato': {
    descrizione: 'Il testo ingrandito al 200% viene tagliato',
    correzione:
      'Sostituisci le altezze fisse con min-height e usa unità relative (rem, em) per le dimensioni del testo. Questo è l\'ingrandimento del solo testo, che è cosa diversa dallo zoom della pagina: molti layout reggono il secondo e si rompono sul primo.',
  },
  'no-autoplay-audio': {
    descrizione: 'Elementi audio o video che partono da soli',
    correzione:
      'Togli autoplay, oppure aggiungi muted. axe non riesce a stabilire la durata del suono e lascia il giudizio: la norma ammette la riproduzione automatica solo entro 3 secondi, o con un comando per fermarla.',
  },
  'aria-prohibited-attr': {
    descrizione: 'Attributi ARIA non ammessi su questo elemento',
    correzione:
      'Alcuni attributi ARIA non valgono sull\'elemento o sul ruolo in cui si trovano e vengono ignorati. Il caso più frequente è aria-label su un <div> senza ruolo: dagli un role adeguato, oppure usa un elemento che accetti un nome accessibile.',
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
