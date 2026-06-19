# Prompt pour nettoyer Docker

Envoie ceci à une IA (ChatGPT/Claude) pour générer les commandes exactes :

---

J'ai un projet Docker sur Windows avec Docker Desktop. Mon disque est plein à cause de l'accumulation d'images, conteneurs, volumes et cache de build. J'ai besoin de :

1. **Lister les images inutilisées** (dangling + non taguées + anciennes versions)
2. **Supprimer TOUT ce qui n'est pas utilisé** : conteneurs arrêtés, images dangling, volumes orphelins, build cache
3. **Garder mes images actuelles en cours d'exécution** (ne pas toucher au projet en cours)
4. **Ne PAS supprimer les volumes nommés** qui contiennent ma base de données Postgres et Redis
5. **Identifier et supprimer les anciennes images de mes services** (fasobet-django, fasobet-celery-worker, fasobet-celery-beat, fasobet-fastapi, fasobet-nextjs) — ne garder que les 2 plus récentes

Mes conteneurs actuellement en cours (vérifier avec `docker ps`) :
- fasobet-django
- fasobet-celery-worker
- fasobet-celery-beat
- fasobet-fastapi
- fasobet-nextjs
- fasobet-postgres
- fasobet-redis

Mes volumes IMPORTANTS à conserver (ne PAS supprimer) :
- postgres_data (base de données)
- redis_data (cache Redis)

Donne-moi les commandes exactes à exécuter dans PowerShell (pas bash). Sois prudent : montre d'abord ce qui va être supprimé avant de supprimer.
