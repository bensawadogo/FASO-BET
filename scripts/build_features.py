import os
import psycopg2
from datetime import datetime, date

# Configuration
DB_NAME = os.environ.get('POSTGRES_DB', 'fasobet')
DB_USER = os.environ.get('POSTGRES_USER', 'fasobet')
DB_PASS = os.environ.get('POSTGRES_PASSWORD', 'changeme_in_prod')
DB_HOST = 'postgres'

def get_date(val):
    if hasattr(val, 'date'):
        return val.date()
    if isinstance(val, str):
        try:
            return datetime.fromisoformat(val.replace('Z', '+00:00')).date()
        except:
            return date.fromisoformat(val[:10])
    return val

def get_team_matches(team, before_date, all_matches, competition=None):
    target_date = get_date(before_date)
    matches = []
    for m in all_matches:
        m_date = get_date(m['kickoff_utc'])
        # On ne prend que les matchs finis avec score pour l'historique de forme
        if m_date < target_date and (m['home_team'] == team or m['away_team'] == team) and m['home_score'] is not None:
            if competition and m['competition'] != competition:
                continue
            matches.append(m)
    return matches

def get_form(team, before_date, all_matches, n=5):
    team_matches = get_team_matches(team, before_date, all_matches)
    recent = team_matches[-n:]
    if not recent: return 0.5
    wins = sum(1 for m in recent if (m['home_team'] == team and m['home_score'] > m['away_score']) or (m['away_team'] == team and m['away_score'] > m['home_score']))
    return round(wins / len(recent), 4)

def get_streak(team, before_date, all_matches):
    team_matches = get_team_matches(team, before_date, all_matches)
    if not team_matches: return 0.0
    
    streak = 0
    current_type = None # 'win', 'loss', 'draw'
    
    for m in reversed(team_matches):
        res = 'draw'
        if (m['home_team'] == team and m['home_score'] > m['away_score']) or (m['away_team'] == team and m['away_score'] > m['home_score']):
            res = 'win'
        elif (m['home_team'] == team and m['home_score'] < m['away_score']) or (m['away_team'] == team and m['away_score'] < m['home_score']):
            res = 'loss'
            
        if current_type is None:
            current_type = res
            streak = 1 if res == 'win' else -1 if res == 'loss' else 0
            if res == 'draw': break
        else:
            if res == current_type:
                streak += 1 if res == 'win' else -1
            else:
                break
    return float(streak)

def get_season_stats(team, before_date, all_matches, competition):
    team_matches = get_team_matches(team, before_date, all_matches, competition)
    points = 0
    goal_diff = 0
    gf = 0
    ga = 0
    for m in team_matches:
        if m['home_team'] == team:
            gf += m['home_score']
            ga += m['away_score']
            goal_diff += (m['home_score'] - m['away_score'])
            if m['home_score'] > m['away_score']: points += 3
            elif m['home_score'] == m['away_score']: points += 1
        else:
            gf += m['away_score']
            ga += m['home_score']
            goal_diff += (m['away_score'] - m['home_score'])
            if m['away_score'] > m['home_score']: points += 3
            elif m['away_score'] == m['home_score']: points += 1
    return float(points), float(goal_diff), float(gf), float(ga)

def build_features():
    conn = psycopg2.connect(dbname=DB_NAME, user=DB_USER, password=DB_PASS, host=DB_HOST)
    cur = conn.cursor()
    print("Début du calcul des features (ETL v8 - Live Support)...")

    cur.execute("""
        SELECT
            m.id, m.home_team, m.away_team, m.kickoff_utc,
            m.home_score, m.away_score, m.competition, m.status,
            COALESCE(f.odds_pin_home, f.odds_avg_home, m.odds_home, 2.5) as odds_home,
            COALESCE(f.odds_pin_draw, f.odds_avg_draw, m.odds_draw, 3.2) as odds_draw,
            COALESCE(f.odds_pin_away, f.odds_avg_away, m.odds_away, 2.8) as odds_away
        FROM predictions_match m
        LEFT JOIN predictions_fdcoodds f
            ON f.home_team_fdco = m.home_team
            AND f.away_team_fdco = m.away_team
            AND f.match_date = m.kickoff_utc::date
        ORDER BY m.kickoff_utc ASC
    """)
    rows = cur.fetchall()
    cols = ['id','home_team','away_team','kickoff_utc','home_score','away_score','competition','status','odds_home','odds_draw','odds_away']
    all_matches = [dict(zip(cols, r)) for r in rows]

    if not all_matches:
        print("ERREUR : aucun match en base")
        return

    elo_ratings = {}
    def get_elo(team): return elo_ratings.get(team, 1500.0)

    for i, match in enumerate(all_matches):
        m_id, home, away, m_date, h_s, a_s, competition = match['id'], match['home_team'], match['away_team'], match['kickoff_utc'], match['home_score'], match['away_score'], match['competition']

        # ELO (AU MOMENT DU MATCH)
        elo_h, elo_a = get_elo(home), get_elo(away)
        
        # Update ELO pour le prochain match (UNIQUEMENT SI FINISHED)
        if h_s is not None and a_s is not None:
            K = 32
            exp_h = 1 / (1 + 10 ** ((elo_a - elo_h) / 400))
            res_h = 1 if h_s > a_s else (0.5 if h_s == a_s else 0)
            elo_ratings[home] = elo_h + K * (res_h - exp_h)
            elo_ratings[away] = elo_a + K * ((1 - res_h) - (1 - exp_h))

        # Advanced Features
        streak_h = get_streak(home, m_date, all_matches)
        streak_a = get_streak(away, m_date, all_matches)
        
        pts_h, gd_h, gf_h, ga_h = get_season_stats(home, m_date, all_matches, competition)
        pts_a, gd_a, gf_a, ga_a = get_season_stats(away, m_date, all_matches, competition)
        
        f3_h = get_form(home, m_date, all_matches, 3)
        f10_h = get_form(home, m_date, all_matches, 10)
        f3_a = get_form(away, m_date, all_matches, 3)
        f10_a = get_form(away, m_date, all_matches, 10)
        
        mom_h = round(f3_h - f10_h, 4)
        mom_a = round(f3_a - f10_a, 4)

        # Implied odds
        o_h = match['odds_home'] or 2.5
        o_d = match['odds_draw'] or 3.2
        o_a = match['odds_away'] or 2.8
        imp_h = 1.0 / o_h
        imp_d = 1.0 / o_d
        imp_a = 1.0 / o_a

        # Label (NULL si match non joué)
        label = None
        if h_s is not None and a_s is not None:
            label = "HOME" if h_s > a_s else "AWAY" if h_s < a_s else "DRAW"

        try:
            # ON CONFLICT match_id DO UPDATE
            cur.execute("""
                INSERT INTO predictions_matchfeatures 
                (match_id, elo_home, elo_away, form_home, form_away, form_last3_home, form_last3_away,
                 goals_for_home, goals_ag_home, goals_for_away, goals_ag_away,
                 odds_home, odds_draw, odds_away,
                 streak_home, streak_away, ranking_home, ranking_away, 
                 goal_diff_home, goal_diff_away, momentum_home, momentum_away, 
                 odds_implied_home, odds_implied_draw, odds_implied_away, odds_margin, label, model_version, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'v1.2', CURRENT_TIMESTAMP)
                ON CONFLICT (match_id) DO UPDATE SET
                    elo_home = EXCLUDED.elo_home, elo_away = EXCLUDED.elo_away,
                    form_home = EXCLUDED.form_home, form_away = EXCLUDED.form_away,
                    form_last3_home = EXCLUDED.form_last3_home, form_last3_away = EXCLUDED.form_last3_away,
                    goals_for_home = EXCLUDED.goals_for_home, goals_ag_home = EXCLUDED.goals_ag_home,
                    goals_for_away = EXCLUDED.goals_for_away, goals_ag_away = EXCLUDED.goals_ag_away,
                    odds_home = EXCLUDED.odds_home, odds_draw = EXCLUDED.odds_draw, odds_away = EXCLUDED.odds_away,
                    streak_home = EXCLUDED.streak_home, streak_away = EXCLUDED.streak_away,
                    ranking_home = EXCLUDED.ranking_home, ranking_away = EXCLUDED.ranking_away,
                    goal_diff_home = EXCLUDED.goal_diff_home, goal_diff_away = EXCLUDED.goal_diff_away,
                    momentum_home = EXCLUDED.momentum_home, momentum_away = EXCLUDED.momentum_away,
                    odds_implied_home = EXCLUDED.odds_implied_home, odds_implied_draw = EXCLUDED.odds_implied_draw,
                    odds_implied_away = EXCLUDED.odds_implied_away, odds_margin = EXCLUDED.odds_margin,
                    label = EXCLUDED.label,
                    model_version = EXCLUDED.model_version;
            """, (m_id, elo_h, elo_a, f3_h, f3_a, f3_h, f3_a,
                  gf_h, ga_h, gf_a, ga_a,
                  o_h, o_d, o_a,
                  streak_h, streak_a, pts_h, pts_a, gd_h, gd_a, mom_h, mom_a, 
                  imp_h, imp_d, imp_a, imp_h - imp_a, label))
            
            if (i+1) % 1000 == 0:
                print(f"Traité {i+1}/{len(all_matches)} — {home} vs {away}")
                conn.commit()
        except Exception as e:
            print(f"Erreur update {m_id}: {e}")
            conn.rollback()

    conn.commit()
    print("ETL terminé.")
    cur.close()
    conn.close()

if __name__ == "__main__":
    build_features()
