/**
 * API pubblica di Conforme.
 *
 * Nota: scansiona/scansionaPagina richiedono Playwright e un browser
 * installato. Tutto il resto (aggregazione, mappatura, report) è logica pura
 * e utilizzabile da sola, importando i singoli moduli.
 */

export { scansiona, scansionaPagina } from './scan.js';
export { riepiloga, normalizzaViolazioni } from './aggrega.js';
export { reportMarkdown, reportJson } from './report.js';
export { schedaPreparatoria, statoSuggerito, bozzaDichiarazione } from './dichiarazione.js';
export { CRITERI, CODICI, COPERTURA, CONTESTO_NORMATIVO, PRINCIPI, PRIORITA, scheda, criteriDaTag, prioritaViolazione, criteriNonAutomatizzabili } from './wcag-it.js';
export { REGOLE_IT, descriviRegola } from './regole-it.js';
export { VERIFICHE_MANUALI, NOTA_COPERTURA, notaCopertura, criteriScoperti, criteriCopertiDaVerifiche } from './manuale.js';
export { normalizzaUrl, parseArgs, urlDaTesto } from './argomenti.js';
