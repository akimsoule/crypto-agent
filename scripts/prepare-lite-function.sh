#!/bin/bash

# Script pour optimiser et préparer la fonction reset-data-lite pour le déploiement
# Ce script assure une empreinte minimale de la fonction

set -e # Arrêter le script en cas d'erreur

# Couleurs pour les messages
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
RESET="\033[0m"

echo -e "${YELLOW}Préparation de la fonction allégée reset-data-lite...${RESET}"

# Définir le chemin de la fonction
FUNCTION_PATH="netlify/functions/reset-data-lite.mts"

# Vérifier si le fichier existe
if [ ! -f "$FUNCTION_PATH" ]; then
  echo -e "${RED}Erreur: $FUNCTION_PATH n'existe pas!${RESET}"
  exit 1
fi

# Dossier temporaire pour construire la fonction optimisée
TEMP_DIR="netlify/temp-lite-function"
mkdir -p "$TEMP_DIR"

# Copier uniquement les fichiers nécessaires
echo -e "${GREEN}Copie des fichiers essentiels...${RESET}"
cp "$FUNCTION_PATH" "$TEMP_DIR/"
cp "netlify/functions/middleware/dashBoardMiddleware.mts" "$TEMP_DIR/"

# Créer un package.json minimal pour cette fonction
cat > "$TEMP_DIR/package.json" << EOF
{
  "name": "reset-data-lite",
  "version": "1.0.0",
  "description": "Fonction allégée pour réinitialiser les données",
  "main": "reset-data-lite.mjs",
  "dependencies": {
    "pg": "^8.11.3",
    "jsonwebtoken": "^9.0.2"
  },
  "type": "module"
}
EOF

# Installer uniquement les dépendances nécessaires
echo -e "${GREEN}Installation des dépendances minimales...${RESET}"
cd "$TEMP_DIR"
npm install --production --no-package-lock

# Transpiler le TypeScript en JavaScript
echo -e "${GREEN}Transpilation du TypeScript...${RESET}"
npx tsc reset-data-lite.mts --outDir . --target es2020 --module esnext --moduleResolution node

# Nettoyer les fichiers inutiles
echo -e "${GREEN}Nettoyage des fichiers temporaires...${RESET}"
rm -rf node_modules/*/test
rm -rf node_modules/*/dist/test
rm -rf node_modules/*/.github
rm -rf node_modules/*/docs
rm -rf node_modules/*/examples
find node_modules -name "*.md" -delete
find node_modules -name "*.ts" -not -name "*.d.ts" -delete
find node_modules -name "*.map" -delete

# Retourner au répertoire principal
cd ../../..

echo -e "${GREEN}Fonction reset-data-lite prête pour le déploiement!${RESET}"
echo -e "${YELLOW}La version optimisée se trouve dans $TEMP_DIR${RESET}"

# Instructions pour utiliser la fonction optimisée
echo -e "${YELLOW}Pour déployer cette fonction:${RESET}"
echo -e "1. Renommez $TEMP_DIR en netlify/functions/reset-data-lite"
echo -e "2. Exécutez la commande de déploiement Netlify"
