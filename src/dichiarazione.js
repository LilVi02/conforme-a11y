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

import { CONTESTO_NORMATIVO } from './wcag-it.js';
import { descriviRegola } from './regole-it.js';

const URL_FORM_AGID = 'https://form.agid.gov.it';

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

  const contenutiNonAccessibili =
    r.problemi.length === 0
      ? '_Nessuna violazione rilevata dai controlli automatici. Le voci vanno ricavate dalle verifiche manuali._'
      : r.problemi
          .slice(0, 20)
          .map((p) => {
            const c = p.criteri.find((x) => x.titolo) || p.criteri[0];
            const rif = c?.codice ? `criterio ${c.codice}${c.titolo ? ` — ${c.titolo}` : ''}` : 'criterio da determinare';
            return `- **${descriviRegola(p.regola, p.descrizioneAxe)}** (${rif}) — riscontrato su ${p.pagine.length} pagina/e.\n  - Motivo: [ ] non conformità · [ ] onere sproporzionato · [ ] contenuto di terzi\n  - Alternativa accessibile disponibile: [descrivere, oppure "nessuna"]\n  - Intervento previsto entro: [data]`;
          })
          .join('\n');

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

> Se ricadi qui, questa scheda ti serve solo a raccogliere i dati: la
> dichiarazione va compilata su ${URL_FORM_AGID} e nient'altro vale.

### B. ${eaa.nome}

**Chi:** ${eaa.soggetti}

**Dichiarazione:** ${eaa.dichiarazione}

**Scadenza:** ${eaa.scadenza}

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

> Attenzione: questo dato non è sufficiente a dichiarare nulla. I controlli
> automatici verificano pienamente solo 4 dei 50 criteri WCAG 2.1 A/AA. Uno
> stato di conformità va determinato dopo le verifiche manuali elencate nel
> report. Dichiarare una conformità non verificata espone a responsabilità.

Scelta finale: [ ] conforme · [ ] parzialmente conforme · [ ] non conforme

## Contenuti non accessibili

${contenutiNonAccessibili}

## Metodo di valutazione

- Analisi automatica con axe-core su ${r.pagineScansionate} pagina/e, in data ${oggi}
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
