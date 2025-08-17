# 🚀 Crypto Agent - Intelligence Artificielle pour Investissement Crypto

<div align="center">

![Version](https://img.shields.io/badge/version-0.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-4.9.5-blue.svg)
![React](https://img.shields.io/badge/React-19.1.1-blue.svg)
![Netlify](https://img.shields.io/badge/Netlify-Serverless-green.svg)

*Agent autonome d'analyse et d'investissement crypto avec intelligence artificielle*

[🌐 Demo Live](https://crypto-agent.netlify.app) • [📖 Documentation](./docs) • [🚀 Getting Started](#-installation)

</div>

---

## 📋 Table des Matières

- [🎯 Vue d'ensemble](#-vue-densemble)
- [✨ Fonctionnalités](#-fonctionnalités)
- [🏗️ Architecture](#️-architecture)
- [🚀 Installation](#-installation)
- [⚙️ Configuration](#️-configuration)
- [📱 Interface Web](#-interface-web)
- [🤖 Agents Automatisés](#-agents-automatisés)
- [📊 Base de Données](#-base-de-données)
- [🔧 Scripts Disponibles](#-scripts-disponibles)
- [🧪 Tests](#-tests)
- [📈 Monitoring](#-monitoring)
- [🚀 Déploiement](#-déploiement)
- [🤝 Contribution](#-contribution)

---

## 🎯 Vue d'ensemble

**Crypto Agent** est une plateforme d'intelligence artificielle avancée conçue pour l'analyse et l'investissement automatisé dans les cryptomonnaies. Le système combine plusieurs agents autonomes pour :

- 🔍 **Découvrir** les nouvelles gems crypto prometteuses
- 📊 **Analyser** les tendances du marché en temps réel
- 🤖 **Simuler** des stratégies d'investissement automatisées
- 📢 **Communiquer** via newsletters et réseaux sociaux
- 💼 **Gérer** des portefeuilles d'investissement virtuels

### 🎪 Technologies Clés

- **Frontend** : React 19 + TypeScript + TailwindCSS + DaisyUI
- **Backend** : Netlify Functions (Serverless)
- **Base de données** : PostgreSQL + Prisma ORM
- **Architecture** : Clean Architecture + Domain-Driven Design
- **Automation** : Cron Jobs + Event-driven
- **Intégrations** : CoinPaprika API, Facebook API, Resend, Telegram

---

## ✨ Fonctionnalités

### 🔍 **Crypto Gem Hunter**
- Analyse automatique des nouvelles cryptomonnaies
- Scoring intelligent basé sur des métriques multiples
- Détection d'opportunités d'investissement
- Alertes en temps réel

### 🤖 **Agents Investisseurs**
- Simulation de différents profils d'investissement
- Stratégies automatisées (Conservative, Balanced, Aggressive)
- Gestion de portefeuilles virtuels
- Suivi des performances en temps réel

### 📊 **Dashboard Administrateur**
- Interface de gestion complète
- Statistiques et analytics avancées
- Configuration des agents
- Monitoring des performances

### 📧 **Newsletter & Communication**
- Newsletter automatique avec analyses crypto
- Intégration Facebook pour posts automatiques
- Notifications Telegram
- Gestion des abonnements

### 📈 **Analytics & Monitoring**
- Métriques de performance détaillées
- Surveillance de la base de données
- Logs et alertes système
- Rapports automatisés

---

## 🏗️ Architecture

Le projet suit les principes de **Clean Architecture** et **Domain-Driven Design** :

```
crypto-agent/
├── 🌐 src/                    # Interface Web (React)
│   ├── components/           # Composants réutilisables
│   ├── pages/               # Pages de l'application
│   ├── hooks/               # Hooks React personnalisés
│   └── contexts/            # Contextes React (Auth, etc.)
│
├── ⚡ netlify/               # Backend Serverless
│   ├── functions/           # 17 fonctions Netlify refactorisées
│   └── src/                 # Architecture Clean Code
│       ├── 📊 config/       # Configuration centralisée
│       ├── 🔧 services/     # Services applicatifs (6 services)
│       ├── 🎯 domain/       # Logique métier par domaine
│       ├── 🏢 infrastructure/ # Accès données et APIs
│       └── 🛠️ utils/        # Scripts et utilitaires
│
├── 🗄️ prisma/               # Base de données
│   ├── schema.prisma        # Schéma de données
│   ├── migrations/          # Migrations automatiques
│   └── seed.ts             # Données de test
│
└── 📁 types/                # Types TypeScript globaux
```

### 🎯 Domaines Métier

- **🪙 Crypto Domain** : Analyse des gems, actions de marché
- **💼 Investor Domain** : Agents d'investissement, portfolios
- **📧 Newsletter Domain** : Communication et newsletters
- **📊 Analytics Domain** : Métriques et monitoring

---

## 🚀 Installation

### Prérequis

- **Node.js** >= 18.0.0
- **PostgreSQL** (ou utiliser Prisma Postgres)
- **npm** ou **yarn**
- **Git**

### 1. Cloner le projet

```bash
git clone https://github.com/akimsoule/crypto-agent.git
cd crypto-agent
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configuration environnement

```bash
cp .env.example .env
```

Remplir les variables dans `.env` (voir [Configuration](#️-configuration))

### 4. Base de données

```bash
# Générer le client Prisma
npx prisma generate

# Exécuter les migrations
npx prisma migrate deploy

# Populer avec des données de test
npm run db:seed
```

### 5. Démarrer en développement

```bash
npm run dev
```

L'application sera disponible sur `http://localhost:8888`

---

## ⚙️ Configuration

### Variables d'environnement essentielles

```env
# Base de données
DATABASE_URL="postgresql://user:password@localhost:5432/crypto_agent"

# Authentication
JWT_SECRET="your-super-secret-jwt-key"
ADMIN_EMAIL="admin@yourapp.com"
ADMIN_PASSWORD="your-secure-password"

# Facebook Integration
FACEBOOK_ACCESS_TOKEN="your_facebook_access_token"
FACEBOOK_PAGE_ID="your_facebook_page_id"

# Email (Resend)
RESEND_API_KEY="your_resend_api_key"
RESEND_FROM_EMAIL="Crypto Investors Hub <newsletter@crypto-investors-hub.com>"
RESEND_REPLY_TO="noreply@crypto-investors-hub.com"

# Telegram
TELEGRAM_BOT_TOKEN="your_telegram_bot_token"
TELEGRAM_CHAT_ID="your_telegram_chat_id"

# Monitoring
SENTRY_DSN="your_sentry_dsn"
```

### Configuration avancée

<details>
<summary>📋 Variables optionnelles</summary>

```env
# Newsletter
NEWSLETTER_FROM_EMAIL="newsletter@yourapp.com"
NEWSLETTER_FROM_NAME="Crypto Investors Hub"
REPLY_TO_EMAIL="noreply@yourapp.com"

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS="100"
RATE_LIMIT_WINDOW_MS="900000"

# Cron Jobs
ENABLE_CRON_JOBS="true"
CRON_GEM_HUNTER_SCHEDULE="0 */6 * * *"
CRON_NEWSLETTER_SCHEDULE="0 8 * * 1"
CRON_FACEBOOK_SCHEDULE="0 12 * * *"

# Social Media
FACEBOOK_POST_DELAY_MINUTES="30"
FACEBOOK_MAX_POSTS_PER_DAY="5"

# Development
NODE_ENV="development"
LOG_LEVEL="debug"
```

</details>

---

## 📱 Interface Web

### 🏠 **Dashboard Principal**
- Vue d'ensemble des performances
- Graphiques interactifs
- Métriques en temps réel

### 💼 **Gestion des Investisseurs**
- Configuration des agents
- Visualisation des portfolios
- Historique des trades

### 📧 **Administration Newsletter**
- Gestion des abonnés
- Création de campagnes
- Statistiques d'ouverture

### 📊 **Analytics Facebook**
- Performances des posts
- Engagement et reach
- Calendrier de publication

---

## 🤖 Agents Automatisés

### 🔍 **Crypto Gem Hunter Agent**

```typescript
// Recherche automatique de nouvelles gems
const gemHunter = new CryptoGemHunter();
const gems = await gemHunter.findGemsQuick();
```

**Fonctionnalités :**
- Analyse de 100+ cryptomonnaies par scan
- Scoring basé sur 15+ métriques
- Filtrage intelligent des opportunités
- Alertes automatiques

### 💼 **Investor Agents**

```typescript
// Agents avec différents profils de risque
const profiles = [
  'conservative',  // 70% stablecoins, 30% top cryptos
  'balanced',      // 40% stablecoins, 60% cryptos diversifiées
  'aggressive'     // 10% stablecoins, 90% gems et altcoins
];
```

**Stratégies :**
- **Conservative** : Focus sécurité et stabilité
- **Balanced** : Équilibre risque/rendement
- **Aggressive** : Maximisation des gains potentiels

### 📊 **Monitoring Agent**

```typescript
// Surveillance continue du système
const monitor = new DatabaseMonitor();
await monitor.checkSystemHealth();
```

---

## 📊 Base de Données

### Modèles principaux

```prisma
model CryptoGemProject {
  id                       Int      @id @default(autoincrement())
  coinId                   String   @unique
  symbol                   String
  name                     String
  currentPrice             Float
  marketCap                Float
  gemScore                 Float?
  sentimentScore           Float?
  // ... autres champs
}

model InvestorProfile {
  id              String  @id @default(cuid())
  name            String
  strategy        String
  riskTolerance   Float
  maxDrawdown     Float
  targetReturn    Float
  // ... configuration investisseur
}

model CryptoInvestment {
  id           Int      @id @default(autoincrement())
  investorId   String
  gemProjectId Int
  action       String   // BUY, SELL, HOLD
  amount       Float
  price        Float
  timestamp    DateTime @default(now())
  // ... détails transaction
}
```

---

## 🔧 Scripts Disponibles

### Développement

```bash
npm run dev          # Démarrer en mode développement
npm run build        # Builder pour production
npm run preview      # Prévisualiser le build
```

### Base de données

```bash
npm run db:seed      # Populer avec des données de test
npm run db:reset     # Reset complet + seed
```

### Investisseurs

```bash
npm run setup-investors     # Configurer les profils d'investisseurs
npm run investor-status     # Vérifier le statut des agents
npm run test-cron          # Tester les tâches cron
```

### Tests et qualité

```bash
npm run test         # Exécuter les tests
npm run test:watch   # Tests en mode watch
npm run test:coverage # Couverture de code
npm run lint         # Linter le code
```

### Facebook

```bash
npm run check-facebook        # Vérifier la config Facebook
npm run update-facebook-token # Mettre à jour le token
npm run test-facebook         # Tester la connexion
```

---

## 🧪 Tests

Le projet utilise **Vitest** pour les tests :

```bash
# Tests unitaires
npm run test

# Tests avec couverture
npm run test:coverage

# Tests en mode watch
npm run test:watch
```

### Structure des tests

```
netlify/test/
├── services/          # Tests des services
├── domain/           # Tests de la logique métier
├── integration/      # Tests d'intégration
└── e2e/             # Tests end-to-end
```

---

## 📈 Monitoring

### Health Checks automatiques

- **Database** : Surveillance des connexions et performances
- **APIs** : Monitoring des taux de réponse externes
- **Memory** : Suivi de l'utilisation mémoire
- **Errors** : Tracking et alerting des erreurs

### Dashboards

- **System Health** : Métriques système temps réel
- **Performance** : Temps de réponse et throughput
- **Business** : KPIs métier et ROI des agents

---

## 🚀 Déploiement

### Déploiement Netlify (recommandé)

1. **Fork** le repository
2. **Connecter** à Netlify
3. **Configurer** les variables d'environnement
4. **Déployer** automatiquement

```bash
# Build de production
npm run build

# Déployer sur Netlify
netlify deploy --prod
```

### Variables d'environnement Netlify

Configurer dans **Netlify Dashboard > Site Settings > Environment Variables** :

- `DATABASE_URL`
- `JWT_SECRET`
- `FACEBOOK_ACCESS_TOKEN`
- `RESEND_*`
- Etc.

### Cron Jobs Netlify

Configurer les **scheduled functions** :

- **Gem Hunter** : `0 */6 * * *` (toutes les 6h)
- **Newsletter** : `0 8 * * 1` (lundi 8h)
- **Facebook Posts** : `0 12 * * *` (tous les jours 12h)

---

## 📚 Documentation

### Structure docs

```
docs/
├── 🏗️ architecture.md     # Architecture détaillée
├── 🔧 api.md              # Documentation API
├── 🤖 agents.md           # Guide des agents
├── 📊 database.md         # Schéma base de données
└── 🚀 deployment.md       # Guide de déploiement
```

### Liens utiles

- [🏗️ Guide Architecture](./netlify/src/README.md)
- [📊 Résumé Refactorisation](./netlify/FINAL_SUMMARY.md)
- [🎯 Summary Architecture](./netlify/ARCHITECTURE_SUMMARY.md)

---

## 🤝 Contribution

### Workflow de contribution

1. **Fork** le projet
2. **Créer** une branche feature (`git checkout -b feature/amazing-feature`)
3. **Commit** les changes (`git commit -m 'Add amazing feature'`)
4. **Push** la branche (`git push origin feature/amazing-feature`)
5. **Ouvrir** une Pull Request

### Standards de code

- **TypeScript** strict mode
- **Clean Architecture** respectée
- **Tests** pour toute nouvelle fonctionnalité
- **Documentation** à jour

### Issues et bugs

Utiliser les [GitHub Issues](https://github.com/akimsoule/crypto-agent/issues) avec les labels appropriés :

- 🐛 `bug` - Bugs et erreurs
- ✨ `enhancement` - Nouvelles fonctionnalités  
- 📚 `documentation` - Améliorations doc
- 🔧 `maintenance` - Tâches de maintenance

---

## 📄 License

Ce projet est sous licence **MIT**. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

## 🙏 Remerciements

- **CoinPaprika** pour l'API crypto
- **Netlify** pour l'hébergement serverless
- **Prisma** pour l'ORM
- **React** et l'écosystème open-source

---

## 📞 Support

- 📧 Email : [support@crypto-agent.com](mailto:support@crypto-agent.com)
- 🐛 Issues : [GitHub Issues](https://github.com/akimsoule/crypto-agent/issues)
- 💬 Discord : [Communauté Discord](https://discord.gg/crypto-agent)

---

<div align="center">

**Fait avec ❤️ par [akimsoule](https://github.com/akimsoule)**

⭐ **Star le projet si il vous plaît !** ⭐

</div>
