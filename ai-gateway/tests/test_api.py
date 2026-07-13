"""HTTP-level integration tests for the AI Gateway API."""

import pytest
from httpx import AsyncClient, ASGITransport
from main import app

BASE_URL = "http://test"

@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url=BASE_URL) as ac:
        yield ac

@pytest.mark.asyncio
async def test_health_endpoint(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["service"] == "ai-gateway"

@pytest.mark.asyncio
async def test_v1_models(client):
    resp = await client.get("/v1/models")
    assert resp.status_code == 200
    data = resp.json()
    assert "models" in data
    assert len(data["models"]) >= 8

@pytest.mark.asyncio
async def test_v1_models_select(client):
    resp = await client.get("/v1/models/select?capability=code_review")
    assert resp.status_code == 200
    data = resp.json()
    assert "model" in data
    assert data["model"]["model_key"] in ("claude-3.5-sonnet", "gpt-4o")

@pytest.mark.asyncio
async def test_v1_models_detail(client):
    resp = await client.get("/v1/models/gpt-4o")
    assert resp.status_code == 200
    data = resp.json()
    assert data["model"]["model_key"] == "gpt-4o"

@pytest.mark.asyncio
async def test_v1_prompts(client):
    resp = await client.get("/v1/prompts")
    assert resp.status_code == 200
    data = resp.json()
    assert "prompts" in data
    assert len(data["prompts"]) >= 5

@pytest.mark.asyncio
async def test_v1_prompts_detail(client):
    resp = await client.get("/v1/prompts/lead_scoring")
    assert resp.status_code == 200
    data = resp.json()
    assert data["prompt"]["template_key"] == "lead_scoring"

@pytest.mark.asyncio
async def test_v1_chat_missing_capability(client):
    resp = await client.post("/v1/chat", json={"messages": [{"role": "user", "content": "hi"}]})
    assert resp.status_code == 422

@pytest.mark.asyncio
async def test_v1_chat_contract(client):
    resp = await client.post("/v1/chat", json={
        "capability": "test",
        "messages": [{"role": "user", "content": "hello"}],
        "options": {"no_cache": True, "max_cost": 5},
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "success" in data
    assert "provider" in data
    assert "model" in data
    assert "cost" in data
    assert "latency_ms" in data
    assert "cached" in data
    assert "tokens" in data
    assert "result" in data

@pytest.mark.asyncio
async def test_v1_chat_with_prompt(client):
    resp = await client.post("/v1/chat", json={
        "capability": "classify_lead",
        "tenant_id": "ac4b3940-1165-45b2-a204-9def0a571a5c",
        "prompt_template": "lead_scoring",
        "prompt_variables": {
            "company_name": "Test Corp",
            "website": "test.com",
            "category": "tech",
            "city": "Paris",
            "rating": "4.5",
            "reviews_count": "100",
            "audit_score": "75",
        },
        "options": {"no_cache": True, "max_cost": 5},
    })
    assert resp.status_code == 200

@pytest.mark.asyncio
async def test_v2_chat_contract(client):
    """v2 should follow the exact same contract as v1."""
    resp = await client.post("/v2/chat", json={
        "capability": "test",
        "messages": [{"role": "user", "content": "hello v2"}],
        "options": {"no_cache": True, "max_cost": 5},
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "success" in data
    assert "provider" in data
    assert "model" in data

@pytest.mark.asyncio
async def test_v1_generate(client):
    resp = await client.post("/v1/generate", json={
        "capability": "classify_lead",
        "prompt_template": "lead_scoring",
        "prompt_variables": {
            "company_name": "Test Corp",
            "website": "test.com",
            "category": "tech",
            "city": "Paris",
            "rating": "4.5",
            "reviews_count": "100",
            "audit_score": "75",
        },
        "options": {"no_cache": True, "max_cost": 5},
    })
    assert resp.status_code == 200

@pytest.mark.asyncio
async def test_v1_proposals(client):
    resp = await client.post("/v1/proposals", json={
        "capability": "generate_proposal",
        "company_id": "5691fd7b-55d7-4a4e-b690-db84361fdb48",
        "messages": [{"role": "user", "content": "write a proposal"}],
        "options": {"no_cache": True, "max_cost": 5},
    })
    assert resp.status_code == 200
