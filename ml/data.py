import pandas as pd
from api.db.session import get_db_connection
from sklearn.preprocessing import LabelEncoder

def get_training_data():
    conn = get_db_connection()
    # SQL avec toutes les colonnes
    query = """
        SELECT 
            mf.elo_home, mf.elo_away, mf.form_home, mf.form_away, 
            mf.goals_for_home, mf.goals_ag_home, mf.goals_for_away, mf.goals_ag_away,
            mf.odds_home, mf.odds_draw, mf.odds_away, mf.h2h_home_wins,
            mf.form_last3_home, mf.form_last3_away, mf.home_advantage, mf.away_weakness,
            mf.odds_implied_home, mf.odds_implied_draw, mf.odds_implied_away, mf.odds_margin,
            mf.streak_home, mf.streak_away, mf.ranking_home, mf.ranking_away,
            mf.goal_diff_home, mf.goal_diff_away, mf.momentum_home, mf.momentum_away,
            mf.label
        FROM predictions_matchfeatures mf
        JOIN predictions_match m ON mf.match_id = m.id
        WHERE mf.label IS NOT NULL
        ORDER BY mf.created_at ASC
    """
    df = pd.read_sql(query, conn)
    conn.close()

    # Mapping explicite et stable
    label_map = {'AWAY': 0, 'DRAW': 1, 'HOME': 2}
    df['label'] = df['label'].map(label_map)

    # Convertir toutes les colonnes en numérique, forcer l'erreur en NaN
    for col in df.columns:
        if col != 'label':
            df[col] = pd.to_numeric(df[col], errors='coerce')
    
    # Remplir les NaN par 0
    df = df.fillna(0)

    return df

def get_temporal_split(df: pd.DataFrame, test_size=0.2):
    split_idx = int(len(df) * (1 - test_size))
    train = df.iloc[:split_idx]
    test = df.iloc[split_idx:]
    return train, test
