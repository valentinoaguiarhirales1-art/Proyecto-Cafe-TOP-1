import json
import tempfile
from io import StringIO
from pathlib import Path

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from .models import StaffApplication


class StaffApplicationImportTests(TestCase):
    def setUp(self):
        self.item = {
            "_id": "507f1f77bcf86cd799439011", "name": "Persona de prueba",
            "email": "PERSONA@example.com", "phone": "", "requestedPosition": "barista",
            "experienceYears": 2, "isRecentGraduate": True, "publicProfileConsent": False,
            "profileBio": "", "status": "pending", "createdAt": "2026-01-20T20:00:00.000Z",
        }

    def import_items(self, items, *args):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "solicitudes.json"
            path.write_text(json.dumps(items), encoding="utf-8")
            call_command("import_mongo_staff_applications", str(path), *args, stdout=StringIO())

    def test_preview_import_conflict_and_date(self):
        self.import_items([self.item], "--dry-run")
        self.assertFalse(StaffApplication.objects.exists())
        self.import_items([self.item])
        application = StaffApplication.objects.get()
        self.assertEqual(application.mongo_id, self.item["_id"])
        self.assertEqual(application.email, "persona@example.com")
        self.assertEqual(application.status, "pending")
        self.assertTrue(application.is_recent_graduate)
        self.assertFalse(application.public_profile_consent)
        self.assertEqual(application.created_at.isoformat(), "2026-01-20T20:00:00+00:00")
        with self.assertRaises(CommandError):
            self.import_items([self.item])
        self.assertEqual(StaffApplication.objects.count(), 1)

    def test_unsupported_states_and_invalid_data_roll_back_batch(self):
        for overrides in (
            {"status": "approved"}, {"status": "accepted"}, {"status": "other"},
            {"experienceYears": True}, {"experienceYears": 61}, {"publicProfileConsent": "false"},
            {"name": "a"}, {"email": "invalid"}, {"requestedPosition": "admin"},
            {"createdAt": "bad"}, {"_id": self.item["_id"]},
        ):
            second = {**self.item, "_id": "507f1f77bcf86cd799439012", **overrides}
            with self.assertRaises(CommandError):
                self.import_items([self.item, second])
            self.assertFalse(StaffApplication.objects.exists())

    def test_import_rejected(self):
        self.import_items([{**self.item, "status": "rejected"}])
        self.assertEqual(StaffApplication.objects.get().status, "rejected")
