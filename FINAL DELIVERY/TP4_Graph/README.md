# TP4 — Neo4j : Réseau Social Universitaire
## Use Case : UniConnect DZ — Plateforme Étudiante

---

## 📖 Contexte

**UniConnect DZ** est une plateforme de mise en relation étudiante inter-universités algériennes. Trouver des camarades de cours, des tuteurs, des partenaires de projet, des anciens étudiants dans des entreprises... Avec une base relationnelle, les requêtes de graphe (chemin entre deux personnes, recommandation de contacts) sont horriblement lentes.

**Mission :** Modéliser et interroger le réseau social avec Neo4j et Cypher.

---

## 🎯 Objectifs Pédagogiques

- Modéliser un graphe de propriétés (nœuds, relations, propriétés)
- Maîtriser Cypher (MATCH, WHERE, CREATE, MERGE, WITH, UNWIND)
- Implémenter des algorithmes de graphe (plus court chemin, centralité, communautés)
- Comprendre quand utiliser une base graphe vs relationnelle

---

## 📚 Rappel Théorique

### Modèle de Graphe de Propriétés

```
(Ahmed:Etudiant {prenom: "Ahmed", universite: "USTHB"})
     │
     ├─[:CONNAIT {depuis: 2023}]──► (Fatima:Etudiant)
     │
     ├─[:SUIT]──────────────────► (BDD_Avancees:Cours {code: "INFO401"})
     │
     └─[:MEMBRE_DE]─────────────► (ClubIA:Club {nom: "Club IA USTHB"})
```

### Requête Cypher de Base

```cypher
// Trouver des amis d'amis (2 sauts)
MATCH (moi:Etudiant {prenom: "Ahmed"})-[:CONNAIT*2]-(suggestion:Etudiant)
WHERE NOT (moi)-[:CONNAIT]-(suggestion)
RETURN suggestion.prenom, suggestion.universite
LIMIT 10
```

### Différence Graph vs Relationnel

| Requête | SQL | Cypher |
|---------|-----|--------|
| Amis directs | 1 JOIN | 1 hop |
| Amis d'amis | 2 JOINs | 2 hops |
| Chemin entre 2 personnes | N JOINs | shortestPath() |
| Détection de communauté | Impossible | Louvain en 1 ligne |

---

## 🏗️ Schéma du Graphe

```
Nœuds (Labels) :
  :Etudiant   { id, prenom, nom, universite, filiere, annee, ville }
  :Cours      { code, intitule, credits, departement }
  :Club       { nom, universite, domaine }
  :Entreprise { nom, secteur, ville }
  :Competence { nom, categorie }

Relations :
  (:Etudiant)-[:CONNAIT { depuis, contexte }]→(:Etudiant)
  (:Etudiant)-[:SUIT { semestre, note }]→(:Cours)
  (:Etudiant)-[:MEMBRE_DE { role }]→(:Club)
  (:Etudiant)-[:A_STAGE_CHEZ { annee, duree_mois }]→(:Entreprise)
  (:Etudiant)-[:MAITRISE { niveau }]→(:Competence)
  (:Cours)-[:REQUIERT]→(:Competence)
```

---

## 📝 Exercices

### Ex1 — Modélisation et Import (4 pts) → `starter/ex1_create_graph.cypher`

```cypher
-- 1.1 Créer 50 étudiants de 5 universités algériennes
-- (USTHB, UMBB, USTO, UMC, UBMA)

-- 1.2 Créer des cours, clubs, entreprises et compétences

-- 1.3 Créer les relations (CONNAIT, SUIT, MEMBRE_DE, MAITRISE)
-- Assurer la connexité du graphe (pas d'étudiants isolés)

-- 1.4 Importer depuis CSV (fichier import/students.csv fourni)
LOAD CSV WITH HEADERS FROM 'file:///students.csv' AS row
MERGE (e:Etudiant { id: row.id })
SET e.prenom = row.prenom, e.universite = row.universite
-- TODO: Compléter avec toutes les propriétés et relations
```

### Ex2 — Requêtes de Base (4 pts) → `starter/ex2_basic_queries.cypher`

```cypher
-- 2.1 Trouver tous les amis d'Ahmed (1 saut)

-- 2.2 Trouver les amis d'amis d'Ahmed qui ne sont pas déjà ses amis

-- 2.3 Étudiants qui suivent le même cours que Fatima mais ne la connaissent pas

-- 2.4 Clubs les plus populaires (par nombre de membres)

-- 2.5 Profil complet d'un étudiant : amis, cours, compétences, clubs
```

### Ex3 — Algorithmes de Graphe (6 pts) → `starter/ex3_graph_algorithms.cypher`

```cypher
-- 3.1 Plus court chemin entre deux étudiants
-- "Comment Ahmed peut-il rencontrer Yasmina ?"
MATCH p = shortestPath(
  (ahmed:Etudiant {prenom: "Ahmed"})-[:CONNAIT*]-(yasmina:Etudiant {prenom: "Yasmina"})
)
RETURN [n IN nodes(p) | n.prenom] AS chemin, length(p) AS distance

-- 3.2 Étudiants les plus connectés (centralité de degré)
-- Utiliser GDS (Graph Data Science)

-- 3.3 Détection de communautés (Louvain)
-- Identifier les "cercles sociaux"

-- 3.4 Recommandation de contacts
-- "Avec qui Ahmed devrait-il se connecter ?"
-- Algo : amis en commun + cours en commun + même filière

-- 3.5 Chemin de compétences
-- "Quels cours dois-je suivre pour maîtriser 'Machine Learning' ?"
```

### Ex4 — Requêtes Avancées (6 pts) → `starter/ex4_advanced.cypher`

```cypher
-- 4.1 Trouver un tuteur
-- "Étudiant en Master qui maîtrise Python et a eu >14/20 en BDD"

-- 4.2 Réseau alumni dans une entreprise
-- "Qui de mon réseau (jusqu'à 3 sauts) travaille chez Sonatrach ?"

-- 4.3 Détection de ponts
-- Quels étudiants connectent des communautés isolées ?

-- 4.4 Analyse temporelle
-- Croissance du réseau : nouvelles connexions par mois

-- 4.5 Score de similarité
-- Étudiants les plus similaires à Ahmed (cours, compétences, clubs)
-- Utiliser le coefficient de Jaccard
```

---

## 🧪 Lancement

```bash
# Browser Neo4j : http://localhost:7474
# Credentials : neo4j / password123

# En ligne de commande
docker exec -it nosql_neo4j cypher-shell -u neo4j -p password123

# Python (py2neo ou neo4j-driver)
cd TP4_Graph/starter
pip install neo4j pytest
pytest tests/ -v
```

---

## 📊 Livrables

`RAPPORT.md` :
1. Schéma du graphe dessiné (capture Neo4j Browser ou diagram)
2. Résultats de l'algorithme de communautés : quelles communautés ont été détectées ?
3. Comparaison : cette requête en SQL vs Cypher (complexité + lisibilité)

---

## 🏆 Barème : 20 pts | Bonus +3 pts (PageRank sur les cours populaires)
