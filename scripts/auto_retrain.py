import os
import psycopg2
import pandas as pd
from scripts.train import train

# Configuration
DB_NAME = os.environ.get('POSTGRES_DB', 'fasobet')
DB_USER = os.environ.get('POSTGRES_USER', 'fasobet')
DB_PASS = os.environ.get('POSTGRES_PASSWORD', 'changeme_in_prod')
DB_HOST = 'postgres'

def auto_retrain():
    conn = psycopg2.connect(dbname=DB_NAME, user=DB_USER, password=DB_PASS, host=DB_HOST)
    query = """
        SELECT AVG(is_correct) as rolling_acc
        FROM (
            SELECT (p.predicted_outcome = 
                CASE WHEN m.home_score > m.away_score THEN 'HOME' 
                     WHEN m.home_score < m.away_score THEN 'AWAY' 
                     ELSE 'DRAW' END) as is_correct
            FROM predictions_predictionresult p
            JOIN predictions_match m ON p.match_id = m.external_id
            WHERE m.status = 'finished'
            ORDER BY p.created_at DESC LIMIT 100
        ) as sub;
    """
    df = pd.read_sql(query, conn)
    conn.close()
    
    acc = df['rolling_acc'].iloc[0]
    
    if acc < 0.50:
        print(f"Accuracy trop faible ({acc:.2%}), lancement ré-entraînement...")
        train()
        print("Ré-entraînement terminé.")
    else:
        print(f"Accuracy suffisante ({acc:.2%}), pas de ré-entraînement nécessaire.")

if __name__ == "__main__":
    auto_retrain()
