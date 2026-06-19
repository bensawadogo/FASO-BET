"""
FasoBet — CinetPay payment views (Burkina Faso)
Routes:
  GET  /api/subscriptions/plans/   → liste des plans
  POST /api/payments/initiate/      → créer session paiement CinetPay
  POST /api/payments/callback/      → webhook CinetPay
"""

import os
import uuid
import requests
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

CINETPAY_BASE    = os.getenv("CINETPAY_BASE_URL", "https://api-checkout.cinetpay.com/v2")
CINETPAY_API_KEY = os.getenv("CINETPAY_API_KEY", "")
CINETPAY_SITE_ID = os.getenv("CINETPAY_SITE_ID", "")

PLANS = {
    "free":    {"id": "free",    "name": "Gratuit",  "price_xof": 0,     "predictions": 2},
    "premium": {"id": "premium", "name": "Premium",  "price_xof": 2000,  "predictions": 999},
    "pro":     {"id": "pro",     "name": "Pro",      "price_xof": 5000,  "predictions": 999},
}


@api_view(["GET"])
@permission_classes([AllowAny])
def list_plans(request):
    """GET /api/subscriptions/plans/ — Liste des plans disponibles."""
    return Response([v for v in PLANS.values()])


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def initiate_payment(request):
    """POST /api/payments/initiate/ — Créer une session de paiement CinetPay."""
    plan_id = request.data.get("plan_id", "premium")
    plan    = PLANS.get(plan_id)

    if not plan:
        return Response(
            {"error": "Plan invalide. Choisir: free, premium, pro"},
            status=status.HTTP_400_BAD_REQUEST
        )
    if plan["price_xof"] == 0:
        return Response(
            {"error": "Le plan gratuit ne nécessite pas de paiement"},
            status=status.HTTP_400_BAD_REQUEST
        )

    transaction_id = f"FB-{uuid.uuid4().hex[:12].upper()}"
    user = request.user

    payload = {
        "apikey":         CINETPAY_API_KEY,
        "site_id":        CINETPAY_SITE_ID,
        "transaction_id": transaction_id,
        "amount":         plan["price_xof"],
        "currency":       "XOF",
        "description":    f"FasoBet {plan['name']} — 1 mois",
        "return_url":     os.getenv("CINETPAY_RETURN_URL", ""),
        "notify_url":     os.getenv("CINETPAY_NOTIFY_URL", ""),
        "customer_name":  user.get_full_name() or user.username,
        "customer_email": user.email or "",
        "channels":       "ALL",
        "lang":           "fr",
        "metadata":       f"{user.id}|{plan_id}",
    }

    try:
        r = requests.post(
            f"{CINETPAY_BASE}/payment",
            json=payload,
            timeout=15,
        )
        data = r.json()

        if data.get("code") == "201":
            return Response({
                "payment_url":    data["data"]["payment_url"],
                "transaction_id": transaction_id,
                "amount":         plan["price_xof"],
                "plan":           plan["name"],
            })

        return Response(
            {"error": data.get("message", "Erreur CinetPay — vérifiez vos clés API")},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    except requests.RequestException as e:
        return Response(
            {"error": f"Impossible de contacter CinetPay: {str(e)}"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def payment_callback(request):
    """POST /api/payments/callback/ — Webhook appelé par CinetPay après paiement."""
    transaction_id = request.data.get("cpm_trans_id", "")
    status_code    = request.data.get("cpm_result", "")
    metadata       = request.data.get("cpm_custom", "")

    if status_code == "00" and metadata:
        try:
            user_id, plan_id = metadata.split("|")
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user = User.objects.get(id=int(user_id))

            if hasattr(user, 'profile'):
                profile = user.profile
                profile.subscription_plan = plan_id
                profile.save()
        except Exception:
            pass  # On logue côté CinetPay, pas critique

    return Response({"status": "received"})
