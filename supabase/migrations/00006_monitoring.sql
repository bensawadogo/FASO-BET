-- ============================================================================
-- AgencyOS — Monitoring & Observability
-- Phase 5 : Surveiller, alerter, analyser, auto-rétablir
-- ============================================================================

CREATE TYPE monitoring_execution_status AS ENUM ('running', 'success', 'error', 'timeout', 'skipped');
CREATE TYPE monitoring_alert_severity AS ENUM ('info', 'warning', 'critical', 'emergency');
CREATE TYPE monitoring_alert_channel AS ENUM ('email', 'whatsapp', 'discord', 'slack', 'telegram');
CREATE TYPE monitoring_service_status AS ENUM ('ok', 'degraded', 'down', 'unknown');
CREATE TYPE monitoring_cost_provider AS ENUM ('openai', 'google_places', 'google_custom_search', 'anthropic', 'apify', 'supabase', 'server', 'other');

-- ############################################################################
-- TABLE: monitoring_executions — Chaque run de workflow
-- ############################################################################
CREATE TABLE monitoring_executions (
  id              BIGSERIAL PRIMARY KEY,
  execution_uuid  UUID NOT NULL DEFAULT uuid_generate_v4(),
  workflow_key    TEXT NOT NULL,
  capability_key  TEXT,
  company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,
  tenant_id       UUID REFERENCES agencies(id) ON DELETE CASCADE,
  trigger_type    TEXT,
  status          monitoring_execution_status NOT NULL DEFAULT 'running',
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  duration_ms     INTEGER,
  error_message   TEXT,
  retry_count     INTEGER DEFAULT 0,
  max_retries     INTEGER DEFAULT 3,
  input_snapshot  JSONB DEFAULT '{}'::jsonb,
  output_snapshot JSONB DEFAULT '{}'::jsonb,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mon_exec_workflow ON monitoring_executions (workflow_key);
CREATE INDEX idx_mon_exec_status ON monitoring_executions (status);
CREATE INDEX idx_mon_exec_company ON monitoring_executions (company_id);
CREATE INDEX idx_mon_exec_tenant ON monitoring_executions (tenant_id);
CREATE INDEX idx_mon_exec_started ON monitoring_executions (started_at DESC);
CREATE INDEX idx_mon_exec_duration ON monitoring_executions (duration_ms);

-- ############################################################################
-- TABLE: monitoring_alert_rules — Définition des alertes
-- ############################################################################
CREATE TABLE monitoring_alert_rules (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID REFERENCES agencies(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  severity        monitoring_alert_severity NOT NULL DEFAULT 'warning',
  channels        monitoring_alert_channel[] DEFAULT '{email}',
  condition_type  TEXT NOT NULL CHECK (condition_type IN (
    'workflow_failed', 'workflow_timeout', 'quota_exceeded',
    'cost_threshold', 'queue_blocked', 'health_check_failed',
    'retry_exceeded', 'custom'
  )),
  condition_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  cooldown_minutes INTEGER DEFAULT 60,
  is_enabled      BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mon_alert_rules_tenant ON monitoring_alert_rules (tenant_id);
CREATE INDEX idx_mon_alert_rules_enabled ON monitoring_alert_rules (is_enabled);

-- ############################################################################
-- TABLE: monitoring_alert_history — Historique des alertes déclenchées
-- ############################################################################
CREATE TABLE monitoring_alert_history (
  id              BIGSERIAL PRIMARY KEY,
  alert_rule_id   UUID REFERENCES monitoring_alert_rules(id) ON DELETE SET NULL,
  tenant_id       UUID REFERENCES agencies(id) ON DELETE CASCADE,
  severity        monitoring_alert_severity NOT NULL,
  channel         monitoring_alert_channel NOT NULL,
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  context         JSONB DEFAULT '{}'::jsonb,
  sent_at         TIMESTAMPTZ,
  delivered       BOOLEAN DEFAULT false,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mon_alert_hist_rule ON monitoring_alert_history (alert_rule_id);
CREATE INDEX idx_mon_alert_hist_tenant ON monitoring_alert_history (tenant_id);
CREATE INDEX idx_mon_alert_hist_severity ON monitoring_alert_history (severity);
CREATE INDEX idx_mon_alert_hist_created ON monitoring_alert_history (created_at DESC);

-- ############################################################################
-- TABLE: monitoring_costs — Coûts par fournisseur
-- ############################################################################
CREATE TABLE monitoring_costs (
  id              BIGSERIAL PRIMARY KEY,
  provider        monitoring_cost_provider NOT NULL,
  service         TEXT,
  company_id      UUID REFERENCES companies(id) ON DELETE SET NULL,
  tenant_id       UUID REFERENCES agencies(id) ON DELETE CASCADE,
  workflow_key    TEXT,
  execution_id    BIGINT REFERENCES monitoring_executions(id) ON DELETE SET NULL,
  amount          NUMERIC(12,6) NOT NULL,
  currency        TEXT DEFAULT 'USD',
  description     TEXT,
  billing_period  TEXT,
  metadata        JSONB DEFAULT '{}'::jsonb,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mon_costs_provider ON monitoring_costs (provider);
CREATE INDEX idx_mon_costs_company ON monitoring_costs (company_id);
CREATE INDEX idx_mon_costs_workflow ON monitoring_costs (workflow_key);
CREATE INDEX idx_mon_costs_period ON monitoring_costs (billing_period);
CREATE INDEX idx_mon_costs_recorded ON monitoring_costs (recorded_at DESC);

-- ############################################################################
-- TABLE: monitoring_health_checks — État des services
-- ############################################################################
CREATE TABLE monitoring_health_checks (
  id              BIGSERIAL PRIMARY KEY,
  service_name    TEXT NOT NULL,
  service_type    TEXT NOT NULL CHECK (service_type IN ('api', 'database', 'queue', 'worker', 'ai', 'storage', 'network', 'other')),
  status          monitoring_service_status NOT NULL DEFAULT 'unknown',
  response_time_ms INTEGER,
  status_code     INTEGER,
  error_message   TEXT,
  details         JSONB DEFAULT '{}'::jsonb,
  checked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mon_health_service ON monitoring_health_checks (service_name);
CREATE INDEX idx_mon_health_status ON monitoring_health_checks (status);
CREATE INDEX idx_mon_health_checked ON monitoring_health_checks (checked_at DESC);

-- ############################################################################
-- VUES
-- ############################################################################

-- Résumé des exécutions pour le dashboard
CREATE OR REPLACE VIEW v_monitoring_dashboard AS
SELECT
  COUNT(*) AS total_executions,
  COUNT(*) FILTER (WHERE status = 'success') AS successful,
  COUNT(*) FILTER (WHERE status = 'error') AS failed,
  COUNT(*) FILTER (WHERE status = 'running') AS running,
  ROUND(AVG(duration_ms) FILTER (WHERE status = 'success'))::INTEGER AS avg_duration_ms,
  MAX(duration_ms) FILTER (WHERE status = 'success') AS max_duration_ms,
  SUM(retry_count) AS total_retries,
  COUNT(DISTINCT workflow_key) AS active_workflows,
  COUNT(DISTINCT company_id) AS companies_processed,
  MAX(started_at) AS last_execution
FROM monitoring_executions
WHERE started_at > NOW() - INTERVAL '24 hours';

-- Coûts agrégés par fournisseur
CREATE OR REPLACE VIEW v_monitoring_costs_summary AS
SELECT
  CASE WHEN provider IS NULL THEN 'total' ELSE provider::text END AS provider,
  COUNT(*) AS transactions,
  SUM(amount) AS total_cost,
  ROUND(AVG(amount), 4) AS avg_cost,
  COUNT(DISTINCT company_id) AS companies_affected,
  COUNT(DISTINCT workflow_key) AS workflows_using
FROM monitoring_costs
WHERE recorded_at > NOW() - INTERVAL '30 days'
GROUP BY ROLLUP (provider)
ORDER BY provider;

-- Dernier health check par service
CREATE OR REPLACE VIEW v_monitoring_health_latest AS
SELECT DISTINCT ON (service_name)
  service_name,
  service_type,
  status,
  response_time_ms,
  error_message,
  checked_at,
  CASE
    WHEN checked_at < NOW() - INTERVAL '10 minutes' THEN 'stale'
    ELSE 'current'
  END AS data_freshness
FROM monitoring_health_checks
ORDER BY service_name, checked_at DESC;

-- Alertes récentes non résolues
CREATE OR REPLACE VIEW v_monitoring_active_alerts AS
SELECT
  ah.id,
  ah.severity,
  ah.channel,
  ah.title,
  ah.message,
  ah.context,
  ah.created_at,
  ar.name AS rule_name,
  ar.condition_type
FROM monitoring_alert_history ah
LEFT JOIN monitoring_alert_rules ar ON ar.id = ah.alert_rule_id
WHERE ah.created_at > NOW() - INTERVAL '24 hours'
ORDER BY ah.severity DESC, ah.created_at DESC;

-- ############################################################################
-- FONCTIONS
-- ############################################################################

-- Enregistrer une exécution
CREATE OR REPLACE FUNCTION record_execution(
  p_workflow_key   TEXT,
  p_status         monitoring_execution_status,
  p_company_id     UUID DEFAULT NULL,
  p_tenant_id      UUID DEFAULT NULL,
  p_duration_ms    INTEGER DEFAULT NULL,
  p_error_message  TEXT DEFAULT NULL,
  p_retry_count    INTEGER DEFAULT 0,
  p_input_snapshot JSONB DEFAULT '{}'::jsonb,
  p_output_snapshot JSONB DEFAULT '{}'::jsonb,
  p_capability_key TEXT DEFAULT NULL,
  p_trigger_type   TEXT DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
  v_id BIGINT;
BEGIN
  INSERT INTO monitoring_executions (
    workflow_key, capability_key, company_id, tenant_id, trigger_type,
    status, duration_ms, error_message, retry_count,
    input_snapshot, output_snapshot, completed_at
  ) VALUES (
    p_workflow_key, p_capability_key, p_company_id, p_tenant_id, p_trigger_type,
    p_status, p_duration_ms, p_error_message, p_retry_count,
    p_input_snapshot, p_output_snapshot, NOW()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enregistrer un coût
CREATE OR REPLACE FUNCTION record_cost(
  p_provider       monitoring_cost_provider,
  p_amount         NUMERIC,
  p_currency       TEXT DEFAULT 'USD',
  p_service        TEXT DEFAULT NULL,
  p_company_id     UUID DEFAULT NULL,
  p_tenant_id      UUID DEFAULT NULL,
  p_workflow_key   TEXT DEFAULT NULL,
  p_execution_id   BIGINT DEFAULT NULL,
  p_description    TEXT DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
  v_id BIGINT;
BEGIN
  INSERT INTO monitoring_costs (provider, service, company_id, tenant_id, workflow_key, execution_id, amount, currency, description)
  VALUES (p_provider, p_service, p_company_id, p_tenant_id, p_workflow_key, p_execution_id, p_amount, p_currency, p_description)
  RETURNING id INTO v_id;

  PERFORM record_metric('cost_' || p_provider, 'counter', p_amount, p_currency, p_workflow_key, p_company_id, p_tenant_id);

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Health check: enregistrer un résultat
CREATE OR REPLACE FUNCTION record_health_check(
  p_service_name   TEXT,
  p_service_type   TEXT,
  p_status         monitoring_service_status,
  p_response_time_ms INTEGER DEFAULT NULL,
  p_status_code    INTEGER DEFAULT NULL,
  p_error_message  TEXT DEFAULT NULL,
  p_details        JSONB DEFAULT '{}'::jsonb
) RETURNS BIGINT AS $$
DECLARE
  v_id BIGINT;
BEGIN
  INSERT INTO monitoring_health_checks (service_name, service_type, status, response_time_ms, status_code, error_message, details)
  VALUES (p_service_name, p_service_type, p_status, p_response_time_ms, p_status_code, p_error_message, p_details)
  RETURNING id INTO v_id;

  PERFORM record_metric('health_' || p_service_name, 'gauge',
    CASE p_status WHEN 'ok' THEN 100 WHEN 'degraded' THEN 50 WHEN 'down' THEN 0 ELSE 25 END,
    'score', NULL, NULL, NULL, jsonb_build_object('service', p_service_name, 'status', p_status));

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alerter: déclencher une alerte
CREATE OR REPLACE FUNCTION trigger_alert(
  p_rule_id        UUID,
  p_severity       monitoring_alert_severity,
  p_channel        monitoring_alert_channel,
  p_title          TEXT,
  p_message        TEXT,
  p_context        JSONB DEFAULT '{}'::jsonb
) RETURNS BIGINT AS $$
DECLARE
  v_tenant_id UUID;
  v_cooldown  INTEGER;
  v_last_triggered TIMESTAMPTZ;
  v_id BIGINT;
BEGIN
  SELECT tenant_id, cooldown_minutes, last_triggered_at
  INTO v_tenant_id, v_cooldown, v_last_triggered
  FROM monitoring_alert_rules WHERE id = p_rule_id;

  IF v_last_triggered IS NULL OR v_last_triggered < NOW() - (v_cooldown || ' minutes')::INTERVAL THEN
    INSERT INTO monitoring_alert_history (alert_rule_id, tenant_id, severity, channel, title, message, context)
    VALUES (p_rule_id, v_tenant_id, p_severity, p_channel, p_title, p_message, p_context)
    RETURNING id INTO v_id;

    UPDATE monitoring_alert_rules SET last_triggered_at = NOW() WHERE id = p_rule_id;
  END IF;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ############################################################################
-- RLS
-- ############################################################################
ALTER TABLE monitoring_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitoring_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY monitoring_executions_select ON monitoring_executions FOR SELECT
  USING (company_id IS NULL OR user_can_access_company(company_id));
CREATE POLICY monitoring_executions_insert ON monitoring_executions FOR INSERT WITH CHECK (true);

CREATE POLICY monitoring_alert_rules_select ON monitoring_alert_rules FOR SELECT
  USING (tenant_id IS NULL OR tenant_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid()));
CREATE POLICY monitoring_alert_rules_insert ON monitoring_alert_rules FOR INSERT WITH CHECK (true);

CREATE POLICY monitoring_alert_history_select ON monitoring_alert_history FOR SELECT
  USING (tenant_id IS NULL OR tenant_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid()));
CREATE POLICY monitoring_alert_history_insert ON monitoring_alert_history FOR INSERT WITH CHECK (true);

CREATE POLICY monitoring_costs_select ON monitoring_costs FOR SELECT
  USING (company_id IS NULL OR user_can_access_company(company_id));
CREATE POLICY monitoring_costs_insert ON monitoring_costs FOR INSERT WITH CHECK (true);

CREATE POLICY monitoring_health_checks_select ON monitoring_health_checks FOR SELECT USING (true);
CREATE POLICY monitoring_health_checks_insert ON monitoring_health_checks FOR INSERT WITH CHECK (true);
