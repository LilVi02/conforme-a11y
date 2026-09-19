#!/bin/bash
# Pubblica Conforme su GitHub come repo pubblico.
#
# Uso:  cd ~/github/conforme-a11y && bash pubblica.sh
#
# Lo script è prudente: controlla tutto prima di agire e si ferma spiegando
# il problema invece di lasciare le cose a metà.

set -e

NOME_REPO="conforme-a11y"

echo ""
echo "  Pubblicazione di $NOME_REPO su GitHub"
echo "  ─────────────────────────────────────"
echo ""

# ── Controlli preliminari

if ! command -v git >/dev/null 2>&1; then
  echo "  ✗ git non è installato."
  echo "    Installalo con: xcode-select --install"
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "  ✗ La GitHub CLI (gh) non è installata."
  echo ""
  echo "    Installala con:   brew install gh"
  echo "    Poi autenticati:  gh auth login"
  echo "    E rilancia questo script."
  echo ""
  echo "    In alternativa, senza gh: crea il repo a mano su github.com/new"
  echo "    (nome: $NOME_REPO, pubblico, SENZA README), poi esegui:"
  echo ""
  echo "      git init && git add -A && git commit -m 'Conforme: scanner di accessibilità'"
  echo "      git branch -M main"
  echo "      git remote add origin https://github.com/TUO-UTENTE/$NOME_REPO.git"
  echo "      git push -u origin main"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "  ✗ Non risulti autenticato su GitHub."
  echo "    Esegui:  gh auth login"
  echo "    E rilancia questo script."
  exit 1
fi

UTENTE=$(gh api user --jq .login)
echo "  Account GitHub: $UTENTE"

# ── Verifica che il progetto sia sano prima di pubblicarlo

if command -v node >/dev/null 2>&1; then
  echo "  Eseguo i test prima di pubblicare…"
  if node test/test.js >/tmp/conforme-test.log 2>&1; then
    echo "  ✓ $(grep -o '[0-9]* test superati' /tmp/conforme-test.log | tail -1)"
  else
    echo "  ✗ I test falliscono. Non pubblico un progetto rotto."
    echo "    Dettagli in /tmp/conforme-test.log"
    exit 1
  fi
else
  echo "  ! Node non trovato: salto i test."
fi

# ── Repository git

if [ ! -d .git ]; then
  echo "  Inizializzo il repository git…"
  git init -q
  git add -A
  git -c commit.gpgsign=false commit -q -m "Conforme: scanner di accessibilità con contesto normativo italiano

Collega le violazioni rilevate da axe-core ai 50 criteri WCAG 2.1 A/AA
spiegati in italiano, con l'impatto concreto sull'utente e l'indicazione
di correzione. Titoli dei criteri dalla traduzione ufficiale W3C.

Include sempre la checklist delle 14 verifiche manuali: l'analisi
automatica verifica pienamente solo 4 criteri su 50 e non equivale a una
valutazione di conformità."
  echo "  ✓ Primo commit creato"
else
  echo "  ✓ Repository git già presente"
fi

git branch -M main 2>/dev/null || true

# ── Creazione e push

if gh repo view "$UTENTE/$NOME_REPO" >/dev/null 2>&1; then
  echo "  ! Il repository $UTENTE/$NOME_REPO esiste già."
  read -p "    Faccio push su quello esistente? [s/N] " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
    echo "    Annullato."
    exit 0
  fi
  git remote add origin "https://github.com/$UTENTE/$NOME_REPO.git" 2>/dev/null || true
  git push -u origin main
else
  echo "  Creo il repository pubblico e carico…"
  gh repo create "$NOME_REPO" \
    --public \
    --source=. \
    --push \
    --description "Scanner di accessibilità che collega le violazioni WCAG 2.1 AA al contesto normativo italiano (EAA, D.Lgs. 82/2022) e dice chi viene escluso e come correggere"
fi

# ── Argomenti, per farsi trovare

gh repo edit "$UTENTE/$NOME_REPO" \
  --add-topic accessibility \
  --add-topic a11y \
  --add-topic wcag \
  --add-topic italia \
  --add-topic accessibilita \
  --add-topic axe-core >/dev/null 2>&1 || true

echo ""
echo "  ✓ Fatto: https://github.com/$UTENTE/$NOME_REPO"
echo ""
