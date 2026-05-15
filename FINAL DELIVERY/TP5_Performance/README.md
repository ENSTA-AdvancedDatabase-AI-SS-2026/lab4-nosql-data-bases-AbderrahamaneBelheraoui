# TP5 — Performance & Optimisation NoSQL
## Use Case : Benchmark Comparatif — Choisir la Bonne Base

---

## 📖 Contexte

Votre entreprise doit choisir entre Redis, MongoDB, Cassandra et Neo4j pour son nouveau produit. Vous avez été chargé de produire un **benchmark rigoureux** pour guider cette décision architecturale.

**Mission :** Mesurer, comparer et analyser les performances des 4 technologies sur des workloads réalistes.

---

## 📝 Exercices

### Ex1 — Benchmark Écriture (3 pts)

Insérer **100 000 enregistrements** dans chaque base et mesurer :
- Débit d'écriture (enregistrements/seconde)
- Latence P50, P95, P99
- Utilisation mémoire/CPU pendant l'insertion

### Ex2 — Benchmark Lecture (3 pts)

**Point lookup** (clé connue), **Range query** (plage temporelle), **Complex query** (agrégation ou traversal) :
- Comparer les latences pour 10 000 requêtes
- Mesurer l'impact de l'indexation

### Ex3 — Test de Charge Concurrente (2 pts)

Simuler 50 clients simultanés effectuant des lectures/écritures :
- Mesurer la dégradation des performances sous charge
- Identifier les goulots d'étranglement

### Ex4 — Rapport de Recommandation (2 pts)

Produire un tableau de décision :

| Critère | Redis | MongoDB | Cassandra | Neo4j |
|---------|-------|---------|-----------|-------|
| Débit écriture | | | | |
| Débit lecture | | | | |
| Requêtes complexes | | | | |
| Scalabilité | | | | |
| **Use case idéal** | Cache | Documents | IoT/Logs | Graphe |

---

## 🏆 Barème : 10 pts
