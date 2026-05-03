#!/usr/bin/env bash
set -euo pipefail

# Let's Encrypt certificate setup for PNW Mushroom Dashboard
# Usage: ./scripts/setup-letsencrypt.sh yourdomain.com [your@email.com]

DOMAIN="${1:-}"
EMAIL="${2:-}"

if [ -z "$DOMAIN" ]; then
  echo "Usage: $0 <domain> [email]"
  echo "Example: $0 mushrooms.example.com admin@example.com"
  exit 1
fi

if [ -z "$EMAIL" ]; then
  EMAIL="admin@${DOMAIN}"
fi

echo "=== PNW Mushroom Dashboard - Let's Encrypt Setup ==="
echo "Domain: ${DOMAIN}"
echo "Email: ${EMAIL}"
echo ""

if ! command -v certbot &> /dev/null; then
  echo "Installing certbot..."
  if command -v apt-get &> /dev/null; then
    sudo apt-get update && sudo apt-get install -y certbot
  elif command -v dnf &> /dev/null; then
    sudo dnf install -y certbot
  elif command -v snap &> /dev/null; then
    sudo snap install --classic certbot
    sudo ln -sf /snap/bin/certbot /usr/bin/certbot
  else
    echo "ERROR: Cannot install certbot. Please install manually."
    exit 1
  fi
fi

echo "Obtaining certificate for ${DOMAIN}..."
sudo certbot certonly \
  --standalone \
  --non-interactive \
  --agree-tos \
  --email "${EMAIL}" \
  -d "${DOMAIN}" \
  --preferred-challenges http

echo ""
echo "Certificate obtained successfully!"
echo ""
echo "To use with the dashboard, set this environment variable:"
echo "  export DOMAIN=${DOMAIN}"
echo ""
echo "Auto-renewal is configured via certbot's systemd timer."
echo "Test renewal with: sudo certbot renew --dry-run"
echo ""
echo "Start the dashboard with:"
echo "  DOMAIN=${DOMAIN} npm run dev:server"
