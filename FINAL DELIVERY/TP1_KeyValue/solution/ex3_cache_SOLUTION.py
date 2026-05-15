"""
SOLUTION — TP1 Exercice 3 : Cache-Aside
"""
import redis, json, time
from typing import Optional

r = redis.Redis(host='localhost', port=6379, decode_responses=True)


def slow_db_get_product(product_id):
    time.sleep(2)
    products = {
        1: {"id": 1, "name": "Samsung A54", "price": 65000, "stock": 15},
        2: {"id": 2, "name": "Laptop HP", "price": 120000, "stock": 8},
        3: {"id": 3, "name": "Casque JBL", "price": 12000, "stock": 50},
    }
    return products.get(product_id)


def get_product_cached(r, product_id, ttl=600):
    start = time.time()
    cache_key = f"product_cache:{product_id}"
    
    cached = r.get(cache_key)
    elapsed = (time.time() - start) * 1000
    
    if cached:
        print(f"  CACHE HIT  — {elapsed:.1f}ms")
        return json.loads(cached)
    
    product = slow_db_get_product(product_id)
    elapsed = (time.time() - start) * 1000
    
    if product:
        r.setex(cache_key, ttl, json.dumps(product))
    
    print(f"  CACHE MISS — {elapsed:.1f}ms")
    return product


def invalidate_product_cache(r, product_id):
    r.delete(f"product_cache:{product_id}")


def benchmark_cache(r, product_id, iterations=20):
    hit_times, miss_times = [], []
    r.delete(f"product_cache:{product_id}")
    
    for i in range(iterations):
        start = time.time()
        cached = r.get(f"product_cache:{product_id}")
        is_hit = cached is not None
        
        if not is_hit:
            product = slow_db_get_product(product_id)
            if product:
                r.setex(f"product_cache:{product_id}", 600, json.dumps(product))
        
        elapsed = (time.time() - start) * 1000
        (hit_times if is_hit else miss_times).append(elapsed)
    
    print(f"\n=== Benchmark sur {iterations} itérations ===")
    if miss_times: print(f"  MISS — Moy: {sum(miss_times)/len(miss_times):.1f}ms (n={len(miss_times)})")
    if hit_times:  print(f"  HIT  — Moy: {sum(hit_times)/len(hit_times):.1f}ms (n={len(hit_times)})")
    print(f"  Hit rate: {len(hit_times)/iterations*100:.0f}%")
