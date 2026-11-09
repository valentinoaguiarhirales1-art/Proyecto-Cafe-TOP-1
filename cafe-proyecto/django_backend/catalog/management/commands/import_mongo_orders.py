import json
import re
from datetime import datetime
from decimal import Decimal
from pathlib import Path

from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from catalog.models import CustomerProfile, Order, OrderItem, Product


def identifier(value):
    return isinstance(value, str) and re.fullmatch(r"[0-9a-f]{24}", value) is not None


def money(value):
    if isinstance(value, bool) or not isinstance(value, (int, Decimal)):
        raise ValueError
    amount = Decimal(value)
    if not amount.is_finite() or amount < 0 or amount.as_tuple().exponent < -2:
        raise ValueError
    return amount


def timestamp(value):
    if not isinstance(value, str):
        raise ValueError
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.utcoffset() is None:
        raise ValueError
    return parsed


class Command(BaseCommand):
    help = "Valida o importa pedidos MongoDB sin alterar pedidos existentes."

    def add_arguments(self, parser):
        parser.add_argument("file", type=Path)
        parser.add_argument("--dry-run", action="store_true", help="Valida sin guardar cambios.")

    @transaction.atomic
    def handle(self, *args, **options):
        try:
            with options["file"].open(encoding="utf-8") as file:
                orders = json.load(file, parse_float=Decimal)
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise CommandError(f"No se pudo leer el archivo de pedidos: {exc}") from exc
        if not isinstance(orders, list):
            raise CommandError("El archivo debe contener una lista de pedidos.")
        seen = set()
        for index, data in enumerate(orders, start=1):
            try:
                self.import_order(data, seen)
            except (ValueError, ValidationError, TypeError) as exc:
                raise CommandError(f"Pedido {index}: datos inválidos o referencias no encontradas; revisa el origen.") from exc
        if options["dry_run"]:
            transaction.set_rollback(True)
            self.stdout.write(self.style.SUCCESS(f"Validación correcta: {len(orders)} pedidos; no se guardó ningún cambio."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Importados {len(orders)} pedidos; no se modificaron los existentes."))

    def import_order(self, data, seen):
        if not isinstance(data, dict):
            raise ValueError
        order_id, user_id = data.get("_id"), data.get("user")
        if not identifier(order_id) or not identifier(user_id) or order_id in seen or Order.objects.filter(mongo_id=order_id).exists():
            raise ValueError
        seen.add(order_id)
        profile = CustomerProfile.objects.select_related("user").filter(mongo_id=user_id).first()
        if profile is None:
            raise ValueError
        items = data.get("orderItems")
        if not isinstance(items, list) or not 1 <= len(items) <= 30:
            raise ValueError
        total = money(data.get("totalPrice"))
        created_at = timestamp(data.get("createdAt"))
        is_paid = data.get("isPaid")
        if not isinstance(is_paid, bool):
            raise ValueError
        paid_at = data.get("paidAt")
        if paid_at is not None:
            timestamp(paid_at)
        if is_paid and paid_at is None:
            raise ValueError
        branch, qr = data.get("branch", ""), data.get("qrCode", "")
        points, table, payment = data.get("pointsEarned", 0), data.get("tableNumber"), data.get("paymentResult", {})
        if (not isinstance(branch, str) or len(branch) > 500
                or not isinstance(qr, str) or len(qr) > 500
                or isinstance(points, bool) or not isinstance(points, int) or points < 0
                or (table is not None and (isinstance(table, bool) or not isinstance(table, int) or table < 0))
                or not isinstance(payment, dict) or set(payment) - {"id", "status"}
                or any(not isinstance(value, str) or len(value) > 500 for value in payment.values())):
            raise ValueError
        order = Order(
            mongo_id=order_id, customer=profile.user, total=total,
            status=data.get("status"), order_type=data.get("orderType"),
            legacy_data={"branch": branch, "tableNumber": table, "pointsEarned": points,
                         "isPaid": is_paid, "paidAt": paid_at, "paymentResult": payment, "qrCode": qr},
        )
        order.full_clean()
        order.save()
        Order.objects.filter(pk=order.pk).update(created_at=created_at)
        for item in items:
            if not isinstance(item, dict) or not identifier(item.get("product")):
                raise ValueError
            product = Product.objects.filter(mongo_id=item["product"]).first()
            quantity = item.get("qty")
            extras = item.get("selectedExtras", [])
            name, size, milk, notes = item.get("name"), item.get("selectedSize") or "", item.get("selectedMilk") or "", item.get("notes") or ""
            if (product is None or isinstance(quantity, bool) or not isinstance(quantity, int) or not 1 <= quantity <= 50
                    or not isinstance(extras, list) or len(extras) > 30
                    or any(not isinstance(extra, str) or len(extra) > 150 for extra in extras)
                    or not isinstance(name, str) or not name.strip()
                    or any(not isinstance(value, str) for value in (size, milk, notes))):
                raise ValueError
            line = OrderItem(
                order=order, product=product, product_name=name,
                quantity=quantity, unit_price=money(item.get("price")),
                selected_size=size, selected_milk=milk, selected_extras=extras, notes=notes,
            )
            line.full_clean()
            line.save()
