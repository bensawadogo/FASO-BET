---
name: ia-paris-sportif
description: Skill de prédiction football pour les paris sportifs.
version: 1.0.0
status: installed
---

# ⚽ IA Paris Sportif — SKILL

## 🎯 Description

Skill de prédiction football pour les paris sportifs.

**Déclenchement automatique** pour toute demande liée au football :
- Analyse de match, prédiction, "qui va gagner", "vaut-il la peine de parier"
- Demande de combinés / expresss
- Liste de matchs à analyser

**Couverture :**
- CLUBS : Ligue 1, Premier League, Serie A, Bundesliga, La Liga, Champions League, Super League, MLS
- NATIONALES : CAN, Éliminatoires Mondial, Euro, Copa América, Nations League, matchs amicaux
- MARCHÉS : 1X2, Double Chance, Over/Under, BTTS, Handicap

---

## 📋 WORKFLOW

### ÉTAPE 1 — Identifier le type de match

| Type | Exemples | Traitement |
|---|---|---|
| 🏟️ Club (compétition) | PSG vs Lyon, Liverpool vs Arsenal | Analyse standard |
| 🏟️ Club (amical) | Pré-saison, tournée | ⚠️ Alerte amical |
| 🌍 Nationale (compétition) | CAN, Mondial, Euro | Sources nationales |
| 🌍 Nationale (amical) | Trêve internationale | ⚠️ Double alerte |

### ÉTAPE 2 — Collecter les données

**Clubs (obligatoire) :**
- Forme 5 derniers matchs (domicile/extérieur séparé)
- xG pour/contre (10 derniers matchs rolling)
- H2H (5 dernières confrontations)
- Absences/blessures confirmées

**Nationales (obligatoire) :**
- Forme 6 derniers matchs OFFICIELS uniquement
- Ranking FIFA des deux équipes
- H2H toutes compétitions
- Joueurs absents (blessures clubs + convocations refusées)

**Bonus contexte (+précision) :**
- Arbitre assigné → +3%
- Météo jour du match → +2%
- Motivation / enjeu classement → +4%
- Blessure clé <48h → +5%
- Retour suspension → +3%

### ÉTAPE 3 — Calculer le score composite

```
Score Forme     = 40% → pts/match DOM vs EXT, last 5
Score xG        = 30% → xG différentiel, qualité tirs
Score H2H       = 15% → tendance buts, résultats récents
Score Contexte  = 15% → enjeu, fatigue, absences clés
────────────────────────────────
SCORE COMPOSITE = somme pondérée [0–100]
```

**Ajustements automatiques :**

| Facteur | Ajustement |
|---|---|
| Match barrage / finale / élimination directe | DC obligatoire 🛡️ |
| Amical détecté | Forme → 25%, confiance plafonnée 60% |
| Écart FIFA > 30 places | +5 pts équipe mieux classée |
| Écart FIFA 15–30 places | +3 pts |

### ÉTAPE 4 — Calcul Poisson (probabilités buts)

```
λ_DOM = (xG_att_DOM × xGA_EXT) / moyenne_ligue
λ_EXT = (xG_att_EXT × xGA_DOM) / moyenne_ligue

Over 2.5  = 1 - P(0 but) - P(1 but) - P(2 buts)
BTTS Oui  = P(DOM ≥ 1) × P(EXT ≥ 1)
1X2       = somme combinaisons scores
```

**Tableau Poisson rapide :**

| λ total | P(0) | P(1) | P(2) | Over 2.5 |
|---|---|---|---|---|
| 1.5 | 22% | 33% | 25% | 20% |
| 2.0 | 14% | 27% | 27% | 32% |
| 2.5 | 8% | 21% | 26% | 45% |
| 3.0 | 5% | 15% | 22% | 58% |

### ÉTAPE 5 — Value Bet

```
value = (proba_estimée × cote_bookmaker) - 1

✅ VALUE BET   → value > 0.05
⚠️ NEUTRE     → 0 < value ≤ 0.05
❌ ÉVITER     → value ≤ 0
```

### ÉTAPE 6 — Sharp Money (mouvements de cotes)

| Signal | Action |
|---|---|
| Cote DOM baisse fort depuis ouverture | Argent pro sur DOM → renforcer |
| Cote NUL monte | Bookmakers anticipent victoire nette |
| Cote EXT baisse (DOM favori) | Alerte retournement |
| Pas de mouvement | Se fier aux stats |

### ÉTAPE 7 — Consensus sites prédiction

Sources : forebet.com, predictz.com, windrawwin.com, soccervista.com

```
Consensus > 70% → Signal FORT ✅
Consensus 50–70% → Signal MOYEN ⚠️
Consensus < 50% → Contradiction ❌
```

---

## ⚠️ RÈGLES MATCHS AMICAUX

Toujours afficher :

```
⚠️ MATCH AMICAL DÉTECTÉ
   Fiabilité réduite — rotations massives possibles
   Confiance plafonnée : 60% max
   Mise recommandée : 50% de la mise habituelle
```

Ajustements obligatoires :
- Score Forme → 25% (rotations)
- xG → basé sur matchs OFFICIELS uniquement
- Confiance → max 60%

---

## 🛡️ DOUBLE CHANCE — RÈGLE OBLIGATOIRE

Remplacer "Victoire X" par "Double Chance (1X ou X2)" dans ces cas :

| Situation | Raison |
|---|---|
| Barrage, finale, élimination directe | Tirs au but imprévisibles |
| Match à enjeu maximal (titre/relégation) | Pression = surprises |
| Cote victoire < 1.40 | Mauvaise valeur |

Signaler avec `🛡️DC` dans les combos.

> **Leçon apprise :** Bosnie-Italie (31 mars) : "Victoire Italie" 1.55 → PERDU (expulsion + tirs au but). "DC Italie (1X)" 1.18 → GAGNÉ.

---

## 📊 OUTPUT FORMAT — VERSION COMPACTE

```
⚽ [Équipe A] vs [Équipe B] — [Compétition] | [Date]
[⚠️ AMICAL — confiance réduite]

📊 Résumé clé
  Forme    : [A] ●●●○● vs [B] ●○●●○
  xG diff  : [A] +X.X  vs [B] -X.X
  H2H      : [Tendance en 1 ligne]
  Contexte : [1 ligne max]

🎯 Conseil
  Marché    : [Marché recommandé]
  Cote min  : X.XX
  Confiance : XX% | Risque : FAIBLE / MOYEN / ÉLEVÉ
  Signal    : ✅ VALUE BET / ⚠️ NEUTRE / ❌ ÉVITER
```

---

## 🎰 MARCHÉS — GUIDE RAPIDE

| Marché | Tu gagnes si... | Probabilité | Cote typique |
|---|---|---|---|
| **Over 1.5** | 2 buts ou + dans le match | 85–92% | 1.15–1.30 |
| **DC (1X)** | Équipe A gagne OU nul | 75–85% | 1.20–1.45 |
| **DC (X2)** | Équipe B gagne OU nul | 70–82% | 1.25–1.50 |
| **BTTS Oui** | Les deux équipes marquent | 55–75% | 1.65–1.90 |
| **Over 2.5** | 3 buts ou + | 50–65% | 1.60–1.85 |
| **Victoire sèche** | Un seul résultat possible | 40–65% | 1.50–2.50 |
| **Under 2.5** | 0, 1 ou 2 buts max | 40–55% | 1.70–2.00 |

---

## 🎟️ FORMAT COMBINÉS 1XBET / MELBET

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎟️ EXPRESS ×[COTE] | [N] matchs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. [Équipe A] vs [Équipe B]
   ➤ [Sélection] [🛡️DC si double chance]
   📊 Cote : X.XX | Confiance : XX%

[...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COTE TOTALE   : ×X.XX
Prob. coupon  : ~XX%
Mise 1 000 F  → Gain : X XXX F
Mise 5 000 F  → Gain : XX XXX F
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Paliers de combinés :**

| Cote cible | Matchs | Probabilité coupon | Marchés préférés |
|---|---|---|---|
| ×5 | 5–7 | ~45% | DC + Over 1.5 |
| ×10 | 8–9 | ~25% | DC + BTTS |
| ×20 | 9–10 | ~16% | DC + BTTS + Over 2.5 |
| ×50 | 11–12 | ~10% | Mixte |
| ×100 | 12–13 | ~7% | Mixte + quelques victoires |
| ×300 | 14–15 | ~4% | Victoires incluses |
| ×500 | 15–16 | ~2% | Risqué |
| ×1000 | 17–18 | ~1% | Très risqué |

**Règles de construction :**
- Uniquement les matchs ✅ et ⚠️ dans les combos
- Les ❌ ÉVITER ne rentrent JAMAIS dans un combo
- Amicaux uniquement si l'utilisateur demande explicitement → signaler ⚠️🟡
- Barrages/finales → DC obligatoire 🛡️

---

## ✅ RÈGLES DE CONSEIL

Le skill **propose**, l'utilisateur **décide**.

| Signal | Signification |
|---|---|
| ✅ VALUE BET | Confiance ≥ 65% + value > 5% + consensus > 60% |
| ⚠️ NEUTRE | 1–2 conditions manquantes → possible mais risqué |
| ❌ ÉVITER | < 2 conditions, amical non fiable, contradiction |

Ne jamais écrire "GO PARIER" ou "PASSER" — c'est la décision de l'utilisateur.

---

## 🌍 LIGUES ET COMPÉTITIONS

### Clubs
| Code | Ligue | Buts/match |
|---|---|---|
| L1 | Ligue 1 (France) | 2.6 |
| PL | Premier League (Angleterre) | 2.8 |
| SA | Serie A (Italie) | 2.5 |
| BL | Bundesliga (Allemagne) | 3.1 |
| LL | La Liga (Espagne) | 2.6 |
| CL | Champions League | 2.9 |
| SL | Super League | 2.4 |
| MLS | Major League Soccer | 2.7 |

### Nationales
| Code | Compétition | Buts/match | Fiabilité |
|---|---|---|---|
| CAN | Coupe d'Afrique des Nations | 2.3 | ⭐⭐⭐ |
| WCQ | Éliminatoires Mondial | 2.8 | ⭐⭐⭐ |
| EURO | Championnat d'Europe | 2.5 | ⭐⭐⭐ |
| COPA | Copa América | 2.4 | ⭐⭐⭐ |
| NL | Nations League | 2.6 | ⭐⭐ |
| AMI | Amical International | 2.7 | ⭐ max 60% |

---

## 📡 ANALYSE GROUPE DE MATCHS

L'utilisateur peut coller une liste directement. Formats acceptés :

```
PSG vs Lyon
Real Madrid - Barcelona | La Liga | 5 avril
Dortmund vs Bayern samedi
```

Workflow :
1. Analyser tous les matchs en une fois
2. Classer : ✅ d'abord, puis ⚠️, puis ❌
3. Générer automatiquement les combos ×5 à ×1000
4. Ne jamais demander confirmation entre chaque match

---

## 📊 SOURCES DE DONNÉES

### Clubs & Stats
| Source | Données |
|---|---|
| fbref.com | xG, xA, progressive passes, PPDA |
| understat.com | xG/xGA rolling 10 matchs |
| sofascore.com | Rating, heatmaps, duels |
| transfermarkt.com | Valeur marché, blessures |
| teamsnews.com | Blessures <48h |
| soccerway.com | Suspensions, compositions |

### Nationales
| Source | Usage |
|---|---|
| fifa.com/ranking | Classement FIFA officiel |
| fbref.com/intl | Stats avancées internationaux |
| cafonline.com | CAN, éliminatoires africains |
| uefa.com/stats | Euro, Nations League |
| conmebol.com | Copa América |

### Cotes & Bookmakers
| Source | Usage |
|---|---|
| pinnacle.com | Référence sharp money |
| oddsportal.com | Comparateur multi-bookmakers |
| oddschecker.com | Meilleures cotes temps réel |
| betexplorer.com | Historique mouvements |

### Sites Prédiction (Consensus)
forebet.com · predictz.com · windrawwin.com · soccervista.com · betensured.com · soccerpunter.com

---

## 📱 BOOKMAKERS BURKINA FASO

### 1xBet (recommandé #1)
- Dépôt/Retrait : **Orange Money BF** | **Moov Money** | **Coris Money**
- Bonus : 100% premier dépôt

### Melbet (recommandé #2)
- Dépôt/Retrait : **Orange Money** | **Moov Money**
- Bonus : 130% jusqu'à 200 000 FCFA

**Méthode dépôt Orange Money :**
1. Compte → Dépôt → Orange Money
2. Numéro Orange BF → montant
3. Code USSD → crédit instantané

---

## 🔑 COMMANDES RAPIDES

| Commande | Action |
|---|---|
| `/ia-paris-sportif [match]` | Analyse un match |
| `combos du jour` | Génère les 8 paliers de combinés |
| `explique-moi [match]` | Détaille les calculs Poisson + value bet |
| `résultat du coupon` | Analyse les résultats du dernier coupon |
| `[liste de matchs]` | Analyse groupée automatique |
