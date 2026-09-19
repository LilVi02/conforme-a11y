# Conforme

Scanner di accessibilità che collega ogni violazione tecnica al criterio WCAG corrispondente, spiegato in italiano, e dice **chi viene escluso** e **cosa scrivere al posto di cosa**.

La differenza rispetto agli altri scanner non è la scansione — quella la fa axe-core, come tutti. È cosa succede dopo: un report che una persona non tecnica può leggere e su cui può decidere, e una dichiarazione esplicita di ciò che lo strumento **non** può verificare.

## Cosa c'è dentro

- **Tutti e 50 i criteri WCAG 2.1** di livello A e AA, con i titoli nella traduzione ufficiale W3C
- Per ogni criterio: chi viene escluso concretamente, e come si corregge nel codice
- **48 regole axe tradotte** in italiano
- **14 verifiche manuali** che coprono i 46 criteri che l'automazione non verifica
- Contesto normativo italiano, con i **due regimi distinti** (Legge Stanca ed EAA) tenuti separati
- Scheda preparatoria per la Dichiarazione di Accessibilità

## Onestà sui limiti, con i numeri

Dei 50 criteri WCAG 2.1 A/AA, un controllo automatico:

| | |
|---|---|
| ne verifica **pienamente** | 4 |
| ne intercetta **parzialmente** | 15 |
| non può dire nulla su | 31 |

Questi numeri sono calcolati dai dati del progetto, non citati a memoria: ogni criterio dichiara se è automatizzabile, e il report li ricalcola a ogni esecuzione.

Ne segue una cosa che conviene dire chiaramente: **un report pulito non è una conformità**. Per questo Conforme produce sempre la checklist delle verifiche manuali, e segnala quali criteri resterebbero scoperti. Uno strumento che ti dicesse "100% conforme" ti starebbe mettendo nei guai.

## I due regimi italiani

Confonderli è l'errore più comune nella divulgazione sul tema, e porta a dire a una PMI che deve compilare un modulo che non la riguarda.

| | Legge Stanca (L. 4/2004, D.L. 76/2020) | EAA (Dir. UE 2019/882, D.Lgs. 82/2022) |
|---|---|---|
| **Chi** | PA, società controllate, privati con fatturato medio >500 mln nel triennio | Imprese sopra la soglia di microimpresa (10+ dipendenti **o** >2 mln di fatturato) |
| **Dichiarazione** | Valida **solo** se compilata su form.agid.gov.it | Contenuti obbligatori, ma **formato libero** |
| **Tempi** | Aggiornamento entro il 23 settembre di ogni anno | In vigore dal 28 giugno 2025; transitorio fino al 2030 per il preesistente |

Conforme genera una **scheda preparatoria**, non una dichiarazione: per i soggetti Legge Stanca nessun documento prodotto da uno strumento esterno sostituisce il modulo AgID, e dirlo è parte del lavoro.

## Installazione

```bash
npm install
npx playwright install chromium
```

Se hai già Chrome o Chromium nel sistema (tipico in CI o in Docker):

```bash
export CONFORME_BROWSER_PATH=/percorso/del/chromium
```

## Uso

```bash
# Lo schema si può omettere
npm start -- esempio.it

# Più pagine, con JSON grezzo
npm start -- esempio.it esempio.it/contatti --json

# Da file, una URL per riga (# per i commenti)
npm start -- --file urls.txt --out report-settembre

# Sito in sviluppo (localhost usa http di default)
npm start -- localhost:3000
```

Output:

- `report.md` — problemi in ordine di priorità, con impatto, correzione e frammenti di codice, più la checklist manuale
- `scheda-dichiarazione.md` — materiale per preparare la dichiarazione
- `risultato.json` — dati grezzi (con `--json`)

Exit code `1` se ci sono problemi bloccanti o pagine irraggiungibili: utile in CI.

## Priorità

I problemi sono ordinati per **conseguenza sull'utente**, non per severità tecnica:

| Priorità | Significato |
|---|---|
| 1 | Bloccante: impedisce di usare il sito |
| 2 | Grave: ostacolo serio |
| 3 | Attrito: rallenta senza impedire |

## Come libreria

```js
import { scansiona, reportMarkdown } from 'conforme';

const esito = await scansiona(['https://esempio.it']);
console.log(reportMarkdown(esito));
```

Aggregazione, mappatura e report sono separati dalla scansione e non richiedono un browser: puoi darci in pasto risultati raccolti altrove.

```js
import { riepiloga, normalizzaViolazioni, reportMarkdown } from 'conforme';

const pagine = [{ url, errore: null, violazioni: normalizzaViolazioni(risultatiAxe.violations) }];
const esito = { dataScansione: new Date().toISOString(), pagine, riepilogo: riepiloga(pagine) };
```

## Struttura

```
src/wcag-it.js       I 50 criteri: titoli ufficiali, impatto, correzione, automatizzabilità
src/regole-it.js     Traduzione delle regole axe-core
src/manuale.js       Le 14 verifiche non automatizzabili, collegate ai criteri
src/dichiarazione.js Scheda preparatoria e distinzione tra i due regimi
src/argomenti.js     Interpretazione degli argomenti (logica pura)
src/aggrega.js       Aggregazione (logica pura, senza browser)
src/scan.js          Motore Playwright + axe-core
src/report.js        Report Markdown e JSON
src/cli.js           Riga di comando
```

## Test

```bash
npm test
```

44 test, senza browser né rete: girano anche prima di `npm install`. Una parte presidia la **correttezza del contenuto**, non solo il funzionamento del codice:

- che i titoli dei criteri siano quelli ufficiali W3C
- che i livelli di conformità siano corretti (3.1.2 è AA, non A: errore frequente nelle fonti secondarie)
- che la copertura dichiarata corrisponda ai dati reali
- che automazione e checklist insieme non lascino criteri scoperti
- che la scheda non si spacci mai per una dichiarazione valida
- che nessun modulo sotto test importi Playwright (i test devono girare senza browser)

Sono i test che impediscono al progetto di tornare a essere contenuto plausibile e non verificato.

## Provenienza dei contenuti

Distinzione che conta, ed è mantenuta anche nel codice:

- I **titoli dei criteri** sono la traduzione ufficiale autorizzata dal W3C ([WCAG 2.1 in italiano](https://www.w3.org/Translations/WCAG21-it/)). Non vanno riscritti: sono i nomi con cui i criteri compaiono negli atti.
- **Impatto e correzione** sono redazione nostra. Non sono testo normativo e non vanno citati come tale: servono a far capire il problema a chi deve risolverlo.
- Il **quadro normativo** è tratto dalle fonti ufficiali AgID ed è una sintesi orientativa, non consulenza legale.

## Contributi

In ordine di utilità:

1. **Verifiche con screen reader che smentiscono il report** — se il tool dà per pulito un sito che NVDA rivela inagibile, quello è il contributo più prezioso
2. Siti italiani reali su cui lo scanner sbaglia o si rompe
3. Correzioni ai testi di impatto e correzione, soprattutto da chi fa accessibilità di mestiere
4. Traduzioni di regole axe mancanti

Le segnalazioni di errori normativi hanno la precedenza su tutto il resto.

## Avvertenza

Strumento di supporto tecnico. Non sostituisce una valutazione professionale di accessibilità né costituisce consulenza legale. Il perimetro di applicazione delle norme va verificato caso per caso.

## Licenza

MIT

## Fonti

- [WCAG 2.1 — traduzione ufficiale italiana, W3C](https://www.w3.org/Translations/WCAG21-it/)
- [AgID — Dichiarazione di accessibilità](https://www.agid.gov.it/it/design-servizi/accessibilita/dichiarazione-accessibilita)
- [AgID — Linee guida accessibilità per i privati](https://www.agid.gov.it/it/design-servizi/accessibilita/linee-guida-accessibilita-privati)
