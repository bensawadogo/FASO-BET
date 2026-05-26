/**
 * Hooks React pour l'API FasoBet - Gestion des états async
 * BLOC 4 - Frontend Refactorisé
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from './api-client';

// ─── Types pour les états ────────────────────────────────────
type ApiState<T> = {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  lastUpdated: Date | null;
};

type AsyncFunction<T, P extends any[] = any[]> = (...args: P) => Promise<any>;

// ─── Hook générique pour les requêtes API ────────────────────
export function useApiRequest<T, P extends any[] = any[]>(
  apiFunction: AsyncFunction<T, P>,
  initialData: T | null = null
) {
  const [state, setState] = useState<ApiState<T>>({
    data: initialData,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
    lastUpdated: null,
  });

  const execute = useCallback(
    async (...args: P) => {
      setState(prev => ({
        ...prev,
        isLoading: true,
        isSuccess: false,
        isError: false,
        error: null,
      }));

      try {
        const response = await apiFunction(...args);

        if (response.success && response.data) {
          setState({
            data: response.data,
            error: null,
            isLoading: false,
            isSuccess: true,
            isError: false,
            lastUpdated: new Date(),
          });
          return response.data;
        } else {
          throw new Error(response.error || 'Unknown error');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Request failed';
        setState({
            data: null,
            error: errorMessage,
            isLoading: false,
            isSuccess: false,
            isError: true,
            lastUpdated: new Date(),
          });
        throw error;
      }
    },
    [apiFunction]
  );

  const reset = useCallback(() => {
    setState({
      data: initialData,
      error: null,
      isLoading: false,
      isSuccess: false,
      isError: false,
      lastUpdated: null,
    });
  }, [initialData]);

  return { ...state, execute, reset };
}

// ─── Hooks spécifiques pour FastAPI ─────────────────────────
export function usePredictions() {
  const { data, error, isLoading, isSuccess, isError, execute, reset } = useApiRequest(
    apiClient.fastApiClient.predict.bind(apiClient.fastApiClient)
  );

  return {
    predictions: data,
    error,
    isLoading,
    isSuccess,
    isError,
    getPredictions: execute,
    reset,
  };
}

export function usePipelineStatus() {
  const { data, error, isLoading, isSuccess, isError, execute, reset } = useApiRequest(
    apiClient.fastApiClient.getPipelineStatus.bind(apiClient.fastApiClient)
  );

  return {
    pipelineStatus: data,
    error,
    isLoading,
    isSuccess,
    isError,
    checkStatus: execute,
    reset,
  };
}

// ─── Hooks spécifiques pour Django REST ──────────────────────
export function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const login = useCallback(async (username: string, password: string) => {
    const response = await apiClient.djangoApiClient.login(username, password);
    if (response.success && response.data) {
      const { access, user: userData } = response.data;
      apiClient.setAuthToken(access);
      setToken(access);
      setUser(userData);
      localStorage.setItem('authToken', access);
      return { success: true, user: userData };
    }
    throw new Error(response.error || 'Login failed');
  }, []);

  const logout = useCallback(() => {
    apiClient.clearAuthToken();
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
  }, []);

  const initializeAuth = useCallback(async () => {
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      apiClient.setAuthToken(storedToken);
      setToken(storedToken);
      try {
        const response = await apiClient.djangoApiClient.getCurrentUser();
        if (response.success) {
          setUser(response.data);
        }
      } catch (error) {
        logout();
      }
    }
  }, [logout]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return {
    token,
    user,
    isAuthenticated: !!token,
    login,
    logout,
    initializeAuth,
  };
}

export function useMatches() {
  const { data, error, isLoading, isSuccess, isError, execute, reset } = useApiRequest(
    apiClient.djangoApiClient.getMatches.bind(apiClient.djangoApiClient)
  );

  const refreshMatches = useCallback(() => {
    execute();
  }, [execute]);

  return {
    matches: data,
    error,
    isLoading,
    isSuccess,
    isError,
    refreshMatches,
    reset,
  };
}

export function useMyPredictions() {
  const { data, error, isLoading, isSuccess, isError, execute, reset } = useApiRequest(
    apiClient.djangoApiClient.getMyPredictions.bind(apiClient.djangoApiClient)
  );

  return {
    predictions: data,
    error,
    isLoading,
    isSuccess,
    isError,
    refreshPredictions: execute,
    reset,
  };
}

// ─── Error Boundary Component ────────────────────────────────
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={this.resetError}>Try again</button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ─── Hook pour le polling ────────────────────────────────────
export function usePolling<T>(
  apiFunction: () => Promise<any>,
  interval: number = 5000,
  immediate: boolean = true
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(immediate);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiFunction();
      if (response.success) {
        setData(response.data);
        setError(null);
      } else {
        throw new Error(response.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Polling failed');
    } finally {
      setIsLoading(false);
    }
  }, [apiFunction]);

  useEffect(() => {
    if (immediate) {
      fetchData();
    }

    const intervalId = setInterval(fetchData, interval);
    return () => clearInterval(intervalId);
  }, [fetchData, interval, immediate]);

  return { data, error, isLoading, refetch: fetchData };
}