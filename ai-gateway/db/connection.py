import os
import asyncpg
from asyncpg.pool import Pool

DB_URL = os.getenv("DATABASE_URL", "postgresql://fasobet:changeme_prod@postgres:5432/fasobet")
POOL_MIN = int(os.getenv("DB_POOL_MIN", "2"))
POOL_MAX = int(os.getenv("DB_POOL_MAX", "10"))

_pool: Pool = None

async def get_pool() -> Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(DB_URL, min_size=POOL_MIN, max_size=POOL_MAX)
    return _pool

async def fetch_one(sql: str, params=None) -> dict:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(sql, *params) if params else await conn.fetchrow(sql)
        return dict(row) if row else None

async def fetch_all(sql: str, params=None) -> list[dict]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(sql, *params) if params else await conn.fetch(sql)
        return [dict(r) for r in rows]

async def execute(sql: str, params=None) -> str:
    pool = await get_pool()
    async with pool.acquire() as conn:
        return await conn.execute(sql, *params) if params else await conn.execute(sql)
