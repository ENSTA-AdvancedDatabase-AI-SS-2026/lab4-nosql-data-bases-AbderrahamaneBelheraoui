-- TP3 - Exercice 1 : Schéma Cassandra
-- Use Case : SmartGrid DZ - IoT Électrique

-- ─────────────────────────────────────────────────────────────────
-- 1.1 : Keyspace smartgrid
-- NetworkTopologyStrategy : préféré en production car
-- il respecte la topologie physique des datacenters.
-- RF=1 pour le TP local (RF=3 en production).
-- ─────────────────────────────────────────────────────────────────
CREATE KEYSPACE IF NOT EXISTS smartgrid
WITH replication = {
  'class'            : 'NetworkTopologyStrategy',
  'datacenter1'      : 1        -- passer à 3 en production
}
AND durable_writes = true;

USE smartgrid;

-- ─────────────────────────────────────────────────────────────────
-- 1.2 : Table mesures_par_capteur
--
-- Requête cible :
--   "Toutes les mesures du capteur X entre T1 et T2"
--
-- Choix de la Partition Key : (capteur_id, date_jour)
--   • capteur_id seul → partition trop grosse sur 90 jours
--     (1 mesure/min × 60 × 24 × 90 = 129 600 lignes par capteur)
--   • On ajoute date_jour comme bucket quotidien :
--     chaque partition = 1 capteur × 1 jour = 1 440 lignes max
--     → taille maîtrisée, pas de hot partition
--
-- Clustering Key : timestamp DESC
--   → les mesures les plus récentes sont lues en premier
--     (accès O(1) pour "dernière valeur connue")
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mesures_par_capteur (
  capteur_id    UUID,
  date_jour     DATE,       -- bucket quotidien → clé de partition
  timestamp     TIMESTAMP,  -- clustering key
  wilaya        TEXT,
  commune       TEXT,
  tension_v     FLOAT,
  courant_a     FLOAT,
  puissance_kw  FLOAT,
  frequence_hz  FLOAT,
  temperature   FLOAT,
  alerte        BOOLEAN,
  code_alerte   TEXT,

  PRIMARY KEY ((capteur_id, date_jour), timestamp)
)
WITH CLUSTERING ORDER BY (timestamp DESC)
 AND default_time_to_live = 7776000    -- 90 jours (90×24×3600)
 AND comment = 'Mesures brutes IoT — 1 partition = 1 capteur × 1 jour';


-- ─────────────────────────────────────────────────────────────────
-- 1.3 : Table alertes_par_wilaya
--
-- Requête cible :
--   "Toutes les alertes de la wilaya X le jour Y"
--
-- Partition Key : (wilaya, date_jour)
--   • wilaya seule → hot partition sur Alger (le plus grand réseau)
--   • On ajoute date_jour : max 10 000 capteurs × quelques alertes
--     par jour → partition raisonnable
--
-- Clustering Key : timestamp DESC, capteur_id
--   → alertes les plus récentes en tête
--   → capteur_id pour unicité si deux alertes à la même milliseconde
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alertes_par_wilaya (
  wilaya        TEXT,
  date_jour     DATE,
  timestamp     TIMESTAMP,
  capteur_id    UUID,
  code_alerte   TEXT,
  description   TEXT,
  gravite       INT,      -- 1=info  2=warning  3=critique
  resolue       BOOLEAN,

  PRIMARY KEY ((wilaya, date_jour), timestamp, capteur_id)
)
WITH CLUSTERING ORDER BY (timestamp DESC, capteur_id ASC)
 AND default_time_to_live = 31536000   -- 1 an (365×24×3600)
 AND comment = 'Alertes par wilaya — 1 partition = 1 wilaya × 1 jour';


-- ─────────────────────────────────────────────────────────────────
-- 1.4 : Table agregats_horaires
--
-- Requête cible :
--   "Consommation moyenne par heure pour le dashboard d'une wilaya"
--
-- Partition Key : (wilaya, date_jour)
--   • 24 lignes par partition (une par heure) → très léger
--   • Permet de lire toute la journée d'une wilaya en 1 requête
--
-- Clustering Key : date_heure DESC
--   → heure la plus récente en premier (dashboard temps réel)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agregats_horaires (
  wilaya            TEXT,
  date_jour         DATE,
  date_heure        TIMESTAMP,   -- horodatage tronqué à l'heure
  nb_capteurs       INT,
  puissance_moy_kw  FLOAT,
  puissance_max_kw  FLOAT,
  puissance_min_kw  FLOAT,
  nb_alertes        INT,

  PRIMARY KEY ((wilaya, date_jour), date_heure)
)
WITH CLUSTERING ORDER BY (date_heure DESC)
 AND default_time_to_live = 157680000  -- 5 ans (5×365×24×3600)
 AND comment = 'Agrégats horaires pré-calculés — 24 lignes/partition';


-- ─────────────────────────────────────────────────────────────────
-- 1.5 : Résumé des TTL configurés
-- ─────────────────────────────────────────────────────────────────
--  Table                  TTL          Valeur (s)
--  mesures_par_capteur    90 jours      7 776 000
--  alertes_par_wilaya     1 an         31 536 000
--  agregats_horaires      5 ans       157 680 000
--
-- Les TTL sont définis au niveau table (default_time_to_live).
-- On peut les surcharger à la ligne avec USING TTL <valeur>.
-- ─────────────────────────────────────────────────────────────────

DESCRIBE TABLES;