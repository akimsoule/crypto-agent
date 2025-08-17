#!/bin/bash

# Script de test pour les nouveaux endpoints newsletter

echo "🧪 Test des endpoints newsletter..."

# Test de l'endpoint unsubscribe (GET)
echo "📄 Test de la page de désabonnement..."
curl -X GET "http://localhost:8888/api/unsubscribe?email=test@example.com" \
  -H "Accept: text/html" \
  -w "Status: %{http_code}\n" \
  -s -o /dev/null

# Test de l'endpoint preferences (GET)
echo "📄 Test de la page de préférences..."
curl -X GET "http://localhost:8888/api/preferences?email=test@example.com" \
  -H "Accept: text/html" \
  -w "Status: %{http_code}\n" \
  -s -o /dev/null

echo "✅ Tests terminés. Vérifiez les codes de statut ci-dessus."
echo "   200 = OK"
echo "   404 = Endpoint non trouvé"
echo "   500 = Erreur serveur"
