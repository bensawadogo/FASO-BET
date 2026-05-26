from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Sport, Team, Match, Prediction, UserProfile, FeatureFlag, AgentConfig

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

class MatchSerializer(serializers.ModelSerializer):
    sport = SportSerializer(read_only=True)
    team_a = TeamSerializer(read_only=True)
    team_b = TeamSerializer(read_only=True)
    sport_id = serializers.PrimaryKeyRelatedField(
        queryset=Sport.objects.all(),
        source='sport',
        write_only=True
    )
    team_a_id = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.all(),
        source='team_a',
        write_only=True
    )
    team_b_id = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.all(),
        source='team_b',
        write_only=True
    )

    class Meta:
        model = Match
        fields = '__all__'
        read_only_fields = ['status', 'is_predictable']

class PredictionSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    match = MatchSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='user',
        write_only=True
    )
    match_id = serializers.PrimaryKeyRelatedField(
        queryset=Match.objects.all(),
        source='match',
        write_only=True
    )

    class Meta:
        model = Prediction
        fields = '__all__'
        read_only_fields = ['is_correct', 'created_at']

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

class AgentConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentConfig
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
        extra_kwargs = {
            'api_key': {'write_only': True}
        }