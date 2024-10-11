from django.urls import path, include
from . import views

app_name = 'dapps'
urlpatterns = [
    path('', views.index, name='index'),
    path('tokenPair/', views.tokenPair, name='tokenPair'),
    # path('swap/', views.swap, name='swap'),
]