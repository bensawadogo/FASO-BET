"""
FasoBet — Email utilities (welcome, password reset).
Uses Django's built-in email system.
Dev: prints to console. Prod: SMTP via env vars.
"""

from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger("fasobet.email")


def send_welcome_email(user_email: str, username: str):
    """Envoyer l'email de bienvenue après inscription."""
    try:
        send_mail(
            subject="Bienvenue sur FasoBet 🏆",
            message=f"""
Bonjour {username},

Bienvenue sur FasoBet — vos prédictions sportives IA.

Votre compte est actif. Connectez-vous pour voir
les prédictions du jour.

L'équipe FasoBet
            """.strip(),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user_email],
            fail_silently=True,
        )
        logger.info(f"Welcome email sent to {user_email}")
    except Exception as e:
        logger.error(f"Welcome email failed: {e}")


def send_password_reset_email(user_email: str, reset_link: str):
    """Envoyer l'email de réinitialisation du mot de passe."""
    try:
        send_mail(
            subject="Réinitialisation de votre mot de passe FasoBet",
            message=f"""
Vous avez demandé la réinitialisation de votre mot de passe.

Cliquez sur ce lien (valable 24h) :
{reset_link}

Si vous n'avez pas fait cette demande, ignorez cet email.

L'équipe FasoBet
            """.strip(),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user_email],
            fail_silently=True,
        )
        logger.info(f"Reset email sent to {user_email}")
    except Exception as e:
        logger.error(f"Reset email failed: {e}")
