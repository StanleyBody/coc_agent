from django.urls import path
from . import views

urlpatterns = [
    path('', views.strategy_guides, name='strategy_guides'),
]
