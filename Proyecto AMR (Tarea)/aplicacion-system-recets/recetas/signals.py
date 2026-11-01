from django.db.models.signals import post_migrate
from django.dispatch import receiver

from .models import Category


@receiver(post_migrate)
def create_default_categories(sender, **kwargs):
    if sender.name != "recetas":
        return
    for name in ("Desayuno", "Comida", "Cena", "Postres", "Vegetariana", "Bebidas"):
        Category.objects.get_or_create(name=name, defaults={"slug": name.lower().replace(" ", "-")})
