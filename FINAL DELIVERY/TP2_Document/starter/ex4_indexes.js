/**
 * TP2 - Exercice 4 : Index et Optimisation
 * Use Case : HealthCare DZ — Performance des requêtes
 */

use("medical_db");

// ─────────────────────────────────────────────────────────────────
// 4.1 : Créer les index appropriés
// ─────────────────────────────────────────────────────────────────

// ── Index 1 : recherche fréquente wilaya + antécédents ────────────
// Requête cible : trouver les patients diabétiques HTA d'Alger
// Index composé : wilaya en premier (haute cardinalité directionnelle)
// puis antécédents pour filtrer dans le Set
db.patients.createIndex(
  { "adresse.wilaya": 1, "antecedents": 1 },
  { name: "idx_wilaya_antecedents" }
);
print(" Index 1 créé : wilaya + antécédents");

// ── Index 2 : recherche par date de consultation ──────────────────
// Les consultations sont embarquées → on indexe le champ du tableau
// Utile pour les requêtes du type "consultations entre date1 et date2"
db.patients.createIndex(
  { "consultations.date": 1 },
  { name: "idx_consultations_date" }
);
print(" Index 2 créé : consultations.date");

// ── Index 3 : full-text sur diagnostics ───────────────────────────
// Permet une recherche textuelle : "Diabète", "HTA", "Asthme"...
// $text + $search côté requête
db.patients.createIndex(
  { "consultations.diagnostic": "text" },
  {
    name:               "idx_text_diagnostic",
    default_language:   "french"     // stemming en français
  }
);
print(" Index 3 créé : text sur diagnostics");

// ── Index 4 : analyses par patient_id (pour les $lookup) ──────────
// Accélère les jointures analyses → patients
db.analyses.createIndex(
  { patient_id: 1 },
  { name: "idx_analyses_patient" }
);
print("✅ Index 4 créé : analyses.patient_id");

// ── Index 5 (bonus) : CIN unique ──────────────────────────────────
// Garantit l'unicité du CIN + accélère la recherche par CIN
db.patients.createIndex(
  { cin: 1 },
  { unique: true, name: "idx_cin_unique" }
);
print(" Index 5 créé : cin unique");

// ─────────────────────────────────────────────────────────────────
// 4.2 : Comparer avec explain()
// ─────────────────────────────────────────────────────────────────
const requeteTest = {
  "adresse.wilaya": "Alger",
  "antecedents":    "Diabète type 2"
};

// ── AVANT index (on le simule en affichant les métriques clés) ────
// Note : les index sont déjà créés ci-dessus.
// Pour mesurer "avant", on peut utiliser hint({$natural:1})
// qui force un COLLSCAN sans utiliser les index.

print("\n=== AVANT index (COLLSCAN forcé via $natural) ===");
const explainAvant = db.patients
  .find(requeteTest)
  .hint({ $natural: 1 })
  .explain("executionStats");

print("  Stage             :", explainAvant.executionStats.executionStages.stage);
print("  Docs examinés     :", explainAvant.executionStats.totalDocsExamined);
print("  Docs retournés    :", explainAvant.executionStats.nReturned);
print("  Temps exec. (ms)  :", explainAvant.executionStats.executionTimeMillis);

// ── APRÈS index ────────────────────────────────────────────────────
print("\n=== APRÈS index (idx_wilaya_antecedents) ===");
const explainApres = db.patients
  .find(requeteTest)
  .hint({ "adresse.wilaya": 1, antecedents: 1 })
  .explain("executionStats");

const statsApres = explainApres.executionStats;
print("  Stage             :", statsApres.executionStages.inputStage?.stage ?? statsApres.executionStages.stage);
print("  Docs examinés     :", statsApres.totalDocsExamined);
print("  Docs retournés    :", statsApres.nReturned);
print("  Temps exec. (ms)  :", statsApres.executionTimeMillis);
print("  Index utilisé     : idx_wilaya_antecedents");

// ── Tableau comparatif ─────────────────────────────────────────────
print("\n  ┌──────────────────────┬──────────────┬──────────────┐");
print("  │ Métrique             │ Sans index   │ Avec index   │");
print("  ├──────────────────────┼──────────────┼──────────────┤");
print("  │ Stage                │ COLLSCAN     │ IXSCAN       │");
print("  │ Docs examinés        │ 20 (tous)    │ ≤ résultats  │");
print("  │ Docs retournés       │ n            │ n            │");
print("  │ Temps (ms)           │ > 0          │ ~0           │");
print("  └──────────────────────┴──────────────┴──────────────┘");

// ─────────────────────────────────────────────────────────────────
// 4.3 : Index TTL pour archivage automatique des analyses
// ─────────────────────────────────────────────────────────────────
// Les analyses de plus de 5 ans sont automatiquement supprimées.
// 5 ans = 5 * 365 * 24 * 3600 = 157 680 000 secondes

const CINQ_ANS_EN_SECONDES = 5 * 365 * 24 * 3600; // 157 680 000

db.analyses.createIndex(
  { date: 1 },
  {
    expireAfterSeconds: CINQ_ANS_EN_SECONDES,
    name: "idx_ttl_analyses_5ans"
  }
);

print("\n✅ Index TTL créé : analyses expirées après 5 ans");
print("   expireAfterSeconds =", CINQ_ANS_EN_SECONDES,
      "(", CINQ_ANS_EN_SECONDES / (365*24*3600), "ans )");

// ── Vérification de tous les index créés ──────────────────────────
print("\n=== Index actifs sur 'patients' ===");
db.patients.getIndexes().forEach(idx => {
  print("  -", idx.name, "→", JSON.stringify(idx.key));
});

print("\n=== Index actifs sur 'analyses' ===");
db.analyses.getIndexes().forEach(idx => {
  print("  -", idx.name, "→", JSON.stringify(idx.key));
});