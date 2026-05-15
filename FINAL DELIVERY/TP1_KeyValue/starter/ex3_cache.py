"""
TP1 - Exercise 3: Cache-Aside Pattern with TTL
Use Case: ShopFast DZ — Product page caching

Author  : BELHERAOUI ABDERRAHMANNE
Module  : Advanced Databases

New additions compared to the starter:
  - TTL jitter to prevent cache stampede
  - Warm-up helper to pre-fill the cache
  - Cache statistics tracker (hits, misses, ratio)
  - Type hints throughout
"""

import redis
import json
import time
import random
import logging
from typing import Optional

# ── Logging ───────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("cache")

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# ── Cache stats (in-process counter) ─────────────────────────────
_stats = {"hits": 0, "misses": 0}


# ── Simulated slow database ────────────────────────────────────────
def slow_db_get_product(product_id: int) -> Optional[dict]:
    """
    Simulates a slow PostgreSQL query (~2 seconds).
    In production this would be a real psycopg2 / SQLAlchemy call.
    """
    time.sleep(2)
    products = {
        1: {"id": 1, "name": "Samsung Galaxy A54",   "price": 65000,  "stock": 15},
        2: {"id": 2, "name": "Laptop HP 15-inch",    "price": 120000, "stock": 8},
        3: {"id": 3, "name": "Casque JBL Bluetooth", "price": 12000,  "stock": 50},
        4: {"id": 4, "name": "Clavier Mécanique",    "price": 8000,   "stock": 30},
    }
    return products.get(product_id)


# ── TTL jitter helper ─────────────────────────────────────────────
def jittered_ttl(base_ttl: int, jitter_pct: float = 0.10) -> int:
    """
    Add a random jitter of ±jitter_pct to base_ttl.

    Why? If all cache entries expire at exactly the same time,
    every client hits the database simultaneously — this is called
    a *cache stampede*. A small random variation spreads the
    expiry times and prevents this problem.

    Example: base_ttl=600, jitter_pct=0.10
      → actual TTL is somewhere between 540 s and 660 s
    """
    delta = int(base_ttl * jitter_pct)
    return base_ttl + random.randint(-delta, delta)


# ── Cache-Aside core ──────────────────────────────────────────────
def get_product_cached(
    r: redis.Redis,
    product_id: int,
    ttl: int = 600,
    use_jitter: bool = True,
) -> Optional[dict]:
    """
    Cache-Aside pattern in 3 steps:

      1. GET from Redis (fast path)
           → HIT  : deserialise and return immediately
           → MISS : continue to step 2

      2. Query the database (slow path)

      3. SETEX in Redis with TTL
           Store the result so future requests are fast,
           then return the data.

    Parameters
    ----------
    ttl        : base time-to-live in seconds (default 600 s = 10 min)
    use_jitter : add random jitter to TTL to prevent stampede
    """
    start     = time.perf_counter()
    cache_key = f"product_cache:{product_id}"

    # ── Step 1: read from Redis ────────────────────────────────────
    cached_value = r.get(cache_key)

    if cached_value is not None:
        elapsed_ms = (time.perf_counter() - start) * 1000
        _stats["hits"] += 1
        log.info("✅ CACHE HIT  — %.1f ms  (product #%s)", elapsed_ms, product_id)
        return json.loads(cached_value)

    # ── Step 2: database call (MISS) ──────────────────────────────
    product    = slow_db_get_product(product_id)
    elapsed_ms = (time.perf_counter() - start) * 1000
    _stats["misses"] += 1

    # ── Step 3: store in cache if the product exists ───────────────
    if product is not None:
        actual_ttl = jittered_ttl(ttl) if use_jitter else ttl
        r.setex(cache_key, actual_ttl, json.dumps(product))
        log.info(
            "❌ CACHE MISS — %.1f ms  (product #%s) — cached for %d s",
            elapsed_ms, product_id, actual_ttl,
        )
    else:
        log.info("❌ CACHE MISS — %.1f ms  (product #%s not found)", elapsed_ms, product_id)

    return product


def invalidate_product_cache(r: redis.Redis, product_id: int) -> bool:
    """
    Invalidate (delete) the cache entry for a product.

    Call this after any database update to prevent stale data.
    Returns True if a cached entry was deleted, False if nothing existed.
    """
    deleted = r.delete(f"product_cache:{product_id}")
    if deleted:
        log.info("🗑️  Cache invalidated for product #%s", product_id)
    else:
        log.warning("⚠️  No cached entry found for product #%s", product_id)
    return bool(deleted)


def warm_up_cache(r: redis.Redis, product_ids: list, ttl: int = 600) -> None:
    """
    Pre-load the cache for a list of products before peak traffic.

    This avoids the first-request MISS for popular products during
    a flash sale or after a deployment restart.
    Uses a pipeline to load all products into cache in one round-trip.
    """
    log.info("🔥 Warming up cache for %d products...", len(product_ids))
    pipe = r.pipeline()
    for pid in product_ids:
        product = slow_db_get_product(pid)
        if product:
            actual_ttl = jittered_ttl(ttl)
            pipe.setex(f"product_cache:{pid}", actual_ttl, json.dumps(product))
    pipe.execute()
    log.info("✅ Cache warm-up complete.")


def get_cache_stats() -> dict:
    """Return hit/miss counters and computed hit rate."""
    total    = _stats["hits"] + _stats["misses"]
    hit_rate = (_stats["hits"] / total * 100) if total else 0
    return {**_stats, "total": total, "hit_rate_pct": round(hit_rate, 1)}


def benchmark_cache(r: redis.Redis, product_id: int, iterations: int = 20) -> None:
    """
    Measure cache performance over `iterations` calls.

    Method:
      - Delete the key first → guarantees exactly 1 MISS at start
      - Remaining calls will all be HITs
      - Collect timings and display statistics
    """
    hit_times:  list[float] = []
    miss_times: list[float] = []

    r.delete(f"product_cache:{product_id}")

    print(f"\n  Benchmark: {iterations} iterations on product #{product_id}")
    print("  " + "─" * 48)

    for _ in range(iterations):
        start     = time.perf_counter()
        cache_key = f"product_cache:{product_id}"
        cached    = r.get(cache_key)
        is_hit    = cached is not None

        if not is_hit:
            product = slow_db_get_product(product_id)
            if product is not None:
                r.setex(cache_key, jittered_ttl(600), json.dumps(product))

        elapsed_ms = (time.perf_counter() - start) * 1000
        (hit_times if is_hit else miss_times).append(elapsed_ms)

    # ── Report ────────────────────────────────────────────────────
    total    = len(hit_times) + len(miss_times)
    hit_rate = len(hit_times) / total * 100

    print(f"\n  {'─'*48}")
    print(f"  📊 Results ({iterations} iterations)")
    print(f"  {'─'*48}")

    if miss_times:
        avg_miss = sum(miss_times) / len(miss_times)
        print(f"  ❌ MISS — n={len(miss_times):>3}  |  avg = {avg_miss:>8.1f} ms")

    if hit_times:
        avg_hit = sum(hit_times) / len(hit_times)
        p95_hit = sorted(hit_times)[int(0.95 * len(hit_times))]
        print(f"  ✅ HIT  — n={len(hit_times):>3}  |  avg = {avg_hit:>8.1f} ms  |  P95 = {p95_hit:.1f} ms")

    if miss_times and hit_times:
        speedup = avg_miss / avg_hit
        print(f"  ⚡ Speedup      : ×{speedup:.0f} faster with cache")

    print(f"  🎯 Hit rate     : {hit_rate:.0f}%")
    print(f"  {'─'*48}")


# ─────────────────────────── manual test ──────────────────────────
if __name__ == "__main__":
    r.flushdb()
    _stats["hits"] = 0
    _stats["misses"] = 0

    print("=" * 55)
    print("  TP1 — EX3: Cache-Aside with TTL — ShopFast DZ")
    print("=" * 55)

    print("\n① First call — MISS expected (~2 s):")
    p = get_product_cached(r, 1)
    print(f"   Result: {p}")

    print("\n② Second call — HIT expected (<1 ms):")
    p = get_product_cached(r, 1)
    print(f"   Result: {p}")

    print("\n③ Cache invalidation:")
    invalidate_product_cache(r, 1)

    print("\n④ Call after invalidation — MISS expected:")
    get_product_cached(r, 1)

    print("\n⑤ Product that does not exist (id=99):")
    get_product_cached(r, 99)

    print("\n⑥ Cache warm-up for products 2, 3, 4:")
    r.delete("product_cache:2", "product_cache:3", "product_cache:4")
    warm_up_cache(r, [2, 3, 4])
    get_product_cached(r, 2)  # should be HIT

    print("\n⑦ Cache statistics:", get_cache_stats())

    print("\n\n" + "=" * 55)
    print("  BENCHMARK")
    print("=" * 55)
    benchmark_cache(r, 2, iterations=10)
