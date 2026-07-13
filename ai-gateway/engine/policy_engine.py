import json
from db.connection import fetch_one, fetch_all

CACHE = {}

def _ensure_dict(val):
    if isinstance(val, str):
        return json.loads(val)
    return val

async def get_policy(policy_type: str, agency_id: str = None, company_id: str = None) -> dict:
    row = await fetch_one(
        "SELECT value, scope FROM ai_get_policy($1, $2, $3)",
        (agency_id, company_id, policy_type)
    )
    return _ensure_dict(row["value"]) if row else None

async def get_all_policies(agency_id: str = None, company_id: str = None) -> dict:
    rows = await fetch_all(
        "SELECT policy_type, value FROM ai_policies WHERE is_active = true AND "
        "($1 IS NULL OR agency_id IS NULL OR agency_id = $1) AND "
        "($2 IS NULL OR company_id IS NULL OR company_id = $2) "
        "ORDER BY scope DESC",
        (agency_id, company_id)
    )
    result = {}
    for r in rows:
        result[r["policy_type"]] = _ensure_dict(r["value"])
    return result

async def check_budget(agency_id: str = None, company_id: str = None, cost_cents: float = 0) -> tuple:
    row = await fetch_one(
        "SELECT * FROM ai_check_daily_budget($1, $2)",
        (agency_id, company_id)
    )
    if not row:
        return True, 0, 0, 0
    return row["within_budget"], row["budget_cents"], row["spent_cents"], row["remaining_cents"]

async def get_fallback_chain(agency_id: str = None, company_id: str = None) -> list:
    policy = await get_policy("fallback_chain", agency_id, company_id)
    if policy and "providers" in policy:
        return policy["providers"]
    return ["openai", "anthropic", "google", "mistral", "ollama"]

async def get_forbidden_models(agency_id: str = None, company_id: str = None) -> list:
    policy = await get_policy("forbidden_models", agency_id, company_id)
    return policy.get("models", []) if policy else []

async def get_preferred_models(agency_id: str = None, company_id: str = None) -> list:
    policy = await get_policy("preferred_models", agency_id, company_id)
    return policy.get("models", []) if policy else []

async def get_max_budget_per_request(agency_id: str = None, company_id: str = None) -> int:
    policy = await get_policy("budget_per_request_cents", agency_id, company_id)
    return policy.get("value", 50) if policy else 50

async def get_max_latency(agency_id: str = None, company_id: str = None) -> int:
    policy = await get_policy("max_latency_ms", agency_id, company_id)
    return policy.get("value", 30000) if policy else 30000
