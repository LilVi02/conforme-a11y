# Report di accessibilità

**Sito analizzato:** https://www.inps.it/  
**Data:** 19 settembre 2026  
**Standard di riferimento:** WCAG 2.1 livello AA (EN 301 549)  
**Pagine analizzate:** 3

> ⚠️ **Questo report non attesta la conformità.** Dei 50 criteri WCAG 2.1 di livello A e AA, un controllo automatico ne verifica pienamente 4, ne intercetta parzialmente 15 e non può dire nulla sui restanti 31. Un report senza errori significa che i controlli implementati non hanno trovato problemi, non che il sito sia conforme. Le verifiche manuali sono parte necessaria della valutazione, e la loro documentazione è ciò che dimostra la diligenza in caso di controllo.

## In sintesi

| | |
|---|---|
| Problemi distinti rilevati | 2 |
| Di cui bloccanti | 2 |
| Occorrenze totali nel codice | 2 |
| Criteri verificabili in automatico | 4 su 50 |
| Criteri che richiedono verifica umana | 46 su 50 |

Indicazione preliminare, dai soli dati automatici: **non conforme**.

## Cosa correggere, in ordine di priorità

L'ordine segue la conseguenza sull'utente, non la severità tecnica: prima ciò che impedisce di usare il sito.

### 1. Attributi ARIA non ammessi sul ruolo usato

**BLOCCANTE — impedisce di usare il sito**  
Occorrenze: 1 su 1 pagina/e  
Regola tecnica: `aria-allowed-attr`

*Come si corregge:* Ogni ruolo ARIA ammette solo certi attributi. Togli quelli non previsti o cambia il ruolo: un aria-checked su un role="link", per esempio, viene ignorato e confonde.

**Criterio WCAG 4.1.2 — Nome, ruolo, valore** · livello A · Robusto

*Chi viene escluso:* I componenti costruiti a mano — accordion, tab, select personalizzate — non comunicano cosa sono né in che stato si trovano: chi usa tecnologie assistive non può operarli.

*Dove si trova:*

`#modalcookiebar`

```html
<div class="modal modalcookiebar show" id="modalcookiebar" aria-label="Privacy" data-keyboard="false" tabindex="-1" data-backdrop="false" aria-modal="true" style="display: block;">
```

*Pagine interessate:*
- https://www.inps.it/

### 2. Lingua della pagina non dichiarata

**BLOCCANTE — impedisce di usare il sito**  
Occorrenze: 1 su 1 pagina/e  
Regola tecnica: `html-has-lang`

*Come si corregge:* Aggiungi lang="it" al tag <html>. Senza, lo screen reader legge l'italiano con la pronuncia della lingua predefinita del sistema, di solito l'inglese: il risultato è incomprensibile. Sui siti multilingua il valore cambia con la versione della pagina.

**Criterio WCAG 3.1.1 — Lingua della pagina** · livello A · Comprensibile

*Chi viene escluso:* Lo screen reader legge il testo italiano con la pronuncia inglese: il risultato è incomprensibile.

*Dove si trova:*

`html`

```html
<html>
```

*Pagine interessate:*
- https://www.agid.gov.it/

## Verifiche manuali da fare

Nessuna di queste è automatizzabile, e senza di esse la valutazione di conformità non sta in piedi. Il tempo indicato vale per un sito di poche pagine.

### ☐ Navigare tutto il sito con la sola tastiera

*Criteri coperti:* 2.1.1, 2.1.2, 2.4.3, 2.4.7, 2.1.4, 2.4.1 · *Tempo stimato:* 30–45 min

Metti via il mouse. Con Tab, Shift+Tab, Invio, Spazio e frecce completa i percorsi principali: menu, ricerca, modulo di contatto, login, acquisto. Controlla quattro cose: di vedere sempre dove sei, di raggiungere ogni funzione, di non restare mai intrappolato, e che il primo Tab offra un link per saltare direttamente al contenuto.

> È la verifica più importante di tutte. Se un percorso non si completa da tastiera, il sito non è conforme, qualunque cosa dica lo scanner.

### ☐ Percorrere il sito con uno screen reader

*Criteri coperti:* 1.1.1, 1.3.1, 1.3.2, 2.4.6, 3.3.1, 3.3.2, 4.1.2, 4.1.3 · *Tempo stimato:* 45–60 min

NVDA su Windows (gratuito) o VoiceOver su macOS (già installato). Percorri una pagina di contenuto e un modulo completo, dall'inizio alla fine, ascoltando. Non guardare lo schermo.

> È la prova che rivela quello che nessun altro controllo vede. La prima volta è faticosa: metti in conto un'ora solo per prendere confidenza con i comandi.

### ☐ Leggere le descrizioni delle immagini

*Criteri coperti:* 1.1.1 · *Tempo stimato:* 15 min

Su 5 pagine rappresentative, leggi gli attributi alt uno per uno. Un alt che dice "immagine", "foto", "banner" o ripete il nome del file supera il controllo automatico e non serve a nulla. Chiediti: se al posto dell'immagine ci fosse solo questa frase, l'utente capirebbe?

> È l'errore più diffuso in assoluto tra i siti che "passano" gli scanner.

### ☐ Ingrandire al 200% e al 400%

*Criteri coperti:* 1.4.4, 1.4.10, 1.4.12 · *Tempo stimato:* 15 min

Porta il browser al 200%, poi al 400%. A 400% la finestra equivale a 320 px di larghezza: non deve comparire scorrimento orizzontale, né testo tagliato o sovrapposto. Prova anche a forzare interlinea 1.5 e spaziatura tra paragrafi 2em.

> Chi ha ipovisione naviga abitualmente ingrandito: qui si decide se può usare il sito.

### ☐ Verificare l'ordine di lettura

*Criteri coperti:* 1.3.2, 2.4.3 · *Tempo stimato:* 10 min

Disattiva i CSS della pagina (nei browser: Visualizza → Stile pagina → Nessuno, oppure un'estensione). Il contenuto deve restare comprensibile e nell'ordine giusto.

> Un layout che riordina i blocchi in CSS lascia il discorso scomposto a chi ascolta.

### ☐ Sbagliare apposta a compilare i moduli

*Criteri coperti:* 3.3.1, 3.3.2, 3.3.3, 3.3.4, 1.4.1, 3.2.1, 3.2.2, 1.3.5 · *Tempo stimato:* 20 min

Invia il modulo vuoto, poi con dati errati. Gli errori sono descritti a parole? Dicono come rimediare o solo "campo non valido"? Sono annunciati dallo screen reader? Sono riconoscibili senza vedere il rosso? Per ordini e pagamenti: si può rivedere e correggere prima di confermare? Controlla anche che nulla cambi da solo: arrivare su un campo con Tab, o selezionare una voce da un menu, non deve far partire invii o ricaricamenti.

> Un modulo che blocca l'utente senza spiegare è una barriera, non un fastidio.

### ☐ Controllare contrasto di bordi, icone e focus

*Criteri coperti:* 1.4.11, 2.4.7, 1.4.1 · *Tempo stimato:* 15 min

Lo scanner misura il testo, non sempre il resto. Verifica a mano il contrasto (minimo 3:1) di bordi dei campi, icone informative, indicatore di focus e stati attivi.

> Un campo il cui bordo non si vede è un campo che non si trova.

### ☐ Movimento, suono e limiti di tempo

*Criteri coperti:* 2.2.2, 2.3.1, 1.4.2, 2.2.1 · *Tempo stimato:* 15 min

Caroselli, animazioni, video in autoplay, countdown, sessioni che scadono. Ogni movimento che dura più di 5 secondi si può fermare? Nulla lampeggia più di tre volte al secondo? L'audio non parte da solo? Il sito rispetta prefers-reduced-motion?

> Il lampeggio rapido è un rischio sanitario: ha la precedenza su tutto il resto.

### ☐ Sottotitoli e trascrizioni

*Criteri coperti:* 1.2.1, 1.2.2, 1.2.3, 1.2.4, 1.2.5 · *Tempo stimato:* variabile

Ogni video con parlato ha sottotitoli verificati? I sottotitoli automatici non revisionati non bastano. I contenuti solo audio hanno una trascrizione? I video che mostrano informazioni visive hanno audiodescrizione o trascrizione descrittiva?

> È spesso la voce più costosa dell'adeguamento: va preventivata per tempo.

### ☐ PDF e documenti scaricabili

*Criteri coperti:* EAA — documenti elettronici · *Tempo stimato:* variabile

Moduli, bilanci, brochure e circolari in PDF rientrano negli obblighi. Un PDF che è la scansione di un foglio è del tutto inaccessibile. Servono testo reale (non immagine), tag di struttura, titolo e lingua impostati.

> È il punto più trascurato: si sistema il sito e si lasciano decine di PDF illeggibili, che spesso sono proprio i documenti che contano.

### ☐ Istruzioni, testo nelle immagini e contenuti a comparsa

*Criteri coperti:* 1.3.3, 1.4.5, 1.4.13 · *Tempo stimato:* 20 min

Tre controlli che si fanno insieme leggendo le pagine. Primo: le istruzioni non devono basarsi solo su forma, colore o posizione — "il pulsante tondo a destra" non dice nulla a chi non vede, cita anche l'etichetta. Secondo: cerca testo incorporato nelle immagini (banner, locandine, tabelle esportate come PNG); a parte i loghi, va sostituito con testo reale. Terzo: prova i tooltip e i menu a comparsa — devono chiudersi con Esc, restare aperti quando ci passi sopra col puntatore, e non coprire ciò che serve leggere.

> Il testo dentro le immagini è la trappola più frequente: non si ingrandisce, non si seleziona, non si traduce, e nessuno se ne accorge finché qualcuno non prova a leggerlo.

### ☐ Coerenza fra le pagine

*Criteri coperti:* 3.2.3, 3.2.4, 2.4.5 · *Tempo stimato:* 15 min

Il menu mantiene lo stesso ordine ovunque? La stessa funzione ha sempre lo stesso nome e la stessa icona? Esistono almeno due modi per raggiungere una pagina (menu e ricerca, o mappa del sito)?

> L'incoerenza pesa soprattutto su chi ha disabilità cognitive, ed è invisibile a chi conosce il sito.

### ☐ Chiarezza del linguaggio

*Criteri coperti:* 3.1.2, 2.4.4, 2.4.6 · *Tempo stimato:* 20 min

Frasi lunghe, burocratese e sigle non spiegate escludono chi ha disabilità cognitive e chi non è madrelingua. Guarda soprattutto istruzioni, messaggi di errore e passaggi obbligati. Verifica anche che i testi dei link abbiano senso letti fuori contesto.

> Non è un criterio "morbido": determina se il servizio si riesce a usare.

### ☐ Gesti, tocco e orientamento su mobile

*Criteri coperti:* 1.3.4, 2.5.1, 2.5.2, 2.5.3, 2.5.4 · *Tempo stimato:* 20 min

Il sito funziona sia in verticale sia in orizzontale? Le funzioni che richiedono di trascinare o pizzicare hanno un'alternativa a tocco singolo? Le azioni si completano al rilascio, così da poterle annullare? Le etichette visibili corrispondono ai nomi usati dal comando vocale?

> Chi usa il tablet fissato alla carrozzina non può ruotarlo: il blocco dell'orientamento lo esclude.

## Contesto normativo

In Italia gli obblighi sono due e distinti. Stabilire quale si applica è il primo passo, perché cambiano formato e procedura.

**Legge Stanca (L. 4/2004, estesa dal D.L. 76/2020)**

- *Chi riguarda:* Pubbliche amministrazioni, società a controllo pubblico e operatori privati con fatturato medio superiore a 500 milioni di euro nell'ultimo triennio.
- *Dichiarazione:* Obbligatoria, e conforme solo se compilata sul modello online di AgID (form.agid.gov.it). Un documento redatto in proprio non soddisfa il requisito.
- *Tempi:* Revisione e aggiornamento entro il 23 settembre di ogni anno.

**European Accessibility Act (Direttiva UE 2019/882, D.Lgs. 82/2022)**

- *Chi riguarda:* Imprese che offrono al pubblico prodotti e servizi digitali, con l'esclusione delle microimprese (meno di 10 dipendenti e fatturato annuo inferiore a 2 milioni di euro). Applicabile dal 28 giugno 2025.
- *Dichiarazione:* Le informazioni sull'accessibilità sono obbligatorie, ma il formato AgID non lo è: si può usare una struttura diversa purché siano presenti i contenuti richiesti dalla norma.
- *Tempi:* Obblighi in vigore dal 28 giugno 2025 per i nuovi prodotti e servizi; periodo transitorio fino al 28 giugno 2030 per quelli preesistenti.

**Vigilanza:** AgID vigila sull'applicazione della normativa e può svolgere verifiche a campione; sui prodotti operano le autorità di vigilanza del mercato.

---

*Report generato con Conforme.*

*Titoli dei criteri: Traduzione ufficiale W3C: https://www.w3.org/Translations/WCAG21-it/*

*Questa sintesi ha scopo orientativo e non è consulenza legale. Il perimetro di applicazione va verificato caso per caso, anche rispetto agli aggiornamenti successivi alla stesura.*