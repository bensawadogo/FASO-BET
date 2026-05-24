import { agentCollector } from "./agent-collector";
import { agentStatistician } from "./agent-statistician";
import { agentStrategist } from "./agent-strategist";
import type { Agent1Output } from "@/types/agent1.types";
import type { Agent2Output } from "@/types/agent2.types";
import type { Agent3Output } from "@/types/agent3.types";
import { getCached, pipelineCacheKey, setCached } from "@/lib/cache";
import { getHistoricalContext } from "@/data/feature-store";
import type { HistoricalContext } from "@/types/historical.types";

const API_TIMEOUT = 10_000;

export interface PipelineOptions {
  date?: string;
  leagues?: number[];
  skipCache?: boolean;
}

export interface PipelineContext {
  historical: HistoricalContext | null;
}

export type PipelineSuccess = {
  status: "success";
  pipeline_ran_at: string;
  total_matches: number;
  collected: Agent1Output;
  statistics: Agent2Output;
  predictions: Agent3Output;
};

export type PipelineNoMatches = {
  status: "no_matches";
  data: null;
  pipeline_ran_at: string;
};

export type PipelineError = {
  status: "error";
  agent: 1 | 2 | 3;
  message: string;
  pipeline_ran_at: string;
};

export type PipelineResult = PipelineSuccess | PipelineNoMatches | PipelineError;

export async function runPipeline(
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  // Validation des entrées avec gestion des erreurs améliorée
  if (!options.date) {
    console.warn("[Pipeline] Date non spécifiée, utilisation de la date actuelle.");
  }
  if (!options.leagues?.length) {
    console.warn("[Pipeline] Aucune ligue spécifiée, utilisation des ligues par défaut.");
  }
  // Validation des entrées
  // Validation des entrées avec gestion des erreurs améliorée
  const date = options.date ? new Date(options.date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0];
  if (!date) {
    throw new Error("[Pipeline] La date est requise.");
  }
  
  const leagues = options.leagues?.length ? options.leagues : [61, 39, 140, 78, 135, 2];
  if (!leagues || leagues.length === 0) {
    throw new Error("[Pipeline] Au moins une ligue doit être spécifiée.");
  }
  const cacheKey = pipelineCacheKey(date, leagues);

  if (!options.skipCache) {
    const cached = await getCached<PipelineSuccess>(cacheKey);
    if (cached?.status === "success") {
      console.log("[Pipeline] Données récupérées depuis le cache.");
      // Vérification de la fraîcheur des données (exemple : vérifier si la date correspond)
      const cachedDate = new Date(cached.pipeline_ran_at).toISOString().split("T")[0];
      if (cachedDate === date) {
        return cached;
      } else {
        console.warn("[Pipeline] Cache obsolète, nouvelle exécution nécessaire.");
      }
    } else if (cached?.status === "error") {
      console.error("[Pipeline] Le cache contient une erreur précédente.");
    }
  }

  let collected: Agent1Output;

  const runAgentWithRetry = async <T>(
    agentRun: () => Promise<T>,
    agentName: string,
    maxRetries = 2,
    retryDelay = 1000,
  ): Promise<T> => {
    let lastError: unknown;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
      
      try {
        console.log(`[Pipeline] Exécution de l'agent ${agentName} (essai ${attempt + 1})...`);
        clearTimeout(timeoutId);
        const result = await agentRun();
        return result;
      } catch (e) {
        lastError = e;
        console.error(`[Pipeline] Erreur Agent ${agentName} (essai ${attempt + 1}):`, e);
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    throw lastError;
  };

  const runAgentWithTimeout = async <T>(
    agentRun: () => Promise<T>,
    agentName: string,
  ): Promise<T> => {
    return await runAgentWithRetry<T>(agentRun, agentName);
  }

  try {
    console.log("[Pipeline] Exécution de l'agent Collecteur...");
    collected = await runAgentWithTimeout(() =>
      agentCollector.run({
        date,
        leagues
      }),
    "Collecteur");
  } catch (e) {
    console.error("[Pipeline] Erreur Agent Collecteur:", e);
    return {
      status: "error",
      agent: 1,
      message: e instanceof Error ? e.message : "Erreur Agent Collecteur",
      pipeline_ran_at: new Date().toISOString(),
    };
  }

  if (collected.verified_matches.length === 0) {
    console.warn("[Pipeline] Aucune partie de match validée trouvée.");
    return {
      status: "no_matches",
      data: null,
      pipeline_ran_at: new Date().toISOString(),
    };
  }

  let statistics: Agent2Output;

  try {
    console.log("[Pipeline] Exécution de l'agent Statisticien...");
    statistics = await runAgentWithTimeout(() =>
      agentStatistician.run({
        matches: collected.verified_matches
      }),
    "Statisticien");
  } catch (e) {
    console.error("[Pipeline] Erreur Agent Statisticien:", e);
    return {
      status: "error",
      agent: 2,
      message: e instanceof Error ? e.message : "Erreur Agent Statisticien",
      pipeline_ran_at: new Date().toISOString(),
    };
  }

  let predictions: Agent3Output;

  try {
    console.log("[Pipeline] Exécution de l'agent Stratégiste...");
    predictions = await runAgentWithTimeout(() =>
      agentStrategist.run({
        matches: collected.verified_matches,
        statistics
      }),
    "Stratégiste");
  } catch (e) {
    console.error("[Pipeline] Erreur Agent Stratégiste:", e);
    return {
      status: "error",
      agent: 3,
      message: e instanceof Error ? e.message : "Erreur Agent Stratégiste",
      pipeline_ran_at: new Date().toISOString(),
    };
  }

  // Validation des données retournées par les agents
  if (!collected || !collected.verified_matches || !Array.isArray(collected.verified_matches)) {
    throw new Error("[Pipeline] Les données collectées sont invalides.");
  }

  if (!statistics || typeof statistics !== 'object') {
    throw new Error("[Pipeline] Les statistiques sont invalides.");
  }

  if (!predictions || typeof predictions !== 'object') {
    throw new Error("[Pipeline] Les prédictions sont invalides.");
  }

  const result: PipelineSuccess = {
    status: "success",
    pipeline_ran_at: new Date().toISOString(),
    total_matches: collected.verified_matches.length,
    collected,
    statistics,
    predictions,
  };

  console.log("[Pipeline] Cache mis à jour avec succès.");
  await setCached(cacheKey, result, 1800);

  return result;
}
