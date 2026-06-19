import os
import psycopg2
from urllib.parse import urlparse

# Construction dynamique de DATABASE_URL à partir des variables POSTGRES_*
db_user = os.environ.get('POSTGRES_USER', 'fasobet')
db_pass = os.environ.get('POSTGRES_PASSWORD', 'changeme_prod')
db_host = 'postgres'
db_port = '5432'
db_name = os.environ.get('POSTGRES_DB', 'fasobet')

DATABASE_URL = f'postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}'


def _is_testing() -> bool:
    v = os.environ.get("TESTING", "").strip().lower()
    return v in {"1", "true", "yes", "on"}


def get_db_connection():
    """Return a psycopg2 connection.

    During unit tests we must not attempt to reach the postgres container.
    """
    if _is_testing():
        raise RuntimeError("PostgreSQL connection disabled during tests (TESTING=1)")

    url = urlparse(DATABASE_URL)
    return psycopg2.connect(
        dbname=url.path[1:],
        user=url.username,
        password=url.password,
        host=url.hostname,
        port=url.port or 5432,
    )



