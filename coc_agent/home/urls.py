from django.urls import path
from . import views


urlpatterns = [
    path('', views.index, name='index'),
    path('strategy-guides/', views.strategy_guides, name='strategy_guides'),
    path('player-search/', views.player_search, name='player_search'),
    path('events/', views.events, name='events'),
]