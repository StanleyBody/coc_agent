from django.urls import path
from . import views

urlpatterns = [
    path('', views.sixth_builder, name='sixth_builder'),
]
