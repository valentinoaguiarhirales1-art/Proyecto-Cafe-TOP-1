from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.test import Client, TestCase
from django.urls import reverse
from django.utils import timezone

from .models import StaffApplication, TeamProfile


class StaffInvitationTests(TestCase):
    def setUp(self):
        users = get_user_model().objects
        self.staff = users.create_user(username="gestor", is_staff=True)
        self.staff.user_permissions.add(Permission.objects.get(codename="change_staffapplication"))
        self.applicant = users.create_user(username="candidato", email="test@example.com")
        self.other = users.create_user(username="otro", email="otro@example.com")
        self.application = StaffApplication.objects.create(
            name="Candidata", email="test@example.com", requested_position="barista",
            experience_years=2, public_profile_consent=True,
        )
        self.issue_url = reverse("issue-staff-invitation", args=[self.application.pk])
        self.accept_url = reverse("accept-staff-invitation-api")

    def issue(self):
        self.client.force_login(self.staff)
        response = self.client.post(self.issue_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Cache-Control"], "no-store")
        return response.context["code"]

    def test_issue_requires_permission_post_and_csrf(self):
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.staff)
        self.assertEqual(client.get(self.issue_url).status_code, 405)
        self.assertEqual(client.post(self.issue_url).status_code, 403)
        client.force_login(self.other)
        token = client.get(reverse("session-api")).json()["csrfToken"]
        self.assertEqual(client.post(self.issue_url, HTTP_X_CSRFTOKEN=token).status_code, 302)
        self.assertFalse(StaffApplication.objects.get().invitation_hash)

    def test_issue_requires_staff_and_permission_independently(self):
        self.client.force_login(self.other)
        self.other.user_permissions.add(Permission.objects.get(codename="change_staffapplication"))
        self.assertEqual(self.client.post(self.issue_url).status_code, 302)
        unprivileged = get_user_model().objects.create_user(username="sin-permiso", is_staff=True)
        self.client.force_login(unprivileged)
        self.assertEqual(self.client.post(self.issue_url).status_code, 403)

    def test_accept_requires_session_and_csrf(self):
        code = self.issue()
        client = Client(enforce_csrf_checks=True)
        token = client.get(reverse("session-api")).json()["csrfToken"]
        response = client.post(self.accept_url, {"invitation": code}, HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 401)
        self.assertIn("no-store", response["Cache-Control"])
        client.force_login(self.applicant)
        self.assertEqual(client.post(self.accept_url, {"invitation": code}).status_code, 403)
        token = client.get(reverse("session-api")).json()["csrfToken"]
        self.assertEqual(client.post(self.accept_url, {"invitation": code}, HTTP_X_CSRFTOKEN=token).status_code, 200)

    def test_duplicate_email_and_existing_profile_do_not_consume_invitation(self):
        code = self.issue()
        duplicate = get_user_model().objects.create_user(username="duplicado", email="TEST@example.com")
        self.client.force_login(self.applicant)
        self.assertEqual(self.client.post(self.accept_url, {"invitation": code}).status_code, 409)
        duplicate.delete()
        TeamProfile.objects.create(user=self.applicant, name="Existente", role="barista")
        self.assertEqual(self.client.post(self.accept_url, {"invitation": code}).status_code, 409)
        self.application.refresh_from_db()
        self.assertEqual(self.application.status, StaffApplication.Status.APPROVED)
        self.assertTrue(self.application.invitation_hash)

    def test_accepted_application_cannot_be_rejected_or_reissued(self):
        code = self.issue()
        self.client.force_login(self.applicant)
        self.assertEqual(self.client.post(self.accept_url, {"invitation": code}).status_code, 200)
        self.client.force_login(self.staff)
        self.assertEqual(self.client.post(reverse("reject-staff-application", args=[self.application.pk])).status_code, 409)
        self.assertEqual(self.client.post(self.issue_url).status_code, 409)

    def test_accept_checks_account_session_and_single_use(self):
        code = self.issue()
        self.application.refresh_from_db()
        self.assertNotEqual(self.application.invitation_hash, code)
        self.client.force_login(self.other)
        self.assertEqual(self.client.post(self.accept_url, {"invitation": code}).status_code, 400)
        self.client.force_login(self.applicant)
        self.assertEqual(self.client.post(self.accept_url, {"invitation": code}, HTTP_X_EXPECTED_DJANGO_USER=str(self.other.pk)).status_code, 409)
        self.assertEqual(self.client.post(self.accept_url, {"invitation": code}).status_code, 200)
        self.application.refresh_from_db()
        self.assertEqual(self.application.status, "accepted")
        self.assertEqual(self.application.invitation_hash, "")
        self.assertEqual(self.application.accepted_user, self.applicant)
        profile = TeamProfile.objects.get()
        self.assertFalse(profile.public_profile)
        self.assertFalse(profile.public_profile_consent)
        self.assertFalse(self.applicant.is_staff)
        self.assertFalse(self.applicant.user_permissions.exists())
        self.assertEqual(self.client.post(self.accept_url, {"invitation": code}).status_code, 400)

    def test_renew_expire_and_reject_invalidate_invitation(self):
        old = self.issue()
        new = self.issue()
        self.client.force_login(self.applicant)
        self.assertEqual(self.client.post(self.accept_url, {"invitation": old}).status_code, 400)
        self.application.refresh_from_db()
        self.application.invitation_expires_at = timezone.now() - timedelta(seconds=1)
        self.application.save(update_fields=["invitation_expires_at"])
        self.assertEqual(self.client.post(self.accept_url, {"invitation": new}).status_code, 400)
        new = self.issue()
        self.assertEqual(self.client.post(reverse("reject-staff-application", args=[self.application.pk])).status_code, 302)
        self.client.force_login(self.applicant)
        self.assertEqual(self.client.post(self.accept_url, {"invitation": new}).status_code, 400)
        self.assertFalse(TeamProfile.objects.exists())
