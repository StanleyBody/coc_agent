from django.urls import path
from . import views

urlpatterns = [
    path('', views.upgrade_info_view, name='upgrade_info'),
    path('api/buildings/', views.api_buildings, name='api_buildings'),
    path('api/heroes/', views.api_heroes, name='api_heroes'),
    path('api/troops/', views.api_troops, name='api_troops'),
]
