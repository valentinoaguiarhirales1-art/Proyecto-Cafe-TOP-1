import json
import re
from datetime import datetime, time, timezone
from pathlib import Path

from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from catalog.models import GuestReservation


class Command(BaseCommand):
    help = "Valida o importa solicitudes de reserva sin sobrescribir datos."

    def add_arguments(self, parser):
        parser.add_argument("file", type=Path)
        parser.add_argument("--dry-run", action="store_true", help="Valida sin guardar cambios.")

    @transaction.atomic
    def handle(self, *args, **options):
        try:
            with options["file"].open(encoding="utf-8") as file:
                items = json.load(file)
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise CommandError(f"No se pudo leer el archivo de reservas: {exc}") from exc
        if not isinstance(items, list):
            raise CommandError("El archivo debe contener una lista de reservas.")
        seen_ids = set()
        for index, item in enumerate(items, start=1):
            if not isinstance(item, dict):
                raise CommandError(f"Reserva {index}: se esperaba un objeto.")
            identifier = item.get("_id")
            if not isinstance(identifier, str) or not re.fullmatch(r"[0-9a-f]{24}", identifier):
                raise CommandError(f"Reserva {index}: identificador MongoDB inválido.")
            if identifier in seen_ids or GuestReservation.objects.filter(mongo_id=identifier).exists():
                raise CommandError(f"Reserva {index}: identificador duplicado; no se ha sobrescrito.")
            seen_ids.add(identifier)
            for field in ("name", "email", "phone", "date", "time", "notes", "status", "createdAt"):
                if not isinstance(item.get(field), str):
                    raise CommandError(f"Reserva {index}: campo {field} inválido.")
            if not all(item[field].strip() for field in ("name", "email", "phone")):
                raise CommandError(f"Reserva {index}: faltan datos de contacto.")
            quantity = item.get("partySize")
            if isinstance(quantity, bool) or not isinstance(quantity, int) or not 1 <= quantity <= 12:
                raise CommandError(f"Reserva {index}: número de personas inválido.")
            try:
                original_date = datetime.fromisoformat(item["date"].replace("Z", "+00:00"))
                created_at = datetime.fromisoformat(item["createdAt"].replace("Z", "+00:00"))
                if original_date.utcoffset() is None or created_at.utcoffset() is None:
                    raise ValueError
                original_date = original_date.astimezone(timezone.utc)
                if original_date.time() != time(12, 0):
                    raise ValueError
                if not re.fullmatch(r"([01]\d|2[0-3]):[0-5]\d", item["time"]):
                    raise ValueError
                reservation_time = time.fromisoformat(item["time"])
            except ValueError as exc:
                raise CommandError(f"Reserva {index}: fecha, hora o fecha de creación inválida; revisa el origen.") from exc
            reservation = GuestReservation(
                mongo_id=identifier, name=item["name"].strip(), email=item["email"].strip().lower(),
                phone=item["phone"].strip(), date=original_date.date(), time=reservation_time,
                party_size=quantity, notes=item["notes"], status=item["status"],
            )
            try:
                reservation.full_clean()
            except ValidationError as exc:
                raise CommandError(f"Reserva {index}: datos inválidos; revisa los campos y el estado.") from exc
            reservation.save()
            GuestReservation.objects.filter(pk=reservation.pk).update(created_at=created_at)
        if options["dry_run"]:
            transaction.set_rollback(True)
            self.stdout.write(self.style.SUCCESS(f"Validación correcta: {len(items)} reservas; no se guardó ningún cambio."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Importadas {len(items)} reservas; los datos anteriores no se modificaron."))
