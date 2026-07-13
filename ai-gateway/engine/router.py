from db.connection import fetch_one

CAPABILITY_MODEL_MAP = {
    "generate_email": {"prefer_cheapest": True, "min_context": 8192},
    "audit_website": {"needs_code": False, "prefer_cheapest": False, "min_context": 16384},
    "seo_analysis": {"needs_code": False, "min_context": 8192},
    "generate_proposal": {"min_context": 32768},
    "summarize": {"prefer_cheapest": True, "min_context": 8192},
    "code_review": {"needs_code": True, "min_context": 16384},
    "analyze_image": {"needs_vision": True},
    "classify_lead": {"prefer_cheapest": True, "min_context": 4096},
    "generate_social_post": {"prefer_cheapest": True, "min_context": 4096},
    "analyze_sentiment": {"prefer_cheapest": True, "min_context": 4096},
    "default": {"min_context": 8192},
}

def get_capability_config(capability: str) -> dict:
    return CAPABILITY_MODEL_MAP.get(capability, CAPABILITY_MODEL_MAP["default"])

async def select_model(
    capability: str = "default",
    prefer_cheapest: bool = False,
    prefer_fastest: bool = False,
    needs_vision: bool = False,
    needs_code: bool = False,
    needs_tools: bool = False,
    min_context: int = 4096,
    provider: str = None,
):
    cfg = get_capability_config(capability)
    p_cheapest = prefer_cheapest or cfg.get("prefer_cheapest", False)
    p_fastest = prefer_fastest or cfg.get("prefer_fastest", False)
    p_vision = needs_vision or cfg.get("needs_vision", False)
    p_code = needs_code or cfg.get("needs_code", False)
    p_tools = needs_tools or cfg.get("needs_tools", False)
    p_min_ctx = max(min_context, cfg.get("min_context", 4096))

    sql = """
        SELECT model_key, provider::text, display_name, api_name,
               cost_per_1k_input, cost_per_1k_output, context_window, avg_speed_ms
        FROM ai_select_model($1, $2, $3, $4, $5, $6, $7, $8)
    """
    return await fetch_one(sql, (capability, p_cheapest, p_fastest, p_vision,
                                  p_code, p_tools, p_min_ctx, provider))
