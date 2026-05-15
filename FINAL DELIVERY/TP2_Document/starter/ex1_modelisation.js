/**
 * TP2 - Exercice 1 : Modélisation MongoDB
 * Use Case : HealthCare DZ - Dossiers Médicaux
 */

use("medical_db");

// ─────────────────────────────────────────────────────────────────
// 1.1 : Créer la collection avec validation $jsonSchema
// ─────────────────────────────────────────────────────────────────
db.createCollection("patients", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["cin", "nom", "prenom", "dateNaissance", "sexe"],
      properties: {
        cin: {
          bsonType: "string",
          description: "CIN obligatoire — identifiant national unique"
        },
        nom: {
          bsonType: "string",
          description: "Nom de famille obligatoire"
        },
        prenom: {
          bsonType: "string",
          description: "Prénom obligatoire"
        },
        dateNaissance: {
          bsonType: "date",
          description: "Date de naissance obligatoire"
        },
        sexe: {
          bsonType: "string",
          enum: ["M", "F"],
          description: "Sexe : M ou F uniquement"
        },
        groupeSanguin: {
          bsonType: "string",
          enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
          description: "Groupe sanguin (optionnel)"
        },
        adresse: {
          bsonType: "object",
          properties: {
            wilaya:   { bsonType: "string" },
            commune:  { bsonType: "string" }
          }
        },
        antecedents: {
          bsonType: "array",
          items: { bsonType: "string" },
          description: "Liste des antécédents médicaux"
        },
        allergies: {
          bsonType: "array",
          items: { bsonType: "string" }
        },
        consultations: {
          bsonType: "array",
          description: "Consultations embarquées (pattern embedding)",
          items: {
            bsonType: "object",
            required: ["date", "medecin", "diagnostic"],
            properties: {
              date:       { bsonType: "date" },
              diagnostic: { bsonType: "string" },
              medecin: {
                bsonType: "object",
                properties: {
                  nom:        { bsonType: "string" },
                  specialite: { bsonType: "string" }
                }
              },
              medicaments: {
                bsonType: "array",
                items: {
                  bsonType: "object",
                  properties: {
                    nom:    { bsonType: "string" },
                    dosage: { bsonType: "string" },
                    duree:  { bsonType: "string" }
                  }
                }
              },
              notes: { bsonType: "string" }
            }
          }
        }
      }
    }
  }
});

print("✅ Collection 'patients' créée avec validation.");

// ─────────────────────────────────────────────────────────────────
// 1.2 : Insérer 20 patients avec données algériennes réalistes
// ─────────────────────────────────────────────────────────────────
const patients = [
  // ── Patient 1 ────────────────────────────────────────────────
  {
    cin: "198001012300",
    nom: "Bensalem",
    prenom: "Ahmed",
    dateNaissance: new Date("1980-01-01"),
    sexe: "M",
    adresse: { wilaya: "Alger", commune: "Bab Ezzouar" },
    groupeSanguin: "O+",
    antecedents: ["Diabète type 2", "HTA"],
    allergies: ["Pénicilline"],
    consultations: [
      {
        date: new Date("2023-03-10"),
        medecin: { nom: "Dr. Mansouri", specialite: "Cardiologie" },
        diagnostic: "Hypertension artérielle",
        tension: { systolique: 148, diastolique: 94 },
        medicaments: [
          { nom: "Amlodipine", dosage: "5mg", duree: "30 jours" },
          { nom: "Ramipril",   dosage: "10mg", duree: "30 jours" }
        ],
        notes: "Surveillance tensionnelle recommandée toutes les 2 semaines"
      },
      {
        date: new Date("2023-09-20"),
        medecin: { nom: "Dr. Mansouri", specialite: "Cardiologie" },
        diagnostic: "Hypertension artérielle — stabilisée",
        tension: { systolique: 132, diastolique: 84 },
        medicaments: [
          { nom: "Amlodipine", dosage: "5mg", duree: "60 jours" }
        ],
        notes: "Bonne observance du traitement"
      },
      {
        date: new Date("2024-01-15"),
        medecin: { nom: "Dr. Khelifi", specialite: "Endocrinologie" },
        diagnostic: "Diabète type 2 — déséquilibré",
        medicaments: [
          { nom: "Metformine", dosage: "1000mg", duree: "90 jours" },
          { nom: "Glibenclamide", dosage: "5mg", duree: "90 jours" }
        ],
        notes: "HbA1c à 8.5% — renforcement du régime alimentaire"
      }
    ]
  },

  // ── Patient 2 ────────────────────────────────────────────────
  {
    cin: "199205154700",
    nom: "Merabet",
    prenom: "Fatima",
    dateNaissance: new Date("1992-05-15"),
    sexe: "F",
    adresse: { wilaya: "Oran", commune: "Bir El Djir" },
    groupeSanguin: "A+",
    antecedents: ["Asthme"],
    allergies: ["Aspirine", "AINS"],
    consultations: [
      {
        date: new Date("2023-06-02"),
        medecin: { nom: "Dr. Benali", specialite: "Pneumologie" },
        diagnostic: "Asthme persistant modéré",
        medicaments: [
          { nom: "Salbutamol",   dosage: "100mcg", duree: "À la demande" },
          { nom: "Béclométasone",dosage: "250mcg", duree: "60 jours" }
        ],
        notes: "Éviter les allergènes, utilisation correcte de l'inhalateur"
      },
      {
        date: new Date("2023-11-18"),
        medecin: { nom: "Dr. Benali", specialite: "Pneumologie" },
        diagnostic: "Asthme — crise légère",
        medicaments: [
          { nom: "Prednisolone", dosage: "30mg", duree: "5 jours" },
          { nom: "Salbutamol",   dosage: "100mcg", duree: "À la demande" }
        ],
        notes: "Crise déclenchée par exposition à la poussière"
      },
      {
        date: new Date("2024-03-05"),
        medecin: { nom: "Dr. Benali", specialite: "Pneumologie" },
        diagnostic: "Asthme — bilan annuel",
        medicaments: [
          { nom: "Béclométasone", dosage: "250mcg", duree: "90 jours" }
        ],
        notes: "EFR dans les limites normales"
      }
    ]
  },

  // ── Patient 3 ────────────────────────────────────────────────
  {
    cin: "197511203100",
    nom: "Hadjadj",
    prenom: "Karim",
    dateNaissance: new Date("1975-11-20"),
    sexe: "M",
    adresse: { wilaya: "Constantine", commune: "El Khroub" },
    groupeSanguin: "B+",
    antecedents: ["Diabète type 2", "HTA", "Insuffisance rénale chronique"],
    allergies: [],
    consultations: [
      {
        date: new Date("2023-02-14"),
        medecin: { nom: "Dr. Rezig", specialite: "Néphrologie" },
        diagnostic: "Insuffisance rénale chronique stade 3",
        medicaments: [
          { nom: "Furosémide", dosage: "40mg", duree: "30 jours" },
          { nom: "Érythropoïétine", dosage: "4000UI", duree: "30 jours" }
        ],
        notes: "DFG = 38 ml/min — régime hyposodé strict"
      },
      {
        date: new Date("2023-08-10"),
        medecin: { nom: "Dr. Rezig", specialite: "Néphrologie" },
        diagnostic: "Insuffisance rénale chronique — suivi",
        medicaments: [
          { nom: "Furosémide", dosage: "40mg", duree: "60 jours" }
        ],
        notes: "DFG stable à 36 ml/min"
      },
      {
        date: new Date("2024-02-20"),
        medecin: { nom: "Dr. Mansouri", specialite: "Cardiologie" },
        diagnostic: "HTA avec retentissement rénal",
        medicaments: [
          { nom: "Amlodipine", dosage: "10mg", duree: "30 jours" }
        ],
        notes: "Coordination avec néphrologue"
      }
    ]
  },

  // ── Patient 4 ────────────────────────────────────────────────
  {
    cin: "200010085000",
    nom: "Tlemcani",
    prenom: "Sara",
    dateNaissance: new Date("2000-10-08"),
    sexe: "F",
    adresse: { wilaya: "Annaba", commune: "El Bouni" },
    groupeSanguin: "AB-",
    antecedents: ["Migraine"],
    allergies: ["Codéine"],
    consultations: [
      {
        date: new Date("2023-04-22"),
        medecin: { nom: "Dr. Amrani", specialite: "Neurologie" },
        diagnostic: "Migraine sans aura",
        medicaments: [
          { nom: "Sumatriptan", dosage: "50mg", duree: "À la demande" },
          { nom: "Propranolol", dosage: "40mg", duree: "60 jours" }
        ],
        notes: "Journal des crises recommandé"
      },
      {
        date: new Date("2023-10-30"),
        medecin: { nom: "Dr. Amrani", specialite: "Neurologie" },
        diagnostic: "Migraine — amélioration sous traitement",
        medicaments: [
          { nom: "Propranolol", dosage: "40mg", duree: "90 jours" }
        ],
        notes: "Fréquence des crises réduite de 8 à 3 par mois"
      },
      {
        date: new Date("2024-04-10"),
        medecin: { nom: "Dr. Amrani", specialite: "Neurologie" },
        diagnostic: "Migraine — bilan de suivi",
        medicaments: [
          { nom: "Propranolol", dosage: "40mg", duree: "90 jours" }
        ],
        notes: "Bonne tolérance au traitement"
      }
    ]
  },

  // ── Patient 5 ────────────────────────────────────────────────
  {
    cin: "196803276300",
    nom: "Boukhelifa",
    prenom: "Moussa",
    dateNaissance: new Date("1968-03-27"),
    sexe: "M",
    adresse: { wilaya: "Blida", commune: "Boufarik" },
    groupeSanguin: "O-",
    antecedents: ["Diabète type 2", "HTA", "Coronaropathie"],
    allergies: ["Sulfamides"],
    consultations: [
      {
        date: new Date("2023-01-08"),
        medecin: { nom: "Dr. Mansouri", specialite: "Cardiologie" },
        diagnostic: "Coronaropathie stable — angor d'effort",
        medicaments: [
          { nom: "Aspirine",   dosage: "100mg", duree: "Indéfini" },
          { nom: "Bisoprolol", dosage: "5mg",   duree: "30 jours" },
          { nom: "Atorvastatine", dosage: "40mg", duree: "30 jours" }
        ],
        notes: "ECG de repos normal, test d'effort prévu"
      },
      {
        date: new Date("2023-07-14"),
        medecin: { nom: "Dr. Mansouri", specialite: "Cardiologie" },
        diagnostic: "Coronaropathie — suivi post-angioplastie",
        medicaments: [
          { nom: "Clopidogrel", dosage: "75mg", duree: "12 mois" },
          { nom: "Aspirine",    dosage: "100mg", duree: "Indéfini" }
        ],
        notes: "Stent posé avec succès, double antiagrégation"
      },
      {
        date: new Date("2024-01-05"),
        medecin: { nom: "Dr. Khelifi", specialite: "Endocrinologie" },
        diagnostic: "Diabète type 2 — bilan cardiométabolique",
        medicaments: [
          { nom: "Metformine",  dosage: "500mg",  duree: "90 jours" },
          { nom: "Empagliflozine", dosage: "10mg", duree: "90 jours" }
        ],
        notes: "Empagliflozine pour bénéfice cardioprotecteur"
      }
    ]
  },

  // ── Patient 6 ────────────────────────────────────────────────
  {
    cin: "198807193600",
    nom: "Zerrouki",
    prenom: "Amina",
    dateNaissance: new Date("1988-07-19"),
    sexe: "F",
    adresse: { wilaya: "Sétif", commune: "Aïn Oulmene" },
    groupeSanguin: "A-",
    antecedents: ["Hypothyroïdie"],
    allergies: [],
    consultations: [
      {
        date: new Date("2023-05-11"),
        medecin: { nom: "Dr. Khelifi", specialite: "Endocrinologie" },
        diagnostic: "Hypothyroïdie — substitution",
        medicaments: [
          { nom: "Lévothyroxine", dosage: "75mcg", duree: "90 jours" }
        ],
        notes: "TSH = 8.2 mUI/L — augmentation de dose"
      },
      {
        date: new Date("2023-11-25"),
        medecin: { nom: "Dr. Khelifi", specialite: "Endocrinologie" },
        diagnostic: "Hypothyroïdie — équilibrée",
        medicaments: [
          { nom: "Lévothyroxine", dosage: "100mcg", duree: "90 jours" }
        ],
        notes: "TSH = 1.8 mUI/L — bonne réponse au traitement"
      },
      {
        date: new Date("2024-05-03"),
        medecin: { nom: "Dr. Khelifi", specialite: "Endocrinologie" },
        diagnostic: "Hypothyroïdie — bilan annuel",
        medicaments: [
          { nom: "Lévothyroxine", dosage: "100mcg", duree: "90 jours" }
        ],
        notes: "Stable, continuer même dose"
      }
    ]
  },

  // ── Patient 7 ────────────────────────────────────────────────
  {
    cin: "196212054100",
    nom: "Chettih",
    prenom: "Abdelkader",
    dateNaissance: new Date("1962-12-05"),
    sexe: "M",
    adresse: { wilaya: "Alger", commune: "Kouba" },
    groupeSanguin: "B-",
    antecedents: ["Diabète type 2", "HTA", "Dyslipidémie"],
    allergies: ["Pénicilline"],
    consultations: [
      {
        date: new Date("2023-02-28"),
        medecin: { nom: "Dr. Mansouri", specialite: "Cardiologie" },
        diagnostic: "Dyslipidémie — LDL élevé",
        medicaments: [
          { nom: "Rosuvastatine", dosage: "20mg", duree: "90 jours" }
        ],
        notes: "LDL = 1.82 g/L — objectif < 1 g/L"
      },
      {
        date: new Date("2023-09-12"),
        medecin: { nom: "Dr. Mansouri", specialite: "Cardiologie" },
        diagnostic: "HTA + Dyslipidémie — suivi",
        medicaments: [
          { nom: "Rosuvastatine", dosage: "40mg", duree: "90 jours" },
          { nom: "Amlodipine",    dosage: "10mg", duree: "90 jours" }
        ],
        notes: "Augmentation dose statine"
      },
      {
        date: new Date("2024-03-18"),
        medecin: { nom: "Dr. Khelifi", specialite: "Endocrinologie" },
        diagnostic: "Diabète type 2 — HbA1c à 7.8%",
        medicaments: [
          { nom: "Metformine",    dosage: "850mg", duree: "90 jours" },
          { nom: "Sitagliptine",  dosage: "100mg", duree: "90 jours" }
        ],
        notes: "Objectif HbA1c < 7%"
      }
    ]
  },

  // ── Patient 8 ────────────────────────────────────────────────
  {
    cin: "199509284200",
    nom: "Hadj Amar",
    prenom: "Rania",
    dateNaissance: new Date("1995-09-28"),
    sexe: "F",
    adresse: { wilaya: "Tizi Ouzou", commune: "Azazga" },
    groupeSanguin: "O+",
    antecedents: ["Anémie ferriprive"],
    allergies: [],
    consultations: [
      {
        date: new Date("2023-03-15"),
        medecin: { nom: "Dr. Benali", specialite: "Médecine générale" },
        diagnostic: "Anémie ferriprive modérée",
        medicaments: [
          { nom: "Fer ferreux", dosage: "80mg", duree: "60 jours" }
        ],
        notes: "Hb = 8.5 g/dL — régime riche en fer conseillé"
      },
      {
        date: new Date("2023-06-20"),
        medecin: { nom: "Dr. Benali", specialite: "Médecine générale" },
        diagnostic: "Anémie ferriprive — amélioration",
        medicaments: [
          { nom: "Fer ferreux", dosage: "80mg", duree: "30 jours" }
        ],
        notes: "Hb = 11.2 g/dL — poursuite du traitement"
      },
      {
        date: new Date("2024-01-09"),
        medecin: { nom: "Dr. Benali", specialite: "Médecine générale" },
        diagnostic: "Bilan sanguin annuel — normal",
        medicaments: [],
        notes: "Hb = 12.8 g/dL — arrêt du fer"
      }
    ]
  },

  // ── Patient 9 ────────────────────────────────────────────────
  {
    cin: "197706112500",
    nom: "Rahmani",
    prenom: "Youcef",
    dateNaissance: new Date("1977-06-11"),
    sexe: "M",
    adresse: { wilaya: "Oran", commune: "Oran Centre" },
    groupeSanguin: "AB+",
    antecedents: ["Ulcère gastrique", "Reflux gastro-œsophagien"],
    allergies: ["AINS"],
    consultations: [
      {
        date: new Date("2023-04-05"),
        medecin: { nom: "Dr. Ferhat", specialite: "Gastro-entérologie" },
        diagnostic: "Ulcère gastrique à H. pylori",
        medicaments: [
          { nom: "Oméprazole",    dosage: "20mg",  duree: "14 jours" },
          { nom: "Amoxicilline",  dosage: "1g",    duree: "14 jours" },
          { nom: "Clarithromycine",dosage: "500mg", duree: "14 jours" }
        ],
        notes: "Triple thérapie éradication H. pylori"
      },
      {
        date: new Date("2023-10-18"),
        medecin: { nom: "Dr. Ferhat", specialite: "Gastro-entérologie" },
        diagnostic: "Reflux gastro-œsophagien chronique",
        medicaments: [
          { nom: "Oméprazole", dosage: "20mg", duree: "60 jours" }
        ],
        notes: "FOGD : cicatrisation complète de l'ulcère"
      },
      {
        date: new Date("2024-04-22"),
        medecin: { nom: "Dr. Ferhat", specialite: "Gastro-entérologie" },
        diagnostic: "RGO — bilan annuel",
        medicaments: [
          { nom: "Pantoprazole", dosage: "40mg", duree: "30 jours" }
        ],
        notes: "Règles hygiéno-diététiques rappelées"
      }
    ]
  },

  // ── Patient 10 ────────────────────────────────────────────────
  {
    cin: "198403167800",
    nom: "Meziane",
    prenom: "Nadia",
    dateNaissance: new Date("1984-03-16"),
    sexe: "F",
    adresse: { wilaya: "Blida", commune: "Meftah" },
    groupeSanguin: "A+",
    antecedents: ["Lupus érythémateux systémique"],
    allergies: ["Sulfamides"],
    consultations: [
      {
        date: new Date("2023-01-25"),
        medecin: { nom: "Dr. Amrani", specialite: "Rhumatologie" },
        diagnostic: "Lupus érythémateux systémique — poussée",
        medicaments: [
          { nom: "Hydroxychloroquine", dosage: "400mg", duree: "Indéfini" },
          { nom: "Prednisolone",       dosage: "40mg",  duree: "30 jours" }
        ],
        notes: "Complément C3-C4 bas, anti-ADN natif positif"
      },
      {
        date: new Date("2023-07-30"),
        medecin: { nom: "Dr. Amrani", specialite: "Rhumatologie" },
        diagnostic: "Lupus — rémission partielle",
        medicaments: [
          { nom: "Hydroxychloroquine", dosage: "400mg", duree: "Indéfini" },
          { nom: "Prednisolone",       dosage: "10mg",  duree: "60 jours" }
        ],
        notes: "Décroissance progressive des corticoïdes"
      },
      {
        date: new Date("2024-02-14"),
        medecin: { nom: "Dr. Amrani", specialite: "Rhumatologie" },
        diagnostic: "Lupus — bilan de rémission",
        medicaments: [
          { nom: "Hydroxychloroquine", dosage: "200mg", duree: "Indéfini" }
        ],
        notes: "Rémission stable, réduction dose maintenance"
      }
    ]
  },

  // ── Patient 11 ────────────────────────────────────────────────
  {
    cin: "196506298900",
    nom: "Bouchama",
    prenom: "Mohamed",
    dateNaissance: new Date("1965-06-29"),
    sexe: "M",
    adresse: { wilaya: "Constantine", commune: "Hamma Bouziane" },
    groupeSanguin: "O+",
    antecedents: ["Diabète type 2", "HTA", "AVC ischémique"],
    allergies: [],
    consultations: [
      {
        date: new Date("2023-03-08"),
        medecin: { nom: "Dr. Amrani", specialite: "Neurologie" },
        diagnostic: "Suivi post-AVC ischémique — 6 mois",
        medicaments: [
          { nom: "Aspirine",       dosage: "100mg", duree: "Indéfini" },
          { nom: "Clopidogrel",    dosage: "75mg",  duree: "12 mois" },
          { nom: "Atorvastatine",  dosage: "80mg",  duree: "Indéfini" }
        ],
        notes: "Légère hémiparésie droite résiduelle — kinésithérapie"
      },
      {
        date: new Date("2023-09-15"),
        medecin: { nom: "Dr. Amrani", specialite: "Neurologie" },
        diagnostic: "Post-AVC — récupération neurologique",
        medicaments: [
          { nom: "Aspirine",      dosage: "100mg", duree: "Indéfini" },
          { nom: "Atorvastatine", dosage: "80mg",  duree: "Indéfini" }
        ],
        notes: "Bonne récupération motrice"
      },
      {
        date: new Date("2024-03-20"),
        medecin: { nom: "Dr. Mansouri", specialite: "Cardiologie" },
        diagnostic: "HTA — prévention secondaire post-AVC",
        medicaments: [
          { nom: "Périndopril", dosage: "5mg", duree: "90 jours" }
        ],
        notes: "TA cible < 130/80 mmHg"
      }
    ]
  },

  // ── Patient 12 ────────────────────────────────────────────────
  {
    cin: "199112043300",
    nom: "Kaci",
    prenom: "Lynda",
    dateNaissance: new Date("1991-12-04"),
    sexe: "F",
    adresse: { wilaya: "Béjaïa", commune: "Tichy" },
    groupeSanguin: "B+",
    antecedents: ["Épilepsie"],
    allergies: ["Carbamazépine"],
    consultations: [
      {
        date: new Date("2023-02-20"),
        medecin: { nom: "Dr. Amrani", specialite: "Neurologie" },
        diagnostic: "Épilepsie focale — contrôle insuffisant",
        medicaments: [
          { nom: "Lévétiracétam", dosage: "500mg", duree: "90 jours" },
          { nom: "Acide valproïque", dosage: "500mg", duree: "90 jours" }
        ],
        notes: "2 crises/mois malgré traitement — ajustement"
      },
      {
        date: new Date("2023-08-14"),
        medecin: { nom: "Dr. Amrani", specialite: "Neurologie" },
        diagnostic: "Épilepsie — amélioration",
        medicaments: [
          { nom: "Lévétiracétam", dosage: "1000mg", duree: "90 jours" }
        ],
        notes: "0 crise depuis 3 mois"
      },
      {
        date: new Date("2024-02-28"),
        medecin: { nom: "Dr. Amrani", specialite: "Neurologie" },
        diagnostic: "Épilepsie — bilan annuel",
        medicaments: [
          { nom: "Lévétiracétam", dosage: "1000mg", duree: "90 jours" }
        ],
        notes: "EEG normal — maintien du traitement"
      }
    ]
  },

  // ── Patient 13 ────────────────────────────────────────────────
  {
    cin: "197209186600",
    nom: "Saadi",
    prenom: "Tarek",
    dateNaissance: new Date("1972-09-18"),
    sexe: "M",
    adresse: { wilaya: "Alger", commune: "Cheraga" },
    groupeSanguin: "A+",
    antecedents: ["Goutte", "HTA"],
    allergies: [],
    consultations: [
      {
        date: new Date("2023-05-25"),
        medecin: { nom: "Dr. Amrani", specialite: "Rhumatologie" },
        diagnostic: "Crise de goutte aiguë — métatarso-phalangienne",
        medicaments: [
          { nom: "Colchicine",    dosage: "1mg",   duree: "10 jours" },
          { nom: "Allopurinol",   dosage: "300mg", duree: "Indéfini" }
        ],
        notes: "Uricémie = 520 µmol/L — régime pauvre en purines"
      },
      {
        date: new Date("2023-12-07"),
        medecin: { nom: "Dr. Amrani", specialite: "Rhumatologie" },
        diagnostic: "Goutte — bilan uricémie",
        medicaments: [
          { nom: "Allopurinol", dosage: "300mg", duree: "90 jours" }
        ],
        notes: "Uricémie = 340 µmol/L — objectif atteint"
      },
      {
        date: new Date("2024-04-15"),
        medecin: { nom: "Dr. Mansouri", specialite: "Cardiologie" },
        diagnostic: "HTA — contrôle tensionnel",
        medicaments: [
          { nom: "Losartan", dosage: "50mg", duree: "90 jours" }
        ],
        notes: "Losartan : effet uricosurique bénéfique dans ce contexte"
      }
    ]
  },

  // ── Patient 14 ────────────────────────────────────────────────
  {
    cin: "200203226400",
    nom: "Hamdi",
    prenom: "Imane",
    dateNaissance: new Date("2002-03-22"),
    sexe: "F",
    adresse: { wilaya: "Oran", commune: "Es Sénia" },
    groupeSanguin: "O+",
    antecedents: ["Acné sévère"],
    allergies: [],
    consultations: [
      {
        date: new Date("2023-06-10"),
        medecin: { nom: "Dr. Benali", specialite: "Dermatologie" },
        diagnostic: "Acné inflammatoire sévère",
        medicaments: [
          { nom: "Doxycycline",  dosage: "100mg", duree: "90 jours" },
          { nom: "Trétinoïne",   dosage: "0.025%",duree: "Application locale" }
        ],
        notes: "Photoprotection obligatoire"
      },
      {
        date: new Date("2023-12-18"),
        medecin: { nom: "Dr. Benali", specialite: "Dermatologie" },
        diagnostic: "Acné — amélioration modérée",
        medicaments: [
          { nom: "Isotrétinoïne", dosage: "20mg", duree: "120 jours" }
        ],
        notes: "Passage à l'isotrétinoïne orale — bilan hépatique + lipides"
      },
      {
        date: new Date("2024-05-08"),
        medecin: { nom: "Dr. Benali", specialite: "Dermatologie" },
        diagnostic: "Acné — rémission sous isotrétinoïne",
        medicaments: [
          { nom: "Isotrétinoïne", dosage: "10mg", duree: "60 jours" }
        ],
        notes: "Bilan hépatique normal, poursuite à dose réduite"
      }
    ]
  },

  // ── Patient 15 ────────────────────────────────────────────────
  {
    cin: "196901087100",
    nom: "Belkacem",
    prenom: "Rachid",
    dateNaissance: new Date("1969-01-08"),
    sexe: "M",
    adresse: { wilaya: "Annaba", commune: "Sidi Amar" },
    groupeSanguin: "B+",
    antecedents: ["Diabète type 2", "HTA", "Rétinopathie diabétique"],
    allergies: ["Pénicilline"],
    consultations: [
      {
        date: new Date("2023-01-30"),
        medecin: { nom: "Dr. Khelifi", specialite: "Endocrinologie" },
        diagnostic: "Diabète type 2 — déséquilibré + rétinopathie",
        medicaments: [
          { nom: "Insuline Glargine", dosage: "20UI", duree: "30 jours" },
          { nom: "Metformine",        dosage: "500mg", duree: "30 jours" }
        ],
        notes: "Passage à l'insuline — HbA1c = 9.8%"
      },
      {
        date: new Date("2023-07-22"),
        medecin: { nom: "Dr. Benali", specialite: "Ophtalmologie" },
        diagnostic: "Rétinopathie diabétique non proliférante modérée",
        medicaments: [],
        notes: "Photocoagulation laser envisagée si progression"
      },
      {
        date: new Date("2024-01-28"),
        medecin: { nom: "Dr. Khelifi", specialite: "Endocrinologie" },
        diagnostic: "Diabète type 2 — amélioration sous insuline",
        medicaments: [
          { nom: "Insuline Glargine", dosage: "24UI", duree: "30 jours" }
        ],
        notes: "HbA1c = 7.4% — objectif quasi atteint"
      }
    ]
  },

  // ── Patient 16 ────────────────────────────────────────────────
  {
    cin: "198608249800",
    nom: "Ouali",
    prenom: "Sabrina",
    dateNaissance: new Date("1986-08-24"),
    sexe: "F",
    adresse: { wilaya: "Sétif", commune: "Sétif Centre" },
    groupeSanguin: "A-",
    antecedents: ["Dépression", "Anxiété généralisée"],
    allergies: [],
    consultations: [
      {
        date: new Date("2023-04-12"),
        medecin: { nom: "Dr. Ferhat", specialite: "Psychiatrie" },
        diagnostic: "Épisode dépressif majeur",
        medicaments: [
          { nom: "Sertraline",  dosage: "50mg",  duree: "90 jours" },
          { nom: "Alprazolam",  dosage: "0.25mg",duree: "30 jours" }
        ],
        notes: "Psychothérapie cognitivo-comportementale recommandée"
      },
      {
        date: new Date("2023-10-05"),
        medecin: { nom: "Dr. Ferhat", specialite: "Psychiatrie" },
        diagnostic: "Dépression — réponse partielle",
        medicaments: [
          { nom: "Sertraline", dosage: "100mg", duree: "90 jours" }
        ],
        notes: "Augmentation de la dose de sertraline"
      },
      {
        date: new Date("2024-04-18"),
        medecin: { nom: "Dr. Ferhat", specialite: "Psychiatrie" },
        diagnostic: "Dépression — rémission",
        medicaments: [
          { nom: "Sertraline", dosage: "50mg", duree: "90 jours" }
        ],
        notes: "Décroissance progressive prévue dans 6 mois"
      }
    ]
  },

  // ── Patient 17 ────────────────────────────────────────────────
  {
    cin: "197404136700",
    nom: "Boudjelal",
    prenom: "Hocine",
    dateNaissance: new Date("1974-04-13"),
    sexe: "M",
    adresse: { wilaya: "Tizi Ouzou", commune: "Draa Ben Khedda" },
    groupeSanguin: "O-",
    antecedents: ["Polyarthrite rhumatoïde"],
    allergies: ["Méthotrexate"],
    consultations: [
      {
        date: new Date("2023-02-08"),
        medecin: { nom: "Dr. Amrani", specialite: "Rhumatologie" },
        diagnostic: "Polyarthrite rhumatoïde — poussée inflammatoire",
        medicaments: [
          { nom: "Leflunomide",  dosage: "20mg",  duree: "90 jours" },
          { nom: "Prednisolone", dosage: "20mg",  duree: "15 jours" }
        ],
        notes: "Allergie Méthotrexate confirmée — switch vers Leflunomide"
      },
      {
        date: new Date("2023-09-22"),
        medecin: { nom: "Dr. Amrani", specialite: "Rhumatologie" },
        diagnostic: "Polyarthrite rhumatoïde — réponse partielle",
        medicaments: [
          { nom: "Leflunomide", dosage: "20mg", duree: "90 jours" },
          { nom: "Adalimumab",  dosage: "40mg", duree: "Biologique — 1/2 sem" }
        ],
        notes: "Adjonction biologique — DAS28 = 4.8"
      },
      {
        date: new Date("2024-03-30"),
        medecin: { nom: "Dr. Amrani", specialite: "Rhumatologie" },
        diagnostic: "Polyarthrite rhumatoïde — rémission basse activité",
        medicaments: [
          { nom: "Adalimumab", dosage: "40mg", duree: "Biologique — 1/2 sem" }
        ],
        notes: "DAS28 = 2.4 — objectif atteint"
      }
    ]
  },

  // ── Patient 18 ────────────────────────────────────────────────
  {
    cin: "199308026000",
    nom: "Mazouz",
    prenom: "Chafia",
    dateNaissance: new Date("1993-08-02"),
    sexe: "F",
    adresse: { wilaya: "Alger", commune: "Ain Taya" },
    groupeSanguin: "AB+",
    antecedents: ["Syndrome des ovaires polykystiques"],
    allergies: [],
    consultations: [
      {
        date: new Date("2023-03-28"),
        medecin: { nom: "Dr. Khelifi", specialite: "Endocrinologie" },
        diagnostic: "SOPK — hyperandrogénie + insulino-résistance",
        medicaments: [
          { nom: "Metformine",    dosage: "850mg", duree: "90 jours" },
          { nom: "Spironolactone",dosage: "50mg",  duree: "90 jours" }
        ],
        notes: "Régime alimentaire hypoglucidique — activité physique"
      },
      {
        date: new Date("2023-10-14"),
        medecin: { nom: "Dr. Khelifi", specialite: "Endocrinologie" },
        diagnostic: "SOPK — amélioration cycles menstruels",
        medicaments: [
          { nom: "Metformine", dosage: "1000mg", duree: "90 jours" }
        ],
        notes: "Cycles régularisés — arrêt Spironolactone"
      },
      {
        date: new Date("2024-04-25"),
        medecin: { nom: "Dr. Khelifi", specialite: "Endocrinologie" },
        diagnostic: "SOPK — bilan annuel",
        medicaments: [
          { nom: "Metformine", dosage: "500mg", duree: "90 jours" }
        ],
        notes: "Réduction progressive, résultats satisfaisants"
      }
    ]
  },

  // ── Patient 19 ────────────────────────────────────────────────
  {
    cin: "196007318500",
    nom: "Ferdjani",
    prenom: "Larbi",
    dateNaissance: new Date("1960-07-31"),
    sexe: "M",
    adresse: { wilaya: "Oran", commune: "Gdyel" },
    groupeSanguin: "A+",
    antecedents: ["Diabète type 2", "HTA", "Insuffisance cardiaque"],
    allergies: [],
    consultations: [
      {
        date: new Date("2023-01-18"),
        medecin: { nom: "Dr. Mansouri", specialite: "Cardiologie" },
        diagnostic: "Insuffisance cardiaque à FEVG réduite (FEVG 35%)",
        medicaments: [
          { nom: "Bisoprolol",   dosage: "5mg",  duree: "30 jours" },
          { nom: "Sacubitril/Valsartan", dosage: "49/51mg", duree: "30 jours" },
          { nom: "Éplérénone",   dosage: "25mg", duree: "30 jours" },
          { nom: "Dapagliflozine",dosage: "10mg",duree: "30 jours" }
        ],
        notes: "Quadrithérapie de l'IC — bilan biologique mensuel"
      },
      {
        date: new Date("2023-07-26"),
        medecin: { nom: "Dr. Mansouri", specialite: "Cardiologie" },
        diagnostic: "IC — amélioration FEVG (45%)",
        medicaments: [
          { nom: "Bisoprolol",    dosage: "10mg", duree: "30 jours" },
          { nom: "Sacubitril/Valsartan", dosage: "97/103mg", duree: "30 jours" }
        ],
        notes: "Optimisation des doses — bonne tolérance"
      },
      {
        date: new Date("2024-02-05"),
        medecin: { nom: "Dr. Mansouri", specialite: "Cardiologie" },
        diagnostic: "IC — stabilisation, FEVG 48%",
        medicaments: [
          { nom: "Bisoprolol",    dosage: "10mg", duree: "90 jours" },
          { nom: "Dapagliflozine",dosage: "10mg", duree: "90 jours" }
        ],
        notes: "Maintien traitement optimisé"
      }
    ]
  },

  // ── Patient 20 ────────────────────────────────────────────────
  {
    cin: "198110177200",
    nom: "Ziani",
    prenom: "Meriem",
    dateNaissance: new Date("1981-10-17"),
    sexe: "F",
    adresse: { wilaya: "Blida", commune: "Larbaâ" },
    groupeSanguin: "O+",
    antecedents: ["Hépatite C chronique", "Diabète type 2"],
    allergies: ["Interféron"],
    consultations: [
      {
        date: new Date("2023-02-03"),
        medecin: { nom: "Dr. Ferhat", specialite: "Gastro-entérologie" },
        diagnostic: "Hépatite C chronique — génotype 1b",
        medicaments: [
          { nom: "Sofosbuvir/Daclatasvir", dosage: "400/60mg", duree: "90 jours" }
        ],
        notes: "Traitement antiviral direct — charge virale 2.4 M UI/mL"
      },
      {
        date: new Date("2023-06-15"),
        medecin: { nom: "Dr. Ferhat", specialite: "Gastro-entérologie" },
        diagnostic: "Hépatite C — RVS12 (guérison virale)",
        medicaments: [],
        notes: "ARN VHC indétectable — guérison confirmée"
      },
      {
        date: new Date("2024-03-10"),
        medecin: { nom: "Dr. Khelifi", specialite: "Endocrinologie" },
        diagnostic: "Diabète type 2 post-VHC — bilan",
        medicaments: [
          { nom: "Metformine", dosage: "500mg", duree: "90 jours" }
        ],
        notes: "Amélioration glycémique après guérison VHC"
      }
    ]
  }
];

db.patients.insertMany(patients);
print("✅ " + db.patients.countDocuments() + " patients insérés.");

// ─────────────────────────────────────────────────────────────────
// 1.3 : Collection analyses (référencée par patient_id)
// ─────────────────────────────────────────────────────────────────
// On récupère les _id des patients pour les références
const p = {};
db.patients.find({}, { cin: 1 }).forEach(pt => { p[pt.cin] = pt._id; });

const analyses = [
  // ── Patient 1 : Bensalem Ahmed ───────────────────────────────
  {
    patient_id: p["198001012300"],
    type: "Glycémie à jeun",
    date: new Date("2023-03-08"),
    resultat: { valeur: 1.85, unite: "g/L", referenceMin: 0.7, referenceMax: 1.1 },
    statut: "Anormal",
    laboratoire: "Labo Central Alger"
  },
  {
    patient_id: p["198001012300"],
    type: "HbA1c",
    date: new Date("2023-03-08"),
    resultat: { valeur: 8.5, unite: "%", referenceMin: 0, referenceMax: 6.5 },
    statut: "Anormal",
    laboratoire: "Labo Central Alger"
  },
  {
    patient_id: p["198001012300"],
    type: "NFS",
    date: new Date("2024-01-14"),
    resultat: {
      hemoglobine:  { valeur: 13.8, unite: "g/dL" },
      leucocytes:   { valeur: 7200, unite: "/mm³" },
      plaquettes:   { valeur: 215000, unite: "/mm³" }
    },
    statut: "Normal",
    laboratoire: "Labo Bab Ezzouar"
  },

  // ── Patient 2 : Merabet Fatima ────────────────────────────────
  {
    patient_id: p["199205154700"],
    type: "EFR",
    date: new Date("2023-05-30"),
    resultat: { VEMS: 72, CVF: 85, rapport: 0.85, unite: "%" },
    statut: "Modérément altéré",
    laboratoire: "Pneumologie CHU Oran"
  },
  {
    patient_id: p["199205154700"],
    type: "NFS",
    date: new Date("2023-11-15"),
    resultat: {
      hemoglobine: { valeur: 12.5, unite: "g/dL" },
      eosinophiles: { valeur: 650, unite: "/mm³", note: "Élevé" }
    },
    statut: "Anormal",
    laboratoire: "Labo Bir El Djir"
  },

  // ── Patient 3 : Hadjadj Karim ─────────────────────────────────
  {
    patient_id: p["197511203100"],
    type: "Créatinine + DFG",
    date: new Date("2023-02-12"),
    resultat: { creatinine: { valeur: 185, unite: "µmol/L" }, DFG: 38, unite: "ml/min" },
    statut: "Anormal — IRC stade 3",
    laboratoire: "Labo CHU Constantine"
  },
  {
    patient_id: p["197511203100"],
    type: "Lipidogramme",
    date: new Date("2023-08-08"),
    resultat: {
      LDL: { valeur: 1.45, unite: "g/L" },
      HDL: { valeur: 0.38, unite: "g/L" },
      triglycerides: { valeur: 2.10, unite: "g/L" }
    },
    statut: "Anormal",
    laboratoire: "Labo CHU Constantine"
  },

  // ── Patient 5 : Boukhelifa Moussa ─────────────────────────────
  {
    patient_id: p["196803276300"],
    type: "ECG",
    date: new Date("2023-01-06"),
    resultat: { rythme: "Sinusal", FC: 68, anomalies: "Sous-décalage ST V4-V5" },
    statut: "Anormal",
    laboratoire: "Cardio CHU Blida"
  },
  {
    patient_id: p["196803276300"],
    type: "Lipidogramme",
    date: new Date("2023-01-06"),
    resultat: {
      LDL: { valeur: 1.92, unite: "g/L" },
      HDL: { valeur: 0.35, unite: "g/L" },
      triglycerides: { valeur: 2.45, unite: "g/L" }
    },
    statut: "Anormal",
    laboratoire: "Cardio CHU Blida"
  },

  // ── Patient 7 : Chettih Abdelkader ────────────────────────────
  {
    patient_id: p["196212054100"],
    type: "Lipidogramme",
    date: new Date("2023-02-26"),
    resultat: {
      LDL: { valeur: 1.82, unite: "g/L" },
      HDL: { valeur: 0.40, unite: "g/L" },
      triglycerides: { valeur: 1.85, unite: "g/L" }
    },
    statut: "Anormal",
    laboratoire: "Labo Kouba"
  },
  {
    patient_id: p["196212054100"],
    type: "Glycémie à jeun",
    date: new Date("2024-03-16"),
    resultat: { valeur: 1.62, unite: "g/L" },
    statut: "Anormal",
    laboratoire: "Labo Kouba"
  },

  // ── Patient 15 : Belkacem Rachid ──────────────────────────────
  {
    patient_id: p["196901087100"],
    type: "HbA1c",
    date: new Date("2023-01-28"),
    resultat: { valeur: 9.8, unite: "%", referenceMax: 6.5 },
    statut: "Très anormal",
    laboratoire: "Labo CHU Annaba"
  },
  {
    patient_id: p["196901087100"],
    type: "Fond d'œil",
    date: new Date("2023-07-20"),
    resultat: { stade: "Rétinopathie non proliférante modérée", microanevrysmes: true },
    statut: "Anormal",
    laboratoire: "Ophtalmologie CHU Annaba"
  },

  // ── Patient 19 : Ferdjani Larbi ────────────────────────────────
  {
    patient_id: p["196007318500"],
    type: "Échocardiographie",
    date: new Date("2023-01-15"),
    resultat: { FEVG: 35, unite: "%", conclusion: "IC à FEVG réduite" },
    statut: "Anormal",
    laboratoire: "Cardio CHU Oran"
  },
  {
    patient_id: p["196007318500"],
    type: "Échocardiographie",
    date: new Date("2024-02-03"),
    resultat: { FEVG: 48, unite: "%", conclusion: "Amélioration significative" },
    statut: "Limite",
    laboratoire: "Cardio CHU Oran"
  },

  // ── Patient 20 : Ziani Meriem ──────────────────────────────────
  {
    patient_id: p["198110177200"],
    type: "Charge virale VHC",
    date: new Date("2023-02-01"),
    resultat: { valeur: 2400000, unite: "UI/mL" },
    statut: "Positif",
    laboratoire: "Virologie CHU Blida"
  },
  {
    patient_id: p["198110177200"],
    type: "Charge virale VHC",
    date: new Date("2023-06-12"),
    resultat: { valeur: 0, unite: "UI/mL", note: "Indétectable" },
    statut: "Négatif — guérison",
    laboratoire: "Virologie CHU Blida"
  }
];

db.analyses.insertMany(analyses);

print("✅ Modélisation terminée.");
print("   Patients insérés  :", db.patients.countDocuments());
print("   Analyses insérées :", db.analyses.countDocuments());