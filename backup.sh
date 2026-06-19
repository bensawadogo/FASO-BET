#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR
echo "📦 Creating FasoBet backup: fasobet_$DATE.tar.gz"
tar -czf $BACKUP_DIR/fasobet_$DATE.tar.gz \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=__pycache__ \
  --exclude=.env \
  --exclude=backups \
  .
echo "✅ Backup saved: $BACKUP_DIR/fasobet_$DATE.tar.gz"
echo "📊 Size: $(du -sh $BACKUP_DIR/fasobet_$DATE.tar.gz | cut -f1)"