import json
from pathlib import Path

from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from catalog.models import SiteSetting


class Command(BaseCommand):
    help = "Valida o importa ajustes visuales MongoDB sin sobrescribir datos."

    def add_arguments(self, parser):
        parser.add_argument("file", type=Path)
        parser.add_argument("--dry-run", action="store_true", help="Valida sin guardar cambios.")

    @transaction.atomic
    def handle(self, *args, **options):
        try:
            with options["file"].open(encoding="utf-8") as file:
                items = json.load(file)
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise CommandError(f"No se pudo leer el archivo de ajustes: {exc}") from exc
        if not isinstance(items, list):
            raise CommandError("El archivo debe contener una lista de ajustes.")
        seen = set()
        for index, item in enumerate(items, start=1):
            if not isinstance(item, dict):
                raise CommandError(f"Ajuste {index}: se esperaba un objeto.")
            key, value = item.get("key"), item.get("value")
            if not isinstance(key, str) or key not in SiteSetting.Key.values:
                raise CommandError(f"Ajuste {index}: la clave no está disponible en Django; revisa el origen.")
            if key in seen or SiteSetting.objects.filter(key=key).exists():
                raise CommandError(f"Ajuste {index}: clave duplicada; no se ha sobrescrito.")
            if not isinstance(value, str):
                raise CommandError(f"Ajuste {index}: el valor debe ser texto.")
            seen.add(key)
            setting = SiteSetting(key=key, value=value)
            try:
                setting.full_clean()
            except ValidationError as exc:
                raise CommandError(f"Ajuste {index}: datos inválidos; revisa el contenido.") from exc
            setting.save()
        if options["dry_run"]:
            transaction.set_rollback(True)
            self.stdout.write(self.style.SUCCESS(f"Validación correcta: {len(items)} ajustes; no se guardó ningún cambio."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Importados {len(items)} ajustes; no se modificaron los existentes."))
