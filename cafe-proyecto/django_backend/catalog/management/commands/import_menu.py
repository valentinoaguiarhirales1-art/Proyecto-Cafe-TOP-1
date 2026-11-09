import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from catalog.models import Category, Product


class Command(BaseCommand):
    help = "Importa el catálogo de ejemplo sin sobrescribir productos existentes."

    @transaction.atomic
    def handle(self, *args, **options):
        path = Path(__file__).resolve().parents[4] / "shared" / "menuItems.json"
        try:
            with path.open(encoding="utf-8") as file:
                items = json.load(file)
        except (OSError, json.JSONDecodeError) as exc:
            raise CommandError(f"No se pudo leer el catálogo: {exc}") from exc

        created_count = 0
        for item in items:
            category, _ = Category.objects.get_or_create(name=item["category"])
            product = Product(
                name=item["name"],
                description=item["description"],
                price=item["price"],
                category=category,
                image_url=item.get("imageUrl", ""),
                customization=item.get("customization", {}),
            )
            if not Product.objects.filter(name=product.name).exists():
                product.full_clean()
                product.save()
                created_count += 1
        self.stdout.write(self.style.SUCCESS(f"Productos nuevos: {created_count}."))
