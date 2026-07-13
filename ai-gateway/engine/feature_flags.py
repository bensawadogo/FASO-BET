from db.connection import fetch_one

async def is_enabled(flag_key: str, agency_id: str = None, company_id: str = None) -> bool:
    row = await fetch_one(
        "SELECT ai_feature_enabled($1, $2, $3)",
        (flag_key, agency_id, company_id)
    )
    return row["ai_feature_enabled"] if row else False
