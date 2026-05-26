"""FasoBet - Pipeline orchestrator (BLOC 2)
Équivalent Python de src/agents/pipeline.ts

Orchestre les 3 agents en séquence : Collector → Statistician → Strategist.
Avec cache Redis, retry, timeout, et fallback.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Optional

from api.agents.agent1_collector import agent_collector
from api.agents.agent2_statistician import agent_statistician
from api.agents.agent3_strategist import agent_strategist
from api.lib.cache import get_cache_key, get_cached, set_cached
from api.models import (
    Agent1Output,
    Agent2Output,
    Agent3Output,
    CollectorOptions,
    PipelineError,
    PipelineNoMatches,
    PipelineOptions,
    PipelineResult,
    PipelineSuccess,
    StatisticianOptions,
    StrategistInput,
)

API_TIMEOUT = 30  # secondes
MAX_RETRIES = 2


class Pipeline:
    """Orchestrateur du pipeline de prédiction."""
    
    async def run(self, options: Optional[PipelineOptions] = None) -> PipelineResult:
        if options is None:
            options = PipelineOptions()
        
        # Validation des entrées
        date = options.date
        if not date:
            date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        leagues = options.leagues
        if not leagues:
            leagues = [61, 39, 140, 78, 135, 2]
        
        cache_key = get_cache_key(date, leagues)
        
        # Vérification du cache
        if not options.skip_cache:
            cached = get_cached(cache_key)
            if cached and cached.get("status") == "success":
                print("[Pipeline] Cache hit — returning cached result")
                cached_date = cached.get("pipeline_ran_at", "")[:10]
                if cached_date == date:
                    return PipelineSuccess(**cached)
                print("[Pipeline] Cache stale — re-running")
        
        # ─── Agent 1 : Collector ───────────────────────────
        try:
            print("[Pipeline] Running Agent 1: Collector...")
            collected = await self._run_with_retry(
                lambda: agent_collector.run(CollectorOptions(date=date, leagues=leagues)),
                "Collector",
            )
        except Exception as e:
            print(f"[Pipeline] Agent 1 failed: {e}")
            return PipelineError(
                agent=1,
                message=str(e),
                pipeline_ran_at=datetime.now(timezone.utc).isoformat(),
            )
        
        if not collected.verified_matches:
            print("[Pipeline] No verified matches found")
            return PipelineNoMatches(
                pipeline_ran_at=datetime.now(timezone.utc).isoformat(),
            )
        
        # ─── Agent 2 : Statistician ────────────────────────
        try:
            print("[Pipeline] Running Agent 2: Statistician...")
            statistics = await self._run_with_retry(
                lambda: agent_statistician.run(
                    StatisticianOptions(matches=collected.verified_matches)
                ),
                "Statistician",
            )
        except Exception as e:
            print(f"[Pipeline] Agent 2 failed: {e}")
            return PipelineError(
                agent=2,
                message=str(e),
                pipeline_ran_at=datetime.now(timezone.utc).isoformat(),
            )
        
        # ─── Agent 3 : Strategist ──────────────────────────
        try:
            print("[Pipeline] Running Agent 3: Strategist...")
            predictions = await self._run_with_retry(
                lambda: agent_strategist.run(
                    StrategistInput(
                        matches=collected.verified_matches,
                        statistics=statistics,
                    )
                ),
                "Strategist",
            )
        except Exception as e:
            print(f"[Pipeline] Agent 3 failed: {e}")
            return PipelineError(
                agent=3,
                message=str(e),
                pipeline_ran_at=datetime.now(timezone.utc).isoformat(),
            )
        
        # Succès
        result = PipelineSuccess(
            pipeline_ran_at=datetime.now(timezone.utc).isoformat(),
            total_matches=len(collected.verified_matches),
            collected=collected,
            statistics=statistics,
            predictions=predictions,
        )
        
        # Mise en cache
        set_cached(cache_key, result.model_dump(), ttl=1800)
        print(f"[Pipeline] Pipeline completed — {result.total_matches} matches analyzed")
        
        return result
    
    async def _run_with_retry(self, agent_fn, name: str, max_retries: int = MAX_RETRIES) -> any:
        """Exécute un agent avec retry et timeout."""
        last_error = None
        
        for attempt in range(max_retries + 1):
            try:
                print(f"[Pipeline] {name} attempt {attempt + 1}/{max_retries + 1}")
                result = await asyncio.wait_for(agent_fn(), timeout=API_TIMEOUT)
                return result
            except asyncio.TimeoutError:
                last_error = TimeoutError(f"{name} timed out after {API_TIMEOUT}s")
                print(f"[Pipeline] {name} timed out (attempt {attempt + 1})")
            except Exception as e:
                last_error = e
                print(f"[Pipeline] {name} error (attempt {attempt + 1}): {e}")
            
            if attempt < max_retries:
                await asyncio.sleep(1)
        
        raise last_error


# Singleton
pipeline = Pipeline()
