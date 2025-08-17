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

# 5. Seed de la base de données (avec gestion d'erreur gracieuse)
echo "🌱 Seeding de la base de données..."
if npm run db:seed; then
    echo "✅ Seed terminé avec succès"
else
    echo "⚠️ Le seed a échoué, mais le déploiement continue..."
    echo "ℹ️ Cela peut être normal si les données existent déjà"
fi

echo "🎉 Déploiement terminé avec succès!"
