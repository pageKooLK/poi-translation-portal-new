#!/usr/bin/env python3
"""
Translation Test Results Analyzer
Analyzes the quality of translations from the test run
"""

import json
import sys
from collections import defaultdict
from typing import Dict, List, Any

def load_results(filename: str = 'translation-test-results.json') -> List[Dict]:
    """Load test results from JSON file"""
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: {filename} not found. Please run the test script first.")
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"❌ Error: Invalid JSON in {filename}")
        sys.exit(1)

def analyze_language_quality(results: List[Dict]) -> Dict:
    """Analyze translation quality by checking for target language characters"""

    language_patterns = {
        'ZH-CN': r'[\u4e00-\u9fff]',
        'ZH-TW': r'[\u4e00-\u9fff]',
        'JA-JP': r'[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]',
        'KO-KR': r'[\uac00-\ud7af]',
        'TH-TH': r'[\u0e00-\u0e7f]',
        'FR-FR': r'[àâäæçéèêëïîôùûüÿœ]',
    }

    quality_stats = {
        'by_language': defaultdict(lambda: {'total': 0, 'has_target_chars': 0, 'success_rate': 0}),
        'by_poi': defaultdict(lambda: {'total': 0, 'has_target_chars': 0, 'success_rate': 0}),
        'by_source': defaultdict(lambda: {'selected_count': 0, 'total_count': 0}),
        'overall': {'total': 0, 'has_target_chars': 0, 'success_rate': 0}
    }

    import re

    for result in results:
        language = result['language']
        poi_name = result['poiName']
        translation = result.get('selectedTranslation', {}).get('translation', '')
        sources = result.get('sources', {})

        # Overall stats
        quality_stats['overall']['total'] += 1

        # By language stats
        quality_stats['by_language'][language]['total'] += 1

        # By POI stats
        quality_stats['by_poi'][poi_name]['total'] += 1

        # Check if translation contains target language characters
        has_target_chars = False
        if language in language_patterns:
            pattern = language_patterns[language]
            has_target_chars = bool(re.search(pattern, translation))
        elif language == 'VI-VN':
            # Vietnamese uses Latin alphabet with diacritics
            vietnamese_pattern = r'[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]'
            has_target_chars = bool(re.search(vietnamese_pattern, translation, re.IGNORECASE))
        else:
            # For other languages, assume presence of non-ASCII is good
            has_target_chars = bool(re.search(r'[^\x00-\x7F]', translation))

        if has_target_chars:
            quality_stats['overall']['has_target_chars'] += 1
            quality_stats['by_language'][language]['has_target_chars'] += 1
            quality_stats['by_poi'][poi_name]['has_target_chars'] += 1

        # Track which source was selected
        selected_source = result.get('selectedTranslation', {}).get('source', 'unknown')
        quality_stats['by_source'][selected_source]['selected_count'] += 1

        # Count available sources
        for source_name in sources.keys():
            quality_stats['by_source'][source_name]['total_count'] += 1

    # Calculate success rates
    if quality_stats['overall']['total'] > 0:
        quality_stats['overall']['success_rate'] = (
            quality_stats['overall']['has_target_chars'] / quality_stats['overall']['total'] * 100
        )

    for lang, stats in quality_stats['by_language'].items():
        if stats['total'] > 0:
            stats['success_rate'] = stats['has_target_chars'] / stats['total'] * 100

    for poi, stats in quality_stats['by_poi'].items():
        if stats['total'] > 0:
            stats['success_rate'] = stats['has_target_chars'] / stats['total'] * 100

    return quality_stats

def identify_problem_cases(results: List[Dict]) -> List[Dict]:
    """Identify translations that might have issues"""
    problems = []

    import re

    language_patterns = {
        'ZH-CN': r'[\u4e00-\u9fff]',
        'ZH-TW': r'[\u4e00-\u9fff]',
        'JA-JP': r'[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]',
        'KO-KR': r'[\uac00-\ud7af]',
        'TH-TH': r'[\u0e00-\u0e7f]',
    }

    for result in results:
        language = result['language']
        poi_name = result['poiName']
        translation = result.get('selectedTranslation', {}).get('translation', '')
        source = result.get('selectedTranslation', {}).get('source', 'unknown')
        reasoning = result.get('selectedTranslation', {}).get('reasoning', '')

        issue_type = None

        # Check 1: Missing translation
        if not translation or translation == "Translation not found":
            issue_type = "Missing translation"

        # Check 2: English-only for strict languages (JP, KR, TH, CN, TW)
        elif language in language_patterns:
            has_target_chars = bool(re.search(language_patterns[language], translation))
            has_english = bool(re.search(r'[a-zA-Z]{4,}', translation))

            if not has_target_chars and has_english:
                # Check if it's a known brand
                brands = ['Starbucks', 'McDonald', 'Disney', 'Universal', 'IKEA', 'Apple Store']
                is_brand = any(brand.lower() in translation.lower() for brand in brands)

                if not is_brand:
                    issue_type = "English-only result (expected target language)"

        # Check 3: Same as POI name (no translation occurred)
        elif translation.strip() == poi_name.strip():
            issue_type = "Same as original POI name"

        # Check 4: Contains "translation of" or similar meta-text
        elif any(phrase in translation.lower() for phrase in ['translation of', 'translated', 'in english']):
            issue_type = "Meta-text in translation"

        # Check 5: Extremely long translations (likely description instead of name)
        elif len(translation) > 150:
            issue_type = "Unusually long translation (might be description)"

        if issue_type:
            problems.append({
                'poi': poi_name,
                'language': language,
                'translation': translation,
                'source': source,
                'issue': issue_type,
                'reasoning': reasoning[:200] if reasoning else ''
            })

    return problems

def analyze_source_consistency(results: List[Dict]) -> Dict:
    """Analyze consistency across different translation sources"""
    consistency_data = defaultdict(lambda: {
        'total': 0,
        'all_agree': 0,
        'majority_agree': 0,
        'all_differ': 0
    })

    for result in results:
        language = result['language']
        sources = result.get('sources', {})

        if len(sources) < 2:
            continue

        consistency_data[language]['total'] += 1

        # Get all translations (excluding errors)
        translations = []
        for source_name, source_data in sources.items():
            trans = source_data.get('translation', '')
            if trans and trans != "Translation not found" and not trans.startswith("Error:"):
                translations.append(trans.strip().lower())

        if len(translations) < 2:
            continue

        # Check consistency
        unique_translations = set(translations)

        if len(unique_translations) == 1:
            consistency_data[language]['all_agree'] += 1
        elif len(unique_translations) == len(translations):
            consistency_data[language]['all_differ'] += 1
        else:
            consistency_data[language]['majority_agree'] += 1

    return consistency_data

def generate_report(results: List[Dict]):
    """Generate comprehensive analysis report"""

    print("=" * 80)
    print("📊 TRANSLATION TEST RESULTS ANALYSIS")
    print("=" * 80)
    print()

    # Basic stats
    print(f"Total translations tested: {len(results)}")
    print()

    # Quality analysis
    print("-" * 80)
    print("🎯 TRANSLATION QUALITY ANALYSIS")
    print("-" * 80)

    quality_stats = analyze_language_quality(results)

    print(f"\n📈 Overall Success Rate: {quality_stats['overall']['success_rate']:.1f}%")
    print(f"   ✓ Contains target language: {quality_stats['overall']['has_target_chars']}/{quality_stats['overall']['total']}")
    print()

    print("📊 Success Rate by Language:")
    for lang in sorted(quality_stats['by_language'].keys()):
        stats = quality_stats['by_language'][lang]
        print(f"   {lang}: {stats['success_rate']:.1f}% ({stats['has_target_chars']}/{stats['total']})")
    print()

    print("🏆 Top 5 POIs (by success rate):")
    poi_sorted = sorted(
        quality_stats['by_poi'].items(),
        key=lambda x: x[1]['success_rate'],
        reverse=True
    )[:5]
    for poi_name, stats in poi_sorted:
        print(f"   {poi_name}: {stats['success_rate']:.1f}% ({stats['has_target_chars']}/{stats['total']})")
    print()

    print("⚠️  Bottom 5 POIs (by success rate):")
    poi_sorted_bottom = sorted(
        quality_stats['by_poi'].items(),
        key=lambda x: x[1]['success_rate']
    )[:5]
    for poi_name, stats in poi_sorted_bottom:
        print(f"   {poi_name}: {stats['success_rate']:.1f}% ({stats['has_target_chars']}/{stats['total']})")
    print()

    # Source distribution
    print("-" * 80)
    print("📍 TRANSLATION SOURCE DISTRIBUTION")
    print("-" * 80)
    print()

    total_selections = sum(s['selected_count'] for s in quality_stats['by_source'].values())
    for source in sorted(quality_stats['by_source'].keys()):
        stats = quality_stats['by_source'][source]
        percentage = (stats['selected_count'] / total_selections * 100) if total_selections > 0 else 0
        print(f"   {source}: {stats['selected_count']} times selected ({percentage:.1f}%)")
    print()

    # Consistency analysis
    print("-" * 80)
    print("🔄 SOURCE CONSISTENCY ANALYSIS")
    print("-" * 80)
    print()

    consistency = analyze_source_consistency(results)
    for lang in sorted(consistency.keys()):
        stats = consistency[lang]
        if stats['total'] > 0:
            all_agree_pct = stats['all_agree'] / stats['total'] * 100
            majority_pct = stats['majority_agree'] / stats['total'] * 100
            differ_pct = stats['all_differ'] / stats['total'] * 100

            print(f"{lang}:")
            print(f"   All sources agree: {stats['all_agree']} ({all_agree_pct:.1f}%)")
            print(f"   Majority agree: {stats['majority_agree']} ({majority_pct:.1f}%)")
            print(f"   All sources differ: {stats['all_differ']} ({differ_pct:.1f}%)")
            print()

    # Problem cases
    print("-" * 80)
    print("⚠️  PROBLEM CASES REQUIRING ATTENTION")
    print("-" * 80)
    print()

    problems = identify_problem_cases(results)

    if problems:
        print(f"Found {len(problems)} potential issues:\n")

        # Group by issue type
        by_issue_type = defaultdict(list)
        for p in problems:
            by_issue_type[p['issue']].append(p)

        for issue_type, cases in sorted(by_issue_type.items()):
            print(f"\n🔴 {issue_type} ({len(cases)} cases):")
            for case in cases[:5]:  # Show first 5 of each type
                print(f"   • {case['poi']} ({case['language']})")
                print(f"     Translation: {case['translation'][:80]}...")
                print(f"     Source: {case['source']}")
                if case['reasoning']:
                    print(f"     Reasoning: {case['reasoning'][:100]}...")
                print()

            if len(cases) > 5:
                print(f"   ... and {len(cases) - 5} more cases")
                print()
    else:
        print("✅ No major issues detected!")

    print()
    print("=" * 80)
    print("📝 Analysis complete!")
    print("=" * 80)

def main():
    """Main entry point"""
    results = load_results()
    generate_report(results)

if __name__ == '__main__':
    main()
