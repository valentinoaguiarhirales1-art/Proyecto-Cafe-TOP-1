import json
import tempfile
from io import StringIO
from pathlib import Path

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from .models import Category, Product


class MongoProductImportTests(TestCase):
    def setUp(self):
        self.item = {
            "_id": "507f1f77bcf86cd799439011",
            "name": "Café de prueba",
            "category": "Bebidas",
            "description": "Preparado al momento",
            "price": 46.5,
            "imageUrl": "/images/cafe.jpg",
            "isAvailable": False,
            "customization": {
                "sizes": [{"name": "Grande", "extraPrice": 6, "_id": "descartado"}],
                "milkOptions": [],
                "extras": [{"name": "Jarabe", "extraPrice": 5}],
            },
        }

    def run_import(self, items, *args):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "productos.json"
            path.write_text(json.dumps(items, ensure_ascii=False), encoding="utf-8")
            return call_command("import_mongo_products", str(path), *args, stdout=StringIO())

    def test_dry_run_does_not_save_and_import_preserves_fields(self):
        self.run_import([self.item], "--dry-run")
        self.assertEqual(Product.objects.count(), 0)
        self.assertEqual(Category.objects.count(), 0)
        self.run_import([self.item])
        product = Product.objects.get()
        self.assertEqual(product.mongo_id, self.item["_id"])
        self.assertEqual(str(product.price), "46.50")
        self.assertFalse(product.available)
        self.assertEqual(product.category.name, "Bebidas")
        self.assertEqual(product.image_url, "/images/cafe.jpg")
        self.assertEqual(product.customization["sizes"], [{"name": "Grande", "extraPrice": 6.0}])

    def test_existing_product_does_not_get_overwritten(self):
        category = Category.objects.create(name="Bebidas")
        existing = Product.objects.create(name=self.item["name"], category=category, description="Anterior", price=99)
        with self.assertRaises(CommandError):
            self.run_import([self.item])
        existing.refresh_from_db()
        self.assertEqual(existing.description, "Anterior")
        self.assertIsNone(existing.mongo_id)

    def test_error_rolls_back_the_whole_import(self):
        bad = {**self.item, "_id": "507f1f77bcf86cd799439012", "name": "Otro", "price": -1}
        with self.assertRaises(CommandError):
            self.run_import([self.item, bad])
        self.assertEqual(Product.objects.count(), 0)
        self.assertEqual(Category.objects.count(), 0)

    def test_repeated_id_and_invalid_options_are_rejected(self):
        for items in (
            [self.item, {**self.item, "name": "Otro"}],
            [{**self.item, "customization": {"extras": [{"name": "X", "extraPrice": -1}]}}],
            [{**self.item, "isAvailable": "false"}],
        ):
            with self.assertRaises(CommandError):
                self.run_import(items)
        self.assertEqual(Product.objects.count(), 0)
