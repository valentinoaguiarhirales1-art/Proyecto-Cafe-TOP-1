import json
import tempfile
from io import StringIO
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from django.urls import reverse

from .models import Promotion


class PromotionTests(TestCase):
    def setUp(self):
        self.item = {
            "_id": "507f1f77bcf86cd799439011", "title": "Combo de prueba",
            "description": "Café y pan", "originalPrice": 85, "comboPrice": 70.50,
            "imageUrl": "/images/prueba.jpg", "badge": "Ahorro",
            "itemsIncluded": ["Café", "Pan"], "isActive": True,
            "createdAt": "2026-11-08T20:00:00.000Z",
        }

    def import_items(self, items, *args):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "promociones.json"
            path.write_text(json.dumps(items), encoding="utf-8")
            call_command("import_mongo_promotions", str(path), *args, stdout=StringIO())

    def test_preview_import_and_public_api(self):
        self.import_items([self.item], "--dry-run")
        self.assertFalse(Promotion.objects.exists())
        self.import_items([self.item])
        promotion = Promotion.objects.get()
        self.assertEqual(promotion.created_at.isoformat(), "2026-11-08T20:00:00+00:00")
        self.assertEqual(str(promotion.combo_price), "70.50")
        data = self.client.get(reverse("promotions-api")).json()
        self.assertEqual(data[0]["itemsIncluded"], ["Café", "Pan"])
        self.assertEqual(data[0]["_id"], f"django-promotion-{promotion.pk}")
        promotion.active = False
        promotion.save()
        self.assertEqual(self.client.get(reverse("promotions-api")).json(), [])
        with self.assertRaises(CommandError):
            self.import_items([self.item])

    def test_bad_second_record_rolls_back_first(self):
        for values in (
            {"comboPrice": -1}, {"itemsIncluded": ["", "Pan"]},
            {"isActive": "true"}, {"createdAt": "2026-11-08T20:00:00"},
        ):
            other = {**self.item, "_id": "507f1f77bcf86cd799439012", **values}
            with self.assertRaises(CommandError):
                self.import_items([self.item, other])
            self.assertFalse(Promotion.objects.exists())

    def test_admin_requires_permissions_and_valid_items(self):
        user = get_user_model().objects.create_user(username="personal", password="clave", is_staff=True)
        self.client.force_login(user)
        url = reverse("admin:catalog_promotion_add")
        self.assertEqual(self.client.get(url).status_code, 403)
        admin = get_user_model().objects.create_superuser(username="admin", password="clave")
        self.client.force_login(admin)
        response = self.client.post(url, {
            "title": "Combo", "description": "Café", "original_price": "10", "combo_price": "8",
            "image_url": "", "badge": "", "items_included": '{"error": 1}', "active": "on",
        })
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Escribe una lista")
        self.assertFalse(Promotion.objects.exists())
