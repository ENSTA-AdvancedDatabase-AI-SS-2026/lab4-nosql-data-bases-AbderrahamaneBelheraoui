"""
TP5 - Benchmark Comparatif NoSQL

Author  : BELHERAOUI ABDERRAHMANNE
Module  : Advanced Databases
Mesurer les performances de Redis, MongoDB, Cassandra, Neo4j
"""

import time
import statistics
import json
import random
import string
import threading
from typing import Callable, List
import redis
from pymongo import MongoClient, InsertOne
from cassandra.cluster import Cluster
from cassandra.query import BatchStatement, BatchType


# ─────────────────────────────────────────────────────────────────
# Utilitaires de mesure
# ─────────────────────────────────────────────────────────────────

def measure_latency(fn: Callable, iterations: int = 1000) -> dict:
    """
    Exécute fn `iterations` fois et retourne les statistiques
    de latence : moyenne, percentiles P50/P95/P99, max, débit.
    """
    latencies = []
    for _ in range(iterations):
        start = time.perf_counter()
        fn()
        latencies.append((time.perf_counter() - start) * 1000)  # ms

    latencies.sort()
    mean = statistics.mean(latencies)

    return {
        "mean_ms":        round(mean, 3),
        "p50_ms":         round(latencies[int(0.50 * len(latencies))], 3),
        "p95_ms":         round(latencies[int(0.95 * len(latencies))], 3),
        "p99_ms":         round(latencies[int(0.99 * len(latencies))], 3),
        "max_ms":         round(max(latencies), 3),
        "throughput_rps": round(1000 / mean, 1),
    }


def print_results(name: str, results: dict):
    """Affiche les résultats d'un benchmark dans un tableau lisible."""
    print(f"\n{'='*52}")
    print(f"  {name}")
    print(f"{'='*52}")
    print(f"  {'Métrique':<22} {'Valeur':>12}")
    print(f"  {'-'*36}")
    labels = {
        "mean_ms":        "Latence moyenne",
        "p50_ms":         "P50 (médiane)",
        "p95_ms":         "P95",
        "p99_ms":         "P99",
        "max_ms":         "Max",
        "throughput_rps": "Débit (req/s)",
    }
    for k, v in results.items():
        unit = " ms" if "ms" in k else " rps"
        print(f"  {labels.get(k, k):<22} {v:>10.2f}{unit}")


def random_string(length: int = 10) -> str:
    return ''.join(random.choices(string.ascii_lowercase, k=length))


def random_document(i: int) -> dict:
    """Génère un document produit réaliste pour le benchmark."""
    return {
        "product_id": i,
        "name":       f"Produit_{random_string(8)}",
        "price":      round(random.uniform(100, 100_000), 2),
        "category":   random.choice(["phones", "laptops", "audio", "accessories"]),
        "stock":      random.randint(0, 500),
        "rating":     round(random.uniform(1, 5), 1),
        "wilaya":     random.choice(["Alger", "Oran", "Constantine", "Annaba", "Blida"]),
    }


# ─────────────────────────────────────────────────────────────────
# Ex1 : Benchmark Écriture
# ─────────────────────────────────────────────────────────────────

def benchmark_write_redis(n: int = 10_000):
    """
    Insère n enregistrements dans Redis via pipeline.

    Stratégie :
    - Pipeline MULTI : regroupe les commandes en un seul aller-réseau
    - Chaque produit → HSET product:{i} avec tous ses champs
    - Sous-batches de 500 pour éviter de surcharger le buffer
    """
    r = redis.Redis(host='localhost', port=6379, decode_responses=True)
    r.flushdb()

    start      = time.perf_counter()
    BATCH_SIZE = 500

    for batch_start in range(0, n, BATCH_SIZE):
        pipe = r.pipeline(transaction=False)   # UNLOGGED pipeline
        for i in range(batch_start, min(batch_start + BATCH_SIZE, n)):
            doc = random_document(i)
            pipe.hset(f"product:{i}", mapping={k: str(v) for k, v in doc.items()})
        pipe.execute()

    elapsed = time.perf_counter() - start
    debit   = n / elapsed

    print(f"\n{'='*52}")
    print(f"  Redis — Écriture ({n:,} enregistrements)")
    print(f"{'='*52}")
    print(f"  Durée totale     : {elapsed:.2f} s")
    print(f"  Débit            : {debit:,.0f} enregistrements/s")
    print(f"  Latence moyenne  : {elapsed / n * 1000:.3f} ms/op")

    return {"debit_eps": debit, "elapsed_s": elapsed}


def benchmark_write_mongodb(n: int = 10_000):
    """
    Insère n documents dans MongoDB via bulk_write (InsertOne batch).

    Stratégie :
    - Accumulation des opérations InsertOne dans une liste
    - bulk_write envoie tout en un seul appel réseau
    - ordered=False : les insertions parallélisées côté serveur
    - Sous-batches de 1 000 (recommandation MongoDB)
    """
    client = MongoClient("mongodb://admin:admin123@localhost:27017/")
    db     = client["benchmark"]
    col    = db["products"]
    col.drop()

    start      = time.perf_counter()
    BATCH_SIZE = 1_000

    for batch_start in range(0, n, BATCH_SIZE):
        ops = [
            InsertOne(random_document(i))
            for i in range(batch_start, min(batch_start + BATCH_SIZE, n))
        ]
        col.bulk_write(ops, ordered=False)

    elapsed = time.perf_counter() - start
    debit   = n / elapsed

    print(f"\n{'='*52}")
    print(f"  MongoDB — Écriture ({n:,} documents)")
    print(f"{'='*52}")
    print(f"  Durée totale     : {elapsed:.2f} s")
    print(f"  Débit            : {debit:,.0f} documents/s")
    print(f"  Latence moyenne  : {elapsed / n * 1000:.3f} ms/op")

    client.close()
    return {"debit_eps": debit, "elapsed_s": elapsed}


def benchmark_write_cassandra(n: int = 10_000):
    """
    Insère n lignes dans Cassandra via UNLOGGED BATCH.

    Stratégie :
    - UNLOGGED BATCH : pas de log de mutation → écriture rapide
    - Batch de 50 items max (recommandation Cassandra)
    - Prepared statement réutilisé pour éviter le parse overhead
    """
    cluster = Cluster(['localhost'])
    session = cluster.connect()

    # Préparer le keyspace et la table
    session.execute("""
        CREATE KEYSPACE IF NOT EXISTS benchmark
        WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}
    """)
    session.set_keyspace('benchmark')
    session.execute("DROP TABLE IF EXISTS products")
    session.execute("""
        CREATE TABLE products (
            product_id  INT PRIMARY KEY,
            name        TEXT,
            price       FLOAT,
            category    TEXT,
            stock       INT,
            rating      FLOAT,
            wilaya      TEXT
        )
    """)

    insert_stmt = session.prepare("""
        INSERT INTO products (product_id, name, price, category, stock, rating, wilaya)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """)

    start      = time.perf_counter()
    BATCH_SIZE = 50

    for batch_start in range(0, n, BATCH_SIZE):
        batch = BatchStatement(batch_type=BatchType.UNLOGGED)
        for i in range(batch_start, min(batch_start + BATCH_SIZE, n)):
            doc = random_document(i)
            batch.add(insert_stmt, (
                doc["product_id"],
                doc["name"],
                doc["price"],
                doc["category"],
                doc["stock"],
                doc["rating"],
                doc["wilaya"],
            ))
        session.execute(batch)

    elapsed = time.perf_counter() - start
    debit   = n / elapsed

    print(f"\n{'='*52}")
    print(f"  Cassandra — Écriture ({n:,} lignes)")
    print(f"{'='*52}")
    print(f"  Durée totale     : {elapsed:.2f} s")
    print(f"  Débit            : {debit:,.0f} lignes/s")
    print(f"  Latence moyenne  : {elapsed / n * 1000:.3f} ms/op")

    cluster.shutdown()
    return {"debit_eps": debit, "elapsed_s": elapsed}


# ─────────────────────────────────────────────────────────────────
# Ex2 : Benchmark Lecture
# ─────────────────────────────────────────────────────────────────

def benchmark_read_redis():
    """
    Trois types de lectures Redis :
    1. Point lookup   : HGETALL product:{id}       → O(1)
    2. Multi-get      : pipeline de 10 HGETALL     → 1 aller-réseau
    3. Scan partiel   : SCAN avec pattern           → O(N) sur keyspace
    """
    r    = redis.Redis(host='localhost', port=6379, decode_responses=True)
    ids  = list(range(10_000))

    # ── Point lookup ──────────────────────────────────────────────
    def point_lookup():
        pid = random.choice(ids)
        r.hgetall(f"product:{pid}")

    res_point = measure_latency(point_lookup, iterations=1000)
    print_results("Redis — Lecture Point Lookup (HGETALL)", res_point)

    # ── Multi-get (pipeline 10 clés) ──────────────────────────────
    def multi_get():
        pipe    = r.pipeline(transaction=False)
        samples = random.sample(ids, 10)
        for pid in samples:
            pipe.hgetall(f"product:{pid}")
        pipe.execute()

    res_multi = measure_latency(multi_get, iterations=500)
    print_results("Redis — Lecture Multi-get (pipeline 10 clés)", res_multi)

    # ── Scan partiel ──────────────────────────────────────────────
    def scan_keys():
        keys = []
        for _, batch in r.scan_iter("product:*", count=100):
            keys.extend(batch)
            if len(keys) >= 100:
                break

    res_scan = measure_latency(scan_keys, iterations=100)
    print_results("Redis — Scan partiel (100 clés)", res_scan)

    return {"point": res_point, "multi": res_multi, "scan": res_scan}


def benchmark_read_mongodb():
    """
    Trois types de lectures MongoDB :
    1. find_one par product_id   → index scan O(log N)
    2. find avec filtre category → collection scan ou index
    3. aggregate pipeline        → group + sort
    """
    client = MongoClient("mongodb://admin:admin123@localhost:27017/")
    col    = client["benchmark"]["products"]

    # Créer un index sur product_id pour les point lookups
    col.create_index("product_id", unique=True)
    col.create_index("category")

    ids = list(range(10_000))

    # ── find_one (point lookup) ────────────────────────────────────
    def find_one():
        pid = random.choice(ids)
        col.find_one({"product_id": pid})

    res_one = measure_latency(find_one, iterations=1000)
    print_results("MongoDB — Lecture find_one (index)", res_one)

    # ── find avec filtre ──────────────────────────────────────────
    def find_category():
        cat = random.choice(["phones", "laptops", "audio", "accessories"])
        list(col.find({"category": cat}).limit(20))

    res_find = measure_latency(find_category, iterations=500)
    print_results("MongoDB — Lecture find (filtre catégorie)", res_find)

    # ── Aggregate pipeline ────────────────────────────────────────
    def aggregate():
        list(col.aggregate([
            {"$group": {
                "_id":       "$category",
                "avg_price": {"$avg": "$price"},
                "count":     {"$sum": 1},
            }},
            {"$sort": {"count": -1}},
        ]))

    res_agg = measure_latency(aggregate, iterations=200)
    print_results("MongoDB — Agrégation (group + sort)", res_agg)

    client.close()
    return {"find_one": res_one, "find": res_find, "aggregate": res_agg}


# ─────────────────────────────────────────────────────────────────
# Ex3 : Charge concurrente
# ─────────────────────────────────────────────────────────────────

def benchmark_concurrent(
    db_fn:               Callable,
    n_clients:           int = 50,
    requests_per_client: int = 200,
    label:               str = "DB"
):
    """
    Lance n_clients threads simultanés.
    Chaque thread effectue requests_per_client appels à db_fn.
    Mesure la latence globale et la dégradation vs client unique.

    Méthode :
    - threading.Thread pour simuler la concurrence
    - Lock sur la liste de résultats pour éviter les race conditions
    - Calcul du throughput global = total_requêtes / durée_totale
    """
    all_latencies = []
    lock          = threading.Lock()

    def worker():
        local = []
        for _ in range(requests_per_client):
            start = time.perf_counter()
            db_fn()
            local.append((time.perf_counter() - start) * 1000)
        with lock:
            all_latencies.extend(local)

    # Lancer tous les threads simultanément
    threads = [threading.Thread(target=worker) for _ in range(n_clients)]

    wall_start = time.perf_counter()
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    wall_elapsed = time.perf_counter() - wall_start

    total_requests  = n_clients * requests_per_client
    global_throughput = total_requests / wall_elapsed

    all_latencies.sort()
    mean = statistics.mean(all_latencies)

    print(f"\n{'='*52}")
    print(f"  {label} — Charge concurrente")
    print(f"  {n_clients} clients × {requests_per_client} requêtes")
    print(f"{'='*52}")
    print(f"  Total requêtes   : {total_requests:,}")
    print(f"  Durée mur        : {wall_elapsed:.2f} s")
    print(f"  Débit global     : {global_throughput:,.0f} req/s")
    print(f"  Latence moyenne  : {mean:.2f} ms")
    print(f"  P95              : {all_latencies[int(0.95 * len(all_latencies))]:.2f} ms")
    print(f"  P99              : {all_latencies[int(0.99 * len(all_latencies))]:.2f} ms")

    return {
        "total_requests":    total_requests,
        "wall_elapsed_s":    round(wall_elapsed, 2),
        "global_throughput": round(global_throughput, 1),
        "mean_ms":           round(mean, 2),
        "p95_ms":            round(all_latencies[int(0.95 * len(all_latencies))], 2),
        "p99_ms":            round(all_latencies[int(0.99 * len(all_latencies))], 2),
    }


# ─────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print(" Benchmark NoSQL — Comparatif des technologies")
    print("=" * 60)

    N = 10_000   # Augmenter à 100_000 pour la production

    # ── Écriture ──────────────────────────────────────────────────
    print(f"\n📝 Benchmark Écriture ({N:,} enregistrements)")
    res_w_redis     = benchmark_write_redis(N)
    res_w_mongo     = benchmark_write_mongodb(N)
    res_w_cassandra = benchmark_write_cassandra(N)

    # ── Lecture ───────────────────────────────────────────────────
    print(f"\n📖 Benchmark Lecture (1 000 requêtes)")
    res_r_redis = benchmark_read_redis()
    res_r_mongo = benchmark_read_mongodb()

    # ── Charge concurrente ────────────────────────────────────────
    print(f"\n⚡ Test Charge Concurrente (50 clients)")

    r_client = redis.Redis(host='localhost', port=6379, decode_responses=True)
    benchmark_concurrent(
        db_fn    = lambda: r_client.hgetall(f"product:{random.randint(0, N-1)}"),
        n_clients= 50,
        requests_per_client=200,
        label    = "Redis"
    )

    mongo_col = MongoClient(
        "mongodb://admin:admin123@localhost:27017/"
    )["benchmark"]["products"]
    benchmark_concurrent(
        db_fn    = lambda: mongo_col.find_one({"product_id": random.randint(0, N-1)}),
        n_clients= 50,
        requests_per_client=200,
        label    = "MongoDB"
    )

    # ── Résumé comparatif ─────────────────────────────────────────
    print(f"\n{'='*60}")
    print("  RÉSUMÉ COMPARATIF — Débit en écriture")
    print(f"{'='*60}")
    print(f"  {'Technologie':<15} {'Débit (enr/s)':>15}")
    print(f"  {'-'*32}")
    print(f"  {'Redis':<15} {res_w_redis['debit_eps']:>15,.0f}")
    print(f"  {'MongoDB':<15} {res_w_mongo['debit_eps']:>15,.0f}")
    print(f"  {'Cassandra':<15} {res_w_cassandra['debit_eps']:>15,.0f}")
    print(f"{'='*60}")

    print("\n Benchmark terminé ! Consultez RAPPORT.md pour l'analyse.")