"""
SOLUTION — TP1 Exercice 1
NE PAS DISTRIBUER AUX ÉTUDIANTS
"""
import redis
import json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)


def store_product(r, product_id, product_data: dict):
    r.hset(f"product:{product_id}", mapping=product_data)


def get_product(r, product_id):
    data = r.hgetall(f"product:{product_id}")
    return data if data else None


def add_to_cart(r, user_id, product_id, quantity: int = 1):
    r.hincrby(f"cart:{user_id}", str(product_id), quantity)


def get_cart(r, user_id):
    return r.hgetall(f"cart:{user_id}")


def record_view(r, user_id, product_id, max_history: int = 10):
    key = f"history:{user_id}"
    r.lpush(key, str(product_id))
    r.ltrim(key, 0, max_history - 1)


def get_history(r, user_id):
    return r.lrange(f"history:{user_id}", 0, -1)


def add_product_to_category(r, category: str, product_id):
    r.sadd(f"category:{category}", str(product_id))


def get_products_in_categories(r, *categories):
    keys = [f"category:{cat}" for cat in categories]
    return r.sinter(*keys)
