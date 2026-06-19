from .session import get_db_connection
import json
from datetime import datetime
import os

def json_serial(obj):
    if isinstance(obj, (datetime)):
        return obj.isoformat()
    raise TypeError ("Type %s not serializable" % type(obj))

def _prepare_query(query: str) -> str:
    if os.environ.get('TESTING') == 'True':
        return query.replace('%s', '?')
    return query

def save_match(match_data: dict) -> int: # Ajout du type de retour
    conn = get_db_connection()
    cur = conn.cursor()
    query = _prepare_query("""
        INSERT INTO predictions_match 
        (external_id, home_team, away_team, home_logo, away_logo, competition, kickoff_utc, status, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (external_id) DO UPDATE SET
            home_logo = EXCLUDED.home_logo,
            away_logo = EXCLUDED.away_logo,
            status = EXCLUDED.status,
            updated_at = CURRENT_TIMESTAMP
        RETURNING id; -- Retourne l'ID du match
    """)
    cur.execute(query, (match_data['external_id'], match_data['home_team'], match_data['away_team'], 
          match_data.get('home_logo', ''), match_data.get('away_logo', ''),
          match_data['competition'], match_data['kickoff_utc'], match_data['status']))
    match_id = cur.fetchone()[0] # Récupère l'ID
    conn.commit()
    cur.close()
    conn.close()
    return match_id # Retourne l'ID du match

def get_scheduled_matches() -> list[dict]:
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(_prepare_query("SELECT * FROM predictions_match WHERE status IN ('upcoming', 'SCHEDULED', 'NS')"))
    # Note: conversion from tuple to dict requires column mapping
    columns = [desc[0] for desc in cur.description]
    results = [dict(zip(columns, row)) for row in cur.fetchall()]
    cur.close()
    conn.close()
    return results

def save_prediction(prediction_data: dict):
    conn = get_db_connection()
    cur = conn.cursor()
    query = _prepare_query("""
        INSERT INTO predictions_predictionresult 
        (match_id, predicted_outcome, confidence_score, value, model_version, prediction_source, features_snapshot, 
         value_bet, key_factors, processing_ms, created_at, updated_at, away_logo, away_team, competition, data_quality, 
         home_logo, home_team, kickoff_utc, min_odds, recommended_bet, risk_level, sources_used)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
    """)
    cur.execute(query, (prediction_data['match_id'], 
          prediction_data['predicted_outcome'], 
          prediction_data['confidence'], 
          prediction_data['value'],
          prediction_data.get('model_version', 'v1.0'),
          prediction_data.get('prediction_source', 'xgboost'),
          json.dumps(prediction_data.get('features_snapshot', {}), default=json_serial),
          prediction_data.get('value_bet', False),
          prediction_data.get('key_factors', '[]'),
          prediction_data.get('processing_ms', 0),
          prediction_data.get('away_logo', ''),
          prediction_data.get('away_team', 'Unknown'),
          prediction_data.get('competition', 'Unknown'),
          prediction_data.get('data_quality', 'MINIMAL'),
          prediction_data.get('home_logo', ''),
          prediction_data.get('home_team', 'Unknown'),
          prediction_data.get('kickoff_utc', ''),
          prediction_data.get('min_odds', 0),
          prediction_data.get('recommended_bet', '1'),
          prediction_data.get('risk_level', 'LOW'),
          prediction_data.get('sources_used', '[]')
    ))
    conn.commit()
    cur.close()
    conn.close()

def get_match(match_id: int) -> dict:
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(_prepare_query("SELECT * FROM predictions_match WHERE id = %s"), (match_id,))
    row = cur.fetchone()
    columns = [desc[0] for desc in cur.description]
    result = dict(zip(columns, row)) if row else {}
    cur.close()
    conn.close()
    return result

def get_match_features(match_id: int) -> dict: # match_id est maintenant un int
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(_prepare_query("SELECT * FROM predictions_matchfeatures WHERE match_id = %s"), (match_id,))
    row = cur.fetchone()
    columns = [desc[0] for desc in cur.description]
    if not row:
        result = {}
    else:
        result = {}
        for col, val in zip(columns, row):
            if isinstance(val, (int, float)):
                result[col] = float(val)
            elif val is None:
                result[col] = 0.0
            else:
                result[col] = val
    cur.close()
    conn.close()
    return result
