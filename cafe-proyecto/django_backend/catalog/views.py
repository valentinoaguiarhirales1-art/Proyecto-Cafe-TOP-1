import hashlib
import json
import secrets
from datetime import timedelta

from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from django.db import IntegrityError, transaction
from django.db.models import F
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET, require_POST, require_http_methods

from .forms import (
    CustomerProfileForm, GuestReservationForm, GuestReservationStatusForm, OrderForm, OrderStatusForm,
    ProductForm, RegisterForm, ReservationForm, ReservationStatusForm, StaffApplicationForm,
)
from .models import CustomerProfile, Event, EventBooking, GuestReservation, Order, OrderItem, Product, Promotion, Reservation, SiteSetting, StaffApplication, TeamProfile
from .orders import OrderValidationError, create_cart_order


def _session_data(request):
    user = request.user
    return {
        "csrfToken": get_token(request),
        "user": {"id": user.pk, "name": user.username, "email": user.email, "isStaff": user.is_staff} if user.is_authenticated else None,
    }


def _session_changed(request):
    expected_user = request.headers.get("X-Expected-Django-User")
    return expected_user is not None and (
        not request.user.is_authenticated or str(request.user.pk) != expected_user
    )


@require_GET
def session_api(request):
    response = JsonResponse(_session_data(request))
    response["Cache-Control"] = "no-store"
    return response


@require_POST
def login_api(request):
    username = request.POST.get("username", "")
    email = request.POST.get("email", "").strip()
    if email:
        matches = list(get_user_model().objects.filter(email__iexact=email).values_list("username", flat=True)[:2])
        username = matches[0] if len(matches) == 1 else ""
    user = authenticate(request, username=username, password=request.POST.get("password", ""))
    if user is None:
        return JsonResponse({"error": "Usuario o contraseña incorrectos."}, status=401)
    login(request, user)
    return JsonResponse(_session_data(request))


@require_POST
def register_api(request):
    form = RegisterForm(request.POST)
    if not form.is_valid():
        return JsonResponse({"error": "Revisa los datos de la cuenta.", "fields": form.errors}, status=400)
    user = form.save()
    login(request, user)
    return JsonResponse(_session_data(request), status=201)


@require_POST
def logout_api(request):
    if _session_changed(request):
        return JsonResponse({"error": "La sesión cambió en otra pestaña. Recarga la página."}, status=409)
    logout(request)
    return JsonResponse(_session_data(request))


@require_http_methods(["GET", "POST"])
def profile_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Inicia sesión para consultar tu perfil."}, status=401)
    if _session_changed(request):
        return JsonResponse({"error": "La sesión cambió en otra pestaña. Recarga la página."}, status=409)
    if request.method == "POST":
        form = CustomerProfileForm(request.POST)
        if not form.is_valid():
            return JsonResponse({"error": "Revisa los datos del perfil.", "fields": form.errors}, status=400)
        with transaction.atomic():
            request.user.first_name = form.cleaned_data["name"]
            request.user.save(update_fields=["first_name"])
            CustomerProfile.objects.update_or_create(
                user=request.user, defaults={"phone": form.cleaned_data["phone"]},
            )
    phone = CustomerProfile.objects.filter(user=request.user).values_list("phone", flat=True).first() or ""
    response = JsonResponse({
        "username": request.user.username, "name": request.user.first_name,
        "email": request.user.email, "phone": phone,
    })
    response["Cache-Control"] = "no-store"
    return response


@require_GET
def products_api(request):
    products = Product.objects.select_related("category").filter(available=True)
    return JsonResponse([
        {
            "id": product.pk,
            "name": product.name,
            "description": product.description,
            "price": str(product.price),
            "category": product.category.name,
            "imageUrl": product.image_url,
            "customization": product.customization,
        }
        for product in products
    ], safe=False)


@require_GET
def site_settings_api(request):
    return JsonResponse(dict(SiteSetting.objects.values_list("key", "value")))


@require_GET
def team_api(request):
    profiles = TeamProfile.objects.filter(public_profile=True, public_profile_consent=True, user__is_active=True)
    response = JsonResponse([{
        "id": profile.pk,
        "name": profile.name,
        "role": profile.role,
        "experienceYears": profile.experience_years,
        "isRecentGraduate": profile.is_recent_graduate,
        "bio": profile.bio,
    } for profile in profiles], safe=False)
    response["Cache-Control"] = "no-store"
    return response


@require_POST
def staff_application_api(request):
    form = StaffApplicationForm(request.POST)
    if not form.is_valid():
        return JsonResponse({"error": "Revisa los datos de la solicitud.", "fields": form.errors}, status=400)
    form.save()
    return JsonResponse({"message": "Solicitud recibida. El equipo revisará tu información."}, status=201)


@never_cache
@require_POST
def accept_staff_invitation_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Inicia sesión con la cuenta del correo aprobado."}, status=401)
    if _session_changed(request):
        return JsonResponse({"error": "La sesión cambió en otra pestaña. Recarga la página."}, status=409)
    code = request.POST.get("invitation", "").strip()
    if len(code) != 64 or any(char not in "0123456789abcdef" for char in code):
        return JsonResponse({"error": "El código no es válido o ha vencido."}, status=400)
    digest = hashlib.sha256(code.encode("ascii")).hexdigest()
    try:
        with transaction.atomic():
            application = StaffApplication.objects.select_for_update().filter(
                invitation_hash=digest, status=StaffApplication.Status.APPROVED,
                invitation_expires_at__gt=timezone.now(),
            ).first()
            if application is None or application.email.casefold() != request.user.email.strip().casefold():
                return JsonResponse({"error": "El código no es válido, ha vencido o pertenece a otro correo."}, status=400)
            if get_user_model().objects.filter(email__iexact=application.email).count() != 1:
                return JsonResponse({"error": "No se puede verificar la cuenta; contacta al personal."}, status=409)
            if TeamProfile.objects.filter(user=request.user).exists():
                return JsonResponse({"error": "Esta cuenta ya tiene un perfil de equipo; contacta al personal."}, status=409)
            TeamProfile.objects.create(
                user=request.user, name=application.name, role=application.requested_position,
                experience_years=application.experience_years, is_recent_graduate=application.is_recent_graduate,
                bio=application.profile_bio, public_profile=False, public_profile_consent=False,
            )
            application.status = StaffApplication.Status.ACCEPTED
            application.accepted_user = request.user
            application.invitation_hash = ""
            application.invitation_expires_at = None
            application.save(update_fields=["status", "accepted_user", "invitation_hash", "invitation_expires_at"])
    except IntegrityError:
        return JsonResponse({"error": "No se pudo activar el perfil. Revisa si ya existe y contacta al personal."}, status=409)
    return JsonResponse({"message": "Invitación aceptada. El perfil queda privado y no se conceden permisos automáticamente."})


@require_POST
@staff_member_required
def issue_staff_invitation(request, pk):
    if not request.user.has_perm("catalog.change_staffapplication"):
        raise PermissionDenied
    with transaction.atomic():
        application = get_object_or_404(StaffApplication.objects.select_for_update(), pk=pk)
        if application.status not in (StaffApplication.Status.PENDING, StaffApplication.Status.REVIEWED, StaffApplication.Status.APPROVED):
            return render(request, "catalog/status_error.html", {"message": "Esta solicitud no admite una invitación."}, status=409)
        code = secrets.token_hex(32)
        application.invitation_hash = hashlib.sha256(code.encode("ascii")).hexdigest()
        application.invitation_expires_at = timezone.now() + timedelta(days=7)
        application.status = StaffApplication.Status.APPROVED
        application.save(update_fields=["status", "invitation_hash", "invitation_expires_at"])
    response = render(request, "catalog/staff_invitation.html", {"code": code, "application": application})
    response["Cache-Control"] = "no-store"
    response["Referrer-Policy"] = "no-referrer"
    return response


@require_POST
@staff_member_required
def reject_staff_application(request, pk):
    if not request.user.has_perm("catalog.change_staffapplication"):
        raise PermissionDenied
    with transaction.atomic():
        application = get_object_or_404(StaffApplication.objects.select_for_update(), pk=pk)
        if application.status == StaffApplication.Status.ACCEPTED:
            return render(request, "catalog/status_error.html", {"message": "La invitación ya fue aceptada."}, status=409)
        application.status = StaffApplication.Status.REJECTED
        application.invitation_hash = ""
        application.invitation_expires_at = None
        application.save(update_fields=["status", "invitation_hash", "invitation_expires_at"])
    return redirect("staff-dashboard")


@require_GET
def promotions_api(request):
    return JsonResponse([{
        "_id": f"django-promotion-{promotion.pk}",
        "title": promotion.title,
        "description": promotion.description,
        "originalPrice": str(promotion.original_price),
        "comboPrice": str(promotion.combo_price),
        "imageUrl": promotion.image_url,
        "badge": promotion.badge,
        "itemsIncluded": promotion.items_included,
    } for promotion in Promotion.objects.filter(active=True)], safe=False)


@require_GET
def events_api(request):
    return JsonResponse([{
        "_id": str(event.pk), "title": event.title, "description": event.description,
        "date": event.date.isoformat(), "time": event.time_label, "location": event.location,
        "capacity": event.capacity, "availableSeats": event.capacity - event.reserved_seats,
        "price": str(event.price), "imageUrl": event.image_url, "category": event.category,
    } for event in Event.objects.filter(date__gte=timezone.now())], safe=False)


@require_POST
def book_event_api(request, pk):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Inicia sesión para reservar un evento."}, status=401)
    if _session_changed(request):
        return JsonResponse({"error": "La sesión cambió en otra pestaña. Recarga la página."}, status=409)
    if request.content_type != "application/json":
        return JsonResponse({"error": "Se esperaba una solicitud JSON."}, status=415)
    try:
        data = json.loads(request.body)
    except (UnicodeDecodeError, json.JSONDecodeError):
        return JsonResponse({"error": "El contenido JSON no es válido."}, status=400)
    seats = data.get("seats") if isinstance(data, dict) else None
    if isinstance(seats, bool) or not isinstance(seats, int) or not 1 <= seats <= 4:
        return JsonResponse({"error": "Elige entre 1 y 4 lugares."}, status=400)
    with transaction.atomic():
        updated = Event.objects.filter(
            pk=pk, date__gte=timezone.now(), reserved_seats__lte=F("capacity") - seats,
        ).update(reserved_seats=F("reserved_seats") + seats)
        if not updated:
            if not Event.objects.filter(pk=pk).exists():
                return JsonResponse({"error": "Evento no encontrado."}, status=404)
            return JsonResponse({"error": "El evento ya pasó o no quedan suficientes lugares. Actualiza la lista."}, status=400)
        event = Event.objects.get(pk=pk)
        EventBooking.objects.create(event=event, customer=request.user, seats=seats)
    return JsonResponse({"message": f"Reserva registrada para {event.title}: {seats} lugares. No se ha realizado ningún cobro."}, status=201)


@require_GET
def my_event_bookings_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Inicia sesión para consultar tus reservas de eventos."}, status=401)
    if _session_changed(request):
        return JsonResponse({"error": "La sesión cambió en otra pestaña. Recarga la página."}, status=409)
    bookings = EventBooking.objects.filter(customer=request.user).select_related("event").order_by("-created_at", "-pk")
    response = JsonResponse([{
        "id": booking.pk, "event": booking.event.title, "date": booking.event.date.isoformat(),
        "time": booking.event.time_label, "location": booking.event.location,
        "seats": booking.seats, "createdAt": booking.created_at.isoformat(),
    } for booking in bookings], safe=False)
    response["Cache-Control"] = "no-store"
    return response


@require_POST
def create_order_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Inicia sesión para crear un pedido."}, status=401)
    if _session_changed(request):
        return JsonResponse({"error": "La sesión cambió en otra pestaña. Recarga la página."}, status=409)
    if request.content_type != "application/json":
        return JsonResponse({"error": "Se esperaba una solicitud JSON."}, status=415)
    try:
        data = json.loads(request.body)
    except (UnicodeDecodeError, json.JSONDecodeError):
        return JsonResponse({"error": "El contenido JSON no es válido."}, status=400)
    if not isinstance(data, dict):
        return JsonResponse({"error": "El pedido debe ser un objeto JSON."}, status=400)
    try:
        order = create_cart_order(request.user, data)
    except OrderValidationError as exc:
        return JsonResponse({"error": str(exc)}, status=400)
    return JsonResponse({
        "_id": str(order.pk), "totalPrice": str(order.total), "status": order.status,
        "orderType": order.order_type, "isPaid": False,
    }, status=201)


@require_GET
def my_orders_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Inicia sesión para consultar tus pedidos."}, status=401)
    if _session_changed(request):
        return JsonResponse({"error": "La sesión cambió en otra pestaña. Recarga la página."}, status=409)
    orders = Order.objects.filter(customer=request.user).prefetch_related("items")
    response = JsonResponse([{
        "id": order.pk,
        "status": order.status,
        "total": str(order.total),
        "orderType": order.order_type,
        "createdAt": order.created_at.isoformat(),
        "legacyPayment": {"isPaid": order.legacy_data["isPaid"], "branch": order.legacy_data["branch"]}
        if order.mongo_id and "isPaid" in order.legacy_data and "branch" in order.legacy_data else None,
        "items": [{
            "name": item.product_name,
            "quantity": item.quantity,
            "unitPrice": str(item.unit_price),
            "selectedSize": item.selected_size,
            "selectedMilk": item.selected_milk,
            "selectedExtras": item.selected_extras,
            "notes": item.notes,
        } for item in order.items.all()],
    } for order in orders], safe=False)
    response["Cache-Control"] = "no-store"
    return response


def _reservation_data(reservation):
    return {
        "id": reservation.pk,
        "date": reservation.date.isoformat(),
        "time": reservation.time.strftime("%H:%M"),
        "partySize": reservation.party_size,
        "notes": reservation.notes,
        "status": reservation.status,
    }


@require_GET
def my_reservations_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Inicia sesión para consultar tus reservas."}, status=401)
    if _session_changed(request):
        return JsonResponse({"error": "La sesión cambió en otra pestaña. Recarga la página."}, status=409)
    reservations = Reservation.objects.filter(customer=request.user)
    response = JsonResponse([_reservation_data(reservation) for reservation in reservations], safe=False)
    response["Cache-Control"] = "no-store"
    return response


@require_POST
def create_reservation_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Inicia sesión para solicitar una reserva."}, status=401)
    if _session_changed(request):
        return JsonResponse({"error": "La sesión cambió en otra pestaña. Recarga la página."}, status=409)
    form = ReservationForm(request.POST)
    if not form.is_valid():
        return JsonResponse({"error": "Revisa los datos de la reserva.", "fields": form.errors}, status=400)
    reservation = form.save(commit=False)
    reservation.customer = request.user
    reservation.save()
    return JsonResponse(_reservation_data(reservation), status=201)


@require_POST
def create_guest_reservation_api(request):
    form = GuestReservationForm(request.POST)
    if not form.is_valid():
        return JsonResponse({"error": "Revisa los datos de la reserva.", "fields": form.errors}, status=400)
    form.save()
    return JsonResponse({"message": "Recibimos tu solicitud. El equipo confirmará la disponibilidad."}, status=201)


def product_list(request):
    return render(request, "catalog/product_list.html", {
        "products": Product.objects.select_related("category").filter(available=True),
    })


@staff_member_required
def product_edit(request, pk):
    if not request.user.has_perm("catalog.change_product"):
        raise PermissionDenied
    product = get_object_or_404(Product, pk=pk)
    form = ProductForm(request.POST if request.method == "POST" else None, instance=product)
    if request.method == "POST" and form.is_valid():
        form.save()
        return redirect("product-list")
    return render(request, "catalog/product_form.html", {"form": form, "product": product})


@staff_member_required
def staff_dashboard(request):
    user = request.user
    can_view_orders = user.has_perm("catalog.view_order") or user.has_perm("catalog.change_order")
    can_view_reservations = user.has_perm("catalog.view_guestreservation") or user.has_perm("catalog.change_guestreservation")
    can_view_account_reservations = user.has_perm("catalog.view_reservation") or user.has_perm("catalog.change_reservation")
    can_view_products = user.has_perm("catalog.view_product") or user.has_perm("catalog.change_product")
    can_view_applications = user.has_perm("catalog.view_staffapplication") or user.has_perm("catalog.change_staffapplication")
    response = render(request, "catalog/staff_dashboard.html", {
        "orders": Order.objects.select_related("customer").prefetch_related("items") if can_view_orders else None,
        "reservations": GuestReservation.objects.all() if can_view_reservations else None,
        "account_reservations": Reservation.objects.select_related("customer") if can_view_account_reservations else None,
        "products": Product.objects.select_related("category") if can_view_products else None,
        "applications": StaffApplication.objects.all() if can_view_applications else None,
        "order_statuses": Order.Status.choices,
        "reservation_statuses": GuestReservation.Status.choices,
        "account_reservation_statuses": Reservation.Status.choices,
    })
    response["Cache-Control"] = "no-store"
    return response


@require_POST
@staff_member_required
def staff_order_status(request, pk):
    if not request.user.has_perm("catalog.change_order"):
        raise PermissionDenied
    order = get_object_or_404(Order, pk=pk)
    form = OrderStatusForm(request.POST, instance=order)
    if not form.is_valid():
        return render(request, "catalog/status_error.html", {"form": form}, status=400)
    form.save()
    return redirect("staff-dashboard")


@require_POST
@staff_member_required
def staff_guest_reservation_status(request, pk):
    if not request.user.has_perm("catalog.change_guestreservation"):
        raise PermissionDenied
    reservation = get_object_or_404(GuestReservation, pk=pk)
    form = GuestReservationStatusForm(request.POST, instance=reservation)
    if not form.is_valid():
        return render(request, "catalog/status_error.html", {"form": form}, status=400)
    form.save()
    return redirect("staff-dashboard")


@require_POST
@staff_member_required
def staff_reservation_status(request, pk):
    if not request.user.has_perm("catalog.change_reservation"):
        raise PermissionDenied
    reservation = get_object_or_404(Reservation, pk=pk)
    form = ReservationStatusForm(request.POST, instance=reservation)
    if not form.is_valid():
        return render(request, "catalog/status_error.html", {"form": form}, status=400)
    form.save()
    return redirect("staff-dashboard")


def register(request):
    form = RegisterForm(request.POST if request.method == "POST" else None)
    if request.method == "POST" and form.is_valid():
        user = form.save()
        login(request, user)
        return redirect("product-list")
    return render(request, "catalog/form.html", {"form": form, "title": "Crear cuenta"})


@login_required
def create_order(request):
    form = OrderForm(request.POST if request.method == "POST" else None)
    if request.method == "POST" and form.is_valid():
        with transaction.atomic():
            product = get_object_or_404(
                Product.objects.select_for_update(), pk=form.cleaned_data["product"].pk, available=True
            )
            quantity = form.cleaned_data["quantity"]
            order = Order.objects.create(customer=request.user, total=product.price * quantity)
            OrderItem.objects.create(
                order=order, product=product, product_name=product.name,
                quantity=quantity, unit_price=product.price,
            )
        return redirect("my-orders")
    return render(request, "catalog/form.html", {"form": form, "title": "Nuevo pedido"})


@login_required
def my_orders(request):
    return render(request, "catalog/my_orders.html", {
        "orders": Order.objects.filter(customer=request.user).prefetch_related("items"),
    })


@login_required
def create_reservation(request):
    form = ReservationForm(request.POST if request.method == "POST" else None)
    if request.method == "POST" and form.is_valid():
        reservation = form.save(commit=False)
        reservation.customer = request.user
        reservation.save()
        return redirect("my-reservations")
    return render(request, "catalog/form.html", {"form": form, "title": "Solicitar reserva"})


@login_required
def my_reservations(request):
    return render(request, "catalog/my_reservations.html", {
        "reservations": Reservation.objects.filter(customer=request.user),
    })
