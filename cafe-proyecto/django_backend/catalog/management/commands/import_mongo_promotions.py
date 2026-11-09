import json
import re
from datetime import datetime
from decimal import Decimal
from pathlib import Path

from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from catalog.models import Promotion


class Command(BaseCommand):
    help = "Valida o importa promociones MongoDB sin sobrescribir datos."

    def add_arguments(self, parser):
        parser.add_argument("file", type=Path)
        parser.add_argument("--dry-run", action="store_true", help="Valida sin guardar cambios.")

    @transaction.atomic
    def handle(self, *args, **options):
        try:
            with options["file"].open(encoding="utf-8") as file:
                items = json.load(file, parse_float=Decimal)
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise CommandError(f"No se pudo leer el archivo de promociones: {exc}") from exc
        if not isinstance(items, list):
            raise CommandError("El archivo debe contener una lista de promociones.")
        seen_ids = set()
        for index, item in enumerate(items, start=1):
            if not isinstance(item, dict):
                raise CommandError(f"Promoción {index}: se esperaba un objeto.")
            identifier = item.get("_id")
            if (not isinstance(identifier, str) or not re.fullmatch(r"[0-9a-f]{24}", identifier)
                    or identifier in seen_ids or Promotion.objects.filter(mongo_id=identifier).exists()):
                raise CommandError(f"Promoción {index}: identificador inválido o duplicado; no se ha sobrescrito.")
            seen_ids.add(identifier)
            for field in ("title", "description", "imageUrl", "badge", "createdAt"):
                if not isinstance(item.get(field), str):
                    raise CommandError(f"Promoción {index}: campo {field} inválido.")
            if not item["title"].strip() or not item["description"].strip() or not isinstance(item.get("isActive"), bool):
                raise CommandError(f"Promoción {index}: faltan datos o la disponibilidad es inválida.")
            prices = []
            for field in ("originalPrice", "comboPrice"):
                value = item.get(field)
                if isinstance(value, bool) or not isinstance(value, (int, Decimal)):
                    raise CommandError(f"Promoción {index}: precio inválido.")
                price = Decimal(value)
                if not price.is_finite() or price < 0 or price.as_tuple().exponent < -2:
                    raise CommandError(f"Promoción {index}: precio inválido.")
                prices.append(price)
            try:
                created_at = datetime.fromisoformat(item["createdAt"].replace("Z", "+00:00"))
                if created_at.utcoffset() is None:
                    raise ValueError
            except ValueError as exc:
                raise CommandError(f"Promoción {index}: fecha inválida.") from exc
            promotion = Promotion(
                mongo_id=identifier, title=item["title"].strip(), description=item["description"],
                original_price=prices[0], combo_price=prices[1], image_url=item["imageUrl"],
                badge=item["badge"], items_included=item.get("itemsIncluded"), active=item["isActive"],
            )
            try:
                promotion.full_clean()
            except ValidationError as exc:
                raise CommandError(f"Promoción {index}: datos inválidos; revisa los campos.") from exc
            promotion.save()
            Promotion.objects.filter(pk=promotion.pk).update(created_at=created_at)
        if options["dry_run"]:
            transaction.set_rollback(True)
            self.stdout.write(self.style.SUCCESS(f"Validación correcta: {len(items)} promociones; no se guardó ningún cambio."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Importadas {len(items)} promociones; no se modificaron las existentes."))
