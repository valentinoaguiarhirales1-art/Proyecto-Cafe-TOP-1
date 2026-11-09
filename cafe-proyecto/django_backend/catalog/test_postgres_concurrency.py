import json
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier
from unittest import skipUnless

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.db import close_old_connections, connection, connections
from django.test import Client, TransactionTestCase
from django.urls import reverse
from django.utils import timezone

from .models import Event, EventBooking, StaffApplication, TeamProfile


@skipUnless(connection.vendor == "postgresql", "Esta prueba necesita PostgreSQL.")
class PostgresConcurrencyTests(TransactionTestCase):
    def run_concurrently(self, operations):
        barrier = Barrier(len(operations), timeout=10)

        def execute(operation):
            close_old_connections()
            try:
                barrier.wait()
                return operation()
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=len(operations)) as pool:
            futures = [pool.submit(execute, operation) for operation in operations]
            return [future.result(timeout=30) for future in futures]

    def test_only_one_booking_gets_last_seat(self):
        users = get_user_model().objects
        first = users.create_user(username="cliente-uno")
        second = users.create_user(username="cliente-dos")
        event = Event.objects.create(
            title="Prueba", description="Prueba", date=timezone.now() + timedelta(days=1),
            time_label="12:00", location="Prueba", capacity=1, price="0.00", category="Cata",
        )
        clients = [Client(), Client()]
        clients[0].force_login(first)
        clients[1].force_login(second)
        url = reverse("book-event-api", args=[event.pk])
        responses = self.run_concurrently([
            lambda client=client: client.post(url, json.dumps({"seats": 1}), content_type="application/json").status_code
            for client in clients
        ])
        self.assertEqual(sorted(responses), [201, 400])
        event.refresh_from_db()
        self.assertEqual(event.reserved_seats, 1)
        self.assertEqual(EventBooking.objects.filter(event=event).count(), 1)

    def test_invitation_is_accepted_only_once(self):
        users = get_user_model().objects
        staff = users.create_user(username="gestor", is_staff=True)
        staff.user_permissions.add(Permission.objects.get(codename="change_staffapplication"))
        applicant = users.create_user(username="candidato", email="candidato@example.test")
        application = StaffApplication.objects.create(
            name="Candidato", email=applicant.email, requested_position="barista", experience_years=0,
        )
        staff_client = Client()
        staff_client.force_login(staff)
        response = staff_client.post(reverse("issue-staff-invitation", args=[application.pk]))
        self.assertEqual(response.status_code, 200)
        code = response.context["code"]
        clients = [Client(), Client()]
        for client in clients:
            client.force_login(applicant)
        url = reverse("accept-staff-invitation-api")
        responses = self.run_concurrently([
            lambda client=client: client.post(url, {"invitation": code}).status_code
            for client in clients
        ])
        self.assertEqual(sorted(responses), [200, 400])
        application.refresh_from_db()
        self.assertEqual(application.status, StaffApplication.Status.ACCEPTED)
        self.assertFalse(application.invitation_hash)
        self.assertEqual(TeamProfile.objects.filter(user=applicant).count(), 1)
