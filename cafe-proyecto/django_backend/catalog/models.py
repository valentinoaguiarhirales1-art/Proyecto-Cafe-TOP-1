from django.core.validators import MaxLengthValidator, MaxValueValidator, MinValueValidator
from django.core.exceptions import ValidationError
from django.conf import settings
from django.db import models


class Category(models.Model):
    name = models.CharField("nombre", max_length=100, unique=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "categoría"
        verbose_name_plural = "categorías"

    def __str__(self):
        return self.name


class CustomerProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cafe_profile")
    phone = models.CharField("teléfono", max_length=30, blank=True)
    mongo_id = models.CharField(max_length=24, unique=True, null=True, blank=True, editable=False)


class StaffApplication(models.Model):
    class Position(models.TextChoices):
        BARISTA = "barista", "Barista"
        ATENCION = "atencion", "Atención al cliente"
        ENCARGADO = "encargado", "Encargado de barra"

    class Status(models.TextChoices):
        PENDING = "pending", "Pendiente"
        REVIEWED = "reviewed", "Revisada"
        REJECTED = "rejected", "Rechazada"
        APPROVED = "approved", "Invitación emitida"
        ACCEPTED = "accepted", "Invitación aceptada"

    name = models.CharField("nombre", max_length=100)
    email = models.EmailField("correo", max_length=254)
    phone = models.CharField("teléfono", max_length=30, blank=True)
    requested_position = models.CharField("puesto solicitado", max_length=20, choices=Position.choices)
    experience_years = models.PositiveSmallIntegerField("años de experiencia", validators=[MaxValueValidator(60)])
    is_recent_graduate = models.BooleanField("recién egresado", default=False)
    public_profile_consent = models.BooleanField("autoriza perfil público", default=False)
    profile_bio = models.CharField("presentación", max_length=240, blank=True)
    status = models.CharField("estado", max_length=10, choices=Status.choices, default=Status.PENDING, editable=False)
    created_at = models.DateTimeField("fecha de solicitud", auto_now_add=True)
    mongo_id = models.CharField(max_length=24, unique=True, null=True, blank=True, editable=False)
    invitation_hash = models.CharField(max_length=64, blank=True, editable=False)
    invitation_expires_at = models.DateTimeField(null=True, blank=True, editable=False)
    accepted_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True, editable=False, related_name="staff_applications")

    class Meta:
        ordering = ["-created_at", "-pk"]
        verbose_name = "solicitud de empleo"
        verbose_name_plural = "solicitudes de empleo"

    def __str__(self):
        return self.name


class TeamProfile(models.Model):
    class Role(models.TextChoices):
        BARISTA = "barista", "Barista"
        ATENCION = "atencion", "Atención al cliente"
        ENCARGADO = "encargado", "Encargado de barra"
        SUBGERENTE = "subgerente", "Subgerente"
        GERENTE = "gerente", "Gerente"
        SUPERVISOR = "supervisor", "Supervisor"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="team_profile", verbose_name="cuenta")
    name = models.CharField("nombre público", max_length=100)
    role = models.CharField("puesto", max_length=20, choices=Role.choices)
    experience_years = models.PositiveSmallIntegerField("años de experiencia", default=0, validators=[MaxValueValidator(60)])
    is_recent_graduate = models.BooleanField("recién egresado", default=False)
    bio = models.CharField("presentación pública", max_length=240, blank=True)
    public_profile = models.BooleanField("publicar perfil", default=False)
    public_profile_consent = models.BooleanField("autorización de la persona confirmada", default=False)

    class Meta:
        ordering = ["name", "pk"]
        verbose_name = "perfil público del equipo"
        verbose_name_plural = "perfiles públicos del equipo"

    def __str__(self):
        return self.name


class SiteSetting(models.Model):
    class Key(models.TextChoices):
        HERO_IMAGE = "hero_image", "Imagen principal"
        HERO_TITLE = "hero_title", "Título principal"
        HERO_SUBTITLE = "hero_subtitle", "Subtítulo principal"
        HERO_DESCRIPTION = "hero_description", "Descripción principal"
        HERO_BADGE = "hero_badge", "Distintivo principal"
        HERO_LABEL_PRIMARY = "hero_label_primary", "Etiqueta principal"
        HERO_LABEL_SECONDARY = "hero_label_secondary", "Etiqueta secundaria"
        STAT_1_NUM = "stat_1_num", "Cifra 1"
        STAT_1_LABEL = "stat_1_label", "Descripción de cifra 1"
        STAT_2_NUM = "stat_2_num", "Cifra 2"
        STAT_2_LABEL = "stat_2_label", "Descripción de cifra 2"
        STAT_3_NUM = "stat_3_num", "Cifra 3"
        STAT_3_LABEL = "stat_3_label", "Descripción de cifra 3"
        STAT_4_NUM = "stat_4_num", "Cifra 4"
        STAT_4_LABEL = "stat_4_label", "Descripción de cifra 4"
        MOMENTS_IMAGE = "moments_image", "Imagen de momentos"
        TAILS_TECH_IMAGE = "tails_tech_image", "Imagen de tecnología"
        TAILS_THUMBSUP_IMAGE = "tails_thumbsup_image", "Imagen secundaria"
        HALLOWEEN_PARTY_IMAGE = "halloween_party_image", "Imagen de temporada"
        VAMPIRE_SONIC_IMAGE = "vampire_sonic_image", "Imagen de temporada secundaria"
        CAFE_HALLOWEEN_IMAGE = "cafe_halloween_image", "Imagen de celebraciones"
        FOOTER_PHONE = "footer_phone", "Teléfono"
        FOOTER_ADDRESS = "footer_address", "Dirección"
        FOOTER_HOURS = "footer_hours", "Horario"

    key = models.CharField("apartado", max_length=50, choices=Key.choices, unique=True)
    value = models.TextField("texto o ruta de imagen", max_length=5000, blank=True, validators=[MaxLengthValidator(5000)])

    class Meta:
        ordering = ["key"]
        verbose_name = "ajuste visual"
        verbose_name_plural = "ajustes visuales"

    def __str__(self):
        return self.get_key_display()


class Promotion(models.Model):
    mongo_id = models.CharField(max_length=24, unique=True, null=True, blank=True, editable=False)
    title = models.CharField("título", max_length=150)
    description = models.TextField("descripción")
    original_price = models.DecimalField("precio original", max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    combo_price = models.DecimalField("precio del combo", max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    image_url = models.CharField("ruta de imagen", max_length=500, blank=True)
    badge = models.CharField("distintivo", max_length=150, blank=True)
    items_included = models.JSONField("productos incluidos", default=list, blank=True)
    active = models.BooleanField("activo", default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-pk"]
        verbose_name = "promoción"
        verbose_name_plural = "promociones"

    def clean(self):
        super().clean()
        if not isinstance(self.items_included, list) or any(
            not isinstance(item, str) or not item.strip() or len(item) > 150 for item in self.items_included
        ) or len(self.items_included) > 30:
            raise ValidationError({"items_included": "Escribe una lista de hasta 30 nombres de productos."})

    def __str__(self):
        return self.title


class Event(models.Model):
    mongo_id = models.CharField(max_length=24, unique=True, null=True, blank=True, editable=False)
    title = models.CharField("título", max_length=150)
    description = models.TextField("descripción")
    date = models.DateTimeField("fecha")
    time_label = models.CharField("horario mostrado", max_length=100)
    location = models.CharField("ubicación", max_length=250)
    capacity = models.PositiveIntegerField("cupo", validators=[MinValueValidator(1)])
    reserved_seats = models.PositiveIntegerField(default=0, editable=False)
    price = models.DecimalField("precio por persona", max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    image_url = models.CharField("ruta de imagen", max_length=500, blank=True)
    category = models.CharField("categoría", max_length=100)

    class Meta:
        ordering = ["date", "pk"]
        verbose_name = "evento"
        verbose_name_plural = "eventos"
        constraints = [
            models.CheckConstraint(condition=models.Q(reserved_seats__lte=models.F("capacity")), name="event_reserved_within_capacity"),
            models.CheckConstraint(condition=models.Q(capacity__gte=1), name="event_capacity_positive"),
        ]

    def clean(self):
        super().clean()
        if self.capacity is not None and self.reserved_seats is not None and self.capacity < self.reserved_seats:
            raise ValidationError({"capacity": "El cupo no puede ser menor que los lugares reservados."})

    def __str__(self):
        return self.title


class EventBooking(models.Model):
    mongo_id = models.CharField(max_length=24, unique=True, null=True, blank=True, editable=False)
    event = models.ForeignKey(Event, on_delete=models.PROTECT, related_name="bookings")
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="event_bookings")
    seats = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(4)])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "reserva de evento"
        verbose_name_plural = "reservas de eventos"


class Product(models.Model):
    mongo_id = models.CharField(max_length=24, unique=True, null=True, blank=True, editable=False)
    name = models.CharField("nombre", max_length=150, unique=True)
    description = models.TextField("descripción")
    price = models.DecimalField("precio", max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products", verbose_name="categoría")
    image_url = models.CharField("ruta de imagen", max_length=500, blank=True)
    available = models.BooleanField("disponible", default=True)
    customization = models.JSONField("opciones", default=dict, blank=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "producto"
        verbose_name_plural = "productos"

    def __str__(self):
        return self.name


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "Pendiente", "Pendiente"
        PREPARING = "En preparación", "En preparación"
        READY = "Listo para entrega", "Listo para entrega"
        DELIVERED = "Entregado", "Entregado"
        CANCELLED = "Cancelado", "Cancelado"

    mongo_id = models.CharField(max_length=24, unique=True, null=True, blank=True, editable=False)
    legacy_data = models.JSONField(default=dict, blank=True, editable=False)
    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="cafe_orders")
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PENDING)
    total = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    order_type = models.CharField(max_length=20, choices=[("Para llevar", "Para llevar"), ("En mesa", "En mesa")], default="Para llevar")

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "pedido"
        verbose_name_plural = "pedidos"

    def __str__(self):
        return f"Pedido {self.pk}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="order_items")
    product_name = models.CharField(max_length=150)
    quantity = models.PositiveSmallIntegerField(validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    selected_size = models.CharField(max_length=150, blank=True)
    selected_milk = models.CharField(max_length=150, blank=True)
    selected_extras = models.JSONField(default=list, blank=True)
    notes = models.CharField(max_length=500, blank=True)

    def __str__(self):
        return f"{self.quantity} × {self.product_name}"


class Reservation(models.Model):
    class Status(models.TextChoices):
        PENDING = "Pendiente", "Pendiente"
        CONFIRMED = "Confirmada", "Confirmada"
        CANCELLED = "Cancelada", "Cancelada"

    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="cafe_reservations")
    date = models.DateField("fecha")
    time = models.TimeField("hora")
    party_size = models.PositiveSmallIntegerField("personas", validators=[MinValueValidator(1)])
    notes = models.TextField("notas", blank=True, max_length=500)
    status = models.CharField("estado", max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["date", "time"]
        verbose_name = "reserva"
        verbose_name_plural = "reservas"

    def __str__(self):
        return f"Reserva {self.pk} — {self.date}"


class GuestReservation(models.Model):
    class Status(models.TextChoices):
        PENDING = "Pendiente", "Pendiente"
        CONFIRMED = "Confirmada", "Confirmada"
        REJECTED = "Rechazada", "Rechazada"

    mongo_id = models.CharField(max_length=24, unique=True, null=True, blank=True, editable=False)
    name = models.CharField("nombre", max_length=100)
    email = models.EmailField("correo", max_length=254)
    phone = models.CharField("teléfono", max_length=30)
    date = models.DateField("fecha")
    time = models.TimeField("hora")
    party_size = models.PositiveSmallIntegerField("personas", validators=[MinValueValidator(1)])
    notes = models.TextField("notas", max_length=500, blank=True)
    status = models.CharField("estado", max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["date", "time"]
        verbose_name = "solicitud de reserva"
        verbose_name_plural = "solicitudes de reserva"

    def __str__(self):
        return f"{self.name} — {self.date}"
