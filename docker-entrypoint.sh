#!/bin/sh
set -e

echo "⏳ Attente de PostgreSQL..."
until PGPASSWORD=$DJANGO_DB_PASSWORD psql -h "$DJANGO_DB_HOST" -U "$DJANGO_DB_USER" -d "$DJANGO_DB_NAME" -c '\q' 2>/dev/null; do
  sleep 1
done
echo "✅ PostgreSQL prêt"

echo "📦 Migrations..."
python manage.py migrate --noinput

echo "🚀 Django prêt sur :8000"
exec python manage.py runserver 0.0.0.0:8000
