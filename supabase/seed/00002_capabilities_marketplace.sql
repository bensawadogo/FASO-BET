-- ============================================================================
-- AgencyOS — Marketplace de capacités (Event Sourcing)
-- Chaque capacité est identifiée par son capability_key (nom sémantique)
-- Les workflows sont résolus par le Brain via brain_capabilities.workflow_key
-- ============================================================================

INSERT INTO brain_capabilities (capability_key, workflow_key, name, description, icon, required_data, publishes_events, subscribes_events, dependencies, estimated_cost, estimated_duration) VALUES

-- === DÉCOUVERTE ===
('lead_discovery', 'wf-001', 'Lead Discovery',
  'Découvre de nouveaux leads via Google Maps et les enregistre dans Supabase',
  '🔍',
  '["search_query", "radius", "agency_id"]',
  '["lead_discovered"]',
  '[]',
  '{}',
  'API Google Places',
  '2-5 min pour 50 leads'),

('website_detection', 'wf-002', 'Website Detection',
  'Détecte le site web des leads via Google Custom Search',
  '🌐',
  '["company_id", "company_name"]',
  '["website_found", "website_not_found"]',
  '["lead_discovered"]',
  '{lead_discovery}',
  'API Google Custom Search',
  '30-60 sec par entreprise'),

-- === ENRICHISSEMENT ===
('company_enrichment', 'wf-003', 'Company Enrichment',
  'Enrichit les données entreprise: emails, domaine, réseaux sociaux détectés',
  '📊',
  '["company_id", "website"]',
  '["lead_enriched"]',
  '["website_found"]',
  '{website_detection}',
  'Gratuit (scraping HTML)',
  '10-30 sec par entreprise'),

('social_discovery', 'wf-004', 'Social Discovery',
  'Détecte et analyse les profils sociaux (Facebook, Instagram, LinkedIn, TikTok, Twitter, YouTube)',
  '📱',
  '["company_id", "social_links_detected"]',
  '["social_audit_completed"]',
  '["lead_enriched"]',
  '{company_enrichment}',
  'Gratuit (détection par patterns)',
  '5 sec par entreprise'),

-- === AUDIT ===
('website_audit', 'wf-005', 'Website Audit',
  'Audit technique complet: HTTPS, SSL, HTTP/2, SEO, UX, performances, technologies',
  '🛡️',
  '["company_id", "website"]',
  '["website_audited"]',
  '["website_found"]',
  '{website_detection}',
  'Gratuit (requêtes HTTP)',
  '10-20 sec par site'),

-- === ANALYSE ===
('ai_business_analysis', 'wf-006', 'AI Business Analysis',
  'Analyse IA: résumé, forces, faiblesses, opportunités, risques, recommandations, estimation gains',
  '🧠',
  '["company_id", "company_name", "category", "google_rating", "google_reviews_count"]',
  '["analysis_completed"]',
  '["website_audited", "social_audit_completed"]',
  '{website_audit, social_discovery}',
  'OpenAI API (~0.01$/analyse)',
  '3-10 sec par analyse'),

-- === SCORING ===
('lead_scoring', 'wf-007', 'Lead Scoring',
  'Calcule le score multidimensionnel: Technique, SEO, Social, Marketing, Business, Automation',
  '🎯',
  '["company_id", "audit_score_global", "score_seo", "active_social_count", "google_rating"]',
  '["lead_scored"]',
  '["analysis_completed"]',
  '{ai_business_analysis}',
  'Gratuit (logique interne)',
  '2 sec par entreprise'),

-- === CONFIGURATION ===
('configuration', 'wf-000', 'Configuration',
  'Point d''accès centralisé aux configurations de l''agence',
  '⚙️',
  '["key"]',
  '[]',
  '[]',
  '{}',
  'Gratuit',
  '1 sec'),

-- === ORCHESTRATION ===
('agency_brain', 'wf-011', 'Agency Brain',
  'Orchestrateur central: lit l''Event Store, décide, crée des Jobs',
  '🧠',
  '[]',
  '["brain_decision_created"]',
  '["lead_discovered", "lead_enriched", "website_found", "website_not_found", "social_audit_completed", "website_audited", "analysis_completed", "lead_scored", "workflow_completed", "workflow_failed"]',
  '{}',
  'Gratuit',
  'Variable'),

('event_dispatcher', 'wf-012', 'Event Dispatcher',
  'Point d''entrée unique pour les événements. Les écrit dans l''Event Store.',
  '📨',
  '["event_type", "company_id", "payload"]',
  '[]',
  '[]',
  '{agency_brain}',
  'Gratuit',
  '1 sec'),

('ai_decision_engine', 'wf-016', 'AI Decision Engine',
  'Moteur de décision IA: analyse l''état d''une entreprise et décide la prochaine action',
  '🤖',
  '["company_id", "company_status", "website", "completed_capabilities"]',
  '["brain_decision_created"]',
  '[]',
  '{agency_brain}',
  'OpenAI API (~0.005$/décision)',
  '3-5 sec par décision'),

-- === PROPOSAL ===
('proposal_selector', 'wf-020', 'Proposal Selector',
  'Sélectionne et génère des propositions commerciales adaptées au profil de l''entreprise',
  '📄',
  '["company_id", "score_technical", "score_seo", "score_social", "score_marketing", "score_automation", "score_global_opportunity"]',
  '["proposal_generated"]',
  '["lead_scored"]',
  '{lead_scoring}',
  'OpenAI API (~0.01$/proposition)',
  '5-10 sec par proposition');
