"""
TP1 - Exercise 1: Redis Data Structures
Use Case: ShopFast DZ — Product management, shopping carts, and navigation tracking

Author  : BELHERAOUI ABDERRAHMANNE
Module  : Advanced Databases
"""

import redis
import json
import logging
from typing import Optional

# ── Logging setup ─────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("shopfast")

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

# ── Key naming convention ──────────────────────────────────────────
# product:{id}          → Hash   — product fields
# cart:{user_id}        → Hash   — product_id → quantity
# history:{user_id}     → List   — viewed product IDs (newest first)
# category:{name}       → Set    — product IDs belonging to category
# product_cache:{id}    → String — JSON snapshot with TTL
# leaderboard:sales     → Sorted Set — product_id → total sales


def store_product(r: redis.Redis, product_id: int, product_data: dict) -> None:
    """
    Store a product as a Redis Hash.

    Key    : product:{product_id}
    Fields : name, price, category, stock

    HSET with mapping= writes all fields atomically in a single command.
    Each field can be updated independently via HSET later.

    >>> store_product(r, 1, {"name": "Samsung A54", "price": "65000",
    ...                      "category": "phones", "stock": "15"})
    """
    key = f"product:{product_id}"
    r.hset(key, mapping=product_data)
    log.info("Stored product #%s → %s", product_id, product_data.get("name"))


def get_product(r: redis.Redis, product_id: int) -> Optional[dict]:
    """
    Retrieve a product by ID.

    HGETALL returns an empty dict if the key does not exist.
    We normalise that to None so callers can use a simple None-check.
    """
    data = r.hgetall(f"product:{product_id}")
    return data if data else None


def update_product_stock(r: redis.Redis, product_id: int, delta: int) -> int:
    """
    Atomically adjust the stock of a product by `delta` units.

    HINCRBY is atomic — no race condition even with concurrent clients.
    Returns the new stock value.
    A negative delta reduces stock (e.g. after a sale).
    """
    new_stock = r.hincrby(f"product:{product_id}", "stock", delta)
    log.info("Product #%s stock updated by %+d → new stock = %d", product_id, delta, new_stock)
    return new_stock


def add_to_cart(r: redis.Redis, user_id: str, product_id: int, quantity: int = 1) -> None:
    """
    Add a product to the user's cart (or increase its quantity).

    Key   : cart:{user_id}    (Hash)
    Field : str(product_id)  → cumulated quantity

    HINCRBY creates the field if missing, then increments by `quantity`.
    This is safe under concurrent access — no locking needed.
    """
    r.hincrby(f"cart:{user_id}", str(product_id), quantity)


def get_cart(r: redis.Redis, user_id: str) -> dict:
    """
    Retrieve the full cart content.

    Returns {product_id: quantity_str} — values are strings on the Redis side.
    """
    return r.hgetall(f"cart:{user_id}")


def remove_from_cart(r: redis.Redis, user_id: str, product_id: int) -> None:
    """
    Completely remove a product from the cart.

    HDEL removes the field. If the field does not exist, it is a no-op.
    """
    r.hdel(f"cart:{user_id}", str(product_id))
    log.info("Removed product #%s from cart of %s", product_id, user_id)


def record_view(r: redis.Redis, user_id: str, product_id: int, max_history: int = 10) -> None:
    """
    Record a product page view for a user.

    Key : history:{user_id}  (List)

    Strategy:
      LPUSH  → inserts at head so the most recent item is always at index 0
      LTRIM  → keeps only the first max_history elements

    The list never grows beyond max_history entries.
    No external cleanup job is needed.
    """
    key = f"history:{user_id}"
    pipe = r.pipeline()
    pipe.lpush(key, str(product_id))
    pipe.ltrim(key, 0, max_history - 1)
    pipe.execute()


def get_history(r: redis.Redis, user_id: str) -> list:
    """
    Retrieve the browsing history from newest to oldest.

    LRANGE 0 -1 returns every element of the list.
    """
    return r.lrange(f"history:{user_id}", 0, -1)


def add_product_to_category(r: redis.Redis, category: str, product_id: int) -> None:
    """
    Tag a product with a category.

    Key : category:{category}  (Set)

    Sets guarantee uniqueness — the same product is never added twice
    to the same category.
    """
    r.sadd(f"category:{category}", str(product_id))


def get_products_in_categories(r: redis.Redis, *categories: str) -> set:
    """
    Return products that belong to ALL given categories (intersection).

    SINTER computes the set intersection server-side in a single round-trip.
    No data is transferred to the application for filtering.
    """
    keys = [f"category:{cat}" for cat in categories]
    return r.sinter(*keys)


def get_products_in_any_category(r: redis.Redis, *categories: str) -> set:
    """
    Return products that belong to AT LEAST ONE of the given categories (union).

    SUNION returns the union of N sets in one command.
    """
    keys = [f"category:{cat}" for cat in categories]
    return r.sunion(*keys)


def get_cart_total(r: redis.Redis, user_id: str) -> float:
    """
    Calculate the total price of the cart.

    Fetches the cart hash and each product's price hash, then multiplies
    quantity × price. A pipeline is used so all HGET calls are batched
    into a single network round-trip.
    """
    cart = get_cart(r, user_id)
    if not cart:
        return 0.0

    pipe = r.pipeline()
    for pid in cart:
        pipe.hget(f"product:{pid}", "price")
    prices = pipe.execute()

    total = 0.0
    for (pid, qty_str), price_str in zip(cart.items(), prices):
        if price_str:
            total += int(qty_str) * float(price_str)
    return round(total, 2)


# ─────────────────────────── manual test ──────────────────────────
if __name__ == "__main__":
    r.flushdb()

    print("=" * 55)
    print("  TP1 — EX1: Redis Data Structures — ShopFast DZ")
    print("=" * 55)

    # ── Products ──────────────────────────────────────────────────
    products = [
        (1, {"name": "Samsung Galaxy A54", "price": "65000", "category": "phones",      "stock": "15"}),
        (2, {"name": "Laptop HP 15-inch",  "price": "120000","category": "laptops",     "stock": "8"}),
        (3, {"name": "Casque JBL BT",      "price": "12000", "category": "audio",       "stock": "50"}),
        (4, {"name": "Clavier Mécanique",  "price": "8000",  "category": "accessories", "stock": "30"}),
    ]
    for pid, data in products:
        store_product(r, pid, data)

    print("\n── Products ─────────────────────────────────────────")
    print("Product #1 :", get_product(r, 1))
    print("Product #99 (not found) :", get_product(r, 99))

    # Stock update
    new_stock = update_product_stock(r, 1, -3)  # sold 3 units
    print(f"Product #1 stock after selling 3: {new_stock}")

    # ── Cart ──────────────────────────────────────────────────────
    print("\n── Cart ─────────────────────────────────────────────")
    add_to_cart(r, "user:42", 1, 2)   # 2× Samsung A54
    add_to_cart(r, "user:42", 2, 1)   # 1× Laptop HP
    add_to_cart(r, "user:42", 1, 1)   # +1 Samsung → total 3
    cart = get_cart(r, "user:42")
    print("Cart user:42 :", cart)
    total = get_cart_total(r, "user:42")
    print(f"Cart total   : {total:,.0f} DZD")

    remove_from_cart(r, "user:42", 2)
    print("Cart after removing Laptop :", get_cart(r, "user:42"))

    # ── History ───────────────────────────────────────────────────
    print("\n── Browsing History (max 10) ────────────────────────")
    for pid in [1, 2, 1, 3, 2, 4, 5, 6, 7, 8, 9, 10, 11]:
        record_view(r, "user:42", pid)
    hist = get_history(r, "user:42")
    print(f"History : {hist}  (len={len(hist)}, expected ≤ 10)")

    # ── Categories ────────────────────────────────────────────────
    print("\n── Categories ───────────────────────────────────────")
    add_product_to_category(r, "electronics", 1)
    add_product_to_category(r, "electronics", 2)
    add_product_to_category(r, "electronics", 3)
    add_product_to_category(r, "promo",       1)
    add_product_to_category(r, "promo",       3)

    print("Electronics :", r.smembers("category:electronics"))
    print("Promo       :", r.smembers("category:promo"))
    print("Both (∩)    :", get_products_in_categories(r, "electronics", "promo"))
    print("Either (∪)  :", get_products_in_any_category(r, "electronics", "promo"))
