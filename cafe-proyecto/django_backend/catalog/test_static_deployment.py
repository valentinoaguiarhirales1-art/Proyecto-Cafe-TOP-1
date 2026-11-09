import tempfile
from pathlib import Path

from django.conf import settings
from django.core.management import call_command
from django.http import HttpResponse
from django.test import RequestFactory, SimpleTestCase, override_settings
from whitenoise.middleware import WhiteNoiseMiddleware


class StaticDeploymentTests(SimpleTestCase):
    def test_collected_admin_css_served_when_debug_is_off(self):
        with tempfile.TemporaryDirectory() as directory:
            with override_settings(DEBUG=False, STATIC_ROOT=directory, WHITENOISE_AUTOREFRESH=False):
                call_command("collectstatic", interactive=False, verbosity=0)
                self.assertTrue((Path(directory) / "admin" / "css" / "base.css").is_file())
                middleware = WhiteNoiseMiddleware(lambda request: HttpResponse(status=404))
                response = middleware(RequestFactory().get("/static/admin/css/base.css"))
                self.assertEqual(response.status_code, 200)
                self.assertTrue(response["Content-Type"].startswith("text/css"))
                response.close()

    def test_static_url_and_middleware_order(self):
        self.assertEqual(settings.STATIC_URL, "/static/")
        self.assertEqual(settings.MIDDLEWARE[0:2], [
            "django.middleware.security.SecurityMiddleware",
            "whitenoise.middleware.WhiteNoiseMiddleware",
        ])
