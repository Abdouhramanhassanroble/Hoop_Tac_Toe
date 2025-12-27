from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('grid/', views.get_grid, name='get_grid'),
    path('autocomplete/', views.autocomplete_player, name='autocomplete'),
    path('check/', views.check_move, name='check_move'),
]

