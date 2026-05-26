/**
 * FasoBet Django Models - Interfaces TypeScript miroirs
 * Synchronisé avec: predictions/models.py
 * Ne pas modifier manuellement - généré ou maintenu en sync avec Django
 */

// ─── Modèles principaux ────────────────────────────────────
export interface Sport {
  id: number;
  name: string;
  icon: string;
  slug: string;
}

export interface Team {
  id: number;
  name: string;
  sport: number; // ID de Sport
  logoEmoji: string;
}

export interface Match {
  id: number;
  sport: number; // ID de Sport
  teamA: number; // ID de Team
  teamB: number; // ID de Team
  date: string; // ISO format
  status: 'upcoming' | 'live' | 'finished';
  scoreA: number | null;
  scoreB: number | null;
  league: string;
  isPredictable: boolean;
}

export interface Prediction {
  id: number;
  user: number; // ID de User
  match: number; // ID de Match
  predictedOutcome: 'team_a' | 'draw' | 'team_b';
  confidence: number;
  isCorrect: boolean | null;
  createdAt: string; // ISO format
}

// ─── Modèles utilisateur ──────────────────────────────────
export interface UserProfile {
  id: number;
  user: number; // ID de User
  points: number;
  totalPredictions: number;
  correctPredictions: number;
  currentStreak: number;
  bestStreak: number;
  avatarEmoji: string;
  accuracy: number; // Calculé: correctPredictions / totalPredictions * 100
}

// ─── Feature Flags (BLOC 3) ────────────────────────────────
export interface FeatureFlag {
  id: number;
  name: string;
  isActive: boolean;
  description: string;
  createdAt: string; // ISO format
  updatedAt: string; // ISO format
}

// ─── Configurations Agents IA (BLOC 3) ──────────────────────
export type AgentType = 'collector' | 'statistician' | 'strategist';

export interface AgentConfig {
  id: number;
  agentName: AgentType;
  apiKey: string;
  endpoint: string;
  timeout: number; // Secondes
  isEnabled: boolean;
  maxRetries: number;
  createdAt: string; // ISO format
  updatedAt: string; // ISO format
}

// ─── Types utilitaires ─────────────────────────────────────
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ─── API Responses ────────────────────────────────────────
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
  success: boolean;
}

// Export pour compatibilité avec l'api-client existant
export type { FeatureFlag as FeatureFlagType };
export type { AgentConfig as AgentConfigType };