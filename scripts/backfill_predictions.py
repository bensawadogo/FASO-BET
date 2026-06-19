import asyncio
import psycopg2
from api.agents.agent3_strategist import agent_strategist
from api.db.session import get_db_connection

async def run_backfill(limit=100):
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Récupérer 100 matchs terminés sans prédiction pour éviter les doublons
    cur.execute(f"""
        SELECT m.id 
        FROM predictions_match m
        LEFT JOIN predictions_predictionresult p ON m.id::text = p.match_id
        WHERE m.status = 'finished' AND p.id IS NULL
        LIMIT {limit};
    """)
    match_ids = [r[0] for r in cur.fetchall()]
    cur.close()
    conn.close()

    print(f"Lancement du backfill sur {len(match_ids)} matchs historiques...")

    for mid in match_ids:
        try:
            # Appel de l'inférence ML (XGBoost)
            result = await agent_strategist.predict_match(match_id=mid)
            print(f"Match {mid} prédit: {result['prediction']} (Source: {result['prediction_source']})")
        except Exception as e:
            print(f"Erreur sur match {mid}: {e}")

if __name__ == "__main__":
    asyncio.run(run_backfill())
