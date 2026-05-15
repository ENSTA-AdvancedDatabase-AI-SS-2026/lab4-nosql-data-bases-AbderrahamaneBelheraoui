


# RAPPORT TP1 — Redis : Système de Cache ShopFast

**Étudiant :** BELHERAOUI ABDERRAHMANNE
**Module :** Bases de Données Avancées

---

## 1. Comparaison de Performance : Cache HIT vs MISS

### Résultats obtenus (benchmark sur 10 itérations, produit #2)

| Type         | Nombre d'appels | Temps moyen |
|--------------|-----------------|-------------|
| CACHE MISS   | 1               | ~2 003 ms   |
| CACHE HIT    | 9               | ~0.4 ms     |
| **Hit rate** | —               | **90%**     |

### Analyse

Le **premier appel** est toujours un MISS car le cache est vide.
Redis ne trouve rien → on appelle `slow_db_get_product()` qui simule
une requête PostgreSQL lente (2 secondes). Le résultat est ensuite
stocké dans Redis avec `SETEX`.

Les **9 appels suivants** sont des HITs : Redis répond directement
depuis la RAM en moins d'une milliseconde, sans toucher la base.

```
MISS : Client → Redis (vide) → PostgreSQL (2000ms) → Redis.SETEX → Client
HIT  : Client → Redis (0.4ms) ──────────────────────────────────→ Client
```

**Conclusion :** Le cache réduit la latence d'un facteur ~5 000
et supprime toute charge sur la base de données pour les lectures répétées.

---

## 2. Justification des Choix de Modélisation

### Hash → Produit (`product:{id}`) et Panier (`cart:{user_id}`)

```
HSET product:1 name "Samsung A54" price 65000 stock 15
HINCRBY cart:user:42 "1" 2
```

Le **Hash** est la structure naturelle pour représenter un objet
avec plusieurs champs. Pour le produit, `HGETALL` récupère tous
les attributs en une seule commande. Pour le panier, `HINCRBY`
incrémente la quantité d'un article de façon **atomique**, ce qui
évite tout problème de concurrence sans avoir besoin de verrou.

---

### List → Historique de navigation (`history:{user_id}`)

```
LPUSH history:user:42 "5"
LTRIM history:user:42 0 9
```

La **List** convient parfaitement à un historique ordonné.
`LPUSH` insère le produit consulté en tête en O(1), donc le plus
récent est toujours en index 0. `LTRIM` limite automatiquement
la taille à 10 éléments sans job de nettoyage externe.

---

### Set → Catégories (`category:{nom}`)

```
SADD category:electronics 1 2
SADD category:promo 1 3
SINTER category:electronics category:promo  →  {"1"}
```

Le **Set** garantit l'unicité : un produit ne peut pas apparaître
deux fois dans la même catégorie. `SINTER` calcule l'intersection
directement côté Redis, sans rapatrier les données côté applicatif.

---

### String → Cache produit (`product_cache:{id}`)

```
SETEX product_cache:1 600 '{"id":1,"name":"Samsung A54",...}'
```

Le **String** suffit pour stocker un snapshot JSON d'un produit.
`SETEX` combine l'écriture et le TTL en une seule commande atomique.

---

### Sorted Set → Classement des ventes (`leaderboard:sales`)

```
ZINCRBY leaderboard:sales 5 "3"
ZREVRANGE leaderboard:sales 0 9 WITHSCORES
ZREVRANK  leaderboard:sales "3"
```

Le **Sorted Set** maintient automatiquement les membres triés
par score (= nombre de ventes). `ZINCRBY` met à jour le score
atomiquement. `ZREVRANGE` retourne le top N en O(log N + N)
et `ZREVRANK` donne le rang d'un produit instantanément.

---

## 3. Réponses aux Questions de Réflexion

### Q1 — Que se passe-t-il si Redis redémarre ?

Par défaut, Redis est **purement en mémoire**. Un redémarrage
sans persistance configurée efface toutes les données.

L'impact varie selon le type de donnée :

| Donnée            | Impact                                                                         |
|-------------------|--------------------------------------------------------------------------------|
| Cache produits    | Faible — MISS temporaire, le Cache-Aside recharge automatiquement depuis la DB |
| Sessions          | Critique — tous les utilisateurs sont déconnectés                              |
| Paniers           | Critique — les paniers sont perdus                                             |
| Classement ventes | Moyen — nécessite un recalcul depuis l'historique DB                           |

**Solutions :**

- **RDB** (snapshot) : Redis sauvegarde les données sur disque périodiquement.
  Risque de perdre les dernières écritures entre deux snapshots.
- **AOF** (Append Only File) : chaque écriture est journalisée immédiatement.
  Meilleure durabilité, fichier plus volumineux.
- **RDB + AOF** : combinaison recommandée en production.

```
# redis.conf
save 900 1           # RDB toutes les 15 min si ≥ 1 modification
appendonly yes       # AOF activé
appendfsync everysec # flush disque chaque seconde
```

---

### Q2 — Comment gérer la cohérence cache/DB en accès concurrent ?

**Le problème — Race Condition :**

```
Thread A : lit DB      → stock = 5
Thread B : UPDATE DB   → stock = 4
Thread A : SETEX Redis → cache stock = 5  ← donnée obsolète !
```

Le cache contient maintenant une valeur incorrecte.

**Solutions :**

1. **Invalidation sur écriture** : toute modification en DB
   supprime immédiatement la clé Redis correspondante.
   Le prochain accès fera un MISS et rechargera la donnée fraîche.

```python
db.update(product_id, new_data)         # 1. écrire en DB
invalidate_product_cache(r, product_id) # 2. supprimer le cache
```

2. **TTL comme filet de sécurité** : même si l'invalidation
   échoue, la donnée obsolète expire d'elle-même après le TTL.

3. **Write-Through** : écrire simultanément dans Redis et dans
   la DB. Le cache est toujours à jour, mais les écritures
   sont plus lentes et le couplage plus fort.

**Recommandation :** Invalidation sur écriture + TTL court (60 s)
comme protection supplémentaire.

---

### Q3 — Quand un TTL trop court est-il problématique ?

Un TTL trop court vide le cache trop fréquemment et génère
un phénomène appelé **Cache Stampede** :

```
TTL expire ──► 500 requêtes simultanées → toutes voient un MISS
             ──► 500 requêtes frappent PostgreSQL en même temps
             ──► La base de données sature
             ──► Effet inverse du cache
```

**Autres situations problématiques :**

| Situation                   | Conséquence d'un TTL trop court       |
|-----------------------------|---------------------------------------|
| Page produit très consultée | Charge DB permanente, cache inutile   |
| Données rarement modifiées  | Recomputation coûteuse et inutile     |
| Appel vers une API externe  | Quota API épuisé trop rapidement      |
| Classement des ventes       | Recalcul fréquent sans valeur ajoutée |

**Recommandations pour ShopFast :**

| Donnée            | TTL conseillé | Justification                      |
|-------------------|---------------|------------------------------------|
| Cache produit     | 600 s         | Données stables, changent peu      |
| Session           | 1 800 s       | Sliding expiration à chaque action |
| Panier            | 86 400 s      | Ne jamais perdre le panier client  |
| Classement ventes | 300 s         | Légère obsolescence acceptable     |
| Stock             | 30 s          | Critique pour éviter la survente   |

**Règle générale :** TTL = équilibre entre fréquence de changement
de la donnée et criticité d'une éventuelle incohérence.
```