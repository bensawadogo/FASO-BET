-- ============================================================================
-- AgencyOS — Schema de base
-- Version: 1.0.0
-- Multi-tenant: chaque agence possède ses propres données
-- Compatible Supabase (RLS, UUID, timestamps)
-- ============================================================================

-- ############################################################################
-- EXTENSIONS
-- ############################################################################
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ############################################################################
-- ENUMS
-- ############################################################################
CREATE TYPE agency_member_role AS ENUM ('owner', 'admin', 'member', 'viewer');

CREATE TYPE company_status AS ENUM (
  'new', 'pending_contact', 'contacted', 'qualified', 'converted', 'lost', 'archived'
);

CREATE TYPE company_source AS ENUM (
  'google_maps', 'manual', 'referral', 'website', 'social_media', 'import', 'api', 'other'
);

CREATE TYPE social_platform AS ENUM (
  'facebook', 'instagram', 'linkedin', 'tiktok', 'twitter', 'youtube', 'whatsapp', 'snapchat', 'pinterest'
);

CREATE TYPE social_status AS ENUM ('active', 'inactive', 'not_found', 'error');

CREATE TYPE audit_type AS ENUM ('full', 'quick', 'seo', 'performance', 'accessibility', 'security');

CREATE TYPE audit_status AS ENUM ('pending', 'running', 'completed', 'failed');

CREATE TYPE pipeline_stage AS ENUM (
  'lead', 'contacted', 'meeting_done', 'proposal_sent', 'negotiation', 'closed_won', 'closed_lost'
);

CREATE TYPE email_direction AS ENUM ('sent', 'received');

CREATE TYPE email_status AS ENUM ('draft', 'queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed');

CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

CREATE TYPE entity_type AS ENUM (
  'company', 'contact', 'website', 'social_profile', 'audit', 'lead_score', 'email', 'task', 'pipeline'
);

CREATE TYPE config_type AS ENUM ('string', 'number', 'boolean', 'json', 'secret');

-- ############################################################################
-- TABLE: agencies
-- ############################################################################
CREATE TABLE agencies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  logo_url    TEXT,
  website     TEXT,
  country     TEXT DEFAULT 'SN',
  language    TEXT DEFAULT 'fr',
  currency    TEXT DEFAULT 'XOF',
  timezone    TEXT DEFAULT 'Africa/Dakar',
  settings    JSONB DEFAULT '{}'::jsonb,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agencies_slug ON agencies (slug);
CREATE INDEX idx_agencies_active ON agencies (is_active);

-- ############################################################################
-- TABLE: users
-- ############################################################################
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT NOT NULL,
  avatar_url  TEXT,
  phone       TEXT,
  locale      TEXT DEFAULT 'fr',
  is_active   BOOLEAN DEFAULT true,
  settings    JSONB DEFAULT '{}'::jsonb,
  last_login  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_active ON users (is_active);

-- ############################################################################
-- TABLE: agency_members
-- ############################################################################
CREATE TABLE agency_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id   UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        agency_member_role NOT NULL DEFAULT 'member',
  permissions JSONB DEFAULT '{}'::jsonb,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agency_id, user_id)
);

CREATE INDEX idx_agency_members_agency ON agency_members (agency_id);
CREATE INDEX idx_agency_members_user ON agency_members (user_id);

-- ############################################################################
-- TABLE: companies
-- ############################################################################
CREATE TABLE companies (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id         UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  legal_name        TEXT,
  address           TEXT,
  postal_code       TEXT,
  city              TEXT,
  country           TEXT DEFAULT 'SN',
  phone             TEXT,
  email             TEXT,
  website           TEXT,
  google_place_id   TEXT,
  google_rating     NUMERIC(3,1),
  google_reviews_count INTEGER,
  google_maps_url   TEXT,
  latitude          NUMERIC(10,7),
  longitude         NUMERIC(10,7),
  category          TEXT,
  source            company_source NOT NULL DEFAULT 'manual',
  status            company_status NOT NULL DEFAULT 'new',
  notes             TEXT,
  assigned_to       UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agency_id, google_place_id)
);

CREATE INDEX idx_companies_agency ON companies (agency_id);
CREATE INDEX idx_companies_status ON companies (status);
CREATE INDEX idx_companies_source ON companies (source);
CREATE INDEX idx_companies_assigned ON companies (assigned_to);
CREATE INDEX idx_companies_city ON companies (city);
CREATE INDEX idx_companies_category ON companies (category);
CREATE INDEX idx_companies_google_place ON companies (google_place_id);
CREATE INDEX idx_companies_created ON companies (created_at DESC);

-- ############################################################################
-- TABLE: contacts
-- ############################################################################
CREATE TABLE contacts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  position    TEXT,
  email       TEXT,
  phone       TEXT,
  mobile      TEXT,
  linkedin_url TEXT,
  is_primary  BOOLEAN DEFAULT false,
  notes       TEXT,
  metadata    JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contacts_company ON contacts (company_id);
CREATE INDEX idx_contacts_email ON contacts (email);
CREATE INDEX idx_contacts_primary ON contacts (company_id, is_primary) WHERE is_primary = true;

-- ############################################################################
-- TABLE: websites
-- ############################################################################
CREATE TABLE websites (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  url               TEXT NOT NULL,
  domain            TEXT,
  is_main           BOOLEAN DEFAULT false,
  has_ssl           BOOLEAN,
  has_www_redirect  BOOLEAN,
  load_time_ms      INTEGER,
  is_responsive     BOOLEAN,
  has_form          BOOLEAN,
  has_whatsapp      BOOLEAN,
  has_ga            BOOLEAN,
  has_fb_pixel      BOOLEAN,
  has_tiktok_pixel  BOOLEAN,
  has_sitemap       BOOLEAN,
  has_robots_txt    BOOLEAN,
  has_favicon       BOOLEAN,
  has_contact_page  BOOLEAN,
  has_google_maps   BOOLEAN,
  seo_score         INTEGER CHECK (seo_score >= 0 AND seo_score <= 100),
  performance_score INTEGER CHECK (performance_score >= 0 AND performance_score <= 100),
  last_audited_at   TIMESTAMPTZ,
  raw_headers       JSONB,
  metadata          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, url)
);

CREATE INDEX idx_websites_company ON websites (company_id);
CREATE INDEX idx_websites_domain ON websites (domain);
CREATE INDEX idx_websites_main ON websites (company_id) WHERE is_main = true;

-- ############################################################################
-- TABLE: social_profiles
-- ############################################################################
CREATE TABLE social_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  platform        social_platform NOT NULL,
  profile_url     TEXT,
  profile_name    TEXT,
  profile_id      TEXT,
  followers_count INTEGER,
  following_count INTEGER,
  posts_count     INTEGER,
  last_post_at    TIMESTAMPTZ,
  post_frequency  TEXT CHECK (post_frequency IN ('daily', 'weekly', 'monthly', 'rarely', 'inactive')),
  status          social_status NOT NULL DEFAULT 'not_found',
  is_verified     BOOLEAN DEFAULT false,
  last_checked_at TIMESTAMPTZ,
  raw_data        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, platform)
);

CREATE INDEX idx_social_profiles_company ON social_profiles (company_id);
CREATE INDEX idx_social_profiles_platform ON social_profiles (platform);
CREATE INDEX idx_social_profiles_status ON social_profiles (status);

-- ############################################################################
-- TABLE: audits
-- ############################################################################
CREATE TABLE audits (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id          UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  website_id          UUID REFERENCES websites(id) ON DELETE SET NULL,
  type                audit_type NOT NULL DEFAULT 'full',
  status              audit_status NOT NULL DEFAULT 'pending',
  score_global        INTEGER CHECK (score_global >= 0 AND score_global <= 100),
  score_seo           INTEGER CHECK (score_seo >= 0 AND score_seo <= 100),
  score_performance   INTEGER CHECK (score_performance >= 0 AND score_performance <= 100),
  score_accessibility INTEGER CHECK (score_accessibility >= 0 AND score_accessibility <= 100),
  score_mobile        INTEGER CHECK (score_mobile >= 0 AND score_mobile <= 100),
  score_security      INTEGER CHECK (score_security >= 0 AND score_security <= 100),
  checklist_results   JSONB,
  raw_data            JSONB,
  report_url          TEXT,
  pdf_url             TEXT,
  error_message       TEXT,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audits_company ON audits (company_id);
CREATE INDEX idx_audits_website ON audits (website_id);
CREATE INDEX idx_audits_status ON audits (status);
CREATE INDEX idx_audits_type ON audits (type);

-- ############################################################################
-- TABLE: lead_scores
-- ############################################################################
CREATE TABLE lead_scores (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  score_total     INTEGER NOT NULL CHECK (score_total >= 0 AND score_total <= 100),
  score_website   INTEGER CHECK (score_website >= 0 AND score_website <= 100),
  score_social    INTEGER CHECK (score_social >= 0 AND score_social <= 100),
  score_seo       INTEGER CHECK (score_seo >= 0 AND score_seo <= 100),
  score_reputation INTEGER CHECK (score_reputation >= 0 AND score_reputation <= 100),
  score_engagement INTEGER CHECK (score_engagement >= 0 AND score_engagement <= 100),
  breakdown       JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_version   TEXT,
  calculated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, calculated_at)
);

CREATE INDEX idx_lead_scores_company ON lead_scores (company_id);
CREATE INDEX idx_lead_scores_total ON lead_scores (score_total DESC);
CREATE INDEX idx_lead_scores_recent ON lead_scores (company_id, calculated_at DESC);

-- ############################################################################
-- TABLE: crm_pipeline
-- ############################################################################
CREATE TABLE crm_pipeline (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  stage           pipeline_stage NOT NULL DEFAULT 'lead',
  previous_stage  pipeline_stage,
  source          company_source,
  deal_value      NUMERIC(12,2),
  probability     INTEGER CHECK (probability >= 0 AND probability <= 100),
  assigned_to     UUID REFERENCES users(id) ON DELETE SET NULL,
  notes           TEXT,
  next_action     TEXT,
  next_action_date DATE,
  moved_at        TIMESTAMPTZ,
  lost_reason     TEXT,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id)
);

CREATE INDEX idx_crm_pipeline_stage ON crm_pipeline (stage);
CREATE INDEX idx_crm_pipeline_assigned ON crm_pipeline (assigned_to);
CREATE INDEX idx_crm_pipeline_next_action ON crm_pipeline (next_action_date) WHERE next_action_date IS NOT NULL;

-- ############################################################################
-- TABLE: emails
-- ############################################################################
CREATE TABLE emails (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contact_id    UUID REFERENCES contacts(id) ON DELETE SET NULL,
  direction     email_direction NOT NULL DEFAULT 'sent',
  subject       TEXT NOT NULL,
  body_text     TEXT,
  body_html     TEXT,
  sender        TEXT NOT NULL,
  recipient     TEXT NOT NULL,
  cc            TEXT[] DEFAULT '{}',
  bcc           TEXT[] DEFAULT '{}',
  attachments   JSONB DEFAULT '[]'::jsonb,
  message_id    TEXT,
  thread_id     TEXT,
  status        email_status NOT NULL DEFAULT 'draft',
  sent_at       TIMESTAMPTZ,
  opened_at     TIMESTAMPTZ,
  clicked_at    TIMESTAMPTZ,
  bounced_at    TIMESTAMPTZ,
  error_message TEXT,
  metadata      JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_emails_company ON emails (company_id);
CREATE INDEX idx_emails_contact ON emails (contact_id);
CREATE INDEX idx_emails_direction ON emails (direction);
CREATE INDEX idx_emails_status ON emails (status);
CREATE INDEX idx_emails_thread ON emails (thread_id);
CREATE INDEX idx_emails_sent ON emails (sent_at DESC);

-- ############################################################################
-- TABLE: tasks
-- ############################################################################
CREATE TABLE tasks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID REFERENCES companies(id) ON DELETE CASCADE,
  assigned_to   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  priority      task_priority NOT NULL DEFAULT 'medium',
  status        task_status NOT NULL DEFAULT 'pending',
  due_date      TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  related_to    entity_type,
  related_id    UUID,
  metadata      JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_assigned ON tasks (assigned_to);
CREATE INDEX idx_tasks_company ON tasks (company_id);
CREATE INDEX idx_tasks_status ON tasks (status);
CREATE INDEX idx_tasks_priority ON tasks (priority);
CREATE INDEX idx_tasks_due ON tasks (due_date) WHERE due_date IS NOT NULL AND status NOT IN ('completed', 'cancelled');
CREATE INDEX idx_tasks_related ON tasks (related_to, related_id);

-- ############################################################################
-- TABLE: activity_logs
-- ############################################################################
CREATE TABLE activity_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id   UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  company_id  UUID REFERENCES companies(id) ON DELETE SET NULL,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type entity_type NOT NULL,
  entity_id   UUID,
  description TEXT,
  metadata    JSONB DEFAULT '{}'::jsonb,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_agency ON activity_logs (agency_id);
CREATE INDEX idx_activity_logs_company ON activity_logs (company_id);
CREATE INDEX idx_activity_logs_user ON activity_logs (user_id);
CREATE INDEX idx_activity_logs_action ON activity_logs (action);
CREATE INDEX idx_activity_logs_entity ON activity_logs (entity_type, entity_id);
CREATE INDEX idx_activity_logs_created ON activity_logs (created_at DESC);

-- ############################################################################
-- TABLE: tags
-- ############################################################################
CREATE TABLE tags (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id   UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT DEFAULT '#3B82F6',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agency_id, name)
);

CREATE INDEX idx_tags_agency ON tags (agency_id);

-- ############################################################################
-- TABLE: company_tags (junction)
-- ############################################################################
CREATE TABLE company_tags (
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tag_id      UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (company_id, tag_id)
);

CREATE INDEX idx_company_tags_tag ON company_tags (tag_id);

-- ############################################################################
-- TABLE: configurations (WF-000)
-- ############################################################################
CREATE TABLE configurations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id   UUID REFERENCES agencies(id) ON DELETE CASCADE,
  key         TEXT NOT NULL,
  value       JSONB NOT NULL,
  type        config_type NOT NULL DEFAULT 'string',
  description TEXT,
  is_encrypted BOOLEAN DEFAULT false,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agency_id, key)
);

CREATE INDEX idx_configurations_agency ON configurations (agency_id);
CREATE INDEX idx_configurations_key ON configurations (key);
CREATE INDEX idx_configurations_active ON configurations (is_active);

-- On autorise une configuration globale (agency_id IS NULL) par clé
CREATE UNIQUE INDEX idx_configurations_global_key ON configurations (key) WHERE agency_id IS NULL;

-- ############################################################################
-- FONCTION: mise à jour automatique de updated_at
-- ############################################################################
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger aux tables avec updated_at
CREATE TRIGGER trg_agencies_updated_at BEFORE UPDATE ON agencies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_websites_updated_at BEFORE UPDATE ON websites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_social_profiles_updated_at BEFORE UPDATE ON social_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_crm_pipeline_updated_at BEFORE UPDATE ON crm_pipeline FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_configurations_updated_at BEFORE UPDATE ON configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ############################################################################
-- ROW LEVEL SECURITY (Supabase)
-- ############################################################################

-- Activer RLS sur toutes les tables
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE configurations ENABLE ROW LEVEL SECURITY;

-- RLS: les utilisateurs voient uniquement les données de leur agence
-- On suppose que auth.uid() correspond à users.id

-- agencies: visible si l'utilisateur en est membre
CREATE POLICY agencies_select ON agencies FOR SELECT
  USING (id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid() AND is_active = true));

-- users: visible si dans la même agence
CREATE POLICY users_select ON users FOR SELECT
  USING (id IN (
    SELECT user_id FROM agency_members
    WHERE agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid())
  ));

-- agency_members: visible si dans la même agence
CREATE POLICY agency_members_select ON agency_members FOR SELECT
  USING (agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid()));

-- Politique générique pour les tables liées aux companies:
-- L'utilisateur voit les enregistrements si l'agence de la company est la sienne
CREATE POLICY companies_select ON companies FOR SELECT
  USING (agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY companies_insert ON companies FOR INSERT
  WITH CHECK (agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')));

CREATE POLICY companies_update ON companies FOR UPDATE
  USING (agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')));

CREATE POLICY companies_delete ON companies FOR DELETE
  USING (agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- Helper function pour les politiques des tables enfants
CREATE OR REPLACE FUNCTION user_can_access_company(p_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM companies c
    JOIN agency_members am ON am.agency_id = c.agency_id
    WHERE c.id = p_company_id AND am.user_id = auth.uid() AND am.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION user_can_write_company(p_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM companies c
    JOIN agency_members am ON am.agency_id = c.agency_id
    WHERE c.id = p_company_id AND am.user_id = auth.uid() AND am.role IN ('owner', 'admin', 'member')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Appliquer les politiques sur les tables enfants via la fonction helper
CREATE POLICY contacts_select ON contacts FOR SELECT USING (user_can_access_company(company_id));
CREATE POLICY contacts_insert ON contacts FOR INSERT WITH CHECK (user_can_write_company(company_id));
CREATE POLICY contacts_update ON contacts FOR UPDATE USING (user_can_write_company(company_id));
CREATE POLICY contacts_delete ON contacts FOR DELETE USING (user_can_write_company(company_id));

CREATE POLICY websites_select ON websites FOR SELECT USING (user_can_access_company(company_id));
CREATE POLICY websites_insert ON websites FOR INSERT WITH CHECK (user_can_write_company(company_id));
CREATE POLICY websites_update ON websites FOR UPDATE USING (user_can_write_company(company_id));
CREATE POLICY websites_delete ON websites FOR DELETE USING (user_can_write_company(company_id));

CREATE POLICY social_profiles_select ON social_profiles FOR SELECT USING (user_can_access_company(company_id));
CREATE POLICY social_profiles_insert ON social_profiles FOR INSERT WITH CHECK (user_can_write_company(company_id));
CREATE POLICY social_profiles_update ON social_profiles FOR UPDATE USING (user_can_write_company(company_id));
CREATE POLICY social_profiles_delete ON social_profiles FOR DELETE USING (user_can_write_company(company_id));

CREATE POLICY audits_select ON audits FOR SELECT USING (user_can_access_company(company_id));
CREATE POLICY audits_insert ON audits FOR INSERT WITH CHECK (user_can_write_company(company_id));
CREATE POLICY audits_update ON audits FOR UPDATE USING (user_can_write_company(company_id));
CREATE POLICY audits_delete ON audits FOR DELETE USING (user_can_write_company(company_id));

CREATE POLICY lead_scores_select ON lead_scores FOR SELECT USING (user_can_access_company(company_id));
CREATE POLICY lead_scores_insert ON lead_scores FOR INSERT WITH CHECK (user_can_write_company(company_id));
CREATE POLICY lead_scores_update ON lead_scores FOR UPDATE USING (user_can_write_company(company_id));
CREATE POLICY lead_scores_delete ON lead_scores FOR DELETE USING (user_can_write_company(company_id));

CREATE POLICY crm_pipeline_select ON crm_pipeline FOR SELECT USING (user_can_access_company(company_id));
CREATE POLICY crm_pipeline_insert ON crm_pipeline FOR INSERT WITH CHECK (user_can_write_company(company_id));
CREATE POLICY crm_pipeline_update ON crm_pipeline FOR UPDATE USING (user_can_write_company(company_id));
CREATE POLICY crm_pipeline_delete ON crm_pipeline FOR DELETE USING (user_can_write_company(company_id));

CREATE POLICY emails_select ON emails FOR SELECT USING (user_can_access_company(company_id));
CREATE POLICY emails_insert ON emails FOR INSERT WITH CHECK (user_can_write_company(company_id));
CREATE POLICY emails_update ON emails FOR UPDATE USING (user_can_write_company(company_id));
CREATE POLICY emails_delete ON emails FOR DELETE USING (user_can_write_company(company_id));

CREATE POLICY tasks_select ON tasks FOR SELECT USING (company_id IS NULL OR user_can_access_company(company_id));
CREATE POLICY tasks_insert ON tasks FOR INSERT WITH CHECK (company_id IS NULL OR user_can_write_company(company_id));
CREATE POLICY tasks_update ON tasks FOR UPDATE USING (assigned_to = auth.uid() OR user_can_write_company(company_id));
CREATE POLICY tasks_delete ON tasks FOR DELETE USING (user_can_write_company(company_id));

-- Activity logs: lecture seule, écriture via fonction
CREATE POLICY activity_logs_select ON activity_logs FOR SELECT
  USING (agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid()));

-- Tags: basé sur l'agence
CREATE POLICY tags_select ON tags FOR SELECT
  USING (agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid()));

CREATE POLICY tags_insert ON tags FOR INSERT
  WITH CHECK (agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY tags_update ON tags FOR UPDATE
  USING (agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY tags_delete ON tags FOR DELETE
  USING (agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- company_tags
CREATE POLICY company_tags_select ON company_tags FOR SELECT
  USING (user_can_access_company(company_id));

CREATE POLICY company_tags_insert ON company_tags FOR INSERT
  WITH CHECK (user_can_write_company(company_id));

CREATE POLICY company_tags_delete ON company_tags FOR DELETE
  USING (user_can_write_company(company_id));

-- configurations: lecture pour tous les membres, écriture pour admin/owner
CREATE POLICY configurations_select ON configurations FOR SELECT
  USING (agency_id IS NULL OR agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid()));

CREATE POLICY configurations_insert ON configurations FOR INSERT
  WITH CHECK (agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY configurations_update ON configurations FOR UPDATE
  USING (agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

CREATE POLICY configurations_delete ON configurations FOR DELETE
  USING (agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));
