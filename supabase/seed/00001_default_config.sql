-- ============================================================================
-- AgencyOS — Configuration par défaut (WF-000)
-- Ces valeurs sont globales (agency_id = NULL) et héritées par toutes les agences
-- ============================================================================

INSERT INTO configurations (key, value, type, description) VALUES
-- === IA ===
('ai.default_model', '"gpt-4o"', 'string', 'Modèle IA par défaut pour les agents'),
('ai.default_provider', '"openai"', 'string', 'Fournisseur IA (openai, anthropic, groq)'),
('ai.temperature', '0.3', 'number', 'Température par défaut pour les appels IA'),
('ai.max_tokens', '2000', 'number', 'Tokens max par appel IA'),

-- === Scoring (WF-007) ===
('scoring.weights', '{
  "technical": 0.20,
  "seo": 0.20,
  "social": 0.15,
  "marketing": 0.15,
  "business": 0.10,
  "automation": 0.20
}', 'json', 'Poids des sous-scores pour le Global Opportunity Score'),
('scoring.thresholds', '{
  "cold": [0, 30],
  "warm": [31, 60],
  "hot": [61, 80],
  "on_fire": [81, 100]
}', 'json', 'Seuils de qualification (nom: [min, max])'),
('scoring.global_opportunity', '{
  "low": [0, 30],
  "medium": [31, 60],
  "high": [61, 80],
  "critical": [81, 100]
}', 'json', 'Seuils du Global Opportunity Score'),

-- === Lead Discovery (WF-001) ===
('pipeline.default_country', '"SN"', 'string', 'Pays par défaut pour la découverte'),
('pipeline.default_language', '"fr"', 'string', 'Langue par défaut'),
('pipeline.max_leads_per_run', '50', 'number', 'Maximum de leads par exécution'),
('pipeline.search_radius_meters', '5000', 'number', 'Rayon de recherche par défaut (mètres)'),
('pipeline.default_search_query', '"agences digitales"', 'string', 'Requête de recherche par défaut'),

-- === Website Audit (WF-005) ===
('audit.checklist', '[
  "ssl",
  "load_time",
  "responsive",
  "seo_basics",
  "contact_form",
  "whatsapp",
  "google_analytics",
  "meta_pixel",
  "sitemap",
  "robots_txt",
  "favicon",
  "contact_page",
  "google_maps"
]', 'json', 'Éléments vérifiés lors d''un audit'),
('audit.timeout_ms', '15000', 'number', 'Timeout pour les requêtes d\'audit (ms)'),
('audit.user_agent', '"Mozilla/5.0 AgencyOS-Audit/1.0"', 'string', 'User-Agent pour les audits'),

-- === Social Discovery (WF-004) ===
('social.platforms', '[
  "facebook",
  "instagram",
  "linkedin",
  "tiktok",
  "twitter",
  "youtube"
]', 'json', 'Plateformes sociales à vérifier'),
('social.request_delay_ms', '1000', 'number', 'Délai entre requêtes sociales (ms)'),

-- === Email (WF-007) ===
('email.from_name', '"AgencyOS"', 'string', 'Nom d''expéditeur par défaut'),
('email.from_email', '"contact@agencyos.io"', 'string', 'Email d''expéditeur par défaut'),
('email.reply_to', '"contact@agencyos.io"', 'string', 'Adresse de réponse par défaut'),
('email.max_recipients_per_batch', '50', 'number', 'Max destinataires par lot'),

-- === CRM (WF-008) ===
('crm.stages', '[
  {"key": "lead", "label": "Nouveau lead", "color": "#6366F1"},
  {"key": "contacted", "label": "Contacté", "color": "#3B82F6"},
  {"key": "meeting_done", "label": "Rendez-vous fait", "color": "#F59E0B"},
  {"key": "proposal_sent", "label": "Proposition envoyée", "color": "#8B5CF6"},
  {"key": "negotiation", "label": "Négociation", "color": "#EC4899"},
  {"key": "closed_won", "label": "Gagné", "color": "#10B981"},
  {"key": "closed_lost", "label": "Perdu", "color": "#EF4444"}
]', 'json', 'Étapes du pipeline CRM'),

-- === Général ===
('agency.default_timezone', '"Africa/Dakar"', 'string', 'Fuseau horaire par défaut'),
('agency.default_currency', '"XOF"', 'string', 'Devise par défaut'),
('pagination.default_page_size', '25', 'number', 'Nombre d''éléments par page par défaut'),
('logging.level', '"info"', 'string', 'Niveau de log (debug, info, warn, error)');
