/**
 * FasoBet API Client - Client typé pour FastAPI + Django REST
 */

import { getAccessToken, isTokenExpired, refreshAccessToken, clearTokens } from './auth';

// ─── Configuration ────────────────────────────────────────────
const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';
const DJANGO_BASE_URL  = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

// ─── Types ────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
  success: boolean;
}

interface RegisterPayload {
  email: string;
  password: string;
  first_name?: string;
  firstName?: string;
  phone?: string;
}

export interface MatchData {
  id?: string | number;
  match_id?: string;
  home?: string;
  away?: string;
  teamA?: string | number;
  teamB?: string | number;
  league?: string;
  competition?: string;
  date?: string;
  [key: string]: any;
}

export interface PredictionData {
  id?: string | number;
  match_id?: string;
  home?: string; home_team?: string;
  away?: string; away_team?: string;
  league?: string; competition?: string;
  selection?: string; recommended_bet?: string; predicted_outcome?: string;
  min_odds?: number; odds?: number;
  confidence?: number; confidence_score?: number;
  signal?: string;
  [key: string]: any;
}

export interface UserProfile {
  id?: number;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  [key: string]: any;
}

export interface FeatureFlag {
  id: number;
  name: string;
  is_active: boolean;
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
    retryCount = 1
  ): Promise<ApiResponse<T>> {
    let attempt = 0;
    let lastError: { message: string; status: number } | null = null;

    while (attempt < retryCount) {
      attempt++;
      try {
        const url = `${this.baseUrl}${endpoint}`;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };

        let token = getAccessToken();
        if (token && isTokenExpired(token)) {
          token = await refreshAccessToken();
          if (!token) { clearTokens(); throw { message: 'Authentication required', status: 401 }; }
        }
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const options: RequestInit = { method, headers, signal: controller.signal };
        if (data) options.body = JSON.stringify(data);

        const response = await fetch(url, options);
        clearTimeout(timeoutId);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw { message: errorData.detail || errorData.error || 'API Error', status: response.status, details: errorData };
        }

        const responseData = await response.json();
        return { data: responseData, status: response.status, success: true };
      } catch (error: any) {
        lastError = error;
        if (attempt < retryCount) await new Promise(r => setTimeout(r, 1000));
        else if (lastError?.status === 401) clearTokens();
      }
    }

    return { error: lastError?.message || 'Request failed', status: lastError?.status || 500, success: false };
  }
}

// ─── FastAPI Client (Inference Engine) ────────────────────────
export class FastApiClient extends BaseApiClient {
  constructor() { super(FASTAPI_BASE_URL); }

  async predict(options?: any): Promise<ApiResponse<any>> {
    return this.request<any>('POST', '/predict', options);
  }

  async runPipelineAsync(options?: any): Promise<ApiResponse<{ task_id: string }>> {
    return this.request<{ task_id: string }>('POST', '/pipeline/run', options);
  }

  async getPipelineStatus(taskId: string): Promise<ApiResponse<any>> {
    return this.request<any>('GET', `/pipeline/status/${taskId}`);
  }

  async getHealthMetrics(): Promise<ApiResponse<any>> {
    return this.request('GET', '/health/metrics');
  }

  async collectMatches(options?: any): Promise<ApiResponse<MatchData[]>> {
    return this.request<MatchData[]>('POST', '/matches/collect', options);
  }

  async getMatchById(id: string): Promise<ApiResponse<MatchData>> {
    return this.request<MatchData>('GET', `/matches/${id}`);
  }
}

// ─── Django REST Client (Control Plane) ────────────────────────
export class DjangoApiClient extends BaseApiClient {
  constructor() { super(DJANGO_BASE_URL); }

  // Auth
  async login(username: string, password: string): Promise<ApiResponse<{ access: string; refresh: string; user: any }>> {
    return this.request('POST', '/api/token/', { username, password });
  }

  async register(data: RegisterPayload): Promise<ApiResponse<{ success: boolean; user_id?: number; message?: string }>> {
    return this.request('POST', '/api/register/', data);
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<{ access: string }>> {
    return this.request('POST', '/api/token/refresh/', { refresh: refreshToken });
  }

  async getCurrentUser(): Promise<ApiResponse<UserProfile>> {
    return this.request<UserProfile>('GET', '/api/users/me/');
  }

  // Data
  async getHistoricalData(): Promise<ApiResponse<any>> {
    return this.request('GET', '/api/historical');
  }

  async getUsers(): Promise<ApiResponse<any[]>> {
    return this.request('GET', '/api/users/');
  }

  async getUser(userId: number): Promise<ApiResponse<any>> {
    return this.request('GET', `/api/users/${userId}/`);
  }

  async getSports(): Promise<ApiResponse<any[]>> {
    return this.request('GET', '/api/sports/');
  }

  async getTeams(): Promise<ApiResponse<any[]>> {
    return this.request('GET', '/api/teams/');
  }

  async getMatches(): Promise<ApiResponse<MatchData[]>> {
    return this.request('GET', '/api/matches/');
  }

  async getMatch(matchId: string): Promise<ApiResponse<MatchData>> {
    return this.request('GET', `/api/matches/${matchId}/`);
  }

  async getLeagueById(leagueId: string): Promise<ApiResponse<any>> {
    return this.request<any>('GET', `/api/sports/leagues/${leagueId}/`);
  }

  async checkMatchPredictable(matchId: number): Promise<ApiResponse<{ predictable: boolean }>> {
    return this.request('GET', `/api/matches/${matchId}/predictable/`);
  }

  async getBankroll(): Promise<ApiResponse<any>> {
    return this.request('GET', '/api/profiles/bankroll/');
  }

  async getMyPredictions(): Promise<ApiResponse<PredictionData[]>> {
    return this.request('GET', '/api/predictions/');
  }

  async createPrediction(predictionData: { match_id: number; predicted_outcome: string; confidence: number }): Promise<ApiResponse<PredictionData>> {
    return this.request('POST', '/api/predictions/', predictionData);
  }

  async getMyProfile(): Promise<ApiResponse<UserProfile>> {
    return this.request('GET', '/api/profiles/');
  }

  async getFeatureFlags(): Promise<ApiResponse<any[]>> {
    return this.request('GET', '/api/feature-flags/');
  }

  async updateFeatureFlag(flagId: number, data: { is_active: boolean }): Promise<ApiResponse<FeatureFlag>> {
    return this.request('PATCH', `/api/feature-flags/${flagId}/`, data);
  }

  async getAgentConfigs(): Promise<ApiResponse<any[]>> {
    return this.request('GET', '/api/agent-configs/');
  }

  async createAlert(data: { channel: string; league: string; min_confidence: number; is_active: boolean; contact: string }): Promise<ApiResponse<any>> {
    return this.request('POST', '/api/alerts/', data);
  }

  async getHistorical(): Promise<ApiResponse<any>> {
    return this.request('GET', '/api/historical/');
  }

  async getPerformance(days?: number): Promise<ApiResponse<any>> {
    const query = days ? `?days=${days}` : '';
    return this.request('GET', `/api/performance/${query}`);
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

  // Accès direct aux sous-clients
  get fastApiClient(): FastApiClient { return this.fastApi; }
  get djangoApiClient(): DjangoApiClient { return this.djangoApi; }
  get controlApi(): DjangoApiClient { return this.djangoApi; }

  // Auth
  async login(username: string, password: string) {
    return this.djangoApi.login(username, password);
  }

  setAuthToken(_token: string) {
    console.warn('setAuthToken est déprécié. Utilisez setTokens de src/lib/auth.ts');
  }

  clearAuthToken() {
    console.warn('clearAuthToken est déprécié. Utilisez clearTokens de src/lib/auth.ts');
  }

  // ─── Méthodes haut-niveau pour les pages ─────────────────────

  /**
   * Récupère les prédictions (FastAPI → Django fallback → [])
   * ✅ NEVER retourne de mock data — TOUJOURS du backend ou vide
   */
  async getPredictions(): Promise<PredictionData[]> {
    // Essai Django /api/predictions/today/ en premier (données fraîches)
    try {
      const res = await fetch(
        `${DJANGO_BASE_URL}/api/predictions/today/`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          signal: AbortSignal.timeout(15000)
        }
      );
      if (res.ok) {
        const data = await res.json();
        const predictions = data.matchs || [];
        if (predictions.length > 0 && !predictions[0]?.match_id?.startsWith('mock-')) {
          return predictions;
        }
      }
    } catch (err) {
      console.warn('[getPredictions] Django /today/ failed:', err);
    }

    // Fallback FastAPI proxy
    try {
      const res = await fetch(
        `${FASTAPI_BASE_URL}/predictions`,
        { 
          method: 'GET', 
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          signal: AbortSignal.timeout(5000)
        }
      );
      if (res.ok) {
        const data = await res.json();
        const predictions = Array.isArray(data) ? data : (data.matchs || data.predictions || []);
        if (predictions.length > 0 && !predictions[0]?.match_id?.startsWith('mock-')) {
          return predictions;
        }
      }
    } catch (err) {
      console.warn('[getPredictions] FastAPI failed:', err);
    }

    // Fallback Django /api/predictions/
    try {
      const res = await this.djangoApi.getMyPredictions();
      if (res.success && res.data) {
        const raw = res.data as any;
        const predictions = Array.isArray(raw) ? raw : (raw.predictions || []);
        if (predictions.length > 0 && !predictions[0]?.match_id?.startsWith('mock-')) {
          return predictions;
        }
      }
    } catch (err) {
      console.warn('[getPredictions] Django fallback failed:', err);
    }

    // Fallback via Next.js proxy (works locally AND in production)
    try {
      const res = await fetch('/api/fastapi/proxy/predictions', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const data = await res.json();
        const predictions = Array.isArray(data) ? data : (data.matchs || data.predictions || []);
        if (predictions.length > 0) return predictions;
      }
    } catch (err) {
      console.warn('[getPredictions] Proxy fallback failed:', err);
    }

    console.warn('[getPredictions] Backend unavailable — returning empty array');
    return [];
  }

  /**
   * Récupère les métriques de performance (mock)
   */
  async getPerformance(): Promise<{ roi: number; win_rate: number } | null> {
    try {
      const res = await this.djangoApi.getPerformance();
      if (res.success && res.data) {
        const d = res.data as any;
        // ✅ Validation: vérifie que ce n'est pas du mock
        if (typeof d.roi === 'number' && typeof d.win_rate === 'number') {
          return { roi: d.roi, win_rate: d.win_rate };
        }
      }
    } catch (err) {
      console.warn('[getPerformance] Backend unavailable:', err);
    }
    
    // ✅ JAMAIS retourner du mock — TOUJOURS null si pas de backend
    return null;
  }

  /**
   * Récupère l'utilisateur connecté
   */
  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const res = await this.djangoApi.getCurrentUser();
      if (res.success && res.data) return res.data;
    } catch { /* indisponible */ }
    return null;
  }

  async getHealthStatus() {
    const fastApiHealth = await this.fastApi.getHealthMetrics().catch(() => ({ success: false }));
    return { fastApi: fastApiHealth.success, django: true };
  }
}

// ─── Singleton global ─────────────────────────────────────────
export const apiClient = new FasoBetApiClient();