-- ============================================================================
-- AgencyOS — AI Gateway: Model Registry, Prompt Registry, Cache, Memory
-- Couche d'abstraction IA indépendante de n8n
-- ============================================================================

-- ############################################################################
-- ENUMS
-- ############################################################################
CREATE TYPE ai_model_provider AS ENUM ('openai', 'anthropic', 'google', 'ollama', 'mistral', 'groq', 'other');
CREATE TYPE ai_capability_type AS ENUM ('chat', 'completion', 'embedding', 'vision', 'code', 'audio', 'image');
CREATE TYPE ai_prompt_status AS ENUM ('draft', 'active', 'deprecated', 'archived');
CREATE TYPE ai_benchmark_metric AS ENUM ('quality', 'speed', 'cost', 'error_rate', 'relevance', 'accuracy');
CREATE TYPE ai_memory_type AS ENUM ('short_term', 'long_term', 'episodic', 'semantic');

-- ############################################################################
-- TABLE: ai_models — Model Registry (WF-030)
-- ############################################################################
CREATE TABLE ai_models (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_key       TEXT NOT NULL UNIQUE,
  provider        ai_model_provider NOT NULL,
  display_name    TEXT NOT NULL,
  api_name        TEXT NOT NULL,
  version         TEXT,
  context_window  INTEGER NOT NULL DEFAULT 4096,
  max_output      INTEGER DEFAULT 4096,
  cost_per_1k_input  NUMERIC(10,6) NOT NULL DEFAULT 0,
  cost_per_1k_output NUMERIC(10,6) NOT NULL DEFAULT 0,
  supports_vision BOOLEAN DEFAULT false,
  supports_code  BOOLEAN DEFAULT false,
  supports_json  BOOLEAN DEFAULT true,
  supports_streaming BOOLEAN DEFAULT true,
  supports_tools BOOLEAN DEFAULT false,
  supports_embeddings BOOLEAN DEFAULT false,
  avg_speed_ms   INTEGER,
  priority       INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  is_available   BOOLEAN DEFAULT true,
  is_default     BOOLEAN DEFAULT false,
  rate_limit_rpm INTEGER,
  rate_limit_tpm INTEGER,
  metadata       JSONB DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_models_provider ON ai_models (provider);
CREATE INDEX idx_ai_models_available ON ai_models (is_available);
CREATE INDEX idx_ai_models_priority ON ai_models (priority DESC);

-- ############################################################################
-- TABLE: ai_prompt_templates — Prompt Registry (WF-027)
-- ############################################################################
CREATE TABLE ai_prompt_templates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_key    TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT,
  capability      TEXT NOT NULL,
  system_prompt   TEXT NOT NULL,
  user_prompt     TEXT NOT NULL,
  variables       JSONB DEFAULT '[]'::jsonb,
  output_schema   JSONB,
  model_preference TEXT,
  status          ai_prompt_status NOT NULL DEFAULT 'draft',
  version         INTEGER NOT NULL DEFAULT 1,
  author          TEXT DEFAULT 'system',
  avg_cost        NUMERIC(10,6),
  success_rate    NUMERIC(5,2),
  total_calls     INTEGER DEFAULT 0,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_prompts_capability ON ai_prompt_templates (capability);
CREATE INDEX idx_ai_prompts_status ON ai_prompt_templates (status);
CREATE INDEX idx_ai_prompts_key ON ai_prompt_templates (template_key);

-- ############################################################################
-- TABLE: ai_prompt_versions — Historique des versions
-- ############################################################################
CREATE TABLE ai_prompt_versions (
  id              BIGSERIAL PRIMARY KEY,
  template_id     UUID NOT NULL REFERENCES ai_prompt_templates(id) ON DELETE CASCADE,
  version         INTEGER NOT NULL,
  system_prompt   TEXT NOT NULL,
  user_prompt     TEXT NOT NULL,
  variables       JSONB DEFAULT '[]'::jsonb,
  changelog       TEXT,
  author          TEXT DEFAULT 'system',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(template_id, version)
);

CREATE INDEX idx_ai_prompt_versions_template ON ai_prompt_versions (template_id);

-- ############################################################################
-- TABLE: ai_cache — Cache de réponses (WF-029)
-- ############################################################################
CREATE TABLE ai_cache (
  id              BIGSERIAL PRIMARY KEY,
  cache_key       TEXT NOT NULL,
  cache_hash      TEXT NOT NULL,
  prompt_key      TEXT,
  model_used      TEXT,
  input_tokens    INTEGER DEFAULT 0,
  output_tokens   INTEGER DEFAULT 0,
  response        JSONB NOT NULL,
  metadata        JSONB DEFAULT '{}'::jsonb,
  hit_count       INTEGER DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  UNIQUE(cache_hash)
);

CREATE INDEX idx_ai_cache_key ON ai_cache (cache_key);
CREATE INDEX idx_ai_cache_hash ON ai_cache (cache_hash);
CREATE INDEX idx_ai_cache_expires ON ai_cache (expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_ai_cache_prompt ON ai_cache (prompt_key);

-- ############################################################################
-- TABLE: ai_benchmarks — Benchmark Engine (WF-031)
-- ############################################################################
CREATE TABLE ai_benchmarks (
  id              BIGSERIAL PRIMARY KEY,
  benchmark_key   TEXT NOT NULL,
  prompt_key      TEXT NOT NULL,
  model_key       TEXT NOT NULL,
  provider        ai_model_provider NOT NULL,
  metric          ai_benchmark_metric NOT NULL,
  score           NUMERIC(5,2) NOT NULL,
  duration_ms     INTEGER,
  cost            NUMERIC(10,6),
  tokens_used     INTEGER,
  error           TEXT,
  metadata        JSONB DEFAULT '{}'::jsonb,
  ran_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_benchmarks_key ON ai_benchmarks (benchmark_key);
CREATE INDEX idx_ai_benchmarks_prompt ON ai_benchmarks (prompt_key);
CREATE INDEX idx_ai_benchmarks_model ON ai_benchmarks (model_key);
CREATE INDEX idx_ai_benchmarks_ran ON ai_benchmarks (ran_at DESC);

-- ############################################################################
-- TABLE: ai_memory — Memory Engine (WF-033)
-- ############################################################################
CREATE TABLE ai_memory (
  id              BIGSERIAL PRIMARY KEY,
  memory_type     ai_memory_type NOT NULL DEFAULT 'short_term',
  session_id      TEXT,
  company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
  agent_id        TEXT,
  role            TEXT NOT NULL DEFAULT 'user',
  content         TEXT NOT NULL,
  tokens          INTEGER DEFAULT 0,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ
);

CREATE INDEX idx_ai_memory_type ON ai_memory (memory_type);
CREATE INDEX idx_ai_memory_session ON ai_memory (session_id);
CREATE INDEX idx_ai_memory_company ON ai_memory (company_id);
CREATE INDEX idx_ai_memory_created ON ai_memory (created_at DESC);
CREATE INDEX idx_ai_memory_expires ON ai_memory (expires_at) WHERE expires_at IS NOT NULL;

-- ############################################################################
-- TABLE: ai_context_collections — Knowledge Base (WF-032)
-- ############################################################################
CREATE TABLE ai_context_collections (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_key  TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT,
  embedding_model TEXT DEFAULT 'text-embedding-3-small',
  metadata        JSONB DEFAULT '{}'::jsonb,
  document_count  INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ############################################################################
-- TABLE: ai_context_documents — Documents dans les collections
-- ############################################################################
CREATE TABLE ai_context_documents (
  id              BIGSERIAL PRIMARY KEY,
  collection_id   UUID NOT NULL REFERENCES ai_context_collections(id) ON DELETE CASCADE,
  document_key    TEXT NOT NULL,
  title           TEXT,
  content         TEXT NOT NULL,
  source          TEXT,
  company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,
  tokens          INTEGER DEFAULT 0,
  embedding       JSONB,  -- VECTOR(1536) requires pgvector extension
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(collection_id, document_key)
);

CREATE INDEX idx_ai_docs_collection ON ai_context_documents (collection_id);
CREATE INDEX idx_ai_docs_source ON ai_context_documents (source);
CREATE INDEX idx_ai_docs_company ON ai_context_documents (company_id);

-- ############################################################################
-- FONCTION: router — Sélectionner le meilleur modèle pour une tâche
-- ############################################################################
CREATE OR REPLACE FUNCTION ai_select_model(
  p_capability    TEXT DEFAULT 'chat',
  p_prefer_cheapest BOOLEAN DEFAULT false,
  p_prefer_fastest BOOLEAN DEFAULT false,
  p_needs_vision  BOOLEAN DEFAULT false,
  p_needs_code    BOOLEAN DEFAULT false,
  p_needs_tools   BOOLEAN DEFAULT false,
  p_min_context   INTEGER DEFAULT 4096,
  p_provider      TEXT DEFAULT NULL
) RETURNS TABLE (
  model_key TEXT,
  provider ai_model_provider,
  display_name TEXT,
  api_name TEXT,
  cost_per_1k_input NUMERIC,
  cost_per_1k_output NUMERIC,
  context_window INTEGER,
  avg_speed_ms INTEGER,
  priority INTEGER
) AS $func$
BEGIN
  RETURN QUERY
  SELECT
    m.model_key,
    m.provider,
    m.display_name,
    m.api_name,
    m.cost_per_1k_input,
    m.cost_per_1k_output,
    m.context_window,
    m.avg_speed_ms,
    m.priority
  FROM ai_models m
  WHERE m.is_available = true
    AND m.context_window >= p_min_context
    AND (p_provider IS NULL OR m.provider::text = p_provider)
    AND (p_needs_vision = false OR m.supports_vision = true)
    AND (p_needs_code = false OR m.supports_code = true)
    AND (p_needs_tools = false OR m.supports_tools = true)
  ORDER BY
    CASE WHEN p_prefer_cheapest THEN m.cost_per_1k_input ELSE 0 END ASC,
    CASE WHEN p_prefer_fastest THEN m.avg_speed_ms ELSE 0 END ASC NULLS LAST,
    m.priority DESC,
    m.is_default DESC
  LIMIT 1;
END;
$func$ LANGUAGE plpgsql STABLE;

-- ############################################################################
-- FONCTION: cache — Obtenir/réinscrire dans le cache
-- ############################################################################
CREATE OR REPLACE FUNCTION ai_cache_get(p_cache_hash TEXT)
RETURNS TABLE (response JSONB, hit_count INTEGER, model_used TEXT) AS $func$
BEGIN
  RETURN QUERY
  UPDATE ai_cache
  SET hit_count = hit_count + 1
  WHERE cache_hash = p_cache_hash
    AND (expires_at IS NULL OR expires_at > NOW())
  RETURNING response, hit_count, model_used;
END;
$func$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION ai_cache_set(
  p_cache_key   TEXT,
  p_cache_hash  TEXT,
  p_response    JSONB,
  p_prompt_key  TEXT DEFAULT NULL,
  p_model_used  TEXT DEFAULT NULL,
  p_input_tokens INTEGER DEFAULT 0,
  p_output_tokens INTEGER DEFAULT 0,
  p_ttl_minutes INTEGER DEFAULT 1440
) RETURNS VOID AS $func$
BEGIN
  INSERT INTO ai_cache (cache_key, cache_hash, prompt_key, model_used, input_tokens, output_tokens, response, expires_at)
  VALUES (p_cache_key, p_cache_hash, p_prompt_key, p_model_used, p_input_tokens, p_output_tokens, p_response, NOW() + (p_ttl_minutes || ' minutes')::INTERVAL)
  ON CONFLICT (cache_hash) DO UPDATE
  SET response = p_response, expires_at = NOW() + (p_ttl_minutes || ' minutes')::INTERVAL, hit_count = ai_cache.hit_count + 1;
END;
$func$ LANGUAGE plpgsql;

-- ############################################################################
-- FONCTION: memory — Nettoyage automatique de la mémoire court terme
-- ############################################################################
CREATE OR REPLACE FUNCTION ai_clean_short_term_memory()
RETURNS VOID AS $func$
BEGIN
  DELETE FROM ai_memory
  WHERE memory_type = 'short_term'
    AND (expires_at IS NOT NULL AND expires_at < NOW());
END;
$func$ LANGUAGE plpgsql;

-- ############################################################################
-- SEED: Modèles par défaut
-- ############################################################################
INSERT INTO ai_models (model_key, provider, display_name, api_name, version, context_window, max_output, cost_per_1k_input, cost_per_1k_output, supports_vision, supports_code, supports_json, supports_tools, avg_speed_ms, priority, is_default) VALUES
('gpt-4o', 'openai', 'GPT-4o', 'gpt-4o', '2024-08-06', 128000, 16384, 0.005, 0.015, true, true, true, true, 1200, 8, true),
('gpt-4o-mini', 'openai', 'GPT-4o Mini', 'gpt-4o-mini', '2024-07-18', 128000, 16384, 0.00015, 0.0006, true, true, true, true, 600, 7, false),
('claude-3.5-sonnet', 'anthropic', 'Claude 3.5 Sonnet', 'claude-3-5-sonnet-20241022', '2024-10-22', 200000, 8192, 0.003, 0.015, true, true, true, true, 1500, 9, false),
('gemini-1.5-pro', 'google', 'Gemini 1.5 Pro', 'gemini-1.5-pro', 'latest', 1000000, 8192, 0.0035, 0.0105, true, true, true, false, 2000, 6, false),
('gemini-1.5-flash', 'google', 'Gemini 1.5 Flash', 'gemini-1.5-flash', 'latest', 1000000, 8192, 0.000075, 0.0003, true, true, true, false, 500, 5, false),
('mistral-large', 'mistral', 'Mistral Large', 'mistral-large-latest', 'latest', 128000, 8192, 0.002, 0.006, false, true, true, true, 1000, 4, false),
('ollama-llama3', 'ollama', 'Llama 3 (Local)', 'llama3', 'latest', 8192, 4096, 0, 0, false, true, true, false, 3000, 3, false),
('ollama-mistral', 'ollama', 'Mistral (Local)', 'mistral', 'latest', 8192, 4096, 0, 0, false, true, true, false, 2500, 2, false);

-- ############################################################################
-- SEED: Collections Knowledge Base par défaut
-- ############################################################################
INSERT INTO ai_context_collections (collection_key, name, description) VALUES
('audits', 'Audits', 'Rapports d''audits précédents pour référence'),
('proposals', 'Propositions', 'Devis et propositions acceptés et refusés'),
('clients', 'Clients', 'Informations et historique des clients'),
('objections', 'Objections', 'Objections commerciales et réponses efficaces'),
('emails', 'Emails', 'Modèles d''emails et campagnes passées'),
('seo', 'SEO', 'Bonnes pratiques et stratégies SEO'),
('marketing', 'Marketing', 'Stratégies et campagnes marketing'),
('automations', 'Automatisations', 'Cas d''automatisation déployés'),
('errors', 'Erreurs', 'Erreurs système et résolutions'),
('best_practices', 'Best Practices', 'Bonnes pratiques générales AgencyOS');

-- ############################################################################
-- RLS
-- ############################################################################
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_context_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_context_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_models_select ON ai_models FOR SELECT USING (true);
CREATE POLICY ai_prompts_select ON ai_prompt_templates FOR SELECT USING (true);
CREATE POLICY ai_cache_select ON ai_cache FOR SELECT USING (true);
CREATE POLICY ai_cache_insert ON ai_cache FOR INSERT WITH CHECK (true);
CREATE POLICY ai_benchmarks_select ON ai_benchmarks FOR SELECT USING (true);
CREATE POLICY ai_benchmarks_insert ON ai_benchmarks FOR INSERT WITH CHECK (true);
CREATE POLICY ai_memory_select ON ai_memory FOR SELECT
  USING (company_id IS NULL OR user_can_access_company(company_id));
CREATE POLICY ai_memory_insert ON ai_memory FOR INSERT WITH CHECK (true);
CREATE POLICY ai_collections_select ON ai_context_collections FOR SELECT USING (true);
CREATE POLICY ai_docs_select ON ai_context_documents FOR SELECT
  USING (company_id IS NULL OR user_can_access_company(company_id));
CREATE POLICY ai_docs_insert ON ai_context_documents FOR INSERT WITH CHECK (true);

-- Trigger updated_at
CREATE TRIGGER trg_ai_models_updated_at BEFORE UPDATE ON ai_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_ai_prompts_updated_at BEFORE UPDATE ON ai_prompt_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_ai_collections_updated_at BEFORE UPDATE ON ai_context_collections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_ai_docs_updated_at BEFORE UPDATE ON ai_context_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
