#!/usr/bin/env python3
"""Simple translation test results analyzer"""

import json
import re
from collections import defaultdict

# Load results
with open('translation-test-results.json', 'r', encoding='utf-8') as f:
    results = json.load(f)

print("=" * 80)
print("📊 TRANSLATION TEST RESULTS ANALYSIS")
print("=" * 80)
print(f"\nTotal translations tested: {len(results)}\n")

# Language character patterns
lang_patterns = {
    'ZH-CN': r'[\u4e00-\u9fff]',
    'ZH-TW': r'[\u4e00-\u9fff]',
    'JA-JP': r'[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]',
    'KO-KR': r'[\uac00-\ud7af]',
    'TH-TH': r'[\u0e00-\u0e7f]',
    'FR-FR': r'[àâäæçéèêëïîôùûüÿœ]',
}

# Statistics
stats_by_lang = defaultdict(lambda: {'total': 0, 'serp_has_target': 0, 'perp_has_target': 0, 'openai_has_target': 0})
stats_by_poi = defaultdict(lambda: {'total': 0, 'serp_good': 0, 'perp_good': 0, 'openai_good': 0})
source_selection = {'serp': 0, 'perplexity': 0, 'openai': 0, 'googleMaps': 0}

# Problems
problems = []

for r in results:
    lang = r['language']
    poi = r['poi_name']
    serp = r.get('serp', '')
    perp = r.get('perplexity', '')
    openai = r.get('openai', '')
    gmaps = r.get('googleMaps', '')
    
    stats_by_lang[lang]['total'] += 1
    stats_by_poi[poi]['total'] += 1
    
    # Check language presence
    pattern = lang_patterns.get(lang, r'[^\x00-\x7F]')
    
    if re.search(pattern, serp):
        stats_by_lang[lang]['serp_has_target'] += 1
        stats_by_poi[poi]['serp_good'] += 1
    elif serp and 'failed' not in serp.lower() and 'translation not found' not in serp.lower():
        problems.append({
            'poi': poi,
            'lang': lang,
            'source': 'SERP',
            'text': serp[:80],
            'issue': 'No target language chars'
        })
    
    if re.search(pattern, perp):
        stats_by_lang[lang]['perp_has_target'] += 1
        stats_by_poi[poi]['perp_good'] += 1
    
    if re.search(pattern, openai):
        stats_by_lang[lang]['openai_has_target'] += 1
        stats_by_poi[poi]['openai_good'] += 1

# Print statistics
print("-" * 80)
print("🎯 TRANSLATION QUALITY BY LANGUAGE")
print("-" * 80)
print()
for lang in sorted(stats_by_lang.keys()):
    s = stats_by_lang[lang]
    print(f"{lang}:")
    print(f"   SERP: {s['serp_has_target']}/{s['total']} ({s['serp_has_target']/s['total']*100:.1f}%)")
    print(f"   Perplexity: {s['perp_has_target']}/{s['total']} ({s['perp_has_target']/s['total']*100:.1f}%)")
    print(f"   OpenAI: {s['openai_has_target']}/{s['total']} ({s['openai_has_target']/s['total']*100:.1f}%)")
    print()

print("-" * 80)
print("🏆 TOP 5 POIs (by SERP success)")
print("-" * 80)
print()
poi_scores = [(poi, s['serp_good']/s['total']*100) for poi, s in stats_by_poi.items()]
poi_scores.sort(key=lambda x: x[1], reverse=True)
for poi, score in poi_scores[:5]:
    s = stats_by_poi[poi]
    print(f"   {poi}: {score:.1f}% ({s['serp_good']}/{s['total']})")
print()

print("-" * 80)
print("⚠️  BOTTOM 5 POIs (by SERP success)")
print("-" * 80)
print()
for poi, score in poi_scores[-5:]:
    s = stats_by_poi[poi]
    print(f"   {poi}: {score:.1f}% ({s['serp_good']}/{s['total']})")
print()

print("-" * 80)
print("⚠️  SERP PROBLEM CASES")
print("-" * 80)
print(f"\nFound {len(problems)} issues:\n")
for p in problems[:20]:  # Show first 20
    print(f"• {p['poi']} ({p['lang']})")
    print(f"  Translation: {p['text']}...")
    print(f"  Issue: {p['issue']}")
    print()

if len(problems) > 20:
    print(f"... and {len(problems) - 20} more issues\n")

print("=" * 80)
