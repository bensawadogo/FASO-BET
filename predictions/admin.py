from django.contrib import admin
from .models import Sport, Team, Match, Prediction, UserProfile, FeatureFlag, AgentConfig


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

@admin.register(FeatureFlag)
class FeatureFlagAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'created_at', 'updated_at')
    list_editable = ('is_active',)
    search_fields = ('name', 'description')
    list_filter = ('is_active',)

@admin.register(AgentConfig)
class AgentConfigAdmin(admin.ModelAdmin):
    list_display = ('agent_name', 'endpoint', 'is_enabled', 'timeout', 'max_retries')
    list_editable = ('is_enabled', 'timeout', 'max_retries')
    list_filter = ('agent_name', 'is_enabled')
    search_fields = ('agent_name', 'endpoint')
    fieldsets = (
        (None, {
            'fields': ('agent_name', 'is_enabled')
        }),
        ('Configuration API', {
            'fields': ('api_key', 'endpoint', 'timeout', 'max_retries')
        }),
    )
