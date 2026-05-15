"""
TP1 - Exercise 4: Real-Time Sales Leaderboard
Use Case: ShopFast DZ — Top products ranked by sales volume

Author  : BELHERAOUI ABDERRAHMANNE
Module  : Advanced Databases

Improvements over the starter:
  - reset_leaderboard() utility
  - get_score() to read a single product's total sales
  - top_products_above_threshold() to filter by minimum sales
  - Richer output formatting with ASCII bar chart
"""

import redis
import random
from typing import Optional

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

LEADERBOARD_KEY = "leaderboard:sales"

# Product catalogue used for display
PRODUCT_NAMES = {
    1: "Samsung Galaxy A54",
    2: "Laptop HP 15-inch",
    3: "Casque JBL BT",
    4: "Clavier Mécanique",
    5: "Écran LG 27\"",
    6: "SSD Kingston 1 TB",
    7: "Webcam Logitech",
    8: "Hub USB-C 7-en-1",
    9: "Tapis de Souris XL",
    10: "Routeur WiFi 6",
}


def record_sale(r: redis.Redis, product_id: int, quantity: int = 1) -> float:
    """
    Record a sale in the Sorted Set.

    ZINCRBY increments the score (= total units sold) of the member.
    If the member does not exist yet, it is created with score = quantity.

    Key    : LEADERBOARD_KEY
    Member : str(product_id)
    Score  : total units sold (cumulative)

    Returns the new score after the increment.
    """
    return r.zincrby(LEADERBOARD_KEY, quantity, str(product_id))


def get_score(r: redis.Redis, product_id: int) -> Optional[float]:
    """
    Return the total sales score of a single product.
    Returns None if the product has not been sold yet.
    """
    return r.zscore(LEADERBOARD_KEY, str(product_id))


def get_top_products(r: redis.Redis, n: int = 10) -> list:
    """
    Return the top-N best-selling products in descending order.

    ZREVRANGE + WITHSCORES returns a list of (member, score) tuples
    sorted from highest to lowest score.
    """
    results = r.zrevrange(LEADERBOARD_KEY, 0, n - 1, withscores=True)
    return [
        {"rank": i + 1, "product_id": member, "sales": score}
        for i, (member, score) in enumerate(results)
    ]


def get_product_rank(r: redis.Redis, product_id: int) -> Optional[int]:
    """
    Return the 1-based rank of a product.

    Rank 1 = best seller (highest score).
    Returns None if the product has no sales recorded.

    ZREVRANK returns a 0-based rank → add 1 for the 1-based result.
    """
    rank = r.zrevrank(LEADERBOARD_KEY, str(product_id))
    return (rank + 1) if rank is not None else None


def get_products_between_ranks(r: redis.Redis, start_rank: int, end_rank: int) -> list:
    """
    Return products between start_rank and end_rank (1-based, inclusive).

    ZREVRANGE uses 0-based indices:
      start_rank=3, end_rank=7  →  index 2 to 6
    """
    start_idx = start_rank - 1
    end_idx   = end_rank - 1
    results = r.zrevrange(LEADERBOARD_KEY, start_idx, end_idx, withscores=True)
    return [
        {"rank": start_rank + i, "product_id": member, "sales": score}
        for i, (member, score) in enumerate(results)
    ]


def get_top_products_above_threshold(r: redis.Redis, min_sales: int) -> list:
    """
    Return all products with sales >= min_sales, sorted descending.

    ZRANGEBYSCORE with WITHSCORES and reversed order filters by score range.
    '+inf' means no upper bound.
    """
    results = r.zrangebyscore(
        LEADERBOARD_KEY, min_sales, "+inf", withscores=True
    )
    # zrangebyscore returns ascending → reverse for descending
    results = list(reversed(results))
    return [
        {"rank": i + 1, "product_id": member, "sales": score}
        for i, (member, score) in enumerate(results)
    ]


def reset_leaderboard(r: redis.Redis) -> None:
    """Clear the entire leaderboard. Use with caution in production."""
    r.delete(LEADERBOARD_KEY)


def simulate_sales_day(r: redis.Redis, n_transactions: int = 500) -> None:
    """
    Simulate a day of random sales across products 1–20.
    Each transaction sells 1–5 units.
    """
    product_ids = list(range(1, 21))
    pipe = r.pipeline()
    for _ in range(n_transactions):
        pid = random.choice(product_ids)
        qty = random.randint(1, 5)
        pipe.zincrby(LEADERBOARD_KEY, qty, str(pid))
    pipe.execute()


def print_leaderboard(r: redis.Redis, top_n: int = 10, bar_scale: int = 15) -> None:
    """
    Display the leaderboard with an ASCII bar chart.

    bar_scale : controls bar width relative to the top score.
    """
    entries = get_top_products(r, top_n)
    if not entries:
        print("  (leaderboard is empty)")
        return

    max_sales = entries[0]["sales"]
    print(f"\n  {'Rank':<6} {'Product':<24} {'Sales':>6}  {'Bar'}")
    print("  " + "─" * 60)
    for e in entries:
        name  = PRODUCT_NAMES.get(int(e["product_id"]), f"Product #{e['product_id']}")
        bar   = "█" * int(e["sales"] / max_sales * bar_scale)
        print(
            f"  {e['rank']:<6} {name:<24} {int(e['sales']):>6}  {bar}"
        )


# ─────────────────────────── manual test ──────────────────────────
if __name__ == "__main__":
    r.flushdb()

    print("=" * 55)
    print("  TP1 — EX4: Sales Leaderboard — ShopFast DZ")
    print("=" * 55)

    print("\n  Simulating a day of sales (500 transactions)…")
    simulate_sales_day(r, 500)

    print_leaderboard(r, top_n=10)

    # ── Individual ranks ──────────────────────────────────────────
    print("\n📍 Individual product ranks:")
    for pid in [1, 5, 10, 15, 20]:
        rank  = get_product_rank(r, pid)
        score = get_score(r, pid)
        print(f"   Product #{pid:>2} → rank {rank}  ({int(score or 0)} units sold)")

    # ── Range query ───────────────────────────────────────────────
    print("\n  Products ranked 3rd to 7th:")
    print("  " + "─" * 42)
    for entry in get_products_between_ranks(r, 3, 7):
        name = PRODUCT_NAMES.get(int(entry["product_id"]), f"#{entry['product_id']}")
        print(
            f"   Rank {entry['rank']} | {name:<24} | {int(entry['sales'])} units"
        )

    # ── Threshold filter ──────────────────────────────────────────
    print("\n  Products with at least 150 units sold:")
    print("  " + "─" * 42)
    for entry in get_top_products_above_threshold(r, 150):
        name = PRODUCT_NAMES.get(int(entry["product_id"]), f"#{entry['product_id']}")
        print(f"   Rank {entry['rank']} | {name:<24} | {int(entry['sales'])} units")
