import json
from pathlib import Path

from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from catalog.management.commands.import_mongo_orders import identifier
from catalog.models import CustomerProfile, TeamProfile


class Command(BaseCommand):
    help = "Valida o importa perfiles de equipo como privados y sin conceder permisos."

    def add_arguments(self, parser):
        parser.add_argument("file", type=Path)
        parser.add_argument("--dry-run", action="store_true", help="Valida sin guardar cambios.")

    @transaction.atomic
    def handle(self, *args, **options):
        try:
            with options["file"].open(encoding="utf-8") as file:
                items = json.load(file)
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise CommandError(f"No se pudo leer el archivo de perfiles: {exc}") from exc
        if not isinstance(items, list):
            raise CommandError("El archivo debe contener una lista de perfiles.")
        seen = set()
        for index, item in enumerate(items, start=1):
            try:
                self.import_profile(item, seen)
            except (ValueError, ValidationError, TypeError, OverflowError) as exc:
                raise CommandError(f"Perfil {index}: datos inválidos, cuenta ausente o perfil duplicado.") from exc
        if options["dry_run"]:
            transaction.set_rollback(True)
            self.stdout.write(self.style.SUCCESS(f"Validados {len(items)} perfiles; no se guardó ningún cambio."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Importados {len(items)} perfiles privados; no se concedieron permisos."))

    def import_profile(self, item, seen):
        if not isinstance(item, dict):
            raise ValueError
        mongo_id, name, role = item.get("_id"), item.get("name"), item.get("role")
        if not identifier(mongo_id) or mongo_id in seen:
            raise ValueError
        seen.add(mongo_id)
        if not isinstance(name, str) or not name.strip() or not isinstance(role, str) or role not in TeamProfile.Role.values:
            raise ValueError
        experience = item.get("experienceYears")
        if isinstance(experience, bool) or not isinstance(experience, int) or not 0 <= experience <= 60:
            raise ValueError
        for field in ("isRecentGraduate", "publicProfileConsent", "publicProfile"):
            if not isinstance(item.get(field), bool):
                raise ValueError
        if not isinstance(item.get("profileBio"), str):
            raise ValueError
        account = CustomerProfile.objects.select_related("user").filter(mongo_id=mongo_id).first()
        if account is None or TeamProfile.objects.filter(user=account.user).exists():
            raise ValueError
        profile = TeamProfile(
            user=account.user, name=name.strip(), role=role, experience_years=experience,
            is_recent_graduate=item["isRecentGraduate"], bio=item["profileBio"].strip(),
            public_profile=False, public_profile_consent=False,
        )
        profile.full_clean()
        profile.save()
