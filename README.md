# Conforme

**English** · [Italiano](README.it.md)

Accessibility scanner for Italian websites. axe-core runs the scan; Conforme maps every violation to its WCAG criterion, explains who is locked out, and says what to change in the code. Reports are written in Italian, because the people who have to act on them are Italian, and so is the law they answer to.

It exists because existing scanners return lists of rules in English, which the person deciding whether to pay for a fix cannot interpret.

```bash
npm install
npx playwright install chromium
npm start -- example.it
```

`report.md` and `scheda-dichiarazione.md` are written to a folder named after the site, for instance `report_comune-milano-it/`. Report folders stay out of the repository: they concern third-party sites and change on every run.

## What it produces

The report lists problems in order of consequence for the user, not technical severity. Each entry gives the WCAG criterion, the impact in plain words, the fix for that specific rule, and the code where it occurs. This is what an entry looks like — the output is in Italian:

```
### 1. Link senza testo riconoscibile

BLOCCANTE — impedisce di usare il sito
Occorrenze: 19 su 1 pagina
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

That is a real case: nineteen links to the city districts on the Comune di Milano homepage, none of which contains any text. A screen reader user hears nineteen identical links and cannot pick their own district.

## The keyboard test

axe analyses the DOM at rest and cannot press Tab. That is why keyboard criteria normally end up on the manual list, and why they remain the most blocking and least checked barrier on the web.

Conforme walks the page by actually pressing Tab, and checks four things: that visible interactive elements receive focus, that focus never gets stuck, that something changes on screen when an element is focused, and that the first Tab offers a link to skip to the content.

A fifth check does not depend on the walk: a `<div>` with `role="button"` and no `tabindex` is not in the tab order, and that can be read from the document without pressing anything. Composite widgets that manage focus with `aria-activedescendant` — menus, tabs, listboxes — are excluded, because there that behaviour is what the standard prescribes.

### When the walk can't be trusted, Conforme stays silent

The Tab walk can stop before covering the page: a cookie banner or a modal holds the focus, or a script sends it back to the start. The elements it never reached are not unreachable — the walk simply never got there — and reporting them would be a false accusation.

Conforme compares how much it covered with how much there was to cover. If a minority is left out, those elements are the problem and get reported. If most of the page is left out, the problem is the walk: Conforme reports no elements and states instead that the check did not complete, and where it stopped. It does not blame an arbitrary container just because it holds the elements the walk touched: it has to be something sitting above the page — a dialog or an overlay — otherwise the cause is declared unknown.

This check comes from a real mistake on comune.milano.it: the walk touched four elements out of more than a hundred, and the report declared a working "skip to content" link unreachable.

Once the container is found, there is the question that seems to settle everything: is it a barrier, or intended behaviour? Conforme does not answer it, and the reason is worth spelling out.

To start from the top of the page, the walk moves focus to the document itself — a state no person ever produces. Consent managers react to exactly that, pulling focus back into themselves. From then on the check is measuring its own interference, and there is no way to separate that from the site's behaviour.

On comune.milano.it Conforme reported a blocking violation of 2.1.2 (No Keyboard Trap) for a banner you can leave by pressing Tab. Two fixes tried to make that verdict truthful: first a test with Esc, then thirty Tab presses without touching focus. The false verdict survived both. A check that is wrong twice on the same real site does not get tuned a third time: it gets removed from the claims.

So Conforme no longer asserts focus confinement. It reports what it observed — the walk stopped inside this container, and says nothing about these elements — notes what it found when trying to get out, and tells the reader how to check it in thirty seconds. It goes among the items to review, not the problems.

The other kind of trap is still asserted: the one where focus does not move at all. There is nothing to interpret there — Tab is pressed and focus stays where it was.

The limits of the method should be stated: it observes mechanical facts, not usability. It can tell that an element receives focus, not that the indicator is perceivable; that no element is unreachable, not that a checkout can be completed. It moves these criteria from "not verifiable" to "partially verified".

## Reflow, zoom and text spacing

Three more tests axe cannot run, because they require resizing the window and changing styles.

The window is set to 320 px wide — the equivalent of 400% zoom — and Conforme measures whether horizontal scrolling appears, tracing it back to the elements that cause it. Tables, images and preformatted blocks go into a separate entry: WCAG allows an exception for content that genuinely needs a two-dimensional layout, so they are reviewed rather than accused.

Then the spacing from criterion 1.4.12 is applied — line height 1.5, paragraph spacing 2em, letter spacing 0.12em, word spacing 0.16em — and Conforme looks at which containers start clipping text. Elements that were clipped before are not attributed to spacing: that is a different problem.

The limit is stated here too: it measures whether content scrolls or gets clipped, not whether the reflowed layout still makes sense. A page can have no horizontal scrolling and still have its menu covering the content.

## The other checks

Several criteria depend on how the page behaves, not on how it is written, and cannot be seen in the DOM. Conforme derives them by observing the document and trying light interactions.

Before the page loads, `addEventListener` is replaced so that there is a record of which events the page listens for. It is the only way to know that there are global keyboard shortcuts, actions that fire on press instead of release, or features triggered by shaking the device: attributes keep no trace of them, and `getEventListeners` only exists in developer tools.

The document is then read for audio that starts on its own, endless animations with no pause control, orientation locks in stylesheets, media without captions or transcripts, and the ways available to reach pages.

Two tests require acting: each field is focused and its value changed, to see whether the page navigates or submits on its own. The attempts are intercepted and cancelled, and forms that look like they do serious things — payments, deletions — are not touched at all.

Finally, source order is compared with on-screen position inside flex and grid containers, which is how CSS actually reorders blocks.

## Who has to fix it

A report that says "your site has thirteen problems" puts on the same level things that get fixed in very different ways. On comune.milano.it four findings out of thirteen do not come from the city's own code: they come from the cookie consent manager and from a form embedded from an external provider. Whoever receives that report cannot open an editor and fix them.

Conforme tells the two apart, with two levels of certainty kept separate because they are not worth the same. An element inside an iframe served from another domain is a fact, readable from the address. A component recognised by the names it leaves in class attributes — OneTrust, Iubenda, reCAPTCHA, about twenty in all — is a very likely hypothesis, and the report says so. The list of known components will never be complete: anything not recognised is attributed to the site, because it is better to blame the site for a third party's problem than to clear it of one of its own.

Attribution is not an excuse, and the report says so. For organisations under the Legge Stanca, Directive (EU) 2016/2102 excludes third-party content in Article 1(4)(e), but only under three conditions that must all hold: the content is neither funded, nor developed, nor under the control of the obliged body. A cookie banner that was chosen, paid for and configured is under the control of whoever put it there. For organisations under the European Accessibility Act no equivalent exclusion appears to exist.

## Asserted versus to review

Some of these checks find facts: an `autoplay` without `muted` is a violation, not an opinion. Others find clues that the code alone cannot judge — a wide table may be a legitimate exception, a shortcut may already use a modifier key, a `mousedown` handler may only be preparing a drag.

The latter are not listed as problems. They go into a separate section, together with the checks axe could not resolve, and are not counted. Presenting them as faults, labelled "serious" to boot, would cost the rest of the report its credibility.

## Coverage

Of the 50 WCAG 2.1 level A and AA success criteria, automated analysis fully verifies 4, partially catches 33, and cannot say anything about the remaining 13.

The thirteen left out are those that require understanding rather than measuring: the quality of audio descriptions, instructions that rely on shape and position, text inside images, flashing, consistency across pages, and judgement on error messages.

So a report without errors does not certify conformance, and the report says so at the top. Alongside the problems found it always produces a checklist of 14 manual checks covering the remaining criteria, with time estimates.

The numbers are computed by the code: each criterion declares whether it can be automated, and the totals update themselves.

## Two different obligations in Italy

They are often confused, even by people selling consulting, and the difference decides what has to be done.

**Legge Stanca** (Law 4/2004, extended by Decree-Law 76/2020) covers public administrations, publicly controlled companies and private organisations with average turnover above €500 million. The accessibility statement is only valid if filled in on form.agid.gov.it — the form run by AgID, the Italian digital agency. It must be updated by 23 September every year, and no document produced by an external tool can replace it.

**European Accessibility Act** (Directive (EU) 2019/882, Legislative Decree 82/2022) covers businesses above the micro-enterprise threshold, from 28 June 2025. Accessibility information is mandatory, but the AgID format is not.

That is why the generated file is a preparatory worksheet (`scheda-dichiarazione.md`) and not a statement: in the first case it collects the data to copy into the AgID form, in the second it can become the basis of the document to publish.

## Usage

```bash
npm start -- example.it                          # the scheme can be omitted
npm start -- example.it example.it/contacts      # several pages
npm start -- --file urls.txt --out my-folder     # a folder of your choice
npm start -- localhost:3000                      # in development, uses http
npm start -- example.it --json                   # raw data as well
```

Exits with code 1 when there are blocking problems or unreachable pages, so that regressions can fail a CI build.

If Chrome or Chromium is already installed, Playwright's download can be skipped:

```bash
export CONFORME_BROWSER_PATH=/path/to/chromium
```

## Priority

1. prevents use of the site
2. serious obstacle
3. slows down without preventing

Insufficient contrast and a form that cannot be completed by keyboard both have `serious` severity in axe. For the person using the site they are not the same thing.

## Pages that are not the site

A 403 error, an anti-bot screen or a maintenance page still return a page, which a naive scanner analyses as if it were the site requested.

It happened while scanning agid.gov.it: the server answered with a CloudFront error page, and the report blamed AgID for a missing `lang` attribute that belonged to Amazon. Now 4xx and 5xx responses are discarded and intermediate screens are flagged.

For the same reason the report states how many checks passed: a real page passes twenty or thirty, an error screen four. Without that figure, "zero violations" and "the scanner loaded nothing" read the same.

## Unresolved checks

axe also returns the checks it could not resolve — almost always contrast over images or gradients, where the colour behind the text cannot be computed. They are collected in a separate section and not counted as problems.

## As a library

Function names are in Italian, like the rest of the code.

```js
import { scansiona, reportMarkdown } from 'conforme';

const esito = await scansiona(['https://example.it']);
console.log(reportMarkdown(esito));
```

Mapping, aggregation and reporting do not depend on the browser, so results collected elsewhere can be passed in.

```js
import { riepiloga, normalizzaViolazioni } from 'conforme';

const pagine = [{ url, errore: null, violazioni: normalizzaViolazioni(risultatiAxe.violations) }];
const esito = { dataScansione: new Date().toISOString(), pagine, riepilogo: riepiloga(pagine) };
```

## Files

```
src/wcag-it.js       the 50 criteria: official title, impact, fix, whether automatable
src/regole-it.js     axe rules, each with its own description and fix
src/tastiera.js      the keyboard test, driving the browser
src/reflow.js        reflow at 320 px, text at 200%, text spacing
src/ascoltatori.js   records which events the page listens for
src/media.js         audio, animation, orientation, device motion
src/interazione.js   pointer, shortcuts, changes of context
src/struttura.js     reading order, ways of navigating
src/manuale.js       the 14 manual checks, linked to the criteria they cover
src/dichiarazione.js preparatory worksheet and the distinction between the two laws
src/argomenti.js     command-line arguments
src/testo.js         plural agreement in generated documents
src/origine.js       attributes each finding to the site or to an external component
src/aggrega.js       aggregation of results
src/scan.js          Playwright + axe-core
src/report.js        Markdown and JSON
src/cli.js           entry point
```

The modules that drive the browser are `scan.js`, `tastiera.js`, `reflow.js`, `media.js`, `interazione.js`, `struttura.js`, `ascoltatori.js` and `cli.js`. Everything else runs without a browser, and a test checks that it does.

## Tests

```bash
npm test
```

121 tests, no dependencies: they run even before `npm install`. Beyond behaviour they check content: that criterion titles match the official W3C Italian translation, that criterion 3.1.2 is classified AA (secondary sources often get it wrong), that two rules under the same criterion never get the same advice, that the worksheet never presents itself as a valid statement.

```bash
npm run test:browser
```

The checks that drive the browser, on pages built for the purpose: a banner that holds focus with no way out, one that closes with Esc, a correct page, one with fake controls, one where the walk stops for no identifiable reason, one that takes focus back from the document without being a trap, and one with third-party components. They need Chromium, which is why they are kept separate. Both suites run on GitHub on every push.

The pages are served over HTTP on two ports rather than opened from disk: third-party attribution compares origins, and a `file://` origin is opaque — a test like that would always see "same origin" and pass even with broken code.

Every check has a page that should trigger it and one that must not. The second matters more: it is the one that exposes false accusations, and the only one that tells a working check from a switched-off one.

## Where the content comes from

Criterion titles are taken from the [official W3C Italian translation](https://www.w3.org/Translations/WCAG21-it/) and must not be rewritten: they are the names under which the criteria appear in official documents.

The impact and fix texts are the author's own writing. They are not normative text and should not be quoted as such.

The legal framework is drawn from AgID sources. It is for guidance only and is not legal advice.

## Contributing

In order of usefulness:

1. Screen reader checks that contradict the report. If the tool calls a site clean and NVDA shows it is unusable, that is the most valuable report there is.
2. Italian sites where the scanner gets things wrong or breaks.
3. Corrections to the texts, especially from people who do accessibility for a living.
4. axe rules not yet translated.

Reports of legal errors take priority over everything else.

Issues and pull requests are welcome in English or Italian.

## License

Apache 2.0.

axe-core and @axe-core/playwright are distributed under MPL-2.0, which is copyleft at file level: using them as dependencies does not bind this code, modifying their files does. Playwright is distributed under Apache 2.0.

## Disclaimer

A technical support tool. It does not replace a professional accessibility evaluation and is not legal advice. Whether the laws apply has to be checked case by case.
