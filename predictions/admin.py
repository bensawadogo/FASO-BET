from django.contrib import admin
from .models import Sport, Team, Match, Prediction, UserProfile


@admin.register(Sport)
class SportAdmin(admin.ModelAdmin):
    list_display = ('icon', 'name', 'slug')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'sport', 'logo_emoji')
    list_filter = ('sport',)


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = ('team_a', 'team_b', 'sport', 'date', 'status', 'score_a', 'score_b')
    list_filter = ('status', 'sport', 'date')
    list_editable = ('status', 'score_a', 'score_b')


@admin.register(Prediction)
class PredictionAdmin(admin.ModelAdmin):
    list_display = ('user', 'match', 'predicted_outcome', 'confidence', 'is_correct', 'created_at')
    list_filter = ('is_correct', 'predicted_outcome')


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'points', 'total_predictions', 'correct_predictions', 'accuracy', 'current_streak')
