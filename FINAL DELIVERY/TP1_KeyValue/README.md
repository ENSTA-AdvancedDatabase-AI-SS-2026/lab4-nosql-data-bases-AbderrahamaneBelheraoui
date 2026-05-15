# TP1 — Redis : Système de Cache E-commerce
## Use Case : ShopFast — Plateforme E-commerce Algérienne

---

## 📖 Contexte

Vous êtes ingénieur backend chez **ShopFast**. Les pages produits mettent 3-4 secondes à charger car la base PostgreSQL est surchargée. Les paniers se perdent, les sessions expirent trop tôt.

**Mission :** Implémenter une couche de cache Redis.

---

## 🎯 Objectifs Pédagogiques

- Maîtriser les structures de données Redis (String, Hash, List, Set, Sorted Set)
- Implémenter le pattern Cache-Aside avec TTL
- Gérer les sessions utilisateur
- Construire un classement temps réel

---

## 📚 Rappel Théorique

### Structures Redis

| Structure | Commandes | Usage |
|-----------|-----------|-------|
| String | `SET`, `GET`, `INCR` | Cache simple, compteurs |
| Hash | `HSET`, `HGET`, `HMGET` | Objets structurés |
| List | `LPUSH`, `LRANGE`, `LTRIM` | Historiques, files |
| Set | `SADD`, `SMEMBERS`, `SINTER` | Tags, relations |
| Sorted Set | `ZADD`, `ZRANGE`, `ZREVRANK` | Classements |

### Pattern Cache-Aside

```
Requête ──► Redis ?
              ├─ HIT  ──► Retourner valeur
              └─ MISS ──► DB ──► Stocker dans Redis (TTL) ──► Retourner
```

---

## 📝 Exercices

### Ex1 — Structures de données (4 pts) → `starter/ex1_structures.py`

Implémenter : stockage produit (Hash), gestion panier, historique navigation (List), produits par catégorie (Set)

### Ex2 — Sessions utilisateur (4 pts) → `starter/ex2_sessions.py`

Créer/renouveler/supprimer des sessions avec TTL 30 minutes (sliding expiration)

### Ex3 — Cache-Aside avec TTL (5 pts) → `starter/ex3_cache.py`

Implémenter le pattern Cache-Aside, mesurer cache hit vs miss, invalider le cache

### Ex4 — Classement des ventes (4 pts) → `starter/ex4_leaderboard.py`

Sorted Set pour top produits, rang, classement par catégorie

### Ex5 — Pipeline & Transactions (3 pts) → `starter/ex5_pipeline.py`

Bulk insert avec pipeline, transaction MULTI/EXEC pour une commande atomique

---

## 🧪 Lancement des tests

```bash
cd TP1_KeyValue/starter
pip install redis pytest
pytest tests/ -v
```

---

## 📊 Livrables

Fichier `RAPPORT.md` dans `starter/` avec :
1. Comparaison de performance (hit vs miss)
2. Justification des choix de modélisation
3. Réponses aux questions de réflexion

### Questions de réflexion
1. Que se passe-t-il si Redis redémarre ?
2. Comment gérer la cohérence cache/DB en cas d'accès concurrent ?
3. Quand un TTL trop court est-il problématique ?

---

## 🏆 Barème : 20 pts | Bonus +2 pts (rate-limiting par utilisateur)
