from .models import Category


def recipe_categories(request):
    return {"nav_categories": Category.objects.all()[:8]}
