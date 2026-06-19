"""FasoBet - Celery tasks (BLOC 2)
Tâches asynchrones pour le pipeline non-bloquant.
"""

from __future__ import annotations
import asyncio, logging
from datetime import datetime, timezone
from celery import shared_task
# Import the app instance from the project-level celery config
from sportpred.celery import app

logger = logging.getLogger("fasobet.tasks")

@app.task(name="api.tasks.collect_task", bind=True, max_retries=3, default_retry_delay=5)
def collect_task(self, options_dict=None):
    from api.agents.agent1_collector import agent_collector
    from api.models import CollectorOptions
    options = CollectorOptions(**(options_dict or {}))
    result = asyncio.run(agent_collector.run(options))
    return result.model_dump() if result else {"status": "no_matches"}

@app.task(name="api.tasks.analyze_task", bind=True)
def analyze_task(self, agent1_output):
    if agent1_output.get("status") == "no_matches":
        return {"status": "no_matches"}
    from api.agents.agent2_statistician import agent_statistician
    from api.models import StatisticianOptions, Agent2Output
    options = StatisticianOptions(matches=agent1_output['verified_matches'])
    agent2_result = asyncio.run(agent_statistician.run(options)).model_dump()
    agent2_result['verified_matches'] = agent1_output['verified_matches']
    return agent2_result

@app.task(name="api.tasks.predict_task", bind=True)
def predict_task(self, agent2_output):
    if agent2_output.get("status") == "no_matches":
        return {"predictions": [], "status": "no_matches"}

    from api.agents.agent3_strategist import AgentStrategist
    import psycopg2, os
    from urllib.parse import urlparse
    from scripts.build_features import (
        get_form, get_streak, get_season_stats, get_date
    )

    strategist = AgentStrategist()
    results = []

    # Connexion DB pour build features ciblé
    db_url = urlparse(os.environ.get('DATABASE_URL', ''))
    conn = psycopg2.connect(
        dbname=db_url.path[1:] or os.environ.get('POSTGRES_DB', 'fasobet'),
        user=db_url.username or os.environ.get('POSTGRES_USER', 'fasobet'),
        password=db_url.password or os.environ.get('POSTGRES_PASSWORD', 'changeme_in_prod'),
        host=db_url.hostname or 'postgres',
        port=db_url.port or 5432
    )
    cur = conn.cursor()

    # Charger l'historique complet UNE SEULE FOIS
    cur.execute("""
        SELECT id, home_team, away_team, kickoff_utc,
               home_score, away_score,
               odds_home, odds_draw, odds_away, competition
        FROM predictions_match
        ORDER BY kickoff_utc ASC
    """)
    rows = cur.fetchall()
    cols = ['id','home_team','away_team','kickoff_utc',
            'home_score','away_score',
            'odds_home','odds_draw','odds_away','competition']
    all_matches = [dict(zip(cols, r)) for r in rows]

    # ELO global calculé en ordre chronologique
    elo_ratings = {}
    def get_elo(team):
        return elo_ratings.get(team, 1500.0)

    for m in all_matches:
        h, a = m['home_team'], m['away_team']
        if m['home_score'] is None:
            continue
        elo_h, elo_a = get_elo(h), get_elo(a)
        K = 32
        exp_h = 1 / (1 + 10**((elo_a - elo_h)/400))
        res = 1 if m['home_score'] > m['away_score'] else \
              (0.5 if m['home_score'] == m['away_score'] else 0)
        elo_ratings[h] = elo_h + K*(res - exp_h)
        elo_ratings[a] = elo_a + K*((1-res)-(1-exp_h))

    from api.agents.agent2_statistician import agent_statistician
    from predictions.models import Match as DjangoMatch
    
    for analysis in agent2_output.get('analyses', []):
        match_ext_id = str(analysis.get('match_id', ''))
        vm = next(
            (m for m in agent2_output.get('verified_matches', [])
             if str(m.get('id','')) == match_ext_id),
            None
        )
        
        from predictions.models import Match as DjangoMatch # Ensure DjangoMatch is imported here if not already
        from django.utils.dateparse import parse_datetime # Ensure parse_datetime is imported here if not already
        
        match = DjangoMatch.objects.filter(
            external_id=match_ext_id
        ).first()
        
        if not match and vm:
            match, created = DjangoMatch.objects.get_or_create(
                external_id=match_ext_id,
                defaults={
                    'home_team': vm.get('home', ''),
                    'away_team': vm.get('away', ''),
                    'match_date': parse_datetime(vm.get('date','')),
                    'competition': vm.get('competition', 'FIFA World Cup 2026'),
                    'status': 'SCHEDULED',
                }
            )
            if created:
                logger.info(f"Match créé automatiquement: {match}")
        
        if not match:
            logger.warning(f"match_id invalide ou introuvable: {match_ext_id}")
            continue
        
        db_id = match.id

        # Récupérer le match depuis la DB
        cur.execute("""
            SELECT id, home_team, away_team, kickoff_utc,
                   odds_home, odds_draw, odds_away, competition
            FROM predictions_match WHERE id = %s
        """, (db_id,))
        row = cur.fetchone()
        if not row:
            logger.warning(f"Match {match_id} introuvable")
            continue

        db_id, home, away, m_date = row[0], row[1], row[2], row[3]
        odds_home, odds_draw, odds_away = row[4], row[5], row[6]
        competition = row[7]

        # Calculer les features pour ce match spécifique
        elo_h = round(get_elo(home), 2)
        elo_a = round(get_elo(away), 2)
        streak_h = get_streak(home, m_date, all_matches)
        streak_a = get_streak(away, m_date, all_matches)
        pts_h, gd_h, gf_h, ga_h = get_season_stats(home, m_date,
                                                    all_matches, competition)
        pts_a, gd_a, gf_a, ga_a = get_season_stats(away, m_date,
                                                    all_matches, competition)
        f3_h = get_form(home, m_date, all_matches, 3)
        f10_h = get_form(home, m_date, all_matches, 10)
        f3_a = get_form(away, m_date, all_matches, 3)
        f10_a = get_form(away, m_date, all_matches, 10)
        mom_h = round(f3_h - f10_h, 4)
        mom_a = round(f3_a - f10_a, 4)

        o_h = odds_home or 2.5
        o_d = odds_draw or 3.2
        o_a = odds_away or 2.8
        imp_h = round(1.0/o_h, 6)
        imp_d = round(1.0/o_d, 6)
        imp_a = round(1.0/o_a, 6)

        # Upsert dans match_features
        cur.execute("""
            INSERT INTO predictions_matchfeatures
            (match_id, elo_home, elo_away,
             form_home, form_away, form_last3_home, form_last3_away,
             goals_for_home, goals_ag_home, goals_for_away, goals_ag_away,
             odds_home, odds_draw, odds_away,
             streak_home, streak_away,
             ranking_home, ranking_away,
             goal_diff_home, goal_diff_away,
             momentum_home, momentum_away,
             odds_implied_home, odds_implied_draw, odds_implied_away,
             odds_margin, label, model_version, created_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,
                    NULL,'v1.2',CURRENT_TIMESTAMP)
            ON CONFLICT (match_id) DO UPDATE SET
                elo_home=EXCLUDED.elo_home,
                elo_away=EXCLUDED.elo_away,
                form_home=EXCLUDED.form_home,
                form_away=EXCLUDED.form_away,
                form_last3_home=EXCLUDED.form_last3_home,
                form_last3_away=EXCLUDED.form_last3_away,
                goals_for_home=EXCLUDED.goals_for_home,
                goals_ag_home=EXCLUDED.goals_ag_home,
                goals_for_away=EXCLUDED.goals_for_away,
                goals_ag_away=EXCLUDED.goals_ag_away,
                odds_home=EXCLUDED.odds_home,
                odds_draw=EXCLUDED.odds_draw,
                odds_away=EXCLUDED.odds_away,
                streak_home=EXCLUDED.streak_home,
                streak_away=EXCLUDED.streak_away,
                ranking_home=EXCLUDED.ranking_home,
                ranking_away=EXCLUDED.ranking_away,
                goal_diff_home=EXCLUDED.goal_diff_home,
                goal_diff_away=EXCLUDED.goal_diff_away,
                momentum_home=EXCLUDED.momentum_home,
                momentum_away=EXCLUDED.momentum_away,
                odds_implied_home=EXCLUDED.odds_implied_home,
                odds_implied_draw=EXCLUDED.odds_implied_draw,
                odds_implied_away=EXCLUDED.odds_implied_away,
                odds_margin=EXCLUDED.odds_margin,
                model_version=EXCLUDED.model_version
        """, (db_id, elo_h, elo_a,
              f3_h, f3_a, f3_h, f3_a,
              gf_h, ga_h, gf_a, ga_a,
              o_h, o_d, o_a,
              streak_h, streak_a,
              pts_h, pts_a,
              gd_h, gd_a,
              mom_h, mom_a,
              imp_h, imp_d, imp_a,
              imp_h - imp_a))
        conn.commit()

        # Prédire immédiatement
        pred = asyncio.run(
            strategist.predict_match(match_id=db_id)
        )
        results.append(pred)
        logger.info(f"Prédit : {home} vs {away} → {pred}")

    cur.close()
    conn.close()
    return {"predictions": results, "status": "success"}

@app.task(name="api.tasks.build_features_task")
def build_features_task():
    """Tâche Celery pour l'ETL quotidien des features."""
    from scripts.build_features import build_features
    build_features()
    return {"status": "completed"}

@app.task(name="api.tasks.monitor_accuracy_task")
def monitor_accuracy_task():
    from scripts.monitor_accuracy import monitor_accuracy
    monitor_accuracy()
    return {"status": "completed"}
