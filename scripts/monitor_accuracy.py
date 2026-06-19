import os
import psycopg2
import pandas as pd
from datetime import datetime, timedelta

# Configuration
DB_NAME = os.environ.get('POSTGRES_DB', 'fasobet')
DB_USER = os.environ.get('POSTGRES_USER', 'fasobet')
DB_PASS = os.environ.get('POSTGRES_PASSWORD', 'changeme_in_prod')
DB_HOST = 'postgres'

def monitor_accuracy():
    conn = psycopg2.connect(dbname=DB_NAME, user=DB_USER, password=DB_PASS, host=DB_HOST)
    
    # Récupérer logs + résultats réels
    query = """
        SELECT p.created_at, p.predicted_outcome, m.home_score, m.away_score
        FROM predictions_predictionresult p
        JOIN predictions_match m ON p.match_id = m.external_id
        WHERE m.status = 'finished' AND m.home_score IS NOT NULL
        ORDER BY p.created_at DESC;
    """
    df = pd.read_sql(query, conn)
    conn.close()

    if df.empty:
        print("Aucune donnée pour le monitoring.")
        return

    def get_real_label(row):
        if row['home_score'] > row['away_score']: return 'HOME'
        if row['home_score'] < row['away_score']: return 'AWAY'
        return 'DRAW'
    
    df['real_label'] = df.apply(get_real_label, axis=1)
    df['is_correct'] = (df['predicted_outcome'] == df['real_label']).astype(int)
    
    # Rolling accuracy (fenêtre 100)
    df['rolling_acc'] = df['is_correct'].rolling(window=100, min_periods=10).mean()
    
    # Alerting
    last_acc = df['rolling_acc'].iloc[0]
    if last_acc < 0.50:
        print(f"ALERT: Model accuracy degraded to {last_acc:.2%} — retraining recommended")
    
    # Résumé hebdomadaire
    df['created_at'] = pd.to_datetime(df['created_at'])
    df['week'] = df['created_at'].dt.to_period('W')
    weekly = df.groupby('week').agg(
        predictions=('is_correct', 'count'),
        accuracy=('is_correct', 'mean')
    )
    
    print("\nPériode      | Prédictions | Accuracy")
    for week, row in weekly.tail(4).iterrows():
        print(f"{str(week):<12} | {int(row['predictions']):<11} | {row['accuracy']:.2%}")

if __name__ == "__main__":
    monitor_accuracy()
