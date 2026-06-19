from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Sport, Team, UserProfile, FeatureFlag, Alert, PredictionResult


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id', 'username']

class SportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sport
        fields = '__all__'

class TeamSerializer(serializers.ModelSerializer):
    sport = SportSerializer(read_only=True)
    sport_id = serializers.PrimaryKeyRelatedField(
        queryset=Sport.objects.all(),
        source='sport',
        write_only=True
    )

    class Meta:
        model = Team
        fields = '__all__'

class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = UserProfile
        fields = '__all__'
        read_only_fields = ['user', 'accuracy']

class FeatureFlagSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeatureFlag
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

class AlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alert
        fields = '__all__'
        read_only_fields = ['created_at']

class PredictionResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = PredictionResult
        fields = '__all__'

class LeagueDetailSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    country = serializers.CharField()
    flag = serializers.CharField()
    season = serializers.CharField()
    teams = serializers.SerializerMethodField()
    def get_teams(self, obj):
        return []
