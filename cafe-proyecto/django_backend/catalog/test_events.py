import json
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import Client, TestCase
from django.urls import reverse
from django.utils import timezone

from .models import Event, EventBooking


class EventTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="cliente", password="clave-segura-123")
        self.event = Event.objects.create(
            title="Cata de prueba", description="Café", date=timezone.now() + timedelta(days=2),
            time_label="19:00", location="Matriz", capacity=4, price="50.00", category="Cata",
        )
        self.url = reverse("book-event-api", args=[self.event.pk])
        self.client.force_login(self.user)

    def book(self, seats, **headers):
        return self.client.post(self.url, json.dumps({"seats": seats}), content_type="application/json", **headers)

    def test_booking_tracks_capacity_and_does_not_expose_users(self):
        self.assertEqual(self.book(3).status_code, 201)
        event = self.client.get(reverse("events-api")).json()[0]
        self.assertEqual(event["availableSeats"], 1)
        self.assertNotIn("attendees", event)
        self.assertEqual(self.book(2).status_code, 400)
        self.assertEqual(self.book(1).status_code, 201)
        self.assertEqual(self.book(1).status_code, 400)
        self.event.refresh_from_db()
        self.assertEqual(self.event.reserved_seats, 4)
        self.assertEqual(EventBooking.objects.count(), 2)

    def test_invalid_requests_and_past_events_do_not_reserve(self):
        for seats in (0, 5, True, 1.5, "1", None):
            self.assertEqual(self.book(seats).status_code, 400)
        self.assertEqual(self.client.post(self.url, "bad", content_type="application/json").status_code, 400)
        self.assertEqual(self.client.post(self.url, {"seats": 1}).status_code, 415)
        self.event.date = timezone.now() - timedelta(seconds=1)
        self.event.save()
        self.assertEqual(self.book(1).status_code, 400)
        self.assertEqual(self.client.get(reverse("events-api")).json(), [])
        self.assertFalse(EventBooking.objects.exists())

    def test_csrf_authentication_and_session_mismatch(self):
        client = Client(enforce_csrf_checks=True)
        token = client.get(reverse("session-api")).json()["csrfToken"]
        payload = json.dumps({"seats": 1})
        self.assertEqual(client.post(self.url, payload, content_type="application/json", HTTP_X_CSRFTOKEN=token).status_code, 401)
        client.force_login(self.user)
        self.assertEqual(client.post(self.url, payload, content_type="application/json").status_code, 403)
        token = client.get(reverse("session-api")).json()["csrfToken"]
        response = client.post(self.url, payload, content_type="application/json",
                               HTTP_X_CSRFTOKEN=token, HTTP_X_EXPECTED_DJANGO_USER="999")
        self.assertEqual(response.status_code, 409)
        self.assertFalse(EventBooking.objects.exists())

    def test_booking_failure_rolls_back_capacity(self):
        with patch("catalog.views.EventBooking.objects.create", side_effect=IntegrityError("test")):
            with self.assertRaises(IntegrityError):
                self.book(1)
        self.event.refresh_from_db()
        self.assertEqual(self.event.reserved_seats, 0)

    def test_booking_history_is_private_and_not_cached(self):
        self.assertEqual(self.book(2).status_code, 201)
        url = reverse("my-event-bookings-api")
        response = self.client.get(url, HTTP_X_EXPECTED_DJANGO_USER=str(self.user.pk))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Cache-Control"], "no-store")
        self.assertEqual(response.json()[0]["seats"], 2)
        self.assertEqual(response.json()[0]["event"], self.event.title)
        self.assertEqual(self.client.get(url, HTTP_X_EXPECTED_DJANGO_USER="999").status_code, 409)
        other = get_user_model().objects.create_user(username="otro", password="clave-prueba")
        self.client.force_login(other)
        self.assertEqual(self.client.get(url).json(), [])
        self.client.logout()
        self.assertEqual(self.client.get(url).status_code, 401)

    def test_admin_cannot_reduce_capacity_below_bookings(self):
        self.assertEqual(self.book(3).status_code, 201)
        self.event.refresh_from_db()
        self.event.capacity = 2
        with self.assertRaises(ValidationError):
            self.event.full_clean()
        admin = get_user_model().objects.create_superuser(username="admin", password="clave")
        self.client.force_login(admin)
        response = self.client.post(reverse("admin:catalog_event_change", args=[self.event.pk]), {
            "title": self.event.title, "description": self.event.description,
            "date_0": (timezone.now() + timedelta(days=2)).date().isoformat(),
            "date_1": "12:00:00", "time_label": self.event.time_label,
            "location": self.event.location, "capacity": "2", "price": "50",
            "image_url": "", "category": self.event.category,
        })
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "El cupo no puede ser menor")
        self.event.refresh_from_db()
        self.assertEqual(self.event.capacity, 4)
        self.assertEqual(self.event.reserved_seats, 3)
        booking = EventBooking.objects.get()
        self.assertEqual(self.client.post(reverse("admin:catalog_eventbooking_delete", args=[booking.pk])).status_code, 403)
