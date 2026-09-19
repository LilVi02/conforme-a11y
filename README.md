# Conforme

Scanner di accessibilità per siti italiani. Usa axe-core per la scansione, poi traduce ogni violazione nel criterio WCAG corrispondente, spiega chi resta fuori e cosa cambiare nel codice.

Nato perché gli scanner esistenti restituiscono liste di regole in inglese, e chi deve decidere se spendere non le capisce.

```bash
npm install
npx playwright install chromium
npm start -- esempio.it
```

Trovi `report.md` e `scheda-dichiarazione.md` nella cartella `report/`.

## Cosa produce

Il report elenca i problemi in ordine di gravità per l'utente, non di severità tecnica. Ogni voce ha il criterio WCAG, l'impatto in parole, la correzione specifica per quella regola, e il codice dove si trova.

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
pagina: una lista di "clicca qui" e "leggi di più" non dice nulla.

Dove si trova:
a[href$="municipio-8"]
<a href="/web/municipio-8" target="_blank" rel="noreferrer">
```

Quello è un caso reale: 19 link ai Municipi sul sito del Comune di Milano, nessuno con un testo dentro. Chi usa uno screen reader sente diciannove link identici e non può scegliere il proprio.

## Quanto copre

Dei 50 criteri WCAG 2.1 A e AA, l'analisi automatica ne verifica pienamente 4, ne intercetta parzialmente 15, e sui restanti 31 non può dire niente.

Un report pulito quindi non è una conformità, e il report lo scrive in cima. Insieme ai problemi arriva sempre la checklist delle 14 verifiche manuali che coprono gli altri criteri, con i tempi stimati.

I numeri li calcola il codice: ogni criterio dichiara se è automatizzabile, e il totale si aggiorna da sé.

## Gli obblighi in Italia sono due

Vengono confusi spesso, anche da chi vende consulenza, e la differenza cambia cosa devi fare.

**Legge Stanca** (L. 4/2004, estesa dal D.L. 76/2020) riguarda PA, società a controllo pubblico e privati con fatturato medio sopra i 500 milioni. La dichiarazione di accessibilità vale solo se compilata su form.agid.gov.it, va aggiornata entro il 23 settembre di ogni anno, e nessun documento prodotto da uno strumento esterno la sostituisce.

**European Accessibility Act** (Dir. UE 2019/882, D.Lgs. 82/2022) riguarda le imprese sopra la soglia di microimpresa, dal 28 giugno 2025. Le informazioni sull'accessibilità sono obbligatorie ma il formato AgID non lo è.

Per questo il file generato si chiama scheda preparatoria: nel primo caso serve a raccogliere i dati da riversare nel modulo AgID, nel secondo può diventare la base del documento da pubblicare.

## Uso

```bash
npm start -- esempio.it                          # lo schema si può omettere
npm start -- esempio.it esempio.it/contatti      # più pagine
npm start -- --file urls.txt --out report-sett   # da elenco
npm start -- localhost:3000                      # in sviluppo, usa http
npm start -- esempio.it --json                   # anche i dati grezzi
```

Exit code 1 se ci sono problemi bloccanti o pagine irraggiungibili, per bloccare le regressioni in CI.

Se hai già Chrome o Chromium puoi evitare il download di Playwright:

```bash
export CONFORME_BROWSER_PATH=/percorso/del/chromium
```

## Priorità

1. impedisce di usare il sito
2. ostacolo serio
3. rallenta senza impedire

Un contrasto insufficiente e un form non compilabile da tastiera hanno entrambi severità `serious` per axe. Per chi usa il sito non sono la stessa cosa.

## Pagine che non sono il sito

Un 403, una schermata anti-bot o una pagina di manutenzione rispondono comunque qualcosa, e uno scanner ingenuo le analizza come se fossero il sito.

È successo scansionando agid.gov.it: ha risposto con una pagina di errore CloudFront, e il report ha addebitato ad AgID un `lang` mancante che apparteneva ad Amazon. Ora le risposte 4xx e 5xx vengono scartate e le schermate intermedie segnalate.

Per lo stesso motivo il report riporta quanti controlli sono stati superati: una pagina vera ne supera 20-30, una schermata di errore 4. Senza quel numero, "zero violazioni" e "lo scanner non ha caricato niente" si leggono uguali.

## Casi indecisi

axe restituisce anche i controlli che non è riuscito a decidere, quasi sempre il contrasto su sfondi con immagini o gradienti, dove il colore dietro il testo non è calcolabile. Finiscono in una sezione a parte, senza essere conteggiati tra i problemi.

## Come libreria

```js
import { scansiona, reportMarkdown } from 'conforme';

const esito = await scansiona(['https://esempio.it']);
console.log(reportMarkdown(esito));
```

Mappatura, aggregazione e report non dipendono dal browser, quindi puoi passargli risultati raccolti altrove.

```js
import { riepiloga, normalizzaViolazioni } from 'conforme';

const pagine = [{ url, errore: null, violazioni: normalizzaViolazioni(risultatiAxe.violations) }];
const esito = { dataScansione: new Date().toISOString(), pagine, riepilogo: riepiloga(pagine) };
```

## File

```
src/wcag-it.js       i 50 criteri: titolo ufficiale, impatto, correzione, automatizzabilità
src/regole-it.js     le regole axe, con descrizione e correzione specifica
src/manuale.js       le 14 verifiche manuali, collegate ai criteri che coprono
src/dichiarazione.js scheda preparatoria e distinzione tra i due regimi
src/argomenti.js     argomenti da riga di comando
src/aggrega.js       aggregazione dei risultati
src/scan.js          Playwright + axe-core
src/report.js        Markdown e JSON
src/cli.js           entry point
```

`scan.js` e `cli.js` sono gli unici che importano Playwright. Il resto gira senza browser, e un test lo verifica.

## Test

```bash
npm test
```

53 test, nessuna dipendenza: girano anche prima di `npm install`. Oltre alla meccanica controllano il contenuto — che i titoli siano quelli della traduzione ufficiale W3C, che 3.1.2 sia classificato AA (le fonti secondarie sbagliano spesso), che due regole dello stesso criterio non ricevano lo stesso consiglio, che la scheda non si presenti mai come una dichiarazione valida.

## Da dove vengono i contenuti

I titoli dei criteri sono la [traduzione ufficiale W3C](https://www.w3.org/Translations/WCAG21-it/) e non vanno riscritti: sono i nomi con cui i criteri compaiono negli atti.

I testi di impatto e correzione sono miei. Non sono testo normativo e non vanno citati come tale.

Il quadro normativo viene dalle fonti AgID ed è orientativo, non consulenza legale.

## Contribuire

Quello che serve di più, in ordine:

1. Verifiche con screen reader che smentiscono il report. Se il tool dà per pulito un sito che NVDA rivela inagibile, voglio saperlo.
2. Siti italiani su cui lo scanner sbaglia o si rompe.
3. Correzioni ai testi, soprattutto da chi fa accessibilità di mestiere.
4. Regole axe non ancora tradotte.

Gli errori normativi hanno la precedenza su tutto.

## Licenza

Apache 2.0, scelta rispetto a MIT per la concessione di brevetto e la clausola sui marchi, che pesano quando il software entra in un'azienda o in un ente.

axe-core e @axe-core/playwright sono MPL-2.0, copyleft a livello di file: usarli come dipendenze non vincola questo codice, modificarne i file sì. Playwright è Apache 2.0.

## Avvertenza

Strumento di supporto tecnico. Non sostituisce una valutazione professionale di accessibilità e non è consulenza legale. Il perimetro di applicazione delle norme va verificato caso per caso.
