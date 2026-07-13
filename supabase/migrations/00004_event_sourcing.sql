-- ============================================================================
-- AgencyOS — Event Sourcing: Event Store, Jobs, Metrics, Memory
-- Architecture pilotée par les événements
-- Version: 1.0.0
-- ============================================================================

-- ############################################################################
-- EXTENSIONS
-- ############################################################################
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ############################################################################
-- ENUM: Standard Event Types — Plus jamais d'événements inventés à la volée
-- ############################################################################
CREATE TYPE standard_event_type AS ENUM (
  -- Découverte
  'lead_discovered', 'lead_updated', 'lead_enriched',
  -- Site web
  'website_found', 'website_not_found', 'website_audited',
  -- Réseaux sociaux
  'social_profiles_found', 'social_audit_completed',
  -- Analyse
  'seo_audit_completed', 'analysis_completed', 'lead_scored',
  -- Commercial
  'proposal_generated', 'email_generated', 'email_sent', 'email_opened',
  'meeting_booked', 'client_won', 'client_lost', 'invoice_created',
  -- Services
  'automation_installed', 'deployment_completed',
  -- Campagnes
  'campaign_started', 'campaign_finished',
  -- Système
  'workflow_started', 'workflow_completed', 'workflow_failed',
  'brain_decision_created', 'job_created', 'job_completed', 'job_failed'
);

-- ############################################################################
-- TABLE: brain_events — Event Store (append-only log)
-- Tous les événements du système, ordonnés chronologiquement
-- ############################################################################
-- Note: on remplace l'ancienne table brain_events si elle existe
DROP TABLE IF EXISTS brain_events CASCADE;

CREATE TABLE brain_events (
  id              BIGSERIAL PRIMARY KEY,
  event_uuid      UUID NOT NULL DEFAULT uuid_generate_v4(),
  event_type      standard_event_type NOT NULL,
  tenant_id       UUID REFERENCES agencies(id) ON DELETE CASCADE,
  company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
  workflow_key    TEXT,
  agent_id        TEXT,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata        JSONB DEFAULT '{}'::jsonb,
  status          TEXT DEFAULT 'new' CHECK (status IN ('new', 'processing', 'processed', 'failed')),
  priority        INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  retry_count     INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at    TIMESTAMPTZ,

  -- Index GIN pour recherche rapide dans le payload
  CONSTRAINT unique_event_uuid UNIQUE (event_uuid)
);

CREATE INDEX idx_brain_events_type ON brain_events (event_type);
CREATE INDEX idx_brain_events_company ON brain_events (company_id);
CREATE INDEX idx_brain_events_tenant ON brain_events (tenant_id);
CREATE INDEX idx_brain_events_workflow ON brain_events (workflow_key);
CREATE INDEX idx_brain_events_status ON brain_events (status);
CREATE INDEX idx_brain_events_created ON brain_events (created_at DESC);
CREATE INDEX idx_brain_events_payload ON brain_events USING GIN (payload jsonb_path_ops);

-- ############################################################################
-- TABLE: brain_jobs — File d'exécution (remplace brain_queue)
-- Le Brain crée des Jobs, des Workers les exécutent
-- ############################################################################
CREATE TABLE brain_jobs (
  id              BIGSERIAL PRIMARY KEY,
  job_uuid        UUID NOT NULL DEFAULT uuid_generate_v4(),
  capability      TEXT NOT NULL,           -- ex: 'website_audit', 'social_discovery'
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tenant_id       UUID REFERENCES agencies(id) ON DELETE CASCADE,
  event_id        BIGINT REFERENCES brain_events(id) ON DELETE SET NULL,

  priority        INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'running', 'completed', 'failed', 'cancelled', 'skipped')),

  depends_on      UUID[] DEFAULT '{}',     -- job_uuids à attendre
  input_data      JSONB DEFAULT '{}'::jsonb,
  output_data     JSONB DEFAULT '{}'::jsonb,
  error_message   TEXT,

  retry_count     INTEGER DEFAULT 0,
  max_retries     INTEGER DEFAULT 3,

  scheduled_at    TIMESTAMPTZ,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_job_uuid UNIQUE (job_uuid)
);

CREATE INDEX idx_brain_jobs_capability ON brain_jobs (capability);
CREATE INDEX idx_brain_jobs_company ON brain_jobs (company_id);
CREATE INDEX idx_brain_jobs_status ON brain_jobs (status);
CREATE INDEX idx_brain_jobs_priority ON brain_jobs (priority DESC, created_at ASC);
CREATE INDEX idx_brain_jobs_scheduled ON brain_jobs (scheduled_at) WHERE status = 'pending';

-- Vue: jobs prêts à être exécutés (dépendances résolues)
CREATE VIEW brain_ready_jobs AS
SELECT j.*, c.name AS company_name, c.status AS company_status
FROM brain_jobs j
JOIN companies c ON c.id = j.company_id
WHERE j.status = 'pending'
  AND (j.scheduled_at IS NULL OR j.scheduled_at <= NOW())
  AND NOT EXISTS (
    SELECT 1 FROM brain_jobs dep
    WHERE dep.job_uuid = ANY(j.depends_on)
    AND dep.status NOT IN ('completed', 'skipped')
  )
ORDER BY j.priority DESC, j.created_at ASC;

-- ############################################################################
-- TABLE: brain_metrics — Métriques de performance
-- ############################################################################
CREATE TABLE brain_metrics (
  id              BIGSERIAL PRIMARY KEY,
  metric_name     TEXT NOT NULL,
  metric_type     TEXT NOT NULL CHECK (metric_type IN ('counter', 'gauge', 'timer', 'histogram')),
  value           NUMERIC NOT NULL,
  unit            TEXT,
  workflow_key    TEXT,
  company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
  tenant_id       UUID REFERENCES agencies(id) ON DELETE CASCADE,
  tags            JSONB DEFAULT '{}'::jsonb,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_brain_metrics_name ON brain_metrics (metric_name);
CREATE INDEX idx_brain_metrics_type ON brain_metrics (metric_type);
CREATE INDEX idx_brain_metrics_workflow ON brain_metrics (workflow_key);
CREATE INDEX idx_brain_metrics_recorded ON brain_metrics (recorded_at DESC);

-- ############################################################################
-- TABLE: brain_memory — Mémoire du Brain
-- Évite les traitements redondants
-- ############################################################################
CREATE TABLE brain_memory (
  id              BIGSERIAL PRIMARY KEY,
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  key             TEXT NOT NULL,            -- ex: 'last_audit', 'last_email_sent', 'last_score'
  value           JSONB NOT NULL DEFAULT '{}'::jsonb,
  ttl             TIMESTAMPTZ,             -- expiration optionnelle
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, key)
);

CREATE INDEX idx_brain_memory_company ON brain_memory (company_id);
CREATE INDEX idx_brain_memory_key ON brain_memory (key);
CREATE INDEX idx_brain_memory_ttl ON brain_memory (ttl) WHERE ttl IS NOT NULL;

-- ############################################################################
-- FONCTION: append_event — Ajouter un événement à l'Event Store
-- ############################################################################
CREATE OR REPLACE FUNCTION append_event(
  p_event_type    standard_event_type,
  p_company_id    UUID DEFAULT NULL,
  p_tenant_id     UUID DEFAULT NULL,
  p_workflow_key  TEXT DEFAULT NULL,
  p_agent_id      TEXT DEFAULT NULL,
  p_payload       JSONB DEFAULT '{}'::jsonb,
  p_priority      INTEGER DEFAULT 5
) RETURNS UUID AS $$
DECLARE
  v_event_uuid UUID;
BEGIN
  INSERT INTO brain_events (event_type, company_id, tenant_id, workflow_key, agent_id, payload, priority)
  VALUES (p_event_type, p_company_id, p_tenant_id, p_workflow_key, p_agent_id, p_payload, p_priority)
  RETURNING event_uuid INTO v_event_uuid;

  RETURN v_event_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ############################################################################
-- FONCTION: create_job — Créer un Job dans la file d'attente
-- ############################################################################
CREATE OR REPLACE FUNCTION create_job(
  p_capability    TEXT,
  p_company_id    UUID,
  p_tenant_id     UUID DEFAULT NULL,
  p_event_id      BIGINT DEFAULT NULL,
  p_priority      INTEGER DEFAULT 5,
  p_depends_on    UUID[] DEFAULT '{}',
  p_input_data    JSONB DEFAULT '{}'::jsonb,
  p_scheduled_at  TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_job_uuid UUID;
BEGIN
  -- Éviter les doublons (même capabilité pour la même entreprise déjà en file)
  IF NOT EXISTS (
    SELECT 1 FROM brain_jobs
    WHERE company_id = p_company_id
      AND capability = p_capability
      AND status IN ('pending', 'ready', 'running')
  ) THEN
    INSERT INTO brain_jobs (capability, company_id, tenant_id, event_id, priority, depends_on, input_data, scheduled_at)
    VALUES (p_capability, p_company_id, p_tenant_id, p_event_id, p_priority, p_depends_on, p_input_data, COALESCE(p_scheduled_at, NOW()))
    RETURNING job_uuid INTO v_job_uuid;
  END IF;

  RETURN v_job_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ############################################################################
-- FONCTION: record_metric — Enregistrer une métrique
-- ############################################################################
CREATE OR REPLACE FUNCTION record_metric(
  p_metric_name   TEXT,
  p_metric_type   TEXT,
  p_value         NUMERIC,
  p_unit          TEXT DEFAULT NULL,
  p_workflow_key  TEXT DEFAULT NULL,
  p_company_id    UUID DEFAULT NULL,
  p_tenant_id     UUID DEFAULT NULL,
  p_tags          JSONB DEFAULT '{}'::jsonb
) RETURNS BIGINT AS $$
DECLARE
  v_id BIGINT;
BEGIN
  INSERT INTO brain_metrics (metric_name, metric_type, value, unit, workflow_key, company_id, tenant_id, tags)
  VALUES (p_metric_name, p_metric_type, p_value, p_unit, p_workflow_key, p_company_id, p_tenant_id, p_tags)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ############################################################################
-- FONCTION: remember / recall — Mémoire associative simple
-- ############################################################################
CREATE OR REPLACE FUNCTION brain_remember(
  p_company_id  UUID,
  p_key         TEXT,
  p_value       JSONB,
  p_ttl_minutes INTEGER DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO brain_memory (company_id, key, value, ttl)
  VALUES (p_company_id, p_key, p_value,
    CASE WHEN p_ttl_minutes IS NOT NULL THEN NOW() + (p_ttl_minutes || ' minutes')::INTERVAL ELSE NULL END)
  ON CONFLICT (company_id, key) DO UPDATE
  SET value = p_value, ttl = CASE WHEN p_ttl_minutes IS NOT NULL THEN NOW() + (p_ttl_minutes || ' minutes')::INTERVAL ELSE brain_memory.ttl END, updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION brain_recall(
  p_company_id  UUID,
  p_key         TEXT
) RETURNS JSONB AS $$
DECLARE
  v_value JSONB;
BEGIN
  SELECT value INTO v_value
  FROM brain_memory
  WHERE company_id = p_company_id AND key = p_key
    AND (ttl IS NULL OR ttl > NOW());

  RETURN v_value;
END;
$$ LANGUAGE plpgsql STABLE;

-- ############################################################################
-- MISE À JOUR: brain_capabilities — ajout du champ capability_key
-- ############################################################################
ALTER TABLE brain_capabilities
  ADD COLUMN IF NOT EXISTS capability_key TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS standard_events JSONB DEFAULT '[]'::jsonb;

-- Migrer les workflow_key existants vers capability_key
UPDATE brain_capabilities SET capability_key = workflow_key WHERE capability_key IS NULL;

-- ############################################################################
-- MISE À JOUR: aligner brain_state avec la nouvelle architecture
-- ################################################################------------
ALTER TABLE brain_state
  ADD COLUMN IF NOT EXISTS last_event_id BIGINT REFERENCES brain_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS memory JSONB DEFAULT '{}'::jsonb;

-- ############################################################################
-- RLS
-- ############################################################################
ALTER TABLE brain_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY brain_jobs_select ON brain_jobs FOR SELECT
  USING (user_can_access_company(company_id));

CREATE POLICY brain_metrics_select ON brain_metrics FOR SELECT
  USING (company_id IS NULL OR user_can_access_company(company_id));

CREATE POLICY brain_memory_select ON brain_memory FOR SELECT
  USING (user_can_access_company(company_id));

CREATE POLICY brain_events_select ON brain_events FOR SELECT
  USING (company_id IS NULL OR user_can_access_company(company_id));

-- Insert autorisé pour les workers
CREATE POLICY brain_events_insert ON brain_events FOR INSERT WITH CHECK (true);
CREATE POLICY brain_jobs_insert ON brain_jobs FOR INSERT WITH CHECK (true);
CREATE POLICY brain_memory_insert ON brain_memory FOR INSERT WITH CHECK (true);
CREATE POLICY brain_metrics_insert ON brain_metrics FOR INSERT WITH CHECK (true);
