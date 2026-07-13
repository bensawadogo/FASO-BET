-- ============================================================================
-- AgencyOS — Enrichissement, Analyse & Scoring avancé
-- Version: 1.0.0
-- Ajoute les champs et tables pour WF-003 à WF-007
-- ============================================================================

-- ############################################################################
-- EXTENSION pour le scraping HTML côté PostgreSQL (optionnel)
-- ############################################################################
-- CREATE EXTENSION IF NOT EXISTS "pg_net"; -- pour appels HTTP depuis PG

-- ############################################################################
-- NOUVEAUX ENUMS
-- ############################################################################
CREATE TYPE analysis_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE technology_category AS ENUM (
  'cms', 'framework', 'ecommerce', 'analytics', 'marketing', 'hosting', 'cdn', 'other'
);

-- ############################################################################
-- ALTER TABLE: companies — ajout des champs d'enrichissement
-- ############################################################################
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS domain          TEXT,
  ADD COLUMN IF NOT EXISTS timezone        TEXT,
  ADD COLUMN IF NOT EXISTS opening_hours   JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS photos          JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS social_links_detected JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS enriched_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enriched_by     TEXT DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_companies_domain ON companies (domain);
CREATE INDEX IF NOT EXISTS idx_companies_enriched ON companies (enriched_at) WHERE enriched_at IS NOT NULL;

-- ############################################################################
-- TABLE: company_emails — tous les emails découverts par enrichissement
-- ############################################################################
CREATE TABLE IF NOT EXISTS company_emails (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  source      TEXT NOT NULL DEFAULT 'enrichment',
  type        TEXT CHECK (type IN ('general', 'contact', 'support', 'sales', 'info', 'other')),
  is_verified BOOLEAN DEFAULT false,
  is_primary  BOOLEAN DEFAULT false,
  confidence  INTEGER CHECK (confidence >= 0 AND confidence <= 100),
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, email)
);

CREATE INDEX IF NOT EXISTS idx_company_emails_company ON company_emails (company_id);

-- ############################################################################
-- TABLE: website_technologies — technologies détectées (WF-005)
-- ############################################################################
CREATE TABLE IF NOT EXISTS website_technologies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  website_id  UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    technology_category NOT NULL DEFAULT 'other',
  version     TEXT,
  confirmed   BOOLEAN DEFAULT false,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(website_id, name)
);

CREATE INDEX IF NOT EXISTS idx_website_technologies_website ON website_technologies (website_id);
CREATE INDEX IF NOT EXISTS idx_website_technologies_category ON website_technologies (category);

-- ############################################################################
-- TABLE: business_analyses — analyse IA (WF-006)
-- ############################################################################
CREATE TABLE IF NOT EXISTS business_analyses (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  audit_id            UUID REFERENCES audits(id) ON DELETE SET NULL,

  -- Résumé et insights
  summary             TEXT,
  strengths           JSONB DEFAULT '[]'::jsonb,
  weaknesses          JSONB DEFAULT '[]'::jsonb,
  opportunities       JSONB DEFAULT '[]'::jsonb,
  risks               JSONB DEFAULT '[]'::jsonb,
  recommendations     JSONB DEFAULT '[]'::jsonb,
  estimated_gains     JSONB DEFAULT '{}'::jsonb,

  -- Services recommandés
  recommended_services JSONB DEFAULT '[]'::jsonb,

  -- Métadonnées IA
  model_used          TEXT,
  prompt_tokens       INTEGER,
  completion_tokens   INTEGER,
  processing_ms       INTEGER,

  -- Statut
  status              audit_status NOT NULL DEFAULT 'pending',
  priority            analysis_priority NOT NULL DEFAULT 'medium',
  error_message       TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_analyses_company ON business_analyses (company_id);
CREATE INDEX IF NOT EXISTS idx_business_analyses_audit ON business_analyses (audit_id);
CREATE INDEX IF NOT EXISTS idx_business_analyses_status ON business_analyses (status);

-- ############################################################################
-- ALTER TABLE: lead_scores — ajout des sous-scores (WF-007)
-- ############################################################################
ALTER TABLE lead_scores
  ADD COLUMN IF NOT EXISTS score_technical   INTEGER CHECK (score_technical >= 0 AND score_technical <= 100),
  ADD COLUMN IF NOT EXISTS score_marketing   INTEGER CHECK (score_marketing >= 0 AND score_marketing <= 100),
  ADD COLUMN IF NOT EXISTS score_automation  INTEGER CHECK (score_automation >= 0 AND score_automation <= 100),
  ADD COLUMN IF NOT EXISTS score_global_opportunity INTEGER CHECK (score_global_opportunity >= 0 AND score_global_opportunity <= 100),
  ADD COLUMN IF NOT EXISTS recommendations   JSONB DEFAULT '[]'::jsonb;

-- ############################################################################
-- VUE: v_company_full — vue complète d'une entreprise avec ses scores
-- ############################################################################
CREATE OR REPLACE VIEW v_company_full AS
SELECT
  c.id,
  c.agency_id,
  c.name,
  c.legal_name,
  c.address,
  c.postal_code,
  c.city,
  c.country,
  c.phone,
  c.email,
  c.website,
  c.domain,
  c.google_place_id,
  c.google_rating,
  c.google_reviews_count,
  c.google_maps_url,
  c.latitude,
  c.longitude,
  c.category,
  c.timezone,
  c.opening_hours,
  c.social_links_detected,
  c.source,
  c.status,
  c.notes,
  c.metadata,

  -- Dernier score
  ls.score_total,
  ls.score_technical,
  ls.score_seo AS score_seo,
  ls.score_social,
  ls.score_marketing,
  ls.score_automation,
  ls.score_global_opportunity,
  ls.calculated_at AS last_scored_at,

  -- Dernier audit
  a.score_global AS audit_score_global,
  a.completed_at AS last_audited_at,

  -- Dernière analyse IA
  ba.summary AS ai_summary,
  ba.recommended_services,
  ba.created_at AS last_analyzed_at,

  -- Nombre de réseaux sociaux actifs
  (SELECT COUNT(*) FROM social_profiles sp WHERE sp.company_id = c.id AND sp.status = 'active') AS active_social_count,

  -- Nombre de contacts
  (SELECT COUNT(*) FROM contacts ct WHERE ct.company_id = c.id) AS contact_count,

  -- Tags
  (SELECT JSONB_AGG(t.name) FROM company_tags ctg JOIN tags t ON t.id = ctg.tag_id WHERE ctg.company_id = c.id) AS tags

FROM companies c
LEFT JOIN LATERAL (
  SELECT * FROM lead_scores
  WHERE company_id = c.id
  ORDER BY calculated_at DESC
  LIMIT 1
) ls ON true
LEFT JOIN LATERAL (
  SELECT score_global, completed_at FROM audits
  WHERE company_id = c.id AND status = 'completed'
  ORDER BY completed_at DESC
  LIMIT 1
) a ON true
LEFT JOIN LATERAL (
  SELECT summary, recommended_services, created_at FROM business_analyses
  WHERE company_id = c.id AND status = 'completed'
  ORDER BY created_at DESC
  LIMIT 1
) ba ON true;

-- ############################################################################
-- FONCTION: calculate_global_opportunity_score
-- Calcule le score d'opportunité global basé sur les écarts
-- Plus un sous-score est bas, plus l'opportunité est haute
-- ############################################################################
CREATE OR REPLACE FUNCTION calculate_global_opportunity_score(
  p_technical  INTEGER DEFAULT 0,
  p_seo        INTEGER DEFAULT 0,
  p_social     INTEGER DEFAULT 0,
  p_marketing  INTEGER DEFAULT 0,
  p_business   INTEGER DEFAULT 0,
  p_automation INTEGER DEFAULT 0
) RETURNS INTEGER AS $$
DECLARE
  v_gap_technical  INTEGER;
  v_gap_seo        INTEGER;
  v_gap_social     INTEGER;
  v_gap_marketing  INTEGER;
  v_gap_business   INTEGER;
  v_gap_automation INTEGER;
  v_opportunity    NUMERIC;
BEGIN
  -- Plus le score est bas, plus l'écart (opportunité) est grand
  v_gap_technical  := GREATEST(0, 100 - p_technical);
  v_gap_seo        := GREATEST(0, 100 - p_seo);
  v_gap_social     := GREATEST(0, 100 - p_social);
  v_gap_marketing  := GREATEST(0, 100 - p_marketing);
  v_gap_business   := GREATEST(0, 100 - p_business);
  v_gap_automation := GREATEST(0, 100 - p_automation);

  -- Pondération : plus de poids sur les domaines où l'agence apporte le plus de valeur
  v_opportunity := (
    v_gap_technical  * 0.20 +
    v_gap_seo        * 0.20 +
    v_gap_social     * 0.15 +
    v_gap_marketing  * 0.15 +
    v_gap_business   * 0.10 +
    v_gap_automation * 0.20
  );

  RETURN LEAST(100, GREATEST(0, ROUND(v_opportunity)));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ############################################################################
-- TRIGGER: mise à jour du score global d'opportunité automatique
-- ############################################################################
CREATE OR REPLACE FUNCTION update_global_opportunity_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.score_global_opportunity := calculate_global_opportunity_score(
    COALESCE(NEW.score_technical, 0),
    COALESCE(NEW.score_seo, 0),
    COALESCE(NEW.score_social, 0),
    COALESCE(NEW.score_marketing, 0),
    COALESCE(NEW.score_reputation, 0),
    COALESCE(NEW.score_automation, 0)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lead_scores_opportunity
  BEFORE INSERT OR UPDATE ON lead_scores
  FOR EACH ROW EXECUTE FUNCTION update_global_opportunity_score();

-- ############################################################################
-- RLS: business_analyses
-- ############################################################################
ALTER TABLE IF EXISTS business_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS company_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS website_technologies ENABLE ROW LEVEL SECURITY;

CREATE POLICY business_analyses_select ON business_analyses FOR SELECT
  USING (user_can_access_company(company_id));
CREATE POLICY business_analyses_insert ON business_analyses FOR INSERT
  WITH CHECK (user_can_write_company(company_id));
CREATE POLICY business_analyses_update ON business_analyses FOR UPDATE
  USING (user_can_write_company(company_id));
CREATE POLICY business_analyses_delete ON business_analyses FOR DELETE
  USING (user_can_write_company(company_id));

CREATE POLICY company_emails_select ON company_emails FOR SELECT
  USING (user_can_access_company(company_id));
CREATE POLICY company_emails_insert ON company_emails FOR INSERT
  WITH CHECK (user_can_write_company(company_id));
CREATE POLICY company_emails_update ON company_emails FOR UPDATE
  USING (user_can_write_company(company_id));
CREATE POLICY company_emails_delete ON company_emails FOR DELETE
  USING (user_can_write_company(company_id));

CREATE POLICY website_technologies_select ON website_technologies FOR SELECT
  USING (website_id IN (SELECT id FROM websites WHERE user_can_access_company(company_id)));
CREATE POLICY website_technologies_insert ON website_technologies FOR INSERT
  WITH CHECK (website_id IN (SELECT id FROM websites WHERE user_can_write_company(company_id)));
CREATE POLICY website_technologies_delete ON website_technologies FOR DELETE
  USING (website_id IN (SELECT id FROM websites WHERE user_can_write_company(company_id)));
