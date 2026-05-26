-- Initialisation de la base de données FasoBet
-- Création des tables et données de base

-- ──────────────────────────────────────────────────────────
-- Table FeatureFlag : contrôle des fonctionnalités
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS predictions_featureflag (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ──────────────────────────────────────────────────────────
-- Table AgentConfig : configuration des agents IA
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS predictions_agentconfig (
    id SERIAL PRIMARY KEY,
    agent_name VARCHAR(50) NOT NULL UNIQUE,
    api_key VARCHAR(255) NOT NULL,
    base_url VARCHAR(255) NOT NULL,
    model_name VARCHAR(50) NOT NULL,
    max_retries INTEGER NOT NULL DEFAULT 3,
    timeout_seconds INTEGER NOT NULL DEFAULT 30,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ──────────────────────────────────────────────────────────
-- Données initiales
-- ──────────────────────────────────────────────────────────
-- Flags de fonctionnalités
INSERT INTO predictions_featureflag (name, description, is_active) VALUES
    ('pipeline_async', 'Permet l''exécution asynchrone du pipeline', FALSE),
    ('agent_statistician', 'Active l''agent Statistician', TRUE),
    ('agent_strategist', 'Active l''agent Strategist', TRUE);

-- Configuration des agents IA
INSERT INTO predictions_agentconfig (agent_name, api_key, base_url, model_name) VALUES
    ('statistician', 'sk-ant-api03-...', 'https://api.anthropic.com', 'claude-3-sonnet-20240229'),
    ('strategist', 'pplx-...', 'https://api.perplexity.ai', 'sonar-small-online');

-- ──────────────────────────────────────────────────────────
-- Index pour les performances
-- ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_featureflag_name ON predictions_featureflag (name);
CREATE INDEX IF NOT EXISTS idx_agentconfig_name ON predictions_agentconfig (agent_name);
