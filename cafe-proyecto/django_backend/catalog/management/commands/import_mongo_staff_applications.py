import json
from pathlib import Path

from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from catalog.management.commands.import_mongo_orders import identifier, timestamp
from catalog.models import StaffApplication


class Command(BaseCommand):
    help = "Valida o importa solicitudes de empleo MongoDB sin sobrescribir datos."

    def add_arguments(self, parser):
        parser.add_argument("file", type=Path)
        parser.add_argument("--dry-run", action="store_true", help="Valida sin guardar cambios.")

    @transaction.atomic
    def handle(self, *args, **options):
        try:
            with options["file"].open(encoding="utf-8") as file:
                items = json.load(file)
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise CommandError(f"No se pudo leer el archivo de solicitudes: {exc}") from exc
        if not isinstance(items, list):
            raise CommandError("El archivo debe contener una lista de solicitudes.")

        seen = set()
        for index, data in enumerate(items, start=1):
            try:
                self.import_application(data, seen)
            except (ValueError, ValidationError, TypeError, OverflowError) as exc:
                raise CommandError(
                    f"Solicitud {index}: datos inválidos, identificador duplicado o estado que requiere revisión."
                ) from exc
        if options["dry_run"]:
            transaction.set_rollback(True)
            self.stdout.write(self.style.SUCCESS(f"Validación correcta: {len(items)} solicitudes; no se guardó ningún cambio."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Importadas {len(items)} solicitudes; no se modificaron las existentes."))

    def import_application(self, data, seen):
        if not isinstance(data, dict):
            raise ValueError
        mongo_id = data.get("_id")
        if not identifier(mongo_id) or mongo_id in seen or StaffApplication.objects.filter(mongo_id=mongo_id).exists():
            raise ValueError
        seen.add(mongo_id)
        for field in ("name", "email", "phone", "requestedPosition", "profileBio"):
            if not isinstance(data.get(field), str):
                raise ValueError
        if len(data["name"].strip()) < 2 or not data["email"].strip():
            raise ValueError
        experience = data.get("experienceYears")
        if isinstance(experience, bool) or not isinstance(experience, int) or not 0 <= experience <= 60:
            raise ValueError
        if not isinstance(data.get("isRecentGraduate"), bool) or not isinstance(data.get("publicProfileConsent"), bool):
            raise ValueError
        statuses = {"pending": StaffApplication.Status.PENDING, "rejected": StaffApplication.Status.REJECTED}
        if data.get("status") not in statuses:
            raise ValueError
        created_at = timestamp(data.get("createdAt"))
        application = StaffApplication(
            mongo_id=mongo_id, name=data["name"].strip(), email=data["email"].strip().lower(),
            phone=data["phone"].strip(), requested_position=data["requestedPosition"],
            experience_years=experience, is_recent_graduate=data["isRecentGraduate"],
            public_profile_consent=data["publicProfileConsent"], profile_bio=data["profileBio"].strip(),
            status=statuses[data["status"]],
        )
        application.full_clean()
        application.save()
        StaffApplication.objects.filter(pk=application.pk).update(created_at=created_at)
