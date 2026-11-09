from django.contrib import admin
from django.core.exceptions import ValidationError

from .models import Category, Event, EventBooking, GuestReservation, Order, OrderItem, Product, Promotion, Reservation, SiteSetting, StaffApplication, TeamProfile


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    search_fields = ["name"]


@admin.register(SiteSetting)
class SiteSettingAdmin(admin.ModelAdmin):
    list_display = ["key", "value"]
    search_fields = ["key"]


@admin.register(TeamProfile)
class TeamProfileAdmin(admin.ModelAdmin):
    list_display = ["name", "role", "public_profile", "public_profile_consent"]
    list_filter = ["role", "public_profile", "public_profile_consent"]
    search_fields = ["name"]


@admin.register(StaffApplication)
class StaffApplicationAdmin(admin.ModelAdmin):
    list_display = ["name", "requested_position", "status", "created_at"]
    list_filter = ["status", "requested_position"]
    search_fields = ["name", "email"]
    readonly_fields = ["name", "email", "phone", "requested_position", "experience_years",
                       "is_recent_graduate", "public_profile_consent", "profile_bio", "created_at",
                       "status", "invitation_expires_at", "accepted_user"]

    def has_add_permission(self, request):
        return False


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "price", "available"]
    list_filter = ["category", "available"]
    search_fields = ["name"]


@admin.register(Promotion)
class PromotionAdmin(admin.ModelAdmin):
    list_display = ["title", "original_price", "combo_price", "active"]
    list_filter = ["active"]
    search_fields = ["title"]


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ["title", "date", "capacity", "reserved_seats"]
    readonly_fields = ["reserved_seats"]
    search_fields = ["title"]

    def get_object(self, request, object_id, from_field=None):
        if request.method != "POST":
            return super().get_object(request, object_id, from_field)
        queryset = self.get_queryset(request).select_for_update()
        field = queryset.model._meta.pk if from_field is None else queryset.model._meta.get_field(from_field)
        try:
            return queryset.get(**{field.name: field.to_python(object_id)})
        except (queryset.model.DoesNotExist, ValidationError, ValueError):
            return None


@admin.register(EventBooking)
class EventBookingAdmin(admin.ModelAdmin):
    list_display = ["event", "customer", "seats", "created_at"]
    readonly_fields = ["event", "customer", "seats", "created_at"]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ["product", "product_name", "quantity", "unit_price", "selected_size", "selected_milk", "selected_extras", "notes"]

    def has_add_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["id", "customer", "created_at", "status", "total"]
    list_filter = ["status"]
    readonly_fields = ["customer", "created_at", "total", "order_type"]
    inlines = [OrderItemInline]

    def has_add_permission(self, request):
        return False


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ["id", "customer", "date", "time", "party_size", "status"]
    list_filter = ["status", "date"]
    readonly_fields = ["customer", "created_at"]

    def has_add_permission(self, request):
        return False


@admin.register(GuestReservation)
class GuestReservationAdmin(admin.ModelAdmin):
    list_display = ["name", "date", "time", "party_size", "status"]
    list_filter = ["status", "date"]
    search_fields = ["name", "email", "phone"]
    readonly_fields = ["name", "email", "phone", "date", "time", "party_size", "notes", "created_at"]

    def has_add_permission(self, request):
        return False
