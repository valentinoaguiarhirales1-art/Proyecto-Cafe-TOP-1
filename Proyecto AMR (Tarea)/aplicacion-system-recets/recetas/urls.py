from django.contrib.auth import views as auth_views
from django.urls import path

from . import views

urlpatterns = [
    path("", views.recipe_list, name="recipe_list"),
    path("registro/", views.register, name="register"),
    path("acceder/", auth_views.LoginView.as_view(template_name="registration/login.html"), name="login"),
    path("salir/", auth_views.LogoutView.as_view(), name="logout"),
    path("idioma/<str:language>/", views.set_language, name="set_language"),
    path("recetas/nueva/", views.recipe_create, name="recipe_create"),
    path("recetas/<slug:slug>/", views.recipe_detail, name="recipe_detail"),
    path("recetas/<slug:slug>/editar/", views.recipe_update, name="recipe_update"),
    path("recetas/<slug:slug>/eliminar/", views.recipe_delete, name="recipe_delete"),
    path("recetas/<slug:slug>/traducir/<str:language>/", views.recipe_translate, name="recipe_translate"),
    path("recetas/<slug:slug>/valorar/", views.rate_recipe, name="rate_recipe"),
]
