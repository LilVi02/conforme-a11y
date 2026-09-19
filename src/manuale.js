/**
 * Verifiche che un controllo automatico non può fare.
 *
 * Non è una lista decorativa: è la parte che distingue "nessun errore
 * rilevato" da "conforme". Ogni voce è collegata ai criteri che copre, così
 * il report può dire quali dei 50 criteri restano scoperti finché non le si
 * esegue.
 *
 * Il tempo indicato è una stima per un sito medio di poche pagine, utile a
 * preventivare il lavoro. Su un sito grande va moltiplicato.
 */

import { CRITERI, COPERTURA, criteriNonAutomatizzabili } from './wcag-it.js';

export const VERIFICHE_MANUALI = [
  {
    id: 'tastiera',
    criteri: ['2.1.1', '2.1.2', '2.4.3', '2.4.7', '2.1.4', '2.4.1'],
    titolo: 'Navigare tutto il sito con la sola tastiera',
    come:
      'Metti via il mouse. Con Tab, Shift+Tab, Invio, Spazio e frecce completa i percorsi principali: menu, ricerca, modulo di contatto, login, acquisto. Controlla quattro cose: di vedere sempre dove sei, di raggiungere ogni funzione, di non restare mai intrappolato, e che il primo Tab offra un link per saltare direttamente al contenuto.',
    seFallisce:
      'È la verifica più importante di tutte. Se un percorso non si completa da tastiera, il sito non è conforme, qualunque cosa dica lo scanner.',
    tempo: '30–45 min',
  },
  {
    id: 'screen-reader',
    criteri: ['1.1.1', '1.3.1', '1.3.2', '2.4.6', '3.3.1', '3.3.2', '4.1.2', '4.1.3'],
    titolo: 'Percorrere il sito con uno screen reader',
    come:
      'NVDA su Windows (gratuito) o VoiceOver su macOS (già installato). Percorri una pagina di contenuto e un modulo completo, dall\'inizio alla fine, ascoltando. Non guardare lo schermo.',
    seFallisce:
      'È la prova che rivela quello che nessun altro controllo vede. La prima volta è faticosa: metti in conto un\'ora solo per prendere confidenza con i comandi.',
    tempo: '45–60 min',
  },
  {
    id: 'alt-sensati',
    criteri: ['1.1.1'],
    titolo: 'Leggere le descrizioni delle immagini',
    come:
      'Su 5 pagine rappresentative, leggi gli attributi alt uno per uno. Un alt che dice "immagine", "foto", "banner" o ripete il nome del file supera il controllo automatico e non serve a nulla. Chiediti: se al posto dell\'immagine ci fosse solo questa frase, l\'utente capirebbe?',
    seFallisce: 'È l\'errore più diffuso in assoluto tra i siti che "passano" gli scanner.',
    tempo: '15 min',
  },
  {
    id: 'zoom-reflow',
    criteri: ['1.4.4', '1.4.10', '1.4.12'],
    titolo: 'Ingrandire al 200% e al 400%',
    come:
      'Porta il browser al 200%, poi al 400%. A 400% la finestra equivale a 320 px di larghezza: non deve comparire scorrimento orizzontale, né testo tagliato o sovrapposto. Prova anche a forzare interlinea 1.5 e spaziatura tra paragrafi 2em.',
    seFallisce: 'Chi ha ipovisione naviga abitualmente ingrandito: qui si decide se può usare il sito.',
    tempo: '15 min',
  },
  {
    id: 'ordine-lettura',
    criteri: ['1.3.2', '2.4.3'],
    titolo: 'Verificare l\'ordine di lettura',
    come:
      'Disattiva i CSS della pagina (nei browser: Visualizza → Stile pagina → Nessuno, oppure un\'estensione). Il contenuto deve restare comprensibile e nell\'ordine giusto.',
    seFallisce: 'Un layout che riordina i blocchi in CSS lascia il discorso scomposto a chi ascolta.',
    tempo: '10 min',
  },
  {
    id: 'moduli-errori',
    criteri: ['3.3.1', '3.3.2', '3.3.3', '3.3.4', '1.4.1', '3.2.1', '3.2.2', '1.3.5'],
    titolo: 'Sbagliare apposta a compilare i moduli',
    come:
      'Invia il modulo vuoto, poi con dati errati. Gli errori sono descritti a parole? Dicono come rimediare o solo "campo non valido"? Sono annunciati dallo screen reader? Sono riconoscibili senza vedere il rosso? Per ordini e pagamenti: si può rivedere e correggere prima di confermare? Controlla anche che nulla cambi da solo: arrivare su un campo con Tab, o selezionare una voce da un menu, non deve far partire invii o ricaricamenti.',
    seFallisce: 'Un modulo che blocca l\'utente senza spiegare è una barriera, non un fastidio.',
    tempo: '20 min',
  },
  {
    id: 'contrasto-stati',
    criteri: ['1.4.11', '2.4.7', '1.4.1'],
    titolo: 'Controllare contrasto di bordi, icone e focus',
    come:
      'Lo scanner misura il testo, non sempre il resto. Verifica a mano il contrasto (minimo 3:1) di bordi dei campi, icone informative, indicatore di focus e stati attivi.',
    seFallisce: 'Un campo il cui bordo non si vede è un campo che non si trova.',
    tempo: '15 min',
  },
  {
    id: 'movimento',
    criteri: ['2.2.2', '2.3.1', '1.4.2', '2.2.1'],
    titolo: 'Movimento, suono e limiti di tempo',
    come:
      'Caroselli, animazioni, video in autoplay, countdown, sessioni che scadono. Ogni movimento che dura più di 5 secondi si può fermare? Nulla lampeggia più di tre volte al secondo? L\'audio non parte da solo? Il sito rispetta prefers-reduced-motion?',
    seFallisce: 'Il lampeggio rapido è un rischio sanitario: ha la precedenza su tutto il resto.',
    tempo: '15 min',
  },
  {
    id: 'multimedia',
    criteri: ['1.2.1', '1.2.2', '1.2.3', '1.2.4', '1.2.5'],
    titolo: 'Sottotitoli e trascrizioni',
    come:
      'Ogni video con parlato ha sottotitoli verificati? I sottotitoli automatici non revisionati non bastano. I contenuti solo audio hanno una trascrizione? I video che mostrano informazioni visive hanno audiodescrizione o trascrizione descrittiva?',
    seFallisce: 'È spesso la voce più costosa dell\'adeguamento: va preventivata per tempo.',
    tempo: 'variabile',
  },
  {
    id: 'documenti',
    criteri: ['EAA — documenti elettronici'],
    titolo: 'PDF e documenti scaricabili',
    come:
      'Moduli, bilanci, brochure e circolari in PDF rientrano negli obblighi. Un PDF che è la scansione di un foglio è del tutto inaccessibile. Servono testo reale (non immagine), tag di struttura, titolo e lingua impostati.',
    seFallisce:
      'È il punto più trascurato: si sistema il sito e si lasciano decine di PDF illeggibili, che spesso sono proprio i documenti che contano.',
    tempo: 'variabile',
  },
  {
    id: 'istruzioni-e-comparse',
    criteri: ['1.3.3', '1.4.5', '1.4.13'],
    titolo: 'Istruzioni, testo nelle immagini e contenuti a comparsa',
    come:
      'Tre controlli che si fanno insieme leggendo le pagine. Primo: le istruzioni non devono basarsi solo su forma, colore o posizione — "il pulsante tondo a destra" non dice nulla a chi non vede, cita anche l\'etichetta. Secondo: cerca testo incorporato nelle immagini (banner, locandine, tabelle esportate come PNG); a parte i loghi, va sostituito con testo reale. Terzo: prova i tooltip e i menu a comparsa — devono chiudersi con Esc, restare aperti quando ci passi sopra col puntatore, e non coprire ciò che serve leggere.',
    seFallisce:
      'Il testo dentro le immagini è la trappola più frequente: non si ingrandisce, non si seleziona, non si traduce, e nessuno se ne accorge finché qualcuno non prova a leggerlo.',
    tempo: '20 min',
  },
  {
    id: 'coerenza',
    criteri: ['3.2.3', '3.2.4', '2.4.5'],
    titolo: 'Coerenza fra le pagine',
    come:
      'Il menu mantiene lo stesso ordine ovunque? La stessa funzione ha sempre lo stesso nome e la stessa icona? Esistono almeno due modi per raggiungere una pagina (menu e ricerca, o mappa del sito)?',
    seFallisce: 'L\'incoerenza pesa soprattutto su chi ha disabilità cognitive, ed è invisibile a chi conosce il sito.',
    tempo: '15 min',
  },
  {
    id: 'linguaggio',
    criteri: ['3.1.2', '2.4.4', '2.4.6'],
    titolo: 'Chiarezza del linguaggio',
    come:
      'Frasi lunghe, burocratese e sigle non spiegate escludono chi ha disabilità cognitive e chi non è madrelingua. Guarda soprattutto istruzioni, messaggi di errore e passaggi obbligati. Verifica anche che i testi dei link abbiano senso letti fuori contesto.',
    seFallisce: 'Non è un criterio "morbido": determina se il servizio si riesce a usare.',
    tempo: '20 min',
  },
  {
    id: 'mobile-tocco',
    criteri: ['1.3.4', '2.5.1', '2.5.2', '2.5.3', '2.5.4'],
    titolo: 'Gesti, tocco e orientamento su mobile',
    come:
      'Il sito funziona sia in verticale sia in orizzontale? Le funzioni che richiedono di trascinare o pizzicare hanno un\'alternativa a tocco singolo? Le azioni si completano al rilascio, così da poterle annullare? Le etichette visibili corrispondono ai nomi usati dal comando vocale?',
    seFallisce: 'Chi usa il tablet fissato alla carrozzina non può ruotarlo: il blocco dell\'orientamento lo esclude.',
    tempo: '20 min',
  },
];

/** Criteri coperti da almeno una verifica manuale di questa lista. */
export function criteriCopertiDaVerifiche() {
  const set = new Set();
  for (const v of VERIFICHE_MANUALI) {
    for (const c of v.criteri) if (CRITERI[c]) set.add(c);
  }
  return [...set];
}

/**
 * Criteri che né l'automazione né questa checklist coprono pienamente.
 * Serve a non dare per completa una verifica che non lo è.
 */
export function criteriScoperti() {
  const coperti = new Set(criteriCopertiDaVerifiche());
  return criteriNonAutomatizzabili().filter((c) => !coperti.has(c));
}

/**
 * Nota sui limiti, costruita dai dati reali invece che da una percentuale
 * citata a memoria: è più precisa e si aggiorna da sola.
 */
export function notaCopertura() {
  return (
    `Dei ${COPERTURA.totale} criteri WCAG 2.1 di livello A e AA, un controllo automatico ` +
    `ne verifica pienamente ${COPERTURA.automatici}, ne intercetta parzialmente ${COPERTURA.parziali} ` +
    `e non può dire nulla sui restanti ${COPERTURA.manuali}. ` +
    `Un report senza errori significa che i controlli implementati non hanno trovato problemi, ` +
    `non che il sito sia conforme. Le verifiche manuali sono parte necessaria della valutazione, ` +
    `e la loro documentazione è ciò che dimostra la diligenza in caso di controllo.`
  );
}

/** Mantenuta per compatibilità con la versione precedente della libreria. */
export const NOTA_COPERTURA = notaCopertura();
