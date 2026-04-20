from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from .models import Prediction


class PredictionForm(forms.ModelForm):
    class Meta:
        model = Prediction
        fields = ['predicted_outcome', 'confidence']
        widgets = {
            'predicted_outcome': forms.RadioSelect(),
            'confidence': forms.NumberInput(attrs={
                'type': 'range',
                'min': 10,
                'max': 100,
                'step': 5,
                'class': 'confidence-slider',
            }),
        }


class RegisterForm(UserCreationForm):
    email = forms.EmailField(
        required=True,
        widget=forms.EmailInput(attrs={'placeholder': 'Email'}),
    )

    class Meta:
        model = User
        fields = ('username', 'email', 'password1', 'password2')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['username'].widget.attrs['placeholder'] = "Nom d'utilisateur"
        self.fields['password1'].widget.attrs['placeholder'] = 'Mot de passe'
        self.fields['password2'].widget.attrs['placeholder'] = 'Confirmer le mot de passe'
