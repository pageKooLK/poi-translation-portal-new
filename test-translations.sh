#!/bin/bash

# Test Translation Quality Script
# Tests 20 selected POIs across 6 languages

API_URL="http://localhost:3002/api/translation-sources"
OUTPUT_FILE="translation-test-results.json"
LANGUAGES=("ZH-CN" "ZH-TW" "JA-JP" "KO-KR" "TH-TH" "FR-FR")

echo "🚀 Starting translation quality test..."
echo "Testing 20 POIs × 6 languages = 120 translations"
echo ""

# Read test POIs
TEST_POIS='[
  {"place_id":"50006601","name":"Tokyo Station","country":"JP","google_place_id":"ChIJC3Cf2PuLGGAROO00ukl8JwA"},
  {"place_id":"50001593","name":"Yasukuni Shrine","country":"JP","google_place_id":"ChIJ1UOuDWiMGGARkM6Iv-ZU57U"},
  {"place_id":"50001585","name":"Yasaka Shrine","country":"JP","google_place_id":"ChIJqewQoHkIAWAR6RokWp3Iesc"},
  {"place_id":"50199708","name":"Wat Pho","country":"TH","google_place_id":"ChIJzbmcz7GZ4jARpMQfnRNXBa0"},
  {"place_id":"50042382","name":"Victoria Harbour","country":"HK","google_place_id":"ChIJrw3y6c8BBDQRSqll_Mgugos"},
  {"place_id":"50155713","name":"Ueno Park","country":"JP","google_place_id":"ChIJyb-lxMtQAWARdI1mkef55ZY"},
  {"place_id":"50001344","name":"Shanghai Disney Resort","country":"CN","google_place_id":"ChIJqz-X18eHrTURVpL3I4kzbxE"},
  {"place_id":"50128871","name":"Togetsukyō Bridge","country":"JP","google_place_id":"ChIJd2mRAFMHAWARPSiWJOj4FOw"},
  {"place_id":"50199659","name":"The Grand Palace","country":"TH","google_place_id":"ChIJya0AFA-Z4jARNaRzjuLiyMc"},
  {"place_id":"50083770","name":"The Hakone Open-Air Museum","country":"JP","google_place_id":"ChIJMfOWowSiGWARX2wK6ac5jlg"},
  {"place_id":"50002002","name":"Bamboo Island","country":"TH","google_place_id":"ChIJSwe7D6zdUTARgaOnP9RWeZM"},
  {"place_id":"50056779","name":"Takachiho Gorge","country":"JP","google_place_id":"ChIJLwml_t0sRzURix_JnSldeVg"},
  {"place_id":"50057437","name":"Shurijo Castle","country":"JP","google_place_id":"ChIJZ9v0bP5r5TQRi0-esrqficA"},
  {"place_id":"50001237","name":"Shirogane Blue Pond","country":"JP","google_place_id":"ChIJbyoi3mLMDF8RnndLnx8YzQQ"},
  {"place_id":"50050807","name":"Shinjuku Gyoen National Garden","country":"JP","google_place_id":"ChIJPyOTG8KMGGARh_IXobWxHmo"},
  {"place_id":"50007502","name":"Shin-Osaka Station","country":"JP","google_place_id":"ChIJSc4SbDnkAGARz3YQv-DE1zs"},
  {"place_id":"50258464","name":"Starbucks Reserve Chao Phraya Riverfront ICONSIAM","country":"TH","google_place_id":"ChIJAeJGvteZ4jARHd_2G7NNWIg"},
  {"place_id":"50200345","name":"Tenryū-ji Temple","country":"JP","google_place_id":"ChIJk54PuAGqAWARwEgz_9o-nM0"},
  {"place_id":"50198995","name":"Hill of the Buddha","country":"JP","google_place_id":"ChIJV0j3hcUrdV8RZQq4rcWQB9I"},
  {"place_id":"50294328","name":"Shiroikoibito Park","country":"JP","google_place_id":"ChIJU8vHZBIoC18RkQEK1Lg8HsI"}
]'

# Initialize results file
echo "[]" > "$OUTPUT_FILE"

# Counter
COUNT=0
TOTAL=120

# Test each POI in each language
echo "$TEST_POIS" | python3 -c "
import sys, json
pois = json.load(sys.stdin)
for poi in pois:
    print(json.dumps(poi))
" | while read -r poi_json; do

  POI_NAME=$(echo "$poi_json" | python3 -c "import sys, json; print(json.load(sys.stdin)['name'])")
  PLACE_ID=$(echo "$poi_json" | python3 -c "import sys, json; print(json.load(sys.stdin)['place_id'])")
  GOOGLE_PLACE_ID=$(echo "$poi_json" | python3 -c "import sys, json; print(json.load(sys.stdin)['google_place_id'])")
  COUNTRY=$(echo "$poi_json" | python3 -c "import sys, json; print(json.load(sys.stdin)['country'])")

  for LANG in "${LANGUAGES[@]}"; do
    COUNT=$((COUNT + 1))
    echo "[$COUNT/$TOTAL] Testing: $POI_NAME → $LANG"

    # Call API
    RESPONSE=$(curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"poiName\":\"$POI_NAME\",\"googlePlaceId\":\"$GOOGLE_PLACE_ID\",\"language\":\"$LANG\",\"country\":\"$COUNTRY\"}")

    # Parse and save result
    echo "$RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    result = {
        'poi_name': '$POI_NAME',
        'place_id': '$PLACE_ID',
        'language': '$LANG',
        'serp': data.get('translations', {}).get('serp', 'Error'),
        'perplexity': data.get('translations', {}).get('perplexity', 'Error'),
        'openai': data.get('translations', {}).get('openai', 'Error'),
        'googleMaps': data.get('translations', {}).get('googleMaps', 'Error')
    }

    # Read existing results
    with open('$OUTPUT_FILE', 'r') as f:
        results = json.load(f)

    # Append new result
    results.append(result)

    # Write back
    with open('$OUTPUT_FILE', 'w') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f\"  SERP: {result['serp']}\")
    print(f\"  Perplexity: {result['perplexity']}\")
    print(f\"  OpenAI: {result['openai']}\")
except Exception as e:
    print(f\"Error: {e}\", file=sys.stderr)
"

    # Small delay to avoid rate limiting
    sleep 3
    echo ""
  done
done

echo "✅ Translation testing complete!"
echo "Results saved to: $OUTPUT_FILE"
