/**
 * Criteri di successo WCAG 2.1, livelli A e AA — tutti e 50.
 *
 * IMPORTANTE, sulla provenienza dei testi:
 *
 *   `titolo`  è la traduzione ufficiale autorizzata dal W3C
 *             (https://www.w3.org/Translations/WCAG21-it/). Non va riscritto:
 *             è il nome con cui il criterio compare negli atti e nelle
 *             verifiche. Se non corrisponde, è un errore da segnalare.
 *
 *   `impatto` e `correzione` sono redazione nostra. Non sono testo normativo
 *             e non vanno citati come tale: servono a far capire il problema a
 *             chi deve correggerlo. Sono il valore aggiunto di questo progetto
 *             ed è lì che i contributi sono più utili.
 *
 *   `auto`    dice se la violazione del criterio è rilevabile da un controllo
 *             automatico: 'si' (axe la trova), 'parziale' (ne trova alcune
 *             forme), 'no' (serve una persona). Serve a non far credere che
 *             un report pulito equivalga alla conformità.
 *
 * Riferimenti normativi italiani: vedi CONTESTO_NORMATIVO in fondo al file.
 */

export const PRINCIPI = {
  1: 'Percepibile',
  2: 'Utilizzabile',
  3: 'Comprensibile',
  4: 'Robusto',
};

export const PRIORITA = {
  1: 'Bloccante: impedisce di usare il sito',
  2: 'Grave: ostacolo serio',
  3: 'Attrito: rallenta senza impedire',
};

export const CRITERI = {
  // ────────────────────────────── 1. Percepibile
  '1.1.1': {
    titolo: 'Contenuti non testuali',
    livello: 'A',
    principio: 1,
    auto: 'parziale',
    impatto:
      'Chi usa uno screen reader non riceve alcuna informazione dalle immagini. Se l\'immagine è un pulsante o un link, la funzione è del tutto assente.',
    correzione:
      'L\'attributo alt descrive la FUNZIONE dell\'immagine, non il suo aspetto. Immagine decorativa: alt="" (vuoto, non assente). Immagine dentro un link: l\'alt descrive la destinazione. Icona-pulsante: aria-label sul pulsante.',
    nota: 'Il controllo automatico vede se l\'alt esiste, non se è sensato: "immagine1.jpg" passa il test e non serve a nulla.',
    priorita: 1,
  },
  '1.2.1': {
    titolo: 'Solo audio e solo video (preregistrati)',
    livello: 'A',
    principio: 1,
    auto: 'no',
    impatto:
      'Un podcast senza trascrizione esclude chi è sordo; un video muto senza descrizione esclude chi è cieco.',
    correzione:
      'Per il solo audio: una trascrizione testuale completa. Per il solo video: una trascrizione o una traccia audio che descriva ciò che accade.',
    priorita: 2,
  },
  '1.2.2': {
    titolo: 'Sottotitoli (preregistrati)',
    livello: 'A',
    principio: 1,
    auto: 'parziale',
    impatto:
      'Chi è sordo o si trova in un ambiente rumoroso perde tutto il contenuto parlato del video.',
    correzione:
      'Sottotitoli sincronizzati e verificati. I sottotitoli generati automaticamente non revisionati non soddisfano il criterio: vanno corretti a mano.',
    priorita: 2,
  },
  '1.2.3': {
    titolo: 'Audiodescrizione o tipo di media alternativo (preregistrato)',
    livello: 'A',
    principio: 1,
    auto: 'no',
    impatto:
      'Chi non vede il video perde le informazioni mostrate solo per immagini: grafici, testi a schermo, azioni silenziose.',
    correzione:
      'Una trascrizione descrittiva completa, oppure una traccia di audiodescrizione che racconti ciò che si vede.',
    priorita: 2,
  },
  '1.2.4': {
    titolo: 'Sottotitoli (in tempo reale)',
    livello: 'AA',
    principio: 1,
    auto: 'no',
    impatto: 'Dirette e webinar restano inaccessibili a chi è sordo.',
    correzione: 'Sottotitolazione in tempo reale per i contenuti audio trasmessi dal vivo.',
    priorita: 2,
  },
  '1.2.5': {
    titolo: 'Audiodescrizione (preregistrata)',
    livello: 'AA',
    principio: 1,
    auto: 'no',
    impatto: 'Le informazioni visive del video restano precluse a chi non vede.',
    correzione: 'Traccia di audiodescrizione per i video preregistrati.',
    priorita: 2,
  },
  '1.3.1': {
    titolo: 'Informazioni e correlazioni',
    livello: 'A',
    principio: 1,
    auto: 'parziale',
    impatto:
      'La struttura della pagina esiste solo a vedersi. Chi usa uno screen reader non può saltare tra le sezioni né capire quale etichetta appartiene a quale campo.',
    correzione:
      'HTML semantico al posto di div stilizzati: <h1>–<h6> in ordine senza salti, <ul>/<ol> per gli elenchi, <table> con <th> e scope per le tabelle di dati, <label for> associato a ogni campo.',
    priorita: 1,
  },
  '1.3.2': {
    titolo: 'Sequenza significativa',
    livello: 'A',
    principio: 1,
    auto: 'no',
    impatto:
      'Lo screen reader legge nell\'ordine del codice: se il CSS ha riordinato i blocchi, il discorso arriva scomposto.',
    correzione:
      'L\'ordine del DOM deve corrispondere all\'ordine di lettura. Attenzione a flex order, grid-area e position: absolute.',
    nota: 'Si verifica disattivando i CSS della pagina e rileggendola.',
    priorita: 2,
  },
  '1.3.3': {
    titolo: 'Caratteristiche sensoriali',
    livello: 'A',
    principio: 1,
    auto: 'no',
    impatto:
      '"Clicca il pulsante tondo a destra" non dice nulla a chi non vede la pagina o non distingue le forme.',
    correzione:
      'Le istruzioni non si basano solo su forma, colore, dimensione o posizione: cita anche il testo o l\'etichetta dell\'elemento.',
    priorita: 3,
  },
  '1.3.4': {
    titolo: 'Orientamento',
    livello: 'AA',
    principio: 1,
    auto: 'no',
    impatto:
      'Chi ha la carrozzina con il tablet fissato in orizzontale non può ruotarlo: un sito che funziona solo in verticale lo esclude.',
    correzione:
      'Non bloccare l\'orientamento con CSS o manifest, salvo quando è essenziale (per esempio un pianoforte virtuale).',
    priorita: 2,
  },
  '1.3.5': {
    titolo: 'Identificare lo scopo degli input',
    livello: 'AA',
    principio: 1,
    auto: 'parziale',
    impatto:
      'Chi ha difficoltà motorie o cognitive non può usare il completamento automatico e deve digitare ogni dato a mano.',
    correzione:
      'Attributo autocomplete sui campi che raccolgono dati dell\'utente: autocomplete="email", "name", "tel", "street-address", "postal-code".',
    priorita: 3,
  },
  '1.4.1': {
    titolo: 'Uso del colore',
    livello: 'A',
    principio: 1,
    auto: 'parziale',
    impatto:
      'Chi non distingue i colori (circa un uomo su dodici) perde l\'informazione: campi in errore segnalati solo di rosso, link riconoscibili solo dalla tinta.',
    correzione:
      'Al colore si affianca sempre un secondo segnale: icona, testo, sottolineatura, bordo. Un errore va detto a parole.',
    priorita: 2,
  },
  '1.4.2': {
    titolo: 'Controllo del sonoro',
    livello: 'A',
    principio: 1,
    auto: 'no',
    impatto:
      'Un audio che parte da solo copre la voce dello screen reader e rende la pagina inutilizzabile.',
    correzione:
      'Nessun audio in riproduzione automatica oltre i 3 secondi; se c\'è, serve un controllo per fermarlo indipendente dal volume di sistema.',
    priorita: 1,
  },
  '1.4.3': {
    titolo: 'Contrasto (minimo)',
    livello: 'AA',
    principio: 1,
    auto: 'si',
    impatto:
      'Chi ha ipovisione o presbiopia — e chiunque guardi lo schermo alla luce del sole — non riesce a leggere.',
    correzione:
      'Contrasto minimo 4.5:1 per il testo normale, 3:1 per il testo grande (18pt, o 14pt in grassetto). Il grigio chiaro su bianco è l\'errore più diffuso: #767676 è il grigio più chiaro ammesso su fondo bianco.',
    priorita: 2,
  },
  '1.4.4': {
    titolo: 'Ridimensionamento del testo',
    livello: 'AA',
    principio: 1,
    auto: 'no',
    impatto: 'Ingrandendo al 200% il testo si taglia, si sovrappone o sparisce.',
    correzione:
      'Unità relative (rem, em, %) per le dimensioni del testo. Niente altezze fisse sui contenitori di testo: usa min-height.',
    priorita: 2,
  },
  '1.4.5': {
    titolo: 'Immagini di testo',
    livello: 'AA',
    principio: 1,
    auto: 'no',
    impatto:
      'Il testo dentro un\'immagine non si ingrandisce senza sgranarsi, non si seleziona e non si adatta ai fogli di stile personali.',
    correzione:
      'Usa testo reale con i CSS. Le immagini di testo si ammettono per i loghi e quando l\'aspetto grafico è essenziale.',
    priorita: 3,
  },
  '1.4.10': {
    titolo: 'Ricalcolo del flusso',
    livello: 'AA',
    principio: 1,
    auto: 'no',
    impatto:
      'Su schermo piccolo o con forte ingrandimento compare lo scorrimento orizzontale: leggere diventa faticoso o impossibile.',
    correzione:
      'Il contenuto resta leggibile a 320 px di larghezza senza scorrimento orizzontale. Layout flessibili (flex, grid con minmax), mai larghezze fisse sui contenitori principali.',
    priorita: 2,
  },
  '1.4.11': {
    titolo: 'Contrasto in contenuti non testuali',
    livello: 'AA',
    principio: 1,
    auto: 'parziale',
    impatto:
      'Bordi dei campi, icone e stati attivi invisibili a chi ha ridotta sensibilità al contrasto: non si capisce dove si deve scrivere.',
    correzione:
      'Contrasto minimo 3:1 rispetto allo sfondo adiacente per bordi di input, icone informative, indicatori di focus e componenti dell\'interfaccia.',
    priorita: 2,
  },
  '1.4.12': {
    titolo: 'Spaziatura del testo',
    livello: 'AA',
    principio: 1,
    auto: 'no',
    impatto:
      'Chi è dislessico o ipovedente usa fogli di stile personali per distanziare il testo: se il layout si rompe, il sito diventa inservibile.',
    correzione:
      'Nessuna perdita di contenuto con interlinea 1.5, spazio tra paragrafi 2em, tra lettere 0.12em, tra parole 0.16em. Evita !important sulle proprietà di spaziatura.',
    priorita: 3,
  },
  '1.4.13': {
    titolo: 'Contenuto con Hover o Focus',
    livello: 'AA',
    principio: 1,
    auto: 'no',
    impatto:
      'Tooltip e menu a comparsa che spariscono appena si muove il puntatore, o che coprono ciò che servirebbe leggere, bloccano chi ingrandisce lo schermo o ha tremori.',
    correzione:
      'Il contenuto a comparsa dev\'essere chiudibile con Esc, raggiungibile col puntatore senza sparire, e persistente finché non lo si chiude.',
    priorita: 3,
  },

  // ────────────────────────────── 2. Utilizzabile
  '2.1.1': {
    titolo: 'Tastiera',
    livello: 'A',
    principio: 2,
    auto: 'parziale',
    impatto:
      'Chi non usa il mouse — disabilità motorie, screen reader, tremori — non riesce ad attivare la funzione. È una delle barriere più bloccanti in assoluto.',
    correzione:
      'Ogni funzione si raggiunge con Tab e si attiva con Invio o Spazio. Usa <button> e <a> reali invece di <div onclick>. Con un elemento generico servono tabindex="0", role e gestione di keydown.',
    priorita: 1,
  },
  '2.1.2': {
    titolo: 'Nessun impedimento all\'uso della tastiera',
    livello: 'A',
    principio: 2,
    auto: 'parziale',
    impatto:
      'Il focus resta intrappolato in un componente — di solito una finestra modale o un player — e non si esce più dalla pagina se non ricaricandola.',
    correzione:
      'Nelle modali: gestisci il ciclo del focus, chiudi con Esc, restituisci il focus all\'elemento che ha aperto la modale.',
    priorita: 1,
  },
  '2.1.4': {
    titolo: 'Tasti di scelta rapida',
    livello: 'A',
    principio: 2,
    auto: 'no',
    impatto:
      'Scorciatoie a tasto singolo si attivano per sbaglio con il comando vocale o con un tremore, facendo partire azioni indesiderate.',
    correzione:
      'Le scorciatoie a carattere singolo devono poter essere disattivate, rimappate, o valere solo quando il componente ha il focus.',
    priorita: 3,
  },
  '2.2.1': {
    titolo: 'Regolazione tempi di esecuzione',
    livello: 'A',
    principio: 2,
    auto: 'no',
    impatto:
      'Chi compila un modulo più lentamente perde tutto quando la sessione scade senza preavviso.',
    correzione:
      'Il limite di tempo dev\'essere disattivabile, regolabile, o prolungabile su richiesta con un avviso prima della scadenza.',
    priorita: 2,
  },
  '2.2.2': {
    titolo: 'Pausa, stop, nascondi',
    livello: 'A',
    principio: 2,
    auto: 'no',
    impatto:
      'Caroselli e testi scorrevoli che non si fermano rendono impossibile leggere a chi ha bisogno di più tempo o si distrae facilmente.',
    correzione:
      'Ogni movimento automatico che dura più di 5 secondi ha un comando per metterlo in pausa o fermarlo.',
    priorita: 2,
  },
  '2.3.1': {
    titolo: 'Tre lampeggiamenti o inferiore alla soglia',
    livello: 'A',
    principio: 2,
    auto: 'no',
    impatto: 'Il lampeggio rapido può provocare crisi epilettiche. È un rischio per la salute, non un fastidio.',
    correzione: 'Niente che lampeggi più di tre volte al secondo.',
    priorita: 1,
  },
  '2.4.1': {
    titolo: 'Salto di blocchi',
    livello: 'A',
    principio: 2,
    auto: 'parziale',
    impatto:
      'Chi naviga da tastiera deve attraversare l\'intero menu prima di arrivare al contenuto, su ogni singola pagina.',
    correzione:
      'Come primo elemento, un link "Vai al contenuto principale" che punta a <main id="main">. Può restare nascosto finché non riceve il focus, ma non con display:none.',
    priorita: 2,
  },
  '2.4.2': {
    titolo: 'Titolazione della pagina',
    livello: 'A',
    principio: 2,
    auto: 'si',
    impatto:
      'Con più schede aperte non si distingue la pagina, e lo screen reader annuncia un titolo inutile o non ne annuncia affatto.',
    correzione:
      'Un <title> unico e descrittivo per pagina, dal particolare al generale: "Contatti — Nome Organizzazione".',
    priorita: 2,
  },
  '2.4.3': {
    titolo: 'Ordine del focus',
    livello: 'A',
    principio: 2,
    auto: 'parziale',
    impatto: 'Il focus salta in punti imprevedibili e la navigazione perde ogni logica.',
    correzione:
      'L\'ordine del DOM corrisponde all\'ordine visivo. Non usare tabindex con valori positivi. Attenzione agli spostamenti fatti in CSS.',
    priorita: 2,
  },
  '2.4.4': {
    titolo: 'Scopo del collegamento (nel contesto)',
    livello: 'A',
    principio: 2,
    auto: 'parziale',
    impatto:
      'Gli screen reader sanno elencare tutti i link di una pagina: una lista di "clicca qui" e "leggi di più" non dice nulla.',
    correzione:
      'Il testo del link ha senso da solo: "Scarica il modulo di iscrizione (PDF, 200 KB)" invece di "clicca qui". In alternativa, aria-label sul link.',
    priorita: 2,
  },
  '2.4.5': {
    titolo: 'Differenti modalità',
    livello: 'AA',
    principio: 2,
    auto: 'no',
    impatto:
      'Chi fatica a navigare per menu non ha alternative per trovare una pagina.',
    correzione:
      'Almeno due modi per raggiungere una pagina: menu più ricerca, oppure mappa del sito, oppure briciole di pane.',
    priorita: 3,
  },
  '2.4.6': {
    titolo: 'Intestazioni ed etichette',
    livello: 'AA',
    principio: 2,
    auto: 'parziale',
    impatto:
      'Intestazioni generiche impediscono di capire la struttura scorrendo la pagina con lo screen reader.',
    correzione:
      'Intestazioni ed etichette descrivono il contenuto o lo scopo reale della sezione, non sono decorative.',
    priorita: 3,
  },
  '2.4.7': {
    titolo: 'Focus visibile',
    livello: 'AA',
    principio: 2,
    auto: 'parziale',
    impatto:
      'Navigando con Tab non si vede dove ci si trova. Errore frequentissimo: outline:none nel CSS per ragioni estetiche.',
    correzione:
      'Non rimuovere mai l\'outline senza sostituirlo. Usa :focus-visible con un indicatore evidente e contrastato (almeno 3:1): outline: 3px solid con outline-offset: 2px.',
    priorita: 1,
  },
  '2.5.1': {
    titolo: 'Movimenti del puntatore',
    livello: 'A',
    principio: 2,
    auto: 'no',
    impatto:
      'Gesti complessi — pizzicare, tracciare un percorso, trascinare — sono impossibili per chi ha difficoltà motorie.',
    correzione:
      'Ogni funzione basata su gesti multipunto o su un percorso deve avere un\'alternativa a tocco singolo o a pulsante.',
    priorita: 2,
  },
  '2.5.2': {
    titolo: 'Cancellazione delle azioni del puntatore',
    livello: 'A',
    principio: 2,
    auto: 'no',
    impatto:
      'Chi ha tremori tocca per sbaglio e l\'azione parte comunque, senza possibilità di annullarla allontanando il dito.',
    correzione:
      'L\'azione si completa al rilascio (evento click o pointerup), non alla pressione, così spostando il dito fuori si annulla.',
    priorita: 2,
  },
  '2.5.3': {
    titolo: 'Etichetta nel nome',
    livello: 'A',
    principio: 2,
    auto: 'parziale',
    impatto:
      'Chi usa il comando vocale dice "clicca Invia" ma il pulsante si chiama diversamente nel codice: il comando non funziona.',
    correzione:
      'Il nome accessibile deve contenere il testo visibile dell\'etichetta. Se il pulsante mostra "Invia", aria-label non può essere "Conferma ordine".',
    priorita: 2,
  },
  '2.5.4': {
    titolo: 'Azionamento da movimento',
    livello: 'A',
    principio: 2,
    auto: 'no',
    impatto:
      'Funzioni attivate scuotendo o inclinando il dispositivo escludono chi lo tiene fissato a un supporto, e scattano per sbaglio con i tremori.',
    correzione:
      'Ogni funzione attivata dal movimento deve avere un comando alternativo nell\'interfaccia ed essere disattivabile.',
    priorita: 3,
  },

  // ────────────────────────────── 3. Comprensibile
  '3.1.1': {
    titolo: 'Lingua della pagina',
    livello: 'A',
    principio: 3,
    auto: 'si',
    impatto:
      'Lo screen reader legge il testo italiano con la pronuncia inglese: il risultato è incomprensibile.',
    correzione:
      'Imposta lang="it" sul tag <html> di ogni pagina. Il valore dev\'essere un codice valido (it, en, de), non "italiano" né una stringa vuota. Sui siti multilingua il lang cambia con la versione della pagina: non lasciarlo fisso su quello del sito originale.',
    priorita: 1,
  },
  '3.1.2': {
    titolo: 'Parti in lingua',
    livello: 'AA',
    principio: 3,
    auto: 'parziale',
    impatto:
      'Le citazioni e i termini stranieri vengono letti con la pronuncia sbagliata, spezzando la comprensione.',
    correzione: 'Attributo lang sull\'elemento che contiene il passaggio in un\'altra lingua.',
    priorita: 3,
  },
  '3.2.1': {
    titolo: 'Al focus',
    livello: 'A',
    principio: 3,
    auto: 'no',
    impatto:
      'Il solo arrivare su un campo con Tab fa cambiare la pagina: chi naviga da tastiera perde l\'orientamento.',
    correzione: 'Ricevere il focus non deve mai cambiare il contesto: niente aperture o invii automatici al focus.',
    priorita: 2,
  },
  '3.2.2': {
    titolo: 'All\'input',
    livello: 'A',
    principio: 3,
    auto: 'no',
    impatto:
      'La pagina si ricarica o si invia da sola mentre si compila un campo: chi usa screen reader o ingranditore si perde.',
    correzione:
      'Nessun cambio di contesto automatico al cambio di valore. Se serve un aggiornamento, mettilo dietro un pulsante esplicito o annuncialo con aria-live.',
    priorita: 2,
  },
  '3.2.3': {
    titolo: 'Navigazione coerente',
    livello: 'AA',
    principio: 3,
    auto: 'no',
    impatto:
      'Menu che cambiano ordine da pagina a pagina costringono a re-imparare il sito ogni volta: pesa soprattutto su chi ha disabilità cognitive.',
    correzione: 'Gli elementi di navigazione ripetuti mantengono lo stesso ordine relativo in tutte le pagine.',
    priorita: 3,
  },
  '3.2.4': {
    titolo: 'Identificazione coerente',
    livello: 'AA',
    principio: 3,
    auto: 'no',
    impatto:
      'La stessa funzione chiamata "Cerca" in una pagina e "Trova" in un\'altra costringe a capire ogni volta da capo.',
    correzione: 'Componenti con la stessa funzione hanno lo stesso nome e la stessa icona in tutto il sito.',
    priorita: 3,
  },
  '3.3.1': {
    titolo: 'Identificazione di errori',
    livello: 'A',
    principio: 3,
    auto: 'no',
    impatto:
      'Il modulo non parte e l\'utente non sa perché: l\'errore è segnalato solo con un bordo rosso, che lo screen reader non annuncia.',
    correzione:
      'Descrivi l\'errore a parole, associalo al campo con aria-describedby, marca il campo con aria-invalid="true", annuncia il riepilogo in una regione con role="alert".',
    priorita: 1,
  },
  '3.3.2': {
    titolo: 'Etichette o istruzioni',
    livello: 'A',
    principio: 3,
    auto: 'parziale',
    impatto:
      'Campi senza etichetta programmatica: lo screen reader annuncia solo "casella di testo". Il placeholder non è un\'etichetta e sparisce appena si scrive.',
    correzione:
      'Ogni campo ha un <label for="id"> visibile. Il placeholder è un\'aggiunta, mai un sostituto. I formati richiesti si indicano prima del campo, non dopo l\'errore.',
    priorita: 1,
  },
  '3.3.3': {
    titolo: 'Suggerimenti per gli errori',
    livello: 'AA',
    principio: 3,
    auto: 'no',
    impatto: '"Dato non valido" non dice cosa correggere: si resta bloccati sul modulo.',
    correzione:
      'Il messaggio dice come rimediare: "La data va scritta come gg/mm/aaaa", non "formato errato".',
    priorita: 2,
  },
  '3.3.4': {
    titolo: 'Prevenzione degli errori (legali, finanziari, dati)',
    livello: 'AA',
    principio: 3,
    auto: 'no',
    impatto:
      'Un ordine o una cancellazione partono senza possibilità di rivedere: l\'errore ha conseguenze reali, economiche o legali.',
    correzione:
      'Per le azioni con effetti giuridici o economici serve almeno una fra: reversibilità, controllo dei dati con correzione, o una conferma esplicita prima dell\'invio.',
    priorita: 2,
  },

  // ────────────────────────────── 4. Robusto
  '4.1.1': {
    titolo: 'Analisi sintattica (parsing)',
    livello: 'A',
    principio: 4,
    auto: 'si',
    impatto:
      'Markup gravemente malformato può confondere le tecnologie assistive e far leggere la pagina in modo errato.',
    correzione:
      'Tag chiusi correttamente, niente id duplicati, annidamento valido.',
    nota: 'Criterio dichiarato obsoleto nelle WCAG 2.2: i browser moderni correggono da soli quasi tutti questi errori. Resta però in vigore per le WCAG 2.1, che sono lo standard richiamato dalla normativa italiana.',
    priorita: 3,
  },
  '4.1.2': {
    titolo: 'Nome, ruolo, valore',
    livello: 'A',
    principio: 4,
    auto: 'parziale',
    impatto:
      'I componenti costruiti a mano — accordion, tab, select personalizzate — non comunicano cosa sono né in che stato si trovano: chi usa tecnologie assistive non può operarli.',
    correzione:
      'Usa gli elementi nativi quando puoi. Per i componenti su misura servono role, nome accessibile e stati aggiornati (aria-expanded, aria-selected, aria-checked).',
    priorita: 1,
  },
  '4.1.3': {
    titolo: 'Messaggi di stato',
    livello: 'AA',
    principio: 4,
    auto: 'no',
    impatto:
      'Conferme, contatori di risultati ed errori che compaiono senza spostare il focus restano invisibili a chi non guarda lo schermo.',
    correzione:
      'I messaggi di stato vanno in una regione con aria-live="polite" (o role="status") già presente nel DOM prima dell\'aggiornamento.',
    priorita: 2,
  },
};

/** Codici dei criteri, ordinati per numero. */
export const CODICI = Object.keys(CRITERI).sort((a, b) => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  return pa[0] - pb[0] || pa[1] - pb[1] || pa[2] - pb[2];
});

/**
 * Estrae i codici dei criteri dai tag di axe-core.
 * axe usa tag come "wcag143" (criterio 1.4.3) e "wcag412" (4.1.2).
 * I tag di livello ("wcag2a", "wcag21aa") non sono criteri e vengono ignorati.
 */
export function criteriDaTag(tags = []) {
  const out = new Set();
  for (const tag of tags) {
    const m = /^wcag(\d)(\d)(\d+)$/.exec(tag);
    if (m) out.add(`${m[1]}.${m[2]}.${m[3]}`);
  }
  return [...out];
}

/** Scheda del criterio, o null se non è tra quelli coperti. */
export function scheda(codice) {
  return CRITERI[codice] || null;
}

/** Priorità complessiva: la più grave tra i criteri coinvolti. */
export function prioritaViolazione(codici = []) {
  const p = codici.map((c) => CRITERI[c]?.priorita).filter(Boolean);
  return p.length ? Math.min(...p) : 3;
}

/** Criteri che un controllo automatico non può verificare da solo. */
export function criteriNonAutomatizzabili() {
  return CODICI.filter((c) => CRITERI[c].auto !== 'si');
}

export const COPERTURA = {
  totale: CODICI.length,
  automatici: CODICI.filter((c) => CRITERI[c].auto === 'si').length,
  parziali: CODICI.filter((c) => CRITERI[c].auto === 'parziale').length,
  manuali: CODICI.filter((c) => CRITERI[c].auto === 'no').length,
};

export const CONTESTO_NORMATIVO = {
  standard: 'WCAG 2.1 livello AA (EN 301 549)',
  fonteTitoli: 'Traduzione ufficiale W3C: https://www.w3.org/Translations/WCAG21-it/',

  /**
   * In Italia convivono due regimi distinti. Confonderli è l'errore più
   * comune nella divulgazione sul tema, e porta a dire a una PMI che deve
   * compilare un modulo che non la riguarda.
   */
  regimi: [
    {
      id: 'stanca',
      nome: 'Legge Stanca (L. 4/2004, estesa dal D.L. 76/2020)',
      soggetti:
        'Pubbliche amministrazioni, società a controllo pubblico e operatori privati con fatturato medio superiore a 500 milioni di euro nell\'ultimo triennio.',
      dichiarazione:
        'Obbligatoria, e conforme solo se compilata sul modello online di AgID (form.agid.gov.it). Un documento redatto in proprio non soddisfa il requisito.',
      scadenza: 'Revisione e aggiornamento entro il 23 settembre di ogni anno.',
    },
    {
      id: 'eaa',
      nome: 'European Accessibility Act (Direttiva UE 2019/882, D.Lgs. 82/2022)',
      soggetti:
        'Imprese che offrono al pubblico prodotti e servizi digitali, con l\'esclusione delle microimprese (meno di 10 dipendenti e fatturato annuo inferiore a 2 milioni di euro). Applicabile dal 28 giugno 2025.',
      dichiarazione:
        'Le informazioni sull\'accessibilità sono obbligatorie, ma il formato AgID non lo è: si può usare una struttura diversa purché siano presenti i contenuti richiesti dalla norma.',
      scadenza:
        'Obblighi in vigore dal 28 giugno 2025 per i nuovi prodotti e servizi; periodo transitorio fino al 28 giugno 2030 per quelli preesistenti.',
    },
  ],

  vigilanza:
    'AgID vigila sull\'applicazione della normativa e può svolgere verifiche a campione; sui prodotti operano le autorità di vigilanza del mercato.',

  avvertenza:
    'Questa sintesi ha scopo orientativo e non è consulenza legale. Il perimetro di applicazione va verificato caso per caso, anche rispetto agli aggiornamenti successivi alla stesura.',
};
