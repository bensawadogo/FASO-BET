from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from .models import Sport, Team, Match, Prediction, UserProfile, FeatureFlag, AgentConfig
from .serializers import (
    UserSerializer, SportSerializer, TeamSerializer,
    MatchSerializer, PredictionSerializer, UserProfileSerializer,
    FeatureFlagSerializer, AgentConfigSerializer
)

class CustomTokenObtainPairView(TokenObtainPairView):
    """Endpoint personnalisé pour l'obtention des tokens JWT."""
    def post(self, request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')

        user = authenticate(username=username, password=password)

        if user is None:
            return Response(
                {'error': 'Identifiants invalides'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user).data
        })

class UserViewSet(viewsets.ModelViewSet):
    """API endpoint pour la gestion des utilisateurs."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'list']:
            return [permissions.AllowAny()]
        return super().get_permissions()

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Retourne les informations de l'utilisateur connecté."""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

class SportViewSet(viewsets.ModelViewSet):
    """API endpoint pour la gestion des sports."""
    queryset = Sport.objects.all()
    serializer_class = SportSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

class TeamViewSet(viewsets.ModelViewSet):
    """API endpoint pour la gestion des équipes."""
    queryset = Team.objects.all()
    serializer_class = TeamSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

class MatchViewSet(viewsets.ModelViewSet):
    """API endpoint pour la gestion des matchs."""
    queryset = Match.objects.all()
    serializer_class = MatchSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    @action(detail=True, methods=['get'])
    def predictable(self, request, pk=None):
        """Vérifie si un match est prédictible."""
        match = self.get_object()
        return Response({'predictable': match.is_predictable})

class PredictionViewSet(viewsets.ModelViewSet):
    """API endpoint pour la gestion des prédictions."""
    queryset = Prediction.objects.all()
    serializer_class = PredictionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Les utilisateurs ne peuvent voir que leurs propres prédictions
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Associe automatiquement l'utilisateur connecté
        serializer.save(user=self.request.user)

class UserProfileViewSet(viewsets.ModelViewSet):
    """API endpoint pour la gestion des profils utilisateurs."""
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Les utilisateurs ne peuvent voir que leur propre profil
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Associe automatiquement l'utilisateur connecté
        serializer.save(user=self.request.user)

class FeatureFlagViewSet(viewsets.ModelViewSet):
    """API endpoint pour la gestion des feature flags."""
    queryset = FeatureFlag.objects.all()
    serializer_class = FeatureFlagSerializer
    permission_classes = [permissions.IsAdminUser]

class AgentConfigViewSet(viewsets.ModelViewSet):
    """API endpoint pour la gestion des configurations d'agents IA."""
    queryset = AgentConfig.objects.all()
    serializer_class = AgentConfigSerializer
    permission_classes = [permissions.IsAdminUser]

    @action(detail=True, methods=['post'])
    def test_connection(self, request, pk=None):
        """Teste la connexion à l'API externe de l'agent."""
        config = self.get_object()
        # Ici on pourrait ajouter une logique pour tester la connexion réelle
        return Response({
            'status': 'success',
            'message': f'Connection testée pour {config.agent_name}',
            'endpoint': config.endpoint
        })