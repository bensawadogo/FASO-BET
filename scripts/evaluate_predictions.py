import os
import psycopg2
import pandas as pd
from datetime import datetime

# Configuration base de données
DB_NAME = os.environ.get('POSTGRES_DB', 'fasobet')
DB_USER = os.environ.get('POSTGRES_USER', 'fasobet')
DB_PASS = os.environ.get('POSTGRES_PASSWORD', 'changeme_in_prod')
DB_HOST = 'postgres'

def evaluate():
    conn = psycopg2.connect(dbname=DB_NAME, user=DB_USER, password=DB_PASS, host=DB_HOST)
    cur = conn.cursor()
    
    query = """
        SELECT p.model_version, p.predicted_outcome, m.home_score, m.away_score
        FROM predictions_predictionresult p
        JOIN predictions_match m ON p.match_id = m.external_id
        WHERE m.status = 'finished' AND m.home_score IS NOT NULL;
    """
    df = pd.read_sql(query, conn)
    
    # Label mapping (simplifié pour l'audit)
    def get_real_label(row):
        if row['home_score'] > row['away_score']: return 'HOME'
        if row['home_score'] < row['away_score']: return 'AWAY'
        return 'DRAW'
    
    df['real_label'] = df.apply(get_real_label, axis=1)
    df['is_correct'] = df['predicted_outcome'] == df['real_label']
    
    results = df.groupby('model_version').agg(
        total_predictions=('is_correct', 'count'),
        correct=('is_correct', 'sum')
    )
    results['accuracy'] = results['correct'] / results['total_predictions']
    
    print(results)
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    evaluate()
