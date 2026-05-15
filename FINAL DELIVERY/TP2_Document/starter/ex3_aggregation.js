/**
 * TP2 - Exercice 3 : Pipelines d'Agrégation
 * Use Case : Statistiques médicales HealthCare DZ
 */

use("medical_db");

// ─────────────────────────────────────────────────────────────────
// 3.1 : Distribution des diagnostics par wilaya
// ─────────────────────────────────────────────────────────────────
print("=== 3.1 : Top diagnostics par wilaya ===");

const diagParWilaya = db.patients.aggregate([
  // Étape 1 : décomposer le tableau consultations
  // → un document par consultation par patient
  { $unwind: "$consultations" },

  // Étape 2 : grouper par wilaya + diagnostic, compter les occurrences
  {
    $group: {
      _id: {
        wilaya:     "$adresse.wilaya",
        diagnostic: "$consultations.diagnostic"
      },
      count: { $sum: 1 }
    }
  },

  // Étape 3 : trier par count décroissant
  { $sort: { count: -1 } },

  // Étape 4 : reformater pour la lisibilité
  {
    $project: {
      _id:        0,
      wilaya:     "$_id.wilaya",
      diagnostic: "$_id.diagnostic",
      count:      1
    }
  },

  // Étape 5 : limiter aux 20 premiers résultats
  { $limit: 20 }
]).toArray();

printjson(diagParWilaya);

// ─────────────────────────────────────────────────────────────────
// 3.2 : Médicament le plus prescrit par spécialité
// ─────────────────────────────────────────────────────────────────
print("\n=== 3.2 : Top médicaments par spécialité ===");

const medsParSpecialite = db.patients.aggregate([
  // Étape 1 : décomposer les consultations
  { $unwind: "$consultations" },

  // Étape 2 : décomposer les médicaments de chaque consultation
  { $unwind: "$consultations.medicaments" },

  // Étape 3 : grouper par spécialité + médicament
  {
    $group: {
      _id: {
        specialite:  "$consultations.medecin.specialite",
        medicament:  "$consultations.medicaments.nom"
      },
      prescriptions: { $sum: 1 }
    }
  },

  // Étape 4 : trier par spécialité puis par count décroissant
  { $sort: { "_id.specialite": 1, prescriptions: -1 } },

  // Étape 5 : regrouper par spécialité pour garder le top 1
  {
    $group: {
      _id: "$_id.specialite",
      topMedicament: { $first: "$_id.medicament" },
      prescriptions: { $first: "$prescriptions" }
    }
  },

  // Étape 6 : trier le résultat final par spécialité
  { $sort: { _id: 1 } },

  // Étape 7 : reformater
  {
    $project: {
      _id:           0,
      specialite:    "$_id",
      topMedicament: 1,
      prescriptions: 1
    }
  }
]).toArray();

printjson(medsParSpecialite);

// ─────────────────────────────────────────────────────────────────
// 3.3 : Évolution mensuelle des consultations (12 derniers mois)
// ─────────────────────────────────────────────────────────────────
print("\n=== 3.3 : Consultations par mois (12 derniers mois) ===");

const evolutionMensuelle = db.patients.aggregate([
  // Étape 1 : décomposer les consultations
  { $unwind: "$consultations" },

  // Étape 2 : filtrer sur les 12 derniers mois
  {
    $match: {
      "consultations.date": {
        $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1))
      }
    }
  },

  // Étape 3 : grouper par année + mois
  {
    $group: {
      _id: {
        annee: { $year:  "$consultations.date" },
        mois:  { $month: "$consultations.date" }
      },
      totalConsultations: { $sum: 1 },
      patientsUniques:    { $addToSet: "$_id" }
    }
  },

  // Étape 4 : trier chronologiquement
  { $sort: { "_id.annee": 1, "_id.mois": 1 } },

  // Étape 5 : formater la date en "YYYY-MM" et compter les patients uniques
  {
    $project: {
      _id:                0,
      periode: {
        $concat: [
          { $toString: "$_id.annee" },
          "-",
          {
            $cond: {
              if:   { $lt: ["$_id.mois", 10] },
              then: { $concat: ["0", { $toString: "$_id.mois" }] },
              else: { $toString: "$_id.mois" }
            }
          }
        ]
      },
      totalConsultations: 1,
      patientsUniques:    { $size: "$patientsUniques" }
    }
  }
]).toArray();

printjson(evolutionMensuelle);

// ─────────────────────────────────────────────────────────────────
// 3.4 : Patients à risque multiple (Diabète + HTA + âge > 60)
// ─────────────────────────────────────────────────────────────────
print("\n=== 3.4 : Profil patients à risque élevé ===");

const patientsRisque = db.patients.aggregate([
  // Étape 1 : filtrer sur les antécédents à risque
  {
    $match: {
      antecedents: { $all: ["Diabète type 2", "HTA"] }
    }
  },

  // Étape 2 : calculer l'âge et le nombre de consultations
  {
    $addFields: {
      age: {
        $dateDiff: {
          startDate: "$dateNaissance",
          endDate:   "$$NOW",
          unit:      "year"
        }
      },
      nbConsultations: { $size: "$consultations" },
      nbAntecedents:   { $size: "$antecedents" }
    }
  },

  // Étape 3 : filtrer les patients de plus de 60 ans
  { $match: { age: { $gt: 60 } } },

  // Étape 4 : trier par nombre d'antécédents décroissant
  { $sort: { nbAntecedents: -1, age: -1 } },

  // Étape 5 : projeter les champs utiles
  {
    $project: {
      _id:             0,
      nom:             1,
      prenom:          1,
      age:             1,
      wilaya:          "$adresse.wilaya",
      antecedents:     1,
      nbAntecedents:   1,
      nbConsultations: 1,
      groupeSanguin:   1
    }
  }
]).toArray();

printjson(patientsRisque);

// Étape 5 bonus : statistiques globales sur ce groupe à risque
const statsRisque = db.patients.aggregate([
  {
    $match: {
      antecedents: { $all: ["Diabète type 2", "HTA"] }
    }
  },
  {
    $addFields: {
      age: {
        $dateDiff: {
          startDate: "$dateNaissance",
          endDate:   "$$NOW",
          unit:      "year"
        }
      },
      nbConsultations: { $size: "$consultations" }
    }
  },
  { $match: { age: { $gt: 60 } } },
  {
    $group: {
      _id:              null,
      totalPatients:    { $sum: 1 },
      ageMoyen:         { $avg: "$age" },
      ageMin:           { $min: "$age" },
      ageMax:           { $max: "$age" },
      moyConsultations: { $avg: "$nbConsultations" }
    }
  },
  {
    $project: {
      _id:              0,
      totalPatients:    1,
      ageMoyen:         { $round: ["$ageMoyen", 1] },
      ageMin:           1,
      ageMax:           1,
      moyConsultations: { $round: ["$moyConsultations", 1] }
    }
  }
]).toArray();

print("\n  Statistiques globales groupe à risque :");
printjson(statsRisque);

// ─────────────────────────────────────────────────────────────────
// 3.5 : Top 5 médecins & taux de ré-consultation
// ─────────────────────────────────────────────────────────────────
print("\n=== 3.5 : Top 5 médecins & taux de ré-consultation ===");

const rapportMedecins = db.patients.aggregate([
  // Étape 1 : décomposer les consultations
  { $unwind: "$consultations" },

  // Étape 2 : grouper par médecin
  // — compter les patients uniques (addToSet sur _id patient)
  // — compter le total des consultations
  {
    $group: {
      _id: {
        nom:        "$consultations.medecin.nom",
        specialite: "$consultations.medecin.specialite"
      },
      patientsUniques:      { $addToSet: "$_id" },
      totalConsultations:   { $sum: 1 }
    }
  },

  // Étape 3 : calculer le taux de ré-consultation
  // Formule : (total - nb_patients_uniques) / nb_patients_uniques * 100
  {
    $addFields: {
      nbPatientsUniques: { $size: "$patientsUniques" },
      tauxReconsultation: {
        $multiply: [
          {
            $divide: [
              { $subtract: ["$totalConsultations", { $size: "$patientsUniques" }] },
              { $size: "$patientsUniques" }
            ]
          },
          100
        ]
      }
    }
  },

  // Étape 4 : trier par total consultations décroissant
  { $sort: { totalConsultations: -1 } },

  // Étape 5 : garder les 5 premiers
  { $limit: 5 },

  // Étape 6 : reformater le résultat final
  {
    $project: {
      _id:                  0,
      medecin:              "$_id.nom",
      specialite:           "$_id.specialite",
      nbPatientsUniques:    1,
      totalConsultations:   1,
      tauxReconsultation:   { $round: ["$tauxReconsultation", 1] }
    }
  }
]).toArray();

printjson(rapportMedecins);