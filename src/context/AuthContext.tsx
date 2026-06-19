"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getAccessToken, clearTokens } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";

interface AuthContextType {
  user: any;
  isLoading: boolean;
  login: (userData: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = getAccessToken();
      if (token) {
        try {
          const res = await apiClient.djangoApiClient.getCurrentUser();
          if (res.success && res.data) {
            setUser(res.data);
          } else {
            clearTokens();
          }
        } catch {
          clearTokens();
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = (userData: any) => setUser(userData);
  const logout = () => {
    clearTokens();
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
