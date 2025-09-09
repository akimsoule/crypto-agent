#!/usr/bin/env bash
set -euo pipefail

# Script de déploiement minimal
# Étapes:
# 1. Validation env
# 2. Installation dépendances
# 3. Migrations + generate Prisma
# 4. Seed auto (hors production)
# 5. Build
# 6. Smoke test (run cron once)

APP_ENV=${APP_ENV:-development}

# Chargement des variables locales seulement si non exécuté sur Netlify (NETLIFY non défini)
if [[ -z "${NETLIFY:-}" ]]; then
  if [[ -n "${ENV_FILE:-}" && -f "$ENV_FILE" ]]; then
    set -a; . "$ENV_FILE"; set +a; echo "[deploy] ENV_FILE=$ENV_FILE chargé";
  else
    if [[ "$APP_ENV" == "production" && -f .env.prod ]]; then
      set -a; . ./.env.prod; set +a; echo "[deploy] .env.prod chargé";
    elif [[ -f .env.local ]]; then
      set -a; . ./.env.local; set +a; echo "[deploy] .env.local chargé";
    elif [[ -f .env ]]; then
      set -a; . ./.env; set +a; echo "[deploy] .env chargé";
    else
      echo "[deploy] Info: aucun fichier .env trouvé (variables supposées déjà exportées)";
    fi
  fi
else
  echo "[deploy] Netlify détecté: pas de chargement de fichiers .env locaux";
fi

log() { echo "[deploy] $*"; }
step() { echo -e "\n=== $* ==="; }

step "1. Validation environnement"
if [[ -z "${DATABASE_URL:-}" ]]; then
  log "ERREUR: DATABASE_URL manquant (exporte-le ou fournis ENV_FILE)"; exit 1; fi
log "APP_ENV=$APP_ENV"

step "2. Installation dépendances"
npm install

step "3. Migrations Prisma"
npx prisma migrate deploy
npx prisma generate

step "4. Seed (auto si non-production)"
if [[ "$APP_ENV" != "production" ]]; then
  npm run db:seed || { log "Seed failed"; exit 1; }
else
  log "Seed ignoré en production"
fi

step "5. Build"
npm run build

step "6. Smoke test (cron once)"
npm run dev:cron:once || { log "Smoke test failed"; exit 1; }

step "Terminé"
log "Déploiement réussi."
