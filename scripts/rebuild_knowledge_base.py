#!/usr/bin/env python3
"""
Rebuild the comprehensive knowledge base including individual ideal sequences
"""

import os
import json
from pathlib import Path
from datetime import datetime

def main():
    base_dir = Path(__file__).parent.parent
    
    all_data = []
    
    # Load existing enhanced clinical cases
    enhanced_cases_path = base_dir / "DATA" / "ENHANCED_KNOWLEDGE" / "enhanced_clinical_cases.json"
    if enhanced_cases_path.exists():
        print("Loading enhanced clinical cases...")
        try:
            with open(enhanced_cases_path, 'r', encoding='utf-8') as f:
                cases_data = json.load(f)
                if isinstance(cases_data, dict) and 'data' in cases_data:
                    for case in cases_data['data']:
                        case['type'] = 'clinical_case'
                        case['source'] = 'clinical_cases'
                        all_data.append(case)
                elif isinstance(cases_data, list):
                    for case in cases_data:
                        case['type'] = 'clinical_case'
                        case['source'] = 'clinical_cases'
                        all_data.append(case)
            print(f"  Loaded {len([d for d in all_data if d['type'] == 'clinical_case'])} clinical cases")
        except Exception as e:
            print(f"  Error loading enhanced clinical cases: {e}")
    
    # Load ideal sequences
    ideal_sequences_dir = base_dir / "DATA" / "IDEAL_SEQUENCES_ENHANCED"
    if ideal_sequences_dir.exists():
        print("\nLoading ideal sequences...")
        for json_file in ideal_sequences_dir.glob("ideal_sequence_*.json"):
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    data['type'] = 'ideal_sequence'
                    data['source'] = 'dentist_guidelines'
                    data['filename'] = json_file.name
                    all_data.append(data)
            except Exception as e:
                print(f"  Error loading {json_file.name}: {e}")
        print(f"  Loaded {len([d for d in all_data if d['type'] == 'ideal_sequence'])} ideal sequences")
    
    # Load any general knowledge files
    general_knowledge_dir = base_dir / "DATA" / "GENERAL_KNOWLEDGE"
    if general_knowledge_dir.exists():
        print("\nLoading general knowledge...")
        for json_file in general_knowledge_dir.glob("*.json"):
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    # If it's a list, process each item
                    if isinstance(data, list):
                        for item in data:
                            item['type'] = item.get('type', 'general_knowledge')
                            item['source'] = 'general_knowledge'
                            item['filename'] = json_file.name
                            all_data.append(item)
                    else:
                        data['type'] = data.get('type', 'general_knowledge')
                        data['source'] = 'general_knowledge'
                        data['filename'] = json_file.name
                        all_data.append(data)
            except Exception as e:
                print(f"  Error loading {json_file.name}: {e}")
        general_count = len([d for d in all_data if d['source'] == 'general_knowledge'])
        if general_count > 0:
            print(f"  Loaded {general_count} general knowledge items")
    
    # Create comprehensive knowledge base
    knowledge_base = {
        'version': '2.0',
        'created_at': datetime.now().isoformat(),
        'total_entries': len(all_data),
        'statistics': {
            'clinical_cases': len([d for d in all_data if d['type'] == 'clinical_case']),
            'ideal_sequences': len([d for d in all_data if d['type'] == 'ideal_sequence']),
            'general_knowledge': len([d for d in all_data if d.get('source') == 'general_knowledge'])
        },
        'data': all_data
    }
    
    # Save comprehensive knowledge base
    output_dir = base_dir / "DATA" / "ENHANCED_KNOWLEDGE"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    output_path = output_dir / "comprehensive_knowledge_base.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(knowledge_base, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Knowledge base rebuilt successfully!")
    print(f"📊 Statistics:")
    print(f"   - Total entries: {knowledge_base['total_entries']}")
    print(f"   - Clinical cases: {knowledge_base['statistics']['clinical_cases']}")
    print(f"   - Ideal sequences: {knowledge_base['statistics']['ideal_sequences']}")
    print(f"   - General knowledge: {knowledge_base['statistics']['general_knowledge']}")
    print(f"📁 Output: {output_path}")
    
    # Also save a lightweight index for quick reference
    index = []
    for item in all_data:
        index.append({
            'id': f"{item['type']}_{all_data.index(item)}",
            'type': item['type'],
            'title': item.get('consultation_text', item.get('title', 'Untitled')),
            'source': item['source'],
            'filename': item['filename']
        })
    
    index_path = output_dir / "knowledge_base_index.json"
    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    
    print(f"📇 Index saved: {index_path}")

if __name__ == "__main__":
    main()