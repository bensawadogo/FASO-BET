"""ASGI config for sportpred project."""
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sportpred.settings')
application = get_asgi_application()
