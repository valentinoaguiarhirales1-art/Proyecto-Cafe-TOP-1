import json
from pathlib import Path
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from catalog.management.commands.import_mongo_orders import identifier, money, timestamp
from catalog.models import CustomerProfile, Event, EventBooking


class Command(BaseCommand):
    help = "Valida o importa eventos y asistentes MongoDB sin sobrescribir datos."

    def add_arguments(self, parser):
        parser.add_argument("file", type=Path)
        parser.add_argument("--dry-run", action="store_true", help="Valida sin guardar cambios.")

    @transaction.atomic
    def handle(self, *args, **options):
        try:
            with options["file"].open(encoding="utf-8") as file:
                events = json.load(file, parse_float=Decimal)
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise CommandError(f"No se pudo leer el archivo de eventos: {exc}") from exc
        if not isinstance(events, list):
            raise CommandError("El archivo debe contener una lista de eventos.")
        event_ids, booking_ids = set(), set()
        for index, data in enumerate(events, start=1):
            try:
                self.import_event(data, event_ids, booking_ids)
            except (ValueError, ValidationError, TypeError, OverflowError) as exc:
                raise CommandError(
                    f"Evento {index}: datos inválidos, aforo insuficiente o cuenta de asistente no encontrada."
                ) from exc
        if options["dry_run"]:
            transaction.set_rollback(True)
            self.stdout.write(self.style.SUCCESS(f"Validación correcta: {len(events)} eventos; no se guardó ningún cambio."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Importados {len(events)} eventos; no se modificaron los existentes."))

    def import_event(self, data, event_ids, booking_ids):
        if not isinstance(data, dict):
            raise ValueError
        event_id = data.get("_id")
        if not identifier(event_id) or event_id in event_ids or Event.objects.filter(mongo_id=event_id).exists():
            raise ValueError
        event_ids.add(event_id)
        for field in ("title", "description", "time", "location", "imageUrl", "category"):
            if not isinstance(data.get(field), str):
                raise ValueError
        if any(not data[field].strip() for field in ("title", "description", "time", "location", "category")):
            raise ValueError
        capacity = data.get("capacity")
        attendees = data.get("attendees")
        if isinstance(capacity, bool) or not isinstance(capacity, int) or not 1 <= capacity <= 2147483647:
            raise ValueError
        if not isinstance(attendees, list):
            raise ValueError
        bookings = []
        reserved_seats = 0
        for attendee in attendees:
            if not isinstance(attendee, dict):
                raise ValueError
            booking_id, user_id, seats = attendee.get("_id"), attendee.get("user"), attendee.get("seats")
            if (not identifier(booking_id) or booking_id in booking_ids
                    or EventBooking.objects.filter(mongo_id=booking_id).exists() or not identifier(user_id)
                    or isinstance(seats, bool) or not isinstance(seats, int) or not 1 <= seats <= 4):
                raise ValueError
            booking_ids.add(booking_id)
            profile = CustomerProfile.objects.select_related("user").filter(mongo_id=user_id).first()
            if profile is None:
                raise ValueError
            bookings.append((booking_id, profile.user, seats, timestamp(attendee.get("registeredAt"))))
            reserved_seats += seats
        if reserved_seats > capacity:
            raise ValueError
        event = Event(
            mongo_id=event_id, title=data["title"], description=data["description"], date=timestamp(data.get("date")),
            time_label=data["time"], location=data["location"], capacity=capacity, reserved_seats=reserved_seats,
            price=money(data.get("price")), image_url=data["imageUrl"], category=data["category"],
        )
        event.full_clean()
        event.save()
        for booking_id, customer, seats, registered_at in bookings:
            booking = EventBooking(mongo_id=booking_id, event=event, customer=customer, seats=seats)
            booking.full_clean()
            booking.save()
            EventBooking.objects.filter(pk=booking.pk).update(created_at=registered_at)
