from django.contrib import admin

from .models import (
    Category,
    Ingredient,
    IngredientTranslation,
    Rating,
    Recipe,
    RecipeIngredient,
    RecipeTranslation,
)


class RecipeTranslationInline(admin.StackedInline):
    model = RecipeTranslation
    extra = 0


class RecipeIngredientInline(admin.TabularInline):
    model = RecipeIngredient
    extra = 0


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = ("slug", "author", "category", "difficulty", "published", "created_at")
    list_filter = ("published", "difficulty", "category", "language")
    search_fields = ("slug", "translations__title", "author__username")
    inlines = [RecipeTranslationInline, RecipeIngredientInline]


class IngredientTranslationInline(admin.TabularInline):
    model = IngredientTranslation
    extra = 0


@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    list_display = ("slug",)
    inlines = [IngredientTranslationInline]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name",)


@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ("recipe", "user", "score", "updated_at")
    list_filter = ("score",)
    search_fields = ("recipe__slug", "user__username", "comment")
