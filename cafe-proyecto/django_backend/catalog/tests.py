from io import StringIO
from datetime import timedelta
import json

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.core.management import call_command
from django.test import Client, TestCase
from django.urls import reverse
from django.utils import timezone

from .models import Category, CustomerProfile, GuestReservation, Order, Product, Reservation


class CatalogTests(TestCase):
    def setUp(self):
        category = Category.objects.create(name="Bebidas")
        self.product = Product.objects.create(
            name="Café", description="Café caliente", price="40.00", category=category
        )
        self.user = get_user_model().objects.create_user(username="cliente", password="prueba-segura-123")
        self.staff = get_user_model().objects.create_user(
            username="personal", password="prueba-segura-123", is_staff=True
        )
        self.staff.user_permissions.add(Permission.objects.get(codename="change_product"))

    def test_api_shows_available_products(self):
        response = self.client.get(reverse("products-api"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()[0]["category"], "Bebidas")
        self.assertEqual(response.json()[0]["price"], "40.00")
        self.product.available = False
        self.product.save()
        self.assertEqual(self.client.get(reverse("products-api")).json(), [])

    def test_catalog_page_is_public(self):
        self.assertContains(self.client.get(reverse("product-list")), "Café")

    def test_edit_requires_staff(self):
        url = reverse("product-edit", args=[self.product.pk])
        self.assertEqual(self.client.get(url).status_code, 302)
        self.client.force_login(self.user)
        self.assertEqual(self.client.get(url).status_code, 302)
        self.assertEqual(self.client.post(url, {"name": "Cambio"}).status_code, 302)
        self.product.refresh_from_db()
        self.assertEqual(self.product.name, "Café")

    def test_staff_without_product_permission_cannot_edit(self):
        limited = get_user_model().objects.create_user(
            username="limitado", password="prueba-segura-123", is_staff=True
        )
        self.client.force_login(limited)
        url = reverse("product-edit", args=[self.product.pk])
        self.assertEqual(self.client.get(url).status_code, 403)
        self.assertEqual(self.client.post(url, {
            "name": "Cambio", "description": "Café", "price": "1",
            "category": self.product.category_id,
        }).status_code, 403)
        self.assertNotContains(self.client.get(reverse("product-list")), "Editar")
        self.product.refresh_from_db()
        self.assertEqual(self.product.name, "Café")

    def test_admin_order_status_requires_change_permission(self):
        order = Order.objects.create(customer=self.user, total="40.00")
        url = reverse("admin:catalog_order_change", args=[order.pk])
        self.client.force_login(self.staff)
        self.assertEqual(self.client.post(url, {"status": Order.Status.DELIVERED}).status_code, 403)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.PENDING)
        manager = get_user_model().objects.create_superuser(
            username="gerente", email="gerente@example.test", password="prueba-segura-123"
        )
        self.client.force_login(manager)
        response = self.client.post(url, {
            "status": Order.Status.PREPARING,
            "items-TOTAL_FORMS": "0", "items-INITIAL_FORMS": "0",
            "items-MIN_NUM_FORMS": "0", "items-MAX_NUM_FORMS": "1000",
        })
        self.assertEqual(response.status_code, 302)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.PREPARING)

    def test_admin_reservation_management_requires_permission(self):
        reservation = Reservation.objects.create(
            customer=self.user, date=timezone.localdate() + timedelta(days=1),
            time="13:00", party_size=2,
        )
        url = reverse("admin:catalog_reservation_change", args=[reservation.pk])
        self.client.force_login(self.staff)
        self.assertEqual(self.client.get(url).status_code, 403)
        self.assertEqual(self.client.post(url, {"status": Reservation.Status.CONFIRMED}).status_code, 403)
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, Reservation.Status.PENDING)
        manager = get_user_model().objects.create_superuser(
            username="gerente", email="gerente@example.test", password="prueba-segura-123"
        )
        self.client.force_login(manager)
        response = self.client.post(url, {
            "date": reservation.date.isoformat(), "time": "13:00",
            "party_size": 2, "notes": "", "status": Reservation.Status.CONFIRMED,
        })
        self.assertEqual(response.status_code, 302)
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, Reservation.Status.CONFIRMED)

    def test_staff_cannot_save_negative_price(self):
        self.client.force_login(self.staff)
        response = self.client.post(reverse("product-edit", args=[self.product.pk]), {
            "name": "Café", "description": "Café caliente", "price": "-5",
            "category": self.product.category_id, "available": "on",
        })
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.context["form"].errors)
        self.product.refresh_from_db()
        self.assertEqual(str(self.product.price), "40.00")

    def test_staff_can_edit_product(self):
        self.client.force_login(self.staff)
        response = self.client.post(reverse("product-edit", args=[self.product.pk]), {
            "name": "Café nuevo", "description": "Café caliente", "price": "45",
            "category": self.product.category_id, "available": "on",
        })
        self.assertRedirects(response, reverse("product-list"))
        self.product.refresh_from_db()
        self.assertEqual(self.product.name, "Café nuevo")

    def test_edit_requires_csrf_token(self):
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.staff)
        response = client.post(reverse("product-edit", args=[self.product.pk]), {
            "name": "Sin permiso CSRF",
        })
        self.assertEqual(response.status_code, 403)

    def test_import_does_not_overwrite_existing_products(self):
        call_command("import_menu", stdout=StringIO())
        count = Product.objects.count()
        imported = Product.objects.get(name="Café Americano")
        imported.price = 1
        imported.save()
        call_command("import_menu", stdout=StringIO())
        imported.refresh_from_db()
        self.assertEqual(imported.price, 1)
        self.assertEqual(Product.objects.count(), count)
        self.assertGreaterEqual(count, 76)

    def test_registration_creates_customer_and_hashes_password(self):
        response = self.client.post(reverse("register"), {
            "username": "nueva", "email": "NUEVA@example.com",
            "password1": "Una-clave-segura-123", "password2": "Una-clave-segura-123",
        })
        self.assertRedirects(response, reverse("product-list"))
        user = get_user_model().objects.get(username="nueva")
        self.assertEqual(user.email, "nueva@example.com")
        self.assertFalse(user.is_staff)
        self.assertNotEqual(user.password, "Una-clave-segura-123")
        self.assertTrue(user.check_password("Una-clave-segura-123"))

    def test_registered_customer_cannot_reuse_email(self):
        self.user.email = "cliente@example.com"
        self.user.save()
        response = self.client.post(reverse("register"), {
            "username": "otra", "email": "CLIENTE@example.com",
            "password1": "Una-clave-segura-123", "password2": "Una-clave-segura-123",
        })
        self.assertFormError(response.context["form"], "email", "Este correo ya está registrado.")

    def test_order_uses_server_price_and_is_private(self):
        self.client.force_login(self.user)
        response = self.client.post(reverse("create-order"), {
            "product": self.product.pk, "quantity": 3, "price": "0.01",
        })
        self.assertRedirects(response, reverse("my-orders"))
        order = Order.objects.get()
        self.assertEqual(str(order.total), "120.00")
        self.assertEqual(str(order.items.get().unit_price), "40.00")
        self.assertContains(self.client.get(reverse("my-orders")), "120,00")
        self.client.force_login(self.staff)
        self.assertNotContains(self.client.get(reverse("my-orders")), "120,00")

    def test_unavailable_product_and_excess_quantity_are_rejected(self):
        self.client.force_login(self.user)
        response = self.client.post(reverse("create-order"), {"product": self.product.pk, "quantity": 51})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.context["form"].errors)
        self.product.available = False
        self.product.save()
        response = self.client.post(reverse("create-order"), {"product": self.product.pk, "quantity": 1})
        self.assertTrue(response.context["form"].errors)
        self.assertEqual(Order.objects.count(), 0)

    def test_orders_and_reservations_require_login(self):
        for route in ["create-order", "my-orders", "create-reservation", "my-reservations"]:
            self.assertEqual(self.client.get(reverse(route)).status_code, 302)

    def test_order_supports_maximum_product_price(self):
        self.product.price = "99999999.99"
        self.product.save()
        self.client.force_login(self.user)
        response = self.client.post(reverse("create-order"), {"product": self.product.pk, "quantity": 50})
        self.assertRedirects(response, reverse("my-orders"))
        self.assertEqual(str(Order.objects.get().total), "4999999999.50")

    def test_reservations_validate_date_and_are_private(self):
        self.client.force_login(self.user)
        old_date = timezone.localdate() - timedelta(days=1)
        response = self.client.post(reverse("create-reservation"), {
            "date": old_date.isoformat(), "time": "12:00", "party_size": 2,
        })
        self.assertTrue(response.context["form"].errors)
        self.assertEqual(Reservation.objects.count(), 0)
        response = self.client.post(reverse("create-reservation"), {
            "date": (timezone.localdate() + timedelta(days=1)).isoformat(),
            "time": "12:00", "party_size": 2,
        })
        self.assertRedirects(response, reverse("my-reservations"))
        self.assertContains(self.client.get(reverse("my-reservations")), "Pendiente")
        self.client.force_login(self.staff)
        self.assertNotContains(self.client.get(reverse("my-reservations")), "Pendiente")

    def test_reservation_api_authentication_validation_and_ownership(self):
        client = Client(enforce_csrf_checks=True)
        csrf = client.get(reverse("session-api")).json()["csrfToken"]
        data = {"date": (timezone.localdate() + timedelta(days=1)).isoformat(), "time": "13:00", "party_size": 2}
        self.assertEqual(client.post(reverse("create-reservation-api"), data, HTTP_X_CSRFTOKEN=csrf).status_code, 401)
        self.assertEqual(client.get(reverse("my-reservations-api")).status_code, 401)
        client.force_login(self.user)
        self.assertEqual(client.post(reverse("create-reservation-api"), data).status_code, 403)
        token = client.get(reverse("session-api")).json()["csrfToken"]
        response = client.post(reverse("create-reservation-api"), {**data, "party_size": 21}, HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 400)
        self.assertIn("party_size", response.json()["fields"])
        response = client.post(reverse("create-reservation-api"), {
            **data, "date": (timezone.localdate() - timedelta(days=1)).isoformat(),
        }, HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Reservation.objects.count(), 0)
        response = client.post(reverse("create-reservation-api"), data, HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["status"], "Pendiente")
        history = client.get(reverse("my-reservations-api"))
        self.assertEqual(len(history.json()), 1)
        self.assertEqual(history["Cache-Control"], "no-store")
        client.force_login(self.staff)
        self.assertEqual(client.get(reverse("my-reservations-api")).json(), [])

    def test_account_reservations_reject_stale_user_header(self):
        self.client.force_login(self.staff)
        expected = {"HTTP_X_EXPECTED_DJANGO_USER": str(self.user.pk)}
        data = {"date": (timezone.localdate() + timedelta(days=1)).isoformat(), "time": "13:00", "party_size": 2}
        self.assertEqual(self.client.get(reverse("my-reservations-api"), **expected).status_code, 409)
        self.assertEqual(self.client.post(reverse("create-reservation-api"), data, **expected).status_code, 409)
        self.assertFalse(Reservation.objects.exists())
        correct = {"HTTP_X_EXPECTED_DJANGO_USER": str(self.staff.pk)}
        self.assertEqual(self.client.post(reverse("create-reservation-api"), data, **correct).status_code, 201)
        self.assertEqual(len(self.client.get(reverse("my-reservations-api"), **correct).json()), 1)

    def test_guest_reservation_validation_and_csrf(self):
        client = Client(enforce_csrf_checks=True)
        url = reverse("guest-reservation-api")
        data = {
            "name": "  Cliente  ", "email": "CLIENTE@example.com", "phone": " 5551234567 ",
            "date": (timezone.localdate() + timedelta(days=1)).isoformat(),
            "time": "14:30", "party_size": 3, "notes": "Mesa tranquila",
        }
        self.assertEqual(client.post(url, data).status_code, 403)
        token = client.get(reverse("session-api")).json()["csrfToken"]
        for invalid in (
            {"date": timezone.localdate().isoformat()},
            {"party_size": 13},
            {"email": "sin-correo"},
            {"name": "   "},
        ):
            response = client.post(url, {**data, **invalid}, HTTP_X_CSRFTOKEN=token)
            self.assertEqual(response.status_code, 400)
        self.assertEqual(GuestReservation.objects.count(), 0)
        response = client.post(url, {**data, "status": "Confirmada"}, HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 201)
        reservation = GuestReservation.objects.get()
        self.assertEqual(reservation.status, GuestReservation.Status.PENDING)
        self.assertEqual(reservation.name, "Cliente")
        self.assertEqual(reservation.email, "cliente@example.com")

    def test_guest_reservation_admin_is_permission_protected(self):
        reservation = GuestReservation.objects.create(
            name="Cliente", email="cliente@example.com", phone="123",
            date=timezone.localdate() + timedelta(days=1), time="13:00", party_size=2,
        )
        url = reverse("admin:catalog_guestreservation_change", args=[reservation.pk])
        self.client.force_login(self.staff)
        self.assertEqual(self.client.post(url, {"status": "Confirmada"}).status_code, 403)
        manager = get_user_model().objects.create_superuser(
            username="gerente", email="gerente@example.test", password="prueba-segura-123"
        )
        self.client.force_login(manager)
        response = self.client.post(url, {"status": "Confirmada"})
        self.assertEqual(response.status_code, 302)
        reservation.refresh_from_db()
        self.assertEqual(reservation.status, GuestReservation.Status.CONFIRMED)

    def test_cart_api_calculates_prices_from_catalog(self):
        self.product.customization = {
            "sizes": [{"name": "Grande", "extraPrice": 6}],
            "milkOptions": [{"name": "Avena", "extraPrice": 4}],
            "extras": [{"name": "Jarabe", "extraPrice": 3}],
        }
        self.product.save()
        second = Product.objects.create(
            name="Pan", description="Pan fresco", price="20.00", category=self.product.category
        )
        self.client.force_login(self.user)
        response = self.client.post(reverse("create-order-api"), json.dumps({
            "orderType": "En mesa", "totalPrice": 1,
            "orderItems": [
                {"product": str(self.product.pk), "qty": 2, "price": 0, "selectedSize": "Grande",
                 "selectedMilk": "Avena", "selectedExtras": ["Jarabe"], "notes": "Sin azúcar"},
                {"product": str(second.pk), "qty": 1},
            ],
        }), content_type="application/json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["totalPrice"], "126.00")
        order = Order.objects.get()
        self.assertEqual(order.customer, self.user)
        self.assertEqual(order.order_type, "En mesa")
        self.assertEqual(order.items.count(), 2)
        self.assertEqual(order.items.get(product=self.product).notes, "Sin azúcar")
        history = self.client.get(reverse("my-orders-api"))
        item = next(item for item in history.json()[0]["items"] if item["name"] == self.product.name)
        self.assertEqual(item["selectedSize"], "Grande")
        self.assertEqual(item["selectedMilk"], "Avena")
        self.assertEqual(item["selectedExtras"], ["Jarabe"])
        self.assertEqual(item["notes"], "Sin azúcar")
        mismatch = {"HTTP_X_EXPECTED_DJANGO_USER": str(self.staff.pk)}
        self.assertEqual(self.client.get(reverse("my-orders-api"), **mismatch).status_code, 409)
        self.assertEqual(self.client.post(reverse("logout-api"), **mismatch).status_code, 409)
        self.assertEqual(self.client.get(reverse("session-api")).json()["user"]["id"], self.user.pk)
        self.assertEqual(self.client.post(reverse("create-order-api"), json.dumps({
            "orderItems": [{"product": self.product.pk, "qty": 1}],
        }), content_type="application/json", **mismatch).status_code, 409)
        self.assertEqual(Order.objects.count(), 1)

    def test_cart_api_rejects_bad_options_and_does_not_create_partial_order(self):
        self.client.force_login(self.user)
        for extra in (["No existe"], ["Repetido", "Repetido"], "Jarabe"):
            response = self.client.post(reverse("create-order-api"), json.dumps({
                "orderItems": [
                    {"product": self.product.pk, "qty": 1},
                    {"product": self.product.pk, "qty": 1, "selectedExtras": extra},
                ],
            }), content_type="application/json")
            self.assertEqual(response.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)

    def test_cart_api_rejects_card_payment_and_invalid_quantity(self):
        self.client.force_login(self.user)
        for data in (
            {"stripeTokenId": "token", "orderItems": [{"product": self.product.pk, "qty": 1}]},
            {"orderItems": [{"product": self.product.pk, "qty": True}]},
            {"orderItems": [{"product": self.product.pk, "qty": 51}]},
            {"orderItems": [{"product": "offline-1", "qty": 1}]},
        ):
            response = self.client.post(reverse("create-order-api"), json.dumps(data), content_type="application/json")
            self.assertEqual(response.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)

    def test_cart_api_reports_bad_catalog_option_prices(self):
        self.client.force_login(self.user)
        for price in ("NaN", "-1", "999999999999999999999999", "0.001", "invalid"):
            self.product.customization = {"sizes": [{"name": "Grande", "extraPrice": price}]}
            self.product.save()
            response = self.client.post(reverse("create-order-api"), json.dumps({
                "orderItems": [{"product": self.product.pk, "qty": 1, "selectedSize": "Grande"}],
            }), content_type="application/json")
            self.assertEqual(response.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)

    def test_cart_api_requires_session_and_csrf(self):
        client = Client(enforce_csrf_checks=True)
        data = json.dumps({"orderItems": [{"product": self.product.pk, "qty": 1}]})
        client.force_login(self.user)
        self.assertEqual(client.post(reverse("create-order-api"), data, content_type="application/json").status_code, 403)
        client.get(reverse("create-order"))
        token = client.cookies["csrftoken"].value
        response = client.post(reverse("create-order-api"), data, content_type="application/json", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 201)
        client.logout()
        client.get(reverse("login"))
        token = client.cookies["csrftoken"].value
        response = client.post(reverse("create-order-api"), data, content_type="application/json", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 401)

    def test_api_session_login_order_history_and_logout(self):
        client = Client(enforce_csrf_checks=True)
        session = client.get(reverse("session-api")).json()
        self.assertIsNone(session["user"])
        self.assertEqual(client.post(reverse("login-api"), {
            "username": "cliente", "password": "prueba-segura-123",
        }).status_code, 403)
        response = client.post(reverse("login-api"), {
            "username": "cliente", "password": "prueba-segura-123",
        }, HTTP_X_CSRFTOKEN=session["csrfToken"])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["name"], "cliente")
        token = response.json()["csrfToken"]
        response = client.post(reverse("create-order-api"), json.dumps({
            "orderItems": [{"product": self.product.pk, "qty": 2}],
        }), content_type="application/json", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 201)
        history = client.get(reverse("my-orders-api"))
        self.assertEqual(history.json()[0]["total"], "80.00")
        self.assertEqual(history["Cache-Control"], "no-store")
        client.force_login(self.staff)
        self.assertEqual(client.get(reverse("my-orders-api")).json(), [])
        client.force_login(self.user)
        token = client.get(reverse("session-api")).json()["csrfToken"]
        self.assertEqual(client.post(reverse("logout-api"), HTTP_X_CSRFTOKEN=token).status_code, 200)
        self.assertEqual(client.get(reverse("my-orders-api")).status_code, 401)

    def test_api_registration_errors_and_login(self):
        client = Client(enforce_csrf_checks=True)
        token = client.get(reverse("session-api")).json()["csrfToken"]
        response = client.post(reverse("register-api"), {
            "username": "prueba", "email": "incorrecto",
            "password1": "Una-clave-segura-123", "password2": "Una-clave-segura-123",
        }, HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.json()["fields"])
        response = client.post(reverse("register-api"), {
            "username": "prueba", "email": "prueba@example.com",
            "password1": "Una-clave-segura-123", "password2": "Una-clave-segura-123",
        }, HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["user"]["name"], "prueba")

    def test_profile_api_requires_session_csrf_and_preserves_ownership(self):
        client = Client(enforce_csrf_checks=True)
        url = reverse("profile-api")
        self.assertEqual(client.get(url).status_code, 401)
        client.force_login(self.user)
        self.assertEqual(client.post(url, {"name": "Cliente", "phone": "123"}).status_code, 403)
        token = client.get(reverse("session-api")).json()["csrfToken"]
        headers = {"HTTP_X_CSRFTOKEN": token, "HTTP_X_EXPECTED_DJANGO_USER": str(self.user.pk)}
        self.assertEqual(client.post(url, {"name": " ", "phone": "123"}, **headers).status_code, 400)
        self.assertFalse(CustomerProfile.objects.exists())
        response = client.post(url, {"name": "  Cliente Nuevo  ", "phone": "  555123  "}, **headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["name"], "Cliente Nuevo")
        self.assertEqual(response.json()["phone"], "555123")
        self.assertEqual(response["Cache-Control"], "no-store")
        self.assertEqual(client.get(url, HTTP_X_EXPECTED_DJANGO_USER=str(self.staff.pk)).status_code, 409)
        self.assertEqual(client.post(url, {"name": "Otro", "phone": ""}, HTTP_X_CSRFTOKEN=token,
                                     HTTP_X_EXPECTED_DJANGO_USER=str(self.staff.pk)).status_code, 409)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Cliente Nuevo")
        client.force_login(self.staff)
        self.assertEqual(client.get(url).json()["phone"], "")
        self.assertEqual(CustomerProfile.objects.count(), 1)
