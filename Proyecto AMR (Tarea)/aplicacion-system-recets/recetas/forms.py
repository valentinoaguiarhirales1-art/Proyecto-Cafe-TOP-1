from django import forms
from django.forms import inlineformset_factory

from .models import Category, Rating, Recipe, RecipeIngredient


def is_english():
    from django.utils.translation import get_language

    return (get_language() or "es").startswith("en")


class RecipeForm(forms.ModelForm):
    title = forms.CharField(max_length=160)
    summary = forms.CharField(max_length=280, widget=forms.Textarea(attrs={"rows": 2}))
    instructions = forms.CharField(widget=forms.Textarea(attrs={"rows": 8}))

    class Meta:
        model = Recipe
        fields = (
            "category",
            "language",
            "portions",
            "difficulty",
            "prep_minutes",
            "cook_minutes",
            "image",
        )
        widgets = {
            "portions": forms.NumberInput(attrs={"min": 1}),
            "prep_minutes": forms.NumberInput(attrs={"min": 0}),
            "cook_minutes": forms.NumberInput(attrs={"min": 0}),
            "image": forms.ClearableFileInput(attrs={"accept": "image/jpeg,image/png,image/webp"}),
        }

    def __init__(self, *args, **kwargs):
        self.instance_translation = kwargs.pop("translation", None)
        super().__init__(*args, **kwargs)
        english = is_english()
        labels = {
            "category": ("Category", "Categoría"),
            "language": ("Original language", "Idioma original"),
            "portions": ("Servings", "Porciones"),
            "difficulty": ("Difficulty", "Dificultad"),
            "prep_minutes": ("Prep time (min)", "Preparación (min)"),
            "cook_minutes": ("Cook time (min)", "Cocción (min)"),
            "image": ("Photo (optional, max 5 MB)", "Foto (opcional, máx. 5 MB)"),
            "title": ("Recipe title", "Nombre de la receta"),
            "summary": ("Short description", "Descripción breve"),
            "instructions": ("Step-by-step instructions", "Instrucciones paso a paso"),
        }
        for field, (en_label, es_label) in labels.items():
            self.fields[field].label = en_label if english else es_label
        self.fields["category"].queryset = Category.objects.all()
        self.fields["language"].choices = [("es", "Español"), ("en", "English")]
        self.fields["difficulty"].choices = (
            [("easy", "Easy"), ("medium", "Medium"), ("hard", "Hard")]
            if english
            else [("easy", "Fácil"), ("medium", "Intermedia"), ("hard", "Difícil")]
        )
        if self.instance_translation:
            self.fields["title"].initial = self.instance_translation.title
            self.fields["summary"].initial = self.instance_translation.summary
            self.fields["instructions"].initial = self.instance_translation.instructions


class RecipeIngredientForm(forms.ModelForm):
    name = forms.CharField(max_length=140, required=False)
    position = forms.IntegerField(required=False, widget=forms.HiddenInput())

    class Meta:
        model = RecipeIngredient
        fields = ("amount", "unit", "position")
        widgets = {"position": forms.HiddenInput()}

    def __init__(self, *args, **kwargs):
        recipe = kwargs.pop("recipe", None)
        super().__init__(*args, **kwargs)
        if self.instance.pk:
            translation = self.instance.ingredient.translations.filter(
                language=recipe.language
            ).first()
            if translation:
                self.fields["name"].initial = translation.name
        self.fields["name"].label = "Ingredient name" if is_english() else "Ingrediente"
        self.fields["amount"].label = "Amount" if is_english() else "Cantidad"
        self.fields["unit"].label = "Unit" if is_english() else "Unidad"

    def clean(self):
        cleaned = super().clean()
        has_values = any(cleaned.get(field) for field in ("name", "amount", "unit"))
        if has_values and not cleaned.get("name"):
            self.add_error("name", "Enter an ingredient name." if is_english() else "Escribe el nombre del ingrediente.")
        return cleaned


IngredientFormSet = inlineformset_factory(
    Recipe,
    RecipeIngredient,
    form=RecipeIngredientForm,
    extra=1,
    can_delete=True,
    fields=("amount", "unit", "position"),
)


class RatingForm(forms.ModelForm):
    class Meta:
        model = Rating
        fields = ("score", "comment")
        widgets = {
            "score": forms.Select(choices=[(n, f"{n} ★") for n in range(5, 0, -1)]),
            "comment": forms.Textarea(attrs={"rows": 3, "maxlength": 500}),
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        english = is_english()
        self.fields["score"].label = "Your rating" if english else "Tu valoración"
        self.fields["comment"].label = "A note (optional)" if english else "Un comentario (opcional)"


class TranslationForm(forms.Form):
    title = forms.CharField(max_length=160)
    summary = forms.CharField(max_length=280, widget=forms.Textarea(attrs={"rows": 2}))
    instructions = forms.CharField(widget=forms.Textarea(attrs={"rows": 8}))

    def __init__(self, *args, ingredients, language, translation=None, **kwargs):
        super().__init__(*args, **kwargs)
        english = is_english()
        self.fields["title"].label = "Translated title" if english else "Título traducido"
        self.fields["summary"].label = "Translated description" if english else "Descripción traducida"
        self.fields["instructions"].label = (
            "Translated instructions" if english else "Instrucciones traducidas"
        )
        self.ingredients = list(ingredients)
        self.language = language
        if translation:
            self.fields["title"].initial = translation.title
            self.fields["summary"].initial = translation.summary
            self.fields["instructions"].initial = translation.instructions
        for entry in self.ingredients:
            existing = entry.ingredient.translations.filter(language=language).first()
            self.fields[f"ingredient_{entry.ingredient_id}"] = forms.CharField(
                max_length=140,
                label=(
                    f"Translate: {entry.ingredient.translations.filter(language=entry.recipe.language).values_list('name', flat=True).first() or entry.ingredient.slug}"
                    if english
                    else f"Traducción de: {entry.ingredient.translations.filter(language=entry.recipe.language).values_list('name', flat=True).first() or entry.ingredient.slug}"
                ),
                initial=existing.name if existing else "",
            )
