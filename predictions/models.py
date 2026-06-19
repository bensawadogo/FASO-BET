from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class Sport(models.Model):
    name = models.CharField(max_length=50)
    icon = models.CharField(max_length=10, default='⚽')
    slug = models.SlugField(unique=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.icon} {self.name}"


class Team(models.Model):
    name = models.CharField(max_length=100)
    sport = models.ForeignKey(Sport, on_delete=models.CASCADE, related_name='teams')
    logo_emoji = models.CharField(max_length=10, default='🏆')

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

class Match(models.Model):
    STATUS_CHOICES = [
        ("upcoming", "Upcoming"),
        ("live", "Live"),
        ("finished", "Finished"),
        ("cancelled", "Cancelled"),
    ]
    external_id = models.CharField(max_length=100, unique=True, db_index=True)
    home_team = models.CharField(max_length=100)
    away_team = models.CharField(max_length=100)
    home_logo = models.CharField(max_length=500, blank=True, default="")
    away_logo = models.CharField(max_length=500, blank=True, default="")
    competition = models.CharField(max_length=100)
    kickoff_utc = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="upcoming")
    
    odds_home = models.FloatField(null=True, blank=True)
    odds_draw = models.FloatField(null=True, blank=True)
    odds_away = models.FloatField(null=True, blank=True)
    
    home_score = models.IntegerField(null=True, blank=True)
    away_score = models.IntegerField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Matches"
        ordering = ["kickoff_utc"]

    def __str__(self):
        return f"{self.home_team} vs {self.away_team} ({self.competition})"

class PredictionResult(models.Model):
    OUTCOME_CHOICES = [
        ("home_win", "Home Win"),
        ("draw", "Draw"),
        ("away_win", "Away Win"),
    ]
    RISK_CHOICES = [
        ("LOW", "Low"),
        ("MEDIUM", "Medium"),
        ("HIGH", "High"),
    ]
    QUALITY_CHOICES = [
        ("COMPLETE", "Complet"),
        ("PARTIAL", "Partiel"),
        ("MINIMAL", "Minimal"),
    ]

    match_id          = models.CharField(max_length=100, db_index=True, default="0")
    linked_match      = models.ForeignKey(
        'Match',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='predictions'
    )
    home_team         = models.CharField(max_length=100, default="Unknown")
    away_team         = models.CharField(max_length=100, default="Unknown")
    competition       = models.CharField(max_length=100, default="Unknown")
    kickoff_utc       = models.CharField(max_length=50, default="")
    kickoff_datetime  = models.DateTimeField(null=True, blank=True, help_text="Date et heure du match (timezone-aware)")
    predicted_outcome = models.CharField(max_length=20, choices=OUTCOME_CHOICES, default="draw")
    confidence_score  = models.FloatField(default=0.0)
    risk_level        = models.CharField(max_length=10, choices=RISK_CHOICES, default="LOW")
    value             = models.FloatField(default=0.0)
    key_factors       = models.JSONField(default=list)
    recommended_bet   = models.CharField(max_length=5, default="1")
    min_odds          = models.FloatField(default=1.5)
    data_quality      = models.CharField(max_length=20, choices=QUALITY_CHOICES, default="MINIMAL")
    sources_used      = models.JSONField(default=list)
    processing_ms     = models.IntegerField(default=0)
    actual_result     = models.CharField(
        max_length=20, null=True, blank=True
    )
    home_logo         = models.CharField(max_length=500, blank=True, default="")
    away_logo         = models.CharField(max_length=500, blank=True, default="")
    value_bet         = models.BooleanField(default=False)
    created_at        = models.DateTimeField(auto_now_add=True)
    updated_at        = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes  = [
            models.Index(fields=["match_id"]),
            models.Index(fields=["created_at"]),
        ]

    @property
    def was_correct(self) -> bool | None:
        if not self.actual_result:
            return None
        return self.predicted_outcome == self.actual_result

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    points = models.IntegerField(default=0)
    total_predictions = models.IntegerField(default=0)
    correct_predictions = models.IntegerField(default=0)
    current_streak = models.IntegerField(default=0)
    best_streak = models.IntegerField(default=0)
    avatar_emoji = models.CharField(max_length=10, default='👤')
    bankroll_initial = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    bankroll_current = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default='FCFA')
    stake_default = models.DecimalField(max_digits=5, decimal_places=2, default=5)
    subscription_plan = models.CharField(max_length=20, default='free', help_text='free, premium, pro')

    @property
    def accuracy(self):
        if self.total_predictions == 0:
            return 0
        return round((self.correct_predictions / self.total_predictions) * 100, 1)

    def __str__(self):
        return f"{self.user.username} — {self.points} pts"

class FeatureFlag(models.Model):
    name = models.CharField(max_length=50, unique=True, help_text="Nom unique du feature flag")
    is_active = models.BooleanField(default=False, help_text="Indique si le feature est activé")
    description = models.TextField(blank=True, help_text="Description de la fonctionnalité")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Feature Flag"
        verbose_name_plural = "Feature Flags"
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({'✅' if self.is_active else '❌'})"

class Alert(models.Model):
    CHANNEL_CHOICES = [('whatsapp', 'WhatsApp'), ('telegram', 'Telegram'), ('push', 'Push')]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='alerts')
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES)
    league = models.CharField(max_length=100, blank=True)
    min_confidence = models.IntegerField(default=70)
    is_active = models.BooleanField(default=True)
    contact = models.CharField(max_length=200, blank=True)
    odds_threshold = models.FloatField(default=2.0)
    volatility_threshold = models.IntegerField(default=20)
    auto_stake = models.BooleanField(default=False)
    capital_allocation = models.IntegerField(default=2)
    strategy_mode = models.CharField(
        max_length=20,
        default='equilibre',
        choices=[
            ('conservateur', 'Conservateur'),
            ('equilibre', 'Équilibré'),
            ('agressif', 'Agressif'),
        ]
    )
    live_score = models.BooleanField(default=True)
    probability_drop = models.BooleanField(default=False)
    market_movement = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.channel}] {self.league or 'Toutes'}"

class MatchFeatures(models.Model):
    match = models.OneToOneField('Match', on_delete=models.CASCADE, related_name='features')
    # Features existantes
    elo_home = models.FloatField(null=True)
    elo_away = models.FloatField(null=True)
    form_home = models.FloatField(null=True)
    form_away = models.FloatField(null=True)
    goals_for_home = models.FloatField(null=True)
    goals_ag_home = models.FloatField(null=True)
    goals_for_away = models.FloatField(null=True)
    goals_ag_away = models.FloatField(null=True)
    odds_home = models.FloatField(null=True)
    odds_draw = models.FloatField(null=True)
    odds_away = models.FloatField(null=True)
    h2h_home_wins = models.FloatField(null=True)
    
    # Nouvelles features cotes et forme
    form_last3_home = models.FloatField(null=True)
    form_last3_away = models.FloatField(null=True)
    home_advantage = models.FloatField(null=True)
    away_weakness = models.FloatField(null=True)
    odds_implied_home = models.FloatField(null=True)
    odds_implied_draw = models.FloatField(null=True)
    odds_implied_away = models.FloatField(null=True)
    odds_margin = models.FloatField(null=True)
    odds_total_prob = models.FloatField(null=True)
    
    # Features avancées (Sprint 51% -> 58%+)
    streak_home = models.FloatField(null=True)
    streak_away = models.FloatField(null=True)
    ranking_home = models.FloatField(null=True)
    ranking_away = models.FloatField(null=True)
    goal_diff_home = models.FloatField(null=True)
    goal_diff_away = models.FloatField(null=True)
    momentum_home = models.FloatField(null=True)
    momentum_away = models.FloatField(null=True)

    label = models.CharField(max_length=4, null=True)
    model_version = models.CharField(max_length=20, default='v1.0')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['label']),
            models.Index(fields=['model_version']),
        ]

class FdcoOdds(models.Model):
    """
    Cotes réelles football-data.co.uk.
    Table séparée — ne pas modifier matches ni match_features.
    """
    # Identification du match
    home_team_fdco = models.CharField(max_length=100)
    away_team_fdco = models.CharField(max_length=100)
    match_date     = models.DateField()
    competition    = models.CharField(max_length=50)
    season         = models.CharField(max_length=10)

    # Scores (vérification)
    fthg = models.IntegerField(null=True)  # Full Time Home Goals
    ftag = models.IntegerField(null=True)  # Full Time Away Goals

    # Cotes 1XBet (priorité pour marché africain)
    odds_1xb_home = models.FloatField(null=True)
    odds_1xb_draw = models.FloatField(null=True)
    odds_1xb_away = models.FloatField(null=True)

    # Cotes Pinnacle (référence sharp money)
    odds_pin_home = models.FloatField(null=True)
    odds_pin_draw = models.FloatField(null=True)
    odds_pin_away = models.FloatField(null=True)

    # Cotes marché moyen (signal robuste)
    odds_avg_home = models.FloatField(null=True)
    odds_avg_draw = models.FloatField(null=True)
    odds_avg_away = models.FloatField(null=True)

    # Stats match (features supplémentaires)
    home_shots        = models.IntegerField(null=True)  # HS
    away_shots        = models.IntegerField(null=True)  # AS
    home_shots_target = models.IntegerField(null=True)  # HST
    away_shots_target = models.IntegerField(null=True)  # AST
    home_corners      = models.IntegerField(null=True)  # HC
    away_corners      = models.IntegerField(null=True)  # AC

    # Lien vers matches (nullable — mapping peut échouer)
    match_fk = models.ForeignKey(
        'Match',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='fdco_odds'
    )

    class Meta:
        unique_together = [['home_team_fdco', 'away_team_fdco', 'match_date']]
        indexes = [
            models.Index(fields=['match_date']),
            models.Index(fields=['competition', 'season']),
        ]

class InternationalMatch(models.Model):
    """Matchs sélections nationales — séparés des matchs de clubs"""
    home_team = models.CharField(max_length=100)
    away_team = models.CharField(max_length=100)
    home_logo = models.CharField(max_length=500, blank=True, default="")
    away_logo = models.CharField(max_length=500, blank=True, default="")
    home_score = models.IntegerField(null=True)
    away_score = models.IntegerField(null=True)
    match_date = models.DateField()
    tournament = models.CharField(max_length=200)
    city = models.CharField(max_length=100, null=True)
    country = models.CharField(max_length=100, null=True)
    neutral = models.BooleanField(default=False)

    # Live status fields (CdM2026)
    kickoff_utc = models.DateTimeField(null=True, blank=True, help_text="Coup d'envoi exact en UTC")
    STATUS_CHOICES = [
        ("scheduled", "Scheduled"),
        ("live", "Live"),
        ("finished", "Finished"),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="scheduled")
    current_minute = models.IntegerField(null=True)
    last_live_update = models.DateTimeField(null=True)

    class Meta:
        unique_together = [['home_team', 'away_team', 'match_date', 'tournament']]
        indexes = [
            models.Index(fields=['match_date']),
            models.Index(fields=['tournament']),
            models.Index(fields=['home_team', 'away_team']),
            models.Index(fields=['status']),
        ]

class InternationalFeatures(models.Model):
    """Features ML pour matchs internationaux"""
    match = models.OneToOneField(InternationalMatch, on_delete=models.CASCADE)
    elo_home = models.FloatField(null=True)
    elo_away = models.FloatField(null=True)
    form_home = models.FloatField(null=True)
    form_away = models.FloatField(null=True)
    form_wc_home = models.FloatField(null=True)
    form_wc_away = models.FloatField(null=True)
    h2h_wins = models.FloatField(null=True)
    home_neutral = models.BooleanField(default=False)
    label = models.CharField(max_length=4, null=True)
    xg_home = models.FloatField(null=True)
    xg_away = models.FloatField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=['label'])]
