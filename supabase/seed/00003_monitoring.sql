-- ============================================================================
-- AgencyOS — Monitoring : alert rules + capability registration
-- ============================================================================

-- Alert rules par défaut
INSERT INTO monitoring_alert_rules (name, description, severity, channels, condition_type, condition_config, cooldown_minutes) VALUES
('Workflow Error', 'Alerte quand un workflow critique échoue', 'critical', '{email,discord}', 'workflow_failed',
  '{"workflows": ["wf-001", "wf-002", "wf-005", "wf-011", "wf-016"], "max_failures": 3, "window_minutes": 60}', 30),
('OpenAI Cost Spike', 'Alerte quand le coût OpenAI dépasse le seuil journalier', 'warning', '{email}', 'cost_threshold',
  '{"provider": "openai", "daily_max": 5.00, "currency": "USD"}', 1440),
('API Quota Depleted', 'Alerte quand un quota API est proche de la limite', 'warning', '{email,slack}', 'quota_exceeded',
  '{"providers": ["google_places", "google_custom_search"], "min_remaining": 50}', 360),
('Queue Bloqée', 'Alerte quand la file d''attente reste bloquée plus de 30 min', 'critical', '{email,discord}', 'queue_blocked',
  '{"max_pending_time_minutes": 30, "max_pending_jobs": 10}', 60),
('Health Check Dégradé', 'Alerte quand un service est down plus de 5 minutes', 'emergency', '{email,whatsapp,telegram}', 'health_check_failed',
  '{"services": ["postgresql", "n8n", "openai_api"], "max_failures": 3}', 15);

-- Capacité monitoring
INSERT INTO brain_capabilities (capability_key, workflow_key, name, description, icon, required_data, publishes_events, subscribes_events, dependencies, estimated_cost, estimated_duration)
VALUES ('monitoring_center', 'wf-021', 'Monitoring Center',
  'Surveille tous les workflows: durée, succès, erreurs, coût IA, appels API, mémoire, retries, temps moyen',
  'activity', '[]',
  '[]',
  '["workflow_completed", "workflow_failed"]',
  '{}', 'Gratuit', '1 sec');

INSERT INTO brain_capabilities (capability_key, workflow_key, name, description, icon, required_data, publishes_events, subscribes_events, dependencies, estimated_cost, estimated_duration)
VALUES ('notification_center', 'wf-022', 'Notification Center',
  'Envoie des notifications multi-canal (Email, WhatsApp, Discord, Slack, Telegram) quand un workflow échoue ou un quota est dépassé',
  'bell', '["channel", "title", "message", "severity"]',
  '[]',
  '[]',
  '{monitoring_center}', 'Gratuit', '2-5 sec');

INSERT INTO brain_capabilities (capability_key, workflow_key, name, description, icon, required_data, publishes_events, subscribes_events, dependencies, estimated_cost, estimated_duration)
VALUES ('cost_analyzer', 'wf-023', 'Cost Analyzer',
  'Calcule les coûts par prospect, par client, et le ROI: OpenAI + Google + Supabase + Serveur',
  'dollar-sign', '[]',
  '[]',
  '[]',
  '{monitoring_center}', 'Gratuit', '3 sec');

INSERT INTO brain_capabilities (capability_key, workflow_key, name, description, icon, required_data, publishes_events, subscribes_events, dependencies, estimated_cost, estimated_duration)
VALUES ('health_check', 'wf-024', 'Health Check',
  'Vérifie tous les services toutes les 5 minutes: Google, Supabase, OpenAI, MCP, Docker, n8n, PostgreSQL',
  'heart', '[]',
  '[]',
  '[]',
  '{}', 'Gratuit', '5-10 sec');

INSERT INTO brain_capabilities (capability_key, workflow_key, name, description, icon, required_data, publishes_events, subscribes_events, dependencies, estimated_cost, estimated_duration)
VALUES ('auto_recovery', 'wf-025', 'Auto Recovery',
  'Tente automatiquement le retry, le restart, le changement de fournisseur, puis alerte si le crash persiste',
  'refresh-cw', '["workflow_key", "company_id", "error_message", "retry_count"]',
  '[]',
  '["workflow_failed"]',
  '{monitoring_center}', 'Gratuit', 'Variable');
