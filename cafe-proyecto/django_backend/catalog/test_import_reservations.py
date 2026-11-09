import json
import tempfile
from io import StringIO
from pathlib import Path

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from .models import GuestReservation


class MongoReservationImportTests(TestCase):
    def setUp(self):
        self.item = {
            "_id": "507f1f77bcf86cd799439011",
            "name": "Cliente",
            "email": "cliente@example.test",
            "phone": "5551234567",
            "date": "2026-12-10T12:00:00.000Z",
            "time": "14:30",
            "partySize": 3,
            "notes": "Mesa",
            "status": "Confirmada",
            "createdAt": "2026-11-08T20:00:00.000Z",
        }

    def run_import(self, items, *args):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "reservas.json"
            path.write_text(json.dumps(items, ensure_ascii=False), encoding="utf-8")
            call_command("import_mongo_reservations", str(path), *args, stdout=StringIO())

    def test_preview_then_import_preserves_status_and_dates(self):
        self.run_import([self.item], "--dry-run")
        self.assertEqual(GuestReservation.objects.count(), 0)
        self.run_import([self.item])
        reservation = GuestReservation.objects.get()
        self.assertEqual(reservation.mongo_id, self.item["_id"])
        self.assertEqual(reservation.date.isoformat(), "2026-12-10")
        self.assertEqual(reservation.time.isoformat(), "14:30:00")
        self.assertEqual(reservation.created_at.isoformat(), "2026-11-08T20:00:00+00:00")
        self.assertEqual(reservation.status, "Confirmada")
        self.assertEqual(reservation.party_size, 3)

    def test_duplicates_do_not_overwrite(self):
        self.run_import([self.item])
        with self.assertRaises(CommandError):
            self.run_import([{**self.item, "status": "Rechazada"}])
        self.assertEqual(GuestReservation.objects.get().status, "Confirmada")

    def test_invalid_second_record_rolls_back_first(self):
        invalid = {**self.item, "_id": "507f1f77bcf86cd799439012", "status": "Inexistente"}
        with self.assertRaises(CommandError):
            self.run_import([self.item, invalid])
        self.assertEqual(GuestReservation.objects.count(), 0)

    def test_rejects_ambiguous_dates_and_invalid_contacts(self):
        for values in (
            {"date": "2026-12-10T00:00:00.000Z"},
            {"date": "2026-12-10T12:00:00"},
            {"time": "25:00"},
            {"email": "sin-correo"},
            {"partySize": True},
            {"phone": "  "},
        ):
            with self.assertRaises(CommandError):
                self.run_import([{**self.item, **values}])
        self.assertEqual(GuestReservation.objects.count(), 0)
