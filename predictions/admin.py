from django.contrib import admin
from .models import Sport, Team, UserProfile, FeatureFlag, PredictionResult, Alert


@admin.register(Sport)
class SportAdmin(admin.ModelAdmin):
    list_display = ('icon', 'name', 'slug')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'sport', 'logo_emoji')
    list_filter = ('sport',)


@admin.register(PredictionResult)
class PredictionResultAdmin(admin.ModelAdmin):
    list_display = ('match_id', 'predicted_outcome', 'confidence_score', 'actual_result', 'created_at')
    list_filter = ('risk_level', 'data_quality')


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'points', 'total_predictions', 'correct_predictions', 'accuracy', 'current_streak')

@admin.register(FeatureFlag)
class FeatureFlagAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'created_at', 'updated_at')
    list_editable = ('is_active',)
    search_fields = ('name', 'description')
    list_filter = ('is_active',)

@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ('user', 'channel', 'league', 'is_active')

