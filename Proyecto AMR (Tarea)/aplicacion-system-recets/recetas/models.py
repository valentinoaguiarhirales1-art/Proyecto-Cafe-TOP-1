import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator, MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.text import slugify


def validate_image_size(image):
    if image.size > 5 * 1024 * 1024:
        raise ValidationError("La imagen no puede superar los 5 MB.")


class Category(models.Model):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=90, unique=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "categorías"

    def __str__(self):
        return self.name


class Ingredient(models.Model):
    slug = models.SlugField(max_length=140, unique=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = f"{slugify(uuid.uuid4().hex[:8])}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.translations.first().name if self.translations.exists() else self.slug


class IngredientTranslation(models.Model):
    class Language(models.TextChoices):
        SPANISH = "es", "Español"
        ENGLISH = "en", "English"

    ingredient = models.ForeignKey(
        Ingredient, on_delete=models.CASCADE, related_name="translations"
    )
    language = models.CharField(max_length=2, choices=Language.choices)
    name = models.CharField(max_length=140)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["ingredient", "language"], name="unique_ingredient_language"
            )
        ]
        ordering = ["language", "name"]

    def __str__(self):
        return f"{self.name} ({self.language})"


class Recipe(models.Model):
    class Difficulty(models.TextChoices):
        EASY = "easy", "Fácil"
        MEDIUM = "medium", "Intermedia"
        HARD = "hard", "Difícil"

    class Language(models.TextChoices):
        SPANISH = "es", "Español"
        ENGLISH = "en", "English"

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="recipes"
    )
    category = models.ForeignKey(
        Category, on_delete=models.PROTECT, related_name="recipes"
    )
    slug = models.SlugField(max_length=180, unique=True, blank=True)
    language = models.CharField(max_length=2, choices=Language.choices, default=Language.SPANISH)
    portions = models.PositiveSmallIntegerField(
        default=4, validators=[MinValueValidator(1), MaxValueValidator(100)]
    )
    difficulty = models.CharField(
        max_length=10, choices=Difficulty.choices, default=Difficulty.EASY
    )
    prep_minutes = models.PositiveSmallIntegerField(
        default=0, validators=[MaxValueValidator(1440)]
    )
    cook_minutes = models.PositiveSmallIntegerField(
        default=0, validators=[MaxValueValidator(1440)]
    )
    image = models.ImageField(
        upload_to="recipes/%Y/%m/",
        blank=True,
        validators=[
            FileExtensionValidator(["jpg", "jpeg", "png", "webp"]),
            validate_image_size,
        ],
    )
    published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["published", "-created_at"]),
            models.Index(fields=["category", "difficulty"]),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = f"receta-{uuid.uuid4().hex[:8]}"
        super().save(*args, **kwargs)

    @property
    def total_minutes(self):
        return self.prep_minutes + self.cook_minutes

    @property
    def average_rating(self):
        return self.ratings.aggregate(value=models.Avg("score"))["value"] or 0

    @property
    def rating_count(self):
        return self.ratings.count()

    def translation_for(self, language):
        return (
            self.translations.filter(language=language).first()
            or self.translations.filter(language=self.language).first()
            or self.translations.first()
        )

    def __str__(self):
        translation = self.translation_for(self.language)
        return translation.title if translation else self.slug


class RecipeTranslation(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name="translations")
    language = models.CharField(max_length=2, choices=Recipe.Language.choices)
    title = models.CharField(max_length=160)
    summary = models.CharField(max_length=280)
    instructions = models.TextField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["recipe", "language"], name="unique_recipe_language"
            )
        ]
        ordering = ["language"]

    def __str__(self):
        return f"{self.title} ({self.language})"


class RecipeIngredient(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name="recipe_ingredients")
    ingredient = models.ForeignKey(
        Ingredient, on_delete=models.PROTECT, related_name="recipe_ingredients"
    )
    amount = models.CharField(max_length=40, blank=True)
    unit = models.CharField(max_length=40, blank=True)
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["position", "pk"]

    def translated_name(self, language):
        translation = self.ingredient.translations.filter(language=language).first()
        fallback = self.ingredient.translations.filter(language=self.recipe.language).first()
        return translation.name if translation else (fallback.name if fallback else self.ingredient.slug)

    def __str__(self):
        return f"{self.amount} {self.unit} {self.ingredient}".strip()


class Rating(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name="ratings")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="recipe_ratings"
    )
    score = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["recipe", "user"], name="unique_user_recipe_rating")
        ]
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.score}/5 · {self.recipe}"
