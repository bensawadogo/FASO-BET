CREATE TYPE proposal_status AS ENUM ('draft', 'generated', 'sent', 'accepted', 'rejected', 'archived');

CREATE TABLE proposals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lead_score_id   UUID REFERENCES lead_scores(id) ON DELETE SET NULL,
  status          proposal_status NOT NULL DEFAULT 'draft',
  title           TEXT,
  summary         TEXT,
  content         JSONB DEFAULT '{}'::jsonb,
  services        JSONB DEFAULT '[]'::jsonb,
  pricing         JSONB DEFAULT '{}'::jsonb,
  estimated_value NUMERIC(12,2),
  ai_model_used   TEXT,
  prompt_tokens   INTEGER,
  completion_tokens INTEGER,
  generated_at    TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_proposals_company ON proposals (company_id);
CREATE INDEX idx_proposals_status ON proposals (status);
CREATE INDEX idx_proposals_value ON proposals (estimated_value DESC);
CREATE INDEX idx_proposals_generated ON proposals (generated_at DESC);

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY proposals_select ON proposals FOR SELECT
  USING (user_can_access_company(company_id));
CREATE POLICY proposals_insert ON proposals FOR INSERT
  WITH CHECK (user_can_write_company(company_id));
CREATE POLICY proposals_update ON proposals FOR UPDATE
  USING (user_can_write_company(company_id));
CREATE POLICY proposals_delete ON proposals FOR DELETE
  USING (user_can_write_company(company_id));

CREATE TRIGGER trg_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
