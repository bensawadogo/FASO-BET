"""Test the AI Gateway standard contract: request/response format, policy engine, feature flags."""

import pytest
from engine.contract import AIRequest, AIResponse

class TestContractModels:
    def test_ai_request_minimal(self):
        req = AIRequest(capability="test", messages=[{"role": "user", "content": "hi"}])
        assert req.capability == "test"
        assert req.max_cost_cents == 50
        assert req.max_latency_ms == 30000
        assert req.quality == "high"
        assert req.temperature == 0.7
        assert req.max_tokens == 4096
        assert req.no_cache is False

    def test_ai_request_with_options(self):
        req = AIRequest(
            capability="proposal_generation",
            tenant_id="agency_001",
            company_id="company_123",
            messages=[{"role": "user", "content": "write proposal"}],
            options={
                "max_cost": 10,
                "max_latency_ms": 10000,
                "quality": "high",
                "temperature": 0.3,
                "needs_vision": True,
            },
        )
        assert req.max_cost_cents == 10
        assert req.max_latency_ms == 10000
        assert req.temperature == 0.3
        assert req.needs_vision is True

    def test_ai_request_with_prompt_template(self):
        req = AIRequest(
            capability="generate_email",
            tenant_id="agency_001",
            prompt_template="email_outreach",
            prompt_variables={"company_name": "Acme Corp", "contact_name": "John"},
        )
        assert req.prompt_template == "email_outreach"
        assert req.prompt_variables["company_name"] == "Acme Corp"

    def test_ai_response_contract(self):
        resp = AIResponse(
            success=True,
            provider="anthropic",
            model="claude-3-5-sonnet",
            cost=0.023,
            latency_ms=2450,
            cached=False,
            tokens={"input": 1450, "output": 820, "total": 2270},
            result={"title": "Proposal", "summary": "Test"},
        )
        data = resp.model_dump()
        assert data["success"] is True
        assert data["provider"] == "anthropic"
        assert data["cost"] == 0.023
        assert data["tokens"]["input"] == 1450
        assert "error" not in data or data["error"] is None

    def test_ai_response_error(self):
        resp = AIResponse(
            success=False,
            provider="openai",
            model="gpt-4o",
            cost=0.0,
            latency_ms=500,
            cached=False,
            tokens={"input": 0, "output": 0, "total": 0},
            result={},
            error="API key missing",
        )
        assert resp.success is False
        assert resp.error == "API key missing"


class TestPolicyEngine:
    @pytest.mark.asyncio
    async def test_get_policy_global(self):
        from engine.policy_engine import get_policy, get_max_latency, get_max_budget_per_request

        latency = await get_max_latency()
        assert isinstance(latency, int)
        assert latency > 0

        budget = await get_max_budget_per_request()
        assert isinstance(budget, int)
        assert budget > 0

    @pytest.mark.asyncio
    async def test_get_fallback_chain(self):
        from engine.policy_engine import get_policy

        policy = await get_policy("fallback_chain")
        if policy and "providers" in policy:
            providers = policy["providers"]
            assert "openai" in providers
            assert isinstance(providers, list)

    @pytest.mark.asyncio
    async def test_check_budget(self):
        from engine.policy_engine import check_budget

        within, budget, spent, remaining = await check_budget()
        assert isinstance(within, bool)
        assert isinstance(budget, (int, float))
        assert isinstance(remaining, (int, float))


class TestFeatureFlags:
    @pytest.mark.asyncio
    async def test_cache_enabled(self):
        from engine.feature_flags import is_enabled

        enabled = await is_enabled("cache_enabled")
        assert isinstance(enabled, bool)

    @pytest.mark.asyncio
    async def test_knowledge_rag_disabled_by_default(self):
        from engine.feature_flags import is_enabled

        enabled = await is_enabled("knowledge_rag")
        assert enabled is False

    @pytest.mark.asyncio
    async def test_provider_failover_enabled(self):
        from engine.feature_flags import is_enabled

        enabled = await is_enabled("provider_failover")
        assert enabled is True
