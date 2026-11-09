import json
import tempfile
from io import StringIO
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from .models import CustomerProfile, Event, EventBooking


class EventImportTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="cliente", password="clave-prueba")
        CustomerProfile.objects.create(user=self.user, mongo_id="507f1f77bcf86cd799439011")
        self.event = {
            "_id": "507f1f77bcf86cd799439012", "title": "Cata", "description": "Café de prueba",
            "date": "2030-01-20T20:00:00.000Z", "time": "14:00 hrs", "location": "Matriz",
            "capacity": 4, "price": 50.5, "imageUrl": "/images/prueba.jpg", "category": "Cata de Café",
            "attendees": [{"_id": "507f1f77bcf86cd799439013", "user": "507f1f77bcf86cd799439011",
                           "seats": 3, "registeredAt": "2026-11-08T20:00:00.000Z"}],
        }

    def import_events(self, events, *args):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "eventos.json"
            path.write_text(json.dumps(events), encoding="utf-8")
            call_command("import_mongo_events", str(path), *args, stdout=StringIO())

    def test_preview_import_and_conflicts(self):
        self.import_events([self.event], "--dry-run")
        self.assertFalse(Event.objects.exists())
        self.assertFalse(EventBooking.objects.exists())
        self.import_events([self.event])
        event = Event.objects.get()
        booking = EventBooking.objects.get()
        self.assertEqual(event.mongo_id, self.event["_id"])
        self.assertEqual(event.reserved_seats, 3)
        self.assertEqual(str(event.price), "50.50")
        self.assertEqual(event.date.isoformat(), "2030-01-20T20:00:00+00:00")
        self.assertEqual(booking.customer, self.user)
        self.assertEqual(booking.mongo_id, self.event["attendees"][0]["_id"])
        self.assertEqual(booking.created_at.isoformat(), "2026-11-08T20:00:00+00:00")
        with self.assertRaises(CommandError):
            self.import_events([self.event])
        self.assertEqual(EventBooking.objects.count(), 1)

    def test_invalid_second_event_rolls_back_first(self):
        for overrides in (
            {"capacity": 2}, {"price": -1}, {"date": "2030-01-20T20:00:00"},
            {"attendees": [{**self.event["attendees"][0], "_id": "507f1f77bcf86cd799439014",
                            "user": "507f1f77bcf86cd799439099"}]},
            {"attendees": [self.event["attendees"][0]]},
        ):
            second = {**self.event, "_id": "507f1f77bcf86cd799439015", **overrides}
            with self.assertRaises(CommandError):
                self.import_events([self.event, second])
            self.assertFalse(Event.objects.exists())
            self.assertFalse(EventBooking.objects.exists())

    def test_invalid_attendee_and_empty_events(self):
        for values in ({"seats": 0}, {"seats": 5}, {"seats": True}, {"registeredAt": None}, {"_id": None}):
            attendee = {**self.event["attendees"][0], **values}
            with self.assertRaises(CommandError):
                self.import_events([{**self.event, "attendees": [attendee]}])
        self.import_events([{**self.event, "attendees": []}])
        self.assertEqual(Event.objects.get().reserved_seats, 0)
