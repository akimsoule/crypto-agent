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

<div align="center">

# 🚀 Crypto Agent
### Plateforme IA d'analyse & pilotage d'investisseurs crypto (serverless + web)

![Version](https://img.shields.io/badge/version-0.0.0-blue.svg)
![Node](https://img.shields.io/badge/Node-%3E%3D18.0-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)
![React](https://img.shields.io/badge/React-19-blue.svg)
![Netlify](https://img.shields.io/badge/Deploy-Netlify-success.svg)
![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748.svg)

*Agents investisseurs simulés, agrégation de données marché, newsletter & automation (cron) — architecture modulaire serverless.*

[🌐 Live](https://crypto-agent.netlify.app) · [⚙️ Deploy Local](#-démarrage-rapide) · [📄 Schéma DB](./prisma/schema.prisma)

</div>

---

## 📑 Sommaire

1. [🎯 Objectif & Vision](#-objectif--vision)
2. [✨ Fonctionnalités Clés](#-fonctionnalités-clés)
3. [🏗️ Architecture & Dossiers](#️-architecture--dossiers)
4. [⚡ Démarrage Rapide](#-démarrage-rapide)
5. [⚙️ Variables d'Environnement](#️-variables-denvironnement)
6. [🗄️ Base de Données & Migrations](#️-base-de-données--migrations)
7. [🧩 API Serverless](#-api-serverless)
8. [📊 Modèle Investisseur & Calculs](#-modèle-investisseur--calculs)
9. [🔁 Cron & Automation](#-cron--automation)
10. [🧪 Tests & Qualité](#-tests--qualité)
11. [🚀 Déploiement Netlify](#-déploiement-netlify)
12. [🤝 Contribution](#-contribution)

---

## 🎯 Objectif & Vision
Plateforme unifiée pour :
* Découverte & scoring d'actifs ("gems")
* Simulation multi-profils d'investisseurs (performance, risque, expositions)
* Communication automatisée (newsletter, Facebook)
* Infrastructure légère → Netlify Functions + Postgres (Prisma)

---

## ✨ Fonctionnalités Clés
| Domaine | Détails |
|--------|---------|
| Investisseurs | Profils simulés, positions, PnL latent, snapshots agrégés |
| Gem Hunter | Scan + scoring, alertes futures (extensible) |
| Newsletter | Abonnements, envoi planifié (Resend) |
| Réseaux sociaux | Intégration Facebook (post/stats) |
| Auth simple | JWT minimal pour routes protégées |
| Cron | Fonctions planifiables (Netlify scheduled functions) |

---

## 🏗️ Architecture & Dossiers
```
crypto-agent/
├── netlify/
│   ├── functions/          # Endpoints serverless (.mts)
│   └── trade.app/          # Code "agent" (logique de trading/simulation)
├── prisma/                 # Schéma + migrations + seed (ESM safe)
├── src/                    # Frontend React (hooks, components, pages)
├── scripts/                # deploy.sh, dev cron utilitaires
└── types/                  # Types partagés (API, UI, domaine)
```
Principes :
* Modules autonomes (pas de monolithe express) ; middleware commun minimal (`endpoint`).
* Calculs d'agrégation côté fonction (ex: `investorDetail`).
* ESM natif (TypeScript `module` + `tsx`).

---

## ⚡ Démarrage Rapide
```bash
git clone https://github.com/akimsoule/crypto-agent.git
cd crypto-agent
npm install
cp .env.example .env   # (créez si absent)
# Editer DATABASE_URL + JWT_SECRET a minima
npx prisma generate
npx prisma migrate deploy  # ou migrate dev en local initial
npm run db:seed            # facultatif (profils de base)
npm run dev                # lance Netlify Dev (frontend + functions)
```
URL: http://localhost:8888

Déploiement local orchestré (migrations + build + seed + smoke) :
```bash
npm run deploy:local
```

Runner interne (logique agent) :
```bash
npm run runDev
```

Cron de dev one-shot :
```bash
npm run dev:cron:once
```

---

## ⚙️ Variables d'Environnement
Extrait minimal :
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/crypto_agent
JWT_SECRET=dev-secret
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-me
RESEND_API_KEY=xxxx
FACEBOOK_ACCESS_TOKEN=xxxx
FACEBOOK_PAGE_ID=123456789
TELEGRAM_BOT_TOKEN=xxxx
TELEGRAM_CHAT_ID=xxxx
APP_ENV=development
```
Le script `deploy.sh` charge automatiquement `.env`, `.env.local` ou fichier passé via `ENV_FILE=...` (sauf en environnement Netlify où les variables sont fournies).

---

## 🗄️ Base de Données & Migrations
* ORM : Prisma (`prisma/schema.prisma`).
* Migrations conservées sous `prisma/migrations/*`.
* Seeding : `prisma/seed.ts` (ESM-safe, pas de `require.main`).

Commandes utiles :
```bash
npx prisma migrate dev      # itérations locales
npx prisma migrate deploy   # en CI/Prod
npm run db:seed             # seed
```

---

## 🧩 API Serverless
Chaque fonction expose un handler via `endpoint()` :
```
netlify/functions/
  investors.mts          # liste
  investorDetail.mts     # détail (positions, snapshots synthétiques)
  newsletter.mts         # subscribe / list
  facebook-stats.mts     # métriques page
  auth-login.mts / auth-verify.mts
  ...
```
Réponse uniforme: `{ success: boolean, data?, error? }`.

---

## 📊 Modèle Investisseur & Calculs
`investorDetail` :
* Récupère profil + Positions + Orders récents + Snapshots.
* Construit snapshot courant synthétique :
  * `totalValue = initialBalance + Σ(unrealizedPnL)` (simplifié)
  * `totalReturn% = (totalValue - initialBalance)/initialBalance`.
* Normalise positions : PnL %, jours détenus.
Améliorations futures : drawdown réel, win rate basé sur trades fermés, cash tracking.

---

## 🔁 Cron & Automation
Netlify Scheduled Functions (config via UI ou `netlify.toml`). Exemples futurs :
| Fonction | Cadence suggérée | But |
|----------|------------------|-----|
| Gem Hunter | `0 */6 * * *` | Scan opportunités |
| Newsletter | `0 8 * * 1`   | Envoi hebdo |
| Facebook Stats | `0 */12 * * *` | Refresh métriques |

Dev local ponctuel : `npm run dev:cron:once` (exécute une boucle de tâches internes simulées).

---

## 🧪 Tests & Qualité
Outils : Vitest + ESLint + TypeScript strict.
```bash
npm run test          # tests unitaires
npm run test:watch
npm run test:coverage
npm run lint
```
Ajouter des tests pour toute logique métier ajoutée (positions, agrégations, parsing). 

---

## � Déploiement Netlify
1. Créer site → connecter repo GitHub.
2. Ajouter variables d'env (voir section env).
3. Build command (Netlify): `npm run build`.
4. Publish directory: `dist` (Vite) + fonctions auto détectées (`netlify/functions`).
5. Activer scheduled functions si besoin.

Déploiement manuel local (prévisualisation prod):
```bash
netlify deploy --build --draft
```

---

## 🤝 Contribution
Workflow standard :
```bash
git checkout -b feature/ma-feature
# dev + tests
git commit -m "feat: description"
git push origin feature/ma-feature
```
Règles : typage explicite, pas de logique métier dans les handlers bruts, fonctions pures testables.

Labels recommandés : `feat`, `fix`, `chore`, `refactor`, `docs`, `test`.

---

## �️ Roadmap (extraits)
- [ ] Drawdown & courbes equity réelles
- [ ] WinRate basé sur fermetures effectives
- [ ] Alerting Telegram temps réel
- [ ] Backtests stratégiques (module simulation)
- [ ] Mode multi-exchange abstrait

---

## 📄 Licence
MIT. Voir `LICENSE`.

---

## 🙏 Remerciements
Prisma · Netlify · React · Communauté open‑source.

---

<div align="center">
Fait avec ❤️ — contribuez / étoilez si utile ⭐
</div>

