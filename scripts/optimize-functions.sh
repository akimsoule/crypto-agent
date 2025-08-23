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
echo "🔧 Optimisation des fonctions Netlify..."

# Supprimer les commentaires et lignes vides pour les fichiers TypeScript
for TS_FILE in netlify/functions/*.mts; do
  if [ -f "$TS_FILE" ]; then
    echo "📝 Traitement du fichier: $TS_FILE"
    SIZE_BEFORE=$(wc -c < "$TS_FILE")
    echo "📊 Taille avant optimisation: $SIZE_BEFORE bytes"
    
    # Créer un fichier temporaire sans commentaires et lignes vides superflues
    TMP_FILE="$TS_FILE.tmp"
    
    # Supprimer les commentaires multi-lignes, commentaires simple ligne et lignes vides consécutives
    sed '/\/\*\*/,/\*\//d' "$TS_FILE" | # Supprimer les commentaires JSDoc
    sed 's/\/\/.*$//' | # Supprimer les commentaires de fin de ligne
    sed '/^\s*$/d' | # Supprimer les lignes vides
    sed '/^\s*console\.log/d' > "$TMP_FILE" # Supprimer les logs de debug
    
    # Remplacer l'original uniquement si le fichier temporaire a été créé avec succès
    if [ -f "$TMP_FILE" ] && [ -s "$TMP_FILE" ]; then
      mv "$TMP_FILE" "$TS_FILE"
      SIZE_AFTER=$(wc -c < "$TS_FILE")
      echo "📊 Taille après optimisation: $SIZE_AFTER bytes"
      echo "🔻 Réduction: $(($SIZE_BEFORE - $SIZE_AFTER)) bytes"
    else
      echo "⚠️ Échec de l'optimisation pour $TS_FILE"
      [ -f "$TMP_FILE" ] && rm "$TMP_FILE"
    fi
  fi
done

echo "✅ Optimisation terminée !"
