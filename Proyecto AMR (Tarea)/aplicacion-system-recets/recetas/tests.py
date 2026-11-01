from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from .models import (
    Category,
    Ingredient,
    IngredientTranslation,
    Rating,
    Recipe,
    RecipeIngredient,
    RecipeTranslation,
)

User = get_user_model()


class RecipeAppTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.author = User.objects.create_user(username="cocinera", password="test-pass-12345")
        cls.other_user = User.objects.create_user(username="comensal", password="test-pass-12345")
        cls.category, _ = Category.objects.get_or_create(
            name="Postres", defaults={"slug": "postres"}
        )
        cls.recipe = Recipe.objects.create(
            author=cls.author,
            category=cls.category,
            slug="pastel-de-manzana",
            portions=6,
            prep_minutes=20,
            cook_minutes=40,
            difficulty=Recipe.Difficulty.MEDIUM,
            language="es",
        )
        RecipeTranslation.objects.create(
            recipe=cls.recipe,
            language="es",
            title="Pastel de manzana",
            summary="Un clásico para compartir.",
            instructions="Mezcla los ingredientes.\nHornea hasta dorar.",
        )
        cls.ingredient = Ingredient.objects.create(slug="manzana")
        IngredientTranslation.objects.create(
            ingredient=cls.ingredient, language="es", name="manzana"
        )
        IngredientTranslation.objects.create(
            ingredient=cls.ingredient, language="en", name="apple"
        )
        RecipeIngredient.objects.create(
            recipe=cls.recipe,
            ingredient=cls.ingredient,
            amount="3",
            unit="piezas",
        )

    def test_home_lists_published_recipes_and_translated_title(self):
        response = self.client.get(reverse("recipe_list"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Pastel de manzana")
        self.assertContains(response, "Encuentra tu próximo favorito")

    def test_search_matches_ingredient_translation(self):
        response = self.client.get(reverse("recipe_list"), {"q": "manzana"})
        self.assertContains(response, "Pastel de manzana")

    def test_filters_by_difficulty_and_total_time(self):
        response = self.client.get(
            reverse("recipe_list"), {"difficulty": "medium", "max_minutes": "60"}
        )
        self.assertContains(response, "Pastel de manzana")
        response = self.client.get(
            reverse("recipe_list"), {"difficulty": "hard", "max_minutes": "30"}
        )
        self.assertNotContains(response, "Pastel de manzana")

    def test_detail_falls_back_to_original_and_shows_ingredient(self):
        response = self.client.get(reverse("recipe_detail", args=[self.recipe.slug]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Pastel de manzana")
        self.assertContains(response, "manzana")

    def test_owner_can_edit_and_non_owner_cannot(self):
        url = reverse("recipe_update", args=[self.recipe.slug])
        self.client.force_login(self.other_user)
        self.assertEqual(self.client.get(url).status_code, 404)
        self.client.force_login(self.author)
        self.assertEqual(self.client.get(url).status_code, 200)

    def test_owner_can_update_recipe_without_recreating_ingredients(self):
        self.client.force_login(self.author)
        response = self.client.post(
            reverse("recipe_update", args=[self.recipe.slug]),
            {
                "title": "Pastel de manzana casero",
                "summary": "Una versión casera para compartir.",
                "instructions": "Mezcla todo.\nHornea.",
                "category": str(self.category.pk),
                "language": "es",
                "portions": "6",
                "difficulty": "medium",
                "prep_minutes": "25",
                "cook_minutes": "40",
                "ingredients-TOTAL_FORMS": "2",
                "ingredients-INITIAL_FORMS": "1",
                "ingredients-MIN_NUM_FORMS": "0",
                "ingredients-MAX_NUM_FORMS": "1000",
                "ingredients-0-id": str(self.recipe.recipe_ingredients.get().pk),
                "ingredients-0-name": "manzana verde",
                "ingredients-0-amount": "4",
                "ingredients-0-unit": "piezas",
                "ingredients-0-position": "0",
                "ingredients-1-name": "",
                "ingredients-1-amount": "",
                "ingredients-1-unit": "",
                "ingredients-1-position": "",
            },
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(self.recipe.recipe_ingredients.count(), 1)
        self.assertEqual(
            self.ingredient.translations.get(language="es").name, "manzana verde"
        )
        self.assertEqual(
            self.recipe.translations.get(language="es").title,
            "Pastel de manzana casero",
        )

    def test_owner_can_translate_recipe_and_ingredients(self):
        self.client.force_login(self.author)
        response = self.client.post(
            reverse("recipe_translate", args=[self.recipe.slug, "en"]),
            {
                "title": "Apple cake",
                "summary": "A classic to share.",
                "instructions": "Mix the ingredients.\nBake until golden.",
                f"ingredient_{self.ingredient.pk}": "apple",
            },
        )
        self.assertRedirects(response, reverse("recipe_detail", args=[self.recipe.slug]))
        self.assertEqual(
            self.recipe.translations.get(language="en").title, "Apple cake"
        )
        self.assertEqual(
            self.ingredient.translations.get(language="en").name, "apple"
        )

    def test_rating_can_be_updated_but_not_duplicated(self):
        self.client.force_login(self.other_user)
        url = reverse("rate_recipe", args=[self.recipe.slug])
        self.client.post(url, {"score": "4", "comment": "Muy rica"})
        self.client.post(url, {"score": "5", "comment": "Excelente"})
        self.assertEqual(Rating.objects.filter(recipe=self.recipe, user=self.other_user).count(), 1)
        self.assertEqual(Rating.objects.get(recipe=self.recipe, user=self.other_user).score, 5)

    def test_author_cannot_rate_own_recipe(self):
        self.client.force_login(self.author)
        self.client.post(reverse("rate_recipe", args=[self.recipe.slug]), {"score": "5"})
        self.assertFalse(Rating.objects.filter(recipe=self.recipe, user=self.author).exists())

    def test_create_recipe_persists_unbounded_ingredient_form_rows(self):
        self.client.force_login(self.author)
        response = self.client.post(
            reverse("recipe_create"),
            {
                "title": "Sopa de temporada",
                "summary": "Calientita y fácil.",
                "instructions": "Cocina todo junto.",
                "category": str(self.category.pk),
                "language": "es",
                "portions": "4",
                "difficulty": "easy",
                "prep_minutes": "10",
                "cook_minutes": "20",
                "ingredients-TOTAL_FORMS": "3",
                "ingredients-INITIAL_FORMS": "0",
                "ingredients-MIN_NUM_FORMS": "0",
                "ingredients-MAX_NUM_FORMS": "1000",
                "ingredients-0-name": "Zanahoria",
                "ingredients-0-amount": "2",
                "ingredients-0-unit": "piezas",
                "ingredients-0-position": "0",
                "ingredients-1-name": "Calabaza",
                "ingredients-1-amount": "1",
                "ingredients-1-unit": "taza",
                "ingredients-1-position": "1",
                "ingredients-2-name": "Caldo",
                "ingredients-2-amount": "500",
                "ingredients-2-unit": "ml",
                "ingredients-2-position": "2",
            },
        )
        self.assertEqual(response.status_code, 302, response.context)
        recipe = Recipe.objects.get(translations__title="Sopa de temporada")
        self.assertEqual(recipe.recipe_ingredients.count(), 3)
        self.assertEqual(
            recipe.recipe_ingredients.get(position=2).ingredient.translations.get(language="es").name,
            "Caldo",
        )

    def test_language_switch_rejects_external_redirect(self):
        response = self.client.post(
            reverse("set_language", args=["en"]), {"next": "https://example.com"}
        )
        self.assertRedirects(response, reverse("recipe_list"))
        self.assertEqual(response.cookies["django_language"].value, "en")

    def test_language_switch_localizes_interface(self):
        self.client.post(reverse("set_language", args=["en"]), {"next": "/"})
        response = self.client.get(reverse("recipe_list"))
        self.assertContains(response, "Find your next favorite")
        self.assertContains(response, "Recipes")

    def test_registration_login_and_translation_forms_render(self):
        self.assertEqual(self.client.get(reverse("register")).status_code, 200)
        self.assertEqual(self.client.get(reverse("login")).status_code, 200)
        self.client.force_login(self.author)
        self.assertEqual(
            self.client.get(reverse("recipe_create")).status_code, 200
        )
        self.assertEqual(
            self.client.get(
                reverse("recipe_translate", args=[self.recipe.slug, "en"])
            ).status_code,
            200,
        )
