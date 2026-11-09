from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import get_user_model
from django.utils import timezone

from .models import GuestReservation, Order, Product, Reservation, StaffApplication


class ProductForm(forms.ModelForm):
    class Meta:
        model = Product
        fields = ["name", "description", "price", "category", "image_url", "available"]


class RegisterForm(UserCreationForm):
    email = forms.EmailField(label="Correo electrónico")

    class Meta(UserCreationForm.Meta):
        model = get_user_model()
        fields = ["username", "email"]

    def clean_email(self):
        email = self.cleaned_data["email"].strip().lower()
        if get_user_model().objects.filter(email__iexact=email).exists():
            raise forms.ValidationError("Este correo ya está registrado.")
        return email


class CustomerProfileForm(forms.Form):
    name = forms.CharField(label="Nombre", max_length=150)
    phone = forms.CharField(label="Teléfono", max_length=30, required=False)


class StaffApplicationForm(forms.ModelForm):
    name = forms.CharField(label="Nombre", min_length=2, max_length=100)
    is_recent_graduate = forms.TypedChoiceField(
        choices=[("true", "Sí"), ("false", "No")], coerce=lambda value: value == "true",
    )
    public_profile_consent = forms.TypedChoiceField(
        choices=[("true", "Sí"), ("false", "No")], coerce=lambda value: value == "true",
    )

    class Meta:
        model = StaffApplication
        fields = ["name", "email", "phone", "requested_position", "experience_years",
                  "is_recent_graduate", "public_profile_consent", "profile_bio"]

    def clean_email(self):
        return self.cleaned_data["email"].strip().lower()


class OrderForm(forms.Form):
    product = forms.ModelChoiceField(label="Producto", queryset=Product.objects.none())
    quantity = forms.IntegerField(label="Cantidad", min_value=1, max_value=50, initial=1)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["product"].queryset = Product.objects.filter(available=True)


class ReservationForm(forms.ModelForm):
    class Meta:
        model = Reservation
        fields = ["date", "time", "party_size", "notes"]
        widgets = {
            "date": forms.DateInput(attrs={"type": "date"}),
            "time": forms.TimeInput(attrs={"type": "time"}),
            "notes": forms.Textarea(attrs={"rows": 3}),
        }

    def clean_date(self):
        date = self.cleaned_data["date"]
        if date < timezone.localdate():
            raise forms.ValidationError("Elige una fecha de hoy o posterior.")
        return date

    def clean_party_size(self):
        size = self.cleaned_data["party_size"]
        if size > 20:
            raise forms.ValidationError("Para grupos de más de 20 personas, contacta con la cafetería.")
        return size


class GuestReservationForm(forms.ModelForm):
    class Meta:
        model = GuestReservation
        fields = ["name", "email", "phone", "date", "time", "party_size", "notes"]

    def clean_email(self):
        return self.cleaned_data["email"].strip().lower()

    def clean_date(self):
        date = self.cleaned_data["date"]
        if date <= timezone.localdate():
            raise forms.ValidationError("Elige una fecha posterior a hoy.")
        return date

    def clean_party_size(self):
        size = self.cleaned_data["party_size"]
        if size > 12:
            raise forms.ValidationError("El grupo debe ser de 1 a 12 personas.")
        return size


class OrderStatusForm(forms.ModelForm):
    class Meta:
        model = Order
        fields = ["status"]


class GuestReservationStatusForm(forms.ModelForm):
    class Meta:
        model = GuestReservation
        fields = ["status"]


class ReservationStatusForm(forms.ModelForm):
    class Meta:
        model = Reservation
        fields = ["status"]
