#!/usr/bin/env python3
"""
Enhance ideal sequences with expanded abbreviations and prepare for RAG indexing
"""

import os
import json
from pathlib import Path

# Load abbreviations from the existing file
def load_abbreviations():
    """Load dental abbreviations from JSON file"""
    base_dir = Path(__file__).parent.parent
    abbrev_path = base_dir / "DATA" / "ABBREVIATIONS" / "dental_abbreviations.json"
    
    try:
        with open(abbrev_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        print(f"Warning: Could not load abbreviations from {abbrev_path}")
        return {}

# Global abbreviations dictionary
ABBREVIATIONS = load_abbreviations()

def expand_dental_abbreviations(text):
    """Expand dental abbreviations in text"""
    if not text:
        return text
    
    expanded = text
    
    # Sort by length (longest first) to avoid partial replacements
    sorted_abbrevs = sorted(ABBREVIATIONS.items(), key=lambda x: len(x[0]), reverse=True)
    
    for abbrev, full_term in sorted_abbrevs:
        # Replace whole words only
        import re
        pattern = r'\b' + re.escape(abbrev) + r'\b'
        expanded = re.sub(pattern, full_term, expanded, flags=re.IGNORECASE)
    
    return expanded

def enhance_ideal_sequence(sequence_data):
    """Enhance a single ideal sequence with expanded abbreviations"""
    enhanced = sequence_data.copy()
    
    # Expand consultation text
    enhanced['consultation_text_expanded'] = expand_dental_abbreviations(
        sequence_data.get('consultation_text', '')
    )
    
    # Enhance treatment sequence
    enhanced_sequence = []
    for appointment in sequence_data.get('treatment_sequence', []):
        enhanced_appt = appointment.copy()
        
        # Expand treatment text
        enhanced_appt['traitement_expanded'] = expand_dental_abbreviations(
            appointment.get('traitement', '')
        )
        
        # Expand delay text
        enhanced_appt['delai_expanded'] = expand_dental_abbreviations(
            appointment.get('delai', '')
        )
        
        # Expand doctor abbreviations
        dr_text = appointment.get('dr', '')
        if dr_text:
            dr_expanded = dr_text.replace('VR', 'Dr. Virginie Rouiller')
            dr_expanded = dr_expanded.replace('NB', 'Dr. Nacer Benbachir')
            enhanced_appt['dr_expanded'] = dr_expanded
        else:
            enhanced_appt['dr_expanded'] = ''
        
        # Expand remarks
        enhanced_appt['remarque_expanded'] = expand_dental_abbreviations(
            appointment.get('remarque', '')
        )
        
        # Categorize treatments
        categories = categorize_treatment(appointment.get('traitement', ''))
        enhanced_appt['categories'] = categories
        
        enhanced_sequence.append(enhanced_appt)
    
    enhanced['treatment_sequence_enhanced'] = enhanced_sequence
    
    # Create searchable content
    searchable_parts = [
        f"Séquence idéale: {enhanced['consultation_text']}",
        f"Séquence idéale étendue: {enhanced['consultation_text_expanded']}"
    ]
    
    # Add all treatments to searchable content
    treatments = []
    treatments_expanded = []
    
    for appt in enhanced_sequence:
        if appt.get('traitement'):
            treatments.append(appt['traitement'])
        if appt.get('traitement_expanded'):
            treatments_expanded.append(appt['traitement_expanded'])
    
    searchable_parts.append(f"Traitements: {'; '.join(treatments)}")
    searchable_parts.append(f"Traitements étendus: {'; '.join(treatments_expanded)}")
    
    # Get all unique categories
    all_categories = set()
    for appt in enhanced_sequence:
        all_categories.update(appt.get('categories', []))
    
    if all_categories:
        searchable_parts.append(f"Catégories: {', '.join(sorted(all_categories))}")
    
    enhanced['searchable_content'] = '\n'.join(searchable_parts)
    enhanced['content'] = enhanced['searchable_content']  # For compatibility
    
    return enhanced

def categorize_treatment(treatment_text):
    """Categorize treatment based on keywords"""
    categories = []
    treatment_lower = treatment_text.lower()
    
    # Define category keywords
    category_keywords = {
        'Prothèse': ['couronne', 'bridge', 'pont', 'prothèse', 'facette', 'onlay', 'inlay'],
        'Composite': ['composite', 'cpr', 'obturation'],
        'Endodontie': ['traitement de racine', 'tr ', 'dévitalisation', 'pulpectomie', 'canal', 'endo'],
        'Chirurgie': ['extraction', 'implant', 'greffe', 'résection', 'ablation', 'sinus lift'],
        'Parodontologie': ['détartrage', 'curetage', 'paro', 'gencive', 'poche'],
        'Esthétique': ['blanchiment', 'facette', 'micro abrasion', 'mock-up', 'wax-up'],
        'Prévention': ['scellement', 'fissure', 'fluor', 'hygiène'],
        'Orthodontie': ['gouttière', 'contention', 'aligneur', 'invisalign'],
        'Radiologie': ['radio', 'cone beam', 'panoramique', 'rx'],
        'Contrôles': ['contrôle', 'ctl', 'essai', 'post op', 'recall']
    }
    
    for category, keywords in category_keywords.items():
        for keyword in keywords:
            if keyword in treatment_lower:
                categories.append(category)
                break
    
    # Default category if none found
    if not categories:
        categories.append('Général')
    
    return list(set(categories))  # Remove duplicates

def main():
    # Define paths
    base_dir = Path(__file__).parent.parent
    input_dir = base_dir / "DATA" / "IDEAL_SEQUENCES_JSON"
    output_dir = base_dir / "DATA" / "IDEAL_SEQUENCES_ENHANCED"
    
    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Process each ideal sequence file
    all_enhanced = []
    
    for json_file in input_dir.glob("ideal_sequence_*.json"):
        print(f"Processing: {json_file.name}")
        
        try:
            # Load original sequence
            with open(json_file, 'r', encoding='utf-8') as f:
                sequence_data = json.load(f)
            
            # Skip summary file
            if json_file.name.startswith('_'):
                continue
            
            # Enhance the sequence
            enhanced = enhance_ideal_sequence(sequence_data)
            
            # Save enhanced version
            output_path = output_dir / json_file.name
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(enhanced, f, ensure_ascii=False, indent=2)
            
            all_enhanced.append(enhanced)
            print(f"  ✓ Enhanced with {len(enhanced.get('treatment_sequence_enhanced', []))} appointments")
            
        except Exception as e:
            print(f"  ✗ Error: {str(e)}")
    
    # Create summary file with all enhanced sequences
    summary_path = output_dir / "_all_ideal_sequences_enhanced.json"
    with open(summary_path, 'w', encoding='utf-8') as f:
        json.dump({
            'total_sequences': len(all_enhanced),
            'sequences': all_enhanced
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Enhanced {len(all_enhanced)} ideal sequences")
    print(f"📁 Output directory: {output_dir}")

if __name__ == "__main__":
    main()