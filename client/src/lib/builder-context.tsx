import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerAuth } from "@/hooks/useServerAuth";
import type { Builder } from "@/types/api";

const API_BASE_URL = "https://api.bndy.co.uk";
const STORAGE_KEY = "bndy-selected-builder-id";

interface BuilderContextType {
  builders: Builder[];
  currentBuilderId: string | null;
  currentBuilder: Builder | null;
  isLoading: boolean;
  error: string | null;
  hasBuilders: boolean;
  hasMultipleBuilders: boolean;
  selectBuilder: (builderId: string) => void;
  clearBuilderSelection: () => void;
  refresh: () => Promise<void>;
}

const BuilderContext = createContext<BuilderContextType | undefined>(undefined);

export function BuilderProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useServerAuth();
  const queryClient = useQueryClient();
  const [currentBuilderId, setCurrentBuilderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch builders for authenticated user
  const { data: buildersData, isLoading, error: queryError, refetch } = useQuery<{ builders: Builder[] }>({
    queryKey: ["api-builders-me"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/builders/me`, {
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch builders");
      }

      return response.json();
    },
    enabled: isAuthenticated,
  });

  const builders = buildersData?.builders || [];

  // Sync query error to local state
  useEffect(() => {
    if (queryError) {
      setError(queryError.message);
    } else {
      setError(null);
    }
  }, [queryError]);

  // Load selected builder from localStorage on mount
  useEffect(() => {
    if (isLoading || !builders.length) return;

    const savedBuilderId = localStorage.getItem(STORAGE_KEY);

    if (savedBuilderId && builders.some((b) => b.id === savedBuilderId)) {
      // Valid saved builder - restore selection
      setCurrentBuilderId(savedBuilderId);
    } else if (builders.length === 1) {
      // Auto-select if only one builder
      const builderId = builders[0].id;
      setCurrentBuilderId(builderId);
      localStorage.setItem(STORAGE_KEY, builderId);
    } else if (savedBuilderId && !builders.some((b) => b.id === savedBuilderId)) {
      // Invalid saved builder - clear localStorage
      localStorage.removeItem(STORAGE_KEY);
      setCurrentBuilderId(null);
    }
  }, [isLoading, builders]);

  const selectBuilder = useCallback((builderId: string) => {
    if (builders.some((b) => b.id === builderId)) {
      setCurrentBuilderId(builderId);
      localStorage.setItem(STORAGE_KEY, builderId);
    }
  }, [builders]);

  const clearBuilderSelection = useCallback(() => {
    setCurrentBuilderId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const refresh = useCallback(async () => {
    // Invalidate and refetch to ensure fresh data
    await queryClient.invalidateQueries({ queryKey: ["api-builders-me"] });
    await refetch();
  }, [queryClient, refetch]);

  // Compute current builder from ID
  const currentBuilder = currentBuilderId
    ? builders.find((b) => b.id === currentBuilderId) || null
    : null;

  const contextValue: BuilderContextType = {
    builders,
    currentBuilderId,
    currentBuilder,
    isLoading,
    error,
    hasBuilders: builders.length > 0,
    hasMultipleBuilders: builders.length > 1,
    selectBuilder,
    clearBuilderSelection,
    refresh,
  };

  return (
    <BuilderContext.Provider value={contextValue}>
      {children}
    </BuilderContext.Provider>
  );
}

export function useBuilder() {
  const context = useContext(BuilderContext);
  if (!context) {
    throw new Error("useBuilder must be used within a BuilderProvider");
  }
  return context;
}
