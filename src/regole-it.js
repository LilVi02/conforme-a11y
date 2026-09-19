/**
 * Traduzione in italiano delle regole axe-core più frequenti.
 *
 * axe restituisce descrizioni in inglese. Dato che questo strumento serve a
 * far capire il problema a chi deve correggerlo — spesso un cliente, non uno
 * sviluppatore — la descrizione va detta in italiano e in termini di cosa è
 * rotto, non di quale regola è scattata.
 *
 * Le regole non presenti qui ricadono sulla descrizione inglese di axe:
 * meglio una frase in inglese che nessuna informazione.
 */

export const REGOLE_IT = {
  'area-alt': 'Aree delle mappe immagine senza testo alternativo',
  'aria-allowed-attr': 'Attributi ARIA non ammessi sul ruolo usato',
  'aria-hidden-body': 'aria-hidden applicato al body',
  'aria-hidden-focus': 'Elementi nascosti agli screen reader ma raggiungibili da tastiera',
  'aria-input-field-name': 'Campi ARIA senza nome accessibile',
  'aria-required-attr': 'Attributi ARIA obbligatori mancanti',
  'aria-required-children': 'Ruoli ARIA senza gli elementi figli richiesti',
  'aria-required-parent': 'Ruoli ARIA senza l\'elemento contenitore richiesto',
  'aria-roles': 'Ruoli ARIA non validi',
  'aria-toggle-field-name': 'Controlli di attivazione senza nome accessibile',
  'aria-valid-attr-value': 'Valori non validi negli attributi ARIA',
  'aria-valid-attr': 'Attributi ARIA scritti in modo errato',
  'autocomplete-valid': 'Attributo autocomplete non valido',
  'blink': 'Uso dell\'elemento blink',
  'button-name': 'Pulsanti senza testo o nome accessibile',
  'bypass': 'Nessun modo per saltare i blocchi ripetuti e arrivare al contenuto',
  'color-contrast': 'Contrasto insufficiente tra testo e sfondo',
  'definition-list': 'Liste di definizioni strutturate in modo errato',
  'dlitem': 'Elementi di lista di definizione fuori dal contenitore corretto',
  'document-title': 'Pagina senza titolo',
  'duplicate-id-aria': 'Identificatori duplicati usati da ARIA',
  'form-field-multiple-labels': 'Campi con più etichette in conflitto',
  'frame-title': 'Frame o iframe senza titolo',
  'html-has-lang': 'Lingua della pagina non dichiarata',
  'html-lang-valid': 'Codice di lingua non valido',
  'html-xml-lang-mismatch': 'Attributi lang e xml:lang discordanti',
  'image-alt': 'Immagini senza testo alternativo',
  'input-button-name': 'Pulsanti input senza valore o nome accessibile',
  'input-image-alt': 'Pulsanti immagine senza testo alternativo',
  'label': 'Campi di modulo senza etichetta',
  'link-in-text-block': 'Link distinguibili solo dal colore',
  'link-name': 'Link senza testo riconoscibile',
  'list': 'Liste strutturate in modo errato',
  'listitem': 'Elementi di lista fuori da un contenitore di lista',
  'marquee': 'Uso dell\'elemento marquee',
  'meta-refresh': 'Ricaricamento automatico della pagina',
  'meta-viewport': 'Zoom disabilitato dal meta viewport',
  'nested-interactive': 'Controlli interattivi annidati uno dentro l\'altro',
  'object-alt': 'Elementi object senza testo alternativo',
  'role-img-alt': 'Elementi con role="img" senza testo alternativo',
  'scrollable-region-focusable': 'Aree scorrevoli non raggiungibili da tastiera',
  'select-name': 'Menu a tendina senza nome accessibile',
  'server-side-image-map': 'Mappe immagine lato server',
  'svg-img-alt': 'SVG informativi senza testo alternativo',
  'td-headers-attr': 'Celle di tabella con riferimenti di intestazione errati',
  'th-has-data-cells': 'Intestazioni di tabella senza celle associate',
  'valid-lang': 'Codice di lingua non valido su un elemento',
  'video-caption': 'Video senza sottotitoli',
};

/** Descrizione in italiano della regola, con fallback alla descrizione di axe. */
export function descriviRegola(regola, descrizioneAxe) {
  return REGOLE_IT[regola] || descrizioneAxe || regola;
}
