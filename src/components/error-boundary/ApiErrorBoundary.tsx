"use client";

import React, { ErrorInfo, ReactNode } from "react";
import { logger } from "../../lib/logger";

export interface ApiErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  serviceName?: string;
}

interface ApiErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ApiErrorBoundary extends React.Component<
  ApiErrorBoundaryProps,
  ApiErrorBoundaryState
> {
  constructor(props: ApiErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): ApiErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Loguer l'erreur avec notre logger structuré
    logger.error("API Error Boundary caught an error", {
      service: this.props.serviceName || "frontend",
      component: this.constructor.name,
      errorType: error.name,
      errorMessage: error.message,
      stack: error.stack,
    });

    // Appeler le callback parent si fourni
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({ errorInfo });
  }

  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Utiliser le fallback personnalisé si fourni
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Fallback par défaut
      return (
        <div className="bg-error-container p-6 rounded-lg border border-error/20">
          <h3 className="text-error font-bold text-lg mb-2">Erreur API</h3>
          <p className="text-on-error mb-4">
            Une erreur est survenue lors de la communication avec le serveur.
          </p>
          {this.state.error && (
            <div className="bg-error/10 p-3 rounded mb-4">
              <p className="text-sm font-mono text-error">
                {this.state.error.message}
              </p>
            </div>
          )}
          <button
            onClick={this.resetErrorBoundary}
            className="bg-primary text-surface px-4 py-2 rounded hover:bg-primary/90 transition-colors"
          >
            Réessayer
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}