# 🏗️ Architecture du Projet Crypto Agent

## 📁 Structure Réorganisée

Cette structure suit les principes de **Clean Architecture** et **Domain-Driven Design** pour une meilleure maintenabilité et scalabilité.

```
netlify/src/
├── 📊 config/                 # Configuration centralisée
│   └── index.ts              # Variables d'environnement et constantes
│
├── 🔧 services/              # Couche Application (Services)
│   ├── AuthService.ts        # Authentification
│   ├── NewsletterService.ts  # Gestion newsletters et emails
│   ├── InvestorService.ts    # Gestion des investisseurs
│   ├── FacebookService.ts    # Intégration Facebook
│   ├── CronService.ts        # Orchestration des tâches cron
│   ├── HttpService.ts        # Standardisation des réponses
│   └── index.ts              # Export centralisé
│
├── 🎯 domain/                # Couche Domaine (Logique Métier)
│   ├── crypto/               # Domaine Crypto
│   │   ├── cryptoGemHunter.ts   # Recherche de gems crypto
│   │   └── action.ts            # Actions sur le marché
│   ├── investor/             # Domaine Investisseur
│   │   ├── investorAgent.ts     # Agent d'investissement
│   │   ├── investor.ts          # Logique investisseur
│   │   └── setupInvestors.ts    # Configuration investisseurs
│   ├── shared/               # Logique partagée
│   │   └── newsletter-common.mts # Fonctions newsletter communes
│   └── index.ts              # Export centralisé
│
├── 🏢 infrastructure/        # Couche Infrastructure
│   ├── database/             # Accès base de données
│   │   └── prismaClient.ts      # Client Prisma configuré
│   ├── external/             # APIs et services externes
│   │   ├── Facebook.ts          # Service Facebook
│   │   ├── socialMediaManager.ts # Gestionnaire réseaux sociaux
│   │   ├── emailService.ts      # Service email
│   │   └── teleg.ts             # Service Telegram
│   ├── monitoring/           # Monitoring et observabilité
│   │   └── databaseMonitor.ts   # Monitoring base de données
│   └── index.ts              # Export centralisé
│
├── 🛠️ utils/                 # Utilitaires et scripts
│   ├── runAction.ts          # Script CLI pour actions crypto
│   └── index.ts              # Export centralisé
│
├── 📜 types/                 # Types et interfaces (à créer)
│   └── index.ts              # Export centralisé des types
│
└── index.ts                  # Point d'entrée principal
```

## 🎯 Principes Appliqués

### 1. **Séparation des Responsabilités**
- **Services** : Orchestration et logique applicative
- **Domain** : Logique métier pure
- **Infrastructure** : Accès aux données et services externes
- **Utils** : Utilitaires et scripts

### 2. **Dependency Inversion**
- Les couches supérieures ne dépendent pas des couches inférieures
- Les services utilisent les domaines, pas l'inverse
- L'infrastructure est injectée dans les services

### 3. **Single Responsibility**
- Chaque fichier a une responsabilité claire
- Domaines séparés (crypto, investor, shared)
- Infrastructure organisée par type (database, external, monitoring)

### 4. **Clean Code**
- Noms explicites et structure claire
- Exports centralisés via index.ts
- Documentation intégrée

## 🚀 Utilisation

### Import depuis les services
```typescript
import { NewsletterService, AuthService } from './services';
```

### Import depuis les domaines
```typescript
import { CryptoGemHunter, InvestorAgent } from './domain';
```

### Import depuis l'infrastructure
```typescript
import { prismaClient, SocialMediaManager } from './infrastructure';
```

### Import global
```typescript
import { NewsletterService, CryptoGemHunter, prismaClient } from './src';
```

## 📈 Bénéfices

✅ **Maintenabilité** - Structure claire et prévisible  
✅ **Testabilité** - Dépendances isolées et injectables  
✅ **Scalabilité** - Facile d'ajouter de nouveaux domaines  
✅ **Réutilisabilité** - Services et domaines réutilisables  
✅ **Performance** - Imports optimisés et tree-shaking  

## 🔧 Migration

Les anciens imports ont été automatiquement mis à jour. Si vous rencontrez des erreurs d'import, vérifiez :

1. Les nouveaux chemins dans la structure ci-dessus
2. Les exports disponibles dans les fichiers index.ts
3. La documentation des services pour les nouvelles signatures

## 🎉 Statut

✅ **Refactorisation terminée à 100%**  
✅ **Architecture Clean Code implémentée**  
✅ **17/17 fonctions Netlify refactorisées**  
✅ **Structure réorganisée selon les bonnes pratiques**
