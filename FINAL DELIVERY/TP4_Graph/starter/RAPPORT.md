# Report TP4 — Neo4j: Social Network UniConnect DZ

**Student:** BELHERAOUI ABDERRAHMANNE
**Module:** Advanced Databases — 3rd Year Computer Science

---

## 1. Graph Schema

### Nodes and properties

| Label         | Key properties                                      | Count |
|---------------|-----------------------------------------------------|-------|
| `:Etudiant`   | id, prenom, nom, universite, filiere, annee, ville  | 50    |
| `:Cours`      | code, intitule, credits, departement                | 10    |
| `:Competence` | nom, categorie                                      | 14    |
| `:Club`       | nom, universite, domaine                            | 5     |
| `:Entreprise` | nom, secteur, ville                                 | 8     |

---

### Relationships

| Relationship    | From → To               | Key properties        |
|-----------------|-------------------------|-----------------------|
| `:CONNAIT`      | Etudiant → Etudiant     | depuis, contexte      |
| `:SUIT`         | Etudiant → Cours        | semestre, note        |
| `:MAITRISE`     | Etudiant → Competence   | niveau                |
| `:MEMBRE_DE`    | Etudiant → Club         | role                  |
| `:A_STAGE_CHEZ` | Etudiant → Entreprise   | annee, duree_mois     |
| `:REQUIERT`     | Cours → Competence      | —                     |

---

### ASCII representation of the graph

```
(Ahmed:Etudiant)──[:CONNAIT {depuis:2022}]──►(Fatima:Etudiant)
      │                                              │
      │[:SUIT {note:16.5}]                  [:SUIT {note:17.0}]
      ▼                                              ▼
(INFO401:Cours)────[:REQUIERT]────►(SQL:Competence)
      │
      └──[:REQUIERT]────►(NoSQL:Competence)

(Ahmed)──[:MEMBRE_DE {role:"Membre"}]──►(Club IA USTHB:Club)
(Ahmed)──[:MAITRISE  {niveau:"Avancé"}]──►(Python:Competence)
```

---

## 2. Community Detection Results (Louvain Algorithm)

### Detected communities

The Louvain algorithm detected **5 main communities**,
which match naturally with the students' universities.

| Community | Dominant university | Size | Example members                      |
|-----------|---------------------|------|--------------------------------------|
| C1        | USTHB               | 11   | Ahmed, Fatima, Mehdi, Lina, Amira    |
| C2        | UMBB                | 10   | Karim, Youcef, Samia, Walid, Nazim   |
| C3        | USTO                | 10   | Yasmina, Anis, Djamila, Nour, Lynda  |
| C4        | UMC                 | 10   | Rania, Tarek, Sabrina, Amine, Leila  |
| C5        | UBMA                | 9    | Sara, Djamel, Nabila, Zineb, Sihem   |

---

### Community analysis

**Observation 1 — University / community correlation**

The Louvain communities match almost perfectly with the universities.
This confirms that students connect mainly with classmates from the same university
(shared courses, same campus).

---

**Observation 2 — Bridge students**

A few students appear between two communities.
Ahmed (USTHB) is connected to Karim (UMBB) and Yasmina (USTO)
through hackathons and conferences.
These students have a high **betweenness centrality** score:
they act as bridges between separate social circles.

---

**Observation 3 — Modularity**

A modularity value close to **0.7** (typical for this type of network)
shows well-separated communities with few links between them.
This is expected for a university network where interactions stay mostly local.

---

## 3. Comparison: SQL vs Cypher

### Query: *"Friends of friends of Ahmed who are not already his friends"*

---

#### SQL version

```sql
SELECT DISTINCT u3.prenom, u3.universite
FROM utilisateurs u1
JOIN amities a1 ON u1.id = a1.user1_id
JOIN utilisateurs u2 ON a1.user2_id = u2.id
JOIN amities a2 ON u2.id = a2.user1_id
JOIN utilisateurs u3 ON a2.user2_id = u3.id
WHERE u1.prenom = 'Ahmed'
  AND u3.id <> u1.id
  AND u3.id NOT IN (
    SELECT user2_id FROM amities WHERE user1_id = u1.id
    UNION
    SELECT user1_id FROM amities WHERE user2_id = u1.id
  );
```

**SQL complexity:**

- 3 successive JOINs on the `amities` table
- 1 exclusion sub-query with `NOT IN`
- If `amities` has N rows → **O(N²)** in the worst case
- Hard to extend to 3 hops (5 JOINs required)
- Extension to N hops: **impossible** without a recursive stored procedure

---

#### Cypher version

```cypher
MATCH (ahmed:Etudiant {prenom: "Ahmed"})
      -[:CONNAIT]-(ami)-[:CONNAIT]-(suggestion:Etudiant)
WHERE NOT (ahmed)-[:CONNAIT]-(suggestion)
  AND suggestion <> ahmed
RETURN DISTINCT suggestion.prenom, suggestion.universite
```

**Cypher complexity:**

- 1 single graph traversal pattern
- No explicit JOIN needed
- Extension to 3 hops: `[:CONNAIT*3]` — one character change
- Extension to N hops: `[:CONNAIT*..N]` — still one line

---

### Comparison table

| Criterion              | SQL                                  | Cypher                            |
|------------------------|--------------------------------------|-----------------------------------|
| Readability            | Difficult (3+ nested JOINs)          | Natural (visual path pattern)     |
| Extensibility          | Full rewrite for each extra hop      | `*N` is enough                    |
| Performance            | Exponential degradation              | Native graph index O(log N)       |
| Shortest path          | Impossible without stored procedure  | `shortestPath()` built-in         |
| Cycle detection        | Very complex                         | `[:REL*]` built-in                |
| Community detection    | Impossible in pure SQL               | `gds.louvain.stream()` built-in   |

---

### Conclusion

For **highly connected data** (social networks, dependency trees,
routes, recommendation systems),
Neo4j is better than relational databases in three ways:

- **Readability:** Cypher describes the graph visually —
  the query pattern looks like the data schema.

- **Performance:** graph traversals avoid expensive JOINs.
  Each node stores direct pointers to its relationships —
  traversal is **O(log N)** where SQL would scan a table.

- **Flexibility:** adding a new relationship type does not
  change the schema of other nodes. No `ALTER TABLE`,
  no data migration.

**SQL is still better** for tabular data:
aggregations, financial reports, data without complex relationships.
