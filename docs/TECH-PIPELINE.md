# Pipeline Technique (Cron → Runner → Persistence)

## Vue d'ensemble
```
(Netlify Scheduled Function cron-run-dev) ──▶ runDev() ──▶ Runner ──▶ Trader ──▶ HandleTrader
        │                                                 │             │
        │                                                 │             ├─▶ Strategy (getStrategy)
        │                                                 │             ├─▶ Filters (FilterSignal / FilterProd / FilterRoi ...)
        │                                                 │             └─▶ Accounts (FutureAccount / FutureInvestorAccount / SpotAccount)
        │                                                                 │
        │                                                                 ├─▶ Market Data (Candle providers cache futur) 
        │                                                                 └─▶ (DEV uniquement) Persistence (orders, positions)
```

## Étapes
1. Cron (Netlify) déclenche `cron-run-dev.mts` toutes les 15 minutes.
2. La fonction charge l'environnement, construit éventuellement les profils et appelle `runDev()`.
3. `runDev()` récupère les investisseurs actifs (DEV) et assemble `Params` + `FutureGroup`.
4. `Runner.run()` instancie un bean (investor ou standard) puis délègue à `Trader.trade()`.
5. `Trader` boucle sur chaque symbole/groupe, récupère les chandelles (`Candle.getAsset`).
6. `getStrategy()` produit les vecteurs d'actions long/short.
7. `HandleTrader.handleStrategy()` applique les filtres.
8. En DEV investisseurs fictifs: exécute entry/exit sur `FutureInvestorAccount` et appelle `afterTradePersist`.
9. Persistence (DEV seulement) : `persistOrder` / `persistPositions`.
10. En fin de run: logs d'exécution + (optionnel) envoi Telegram selon les règles.

## Règles Environnement
- `APP_ENV=production` : pas de persistence (orders/positions) et pas d'ORDRES investisseurs fictifs.
- `APP_ENV=development` : investisseurs fictifs actifs, persistence et messages Telegram.

## Idempotence
- DEV: pas critique (fictif).
- PROD futur: prévoir slotKey (15m) + clé d'ordre déterministe.

## Variables Clés
- `APP_ENV` : dev / production.
- `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.

## Améliorations futures
- Cache partagé des candles.
- Métriques (durée, nb symboles, erreurs).
- Filtres & stratégie découplés (pur fonctions + tests unitaires).

Voir aussi `diagram.puml` pour un diagramme modules simplifié.
