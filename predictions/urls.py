from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('matches/', views.matches_list, name='matches'),
    path('match/<int:pk>/', views.match_detail, name='match_detail'),
    path('my-predictions/', views.my_predictions, name='my_predictions'),
    path('leaderboard/', views.leaderboard, name='leaderboard'),
    path('register/', views.register_view, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
]
