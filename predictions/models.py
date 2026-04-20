from django.db import models
from django.contrib.auth.models import User


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
        ('upcoming', 'À venir'),
        ('live', 'En direct'),
        ('finished', 'Terminé'),
    ]

    sport = models.ForeignKey(Sport, on_delete=models.CASCADE, related_name='matches')
    team_a = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='home_matches')
    team_b = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='away_matches')
    date = models.DateTimeField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='upcoming')
    score_a = models.IntegerField(null=True, blank=True)
    score_b = models.IntegerField(null=True, blank=True)
    league = models.CharField(max_length=100, blank=True, default='')

    class Meta:
        verbose_name_plural = 'matches'
        ordering = ['date']

    def __str__(self):
        return f"{self.team_a} vs {self.team_b}"

    @property
    def is_predictable(self):
        return self.status == 'upcoming'


class Prediction(models.Model):
    OUTCOME_CHOICES = [
        ('team_a', 'Équipe A'),
        ('draw', 'Match nul'),
        ('team_b', 'Équipe B'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='predictions')
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name='predictions')
    predicted_outcome = models.CharField(max_length=10, choices=OUTCOME_CHOICES)
    confidence = models.IntegerField(default=50)
    is_correct = models.BooleanField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'match')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} → {self.match}"


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    points = models.IntegerField(default=0)
    total_predictions = models.IntegerField(default=0)
    correct_predictions = models.IntegerField(default=0)
    current_streak = models.IntegerField(default=0)
    best_streak = models.IntegerField(default=0)
    avatar_emoji = models.CharField(max_length=10, default='👤')

    @property
    def accuracy(self):
        if self.total_predictions == 0:
            return 0
        return round((self.correct_predictions / self.total_predictions) * 100, 1)

    def __str__(self):
        return f"{self.user.username} — {self.points} pts"
