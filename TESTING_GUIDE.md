# Translation Testing Guide

## Quick Start

### 1. Build and Start the Server
```bash
cd /Users/ryan.huang/Documents/klook/poi-translation-portal-new
npm run build
PORT=3002 npm run start
```

### 2. Run the Test (in a new terminal)
```bash
chmod +x test-translations.sh
./test-translations.sh
```

This will test **20 POIs × 6 languages = 120 translations** and save results to `translation-test-results.json`.

### 3. Analyze Results
```bash
python3 analyze-results.py
```

## What the Analysis Reports

### 📊 Translation Quality Analysis
- **Overall success rate**: Percentage of translations containing target language characters
- **Success rate by language**: Breakdown for each of the 6 languages tested
- **Top/Bottom POIs**: Which POIs translate best/worst across languages

### 📍 Translation Source Distribution
Shows which translation source (SERP, Google Maps, Perplexity, OpenAI) was selected most often:
- Helps identify if SERP improvements are working
- Shows source reliability

### 🔄 Source Consistency Analysis
Measures agreement between different translation sources:
- **All sources agree**: High confidence translations
- **Majority agree**: Good confidence
- **All sources differ**: Needs manual review

### ⚠️ Problem Cases
Automatically detects:
1. **Missing translations**: "Translation not found"
2. **English-only results**: For strict languages (JP, KR, TH, CN, TW)
3. **Same as original**: No translation occurred
4. **Meta-text**: Contains "translation of", etc.
5. **Unusually long**: Might be description instead of name

## Expected Improvements

Based on the SERP API enhancements, we expect to see:

### ✅ Fixed Cases
- **Tokyo Station** → Should get "東京駅" (not "东京旅游官方网站GO TOKYO")
- **Yasukuni Shrine** → Should avoid "Yasukuni (film)" or "History Yasukuni Jinja"
- **Temple names** → Should get proper local translations from Wikipedia/official sources

### ✅ Better Source Distribution
- SERP API should be selected more often (better quality)
- Higher domain whitelist bonus working (Wikipedia, gov sites)

### ✅ Language Quality
- Strict languages (JP, KR, TH, CN) should have <5% English-only results
- Hong Kong POIs can have mixed English/Chinese (lenient mode)
- Mixed language support: "Victoria Harbour 維多利亞港" is acceptable

### ✅ Consistency
- Higher "all sources agree" percentage (better quality)
- Fewer "all sources differ" cases

## Test POIs

The test includes diverse POI types:

**Religious Sites**: Yasukuni Shrine, Wat Pho, Sensoji Temple, Meiji Shrine
**Transportation**: Tokyo Station, Shinjuku Station
**Natural Features**: Victoria Harbour, Ueno Park, Halong Bay
**Cultural**: Tokyo Skytree, Shibuya Crossing, Tsukiji Market
**Theme Parks**: Shanghai Disney Resort, Universal Studios Japan
**Museums**: Tokyo National Museum
**Commercial**: Namba, Akihabara
**Historical**: Himeji Castle, Summer Palace

## Troubleshooting

### Test fails to connect to API
```bash
# Check if server is running
curl http://localhost:3002/api/translation-sources

# Check server logs
# Look for any error messages in the terminal running the server
```

### Analysis script errors
```bash
# Make sure results file exists
ls -lh translation-test-results.json

# Check JSON validity
python3 -m json.tool translation-test-results.json > /dev/null
```

### Server port already in use
```bash
# Kill existing process on port 3002
lsof -ti:3002 | xargs kill -9

# Rebuild and restart server
npm run build
PORT=3002 npm run start
```

## Next Steps After Testing

1. **Review the analysis report**: Look for remaining problem cases
2. **Compare with previous results**: Has quality improved?
3. **Identify patterns**: Are certain POI types or languages still problematic?
4. **Iterate**: Adjust SERP scoring logic if needed based on findings
