from decimal import Decimal, InvalidOperation

from django.db import transaction

from .models import Order, OrderItem, Product


class OrderValidationError(ValueError):
    pass


def _option_price(product, group, name):
    if not isinstance(product.customization, dict):
        raise OrderValidationError(f"Las opciones de {product.name} no están configuradas correctamente.")
    options = product.customization.get(group, [])
    if not isinstance(options, list):
        raise OrderValidationError(f"Las opciones de {product.name} no están configuradas correctamente.")
    for option in options:
        if isinstance(option, dict) and option.get("name") == name:
            try:
                price = Decimal(str(option.get("extraPrice", 0)))
            except (InvalidOperation, ValueError):
                raise OrderValidationError(f"El precio de una opción de {product.name} no es válido.")
            if not price.is_finite() or price < 0 or price > Decimal("99999999.99") or price.as_tuple().exponent < -2:
                raise OrderValidationError(f"El precio de una opción de {product.name} no es válido.")
            return price
    raise OrderValidationError(f"La opción seleccionada para {product.name} no está disponible.")


@transaction.atomic
def create_cart_order(customer, data):
    items = data.get("orderItems")
    if not isinstance(items, list) or not 1 <= len(items) <= 30:
        raise OrderValidationError("El pedido debe incluir entre 1 y 30 productos.")
    if data.get("stripeTokenId"):
        raise OrderValidationError("El pago con tarjeta todavía no está disponible en Django.")
    order_type = data.get("orderType", "Para llevar")
    if order_type not in ("Para llevar", "En mesa"):
        raise OrderValidationError("La modalidad del pedido no es válida.")

    validated = []
    total = Decimal("0")
    for item in items:
        if not isinstance(item, dict):
            raise OrderValidationError("El formato del producto no es válido.")
        product_id = item.get("product")
        if isinstance(product_id, bool) or not str(product_id).isdigit() or len(str(product_id)) > 18:
            raise OrderValidationError("El identificador del producto no es válido.")
        product = Product.objects.select_for_update().filter(pk=int(product_id), available=True).first()
        if product is None:
            raise OrderValidationError("Uno de los productos no existe o no está disponible.")
        quantity = item.get("qty")
        if isinstance(quantity, bool) or not isinstance(quantity, int) or not 1 <= quantity <= 50:
            raise OrderValidationError("La cantidad de cada producto debe ser de 1 a 50.")
        size = item.get("selectedSize") or ""
        milk = item.get("selectedMilk") or ""
        extras = item.get("selectedExtras", [])
        notes = item.get("notes") or ""
        if not isinstance(size, str) or not isinstance(milk, str) or len(size) > 150 or len(milk) > 150:
            raise OrderValidationError("El tamaño o tipo de leche no es válido.")
        if not isinstance(notes, str) or len(notes) > 500:
            raise OrderValidationError("Las notas deben tener como máximo 500 caracteres.")
        if not isinstance(extras, list) or len(extras) > 30 or any(not isinstance(x, str) or len(x) > 150 for x in extras):
            raise OrderValidationError("El formato de los extras no es válido.")
        if len(set(extras)) != len(extras):
            raise OrderValidationError("No se permiten extras duplicados.")
        unit_price = product.price
        if size:
            unit_price += _option_price(product, "sizes", size)
        if milk:
            unit_price += _option_price(product, "milkOptions", milk)
        for extra in extras:
            unit_price += _option_price(product, "extras", extra)
        if unit_price > Decimal("99999999.99"):
            raise OrderValidationError("El precio del producto supera el importe permitido.")
        total += unit_price * quantity
        if total > Decimal("9999999999.99"):
            raise OrderValidationError("El total supera el importe permitido.")
        validated.append(OrderItem(
            product=product, product_name=product.name, quantity=quantity, unit_price=unit_price,
            selected_size=size, selected_milk=milk, selected_extras=extras, notes=notes,
        ))

    order = Order.objects.create(customer=customer, total=total, order_type=order_type)
    for item in validated:
        item.order = order
    OrderItem.objects.bulk_create(validated)
    return order
