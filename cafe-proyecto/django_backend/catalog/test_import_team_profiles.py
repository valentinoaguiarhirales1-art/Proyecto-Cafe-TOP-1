import json
import tempfile
from io import StringIO
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from django.urls import reverse

from .models import CustomerProfile, TeamProfile


class TeamProfileImportTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="persona")
        CustomerProfile.objects.create(user=self.user, mongo_id="507f1f77bcf86cd799439011")
        self.item = {
            "_id": "507f1f77bcf86cd799439011", "name": "Persona ficticia", "role": "barista",
            "experienceYears": 2, "isRecentGraduate": False, "profileBio": "Café",
            "publicProfileConsent": True, "publicProfile": True,
        }

    def import_profiles(self, items, *args):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "perfiles.json"
            path.write_text(json.dumps(items), encoding="utf-8")
            call_command("import_mongo_team_profiles", str(path), *args, stdout=StringIO())

    def test_preview_and_import_are_private_without_permissions(self):
        self.import_profiles([self.item], "--dry-run")
        self.assertFalse(TeamProfile.objects.exists())
        self.import_profiles([self.item])
        profile = TeamProfile.objects.get()
        self.assertEqual(profile.user, self.user)
        self.assertFalse(profile.public_profile)
        self.assertFalse(profile.public_profile_consent)
        self.assertFalse(self.user.is_staff)
        self.assertFalse(self.user.has_usable_password())
        self.assertFalse(self.user.user_permissions.exists())
        self.assertEqual(self.client.get(reverse("team-api")).json(), [])
        with self.assertRaises(CommandError):
            self.import_profiles([self.item])
        self.assertEqual(TeamProfile.objects.count(), 1)

    def test_invalid_second_profile_rolls_back_first(self):
        second_user = get_user_model().objects.create_user(username="otra")
        CustomerProfile.objects.create(user=second_user, mongo_id="507f1f77bcf86cd799439012")
        for overrides in (
            {"_id": self.item["_id"]}, {"_id": "507f1f77bcf86cd799439099"},
            {"role": "admin"}, {"experienceYears": True}, {"experienceYears": 61},
            {"publicProfileConsent": "true"}, {"name": ""}, {"profileBio": "x" * 241},
        ):
            second = {**self.item, "_id": "507f1f77bcf86cd799439012", **overrides}
            with self.assertRaises(CommandError):
                self.import_profiles([self.item, second])
            self.assertFalse(TeamProfile.objects.exists())

    def test_existing_profile_is_not_overwritten(self):
        TeamProfile.objects.create(user=self.user, name="Existente", role="barista")
        with self.assertRaises(CommandError):
            self.import_profiles([self.item])
        self.assertEqual(TeamProfile.objects.get().name, "Existente")
