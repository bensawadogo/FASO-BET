-- ============================================================================
-- AgencyOS — Agency Brain: Orchestration, Événements, File d'attente, Marketplace
-- Version: 1.0.0
-- Moteur d'orchestration pour piloter les workflows de façon autonome
-- ============================================================================

-- ############################################################################
-- ENUMS
-- ############################################################################
CREATE TYPE brain_event_type AS ENUM (
  'lead_created', 'lead_enriched', 'website_detected', 'website_not_found',
  'social_discovery_completed', 'audit_completed', 'analysis_completed',
  'score_updated', 'proposal_generated', 'email_sent', 'email_opened',
  'client_won', 'client_lost', 'invoice_paid', 'task_completed',
  'workflow_error', 'workflow_completed', 'brain_decision'
);

CREATE TYPE queue_status AS ENUM ('pending', 'running', 'completed', 'failed', 'skipped', 'cancelled');

CREATE TYPE decision_source AS ENUM ('ai', 'rule', 'manual');

-- ############################################################################
-- TABLE: brain_events — Event Bus
-- Chaque workflow publie des événements, les autres s'abonnent
-- ############################################################################
CREATE TABLE brain_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type    brain_event_type NOT NULL,
  company_id    UUID REFERENCES companies(id) ON DELETE CASCADE,
  workflow_id   TEXT,
  execution_id  TEXT,
  source        TEXT NOT NULL DEFAULT 'unknown',
  payload       JSONB DEFAULT '{}'::jsonb,
  status        TEXT DEFAULT 'published' CHECK (status IN ('published', 'processed', 'failed')),
  processed_at  TIMESTAMPTZ,
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_brain_events_type ON brain_events (event_type);
CREATE INDEX idx_brain_events_company ON brain_events (company_id);
CREATE INDEX idx_brain_events_status ON brain_events (status);
CREATE INDEX idx_brain_events_created ON brain_events (created_at DESC);

-- ############################################################################
-- TABLE: brain_queue — File d'exécution des workflows
-- ############################################################################
CREATE TABLE brain_queue (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  workflow_key    TEXT NOT NULL,
  priority        INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  status          queue_status NOT NULL DEFAULT 'pending',
  depends_on      UUID[] DEFAULT '{}',
  input_data      JSONB DEFAULT '{}'::jsonb,
  output_data     JSONB DEFAULT '{}'::jsonb,
  error_message   TEXT,
  retry_count     INTEGER DEFAULT 0,
  max_retries     INTEGER DEFAULT 3,
  scheduled_at    TIMESTAMPTZ,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_brain_queue_company ON brain_queue (company_id);
CREATE INDEX idx_brain_queue_status ON brain_queue (status);
CREATE INDEX idx_brain_queue_priority ON brain_queue (priority DESC);
CREATE INDEX idx_brain_queue_workflow ON brain_queue (workflow_key);
CREATE INDEX idx_brain_queue_scheduled ON brain_queue (scheduled_at) WHERE scheduled_at IS NOT NULL;

-- ############################################################################
-- TABLE: brain_capabilities — Marketplace de capacités
-- Chaque module enregistre ce qu'il fait, ses entrées/sorties, ses dépendances
-- ############################################################################
CREATE TABLE brain_capabilities (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_key      TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  description       TEXT,
  version           TEXT DEFAULT '1.0.0',
  icon              TEXT DEFAULT '⚙️',

  -- Données d'entrée nécessaires
  required_data     JSONB DEFAULT '[]'::jsonb,

  -- Événements publiés par cette capacité
  publishes_events  JSONB DEFAULT '[]'::jsonb,

  -- Événements auxquels elle réagit
  subscribes_events JSONB DEFAULT '[]'::jsonb,

  -- Dépendances (autres workflow_keys)
  dependencies      TEXT[] DEFAULT '{}',

  -- Estimation
  estimated_cost    TEXT,
  estimated_duration TEXT,

  -- État
  is_active         BOOLEAN DEFAULT true,
  is_available      BOOLEAN DEFAULT true,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_brain_capabilities_active ON brain_capabilities (is_active);

-- ############################################################################
-- TABLE: brain_decisions — Journal des décisions de l'IA
-- ############################################################################
CREATE TABLE brain_decisions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
  decision_type   TEXT NOT NULL,
  source          decision_source NOT NULL DEFAULT 'rule',
  reasoning       TEXT,
  context         JSONB DEFAULT '{}'::jsonb,
  actions_taken   JSONB DEFAULT '[]'::jsonb,
  ai_model        TEXT,
  confidence      NUMERIC(3,2),
  processing_ms   INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_brain_decisions_company ON brain_decisions (company_id);
CREATE INDEX idx_brain_decisions_type ON brain_decisions (decision_type);
CREATE INDEX idx_brain_decisions_created ON brain_decisions (created_at DESC);

-- ############################################################################
-- TABLE: brain_state — Mémoire globale du Brain
-- Évite les traitements redondants
-- ############################################################################
CREATE TABLE brain_state (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Dernière exécution de chaque workflow
  last_executions JSONB DEFAULT '{}'::jsonb,

  -- Workflows déjà exécutés pour cette entreprise
  completed_workflows TEXT[] DEFAULT '{}',

  -- Prochaine étape décidée par le Brain
  next_workflow   TEXT,
  next_priority   INTEGER DEFAULT 5,
  next_scheduled_at TIMESTAMPTZ,

  -- Verrouillage (évite les doubles traitements)
  locked_by       TEXT,
  locked_at       TIMESTAMPTZ,
  lock_timeout    TIMESTAMPTZ,

  -- Métadonnées
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(company_id)
);

CREATE INDEX idx_brain_state_company ON brain_state (company_id);
CREATE INDEX idx_brain_state_next ON brain_state (next_scheduled_at) WHERE next_scheduled_at IS NOT NULL;

-- ############################################################################
-- FONCTION: acquérir un verrou (pour éviter les doublons)
-- ############################################################################
CREATE OR REPLACE FUNCTION acquire_brain_lock(
  p_company_id UUID,
  p_worker_id TEXT,
  p_timeout_minutes INTEGER DEFAULT 15
) RETURNS BOOLEAN AS $$
DECLARE
  v_locked BOOLEAN;
BEGIN
  INSERT INTO brain_state (company_id, locked_by, locked_at, lock_timeout)
  VALUES (p_company_id, p_worker_id, NOW(), NOW() + (p_timeout_minutes || ' minutes')::INTERVAL)
  ON CONFLICT (company_id) DO UPDATE
  SET locked_by = p_worker_id, locked_at = NOW(), lock_timeout = NOW() + (p_timeout_minutes || ' minutes')::INTERVAL
  WHERE brain_state.lock_timeout IS NULL OR brain_state.lock_timeout < NOW() OR brain_state.locked_by = p_worker_id;

  GET DIAGNOSTICS v_locked = ROW_COUNT;
  RETURN v_locked > 0;
END;
$$ LANGUAGE plpgsql;

-- ############################################################################
-- FONCTION: libérer un verrou
-- ############################################################################
CREATE OR REPLACE FUNCTION release_brain_lock(
  p_company_id UUID,
  p_worker_id TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE brain_state
  SET locked_by = NULL, locked_at = NULL, lock_timeout = NULL
  WHERE company_id = p_company_id AND locked_by = p_worker_id;
END;
$$ LANGUAGE plpgsql;

-- ############################################################################
-- FONCTION: enqueue — ajouter un workflow à la file d'attente
-- ############################################################################
CREATE OR REPLACE FUNCTION brain_enqueue(
  p_company_id UUID,
  p_workflow_key TEXT,
  p_priority INTEGER DEFAULT 5,
  p_depends_on UUID[] DEFAULT '{}',
  p_input_data JSONB DEFAULT '{}'::jsonb,
  p_scheduled_at TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Éviter les doublons (même workflow pour la même entreprise déjà en file)
  IF NOT EXISTS (
    SELECT 1 FROM brain_queue
    WHERE company_id = p_company_id
      AND workflow_key = p_workflow_key
      AND status IN ('pending', 'running')
  ) THEN
    INSERT INTO brain_queue (company_id, workflow_key, priority, depends_on, input_data, scheduled_at)
    VALUES (p_company_id, p_workflow_key, p_priority, p_depends_on, p_input_data, COALESCE(p_scheduled_at, NOW()))
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ############################################################################
-- VUE: brain_next_actions — file d'attente avec dépendances résolues
-- ############################################################################
CREATE OR REPLACE VIEW brain_next_actions AS
SELECT
  q.id,
  q.company_id,
  q.workflow_key,
  q.priority,
  q.input_data,
  q.created_at,
  c.name AS company_name,
  c.status AS company_status,
  c.enriched_at,
  c.website,
  ls.score_global_opportunity,
  ls.score_total
FROM brain_queue q
JOIN companies c ON c.id = q.company_id
LEFT JOIN LATERAL (
  SELECT score_global_opportunity, score_total FROM lead_scores
  WHERE company_id = q.company_id ORDER BY calculated_at DESC LIMIT 1
) ls ON true
WHERE q.status = 'pending'
  AND (q.scheduled_at IS NULL OR q.scheduled_at <= NOW())
  AND NOT EXISTS (
    SELECT 1 FROM brain_queue dep
    WHERE dep.id = ANY(q.depends_on)
    AND dep.status NOT IN ('completed', 'skipped')
  )
ORDER BY q.priority DESC, q.created_at ASC;

-- ############################################################################
-- RLS
-- ############################################################################
ALTER TABLE brain_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_state ENABLE ROW LEVEL SECURITY;

-- Membres de l'agence voient tout
CREATE POLICY brain_events_select ON brain_events FOR SELECT
  USING (company_id IS NULL OR user_can_access_company(company_id));

CREATE POLICY brain_queue_select ON brain_queue FOR SELECT
  USING (user_can_access_company(company_id));

CREATE POLICY brain_capabilities_select ON brain_capabilities FOR SELECT
  USING (true);

CREATE POLICY brain_decisions_select ON brain_decisions FOR SELECT
  USING (company_id IS NULL OR user_can_access_company(company_id));

CREATE POLICY brain_state_select ON brain_state FOR SELECT
  USING (user_can_access_company(company_id));
