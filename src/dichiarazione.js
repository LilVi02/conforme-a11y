/**
 * Scheda preparatoria per la Dichiarazione di Accessibilità.
 *
 * Qui è in gioco la responsabilità di chi userà questo strumento, quindi una
 * precisazione che nessun generatore dovrebbe omettere:
 *
 * Per i soggetti della Legge Stanca (PA, società controllate, privati sopra i
 * 500 milioni di fatturato) la dichiarazione è valida SOLO se compilata sul
 * modello online di AgID (form.agid.gov.it). AgID lo dice espressamente. Un
 * documento prodotto da questo o da qualsiasi altro strumento NON sostituisce
 * quella compilazione: può solo aiutare a prepararla.
 *
 * Per i soggetti EAA (imprese sopra la soglia di microimpresa) il formato AgID
 * non è imposto: si può usare una struttura propria, purché contenga le
 * informazioni richieste. In quel caso questa scheda può diventare la base del
 * documento da pubblicare, dopo revisione.
 *
 * Per questo il file generato si chiama "scheda preparatoria" e non
 * "dichiarazione": la differenza non è formale.
 */

import { CONTESTO_NORMATIVO, COPERTURA } from './wcag-it.js';
import { descriviRegola } from './regole-it.js';

const URL_FORM_AGID = 'https://form.agid.gov.it';

/** "1 occorrenze" si nota, e un documento che va a un cliente non se lo può permettere. */
const plurale = (n, singolare, plurale_) => `${n} ${n === 1 ? singolare : plurale_}`;

/** Stato di conformità suggerito dai soli dati automatici. */
export function statoSuggerito(riepilogo) {
  if (riepilogo.bloccanti > 0) return 'non conforme';
  if (riepilogo.problemiDistinti > 0) return 'parzialmente conforme';
  return 'non determinabile senza le verifiche manuali';
}

export function schedaPreparatoria(esito, opzioni = {}) {
  const { sito = esito.pagine?.[0]?.url || '[URL del sito]' } = opzioni;
  const r = esito.riepilogo;
  const oggi = new Date().toLocaleDateString('it-IT');
  const stato = statoSuggerito(r);

  const stanca = CONTESTO_NORMATIVO.regimi.find((x) => x.id === 'stanca');
  const eaa = CONTESTO_NORMATIVO.regimi.find((x) => x.id === 'eaa');

  // Le tre motivazioni sono quelle del modello AgID (allegato al DM sul
  // modello di dichiarazione, art. 3-bis L. 4/2004), non un elenco inventato:
  // a) inosservanza della normativa, b) onere sproporzionato, c) contenuto
  // non rientrante nell'ambito di applicazione.
  //
  // La versione precedente scriveva "contenuto di terzi" come terza voce da
  // spuntare. È un errore che invita a un abuso: l'esclusione dei contenuti
  // di terzi non è una categoria a sé, è un caso particolare della lettera c)
  // e vale solo a tre condizioni cumulative. Un banner scelto e configurato
  // dal soggetto non rientra.
  const MOTIVI =
    '  - Motivo (modello AgID): [ ] a) inosservanza della normativa · [ ] b) onere sproporzionato · [ ] c) contenuto non rientrante nell\'ambito di applicazione';

  const contenutiNonAccessibili =
    r.problemi.length === 0
      ? '_Nessuna violazione rilevata dai controlli automatici. Le voci vanno ricavate dalle verifiche manuali._'
      : r.problemi
          .slice(0, 20)
          .map((p) => {
            const c = p.criteri.find((x) => x.titolo) || p.criteri[0];
            const rif = c?.codice ? `criterio ${c.codice}${c.titolo ? ` — ${c.titolo}` : ''}` : 'criterio da determinare';
            const righe = [
              `- **${descriviRegola(p.regola, p.descrizioneAxe)}** (${rif}) — riscontrato su ${plurale(p.pagine.length, 'pagina', 'pagine')}.`,
              MOTIVI,
            ];
            // Dove l'origine è nota, va scritta: è il dato che serve a
            // decidere chi interviene, e a non spuntare la lettera c) per
            // riflesso.
            if (p.origine && !p.origine.tutteDalSito) {
              const nomi = p.origine.componenti.map((x) => x.nome).join(', ');
              righe.push(
                `  - Origine: ${p.origine.tutteDaTerzi ? 'tutte le occorrenze' : `${plurale(p.origine.daTerzi, 'occorrenza', 'occorrenze')} su ${p.origine.totale}`} da componenti di terze parti (${nomi}). Non basta a invocare la lettera c): vedi la nota sui contenuti di terzi più sotto.`
              );
            }
            righe.push('  - Alternativa accessibile disponibile: [descrivere, oppure "nessuna"]');
            righe.push('  - Intervento previsto entro: [data]');
            return righe.join('\n');
          })
          .join('\n');

  // Nota sui contenuti di terzi: compare solo se ce ne sono, ed è il punto in
  // cui qualcuno potrebbe leggere l'attribuzione come una scusante.
  const t = CONTESTO_NORMATIVO.contenutiDiTerzi;
  const notaTerzi = r.componentiEsterni?.length
    ? `
## Componenti di terze parti rilevati

${r.componentiEsterni
  .map(
    (c) =>
      `- **${c.nome}**${c.tipo ? ` — ${c.tipo}` : ''}: ${plurale(c.regole, 'segnalazione', 'segnalazioni')}, ${plurale(c.occorrenze, 'occorrenza', 'occorrenze')}. Riconosciuto ${c.certezza === 'certa' ? 'con certezza, perché il contenuto è servito da un altro dominio' : 'dai nomi che lascia nel codice: ipotesi probabile, da confermare'}.`
  )
  .join('\n')}

Queste segnalazioni non si correggono modificando il codice del sito: si
interviene sulle impostazioni del componente, lo si aggiorna, se ne chiede la
correzione al fornitore o lo si sostituisce.

> **Non è una motivazione di esclusione.** ${t.condizioni} ${t.conseguenza}
>
> ${t.eaa}
>
> Fonte: ${t.fonte}
`
    : '';

  // Il metodo di valutazione è ciò che documenta la diligenza: va descritto
  // per quello che è stato fatto davvero, non genericamente come "analisi
  // automatica". Conforme esegue anche prove che axe non fa.
  const prove = ['analisi statica del DOM con axe-core (WCAG 2.1 A e AA)'];
  if (r.tastiera) {
    prove.push(
      `percorso della pagina premendo Tab (${r.tastiera.elementiPercorsi} elementi raggiunti, ${r.tastiera.focusControllati} indicatori di focus confrontati)`
    );
  }
  if (r.reflow) {
    prove.push(
      'ricalcolo del flusso a 320 px di larghezza, ingrandimento del solo testo al 200% e applicazione della spaziatura prevista dal criterio 1.4.12'
    );
  }
  prove.push(
    'rilevazione degli ascoltatori di eventi registrati dalla pagina, per scorciatoie da tastiera, gesti, azioni alla pressione e movimento del dispositivo'
  );
  prove.push('confronto fra ordine del codice e posizione a schermo nei contenitori flex e grid');

  return `# Scheda preparatoria — Dichiarazione di Accessibilità

**Questo NON è una dichiarazione di accessibilità.** È il materiale con cui
prepararne una. Va letto insieme alla nota sul regime applicabile qui sotto.

- **Sito/servizio:** ${sito}
- **Data dell'analisi:** ${oggi}
- **Pagine analizzate:** ${r.pagineScansionate}
- **Standard di riferimento:** ${CONTESTO_NORMATIVO.standard}

---

## Prima di tutto: quale regime ti riguarda?

Gli obblighi in Italia sono due e diversi. Stabilire quale si applica è il
primo passo, perché cambia sia il formato sia la procedura.

### A. ${stanca.nome}

**Chi:** ${stanca.soggetti}

**Dichiarazione:** ${stanca.dichiarazione}

**Scadenza:** ${stanca.scadenza}

**Riferimenti:** ${stanca.riferimenti.join(' · ')}

> Se ricadi qui, questa scheda ti serve solo a raccogliere i dati: la
> dichiarazione va compilata su ${URL_FORM_AGID} e nient'altro vale.

### B. ${eaa.nome}

**Chi:** ${eaa.soggetti}

**Dichiarazione:** ${eaa.dichiarazione}

**Scadenza:** ${eaa.scadenza}

**Riferimenti:** ${eaa.riferimenti.join(' · ')}

> Se ricadi qui, puoi usare questa scheda come base del documento da
> pubblicare, dopo averla completata e fatta rivedere.

---

## Dati da raccogliere

- **Soggetto erogatore:** [denominazione completa]
- **Partita IVA / Codice fiscale:** [ ]
- **Sito o servizio oggetto della dichiarazione:** ${sito}
- **Referente per l'accessibilità:** [nome e ruolo]
- **Contatto per le segnalazioni:** [email o modulo dedicato]
- **Data di pubblicazione prevista:** [ ]

## Stato di conformità

Indicazione ricavata dai soli controlli automatici: **${stato}**

> Attenzione: questo dato non è sufficiente a dichiarare nulla. Dei ${COPERTURA.totale} criteri WCAG 2.1 di livello A e AA, i controlli automatici ne verificano pienamente ${COPERTURA.automatici}, ne intercettano parzialmente ${COPERTURA.parziali} e non dicono nulla sui restanti ${COPERTURA.manuali}. Uno stato di conformità va determinato dopo le verifiche manuali elencate nel report. Dichiarare una conformità non verificata espone a responsabilità.

Scelta finale: [ ] conforme · [ ] parzialmente conforme · [ ] non conforme

## Contenuti non accessibili

${contenutiNonAccessibili}
${
  r.daVerificare?.length
    ? `
Oltre a questi, ${plurale(r.occorrenzeDaVerificare, 'caso non è stato deciso', 'casi non sono stati decisi')} dal
controllo automatico: sono elencati nel report sotto "Da guardare". Vanno
esaminati prima di compilare questa sezione, perché alcuni potrebbero essere
violazioni da dichiarare e altri comportamenti legittimi.
`
    : ''
}${notaTerzi}
## Metodo di valutazione

Prove eseguite automaticamente su ${plurale(r.pagineScansionate, 'pagina', 'pagine')}, in data ${oggi}:

${prove.map((p) => `- ${p}`).join('\n')}

Da completare:

- Verifiche manuali svolte: [quali, da chi, con quali tecnologie assistive, in che data]
- Valutazione di terza parte: [se presente, indicare il soggetto]

## Meccanismo di feedback

Le segnalazioni sulle barriere riscontrate possono essere inviate a: [contatto].
Tempo di risposta dichiarato: [n] giorni.

> Il meccanismo di feedback è un obbligo, non un'aggiunta facoltativa: dev'essere
> raggiungibile e presidiato davvero.

## Procedura di attuazione

In caso di risposta insoddisfacente l'utente può rivolgersi alle autorità
competenti. [Verificare i riferimenti aggiornati presso AgID prima di
pubblicare: la procedura differisce tra i due regimi.]

---

## Da fare prima di pubblicare

- [ ] Stabilito con certezza quale regime si applica
- [ ] Completate le verifiche manuali elencate nel report
- [ ] Documentate data, strumenti e persone delle verifiche
- [ ] Attivato e presidiato il contatto per le segnalazioni
- [ ] Se soggetti Legge Stanca: compilato il modello su ${URL_FORM_AGID}
- [ ] Fatto rivedere il testo a chi se ne assume la responsabilità

---

*Scheda generata il ${oggi} con Conforme. ${CONTESTO_NORMATIVO.avvertenza}*
`;
}

/**
 * Nome precedente della funzione, mantenuto perché la libreria era già
 * pubblicata con questo export. Sconsigliato: il nome "bozza di
 * dichiarazione" suggeriva un documento pronto da rifinire, che è
 * esattamente l'equivoco che questo modulo esiste per evitare.
 */
export const bozzaDichiarazione = schedaPreparatoria;
