import json
import tempfile
from io import StringIO
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from django.urls import reverse

from .models import Category, CustomerProfile, Order, Product


class MongoOrderImportTests(TestCase):
    def setUp(self):
        user = get_user_model().objects.create_user(username="cliente", password="clave-segura-123")
        CustomerProfile.objects.create(user=user, mongo_id="507f1f77bcf86cd799439011")
        category = Category.objects.create(name="Bebidas")
        Product.objects.create(mongo_id="507f1f77bcf86cd799439012", name="Café", description="Café", price="40.00", category=category)
        self.user = user
        self.item = {
            "_id": "507f1f77bcf86cd799439013", "user": "507f1f77bcf86cd799439011",
            "createdAt": "2026-11-08T20:00:00.000Z", "orderType": "En mesa",
            "status": "Entregado", "totalPrice": 85, "branch": "Matriz", "tableNumber": 1,
            "pointsEarned": 8, "isPaid": True, "paidAt": "2026-11-08T20:01:00.000Z",
            "paymentResult": {"id": "pago-prueba", "status": "succeeded"}, "qrCode": "prueba",
            "orderItems": [{"name": "Café anterior", "qty": 2, "price": 42.5,
                            "product": "507f1f77bcf86cd799439012", "selectedSize": "Grande",
                            "selectedMilk": "Avena", "selectedExtras": ["Jarabe"], "notes": "Sin azúcar"}],
        }

    def run_import(self, items, *args):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "pedidos.json"
            path.write_text(json.dumps(items), encoding="utf-8")
            call_command("import_mongo_orders", str(path), *args, stdout=StringIO())

    def test_preview_and_import_preserve_history_and_payment(self):
        self.run_import([self.item], "--dry-run")
        self.assertFalse(Order.objects.exists())
        self.run_import([self.item])
        order = Order.objects.get()
        self.assertEqual(order.customer, self.user)
        self.assertEqual(str(order.total), "85.00")
        self.assertEqual(order.created_at.isoformat(), "2026-11-08T20:00:00+00:00")
        self.assertTrue(order.legacy_data["isPaid"])
        self.assertEqual(order.legacy_data["paymentResult"]["id"], "pago-prueba")
        self.assertEqual(order.items.get().product_name, "Café anterior")
        self.client.force_login(self.user)
        history = self.client.get(reverse("my-orders-api")).json()
        self.assertEqual(history[0]["legacyPayment"], {"isPaid": True, "branch": "Matriz"})
        self.assertEqual(history[0]["items"][0]["selectedExtras"], ["Jarabe"])
        with self.assertRaises(CommandError):
            self.run_import([self.item])

    def test_invalid_second_order_rolls_back_first(self):
        invalid = {**self.item, "_id": "507f1f77bcf86cd799439014", "user": "507f1f77bcf86cd799439099"}
        with self.assertRaises(CommandError):
            self.run_import([self.item, invalid])
        self.assertFalse(Order.objects.exists())

    def test_invalid_product_payment_and_fields_are_rejected(self):
        for values in (
            {"isPaid": "true"}, {"paidAt": None}, {"totalPrice": -1},
            {"createdAt": "2026-11-08T20:00:00"}, {"status": "Inventado"},
            {"orderItems": [{**self.item["orderItems"][0], "product": "507f1f77bcf86cd799439099"}]},
        ):
            with self.assertRaises(CommandError):
                self.run_import([{**self.item, **values}])
        self.assertFalse(Order.objects.exists())
