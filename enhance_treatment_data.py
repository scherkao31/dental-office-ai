#!/usr/bin/env python
"""
Comprehensive treatment data enhancement system
"""

import json
import os
from pathlib import Path
from dental_abbreviations import enhance_treatment_data, create_searchable_content

def process_existing_treatments():
    """Process existing TRAITEMENTS_JSON files"""
    treatments_dir = Path("DATA/TRAITEMENTS_JSON")
    enhanced_treatments = []
    
    if not treatments_dir.exists():
        print(f"Directory {treatments_dir} not found")
        return []
    
    print(f"Processing existing treatments from {treatments_dir}")
    
    for file_path in treatments_dir.glob("*.json"):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                treatment_data = json.load(f)
            
            # Add metadata
            treatment_data['filename'] = file_path.name
            treatment_data['source'] = 'clinical_cases'
            treatment_data['type'] = 'clinical_case'
            
            # Enhance the treatment data
            enhanced_data = enhance_treatment_data(treatment_data)
            
            # Create searchable content
            enhanced_data['searchable_content'] = create_searchable_content(enhanced_data)
            
            enhanced_treatments.append(enhanced_data)
            print(f"Enhanced {file_path.name}: {len(enhanced_data['searchable_content'])} characters")
            
        except Exception as e:
            print(f"Error processing {file_path}: {e}")
    
    return enhanced_treatments

def process_ideal_sequences():
    """Process ideal treatment sequences"""
    sequences_file = Path("DATA/IDEAL_SEQUENCES/detailed_ideal_sequences.json")
    enhanced_sequences = []
    
    if not sequences_file.exists():
        print(f"File {sequences_file} not found")
        return []
    
    print(f"Processing ideal sequences from {sequences_file}")
    
    try:
        with open(sequences_file, 'r', encoding='utf-8') as f:
            sequences_data = json.load(f)
        
        for sequence_data in sequences_data:
            # Enhance the sequence data
            enhanced_data = enhance_treatment_data(sequence_data)
            
            # Create searchable content
            enhanced_data['searchable_content'] = create_searchable_content(enhanced_data)
            
            enhanced_sequences.append(enhanced_data)
            print(f"Enhanced {sequence_data['filename']}: {len(enhanced_data['searchable_content'])} characters")
            
    except Exception as e:
        print(f"Error processing ideal sequences: {e}")
    
    return enhanced_sequences

def create_comprehensive_knowledge_base():
    """Create a comprehensive knowledge base with all enhanced data"""
    
    # Process all data sources
    enhanced_treatments = process_existing_treatments()
    enhanced_sequences = process_ideal_sequences()
    
    # Combine all data
    all_enhanced_data = enhanced_treatments + enhanced_sequences
    
    # Create comprehensive knowledge base
    knowledge_base = {
        'metadata': {
            'total_entries': len(all_enhanced_data),
            'clinical_cases': len(enhanced_treatments),
            'ideal_sequences': len(enhanced_sequences),
            'created_at': str(Path().cwd()),
            'version': '1.0'
        },
        'data': all_enhanced_data
    }
    
    # Save enhanced knowledge base
    output_path = Path("DATA/ENHANCED_KNOWLEDGE")
    output_path.mkdir(exist_ok=True)
    
    # Save complete knowledge base
    knowledge_base_file = output_path / "comprehensive_knowledge_base.json"
    with open(knowledge_base_file, 'w', encoding='utf-8') as f:
        json.dump(knowledge_base, f, indent=2, ensure_ascii=False)
    
    print(f"\nSaved comprehensive knowledge base to {knowledge_base_file}")
    print(f"Total entries: {knowledge_base['metadata']['total_entries']}")
    
    # Save separate files for easier access
    clinical_cases_file = output_path / "enhanced_clinical_cases.json"
    with open(clinical_cases_file, 'w', encoding='utf-8') as f:
        json.dump(enhanced_treatments, f, indent=2, ensure_ascii=False)
    
    ideal_sequences_file = output_path / "enhanced_ideal_sequences.json"
    with open(ideal_sequences_file, 'w', encoding='utf-8') as f:
        json.dump(enhanced_sequences, f, indent=2, ensure_ascii=False)
    
    print(f"Saved clinical cases to {clinical_cases_file}")
    print(f"Saved ideal sequences to {ideal_sequences_file}")
    
    return knowledge_base

def create_search_index():
    """Create a search index for quick lookup"""
    knowledge_base_file = Path("DATA/ENHANCED_KNOWLEDGE/comprehensive_knowledge_base.json")
    
    if not knowledge_base_file.exists():
        print("Knowledge base not found. Run create_comprehensive_knowledge_base() first.")
        return
    
    with open(knowledge_base_file, 'r', encoding='utf-8') as f:
        knowledge_base = json.load(f)
    
    # Create search index
    search_index = []
    
    for entry in knowledge_base['data']:
        search_entry = {
            'id': entry.get('filename', 'unknown'),
            'title': entry.get('consultation_text', entry.get('title', 'Untitled')),
            'content': entry.get('searchable_content', ''),
            'type': entry.get('type', 'unknown'),
            'source': entry.get('source', 'unknown'),
            'categories': []
        }
        
        # Extract categories from enhanced treatment sequence
        if 'treatment_sequence_enhanced' in entry:
            categories = set()
            for appointment in entry['treatment_sequence_enhanced']:
                if 'categories' in appointment:
                    categories.update(appointment['categories'])
            search_entry['categories'] = list(categories)
        
        search_index.append(search_entry)
    
    # Save search index
    search_index_file = Path("DATA/ENHANCED_KNOWLEDGE/search_index.json")
    with open(search_index_file, 'w', encoding='utf-8') as f:
        json.dump(search_index, f, indent=2, ensure_ascii=False)
    
    print(f"Created search index with {len(search_index)} entries")
    print(f"Saved to {search_index_file}")
    
    return search_index

if __name__ == "__main__":
    print("🦷 Enhancing Dental Treatment Data...")
    print("=" * 50)
    
    # Create comprehensive knowledge base
    knowledge_base = create_comprehensive_knowledge_base()
    
    # Create search index
    search_index = create_search_index()
    
    print("\n✅ Enhancement complete!")
    print(f"📊 Total entries: {knowledge_base['metadata']['total_entries']}")
    print(f"🏥 Clinical cases: {knowledge_base['metadata']['clinical_cases']}")
    print(f"⭐ Ideal sequences: {knowledge_base['metadata']['ideal_sequences']}")
    
    # Display sample enhanced data
    if knowledge_base['data']:
        sample = knowledge_base['data'][0]
        print(f"\n📋 Sample enhanced entry:")
        print(f"   File: {sample.get('filename', 'Unknown')}")
        print(f"   Type: {sample.get('type', 'Unknown')}")
        print(f"   Searchable content: {len(sample.get('searchable_content', ''))} characters")
        if 'consultation_text_expanded' in sample:
            print(f"   Expanded consultation: {sample['consultation_text_expanded'][:100]}...")