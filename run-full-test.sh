#!/bin/bash

# Full Translation Test Workflow
# This script runs the complete test and analysis workflow

set -e  # Exit on error

echo "=================================================="
echo "🧪 POI Translation Quality Test Suite"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if server is running
echo -e "${BLUE}📡 Checking if server is running on port 3002...${NC}"
if curl -s http://localhost:3002/api/translation-sources > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Server is running${NC}"
else
    echo -e "${RED}✗ Server is not running${NC}"
    echo ""
    echo "Please start the server in another terminal:"
    echo "  cd /Users/ryan.huang/Documents/klook/poi-translation-portal-new"
    echo "  npm run build"
    echo "  PORT=3002 npm run start"
    echo ""
    exit 1
fi

echo ""

# Check if test script exists and is executable
if [ ! -f "test-translations.sh" ]; then
    echo -e "${RED}✗ test-translations.sh not found${NC}"
    exit 1
fi

if [ ! -x "test-translations.sh" ]; then
    echo -e "${YELLOW}⚠ Making test-translations.sh executable...${NC}"
    chmod +x test-translations.sh
fi

# Run the translation test
echo -e "${BLUE}🚀 Starting translation test...${NC}"
echo "   Testing: 20 POIs × 6 languages = 120 translations"
echo "   This will take approximately 5-10 minutes..."
echo ""

./test-translations.sh

# Check if results file was created
if [ ! -f "translation-test-results.json" ]; then
    echo -e "${RED}✗ Test results file not created${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Test completed successfully${NC}"
echo ""

# Wait a moment
sleep 2

# Analyze results
echo "=================================================="
echo -e "${BLUE}📊 Analyzing results...${NC}"
echo "=================================================="
echo ""

if [ ! -f "analyze-results.py" ]; then
    echo -e "${RED}✗ analyze-results.py not found${NC}"
    exit 1
fi

python3 analyze-results.py

# Save analysis to file
echo ""
echo -e "${YELLOW}💾 Saving analysis to file...${NC}"
python3 analyze-results.py > translation-analysis-report.txt 2>&1

echo ""
echo "=================================================="
echo -e "${GREEN}✅ All tests completed!${NC}"
echo "=================================================="
echo ""
echo "📁 Generated files:"
echo "   • translation-test-results.json (raw test data)"
echo "   • translation-analysis-report.txt (analysis report)"
echo ""
echo "To view the full report:"
echo "   cat translation-analysis-report.txt"
echo ""
