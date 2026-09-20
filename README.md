# Conforme

Scanner di accessibilità per siti italiani. La scansione la esegue axe-core; Conforme traduce ogni violazione nel criterio WCAG corrispondente, spiega chi resta escluso e indica cosa modificare nel codice.

È nato perché gli scanner esistenti restituiscono elenchi di regole in inglese, che chi deve decidere se investire non riesce a interpretare.

```bash
npm install
npx playwright install chromium
npm start -- esempio.it
```

I file `report.md` e `scheda-dichiarazione.md` vengono scritti in una cartella intitolata al sito, per esempio `report_comune-milano-it/`. Le cartelle dei report non finiscono nel repository: riguardano siti di terzi e cambiano a ogni esecuzione.

## Cosa produce

Il report elenca i problemi in ordine di gravità per l'utente, non di severità tecnica. Ogni voce riporta il criterio WCAG, l'impatto in parole, la correzione specifica per quella regola e il codice in cui si trova.

```
### 1. Link senza testo riconoscibile

BLOCCANTE — impedisce di usare il sito
Occorrenze: 19 su 1 pagina/e
Regola tecnica: link-name

Come si corregge: Ogni <a> deve avere un testo riconoscibile. Se contiene
solo un'icona o un'immagine, metti l'alt sull'immagine o un aria-label sul
link. Un link vuoto o con solo uno <svg> non viene annunciato.

Criterio WCAG 2.4.4 — Scopo del collegamento (nel contesto) · livello A

Chi viene escluso: Gli screen reader sanno elencare tutti i link di una
pagina: un elenco di "clicca qui" e "leggi di più" non dice nulla.

Dove si trova:
a[href$="municipio-8"]
<a href="/web/municipio-8" target="_blank" rel="noreferrer">
```

Quello riportato sopra è un caso reale: diciannove link ai Municipi sul sito del Comune di Milano, nessuno dei quali contiene un testo. Chi usa uno screen reader sente diciannove link identici e non può scegliere il proprio.

## La prova da tastiera

axe analizza il DOM da fermo e non può premere Tab: per questo tutti i criteri sulla tastiera finiscono di norma fra quelli da verificare a mano, e restano la barriera più bloccante e meno controllata del web.

Conforme percorre la pagina premendo Tab davvero, e osserva quattro cose: che gli elementi interattivi visibili ricevano il focus, che il focus non resti bloccato, che dando il focus qualcosa cambi sullo schermo, che il primo Tab offra un link per saltare al contenuto.

Quando il focus resta chiuso dentro un contenitore — il caso tipico è il banner dei cookie che lo trattiene — il percorso non copre la pagina. In quel caso Conforme riporta il confinamento, che è il problema vero, e tace sul resto: gli elementi non raggiunti non sono irraggiungibili, semplicemente il giro non ci è arrivato. Il controllo nasce da un errore reale, su comune.milano.it: il report dichiarava assente un link "salta al contenuto" che era lì e funzionava.

Il limite del metodo va detto: osserva fatti meccanici, non usabilità. Sa dire che un elemento riceve il focus, non che l'indicatore sia percepibile; sa dire che nessun elemento è irraggiungibile, non che il percorso di acquisto si completi. Sposta questi criteri da "non verificabile" a "parzialmente verificato".

## Reflow, zoom e spaziatura

Altre tre prove che axe non può fare, perché richiedono di ridimensionare la finestra e di modificare gli stili.

La finestra viene portata a 320 px di larghezza — l'equivalente di uno zoom al 400% — e si misura se compare scorrimento orizzontale, risalendo agli elementi che lo causano. Tabelle, immagini e blocchi preformattati finiscono in una voce separata: le WCAG ammettono l'eccezione per i contenuti che richiedono davvero una disposizione bidimensionale, quindi vanno valutati invece che accusati.

Poi viene applicata la spaziatura prevista dal criterio 1.4.12 — interlinea 1.5, spazio fra paragrafi 2em, fra lettere 0.12em, fra parole 0.16em — e si guarda quali contenitori iniziano a tagliare il testo. Gli elementi già tagliati prima non vengono attribuiti alla spaziatura: sono un altro problema.

Anche qui il limite è dichiarato: si misura se il contenuto scorre o viene tagliato, non se il layout ricalcolato resti comprensibile. Una pagina può non produrre scorrimento orizzontale e avere comunque il menu che copre il contenuto.

## Gli altri controlli

Diversi criteri dipendono da come la pagina si comporta, non da come è scritta, e dal DOM non si vedono. Conforme li ricava osservando il documento e provando interazioni leggere.

Prima del caricamento viene sostituito `addEventListener`, così resta traccia di quali eventi la pagina ascolta: è l'unico modo per sapere che esistono scorciatoie da tastiera globali, azioni legate alla pressione invece che al rilascio, o funzioni attivate scuotendo il dispositivo. Gli attributi non ne conservano memoria e `getEventListeners` esiste solo negli strumenti di sviluppo.

Dal documento si leggono poi gli audio che partono da soli, le animazioni senza fine prive di un comando di pausa, il blocco dell'orientamento nei fogli di stile, i media senza sottotitoli né trascrizione, e le vie disponibili per raggiungere le pagine.

Due prove richiedono di agire: si dà il focus a ogni campo e se ne cambia il valore, per vedere se la pagina naviga o invia da sola. I tentativi vengono intercettati e annullati, e i moduli che sembrano fare cose serie — pagamenti, cancellazioni — non vengono toccati affatto.

Infine si confronta l'ordine del codice con la posizione a schermo dentro i contenitori flex e grid, che è il meccanismo con cui il CSS riordina davvero i blocchi.

## Cosa è accertato e cosa va guardato

Alcuni di questi controlli trovano fatti certi: un `autoplay` senza `muted` è una violazione, non un'opinione. Altri trovano indizi che il codice non basta a giudicare — una tabella larga può essere un'eccezione legittima, una scorciatoia può già usare un modificatore, un gestore su `mousedown` può servire solo a preparare un trascinamento.

I secondi non compaiono fra i problemi. Finiscono in una sezione separata insieme ai controlli che axe non ha saputo risolvere, e non vengono conteggiati. Presentarli come colpe, per giunta etichettati "grave", farebbe perdere fiducia nel resto del report.

## Quanto copre

Dei 50 criteri WCAG 2.1 di livello A e AA, l'analisi automatica ne verifica pienamente 4, ne intercetta parzialmente 33 e sui restanti 13 non è in grado di pronunciarsi.

I tredici che restano fuori sono quelli che richiedono di capire, non di misurare: la qualità delle audiodescrizioni, le istruzioni che si affidano a forma e posizione, il testo dentro le immagini, il lampeggio, la coerenza fra pagine diverse, e il giudizio sui messaggi di errore.

Un report privo di errori non attesta quindi la conformità, e il report stesso lo dichiara in apertura. Insieme ai problemi rilevati viene sempre prodotta la checklist delle 14 verifiche manuali che coprono i criteri restanti, con i tempi stimati.

I numeri sono calcolati dal codice: ogni criterio dichiara se sia automatizzabile, e il totale si aggiorna da sé.

## Gli obblighi in Italia sono due

Vengono confusi di frequente, anche da chi vende consulenza, e la distinzione determina che cosa occorre fare.

**Legge Stanca** (L. 4/2004, estesa dal D.L. 76/2020) riguarda le pubbliche amministrazioni, le società a controllo pubblico e i soggetti privati con fatturato medio superiore a 500 milioni di euro. La dichiarazione di accessibilità è valida soltanto se compilata su form.agid.gov.it, va aggiornata entro il 23 settembre di ogni anno e nessun documento prodotto da uno strumento esterno può sostituirla.

**European Accessibility Act** (Dir. UE 2019/882, D.Lgs. 82/2022) riguarda le imprese che superano la soglia di microimpresa, a partire dal 28 giugno 2025. Le informazioni sull'accessibilità sono obbligatorie, ma il formato AgID non lo è.

Per questa ragione il file generato si chiama scheda preparatoria: nel primo caso serve a raccogliere i dati da riportare nel modulo AgID, nel secondo può diventare la base del documento da pubblicare.

## Uso

```bash
npm start -- esempio.it                          # lo schema si può omettere
npm start -- esempio.it esempio.it/contatti      # più pagine
npm start -- --file urls.txt --out cartella-mia  # cartella scelta da te
npm start -- localhost:3000                      # in sviluppo, usa http
npm start -- esempio.it --json                   # anche i dati grezzi
```

Restituisce exit code 1 in presenza di problemi bloccanti o di pagine irraggiungibili, così da bloccare le regressioni in integrazione continua.

Se nel sistema è già presente Chrome o Chromium, si può evitare il download di Playwright:

```bash
export CONFORME_BROWSER_PATH=/percorso/del/chromium
```

## Priorità

1. impedisce di usare il sito
2. ostacolo serio
3. rallenta senza impedire

Un contrasto insufficiente e un modulo non compilabile da tastiera hanno entrambi severità `serious` per axe. Per chi usa il sito non sono la stessa cosa.

## Pagine che non sono il sito

Un errore 403, una schermata anti-bot o una pagina di manutenzione restituiscono comunque una pagina, che uno scanner ingenuo analizza come se fosse il sito richiesto.

È accaduto scansionando agid.gov.it: il server ha risposto con una pagina di errore CloudFront e il report ha attribuito ad AgID un `lang` mancante che apparteneva ad Amazon. Ora le risposte 4xx e 5xx vengono scartate e le schermate intermedie segnalate.

Per la stessa ragione il report indica quanti controlli sono stati superati: una pagina reale ne supera venti o trenta, una schermata di errore quattro. Senza quel dato, "zero violazioni" e "lo scanner non ha caricato nulla" si leggono allo stesso modo.

## Controlli non risolti

axe restituisce anche i controlli che non è riuscito a risolvere, quasi sempre il contrasto su sfondi con immagini o gradienti, dove il colore dietro al testo non è calcolabile. Vengono raccolti in una sezione separata e non conteggiati fra i problemi.

## Come libreria

```js
import { scansiona, reportMarkdown } from 'conforme';

const esito = await scansiona(['https://esempio.it']);
console.log(reportMarkdown(esito));
```

Mappatura, aggregazione e report non dipendono dal browser, quindi è possibile passare risultati raccolti altrove.

```js
import { riepiloga, normalizzaViolazioni } from 'conforme';

const pagine = [{ url, errore: null, violazioni: normalizzaViolazioni(risultatiAxe.violations) }];
const esito = { dataScansione: new Date().toISOString(), pagine, riepilogo: riepiloga(pagine) };
```

## File

```
src/wcag-it.js       i 50 criteri: titolo ufficiale, impatto, correzione, automatizzabilità
src/regole-it.js     le regole axe, con descrizione e correzione specifica
src/tastiera.js      la prova da tastiera, pilotando il browser
src/reflow.js        reflow a 320 px, testo al 200%, spaziatura
src/ascoltatori.js   registra quali eventi la pagina ascolta
src/media.js         audio, animazioni, orientamento, movimento
src/interazione.js   puntatore, scorciatoie, cambi di contesto
src/struttura.js     ordine di lettura, vie di navigazione
src/manuale.js       le 14 verifiche manuali, collegate ai criteri che coprono
src/dichiarazione.js scheda preparatoria e distinzione fra i due regimi
src/argomenti.js     argomenti da riga di comando
src/aggrega.js       aggregazione dei risultati
src/scan.js          Playwright + axe-core
src/report.js        Markdown e JSON
src/cli.js           entry point
```

I moduli che pilotano il browser sono `scan.js`, `tastiera.js`, `reflow.js`, `media.js`, `interazione.js`, `struttura.js`, `ascoltatori.js` e `cli.js`. Il resto funziona senza browser, e un test lo verifica.

## Test

```bash
npm test
```

75 test, senza dipendenze: funzionano anche prima di `npm install`. Oltre al funzionamento verificano il contenuto: che i titoli corrispondano alla traduzione ufficiale W3C, che il criterio 3.1.2 sia classificato come AA (le fonti secondarie sbagliano di frequente), che due regole dello stesso criterio non ricevano la medesima indicazione, che la scheda non si presenti mai come una dichiarazione valida.

## Provenienza dei contenuti

I titoli dei criteri sono ripresi dalla [traduzione ufficiale W3C](https://www.w3.org/Translations/WCAG21-it/) e non vanno riscritti: sono i nomi con cui i criteri compaiono negli atti.

I testi di impatto e correzione sono redazione dell'autore. Non costituiscono testo normativo e non vanno citati come tale.

Il quadro normativo è tratto dalle fonti AgID; ha valore orientativo e non costituisce consulenza legale.

## Contribuire

In ordine di utilità:

1. Verifiche con screen reader che smentiscano il report. Se lo strumento considera pulito un sito che NVDA rivela inagibile, è la segnalazione più preziosa.
2. Siti italiani sui quali lo scanner sbaglia o si interrompe.
3. Correzioni ai testi, in particolare da chi si occupa di accessibilità per mestiere.
4. Regole axe non ancora tradotte.

Le segnalazioni di errori normativi hanno la precedenza su tutto il resto.

## Licenza

Apache 2.0.

axe-core e @axe-core/playwright sono distribuiti con licenza MPL-2.0, copyleft a livello di file: usarli come dipendenze non vincola questo codice, modificarne i file sì. Playwright è distribuito con licenza Apache 2.0.

## Avvertenza

Strumento di supporto tecnico. Non sostituisce una valutazione professionale di accessibilità e non costituisce consulenza legale. Il perimetro di applicazione delle norme va verificato caso per caso.
