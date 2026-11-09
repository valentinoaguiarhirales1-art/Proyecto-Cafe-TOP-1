import json
import tempfile
from io import StringIO
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from django.urls import reverse

from .models import SiteSetting


class SiteSettingsTests(TestCase):
    def import_settings(self, items, *args):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "ajustes.json"
            path.write_text(json.dumps(items), encoding="utf-8")
            call_command("import_mongo_settings", str(path), *args, stdout=StringIO())

    def test_preview_import_and_public_api(self):
        items = [{"key": "hero_title", "value": "Café de prueba"}, {"key": "footer_phone", "value": ""}]
        self.import_settings(items, "--dry-run")
        self.assertFalse(SiteSetting.objects.exists())
        self.import_settings(items)
        self.assertEqual(self.client.get(reverse("site-settings-api")).json(), {
            "hero_title": "Café de prueba", "footer_phone": "",
        })
        with self.assertRaises(CommandError):
            self.import_settings(items)
        self.assertEqual(SiteSetting.objects.count(), 2)

    def test_invalid_second_setting_rolls_back_first(self):
        first = {"key": "hero_title", "value": "Café"}
        for invalid in (
            {"key": "desconocido", "value": "texto"},
            {"key": "footer_phone", "value": {"numero": "123"}},
            {"key": "footer_phone", "value": "x" * 5001},
            first,
        ):
            with self.assertRaises(CommandError):
                self.import_settings([first, invalid])
            self.assertFalse(SiteSetting.objects.exists())

    def test_public_api_is_read_only_and_admin_requires_permission(self):
        self.assertEqual(self.client.post(reverse("site-settings-api"), {"hero_title": "nuevo"}).status_code, 405)
        staff = get_user_model().objects.create_user(username="personal", password="clave", is_staff=True)
        self.client.force_login(staff)
        self.assertEqual(self.client.get(reverse("admin:catalog_sitesetting_add")).status_code, 403)
        manager = get_user_model().objects.create_superuser(username="admin", password="clave")
        self.client.force_login(manager)
        response = self.client.post(reverse("admin:catalog_sitesetting_add"), {
            "key": "hero_title", "value": "Título Django",
        })
        self.assertEqual(response.status_code, 302)
        self.assertEqual(self.client.get(reverse("site-settings-api")).json()["hero_title"], "Título Django")
        for data in (
            {"key": "desconocido", "value": "texto"},
            {"key": "footer_phone", "value": "x" * 5001},
        ):
            response = self.client.post(reverse("admin:catalog_sitesetting_add"), data)
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.context["adminform"].form.errors)
        self.assertEqual(SiteSetting.objects.count(), 1)
