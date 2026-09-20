/**
 * Piccoli aiuti per scrivere in italiano corretto nei documenti generati.
 *
 * Esiste per una ragione che sembra cosmetica e non lo è. Questo progetto
 * produce documenti che qualcuno allega a un preventivo o porta a un
 * responsabile, e "1 pagina/e" o "6 contenitore/i" li fa leggere come uscite
 * di una macchina, non come lavoro di qualcuno. Chi legge smette di fidarsi
 * della sostanza per colpa della forma, e la sostanza qui costa fatica.
 *
 * La barra è la scorciatoia di chi non vuole gestire il plurale. Gestirlo
 * costa una funzione.
 */

/**
 * Accorda un numero con il suo sostantivo.
 * @example plurale(1, 'pagina', 'pagine')  // "1 pagina"
 * @example plurale(3, 'pagina', 'pagine')  // "3 pagine"
 */
export function plurale(n, singolare, plurale_) {
  return `${n} ${n === 1 ? singolare : plurale_}`;
}

/**
 * Come sopra, ma con l'articolo o la preposizione che cambia insieme al
 * numero: "su una pagina" contro "su 3 pagine".
 */
export function conArticolo(n, unoSingolare, plurale_) {
  return n === 1 ? unoSingolare : `${n} ${plurale_}`;
}
