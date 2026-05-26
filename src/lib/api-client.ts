/**
 * FasoBet API Client - Client typé pour FastAPI + Django REST
 * BLOC 4 - Frontend Refactorisé
 */

import { Agent3Output } from '../types/agent3.types';
import { PipelineOptions, PipelineResult } from '../agents/pipeline';
import { Match, Prediction, UserProfile, FeatureFlag, AgentConfig, Sport, Team } from '../types/django-models';
import { getAccessToken, isTokenExpired, refreshAccessToken, setTokens, clearTokens } from './auth';

// ─── Configuration ────────────────────────────────────────────
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_INFERENCE_URL || 'http://localhost:8001';
const DJANGO_URL = process.env.NEXT_PUBLIC_DJANGO_URL || 'http://localhost:8000';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
  success: boolean;
}

interface ApiError {
  message: string;
  status: number;
  details?: any;
}

interface RegisterPayload {
  email: string;
  password: string;
  // Accept both snake_case (backend) and camelCase (frontend)
  first_name?: string;
  firstName?: string;
  phone?: string;
}

// ─── Client HTTP de base ──────────────────────────────────────
class BaseApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  protected async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    data?: any,
    retryCount = 3
  ): Promise<ApiResponse<T>> {
    let attempt = 0;
    let lastError: ApiError | null = null;

    while (attempt < retryCount) {
      attempt++;
      try {
        const url = `${this.baseUrl}${endpoint}`;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        let token = getAccessToken();
        if (token && isTokenExpired(token)) {
          token = await refreshAccessToken();
          if (!token) {
            clearTokens();
            // Redirect to login or handle as unauthenticated
            throw { message: 'Authentication required', status: 401 };
          }
        }
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const options: RequestInit = {
          method,
          headers,
        };

        if (data) {
          options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw {
            message: errorData.detail || errorData.error || 'API Error',
            status: response.status,
            details: errorData,
          };
        }

        const responseData = await response.json();
        return {
          data: responseData,
          status: response.status,
          success: true,
        };
      } catch (error) {
        lastError = error as ApiError;
        if (attempt < retryCount) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        } else if (lastError?.status === 401) {
          clearTokens(); // Clear tokens on final 401
        }
      }
    }

    return {
      error: lastError?.message || 'Request failed after retries',
      status: lastError?.status || 500,
      success: false,
    };
  }
}

// ─── FastAPI Client (Inference Engine) ────────────────────────
export class FastApiClient extends BaseApiClient {
  constructor() {
    super(FASTAPI_BASE_URL);
  }

  /**
   * Prédiction synchrone - Exécute le pipeline complet
   * @param options Options de pipeline
   * @returns Prédictions finales
   */
  async predict(options?: PipelineOptions): Promise<ApiResponse<Agent3Output>> {
    return this.request<Agent3Output>('POST', '/predict', options);
  }

  /**
   * Pipeline async - Lance le pipeline en arrière-plan
   * @param options Options de pipeline
   * @returns Task ID pour suivre l'état
   */
  async runPipelineAsync(options?: PipelineOptions): Promise<ApiResponse<{ task_id: string }>> {
    return this.request<{ task_id: string }>('POST', '/pipeline/run', options);
  }

  /**
   * Vérifie l'état d'un pipeline async
   * @param taskId ID de la tâche
   * @returns État et résultat si terminé
   */
  async getPipelineStatus(taskId: string): Promise<ApiResponse<PipelineResult>> {
    return this.request<PipelineResult>('GET', `/pipeline/status/${taskId}`);
  }

  /**
   * Récupère les métriques de santé
   * @returns Métriques du service
   */
  async getHealthMetrics(): Promise<ApiResponse<any>> {
    return this.request('GET', '/health/metrics');
  }

  /**
   * Collecte les matchs disponibles (Agent 1 uniquement)
   * @param options Options de collecte
   * @returns Matchs collectés
   */
  async collectMatches(options?: any): Promise<ApiResponse<Match[]>> {
    return this.request<Match[]>('POST', '/matches/collect', options);
  }

  /**
   * Récupère un match par son ID (FastAPI)
   * @param id identifiant du match
   */
  async getMatchById(id: string): Promise<ApiResponse<Match>> {
    return this.request<Match>('GET', `/matches/${id}`);
  }
}

  // ─── Django REST Client (Control Plane) ────────────────────────
  export class DjangoApiClient extends BaseApiClient {
    constructor() {
      super(API_BASE_URL);
    }

    // ─── Données historiques ──────────────────────────────────────
    async getHistoricalData(): Promise<ApiResponse<any>> {
      return this.request('GET', '/api/historical');
    }

    // ─── Authentification ───────────────────────────────────────
    async login(username: string, password: string): Promise<ApiResponse<{
      access: string;
      refresh: string;
      user: any;
    }>> {
      return this.request('POST', '/api/token/', { username, password });
    }

  // Route Django: POST /api/register/
  // Vérifiée dans backend/predictions/urls.py le 26/05/2026
  async register(data: RegisterPayload): Promise<ApiResponse<{ success: boolean; user_id?: number; message?: string }>> {
    return this.request('POST', '/api/register/', data);
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<{ access: string }>> {
    return this.request('POST', '/api/token/refresh/', { refresh: refreshToken });
  }

  async getCurrentUser(): Promise<ApiResponse<any>> {
    return this.request('GET', '/api/users/me/');
  }

  // ─── Utilisateurs ──────────────────────────────────────────
  async getUsers(): Promise<ApiResponse<any[]>> {
    return this.request('GET', '/api/users/');
  }

  async getUser(userId: number): Promise<ApiResponse<any>> {
    return this.request('GET', `/api/users/${userId}/`);
  }

  // ─── Sports ──────────────────────────────────────────────
  async getSports(): Promise<ApiResponse<any[]>> {
    return this.request('GET', '/api/sports/');
  }

  // ─── Équipes ─────────────────────────────────────────────
  async getTeams(): Promise<ApiResponse<any[]>> {
    return this.request('GET', '/api/teams/');
  }

  // ─── Matchs ──────────────────────────────────────────────
  async getMatches(): Promise<ApiResponse<Match[]>> {
    return this.request('GET', '/api/matches/');
  }

  async getMatch(matchId: string): Promise<ApiResponse<Match>> {
    return this.request('GET', `/api/matches/${matchId}/`);
  }

  async getLeagueById(leagueId: string): Promise<ApiResponse<any>> {
    return this.request<any>('GET', `/api/sports/leagues/${leagueId}/`);
  }

  async checkMatchPredictable(matchId: number): Promise<ApiResponse<{ predictable: boolean }>> {
    return this.request('GET', `/api/matches/${matchId}/predictable/`);
  }

  // ─── Prédictions ─────────────────────────────────────────
  async getMyPredictions(): Promise<ApiResponse<Prediction[]>> {
    return this.request('GET', '/api/predictions/');
  }

  async createPrediction(predictionData: {
    match_id: number;
    predicted_outcome: string;
    confidence: number;
  }): Promise<ApiResponse<Prediction>> {
    return this.request('POST', '/api/predictions/', predictionData);
  }

  // ─── Profils utilisateurs ─────────────────────────────────
  async getMyProfile(): Promise<ApiResponse<UserProfile>> {
    return this.request('GET', '/api/profiles/');
  }

  // ─── Feature Flags (Admin seulement) ──────────────────────
  async getFeatureFlags(): Promise<ApiResponse<any[]>> {
    return this.request('GET', '/api/feature-flags/');
  }

  async updateFeatureFlag(flagId: number, data: { is_active: boolean }): Promise<ApiResponse<FeatureFlag>> {
    return this.request('PATCH', `/api/feature-flags/${flagId}/`, data);
  }

  // ─── Configurations Agents (Admin seulement) ──────────────
  async getAgentConfigs(): Promise<ApiResponse<any[]>> {
    return this.request('GET', '/api/agent-configs/');
  }
}

// ─── API Client Unifié ────────────────────────────────────────
export class FasoBetApiClient {
  private fastApi: FastApiClient;
  private djangoApi: DjangoApiClient;

  constructor() {
    this.fastApi = new FastApiClient();
    this.djangoApi = new DjangoApiClient();
  }

  // ─── Gestion d'authentification ───────────────────────────
  // ─── Gestion d'authentification ───────────────────────────
  setAuthToken(token: string) {
    // Les tokens sont gérés par le module auth.ts et BaseApiClient
    // Ces méthodes ne sont plus nécessaires ici, mais gardées pour compat
    // ou si on souhaite une gestion token distincte par client
    console.warn("setAuthToken sur FasoBetApiClient est déprécié. Utilisez setTokens de src/lib/auth.ts directement.");
  }

  clearAuthToken() {
    console.warn("clearAuthToken sur FasoBetApiClient est déprécié. Utilisez clearTokens de src/lib/auth.ts directement.");
  }

  // ─── Accès aux clients spécifiques ───────────────────────
  get fastApiClient(): FastApiClient {
    return this.fastApi;
  }

  get djangoApiClient(): DjangoApiClient {
    return this.djangoApi;
  }

  // ─── Méthodes unifiées courantes ──────────────────────────
  async login(username: string, password: string) {
    return this.djangoApi.login(username, password);
  }

  async getHealthStatus() {
    const fastApiHealth = await this.fastApi.getHealthMetrics();
    return {
      fastApi: fastApiHealth.success,
      django: true, // À implémenter
    };
  }
}

// ─── Singleton pour utilisation globale ───────────────────────
export const apiClient = new FasoBetApiClient();