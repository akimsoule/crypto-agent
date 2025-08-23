#!/bin/bash
# Script d'optimisation pour les fonctions Netlify
# Réduction de la taille des bundles pour le déploiement

echo "📦 Optimisation des bundles de fonctions Netlify..."

# Vérifier si le répertoire de build existe déjà
BUILD_DIR=".netlify/functions-build"
if [ ! -d "$BUILD_DIR" ]; then
  mkdir -p "$BUILD_DIR"
fi

# Compresser les modules node_modules pour réduire leur taille
echo "🔍 Nettoyage des fichiers non essentiels dans node_modules..."
find ./node_modules -name "*.md" -type f -delete
find ./node_modules -name "*.map" -type f -delete
find ./node_modules -path "*/test/*" -type f -delete
find ./node_modules -path "*/tests/*" -type f -delete
find ./node_modules -path "*/docs/*" -type f -delete
find ./node_modules -path "*/.github/*" -type f -delete

# Supprimer les modules inutiles pour réduire la taille
echo "🧹 Suppression des modules node_modules inutiles..."
rm -rf ./node_modules/.bin/esno
rm -rf ./node_modules/.bin/esbuild
rm -rf ./node_modules/.bin/vite
rm -rf ./node_modules/vite/dist/node
rm -rf ./node_modules/@vitejs
rm -rf ./node_modules/esbuild/install.js
rm -rf ./node_modules/esbuild/lib

echo "✅ Optimisation terminée !"

echo "✅ Optimisation terminée !"
