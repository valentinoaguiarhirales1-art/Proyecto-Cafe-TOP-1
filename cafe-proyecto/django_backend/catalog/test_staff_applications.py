from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.test import Client, TestCase
from django.urls import reverse

from .models import StaffApplication


class StaffApplicationTests(TestCase):
    def setUp(self):
        self.url = reverse("staff-application-api")
        self.data = {
            "name": "Persona de prueba", "email": "Persona@Example.com", "phone": "123",
            "requested_position": "barista", "experience_years": "2",
            "is_recent_graduate": "false", "public_profile_consent": "true", "profile_bio": "Hola",
            "status": "reviewed",
        }

    def test_submit_with_csrf_does_not_create_account_or_publish_profile(self):
        client = Client(enforce_csrf_checks=True)
        self.assertEqual(client.post(self.url, self.data).status_code, 403)
        token = client.get(reverse("session-api")).json()["csrfToken"]
        response = client.post(self.url, self.data, HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 201)
        application = StaffApplication.objects.get()
        self.assertEqual(application.email, "persona@example.com")
        self.assertEqual(application.status, StaffApplication.Status.PENDING)
        self.assertFalse(application.is_recent_graduate)
        self.assertTrue(application.public_profile_consent)
        self.assertFalse(get_user_model().objects.exists())
        self.assertEqual(client.get(reverse("team-api")).json(), [])
        self.assertEqual(client.get(self.url).status_code, 405)

    def test_invalid_values_do_not_save(self):
        for field, value in (("name", "a"), ("email", "mal"), ("requested_position", "gerente"),
                             ("experience_years", "61"), ("profile_bio", "x" * 241),
                             ("is_recent_graduate", "invalido"), ("public_profile_consent", "invalido")):
            data = {**self.data, field: value}
            response = self.client.post(self.url, data)
            self.assertEqual(response.status_code, 400, field)
            self.assertIn(field, response.json()["fields"])
        self.assertFalse(StaffApplication.objects.exists())

    def test_admin_requires_permission_and_cannot_change_candidate_data(self):
        application = StaffApplication.objects.create(
            name="Original", email="original@example.com", requested_position="barista", experience_years=1,
        )
        user = get_user_model().objects.create_user(username="personal", is_staff=True)
        self.client.force_login(user)
        url = reverse("admin:catalog_staffapplication_change", args=[application.pk])
        self.assertEqual(self.client.get(url).status_code, 403)
        user.user_permissions.add(Permission.objects.get(codename="change_staffapplication"))
        user = get_user_model().objects.get(pk=user.pk)
        self.client.force_login(user)
        response = self.client.post(url, {"name": "Alterado", "email": "new@example.com", "status": "reviewed"})
        self.assertEqual(response.status_code, 302)
        application.refresh_from_db()
        self.assertEqual(application.name, "Original")
        self.assertEqual(application.email, "original@example.com")
        self.assertEqual(application.status, "pending")
