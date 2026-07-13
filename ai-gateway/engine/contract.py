from pydantic import BaseModel
from typing import Optional
from uuid import uuid4

# ──────────────────────────────────────────
# Standard Request Contract
# ──────────────────────────────────────────

class AIRequest(BaseModel):
    capability: str
    tenant_id: Optional[str] = None
    company_id: Optional[str] = None
    context: dict = {}
    options: dict = {}
    messages: list = []
    prompt_template: Optional[str] = None
    prompt_variables: dict = {}

    @property
    def max_cost_cents(self) -> int:
        return self.options.get("max_cost", 50)

    @property
    def max_latency_ms(self) -> int:
        return self.options.get("max_latency_ms", 30000)

    @property
    def quality(self) -> str:
        return self.options.get("quality", "high")

    @property
    def prefer_cheapest(self) -> bool:
        return self.options.get("prefer_cheapest", False)

    @property
    def prefer_fastest(self) -> bool:
        return self.options.get("prefer_fastest", False)

    @property
    def needs_vision(self) -> bool:
        return self.options.get("needs_vision", False)

    @property
    def needs_code(self) -> bool:
        return self.options.get("needs_code", False)

    @property
    def temperature(self) -> float:
        return self.options.get("temperature", 0.7)

    @property
    def max_tokens(self) -> int:
        return self.options.get("max_tokens", 4096)

    @property
    def no_cache(self) -> bool:
        return self.options.get("no_cache", False)


# ──────────────────────────────────────────
# Standard Response Contract
# ──────────────────────────────────────────

class AIResponse(BaseModel):
    success: bool
    provider: str
    model: str
    cost: float
    latency_ms: int
    cached: bool
    tokens: dict
    result: dict
    error: Optional[str] = None


# ──────────────────────────────────────────
# Provider Result (internal)
# ──────────────────────────────────────────

class ProviderResult(BaseModel):
    provider: str
    model_key: str
    api_name: str
    content: str
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    cost: float = 0.0
    latency_ms: int = 0
    cached: bool = False
    error: Optional[str] = None
