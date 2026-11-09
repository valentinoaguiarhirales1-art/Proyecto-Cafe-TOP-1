import json
import re
from decimal import Decimal, InvalidOperation
from pathlib import Path

from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from catalog.models import Category, Product


class Command(BaseCommand):
    help = "Valida o importa productos exportados de MongoDB sin sobrescribir datos."

    def add_arguments(self, parser):
        parser.add_argument("file", type=Path)
        parser.add_argument("--dry-run", action="store_true", help="Valida sin guardar cambios.")

    @transaction.atomic
    def handle(self, *args, **options):
        try:
            with options["file"].open(encoding="utf-8") as file:
                items = json.load(file, parse_float=Decimal)
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise CommandError(f"No se pudo leer el archivo de productos: {exc}") from exc
        if not isinstance(items, list):
            raise CommandError("El archivo debe contener una lista de productos.")
        created = 0
        seen_ids = set()
        seen_names = set()
        for index, item in enumerate(items, start=1):
            if not isinstance(item, dict):
                raise CommandError(f"Producto {index}: se esperaba un objeto.")
            identifier = item.get("_id")
            name = item.get("name")
            category_name = item.get("category")
            if not isinstance(identifier, str) or not re.fullmatch(r"[0-9a-f]{24}", identifier):
                raise CommandError(f"Producto {index}: identificador MongoDB inválido.")
            if not isinstance(name, str) or not name.strip() or name != name.strip():
                raise CommandError(f"Producto {index}: nombre inválido.")
            if not isinstance(category_name, str) or not category_name.strip() or category_name != category_name.strip():
                raise CommandError(f"Producto {index}: categoría inválida.")
            if identifier in seen_ids or name in seen_names:
                raise CommandError(f"Producto {index}: identificador o nombre duplicado en el archivo.")
            seen_ids.add(identifier)
            seen_names.add(name)
            if Product.objects.filter(mongo_id=identifier).exists():
                raise CommandError(f"Producto {index}: este identificador ya existe en Django; no se ha sobrescrito.")
            if Product.objects.filter(name=name).exists():
                raise CommandError(f"Producto {index}: el nombre ya existe en Django; revisa el conflicto antes de importar.")
            if not isinstance(item.get("isAvailable"), bool):
                raise CommandError(f"Producto {index}: disponibilidad inválida.")
            if not isinstance(item.get("description"), str) or not isinstance(item.get("imageUrl"), str):
                raise CommandError(f"Producto {index}: descripción o imagen inválida.")
            try:
                if isinstance(item.get("price"), bool) or not isinstance(item.get("price"), (int, float, Decimal)):
                    raise ValueError
                price = Decimal(str(item["price"]))
                if not price.is_finite() or price < 0 or price.as_tuple().exponent < -2:
                    raise ValueError
            except (InvalidOperation, ValueError):
                raise CommandError(f"Producto {index}: precio inválido.")
            customization = item.get("customization")
            if not isinstance(customization, dict):
                raise CommandError(f"Producto {index}: opciones de personalización inválidas.")
            normalized = {}
            for group in ("sizes", "milkOptions", "extras"):
                entries = customization.get(group, [])
                if not isinstance(entries, list):
                    raise CommandError(f"Producto {index}: lista de opciones inválida.")
                normalized[group] = []
                option_names = set()
                for entry in entries:
                    if not isinstance(entry, dict) or not isinstance(entry.get("name"), str) or not entry["name"].strip():
                        raise CommandError(f"Producto {index}: nombre de opción inválido.")
                    option_name = entry["name"]
                    if option_name in option_names:
                        raise CommandError(f"Producto {index}: nombre de opción duplicado.")
                    option_names.add(option_name)
                    extra = entry.get("extraPrice", 0)
                    try:
                        if isinstance(extra, bool) or not isinstance(extra, (int, float, Decimal)):
                            raise ValueError
                        extra_price = Decimal(str(extra))
                        if not extra_price.is_finite() or extra_price < 0 or extra_price > Decimal("99999999.99") or extra_price.as_tuple().exponent < -2:
                            raise ValueError
                    except (InvalidOperation, ValueError):
                        raise CommandError(f"Producto {index}: precio de opción inválido.")
                    normalized[group].append({"name": option_name, "extraPrice": float(extra_price)})
            category, _ = Category.objects.get_or_create(name=category_name)
            product = Product(
                mongo_id=identifier, name=name, category=category, description=item["description"],
                price=price, image_url=item["imageUrl"], available=item["isAvailable"], customization=normalized,
            )
            try:
                product.full_clean()
            except ValidationError as exc:
                raise CommandError(f"Producto {index}: {exc}") from exc
            product.save()
            created += 1
        if options["dry_run"]:
            transaction.set_rollback(True)
            self.stdout.write(self.style.SUCCESS(f"Validación correcta: {created} productos; no se guardó ningún cambio."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Importados {created} productos; los datos anteriores no se modificaron."))
