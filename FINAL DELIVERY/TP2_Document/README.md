# TP2 — MongoDB : Plateforme de Gestion de Dossiers Médicaux
## Use Case : HealthCare DZ — Hôpital Numérique

---

## 📖 Contexte

**HealthCare DZ** est un système d'information hospitalier. Les dossiers patients sont complexes : chaque patient a des consultations, des ordonnances, des résultats d'analyses, des antécédents. Avec un schéma relationnel, on compte 12 tables et des JOINs coûteux.

**Mission :** Modéliser et requêter ces dossiers médicaux avec MongoDB.

---

## 🎯 Objectifs Pédagogiques

- Concevoir un schéma documentaire (embedding vs referencing)
- Maîtriser les requêtes MongoDB (find, filter, projection)
- Écrire des pipelines d'agrégation avancés
- Gérer les index pour l'optimisation

---

## 📚 Rappel Théorique

### Embedding vs Referencing

```
EMBEDDING (tout dans un document)
{
  _id: ObjectId("..."),
  patient: "Ahmed Bensalem",
  consultations: [              ← Données embarquées
    { date: "2024-01-15", diagnostic: "Grippe", medicaments: [...] },
    { date: "2024-03-20", diagnostic: "Tension", medicaments: [...] }
  ]
}
→ ✅ Un seul accès DB pour tout le dossier
→ ❌ Document peut devenir énorme

REFERENCING (documents séparés)
{ _id: ObjectId("p1"), patient: "Ahmed" }
{ patient_id: ObjectId("p1"), date: "2024-01-15", diagnostic: "Grippe" }
→ ✅ Documents légers
→ ❌ Plusieurs requêtes ou $lookup
```

### Pipeline d'Agrégation

```javascript
db.patients.aggregate([
  { $match: { age: { $gte: 60 } } },        // Filtrer
  { $unwind: "$consultations" },             // Dérouler tableau
  { $group: { _id: "$consultations.diagnostic", 
               count: { $sum: 1 } } },       // Grouper
  { $sort: { count: -1 } },                  // Trier
  { $limit: 10 }                             // Limiter
])
```

---

## 🏗️ Schéma de la Base

```javascript
// Collection : patients
{
  _id: ObjectId,
  cin: "198765432100",           // N° national
  nom: "Bensalem",
  prenom: "Ahmed",
  dateNaissance: ISODate,
  sexe: "M" | "F",
  adresse: { wilaya: "Alger", commune: "Bab Ezzouar" },
  groupeSanguin: "O+",
  antecedents: ["Diabète", "HTA"],
  allergies: ["Pénicilline"],
  consultations: [               // EMBEDDED (accès fréquent)
    {
      id: UUID,
      date: ISODate,
      medecin: { nom: "Dr. Mansouri", specialite: "Cardiologie" },
      diagnostic: "Hypertension artérielle",
      tension: { systolique: 145, diastolique: 92 },
      medicaments: [
        { nom: "Amlodipine", dosage: "5mg", duree: "30 jours" }
      ],
      notes: "Surveillance tensionnelle recommandée"
    }
  ],
  analyses: [                    // REFERENCED par volume
    { analyse_id: ObjectId("...") }
  ]
}

// Collection : analyses
{
  _id: ObjectId,
  patient_id: ObjectId,
  date: ISODate,
  type: "Glycémie" | "NFS" | "Lipidogramme" | "ECG",
  resultats: { /* Flexible selon type */ },
  laboratoire: "Labo Central Alger",
  valide: Boolean
}
```

---

## 📝 Exercices

### Ex1 — Modélisation et Insertion (5 pts) → `starter/ex1_modelisation.js`

```javascript
// 1.1 Créer la collection avec validation de schéma
db.createCollection("patients", {
  validator: {
    $jsonSchema: {
      // TODO: Définir required fields, types pour les champs critiques
    }
  }
})

// 1.2 Insérer 20 patients avec données réalistes algériennes
// (Prénoms, wilayas, pathologies courantes)

// 1.3 Insérer des analyses pour ces patients
// (Collection séparée avec patient_id)
```

### Ex2 — Requêtes de Base (5 pts) → `starter/ex2_queries.js`

```javascript
// 2.1 Trouver tous les patients diabétiques de plus de 50 ans à Alger

// 2.2 Patients allergiques à la Pénicilline avec au moins 3 consultations

// 2.3 Projection : Nom, prénom, et dernière consultation seulement

// 2.4 Patients sans antécédents dont la tension systolique > 140 en dernière consultation

// 2.5 Recherche textuelle sur les diagnostics (créer index text d'abord)
```

### Ex3 — Agrégation Avancée (8 pts) → `starter/ex3_aggregation.js`

```javascript
// 3.1 Distribution des diagnostics par wilaya
// Résultat attendu : { wilaya: "Alger", diagnostic: "HTA", count: 45 }

// 3.2 Médicament le plus prescrit par spécialité médicale

// 3.3 Évolution mensuelle des consultations sur 12 mois (pour graphique)

// 3.4 Patients à risque : diabétiques + HTA + âge > 60
// Calculer leur nombre de consultations moyen

// 3.5 Rapport : Top 5 médecins par nombre de consultations
// avec taux de ré-consultation (même patient, plusieurs visites)
```

### Ex4 — Index et Optimisation (4 pts) → `starter/ex4_indexes.js`

```javascript
// 4.1 Créer les index appropriés pour les requêtes ci-dessus
// Justifier chaque index dans un commentaire

// 4.2 Utiliser explain("executionStats") pour comparer
// requête SANS index vs AVEC index
// Afficher : nReturned, totalDocsExamined, executionTimeMillis

// 4.3 Index composé pour la requête la plus complexe
// Expliquer l'ordre des champs et pourquoi

// 4.4 Index TTL pour archiver les analyses de plus de 5 ans
```

### Ex5 — $lookup et Données Référencées (3 pts) → `starter/ex5_lookup.js`

```javascript
// 5.1 Joindre patients et analyses pour récupérer
// le dossier complet d'un patient

// 5.2 Trouver les patients dont la glycémie dépasse 1.26 g/L
// (dans la collection analyses séparée)

// 5.3 Statistiques croisées : taux d'analyses anormales par wilaya
```

---

## 🧪 Lancement

```bash
# Se connecter à MongoDB
docker exec -it nosql_mongodb mongosh -u admin -p admin123

# Charger un exercice
load("/tp2/starter/ex1_modelisation.js")

# Ou utiliser Python
cd TP2_Document/starter
pip install pymongo pytest
pytest tests/ -v
```

---

## 📊 Livrables

`RAPPORT.md` avec :
1. Justification du choix embedding vs referencing pour chaque collection
2. Résultats `explain()` avant/après indexation (tableau comparatif)
3. Requête la plus complexe : expliquer le pipeline étape par étape

---

## 🏆 Barème : 25 pts | Bonus +3 pts (Transactions multi-documents)
