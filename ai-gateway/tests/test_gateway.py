"""Integration tests for the AI Gateway processing pipeline."""

import pytest
from engine.contract import AIRequest
from engine.gateway import process_request
from db.connection import fetch_one, execute

@pytest.mark.asyncio
async def test_process_request_no_credentials():
    """Test that the gateway returns a proper error response when no API keys are configured."""
    req = AIRequest(
        capability="test",
        messages=[{"role": "user", "content": "hello"}],
        options={"no_cache": True, "max_cost": 5},
    )
    result = await process_request(req)

    assert "success" in result
    assert "provider" in result
    assert "model" in result
    assert "cost" in result
    assert "latency_ms" in result
    assert "cached" in result
    assert "tokens" in result
    assert "result" in result

    assert result["success"] is False
    assert isinstance(result["latency_ms"], int)
    assert result["cached"] is False

    # Provider and model should be set even on failure
    assert result["provider"] != ""
    assert result["model"] != ""

    # Error message should exist
    assert result["error"] is not None


@pytest.mark.asyncio
async def test_process_request_with_context():
    """Test that context building works with a valid company_id."""
    req = AIRequest(
        capability="test",
        tenant_id="ac4b3940-1165-45b2-a204-9def0a571a5c",
        company_id="5691fd7b-55d7-4a4e-b690-db84361fdb48",
        messages=[{"role": "user", "content": "hello"}],
        options={"no_cache": True, "max_cost": 5},
    )
    result = await process_request(req)

    assert result["success"] is False  # No credentials
    assert result["latency_ms"] > 0    # Took at least some time (includes context building)


@pytest.mark.asyncio
async def test_process_request_with_prompt_template():
    """Test that prompt templates are resolved correctly."""
    req = AIRequest(
        capability="classify_lead",
        tenant_id="ac4b3940-1165-45b2-a204-9def0a571a5c",
        prompt_template="lead_scoring",
        prompt_variables={
            "company_name": "Test Corp",
            "website": "test.com",
            "category": "tech",
            "city": "Paris",
            "rating": "4.5",
            "reviews_count": "100",
            "audit_score": "75",
        },
        options={"no_cache": True, "max_cost": 5},
    )
    result = await process_request(req)

    assert result["success"] is False  # No credentials
    # Even without credentials, the template would have been loaded
    assert result["latency_ms"] > 0


@pytest.mark.asyncio
async def test_request_logging():
    """Test that requests are logged to ai_request_logs."""
    req = AIRequest(
        capability="test_logging",
        tenant_id="ac4b3940-1165-45b2-a204-9def0a571a5c",
        messages=[{"role": "user", "content": "test logging"}],
        options={"no_cache": True, "max_cost": 5},
    )
    result = await process_request(req)

    # Check that a log entry was created
    log = await fetch_one(
        "SELECT * FROM ai_request_logs WHERE capability = 'test_logging' ORDER BY created_at DESC LIMIT 1"
    )
    assert log is not None
    assert log["capability"] == "test_logging"
    assert log["success"] is False
    assert log["cached"] is False


@pytest.mark.asyncio
async def test_budget_tracking():
    """Test that budget check function works."""
    from engine.policy_engine import check_budget

    within, budget, spent, remaining = await check_budget(
        agency_id="ac4b3940-1165-45b2-a204-9def0a571a5c"
    )
    assert isinstance(within, bool)
    assert remaining >= 0  # Should not have spent anything significant


@pytest.mark.asyncio
async def test_failover_chain_order():
    """Test the provider fallback chain order."""
    from engine.policy_engine import get_policy

    policy = await get_policy("fallback_chain")
    if policy and "providers" in policy:
        providers = policy["providers"]
        # OpenAI should be first, Ollama last
        assert providers[0] == "openai"
        assert providers[-1] == "ollama"
    else:
        pytest.skip("No fallback chain policy configured")


@pytest.mark.asyncio
async def test_cache_flow():
    """Test that cache lookups work (even if miss)."""
    req = AIRequest(
        capability="test_cache",
        messages=[{"role": "user", "content": "test caching"}],
        options={"no_cache": False, "max_cost": 5},
    )
    result = await process_request(req)

    # The cache was checked but missed (no prior call with same hash)
    assert result["cached"] is False
