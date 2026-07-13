import time
import json
from engine.contract import ProviderResult
from engine.router import select_model
from engine.policy_engine import get_forbidden_models, get_preferred_models
from engine.feature_flags import is_enabled

# ──────────────────────────────────────────
# Provider implementations
# ──────────────────────────────────────────

async def call_openai(model_info: dict, messages: list, temperature: float, max_tokens: int, timeout: int) -> ProviderResult:
    from openai import OpenAI
    client = OpenAI(timeout=timeout)
    start = time.time()
    resp = client.chat.completions.create(
        model=model_info["api_name"],
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    latency = int((time.time() - start) * 1000)
    choice = resp.choices[0]
    cost_input = (resp.usage.prompt_tokens / 1000) * float(model_info["cost_per_1k_input"])
    cost_output = (resp.usage.completion_tokens / 1000) * float(model_info["cost_per_1k_output"])
    return ProviderResult(
        provider="openai",
        model_key=model_info["model_key"],
        api_name=model_info["api_name"],
        content=choice.message.content,
        input_tokens=resp.usage.prompt_tokens,
        output_tokens=resp.usage.completion_tokens,
        total_tokens=resp.usage.total_tokens,
        cost=round(cost_input + cost_output, 6),
        latency_ms=latency,
    )


async def call_anthropic(model_info: dict, messages: list, temperature: float, max_tokens: int, timeout: int) -> ProviderResult:
    from anthropic import Anthropic
    client = Anthropic(timeout=timeout)
    sys_prompt = None
    anthropic_messages = []
    for m in messages:
        if m["role"] == "system":
            sys_prompt = m["content"]
        else:
            anthropic_messages.append({"role": m["role"], "content": m["content"]})
    if not anthropic_messages:
        anthropic_messages = [{"role": "user", "content": "Hello"}]

    start = time.time()
    resp = client.messages.create(
        model=model_info["api_name"],
        system=sys_prompt,
        messages=anthropic_messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    latency = int((time.time() - start) * 1000)
    content = "".join(b.text for b in resp.content if hasattr(b, "text"))
    cost_input = (resp.usage.input_tokens / 1000) * float(model_info["cost_per_1k_input"])
    cost_output = (resp.usage.output_tokens / 1000) * float(model_info["cost_per_1k_output"])
    return ProviderResult(
        provider="anthropic",
        model_key=model_info["model_key"],
        api_name=model_info["api_name"],
        content=content,
        input_tokens=resp.usage.input_tokens,
        output_tokens=resp.usage.output_tokens,
        total_tokens=resp.usage.input_tokens + resp.usage.output_tokens,
        cost=round(cost_input + cost_output, 6),
        latency_ms=latency,
    )


async def call_google(model_info: dict, messages: list, temperature: float, max_tokens: int, timeout: int) -> ProviderResult:
    from google import genai
    client = genai.Client(timeout=timeout)
    prompt = "\n".join(
        f"{m['role']}: {m['content']}" for m in messages
    )
    start = time.time()
    resp = client.models.generate_content(
        model=model_info["api_name"],
        contents=prompt,
        config={"temperature": temperature, "max_output_tokens": max_tokens},
    )
    latency = int((time.time() - start) * 1000)
    return ProviderResult(
        provider="google",
        model_key=model_info["model_key"],
        api_name=model_info["api_name"],
        content=resp.text,
        cost=float(model_info["cost_per_1k_input"]) * 0.001,
        latency_ms=latency,
    )


async def call_ollama(model_info: dict, messages: list, temperature: float, max_tokens: int, timeout: int) -> ProviderResult:
    import httpx
    ollama_url = model_info.get("metadata", {}).get("ollama_url", "http://host.docker.internal:11434")
    payload = {
        "model": model_info["api_name"],
        "messages": messages,
        "options": {"temperature": temperature, "num_predict": max_tokens},
        "stream": False,
    }
    start = time.time()
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(f"{ollama_url}/api/chat", json=payload)
        data = resp.json()
    latency = int((time.time() - start) * 1000)
    return ProviderResult(
        provider="ollama",
        model_key=model_info["model_key"],
        api_name=model_info["api_name"],
        content=data.get("message", {}).get("content", ""),
        input_tokens=data.get("prompt_eval_count", 0),
        output_tokens=data.get("eval_count", 0),
        total_tokens=data.get("prompt_eval_count", 0) + data.get("eval_count", 0),
        cost=0.0,
        latency_ms=latency,
    )


PROVIDER_MAP = {
    "openai": call_openai,
    "anthropic": call_anthropic,
    "google": call_google,
    "ollama": call_ollama,
}


# ──────────────────────────────────────────
# Main failover chain
# ──────────────────────────────────────────

async def execute_with_failover(
    capability: str,
    messages: list,
    temperature: float,
    max_tokens: int,
    max_cost_cents: int,
    max_latency_ms: int,
    quality: str,
    agency_id: str = None,
    company_id: str = None,
    prefer_cheapest: bool = False,
    prefer_fastest: bool = False,
    needs_vision: bool = False,
    needs_code: bool = False,
) -> ProviderResult:
    forbidden = await get_forbidden_models(agency_id, company_id)
    preferred = await get_preferred_models(agency_id, company_id)
    failover_enabled = await is_enabled("provider_failover", agency_id, company_id)

    chain = await get_fallback_chain(agency_id, company_id)

    first_result = None
    for provider_name in chain:
        if forbidden and provider_name in forbidden:
            continue

        # Select the best model for this provider
        selected = await select_model(
            capability=capability,
            prefer_cheapest=prefer_cheapest,
            prefer_fastest=prefer_fastest,
            needs_vision=needs_vision,
            needs_code=needs_code,
            provider=provider_name,
        )
        if not selected:
            continue

        if preferred and selected["model_key"] not in preferred:
            if failover_enabled:
                continue

        caller = PROVIDER_MAP.get(provider_name)
        if not caller:
            continue

        try:
            timeout = max(5, max_latency_ms // 1000)
            result = await caller(selected, messages, temperature, max_tokens, timeout)

            if result.error:
                if not failover_enabled:
                    return result
                if first_result is None:
                    first_result = result
                continue

            if result.cost > 0 and (result.cost * 100) > max_cost_cents:
                result.error = f"Cost ${result.cost:.4f} exceeds max ${max_cost_cents/100:.2f}"
                if not failover_enabled:
                    return result
                if first_result is None:
                    first_result = result
                continue

            if result.latency_ms > max_latency_ms:
                result.error = f"Latency {result.latency_ms}ms exceeds max {max_latency_ms}ms"
                if not failover_enabled:
                    return result
                if first_result is None:
                    first_result = result
                continue

            return result

        except Exception as e:
            err_result = ProviderResult(
                provider=provider_name,
                model_key=selected["model_key"],
                api_name=selected["api_name"],
                content="",
                error=str(e)[:200],
            )
            if not failover_enabled:
                return err_result
            if first_result is None:
                first_result = err_result

    return first_result or ProviderResult(
        provider="none",
        model_key="none",
        api_name="none",
        content="",
        error="All providers failed",
    )


async def get_fallback_chain(agency_id: str = None, company_id: str = None) -> list:
    from engine.policy_engine import get_policy
    policy = await get_policy("fallback_chain", agency_id, company_id)
    if policy and "providers" in policy:
        return policy["providers"]
    return ["openai", "anthropic", "google", "mistral", "ollama"]
