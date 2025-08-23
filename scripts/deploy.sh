#!/bin/bash

# Script de déploiement pour Netlify avec gestion du seed
set -e

echo "🚀 Début du déploiement..."

# 1. Installation des dépendances
echo "📦 Installation des dépendances..."
npm install

# 2. Build de l'application
echo "🏗️ Build de l'application..."
npm run build

# 3. Migration de la base de données
echo "🗄️ Migration de la base de données..."
npx prisma migrate deploy

# 4. Génération du client Prisma
echo "⚙️ Génération du client Prisma..."
npx prisma generate

# 5. Optimisation des fonctions Netlify
echo "🔧 Optimisation des fonctions Netlify..."
./scripts/optimize-functions.sh

# 5.1 Copie des fichiers de configuration des fonctions
echo "📝 Copie des fichiers de configuration des fonctions..."
if [ -f "netlify-functions-config.json" ]; then
  cp netlify-functions-config.json .netlify/
  echo "✅ Configuration globale des fonctions copiée"
fi

# 5.2 Vérification des configurations spécifiques par fonction
for CONFIG in netlify/functions/*.config.json; do
  if [ -f "$CONFIG" ]; then
    FUNC_NAME=$(basename "$CONFIG" .mts.config.json)
    echo "📄 Configuration trouvée pour $FUNC_NAME"
  fi
done

# 6. Seed de la base de données (avec gestion d'erreur gracieuse)
echo "🌱 Seeding de la base de données..."
if npm run db:seed; then
    echo "✅ Seed terminé avec succès"
else
    echo "⚠️ Le seed a échoué, mais le déploiement continue..."
    echo "ℹ️ Cela peut être normal si les données existent déjà"
fi

echo "🎉 Déploiement terminé avec succès!"
