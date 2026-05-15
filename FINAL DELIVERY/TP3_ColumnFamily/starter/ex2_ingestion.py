"""
TP3 - Exercice 2 : Ingestion de données IoT
Use Case : SmartGrid DZ — 10 000 capteurs, 5 minutes de mesures

Author  : BELHERAOUI ABDERRAHMANNE
Module  : Advanced Databases
"""

from cassandra.cluster import Cluster
from cassandra.query  import BatchStatement, BatchType
from cassandra.policies import DCAwareRoundRobinPolicy
import uuid
import random
from datetime import datetime, timedelta
import time

# ─── Configuration ────────────────────────────────────────────────
CASSANDRA_HOST      = 'localhost'
KEYSPACE            = 'smartgrid'
NB_CAPTEURS         = 10_000
MINUTES_HISTORIQUE  = 5
BATCH_SIZE          = 50       # bonne pratique Cassandra : ≤ 50 items

WILAYAS = ["Alger", "Oran", "Constantine", "Annaba", "Blida"]
COMMUNES = {
    "Alger":       ["Bab Ezzouar", "Hydra", "El Harrach", "Dar El Beida"],
    "Oran":        ["Bir El Djir", "Es Senia", "Arzew"],
    "Constantine": ["El Khroub", "Ain Smara", "Hamma Bouziane"],
    "Annaba":      ["El Bouni", "El Hadjar", "Seraidi"],
    "Blida":       ["Bougara", "Boufarik", "Larbaa"],
}

CODES_ALERTE = {
    "SURTENSION":    "Tension > 240 V",
    "SOUS_TENSION":  "Tension < 200 V",
    "SURCHARGE":     "Courant > 20 A",
    "SURCHAUFFE":    "Température > 60 °C",
    "FREQ_ANORMALE": "Fréquence hors 49–51 Hz",
}


# ─── Connexion ────────────────────────────────────────────────────
def connect():
    """Connexion au cluster Cassandra avec politique de routage local."""
    cluster = Cluster(
        [CASSANDRA_HOST],
        load_balancing_policy=DCAwareRoundRobinPolicy(local_dc='datacenter1')
    )
    session = cluster.connect(KEYSPACE)
    # Optimisation : exécution asynchrone par défaut
    session.default_timeout = 30
    return session, cluster


# ─── Génération de données ────────────────────────────────────────
def generate_mesure(capteur_id: uuid.UUID,
                    wilaya: str,
                    commune: str,
                    timestamp: datetime) -> dict:
    """
    Génère une mesure électrique réaliste.
    Réseau algérien : 220 V / 50 Hz.
    5 % de probabilité d'alerte.
    """
    tension   = round(220 + random.gauss(0, 5), 2)
    courant   = round(random.uniform(0.5, 15.0), 2)
    puissance = round(tension * courant / 1000, 3)   # kW
    frequence = round(50 + random.gauss(0, 0.1), 2)
    temp      = round(random.uniform(20, 65), 1)

    # Déterminer si une alerte est générée
    alerte      = False
    code_alerte = None

    if tension > 240:
        alerte, code_alerte = True, "SURTENSION"
    elif tension < 200:
        alerte, code_alerte = True, "SOUS_TENSION"
    elif courant > 18:
        alerte, code_alerte = True, "SURCHARGE"
    elif temp > 60:
        alerte, code_alerte = True, "SURCHAUFFE"
    elif not (49 <= frequence <= 51):
        alerte, code_alerte = True, "FREQ_ANORMALE"
    elif random.random() < 0.03:
        # 3 % d'alertes aléatoires supplémentaires
        code_alerte = random.choice(list(CODES_ALERTE.keys()))
        alerte      = True

    return {
        "capteur_id":   capteur_id,
        "date_jour":    timestamp.date(),
        "timestamp":    timestamp,
        "wilaya":       wilaya,
        "commune":      commune,
        "tension_v":    tension,
        "courant_a":    courant,
        "puissance_kw": puissance,
        "frequence_hz": frequence,
        "temperature":  temp,
        "alerte":       alerte,
        "code_alerte":  code_alerte,
    }


# ─── Prepared statements ──────────────────────────────────────────
def prepare_statements(session):
    """Prépare les requêtes INSERT une seule fois (réutilisées N fois)."""

    insert_mesure = session.prepare("""
        INSERT INTO mesures_par_capteur (
            capteur_id, date_jour, timestamp,
            wilaya, commune,
            tension_v, courant_a, puissance_kw,
            frequence_hz, temperature,
            alerte, code_alerte
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        USING TTL 7776000
    """)

    insert_alerte = session.prepare("""
        INSERT INTO alertes_par_wilaya (
            wilaya, date_jour, timestamp,
            capteur_id, code_alerte, description, gravite, resolue
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        USING TTL 31536000
    """)

    return insert_mesure, insert_alerte


# ─── Insertion simple ─────────────────────────────────────────────
def insert_single(session, prepared_mesure, prepared_alerte, mesure: dict):
    """
    Insère une seule mesure.
    Utilisé pour les tests unitaires.
    """
    session.execute(prepared_mesure, (
        mesure["capteur_id"],
        mesure["date_jour"],
        mesure["timestamp"],
        mesure["wilaya"],
        mesure["commune"],
        mesure["tension_v"],
        mesure["courant_a"],
        mesure["puissance_kw"],
        mesure["frequence_hz"],
        mesure["temperature"],
        mesure["alerte"],
        mesure["code_alerte"],
    ))

    # Si alerte → insérer dans la table dédiée
    if mesure["alerte"] and mesure["code_alerte"]:
        gravite = 3 if mesure["code_alerte"] in ("SURTENSION", "SURCHARGE") else 2
        session.execute(prepared_alerte, (
            mesure["wilaya"],
            mesure["date_jour"],
            mesure["timestamp"],
            mesure["capteur_id"],
            mesure["code_alerte"],
            CODES_ALERTE.get(mesure["code_alerte"], "Anomalie détectée"),
            gravite,
            False,
        ))


# ─── Insertion par batch ──────────────────────────────────────────
def insert_batch(session, prepared_mesure, prepared_alerte, mesures: list):
    """
    Insère une liste de mesures via UNLOGGED BATCH.

    Pourquoi UNLOGGED ?
    • LOGGED BATCH garantit l'atomicité mais génère un overhead
      important (log de mutation sur chaque nœud).
    • Pour les séries temporelles, on préfère la performance
      à l'atomicité stricte : une mesure perdue est acceptable,
      un goulot d'étranglement ne l'est pas.
    • Cassandra recommande des batches ≤ 50 items dans la même partition.
      On regroupe par (capteur_id, date_jour) pour maximiser la localité.
    """
    alertes = [m for m in mesures if m["alerte"] and m["code_alerte"]]

    # ── Batch mesures ──────────────────────────────────────────────
    batch = BatchStatement(batch_type=BatchType.UNLOGGED)
    for m in mesures:
        batch.add(prepared_mesure, (
            m["capteur_id"],
            m["date_jour"],
            m["timestamp"],
            m["wilaya"],
            m["commune"],
            m["tension_v"],
            m["courant_a"],
            m["puissance_kw"],
            m["frequence_hz"],
            m["temperature"],
            m["alerte"],
            m["code_alerte"],
        ))
    session.execute(batch)

    # ── Batch alertes (si présentes) ──────────────────────────────
    if alertes:
        batch_alertes = BatchStatement(batch_type=BatchType.UNLOGGED)
        for m in alertes:
            gravite = 3 if m["code_alerte"] in ("SURTENSION", "SURCHARGE") else 2
            batch_alertes.add(prepared_alerte, (
                m["wilaya"],
                m["date_jour"],
                m["timestamp"],
                m["capteur_id"],
                m["code_alerte"],
                CODES_ALERTE.get(m["code_alerte"], "Anomalie détectée"),
                gravite,
                False,
            ))
        session.execute(batch_alertes)


# ─── Ingestion principale ─────────────────────────────────────────
def run_ingestion(session):
    """
    Génère et insère NB_CAPTEURS × MINUTES_HISTORIQUE mesures.

    Stratégie :
    1. Générer les capteurs une fois (ID stable, wilaya fixe)
    2. Pour chaque minute → générer toutes les mesures
    3. Regrouper par partition (capteur_id, date_jour) → BATCH ≤ 50
    4. Mesurer et afficher le débit
    """
    print(f"{'='*55}")
    print(f"  SmartGrid DZ — Ingestion IoT")
    print(f"  {NB_CAPTEURS:,} capteurs × {MINUTES_HISTORIQUE} minutes")
    print(f"  Total attendu : {NB_CAPTEURS * MINUTES_HISTORIQUE:,} mesures")
    print(f"{'='*55}")

    # ── Préparer les statements ────────────────────────────────────
    prep_mesure, prep_alerte = prepare_statements(session)

    # ── Générer le parc de capteurs ───────────────────────────────
    # Chaque capteur a un UUID stable et une affectation géographique fixe
    print("\n  Génération du parc de capteurs...", end=" ")
    capteurs = []
    for _ in range(NB_CAPTEURS):
        wilaya  = random.choice(WILAYAS)
        commune = random.choice(COMMUNES[wilaya])
        capteurs.append({
            "id":      uuid.uuid4(),
            "wilaya":  wilaya,
            "commune": commune,
        })
    print(f"✅ {NB_CAPTEURS:,} capteurs créés")

    # ── Ingestion minute par minute ────────────────────────────────
    now         = datetime.utcnow()
    total_ok    = 0
    total_alerte= 0
    start       = time.time()

    for minute_offset in range(MINUTES_HISTORIQUE):
        ts = now - timedelta(minutes=MINUTES_HISTORIQUE - minute_offset)

        # Construire toutes les mesures de cette minute
        buffer = [
            generate_mesure(c["id"], c["wilaya"], c["commune"], ts)
            for c in capteurs
        ]

        # Insérer par sous-batches de BATCH_SIZE
        for i in range(0, len(buffer), BATCH_SIZE):
            sous_batch = buffer[i : i + BATCH_SIZE]
            insert_batch(session, prep_mesure, prep_alerte, sous_batch)

        nb_alertes  = sum(1 for m in buffer if m["alerte"])
        total_ok    += len(buffer)
        total_alerte+= nb_alertes

        elapsed_partiel = time.time() - start
        print(
            f"  Minute {minute_offset+1}/{MINUTES_HISTORIQUE}"
            f" | {len(buffer):,} mesures"
            f" | {nb_alertes} alertes"
            f" | {elapsed_partiel:.1f}s écoulées"
        )

    # ── Rapport final ──────────────────────────────────────────────
    elapsed = time.time() - start
    debit   = total_ok / elapsed

    print(f"\n{'='*55}")
    print(f"  ✅ Ingestion terminée")
    print(f"  Mesures insérées : {total_ok:,}")
    print(f"  Alertes générées : {total_alerte:,}"
          f" ({total_alerte/total_ok*100:.1f} %)")
    print(f"  Durée totale     : {elapsed:.1f} s")
    print(f"  Débit            : {debit:,.0f} mesures/seconde")
    print(f"{'='*55}")


# ─── Point d'entrée ───────────────────────────────────────────────
if __name__ == "__main__":
    session, cluster = connect()
    try:
        run_ingestion(session)
    finally:
        cluster.shutdown()