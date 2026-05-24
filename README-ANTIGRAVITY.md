# FASO BET — Pipeline Multi-Agents (Antigravity)

Application Next.js 14 de **prédictions football** (paris sportifs) — **pas** le projet Kiibare (bourse).

| URL | Projet |
|-----|--------|
| http://localhost:3001 | **FASO BET** (ce dépôt) |
| http://localhost:3000 | Kiibare / autre app (hors de ce repo) |

## Architecture

```
Agent 1 Collecteur (code pur) → Agent 2 Statisticien (Claude) → Agent 3 Stratège (Perplexity)
```

| Agent | Fichier | Technologie |
|-------|---------|-------------|
| Collecteur | `src/agents/agent-collector.ts` | API-Football + The Odds API + Zod |
| Statisticien | `src/agents/agent-statistician.ts` | Claude `claude-sonnet-4-20250514` + fallback Poisson |
| Stratège | `src/agents/agent-strategist.ts` | Perplexity `sonar-pro` + fallback value bet |

## Démarrage

```bash
cp .env.local.example .env.local
# Renseigner les clés API

npm install
npm run dev
```

Ouvrir **[http://localhost:3001](http://localhost:3001)** (port fixe pour ne pas entrer en conflit avec Kiibare sur 3000).

## API

- `GET /api/pipeline` — Lance le pipeline complet
- `GET /api/pipeline?refresh=1` — Ignore le cache Redis
- `POST /api/pipeline` — Body `{ date?, leagues?, skipCache? }`
- `GET /api/matches` — Agent 1 seul (matchs vérifiés)

## Mode démo

Sans `FOOTBALL_API_KEY`, l’Agent 1 utilise 3 matchs démo (PSG–Lyon, Liverpool–Arsenal, El Clásico).

Sans `ANTHROPIC_API_KEY` / `PERPLEXITY_API_KEY`, les Agents 2 et 3 utilisent des calculs déterministes (Poisson + value bet).

## Variables d'environnement

Voir `.env.local.example`.

**Important :** ne jamais committer `.env.local` ni de clés API dans le code.

## Structure

```
src/
├── agents/          # Pipeline + 3 agents
├── skills/          # football-prediction.md (injecté dans agents 2 & 3)
├── types/           # Schémas Zod partagés
├── lib/             # Clients API, Poisson, cache Redis
├── app/             # Pages + routes API
└── components/      # MatchCard, SignalBadge, ComboBuilder, PipelineStatus
```

## Ancien site Django

Le dossier `predictions/` et `index.html` restent pour référence. Le frontend Antigravity est désormais sous `src/app/`.
