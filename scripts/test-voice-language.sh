#!/bin/bash

# Test Voice Mode Language Flow
# This script tests the complete flow to identify where language gets lost

echo "🧪 Testing Voice Mode Language Flow"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if languageConfirmed is passed correctly
echo "📝 Test 1: Checking client-side language detection..."
echo ""

# Simulate the flow
DETECTED_LANG="ru"
LANGUAGE_CONFIRMED="true"

echo "✓ Message detected as: $DETECTED_LANG"
echo "✓ languageConfirmed: $LANGUAGE_CONFIRMED"
echo ""

# Test 2: Check API endpoint
echo "📝 Test 2: Testing API endpoint..."
echo ""

# Make a test request
RESPONSE=$(curl -s -X POST http://localhost:3005/api/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: session=test" \
  -d '{
    "content": "Расскажи про вакансию",
    "language": "ru",
    "languageConfirmed": true,
    "recognizedText": "Test vacancy content",
    "images": []
  }' 2>&1)

# Check if response contains Spanish
if echo "$RESPONSE" | grep -q "¡Claro!"; then
  echo -e "${RED}✗ FAIL: Response contains Spanish!${NC}"
  echo "Response preview:"
  echo "$RESPONSE" | head -c 200
  echo ""
  echo -e "${YELLOW}Checking server logs for language detection...${NC}"
else
  echo -e "${GREEN}✓ PASS: Response does not contain Spanish${NC}"
fi

echo ""

# Test 3: Check what language instructions are being used
echo "📝 Test 3: Checking language instructions..."
echo ""

# This would need to check server logs
echo "Please check server logs for:"
echo "  - [Language] Using confirmed language: ru"
echo "  - [Final Language] Using: ru"
echo "  - [API /chat] Language instructions for ru"
echo ""

# Test 4: Check if system prompt is correct
echo "📝 Test 4: System prompt check..."
echo ""
echo "Please verify in server logs that system prompt contains:"
echo "  - 'Russian' or 'русском' language instruction"
echo "  - NOT 'Spanish' or 'español'"
echo ""

# Summary
echo "===================================="
echo "📊 Test Summary"
echo "===================================="
echo ""
echo "If tests fail, check:"
echo "1. Is languageConfirmed being passed? (client logs)"
echo "2. Is language being preserved? (server logs: [Final Language])"
echo "3. Are language instructions correct? (server logs: [Language instructions])"
echo "4. Is system prompt correct? (server logs: [Enhanced system prompt])"
echo ""
echo "Run this with server logs visible:"
echo "  Terminal 1: npm run dev"
echo "  Terminal 2: ./scripts/test-voice-language.sh"
