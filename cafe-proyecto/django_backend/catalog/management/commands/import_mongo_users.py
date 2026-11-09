import json
import re
from pathlib import Path

import bcrypt
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.core.validators import validate_email
from django.db import transaction

from catalog.models import CustomerProfile

ROLES = {"client", "barista", "atencion", "encargado", "subgerente", "gerente", "supervisor", "codueno", "admin"}


class Command(BaseCommand):
    help = "Valida o importa cuentas MongoDB sin sobrescribir cuentas ni conceder permisos."

    def add_arguments(self, parser):
        parser.add_argument("file", type=Path)
        parser.add_argument("--dry-run", action="store_true", help="Valida sin guardar cambios.")
        parser.add_argument(
            "--staff-as-customers", action="store_true",
            help="Importa cuentas de personal sin permisos; asígnalos manualmente después.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        try:
            with options["file"].open(encoding="utf-8") as file:
                items = json.load(file)
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise CommandError(f"No se pudo leer el archivo de cuentas: {exc}") from exc
        if not isinstance(items, list):
            raise CommandError("El archivo debe contener una lista de cuentas.")
        users = get_user_model().objects
        seen_ids, seen_emails = set(), set()
        for index, item in enumerate(items, start=1):
            if not isinstance(item, dict):
                raise CommandError(f"Cuenta {index}: se esperaba un objeto.")
            identifier, email = item.get("_id"), item.get("email")
            name, phone, role, password = item.get("name"), item.get("phone"), item.get("role"), item.get("password")
            if not isinstance(identifier, str) or not re.fullmatch(r"[0-9a-f]{24}", identifier):
                raise CommandError(f"Cuenta {index}: identificador inválido.")
            if not isinstance(email, str) or not email.strip() or len(email.strip()) > 254:
                raise CommandError(f"Cuenta {index}: correo inválido.")
            email = email.strip().lower()
            try:
                validate_email(email)
            except ValidationError as exc:
                raise CommandError(f"Cuenta {index}: correo inválido.") from exc
            if not isinstance(name, str) or not name.strip() or len(name.strip()) > 150:
                raise CommandError(f"Cuenta {index}: nombre inválido.")
            if not isinstance(phone, str) or len(phone.strip()) > 30:
                raise CommandError(f"Cuenta {index}: teléfono inválido.")
            if not isinstance(role, str) or role not in ROLES:
                raise CommandError(f"Cuenta {index}: rol inválido.")
            if role != "client" and not options["staff_as_customers"]:
                raise CommandError(f"Cuenta {index}: es personal; revisa los permisos antes de usar --staff-as-customers.")
            if not isinstance(password, str) or not re.fullmatch(r"\$2[ab]\$(0[4-9]|1[0-4])\$[./A-Za-z0-9]{53}", password):
                raise CommandError(f"Cuenta {index}: contraseña cifrada no compatible.")
            try:
                bcrypt.checkpw(b"validacion", password.encode("ascii"))
            except ValueError as exc:
                raise CommandError(f"Cuenta {index}: contraseña cifrada no compatible.") from exc
            username = f"mongo_{identifier}"
            if (identifier in seen_ids or email in seen_emails
                    or CustomerProfile.objects.filter(mongo_id=identifier).exists()
                    or users.filter(username=username).exists() or users.filter(email__iexact=email).exists()):
                raise CommandError(f"Cuenta {index}: identificador, nombre de usuario o correo duplicado; no se ha sobrescrito.")
            seen_ids.add(identifier)
            seen_emails.add(email)
            user = users.create(username=username, email=email, first_name=name.strip(), password=f"bcrypt${password}")
            CustomerProfile.objects.create(user=user, phone=phone.strip(), mongo_id=identifier)
        if options["dry_run"]:
            transaction.set_rollback(True)
            self.stdout.write(self.style.SUCCESS(f"Validación correcta: {len(items)} cuentas; no se guardó ningún cambio."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Importadas {len(items)} cuentas sin permisos de personal; no se modificaron las existentes."))
