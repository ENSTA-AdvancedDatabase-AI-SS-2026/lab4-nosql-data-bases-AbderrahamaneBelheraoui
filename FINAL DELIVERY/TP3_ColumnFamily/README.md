# TP3 — Cassandra : Données IoT & Séries Temporelles
## Use Case : SmartGrid DZ — Surveillance de Réseau Électrique

---

## 📖 Contexte

**SmartGrid DZ** surveille le réseau électrique de 5 wilayas algériennes. Chaque minute, 10 000 capteurs envoient leur consommation, tension et état. Avec PostgreSQL, les insertions massives saturent la base. Il faut ingérer **10 000 mesures/minute** et requêter les séries temporelles efficacement.

**Mission :** Concevoir le schéma Cassandra et implémenter l'ingestion/requête des données IoT.

---

## 🎯 Objectifs Pédagogiques

- Comprendre le modèle de données Cassandra (Partition Key, Clustering Key)
- Appliquer la règle : **"Model your queries, not your entities"**
- Maîtriser CQL (Cassandra Query Language)
- Comprendre la stratégie de compaction et les TTL

---

## 📚 Rappel Théorique

### Modèle Cassandra

```
TABLE capteur_mesures (
  wilaya      TEXT,           ← PARTITION KEY → distribué sur les nœuds
  capteur_id  UUID,           ↑
  date        DATE,           │ PRIMARY KEY
  heure       TIME,           ← CLUSTERING KEY → trié dans la partition
  tension     FLOAT,
  courant     FLOAT,
  puissance   FLOAT,
  alerte      BOOLEAN
  PRIMARY KEY ((wilaya, date), capteur_id, heure)
)
```

### Règle fondamentale
> **Ne pas penser en termes de tables relationnelles.**  
> Pour chaque requête fréquente → créer une table dédiée.

| Requête | Table |
|---------|-------|
| "Mesures d'un capteur sur 24h" | `mesures_par_capteur` |
| "Alertes d'une wilaya aujourd'hui" | `alertes_par_wilaya` |
| "Pic de conso par heure" | `agregats_horaires` |

---

## 🏗️ Keyspace et Tables

```sql
-- Keyspace avec réplication
CREATE KEYSPACE smartgrid
WITH replication = {'class': 'NetworkTopologyStrategy',
                    'datacenter1': 3}
AND durable_writes = true;

-- Table principale des mesures
-- TODO: à compléter en Ex1

-- Table pour les alertes
-- TODO: à compléter en Ex1

-- Table des agrégats horaires (pré-calculés)
-- TODO: à compléter en Ex1
```

---

## 📝 Exercices

### Ex1 — Modélisation des Tables (6 pts) → `starter/ex1_schema.cql`

```sql
-- 1.1 Créer le keyspace smartgrid

-- 1.2 Table mesures_par_capteur
-- Requête cible : "Toutes les mesures du capteur X entre T1 et T2"
-- Partition Key : capteur_id + date (éviter les hot partitions)
-- Clustering Key : timestamp DESC (dernières mesures en premier)

-- 1.3 Table alertes_par_wilaya
-- Requête cible : "Toutes les alertes d'Alger aujourd'hui"

-- 1.4 Table agregats_horaires
-- Requête cible : "Consommation moyenne par heure pour le dashboard"

-- 1.5 Configurer le TTL par défaut
-- Mesures brutes : 90 jours
-- Alertes : 1 an
-- Agrégats : 5 ans
```

### Ex2 — Ingestion de Données (5 pts) → `starter/ex2_ingestion.py`

```python
# 2.1 Générer et insérer 50 000 mesures simulées
# (10 000 capteurs × 5 minutes de données)
# Utiliser des BATCH statements pour la performance

# 2.2 Insérer avec TTL par ligne
INSERT INTO mesures_par_capteur (...) VALUES (...) USING TTL 7776000;

# 2.3 Mesurer le débit d'ingestion (mesures/seconde)

# 2.4 Insérer des alertes (10% des mesures dépassent le seuil)
```

### Ex3 — Requêtes CQL (7 pts) → `starter/ex3_queries.cql`

```sql
-- 3.1 Mesures d'un capteur spécifique sur les dernières 6 heures
SELECT * FROM mesures_par_capteur
WHERE capteur_id = ? AND date = ? AND timestamp >= ?;

-- 3.2 Dernière mesure de chaque capteur d'une wilaya
-- (Astuce : utiliser LIMIT 1 avec clustering DESC)

-- 3.3 Capteurs en alerte dans la wilaya "Alger" aujourd'hui
-- Compter et lister

-- 3.4 Consommation totale par heure sur une journée (dashboard)

-- 3.5 Détection d'anomalie : capteurs avec tension < 200V ou > 240V
-- dans les 30 dernières minutes

-- 3.6 Top 10 capteurs les plus actifs (plus de mesures) cette semaine

-- 3.7 Requête ALLOW FILTERING : Pourquoi éviter ?
-- Écrire la même requête correctement avec la bonne table
```

### Ex4 — Compaction et Maintenance (4 pts) → `starter/ex4_maintenance.cql`

```sql
-- 4.1 Choisir la stratégie de compaction pour chaque table
-- TimeWindowCompactionStrategy (TWCS) pour les séries temporelles
-- Expliquer le choix

-- 4.2 Configurer TWCS pour les mesures
ALTER TABLE mesures_par_capteur
WITH compaction = {
  'class': 'TimeWindowCompactionStrategy',
  'compaction_window_unit': ???,
  'compaction_window_size': ???
};

-- 4.3 Vérifier l'utilisation des TTL
-- Requête pour voir combien de lignes expirent dans les 7 prochains jours

-- 4.4 Analyser une partition "hot" : comment la détecter et la corriger ?
```

---

## 🧪 Lancement

```bash
# Se connecter à Cassandra
docker exec -it nosql_cassandra cqlsh

# Charger le schéma
SOURCE '/tp3/starter/ex1_schema.cql'

# Python
cd TP3_ColumnFamily/starter
pip install cassandra-driver pytest
pytest tests/ -v
```

---

## 📊 Livrables

`RAPPORT.md` :
1. Justification de chaque Partition Key (risque de hot partition ?)
2. Pourquoi ALLOW FILTERING est dangereux en production
3. Comparaison TWCS vs STCS vs LCS : quand utiliser chacun ?

---

## 🏆 Barème : 25 pts | Bonus +3 pts (Matérialized Views)
