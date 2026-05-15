// TP4 - Exercice 3 : Algorithmes de Graphe avec GDS

// ─────────────────────────────────────────────────────────────────
// 3.1 : Plus court chemin entre Ahmed et Yasmina
// ─────────────────────────────────────────────────────────────────
MATCH p = shortestPath(
  (a:Etudiant {prenom: "Ahmed"})-[:CONNAIT*..10]-(b:Etudiant {prenom: "Yasmina"})
)
RETURN
  [n IN nodes(p) | n.prenom + " (" + n.universite + ")"] AS chemin,
  length(p) AS nb_intermediaires;

// Tous les chemins de longueur ≤ 4
MATCH p = allShortestPaths(
  (a:Etudiant {prenom: "Ahmed"})-[:CONNAIT*..4]-(b:Etudiant {prenom: "Yasmina"})
)
RETURN
  [n IN nodes(p) | n.prenom] AS chemin,
  length(p)                   AS longueur
ORDER BY longueur;

// ─────────────────────────────────────────────────────────────────
// 3.2 : Centralité de degré — étudiants les plus connectés
// ─────────────────────────────────────────────────────────────────

// Créer la projection en mémoire
CALL gds.graph.project(
  'reseau_uniconnect',
  'Etudiant',
  {CONNAIT: {orientation: 'UNDIRECTED'}}
);

// Calculer la centralité de degré
CALL gds.degree.stream('reseau_uniconnect')
YIELD nodeId, score
RETURN
  gds.util.asNode(nodeId).prenom     AS prenom,
  gds.util.asNode(nodeId).universite AS universite,
  gds.util.asNode(nodeId).filiere    AS filiere,
  toInteger(score)                    AS nb_connexions
ORDER BY nb_connexions DESC
LIMIT 10;

// ─────────────────────────────────────────────────────────────────
// 3.3 : Détection de communautés — algorithme de Louvain
// ─────────────────────────────────────────────────────────────────
CALL gds.louvain.stream('reseau_uniconnect')
YIELD nodeId, communityId
WITH communityId,
     collect(gds.util.asNode(nodeId).prenom)     AS membres,
     collect(gds.util.asNode(nodeId).universite) AS universites
RETURN
  communityId,
  size(membres)  AS taille,
  membres[0..5]  AS exemples_membres,
  // Université dominante dans la communauté
  apoc.coll.sortMaps(
    [u IN apoc.coll.toSet(universites) |
      {universite: u, count: size([x IN universites WHERE x = u])}],
    'count'
  )[-1].universite AS universite_dominante
ORDER BY taille DESC;

// ─────────────────────────────────────────────────────────────────
// 3.4 : Recommandation de contacts pour Ahmed
//
// Score = amis_communs × 3 + cours_communs × 2 + meme_filiere × 1
// ─────────────────────────────────────────────────────────────────
MATCH (moi:Etudiant {prenom: "Ahmed"})

// Candidats : étudiants non encore connus, à 2 sauts max
MATCH (moi)-[:CONNAIT]-(intermediaire)-[:CONNAIT]-(candidat:Etudiant)
WHERE candidat <> moi
  AND NOT (moi)-[:CONNAIT]-(candidat)

// Amis en commun
WITH moi, candidat,
     count(DISTINCT intermediaire) AS amis_communs

// Cours en commun
OPTIONAL MATCH (moi)-[:SUIT]->(cours:Cours)<-[:SUIT]-(candidat)
WITH moi, candidat, amis_communs,
     count(DISTINCT cours) AS cours_communs

// Même filière ?
WITH moi, candidat, amis_communs, cours_communs,
     CASE WHEN moi.filiere = candidat.filiere THEN 1 ELSE 0 END AS meme_filiere,
     (amis_communs * 3 + cours_communs * 2) AS score_base

RETURN
  candidat.prenom      AS suggestion,
  candidat.universite  AS universite,
  candidat.filiere     AS filiere,
  amis_communs,
  cours_communs,
  meme_filiere,
  score_base + meme_filiere AS score_total
ORDER BY score_total DESC
LIMIT 5;

// ─────────────────────────────────────────────────────────────────
// 3.5 : Chemin de compétences
//        "Quels cours mènent à Machine Learning ?"
// ─────────────────────────────────────────────────────────────────
MATCH path = (cours:Cours)-[:REQUIERT*]->(but:Competence {nom: "Machine Learning"})
RETURN
  cours.intitule AS cours_a_suivre,
  [n IN nodes(path) |
    CASE
      WHEN n:Cours      THEN n.intitule
      WHEN n:Competence THEN n.nom
      ELSE n.nom
    END
  ] AS parcours_apprentissage,
  length(path) AS nb_etapes;

// Nettoyage projection GDS
CALL gds.graph.drop('reseau_uniconnect');