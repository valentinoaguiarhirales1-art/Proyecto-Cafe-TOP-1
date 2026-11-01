import uuid

from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.db import transaction
from django.db.models import Avg, Count, Q
from django.http import Http404
from django.shortcuts import get_object_or_404, redirect, render
from django.utils.text import slugify
from django.utils.http import url_has_allowed_host_and_scheme
from django.utils.translation import get_language
from django.views.decorators.http import require_POST

from .forms import IngredientFormSet, RatingForm, RecipeForm, TranslationForm
from .models import (
    Ingredient,
    IngredientTranslation,
    Recipe,
    RecipeIngredient,
    RecipeTranslation,
)


def current_language(request):
    return "en" if (get_language() or "es").startswith("en") else "es"


def recipe_translation(recipe, language):
    return recipe.translation_for(language)


def recipe_list(request):
    language = current_language(request)
    recipes = Recipe.objects.filter(published=True).select_related(
        "author", "category"
    ).prefetch_related("translations", "ratings", "recipe_ingredients__ingredient__translations")
    query = request.GET.get("q", "").strip()
    category = request.GET.get("category", "").strip()
    difficulty = request.GET.get("difficulty", "").strip()
    max_minutes = request.GET.get("max_minutes", "").strip()
    if query:
        recipes = recipes.filter(
            Q(translations__title__icontains=query)
            | Q(translations__summary__icontains=query)
            | Q(recipe_ingredients__ingredient__translations__name__icontains=query)
        ).distinct()
    if category.isdigit():
        recipes = recipes.filter(category_id=int(category))
    if difficulty in Recipe.Difficulty.values:
        recipes = recipes.filter(difficulty=difficulty)
    if max_minutes.isdigit():
        recipes = recipes.annotate(
            total_time=models_sum_times()
        ).filter(total_time__lte=int(max_minutes))
    recipes = recipes.annotate(avg_score=Avg("ratings__score"), review_count=Count("ratings", distinct=True))
    recipes = list(recipes)
    for recipe in recipes:
        recipe.display_translation = recipe_translation(recipe, language)
    return render(
        request,
        "recetas/recipe_list.html",
        {
            "recipes": recipes,
            "query": query,
            "selected_category": category,
            "selected_difficulty": difficulty,
            "max_minutes": max_minutes,
            "language": language,
        },
    )


def models_sum_times():
    from django.db.models import F

    return F("prep_minutes") + F("cook_minutes")


def recipe_detail(request, slug):
    language = current_language(request)
    recipe = get_object_or_404(
        Recipe.objects.select_related("author", "category").prefetch_related(
            "translations",
            "ratings__user",
            "recipe_ingredients__ingredient__translations",
        ),
        slug=slug,
    )
    if not recipe.published and request.user != recipe.author and not request.user.is_staff:
        raise Http404
    translation = recipe_translation(recipe, language)
    user_rating = (
        recipe.ratings.filter(user=request.user).first() if request.user.is_authenticated else None
    )
    ingredient_items = [
        {
            "entry": entry,
            "name": entry.translated_name(language),
        }
        for entry in recipe.recipe_ingredients.all()
    ]
    return render(
        request,
        "recetas/recipe_detail.html",
        {
            "recipe": recipe,
            "translation": translation,
            "language": language,
            "rating_form": RatingForm(instance=user_rating),
            "user_rating": user_rating,
            "ingredient_items": ingredient_items,
        },
    )


def _save_ingredients(recipe, formset):
    for form in formset.forms:
        if not hasattr(form, "cleaned_data") or not form.cleaned_data:
            continue
        data = form.cleaned_data
        if data.get("DELETE"):
            if form.instance.pk:
                ingredient_id = form.instance.ingredient_id
                form.instance.delete()
                if not RecipeIngredient.objects.filter(ingredient_id=ingredient_id).exists():
                    Ingredient.objects.filter(pk=ingredient_id).delete()
            continue
        name = (data.get("name") or "").strip()
        if not name:
            continue
        entry = form.save(commit=False)
        if entry.pk:
            ingredient = entry.ingredient
        else:
            ingredient = Ingredient.objects.create()
        entry.recipe = recipe
        entry.ingredient = ingredient
        entry.save()
        IngredientTranslation.objects.update_or_create(
            ingredient=ingredient,
            language=recipe.language,
            defaults={"name": name},
        )


@login_required
def recipe_create(request):
    if request.method == "POST":
        form = RecipeForm(request.POST, request.FILES)
        formset = IngredientFormSet(request.POST, prefix="ingredients")
        if form.is_valid() and formset.is_valid():
            with transaction.atomic():
                recipe = form.save(commit=False)
                recipe.author = request.user
                recipe.slug = f"{slugify(form.cleaned_data['title'])[:150]}-{uuid.uuid4().hex[:8]}"
                recipe.save()
                RecipeTranslation.objects.create(
                    recipe=recipe,
                    language=recipe.language,
                    title=form.cleaned_data["title"],
                    summary=form.cleaned_data["summary"],
                    instructions=form.cleaned_data["instructions"],
                )
                formset.instance = recipe
                _save_ingredients(recipe, formset)
            messages.success(request, "¡Tu receta ya está publicada!" if current_language(request) == "es" else "Your recipe is published!")
            return redirect("recipe_detail", slug=recipe.slug)
    else:
        form = RecipeForm()
        formset = IngredientFormSet(prefix="ingredients")
    return render(
        request, "recetas/recipe_form.html", {"form": form, "ingredient_formset": formset}
    )


@login_required
def recipe_update(request, slug):
    recipe = get_object_or_404(Recipe, slug=slug)
    if recipe.author_id != request.user.id and not request.user.is_staff:
        raise Http404
    translation = recipe.translations.filter(language=recipe.language).first()
    if request.method == "POST":
        form = RecipeForm(request.POST, request.FILES, instance=recipe, translation=translation)
        formset = IngredientFormSet(
            request.POST, instance=recipe, prefix="ingredients",
            form_kwargs={"recipe": recipe},
        )
        if form.is_valid() and formset.is_valid():
            with transaction.atomic():
                updated_recipe = form.save()
                translation.language = updated_recipe.language
                translation.title = form.cleaned_data["title"]
                translation.summary = form.cleaned_data["summary"]
                translation.instructions = form.cleaned_data["instructions"]
                translation.save()
                formset.instance = updated_recipe
                _save_ingredients(updated_recipe, formset)
            messages.success(request, "Receta actualizada." if current_language(request) == "es" else "Recipe updated.")
            return redirect("recipe_detail", slug=recipe.slug)
    else:
        form = RecipeForm(instance=recipe, translation=translation)
        formset = IngredientFormSet(
            instance=recipe, prefix="ingredients", form_kwargs={"recipe": recipe}
        )
    return render(
        request,
        "recetas/recipe_form.html",
        {"form": form, "ingredient_formset": formset, "recipe": recipe},
    )


@login_required
@require_POST
def recipe_delete(request, slug):
    recipe = get_object_or_404(Recipe, slug=slug)
    if recipe.author_id != request.user.id and not request.user.is_staff:
        raise Http404
    recipe.delete()
    messages.success(request, "Receta eliminada." if current_language(request) == "es" else "Recipe deleted.")
    return redirect("recipe_list")


@login_required
def recipe_translate(request, slug, language):
    if language not in {"es", "en"}:
        raise Http404
    recipe = get_object_or_404(Recipe, slug=slug)
    if recipe.author_id != request.user.id and not request.user.is_staff:
        raise Http404
    ingredients = recipe.recipe_ingredients.select_related("ingredient").prefetch_related(
        "ingredient__translations"
    )
    translation = recipe.translations.filter(language=language).first()
    if request.method == "POST":
        form = TranslationForm(
            request.POST, ingredients=ingredients, language=language, translation=translation
        )
        if form.is_valid():
            with transaction.atomic():
                RecipeTranslation.objects.update_or_create(
                    recipe=recipe,
                    language=language,
                    defaults={
                        "title": form.cleaned_data["title"],
                        "summary": form.cleaned_data["summary"],
                        "instructions": form.cleaned_data["instructions"],
                    },
                )
                for entry in ingredients:
                    IngredientTranslation.objects.update_or_create(
                        ingredient=entry.ingredient,
                        language=language,
                        defaults={"name": form.cleaned_data[f"ingredient_{entry.ingredient_id}"]},
                    )
            messages.success(request, "Traducción guardada." if current_language(request) == "es" else "Translation saved.")
            return redirect("recipe_detail", slug=recipe.slug)
    else:
        form = TranslationForm(
            ingredients=ingredients, language=language, translation=translation
        )
    return render(
        request,
        "recetas/translation_form.html",
        {"form": form, "recipe": recipe, "language": language},
    )


@login_required
@require_POST
def rate_recipe(request, slug):
    recipe = get_object_or_404(Recipe, slug=slug, published=True)
    if recipe.author_id == request.user.id:
        messages.error(request, "No puedes valorar tu propia receta." if current_language(request) == "es" else "You cannot rate your own recipe.")
        return redirect("recipe_detail", slug=slug)
    form = RatingForm(request.POST, instance=recipe.ratings.filter(user=request.user).first())
    if form.is_valid():
        rating = form.save(commit=False)
        rating.recipe = recipe
        rating.user = request.user
        rating.save()
        messages.success(request, "¡Gracias por tu valoración!" if current_language(request) == "es" else "Thanks for your rating!")
    else:
        messages.error(request, "Revisa los datos de tu valoración." if current_language(request) == "es" else "Please check your rating.")
    return redirect("recipe_detail", slug=slug)


def register(request):
    if request.user.is_authenticated:
        return redirect("recipe_list")
    if request.method == "POST":
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, "¡Bienvenido/a a la comunidad!" if current_language(request) == "es" else "Welcome to the community!")
            return redirect("recipe_list")
    else:
        form = UserCreationForm()
    return render(request, "registration/register.html", {"form": form})


@require_POST
def set_language(request, language):
    if language not in {"es", "en"}:
        raise Http404
    next_url = request.POST.get("next", "")
    if not url_has_allowed_host_and_scheme(
        next_url, allowed_hosts={request.get_host()}, require_https=request.is_secure()
    ):
        next_url = ""
    response = redirect(next_url or "recipe_list")
    response.set_cookie("django_language", language, max_age=60 * 60 * 24 * 365, samesite="Lax")
    request.session["django_language"] = language
    return response
