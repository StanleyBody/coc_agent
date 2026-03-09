from django.urls import path
from . import views

urlpatterns = [
    path('', views.player_search, name='player_search'),
]
