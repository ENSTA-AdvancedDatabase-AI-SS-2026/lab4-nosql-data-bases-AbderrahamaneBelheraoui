// TP4 - Exercice 1 : Création du graphe UniConnect DZ

// ─── Nettoyage ────────────────────────────────────────────────────
MATCH (n) DETACH DELETE n;

// ─────────────────────────────────────────────────────────────────
// 1.1 : Contraintes d'unicité
// ─────────────────────────────────────────────────────────────────
CREATE CONSTRAINT etudiant_id  IF NOT EXISTS FOR (e:Etudiant)   REQUIRE e.id  IS UNIQUE;
CREATE CONSTRAINT cours_code   IF NOT EXISTS FOR (c:Cours)      REQUIRE c.code IS UNIQUE;
CREATE CONSTRAINT comp_nom     IF NOT EXISTS FOR (c:Competence) REQUIRE c.nom  IS UNIQUE;
CREATE CONSTRAINT club_nom     IF NOT EXISTS FOR (c:Club)       REQUIRE c.nom  IS UNIQUE;
CREATE CONSTRAINT entreprise_nom IF NOT EXISTS FOR (e:Entreprise) REQUIRE e.nom IS UNIQUE;

// ─────────────────────────────────────────────────────────────────
// 1.2 : Compétences
// ─────────────────────────────────────────────────────────────────
UNWIND [
  {nom: "Python",          categorie: "Programmation"},
  {nom: "Java",            categorie: "Programmation"},
  {nom: "C++",             categorie: "Programmation"},
  {nom: "SQL",             categorie: "Bases de Données"},
  {nom: "NoSQL",           categorie: "Bases de Données"},
  {nom: "Machine Learning",categorie: "IA"},
  {nom: "Deep Learning",   categorie: "IA"},
  {nom: "React",           categorie: "Web"},
  {nom: "Node.js",         categorie: "Web"},
  {nom: "Docker",          categorie: "DevOps"},
  {nom: "Linux",           categorie: "Systèmes"},
  {nom: "Réseaux",         categorie: "Infrastructure"},
  {nom: "Cybersécurité",   categorie: "Sécurité"},
  {nom: "Algorithmique",   categorie: "Fondamentaux"}
] AS comp
MERGE (:Competence {nom: comp.nom, categorie: comp.categorie});

// ─────────────────────────────────────────────────────────────────
// 1.3 : Cours
// ─────────────────────────────────────────────────────────────────
UNWIND [
  {code: "INFO401", intitule: "Bases de Données Avancées",  credits: 6, dept: "Informatique"},
  {code: "INFO402", intitule: "Intelligence Artificielle",  credits: 6, dept: "Informatique"},
  {code: "INFO403", intitule: "Développement Web",          credits: 4, dept: "Informatique"},
  {code: "INFO404", intitule: "Systèmes Distribués",        credits: 5, dept: "Informatique"},
  {code: "INFO405", intitule: "Cloud Computing",            credits: 4, dept: "Informatique"},
  {code: "INFO406", intitule: "Cybersécurité",              credits: 4, dept: "Informatique"},
  {code: "INFO407", intitule: "Algorithmique Avancée",      credits: 5, dept: "Informatique"},
  {code: "GL301",   intitule: "Génie Logiciel",             credits: 5, dept: "GL"},
  {code: "MATH401", intitule: "Probabilités & Statistiques",credits: 4, dept: "Mathématiques"},
  {code: "ELEC301", intitule: "Systèmes Embarqués",         credits: 4, dept: "Electronique"}
] AS cours
MERGE (:Cours {
  code:        cours.code,
  intitule:    cours.intitule,
  credits:     cours.credits,
  departement: cours.dept
});

// ─────────────────────────────────────────────────────────────────
// Cours → Compétences requises
// ─────────────────────────────────────────────────────────────────
MATCH (c:Cours {code: "INFO401"}), (s:Competence {nom: "SQL"})       MERGE (c)-[:REQUIERT]->(s);
MATCH (c:Cours {code: "INFO401"}), (s:Competence {nom: "NoSQL"})     MERGE (c)-[:REQUIERT]->(s);
MATCH (c:Cours {code: "INFO402"}), (s:Competence {nom: "Python"})    MERGE (c)-[:REQUIERT]->(s);
MATCH (c:Cours {code: "INFO402"}), (s:Competence {nom: "Machine Learning"}) MERGE (c)-[:REQUIERT]->(s);
MATCH (c:Cours {code: "INFO402"}), (s:Competence {nom: "Deep Learning"})    MERGE (c)-[:REQUIERT]->(s);
MATCH (c:Cours {code: "INFO403"}), (s:Competence {nom: "React"})     MERGE (c)-[:REQUIERT]->(s);
MATCH (c:Cours {code: "INFO403"}), (s:Competence {nom: "Node.js"})   MERGE (c)-[:REQUIERT]->(s);
MATCH (c:Cours {code: "INFO404"}), (s:Competence {nom: "Docker"})    MERGE (c)-[:REQUIERT]->(s);
MATCH (c:Cours {code: "INFO404"}), (s:Competence {nom: "Linux"})     MERGE (c)-[:REQUIERT]->(s);
MATCH (c:Cours {code: "INFO405"}), (s:Competence {nom: "Docker"})    MERGE (c)-[:REQUIERT]->(s);
MATCH (c:Cours {code: "INFO406"}), (s:Competence {nom: "Cybersécurité"}) MERGE (c)-[:REQUIERT]->(s);
MATCH (c:Cours {code: "INFO406"}), (s:Competence {nom: "Réseaux"})   MERGE (c)-[:REQUIERT]->(s);
MATCH (c:Cours {code: "INFO407"}), (s:Competence {nom: "Algorithmique"}) MERGE (c)-[:REQUIERT]->(s);

// ─────────────────────────────────────────────────────────────────
// 1.4 : Clubs et Entreprises
// ─────────────────────────────────────────────────────────────────
UNWIND [
  {nom: "Club IA USTHB",        universite: "USTHB", domaine: "Intelligence Artificielle"},
  {nom: "Club Dev UMBB",        universite: "UMBB",  domaine: "Développement Logiciel"},
  {nom: "Club Cyber USTO",      universite: "USTO",  domaine: "Cybersécurité"},
  {nom: "Club Robotique UMC",   universite: "UMC",   domaine: "Robotique"},
  {nom: "Club OpenSource UBMA", universite: "UBMA",  domaine: "Open Source"}
] AS club
MERGE (:Club {nom: club.nom, universite: club.universite, domaine: club.domaine});

UNWIND [
  {nom: "Sonatrach",    secteur: "Energie",        ville: "Alger"},
  {nom: "Djezzy",       secteur: "Télécoms",        ville: "Alger"},
  {nom: "Ooredoo",      secteur: "Télécoms",        ville: "Alger"},
  {nom: "Condor",       secteur: "Electronique",    ville: "Bordj Bou Arreridj"},
  {nom: "Cevital",      secteur: "Agroalimentaire", ville: "Béjaïa"},
  {nom: "Naftal",       secteur: "Energie",         ville: "Alger"},
  {nom: "Mobilis",      secteur: "Télécoms",        ville: "Alger"},
  {nom: "HMD Algérie",  secteur: "Informatique",    ville: "Alger"}
] AS ent
MERGE (:Entreprise {nom: ent.nom, secteur: ent.secteur, ville: ent.ville});

// ─────────────────────────────────────────────────────────────────
// 1.5 : Étudiants (50 étudiants, 5 universités)
// ─────────────────────────────────────────────────────────────────
UNWIND [
  // ── USTHB — Alger ─────────────────────────────────────────────
  {id:"E001",prenom:"Ahmed",   nom:"Bensalem", universite:"USTHB",annee:3,filiere:"Informatique",ville:"Alger"},
  {id:"E002",prenom:"Fatima",  nom:"Ouali",    universite:"USTHB",annee:3,filiere:"Informatique",ville:"Alger"},
  {id:"E003",prenom:"Mehdi",   nom:"Derbal",   universite:"USTHB",annee:2,filiere:"Electronique",ville:"Alger"},
  {id:"E004",prenom:"Lina",    nom:"Boudia",   universite:"USTHB",annee:1,filiere:"Informatique",ville:"Alger"},
  {id:"E005",prenom:"Rayan",   nom:"Chettih",  universite:"USTHB",annee:4,filiere:"GL",          ville:"Alger"},
  {id:"E006",prenom:"Amira",   nom:"Ziani",    universite:"USTHB",annee:3,filiere:"Informatique",ville:"Alger"},
  {id:"E007",prenom:"Bilal",   nom:"Ferhat",   universite:"USTHB",annee:2,filiere:"Informatique",ville:"Alger"},
  {id:"E008",prenom:"Nadia",   nom:"Kaci",     universite:"USTHB",annee:4,filiere:"Mathematiques",ville:"Alger"},
  {id:"E009",prenom:"Tariq",   nom:"Saadi",    universite:"USTHB",annee:3,filiere:"Informatique",ville:"Alger"},
  {id:"E010",prenom:"Meriem",  nom:"Hadjadj",  universite:"USTHB",annee:1,filiere:"Informatique",ville:"Alger"},
  // ── UMBB — Boumerdes ──────────────────────────────────────────
  {id:"E011",prenom:"Karim",   nom:"Meziane",  universite:"UMBB", annee:2,filiere:"Informatique",ville:"Boumerdes"},
  {id:"E012",prenom:"Youcef",  nom:"Cherif",   universite:"UMBB", annee:4,filiere:"Mathematiques",ville:"Boumerdes"},
  {id:"E013",prenom:"Samia",   nom:"Boudjelal",universite:"UMBB", annee:3,filiere:"Informatique",ville:"Boumerdes"},
  {id:"E014",prenom:"Hocine",  nom:"Rahmani",  universite:"UMBB", annee:2,filiere:"Telecoms",    ville:"Boumerdes"},
  {id:"E015",prenom:"Chafia",  nom:"Mazouz",   universite:"UMBB", annee:3,filiere:"Informatique",ville:"Boumerdes"},
  {id:"E016",prenom:"Walid",   nom:"Belhadj",  universite:"UMBB", annee:4,filiere:"GL",          ville:"Boumerdes"},
  {id:"E017",prenom:"Imene",   nom:"Tlemcani", universite:"UMBB", annee:1,filiere:"Informatique",ville:"Boumerdes"},
  {id:"E018",prenom:"Sofiane", nom:"Benali",   universite:"UMBB", annee:3,filiere:"Electronique",ville:"Boumerdes"},
  {id:"E019",prenom:"Asma",    nom:"Zerrouki", universite:"UMBB", annee:2,filiere:"Informatique",ville:"Boumerdes"},
  {id:"E020",prenom:"Nazim",   nom:"Hamidi",   universite:"UMBB", annee:4,filiere:"Informatique",ville:"Boumerdes"},
  // ── USTO — Oran ───────────────────────────────────────────────
  {id:"E021",prenom:"Yasmina", nom:"Hamdi",    universite:"USTO", annee:4,filiere:"Informatique",ville:"Oran"},
  {id:"E022",prenom:"Anis",    nom:"Haddar",   universite:"USTO", annee:3,filiere:"GL",          ville:"Oran"},
  {id:"E023",prenom:"Djamila", nom:"Bouabdallah",universite:"USTO",annee:2,filiere:"Informatique",ville:"Oran"},
  {id:"E024",prenom:"Rachid",  nom:"Mekkaoui", universite:"USTO", annee:3,filiere:"Electronique",ville:"Oran"},
  {id:"E025",prenom:"Nour",    nom:"Bensmail", universite:"USTO", annee:4,filiere:"Informatique",ville:"Oran"},
  {id:"E026",prenom:"Lotfi",   nom:"Khaldi",   universite:"USTO", annee:1,filiere:"Telecoms",    ville:"Oran"},
  {id:"E027",prenom:"Farida",  nom:"Boukhalfa",universite:"USTO", annee:3,filiere:"Informatique",ville:"Oran"},
  {id:"E028",prenom:"Redouane",nom:"Sellami",  universite:"USTO", annee:2,filiere:"GL",          ville:"Oran"},
  {id:"E029",prenom:"Lynda",   nom:"Ouartsi",  universite:"USTO", annee:4,filiere:"Informatique",ville:"Oran"},
  {id:"E030",prenom:"Fouad",   nom:"Gherbi",   universite:"USTO", annee:3,filiere:"Mathematiques",ville:"Oran"},
  // ── UMC — Constantine ─────────────────────────────────────────
  {id:"E031",prenom:"Rania",   nom:"Belkacem", universite:"UMC",  annee:3,filiere:"GL",          ville:"Constantine"},
  {id:"E032",prenom:"Tarek",   nom:"Bouchama", universite:"UMC",  annee:4,filiere:"Informatique",ville:"Constantine"},
  {id:"E033",prenom:"Sabrina", nom:"Ouali",    universite:"UMC",  annee:2,filiere:"Informatique",ville:"Constantine"},
  {id:"E034",prenom:"Khaled",  nom:"Ferdjani", universite:"UMC",  annee:3,filiere:"Electronique",ville:"Constantine"},
  {id:"E035",prenom:"Houria",  nom:"Mansouri", universite:"UMC",  annee:4,filiere:"Mathematiques",ville:"Constantine"},
  {id:"E036",prenom:"Samy",    nom:"Belaid",   universite:"UMC",  annee:1,filiere:"Informatique",ville:"Constantine"},
  {id:"E037",prenom:"Leila",   nom:"Bouraghda",universite:"UMC",  annee:3,filiere:"GL",          ville:"Constantine"},
  {id:"E038",prenom:"Nassim",  nom:"Hadj",     universite:"UMC",  annee:2,filiere:"Informatique",ville:"Constantine"},
  {id:"E039",prenom:"Wafa",    nom:"Guedouar", universite:"UMC",  annee:4,filiere:"Telecoms",    ville:"Constantine"},
  {id:"E040",prenom:"Amine",   nom:"Rezig",    universite:"UMC",  annee:3,filiere:"Informatique",ville:"Constantine"},
  // ── UBMA — Annaba ─────────────────────────────────────────────
  {id:"E041",prenom:"Sara",    nom:"Amrani",   universite:"UBMA", annee:3,filiere:"Telecoms",    ville:"Annaba"},
  {id:"E042",prenom:"Djamel",  nom:"Rezgui",   universite:"UBMA", annee:4,filiere:"Informatique",ville:"Annaba"},
  {id:"E043",prenom:"Nabila",  nom:"Bensaid",  universite:"UBMA", annee:2,filiere:"Informatique",ville:"Annaba"},
  {id:"E044",prenom:"Yassine", nom:"Laib",     universite:"UBMA", annee:3,filiere:"Electronique",ville:"Annaba"},
  {id:"E045",prenom:"Karima",  nom:"Boufenara",universite:"UBMA", annee:4,filiere:"GL",          ville:"Annaba"},
  {id:"E046",prenom:"Mounir",  nom:"Benaissa", universite:"UBMA", annee:1,filiere:"Informatique",ville:"Annaba"},
  {id:"E047",prenom:"Zineb",   nom:"Hadj Amar",universite:"UBMA", annee:3,filiere:"Informatique",ville:"Annaba"},
  {id:"E048",prenom:"Adel",    nom:"Chikhi",   universite:"UBMA", annee:2,filiere:"Mathematiques",ville:"Annaba"},
  {id:"E049",prenom:"Sihem",   nom:"Belabbas", universite:"UBMA", annee:4,filiere:"Informatique",ville:"Annaba"},
  {id:"E050",prenom:"Oussama", nom:"Khelil",   universite:"UBMA", annee:3,filiere:"GL",          ville:"Annaba"}
] AS data
MERGE (e:Etudiant {id: data.id})
SET e += data;

// ─────────────────────────────────────────────────────────────────
// Relations CONNAIT (réseau social — graphe connexe)
// Stratégie :
//   • Connexions intra-université (même promo)
//   • Connexions inter-universités (conférences, stages)
//   • Chaque étudiant a au moins 2 connexions → graphe connexe
// ─────────────────────────────────────────────────────────────────
UNWIND [
  // ── USTHB — cercle proche ────────────────────────────────────
  {a:"E001",b:"E002",depuis:2022,ctx:"cours"},
  {a:"E001",b:"E003",depuis:2023,ctx:"club"},
  {a:"E001",b:"E006",depuis:2022,ctx:"cours"},
  {a:"E001",b:"E009",depuis:2023,ctx:"projet"},
  {a:"E002",b:"E004",depuis:2023,ctx:"cours"},
  {a:"E002",b:"E007",depuis:2022,ctx:"cours"},
  {a:"E003",b:"E007",depuis:2023,ctx:"club"},
  {a:"E004",b:"E010",depuis:2024,ctx:"cours"},
  {a:"E005",b:"E008",depuis:2022,ctx:"cours"},
  {a:"E006",b:"E009",depuis:2023,ctx:"projet"},
  {a:"E007",b:"E010",depuis:2024,ctx:"cours"},
  {a:"E008",b:"E009",depuis:2023,ctx:"cours"},
  // ── UMBB — cercle proche ─────────────────────────────────────
  {a:"E011",b:"E013",depuis:2023,ctx:"cours"},
  {a:"E011",b:"E015",depuis:2022,ctx:"club"},
  {a:"E012",b:"E016",depuis:2022,ctx:"cours"},
  {a:"E013",b:"E019",depuis:2023,ctx:"cours"},
  {a:"E014",b:"E018",depuis:2023,ctx:"cours"},
  {a:"E015",b:"E020",depuis:2022,ctx:"projet"},
  {a:"E016",b:"E020",depuis:2023,ctx:"cours"},
  {a:"E017",b:"E019",depuis:2024,ctx:"cours"},
  {a:"E018",b:"E020",depuis:2023,ctx:"club"},
  // ── USTO — cercle proche ─────────────────────────────────────
  {a:"E021",b:"E023",depuis:2022,ctx:"cours"},
  {a:"E021",b:"E025",depuis:2023,ctx:"projet"},
  {a:"E022",b:"E028",depuis:2023,ctx:"cours"},
  {a:"E023",b:"E027",depuis:2022,ctx:"club"},
  {a:"E024",b:"E026",depuis:2023,ctx:"cours"},
  {a:"E025",b:"E029",depuis:2022,ctx:"cours"},
  {a:"E027",b:"E029",depuis:2023,ctx:"cours"},
  {a:"E028",b:"E030",depuis:2023,ctx:"cours"},
  {a:"E029",b:"E030",depuis:2024,ctx:"projet"},
  // ── UMC — cercle proche ──────────────────────────────────────
  {a:"E031",b:"E033",depuis:2023,ctx:"cours"},
  {a:"E031",b:"E037",depuis:2022,ctx:"club"},
  {a:"E032",b:"E040",depuis:2022,ctx:"cours"},
  {a:"E033",b:"E038",depuis:2023,ctx:"cours"},
  {a:"E034",b:"E036",depuis:2024,ctx:"cours"},
  {a:"E035",b:"E039",depuis:2022,ctx:"cours"},
  {a:"E036",b:"E038",depuis:2024,ctx:"cours"},
  {a:"E037",b:"E040",depuis:2023,ctx:"projet"},
  // ── UBMA — cercle proche ─────────────────────────────────────
  {a:"E041",b:"E043",depuis:2023,ctx:"cours"},
  {a:"E041",b:"E047",depuis:2022,ctx:"club"},
  {a:"E042",b:"E049",depuis:2022,ctx:"cours"},
  {a:"E043",b:"E048",depuis:2023,ctx:"cours"},
  {a:"E044",b:"E046",depuis:2024,ctx:"cours"},
  {a:"E045",b:"E050",depuis:2022,ctx:"cours"},
  {a:"E047",b:"E049",depuis:2023,ctx:"projet"},
  {a:"E048",b:"E050",depuis:2023,ctx:"cours"},
  // ── Ponts inter-universités (conférences / stages) ─────────────
  {a:"E001",b:"E011",depuis:2023,ctx:"conference"},
  {a:"E001",b:"E021",depuis:2023,ctx:"hackathon"},
  {a:"E002",b:"E031",depuis:2023,ctx:"conference"},
  {a:"E005",b:"E016",depuis:2022,ctx:"stage"},
  {a:"E009",b:"E022",depuis:2023,ctx:"hackathon"},
  {a:"E011",b:"E021",depuis:2022,ctx:"conference"},
  {a:"E011",b:"E031",depuis:2023,ctx:"stage"},
  {a:"E013",b:"E033",depuis:2023,ctx:"conference"},
  {a:"E020",b:"E040",depuis:2022,ctx:"hackathon"},
  {a:"E021",b:"E031",depuis:2023,ctx:"conference"},
  {a:"E021",b:"E041",depuis:2022,ctx:"stage"},
  {a:"E025",b:"E035",depuis:2023,ctx:"conference"},
  {a:"E029",b:"E049",depuis:2023,ctx:"hackathon"},
  {a:"E031",b:"E041",depuis:2022,ctx:"conference"},
  {a:"E032",b:"E042",depuis:2023,ctx:"stage"}
] AS rel
MATCH (a:Etudiant {id: rel.a}), (b:Etudiant {id: rel.b})
MERGE (a)-[:CONNAIT {depuis: rel.depuis, contexte: rel.ctx}]->(b)
MERGE (b)-[:CONNAIT {depuis: rel.depuis, contexte: rel.ctx}]->(a);

// ─────────────────────────────────────────────────────────────────
// Relations SUIT (étudiant → cours) avec notes
// ─────────────────────────────────────────────────────────────────
UNWIND [
  {e:"E001",c:"INFO401",sem:"S5",note:16.5},
  {e:"E001",c:"INFO402",sem:"S5",note:14.0},
  {e:"E001",c:"INFO404",sem:"S5",note:15.0},
  {e:"E002",c:"INFO401",sem:"S5",note:17.0},
  {e:"E002",c:"INFO403",sem:"S5",note:13.5},
  {e:"E003",c:"ELEC301",sem:"S4",note:12.0},
  {e:"E004",c:"INFO401",sem:"S4",note:11.5},
  {e:"E005",c:"GL301",  sem:"S5",note:15.5},
  {e:"E005",c:"INFO404",sem:"S5",note:14.0},
  {e:"E006",c:"INFO402",sem:"S5",note:18.0},
  {e:"E006",c:"INFO401",sem:"S5",note:16.0},
  {e:"E007",c:"INFO403",sem:"S4",note:13.0},
  {e:"E008",c:"MATH401",sem:"S6",note:19.0},
  {e:"E009",c:"INFO401",sem:"S5",note:14.5},
  {e:"E009",c:"INFO406",sem:"S5",note:15.0},
  {e:"E010",c:"INFO407",sem:"S2",note:12.5},
  {e:"E011",c:"INFO401",sem:"S4",note:13.5},
  {e:"E011",c:"INFO402",sem:"S4",note:14.0},
  {e:"E012",c:"MATH401",sem:"S6",note:18.5},
  {e:"E013",c:"INFO403",sem:"S5",note:15.0},
  {e:"E014",c:"INFO404",sem:"S4",note:12.0},
  {e:"E015",c:"INFO401",sem:"S5",note:16.5},
  {e:"E016",c:"GL301",  sem:"S6",note:17.0},
  {e:"E017",c:"INFO407",sem:"S2",note:11.5},
  {e:"E018",c:"ELEC301",sem:"S4",note:14.0},
  {e:"E019",c:"INFO401",sem:"S4",note:13.0},
  {e:"E020",c:"INFO402",sem:"S6",note:15.5},
  {e:"E020",c:"INFO404",sem:"S6",note:16.0},
  {e:"E021",c:"INFO401",sem:"S6",note:14.0},
  {e:"E021",c:"INFO405",sem:"S6",note:15.5},
  {e:"E022",c:"GL301",  sem:"S5",note:13.5},
  {e:"E023",c:"INFO403",sem:"S4",note:14.5},
  {e:"E024",c:"ELEC301",sem:"S5",note:13.0},
  {e:"E025",c:"INFO402",sem:"S6",note:17.5},
  {e:"E025",c:"INFO401",sem:"S6",note:16.0},
  {e:"E026",c:"INFO406",sem:"S2",note:11.0},
  {e:"E027",c:"INFO401",sem:"S5",note:14.0},
  {e:"E028",c:"GL301",  sem:"S4",note:12.5},
  {e:"E029",c:"INFO402",sem:"S6",note:18.0},
  {e:"E030",c:"MATH401",sem:"S5",note:17.5},
  {e:"E031",c:"GL301",  sem:"S5",note:16.0},
  {e:"E031",c:"INFO401",sem:"S5",note:15.5},
  {e:"E032",c:"INFO402",sem:"S6",note:14.5},
  {e:"E033",c:"INFO403",sem:"S4",note:13.5},
  {e:"E034",c:"ELEC301",sem:"S5",note:12.0},
  {e:"E035",c:"MATH401",sem:"S6",note:19.5},
  {e:"E036",c:"INFO407",sem:"S2",note:12.0},
  {e:"E037",c:"GL301",  sem:"S5",note:15.0},
  {e:"E038",c:"INFO401",sem:"S4",note:13.0},
  {e:"E039",c:"INFO404",sem:"S6",note:14.5},
  {e:"E040",c:"INFO402",sem:"S5",note:16.0},
  {e:"E041",c:"INFO406",sem:"S5",note:13.5},
  {e:"E042",c:"INFO401",sem:"S6",note:15.0},
  {e:"E043",c:"INFO403",sem:"S4",note:14.0},
  {e:"E044",c:"ELEC301",sem:"S5",note:13.0},
  {e:"E045",c:"GL301",  sem:"S6",note:16.5},
  {e:"E046",c:"INFO407",sem:"S2",note:11.5},
  {e:"E047",c:"INFO401",sem:"S5",note:14.5},
  {e:"E048",c:"MATH401",sem:"S4",note:17.0},
  {e:"E049",c:"INFO402",sem:"S6",note:15.5},
  {e:"E050",c:"GL301",  sem:"S5",note:14.0}
] AS rel
MATCH (e:Etudiant {id: rel.e}), (c:Cours {code: rel.c})
MERGE (e)-[:SUIT {semestre: rel.sem, note: rel.note}]->(c);

// ─────────────────────────────────────────────────────────────────
// Relations MAITRISE (étudiant → compétence)
// ─────────────────────────────────────────────────────────────────
UNWIND [
  {e:"E001",comp:"Python",         niveau:"Avancé"},
  {e:"E001",comp:"SQL",            niveau:"Intermédiaire"},
  {e:"E001",comp:"Docker",         niveau:"Débutant"},
  {e:"E002",comp:"Python",         niveau:"Avancé"},
  {e:"E002",comp:"React",          niveau:"Intermédiaire"},
  {e:"E002",comp:"SQL",            niveau:"Avancé"},
  {e:"E005",comp:"Java",           niveau:"Avancé"},
  {e:"E005",comp:"SQL",            niveau:"Intermédiaire"},
  {e:"E006",comp:"Machine Learning",niveau:"Avancé"},
  {e:"E006",comp:"Python",         niveau:"Expert"},
  {e:"E006",comp:"Deep Learning",  niveau:"Intermédiaire"},
  {e:"E008",comp:"Algorithmique",  niveau:"Expert"},
  {e:"E009",comp:"Linux",          niveau:"Avancé"},
  {e:"E009",comp:"Cybersécurité",  niveau:"Intermédiaire"},
  {e:"E011",comp:"Java",           niveau:"Intermédiaire"},
  {e:"E011",comp:"SQL",            niveau:"Avancé"},
  {e:"E012",comp:"Algorithmique",  niveau:"Expert"},
  {e:"E013",comp:"React",          niveau:"Avancé"},
  {e:"E013",comp:"Node.js",        niveau:"Intermédiaire"},
  {e:"E015",comp:"Python",         niveau:"Avancé"},
  {e:"E015",comp:"NoSQL",          niveau:"Intermédiaire"},
  {e:"E016",comp:"Java",           niveau:"Avancé"},
  {e:"E016",comp:"Docker",         niveau:"Avancé"},
  {e:"E020",comp:"Machine Learning",niveau:"Intermédiaire"},
  {e:"E020",comp:"Docker",         niveau:"Avancé"},
  {e:"E021",comp:"Python",         niveau:"Avancé"},
  {e:"E021",comp:"NoSQL",          niveau:"Avancé"},
  {e:"E022",comp:"Java",           niveau:"Intermédiaire"},
  {e:"E025",comp:"Deep Learning",  niveau:"Avancé"},
  {e:"E025",comp:"Python",         niveau:"Expert"},
  {e:"E029",comp:"Machine Learning",niveau:"Avancé"},
  {e:"E030",comp:"Algorithmique",  niveau:"Expert"},
  {e:"E031",comp:"Java",           niveau:"Avancé"},
  {e:"E031",comp:"SQL",            niveau:"Avancé"},
  {e:"E032",comp:"Python",         niveau:"Intermédiaire"},
  {e:"E035",comp:"Algorithmique",  niveau:"Expert"},
  {e:"E040",comp:"Machine Learning",niveau:"Intermédiaire"},
  {e:"E042",comp:"NoSQL",          niveau:"Avancé"},
  {e:"E042",comp:"SQL",            niveau:"Avancé"},
  {e:"E045",comp:"Java",           niveau:"Avancé"},
  {e:"E047",comp:"Python",         niveau:"Intermédiaire"},
  {e:"E048",comp:"Algorithmique",  niveau:"Avancé"},
  {e:"E049",comp:"Deep Learning",  niveau:"Intermédiaire"},
  {e:"E050",comp:"Java",           niveau:"Avancé"}
] AS rel
MATCH (e:Etudiant {id: rel.e}), (c:Competence {nom: rel.comp})
MERGE (e)-[:MAITRISE {niveau: rel.niveau}]->(c);

// ─────────────────────────────────────────────────────────────────
// Relations MEMBRE_DE (étudiant → club)
// ─────────────────────────────────────────────────────────────────
UNWIND [
  {e:"E001",club:"Club IA USTHB",       role:"Membre"},
  {e:"E006",club:"Club IA USTHB",       role:"Président"},
  {e:"E002",club:"Club IA USTHB",       role:"Membre"},
  {e:"E009",club:"Club IA USTHB",       role:"Trésorier"},
  {e:"E011",club:"Club Dev UMBB",       role:"Président"},
  {e:"E013",club:"Club Dev UMBB",       role:"Membre"},
  {e:"E015",club:"Club Dev UMBB",       role:"Secrétaire"},
  {e:"E021",club:"Club Cyber USTO",     role:"Président"},
  {e:"E023",club:"Club Cyber USTO",     role:"Membre"},
  {e:"E027",club:"Club Cyber USTO",     role:"Membre"},
  {e:"E031",club:"Club Robotique UMC",  role:"Président"},
  {e:"E037",club:"Club Robotique UMC",  role:"Membre"},
  {e:"E041",club:"Club OpenSource UBMA",role:"Président"},
  {e:"E047",club:"Club OpenSource UBMA",role:"Membre"},
  {e:"E050",club:"Club OpenSource UBMA",role:"Secrétaire"}
] AS rel
MATCH (e:Etudiant {id: rel.e}), (c:Club {nom: rel.club})
MERGE (e)-[:MEMBRE_DE {role: rel.role}]->(c);

// ─────────────────────────────────────────────────────────────────
// Relations A_STAGE_CHEZ (étudiant → entreprise)
// ─────────────────────────────────────────────────────────────────
UNWIND [
  {e:"E005", ent:"Sonatrach",   annee:2023, duree:3},
  {e:"E008", ent:"Djezzy",      annee:2023, duree:2},
  {e:"E016", ent:"Condor",      annee:2022, duree:4},
  {e:"E020", ent:"HMD Algérie", annee:2023, duree:3},
  {e:"E021", ent:"Ooredoo",     annee:2022, duree:2},
  {e:"E025", ent:"Sonatrach",   annee:2023, duree:6},
  {e:"E029", ent:"HMD Algérie", annee:2023, duree:3},
  {e:"E032", ent:"Naftal",      annee:2022, duree:2},
  {e:"E035", ent:"Sonatrach",   annee:2023, duree:4},
  {e:"E042", ent:"Djezzy",      annee:2023, duree:3},
  {e:"E045", ent:"Mobilis",     annee:2022, duree:4},
  {e:"E049", ent:"Cevital",     annee:2023, duree:2}
] AS rel
MATCH (e:Etudiant {id: rel.e}), (ent:Entreprise {nom: rel.ent})
MERGE (e)-[:A_STAGE_CHEZ {annee: rel.annee, duree_mois: rel.duree}]->(ent);

// ─── Vérification finale ──────────────────────────────────────────
MATCH (n)     RETURN labels(n)[0] AS type, count(n) AS total ORDER BY total DESC;
MATCH ()-[r]->() RETURN type(r) AS relation, count(r) AS total ORDER BY total DESC;