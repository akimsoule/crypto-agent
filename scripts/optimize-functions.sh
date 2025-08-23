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
find ./node_modules -name "*.ts" -not -name "*.d.ts" -type f -delete
find ./node_modules -name "*.map" -type f -delete
find ./node_modules -path "*/test/*" -type f -delete
find ./node_modules -path "*/tests/*" -type f -delete
find ./node_modules -path "*/docs/*" -type f -delete
find ./node_modules -path "*/.github/*" -type f -delete

# Optimisation spécifique pour reset-data
echo "🔧 Optimisation de la fonction reset-data..."
FUNCTION_DIR="netlify/functions/reset-data.mts"
if [ -f "$FUNCTION_DIR" ]; then
  # Vérification de la taille avant optimisation
  SIZE_BEFORE=$(wc -c < "$FUNCTION_DIR")
  echo "📊 Taille avant optimisation: $SIZE_BEFORE bytes"
  
  # Assurer que le code est minifié et sans commentaires inutiles
  npx terser "$FUNCTION_DIR" --compress --mangle --output "$FUNCTION_DIR.tmp" || true
  if [ -f "$FUNCTION_DIR.tmp" ]; then
    mv "$FUNCTION_DIR.tmp" "$FUNCTION_DIR"
  fi
  
  # Vérification de la taille après optimisation
  SIZE_AFTER=$(wc -c < "$FUNCTION_DIR")
  echo "📊 Taille après optimisation: $SIZE_AFTER bytes"
  echo "🔻 Réduction: $(($SIZE_BEFORE - $SIZE_AFTER)) bytes"
fi

echo "✅ Optimisation terminée !"
