-- ############################################################################
-- MIGRATION 00008 — AI Gateway v2 : Policies, Feature Flags, Multi-tenant
-- ############################################################################

-- Enums
DO $$ BEGIN
  CREATE TYPE ai_policy_scope AS ENUM ('global', 'agency', 'company');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ai_policy_action AS ENUM ('allow', 'deny', 'fallback', 'downgrade');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE feature_flag_target AS ENUM ('global', 'agency', 'company', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ############################################################################
-- TABLE: ai_policies
-- ############################################################################
CREATE TABLE IF NOT EXISTS ai_policies (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scope               ai_policy_scope NOT NULL DEFAULT 'global',
  agency_id           UUID REFERENCES companies(id) ON DELETE CASCADE,
  company_id          UUID REFERENCES companies(id) ON DELETE CASCADE,
  policy_key          TEXT NOT NULL,
  policy_type         TEXT NOT NULL CHECK (policy_type IN (
                          'budget_monthly_cents',
                          'budget_per_request_cents',
                          'max_latency_ms',
                          'forbidden_models',
                          'preferred_models',
                          'allowed_providers',
                          'fallback_chain',
                          'daily_request_limit',
                          'concurrent_request_limit',
                          'max_context_window',
                          'max_output_tokens',
                          'quality_tier'
                        )),
  value               JSONB NOT NULL,
  priority            INTEGER NOT NULL DEFAULT 0,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  description         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(scope, policy_key)  -- application-level uniqueness for simplicity; use unique partial indexes for production
);

CREATE INDEX IF NOT EXISTS idx_ai_policies_scope ON ai_policies (scope);
CREATE INDEX IF NOT EXISTS idx_ai_policies_agency ON ai_policies (agency_id) WHERE agency_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_policies_company ON ai_policies (company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_policies_active ON ai_policies (is_active) WHERE is_active = true;

-- ############################################################################
-- TABLE: feature_flags
-- ############################################################################
CREATE TABLE IF NOT EXISTS feature_flags (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flag_key            TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  description         TEXT,
  target              feature_flag_target NOT NULL DEFAULT 'global',
  agency_id           UUID REFERENCES companies(id) ON DELETE CASCADE,
  company_id          UUID REFERENCES companies(id) ON DELETE CASCADE,
  enabled             BOOLEAN NOT NULL DEFAULT false,
  config              JSONB DEFAULT '{}'::jsonb,
  owner               TEXT DEFAULT 'system',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags (flag_key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_target ON feature_flags (target);

-- ############################################################################
-- TABLE: ai_request_logs — Audit trail for all AI requests
-- ############################################################################
CREATE TABLE IF NOT EXISTS ai_request_logs (
  id                  BIGSERIAL PRIMARY KEY,
  request_id          UUID NOT NULL,
  agency_id           UUID,
  company_id          UUID,
  capability          TEXT NOT NULL,
  provider            TEXT NOT NULL,
  model_key           TEXT NOT NULL,
  input_tokens        INTEGER DEFAULT 0,
  output_tokens       INTEGER DEFAULT 0,
  cost_cents          NUMERIC(10,4) DEFAULT 0,
  latency_ms          INTEGER,
  cached              BOOLEAN DEFAULT false,
  success             BOOLEAN DEFAULT true,
  error_message       TEXT,
  request_body        JSONB,
  response_summary    TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_logs_request ON ai_request_logs (request_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_agency ON ai_request_logs (agency_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_company ON ai_request_logs (company_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created ON ai_request_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_ai_logs_capability ON ai_request_logs (capability);

-- ############################################################################
-- FUNCTIONS: Policy resolution
-- ############################################################################

-- Get effective policy for a given agency/company (most specific wins)
CREATE OR REPLACE FUNCTION ai_get_policy(
  p_agency_id UUID DEFAULT NULL,
  p_company_id UUID DEFAULT NULL,
  p_policy_type TEXT DEFAULT NULL
) RETURNS TABLE (
  policy_key TEXT,
  policy_type TEXT,
  value JSONB,
  scope ai_policy_scope
) AS $func$
BEGIN
  RETURN QUERY
  SELECT p.policy_key, p.policy_type, p.value, p.scope
  FROM ai_policies p
  WHERE p.is_active = true
    AND (p_policy_type IS NULL OR p.policy_type = p_policy_type)
    AND (
      (p.scope = 'global')
      OR (p.scope = 'agency' AND p.agency_id = p_agency_id)
      OR (p.scope = 'company' AND p.company_id = p_company_id)
      OR (p.scope = 'agency' AND p.agency_id IS NULL AND p_agency_id IS NULL)
    )
  ORDER BY
    CASE p.scope
      WHEN 'company' THEN 3
      WHEN 'agency' THEN 2
      WHEN 'global' THEN 1
    END DESC,
    p.priority DESC
  LIMIT 1;
END;
$func$ LANGUAGE plpgsql STABLE;

-- Check if feature is enabled for a given agency/company
CREATE OR REPLACE FUNCTION ai_feature_enabled(
  p_flag_key TEXT,
  p_agency_id UUID DEFAULT NULL,
  p_company_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $func$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  -- Check most specific first: company > agency > global
  SELECT f.enabled INTO v_enabled
  FROM feature_flags f
  WHERE f.flag_key = p_flag_key
    AND (
      (f.target = 'company' AND f.company_id = p_company_id)
      OR (f.target = 'agency' AND f.agency_id = p_agency_id)
      OR (f.target = 'global' AND f.agency_id IS NULL AND f.company_id IS NULL)
    )
  ORDER BY
    CASE f.target
      WHEN 'company' THEN 3
      WHEN 'agency' THEN 2
      WHEN 'global' THEN 1
    END DESC
  LIMIT 1;

  RETURN COALESCE(v_enabled, false);
END;
$func$ LANGUAGE plpgsql STABLE;

-- Track AI request
CREATE OR REPLACE FUNCTION ai_log_request(
  p_request_id UUID,
  p_agency_id UUID,
  p_company_id UUID,
  p_capability TEXT,
  p_provider TEXT,
  p_model_key TEXT,
  p_input_tokens INTEGER,
  p_output_tokens INTEGER,
  p_cost_cents NUMERIC,
  p_latency_ms INTEGER,
  p_cached BOOLEAN,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL,
  p_request_body JSONB DEFAULT NULL,
  p_response_summary TEXT DEFAULT NULL
) RETURNS VOID AS $func$
BEGIN
  INSERT INTO ai_request_logs (
    request_id, agency_id, company_id, capability, provider, model_key,
    input_tokens, output_tokens, cost_cents, latency_ms, cached, success,
    error_message, request_body, response_summary
  ) VALUES (
    p_request_id, p_agency_id, p_company_id, p_capability, p_provider, p_model_key,
    p_input_tokens, p_output_tokens, p_cost_cents, p_latency_ms, p_cached, p_success,
    p_error_message, p_request_body, p_response_summary
  );
END;
$func$ LANGUAGE plpgsql;

-- Check daily budget for agency/company
CREATE OR REPLACE FUNCTION ai_check_daily_budget(
  p_agency_id UUID DEFAULT NULL,
  p_company_id UUID DEFAULT NULL
) RETURNS TABLE (
  budget_cents NUMERIC,
  spent_cents NUMERIC,
  remaining_cents NUMERIC,
  within_budget BOOLEAN
) AS $func$
DECLARE
  v_budget NUMERIC;
  v_spent NUMERIC;
BEGIN
  SELECT COALESCE((p.value->>'value')::numeric, 0)
  INTO v_budget
  FROM ai_get_policy(p_agency_id, p_company_id, 'budget_monthly_cents') p;

  SELECT COALESCE(SUM(cost_cents), 0)
  INTO v_spent
  FROM ai_request_logs
  WHERE (p_agency_id IS NULL OR agency_id = p_agency_id)
    AND (p_company_id IS NULL OR company_id = p_company_id)
    AND created_at >= DATE_TRUNC('month', NOW());

  RETURN QUERY
  SELECT
    v_budget AS budget_cents,
    v_spent AS spent_cents,
    v_budget - v_spent AS remaining_cents,
    (v_budget = 0 OR v_spent < v_budget) AS within_budget;
END;
$func$ LANGUAGE plpgsql STABLE;

-- ############################################################################
-- SEEDS: Default feature flags
-- ############################################################################
INSERT INTO feature_flags (flag_key, name, description, target, enabled, config) VALUES
('ai_router_v2', 'AI Router v2', 'Enable new provider failover routing', 'global', true, '{}'::jsonb),
('knowledge_rag', 'Knowledge RAG', 'Enable Retrieval-Augmented Generation from knowledge base', 'global', false, '{}'::jsonb),
('cache_enabled', 'Response Cache', 'Enable AI response caching', 'global', true, '{}'::jsonb),
('benchmark_enabled', 'Benchmark Mode', 'Log all AI requests for benchmarking', 'global', true, '{}'::jsonb),
('proposal_v2', 'Proposal v2', 'Enable new proposal generation format', 'global', false, '{}'::jsonb),
('cost_tracking', 'Cost Tracking', 'Track per-request AI costs', 'global', true, '{}'::jsonb),
('provider_failover', 'Provider Failover', 'Enable automatic failover between AI providers', 'global', true, '{}'::jsonb)
ON CONFLICT (flag_key) DO NOTHING;

-- ############################################################################
-- SEEDS: Default global policies
-- ############################################################################
INSERT INTO ai_policies (scope, policy_key, policy_type, value, priority, description) VALUES
('global', 'default_budget_monthly', 'budget_monthly_cents', '{"value": 10000}', 0, 'Default monthly budget: $100'),
('global', 'default_budget_per_request', 'budget_per_request_cents', '{"value": 50}', 0, 'Default max per request: $0.50'),
('global', 'default_max_latency', 'max_latency_ms', '{"value": 30000}', 0, 'Default max latency: 30s'),
('global', 'default_quality', 'quality_tier', '{"value": "high"}', 0, 'Default quality tier: high'),
('global', 'default_fallback_chain', 'fallback_chain', '{"providers": ["openai", "anthropic", "google", "mistral", "ollama"]}', 0, 'Default provider fallback order')
ON CONFLICT (scope, policy_key) DO NOTHING;

-- RLS
ALTER TABLE ai_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_request_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY ai_policies_select ON ai_policies FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY feature_flags_select ON feature_flags FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- For request logs: agency members can see their own
DO $$ BEGIN
  CREATE POLICY ai_logs_select ON ai_request_logs FOR SELECT
    USING (agency_id IS NULL OR user_can_access_company(agency_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Triggers
CREATE OR REPLACE FUNCTION trg_ai_policies_updated_at()
RETURNS TRIGGER AS $func$ BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $func$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_feature_flags_updated_at()
RETURNS TRIGGER AS $func$ BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $func$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_ai_policies_updated_at BEFORE UPDATE ON ai_policies
    FOR EACH ROW EXECUTE FUNCTION trg_ai_policies_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_feature_flags_updated_at BEFORE UPDATE ON feature_flags
    FOR EACH ROW EXECUTE FUNCTION trg_feature_flags_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
