from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from .models import TeamProfile


class TeamTests(TestCase):
    def profile(self, name, **values):
        user = get_user_model().objects.create_user(username=name, email=f"{name}@example.com")
        return TeamProfile.objects.create(user=user, name=name, role="barista", **values)

    def test_only_active_and_consented_public_profiles_are_visible(self):
        profile = self.profile("visible", public_profile=True, public_profile_consent=True, bio="Café")
        self.profile("sin_consentimiento", public_profile=True)
        self.profile("privado", public_profile_consent=True)
        disabled = self.profile("inactivo", public_profile=True, public_profile_consent=True)
        disabled.user.is_active = False
        disabled.user.save()
        response = self.client.get(reverse("team-api"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Cache-Control"], "no-store")
        self.assertEqual(response.json(), [{
            "id": profile.pk, "name": "visible", "role": "barista",
            "experienceYears": 0, "isRecentGraduate": False, "bio": "Café",
        }])
        profile.public_profile_consent = False
        profile.save()
        self.assertEqual(self.client.get(reverse("team-api")).json(), [])
        self.assertEqual(self.client.post(reverse("team-api")).status_code, 405)

    def test_only_authorized_admin_can_create_profiles(self):
        user = get_user_model().objects.create_user(username="personal", is_staff=True)
        self.client.force_login(user)
        url = reverse("admin:catalog_teamprofile_add")
        self.assertEqual(self.client.get(url).status_code, 403)
        admin = get_user_model().objects.create_superuser(username="admin")
        self.client.force_login(admin)
        data = {"user": user.pk, "name": "Prueba", "role": "barista", "experience_years": 2}
        self.assertEqual(self.client.post(url, data).status_code, 302)
        self.assertEqual(self.client.get(reverse("team-api")).json(), [])
        data.update({"user": admin.pk, "name": "Inválido", "experience_years": 61})
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 200)
        self.assertIn("experience_years", response.context["adminform"].form.errors)
        self.assertEqual(TeamProfile.objects.count(), 1)
