# FasoBet Codebase Improvement Plan

## Problèmes identifiés et solutions recommandées

### 1. console.log dans TypeScript (12 occurrences)
Problème : Les console.log ne doivent pas rester en production.

Solution :
- Remplacer par un système de logging structuré
- Utiliser un logger comme `winston` ou `pino`
- Supprimer les console.log critiques avant déploiement

Fichiers concernés :  
(src/components/ et src/app/)

### 2. Fetch() direct dans les composants (3 occurrences)
Problème : Les appels API doivent être centralisés.

Solution :
- Créer un service API dédié dans `src/lib/api.ts`
- Encapsuler tous les appels fetch
- Gérer les erreurs et retry centralisés
- Ajouter les intercepteurs nécessaires

Fichiers concernés :
- src/components/
- src/app/

### 3. Module fasobet_core non importable
Problème : Le module Python ne trouve pas fasobet_core.

Solution :
- Vérifier que le module Rust est bien compilé
- S'assurer que le .so/.dll est dans le PYTHONPATH
- Revoir l'installation via `maturin develop`
- Vérifier les chemins dans pyproject.toml

### Plan d'action

1. [ ] Supprimer les console.log critiques
2. [ ] Centraliser les appels API
3. [ ] Corriger l'import du module fasobet_core
4. [ ] Mettre à jour le script check_codebase.ps1
5. [ ] Automatiser les vérifications dans le CI/CD