import json
import tempfile
from io import StringIO
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import Client, TestCase
from django.urls import reverse

from .models import CustomerProfile


class MongoUserImportTests(TestCase):
    def setUp(self):
        self.item = {
            "_id": "507f1f77bcf86cd799439011",
            "name": "Cliente de prueba",
            "email": "CLIENTE@example.test",
            "phone": "5551234567",
            "role": "client",
            "password": "$2b$10$ZHFgXG3JwFrxUz6VMGvQy.iregsPaiUQRFYWNHEcp042c09cOUTC2",
        }

    def run_import(self, items, *args):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "cuentas.json"
            path.write_text(json.dumps(items), encoding="utf-8")
            call_command("import_mongo_users", str(path), *args, stdout=StringIO())

    def test_import_and_login_with_bcryptjs_hash(self):
        self.run_import([self.item], "--dry-run")
        self.assertFalse(CustomerProfile.objects.exists())
        self.run_import([self.item])
        profile = CustomerProfile.objects.select_related("user").get()
        self.assertEqual(profile.mongo_id, self.item["_id"])
        self.assertEqual(profile.user.email, "cliente@example.test")
        self.assertEqual(profile.user.first_name, "Cliente de prueba")
        self.assertFalse(profile.user.is_staff)
        client = Client(enforce_csrf_checks=True)
        token = client.get(reverse("session-api")).json()["csrfToken"]
        response = client.post(reverse("login-api"), {
            "email": "CLIENTE@example.test", "password": "Cafeteria-Prueba-2026!",
        }, HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 200)
        profile.user.refresh_from_db()
        self.assertTrue(profile.user.password.startswith("pbkdf2_sha256$"))
        self.assertEqual(client.get(reverse("profile-api")).json()["phone"], "5551234567")

    def test_conflicts_and_invalid_second_record_roll_back(self):
        second = {**self.item, "_id": "507f1f77bcf86cd799439012"}
        with self.assertRaises(CommandError):
            self.run_import([self.item, second])
        self.assertFalse(CustomerProfile.objects.exists())
        get_user_model().objects.create_user(username="existente", email="cliente@example.test", password="test")
        with self.assertRaises(CommandError):
            self.run_import([self.item])
        self.assertEqual(get_user_model().objects.count(), 1)

    def test_staff_requires_explicit_acknowledgement_and_gets_no_permissions(self):
        staff = {**self.item, "role": "admin"}
        with self.assertRaises(CommandError):
            self.run_import([staff])
        self.run_import([staff], "--staff-as-customers")
        user = CustomerProfile.objects.get().user
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertFalse(user.user_permissions.exists())

    def test_invalid_values_and_repeat_import_are_rejected(self):
        for values in (
            {"password": "plaintext"}, {"password": "$2b$31$" + "a" * 53},
            {"password": "$2b$04$" + "a" * 53},
            {"email": "sin-correo"}, {"name": " "}, {"phone": "x" * 31}, {"role": []},
        ):
            with self.assertRaises(CommandError):
                self.run_import([{**self.item, **values}])
        self.run_import([self.item])
        with self.assertRaises(CommandError):
            self.run_import([self.item])
        self.assertEqual(CustomerProfile.objects.count(), 1)

    def test_email_login_refuses_ambiguous_accounts(self):
        users = get_user_model().objects
        users.create_user(username="uno", email="duplicado@example.test", password="clave-12345")
        users.create_user(username="dos", email="DUPLICADO@example.test", password="clave-12345")
        response = self.client.post(reverse("login-api"), {"email": "duplicado@example.test", "password": "clave-12345"})
        self.assertEqual(response.status_code, 401)
