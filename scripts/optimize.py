import optuna
import xgboost as xgb
from sklearn.metrics import accuracy_score
from ml.data import get_training_data, get_temporal_split

FEATURES = ['elo_home', 'elo_away', 'form_home', 'form_away', 
            'goals_for_home', 'goals_ag_home', 'goals_for_away', 'goals_ag_away', 
            'odds_home', 'odds_draw', 'odds_away', 'h2h_home_wins',
            'form_last3_home', 'form_last3_away', 'home_advantage', 'away_weakness',
            'odds_implied_home', 'odds_implied_draw', 'odds_implied_away', 'odds_margin']

def objective(trial):
    params = {
        'n_estimators': trial.suggest_int('n_estimators', 100, 500),
        'max_depth': trial.suggest_int('max_depth', 3, 8),
        'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3)
    }
    df = get_training_data()
    train_df, test_df = get_temporal_split(df)
    
    model = xgb.XGBClassifier(**params, objective='multi:softprob')
    model.fit(train_df[FEATURES], train_df['label'])
    preds = model.predict(test_df[FEATURES])
    return accuracy_score(test_df['label'], preds)

if __name__ == "__main__":
    optuna.logging.set_verbosity(optuna.logging.WARNING)
    study = optuna.create_study(direction='maximize')
    study.optimize(objective, n_trials=50)
    print('Meilleurs params:', study.best_params)
    print('Meilleure accuracy:', study.best_value)
