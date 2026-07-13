import time
import json
import hashlib
from uuid import uuid4
from engine.contract import AIRequest, AIResponse, ProviderResult
from engine.provider_chain import execute_with_failover
from engine.context_builder import build_context, format_context
from engine.policy_engine import check_budget, get_max_budget_per_request, get_max_latency
from engine.feature_flags import is_enabled
from db.connection import execute, fetch_one

async def process_request(req: AIRequest) -> dict:
    request_id = str(uuid4())
    start = time.time()

    # ── Resolve prompt template ──
    messages = list(req.messages)
    if req.prompt_template:
        tmpl = await fetch_one(
            "SELECT * FROM ai_prompt_templates WHERE template_key = $1 AND status = 'active'",
            (req.prompt_template,),
        )
        if tmpl:
            user_prompt = tmpl["user_prompt"]
            for k, v in req.prompt_variables.items():
                user_prompt = user_prompt.replace("{{" + k + "}}", str(v))
            if tmpl["system_prompt"]:
                messages.insert(0, {"role": "system", "content": tmpl["system_prompt"]})
            messages.append({"role": "user", "content": user_prompt})

    # ── Build context ──
    context_parts = await build_context(req.company_id, req.context)
    context_str = format_context(context_parts)
    if context_str:
        messages.insert(0, {"role": "system", "content": context_str})

    # ── Check cache (if enabled) ──
    cache_enabled = await is_enabled("cache_enabled", req.tenant_id, req.company_id)
    cache_hash = hashlib.sha256(json.dumps({"m": messages, "c": req.capability, "o": req.options}, sort_keys=True).encode()).hexdigest()
    if cache_enabled and not req.no_cache:
        cached = await fetch_one(
            "SELECT response FROM ai_cache WHERE cache_hash = $1 AND (expires_at IS NULL OR expires_at > NOW())",
            (cache_hash,),
        )
        if cached:
            cached_resp = cached["response"]
            cached_resp["cached"] = True
            latency = int((time.time() - start) * 1000)
            cached_resp["latency_ms"] = latency
            await log_request(request_id, req, "cache", "cache", 0, 0, 0, latency, True, True)
            return cached_resp

    # ── Budget check ──
    max_cost = req.max_cost_cents
    within, budget, spent, remaining = await check_budget(req.tenant_id, req.company_id)
    if not within:
        return error_response("Monthly budget exceeded", request_id, start)

    max_latency = await get_max_latency(req.tenant_id, req.company_id)
    max_cost = min(max_cost, await get_max_budget_per_request(req.tenant_id, req.company_id))

    # ── Execute with failover ──
    result = await execute_with_failover(
        capability=req.capability,
        messages=messages,
        temperature=req.temperature,
        max_tokens=req.max_tokens,
        max_cost_cents=max_cost,
        max_latency_ms=max_latency,
        quality=req.quality,
        agency_id=req.tenant_id,
        company_id=req.company_id,
        prefer_cheapest=req.prefer_cheapest,
        prefer_fastest=req.prefer_fastest,
        needs_vision=req.needs_vision,
        needs_code=req.needs_code,
    )

    latency = int((time.time() - start) * 1000)
    success = result.error is None

    # ── Build response ──
    response = AIResponse(
        success=success,
        provider=result.provider,
        model=result.model_key,
        cost=result.cost,
        latency_ms=latency,
        cached=False,
        tokens={
            "input": result.input_tokens,
            "output": result.output_tokens,
            "total": result.total_tokens,
        },
        result=try_parse_json(result.content),
        error=result.error,
    ).model_dump()

    # ── Cache on success ──
    if cache_enabled and success and not req.no_cache:
        await execute(
            "INSERT INTO ai_cache (cache_key, cache_hash, prompt_key, model_used, input_tokens, output_tokens, response, expires_at) "
            "VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW() + INTERVAL '1 day') "
            "ON CONFLICT (cache_hash) DO UPDATE SET hit_count = ai_cache.hit_count + 1",
            (cache_hash, cache_hash, req.prompt_template, result.model_key,
             result.input_tokens, result.output_tokens, json.dumps(response)),
        )

    # ── Log request ──
    await log_request(
        request_id, req, result.provider, result.model_key,
        result.input_tokens, result.output_tokens, result.cost * 100,
        latency, False, success, result.error,
    )

    return response


async def log_request(request_id: str, req: AIRequest, provider: str, model_key: str,
                      input_tokens: int, output_tokens: int, cost_cents: float,
                      latency_ms: int, cached: bool, success: bool, error: str = None):
    cost_tracking = await is_enabled("cost_tracking", req.tenant_id, req.company_id)
    if not cost_tracking:
        return
    await execute(
        "SELECT ai_log_request($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15)",
        (request_id, req.tenant_id, req.company_id, req.capability, provider, model_key,
         input_tokens, output_tokens, cost_cents, latency_ms, cached, success, error,
         json.dumps(req.model_dump()), str(req.context.get("summary", ""))),
    )


def try_parse_json(content: str) -> dict:
    if not content:
        return {}
    content = content.strip()
    if content.startswith("{"):
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            pass
    if content.startswith("```"):
        lines = content.split("\n")
        for l in lines:
            if l.startswith("{"):
                try:
                    return json.loads(l)
                except json.JSONDecodeError:
                    pass
    return {"text": content}


def error_response(msg: str, request_id: str, start: float) -> dict:
    return {
        "success": False,
        "provider": "none",
        "model": "none",
        "cost": 0,
        "latency_ms": int((time.time() - start) * 1000),
        "cached": False,
        "tokens": {"input": 0, "output": 0, "total": 0},
        "result": {},
        "error": msg,
    }
