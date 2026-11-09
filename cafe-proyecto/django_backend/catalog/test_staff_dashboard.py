from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.test import Client, TestCase
from django.urls import reverse
from django.utils import timezone

from .models import GuestReservation, Order, Reservation


class StaffDashboardTests(TestCase):
    def setUp(self):
        users = get_user_model()
        self.customer = users.objects.create_user(username="cliente", password="prueba-segura-123")
        self.staff = users.objects.create_user(username="personal", password="prueba-segura-123", is_staff=True)
        self.order = Order.objects.create(customer=self.customer, total="42.00")
        self.reservation = GuestReservation.objects.create(
            name="Invitado", email="cliente@example.test", phone="123",
            date=timezone.localdate() + timedelta(days=1), time="12:30", party_size=2,
        )
        self.account_reservation = Reservation.objects.create(
            customer=self.customer, date=timezone.localdate() + timedelta(days=1),
            time="13:30", party_size=3,
        )

    def test_customer_cannot_access_or_change_staff_data(self):
        self.client.force_login(self.customer)
        self.assertEqual(self.client.get(reverse("staff-dashboard")).status_code, 302)
        self.assertEqual(self.client.post(reverse("staff-order-status", args=[self.order.pk]), {"status": "Entregado"}).status_code, 302)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.Status.PENDING)

    def test_staff_without_permissions_cannot_view_or_change_data(self):
        self.client.force_login(self.staff)
        page = self.client.get(reverse("staff-dashboard"))
        self.assertNotContains(page, "Invitado")
        self.assertNotContains(page, "42,00")
        self.assertEqual(self.client.post(reverse("staff-order-status", args=[self.order.pk]), {"status": "Entregado"}).status_code, 403)
        self.assertEqual(self.client.post(reverse("staff-guest-reservation-status", args=[self.reservation.pk]), {"status": "Confirmada"}).status_code, 403)
        self.assertEqual(self.client.post(reverse("staff-reservation-status", args=[self.account_reservation.pk]), {"status": "Confirmada"}).status_code, 403)

    def test_authorized_staff_can_update_but_invalid_status_is_rejected(self):
        self.staff.user_permissions.add(*Permission.objects.filter(
            content_type__app_label="catalog", codename__in=["change_order", "change_guestreservation", "change_reservation"]
        ))
        self.client.force_login(self.staff)
        page = self.client.get(reverse("staff-dashboard"))
        self.assertContains(page, "Invitado")
        self.assertContains(page, "42,00")
        url = reverse("staff-order-status", args=[self.order.pk])
        self.assertEqual(self.client.post(url, {"status": "Inválido"}).status_code, 400)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.Status.PENDING)
        self.assertRedirects(self.client.post(url, {"status": Order.Status.PREPARING}), reverse("staff-dashboard"))
        self.assertRedirects(self.client.post(
            reverse("staff-guest-reservation-status", args=[self.reservation.pk]), {"status": "Confirmada"}
        ), reverse("staff-dashboard"))
        account_url = reverse("staff-reservation-status", args=[self.account_reservation.pk])
        self.assertEqual(self.client.post(account_url, {"status": "Rechazada"}).status_code, 400)
        self.assertRedirects(self.client.post(account_url, {"status": "Confirmada"}), reverse("staff-dashboard"))
        self.order.refresh_from_db()
        self.reservation.refresh_from_db()
        self.account_reservation.refresh_from_db()
        self.assertEqual(self.order.status, Order.Status.PREPARING)
        self.assertEqual(self.reservation.status, GuestReservation.Status.CONFIRMED)
        self.assertEqual(self.account_reservation.status, Reservation.Status.CONFIRMED)

    def test_status_changes_require_csrf(self):
        self.staff.user_permissions.add(Permission.objects.get(content_type__app_label="catalog", codename="change_order"))
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.staff)
        url = reverse("staff-order-status", args=[self.order.pk])
        self.assertEqual(client.post(url, {"status": "Entregado"}).status_code, 403)
        client.get(reverse("staff-dashboard"))
        token = client.cookies["csrftoken"].value
        self.assertEqual(client.post(url, {"status": "Entregado"}, HTTP_X_CSRFTOKEN=token).status_code, 302)
