#!/usr/bin/env python
"""
Comprehensive dental abbreviation dictionary and data enhancement system
"""

import json
import re
from pathlib import Path

# Comprehensive dental abbreviations dictionary
DENTAL_ABBREVIATIONS = {
    # Composite treatments
    "Cpr": "Composite",
    "Cpr O": "Composite Occlusal",
    "Cpr OM": "Composite Occluso-Mésial",
    "Cpr MOD": "Composite Mésio-Occluso-Distal",
    "Cpr M": "Composite Mésial",
    "Cpr D": "Composite Distal",
    "Cpr collet": "Composite collet",
    "Cpr angle": "Composite angle",
    "Cpr bord libre": "Composite bord libre",
    
    # Treatments
    "TR": "Traitement de racine",
    "Endo": "Endodontie",
    "Dém": "Démonter",
    "Désobturation": "Désobstruction canalaire",
    "CC": "Couronne céramique",
    "CPR": "Couronne prothétique",
    "MA": "Moignon adhésif",
    "AV": "Avulsion",
    "Ext": "Extraction",
    "BNV": "Blanchiment Non Vital",
    "GBR": "Greffe Bone Regeneration",
    "GC": "Greffe Conjonctif",
    "SL": "Sinus Lift",
    "Det": "Détartrage",
    "HD": "Hygiène Dentaire",
    "SF": "Scellement de Fissure",
    "Sc fissure": "Scellement de fissure",
    "F": "Facette",
    "Onlay": "Onlay",
    "Inlay": "Inlay",
    
    # Controls and follow-ups
    "Ctl": "Contrôle",
    "Ctl post op": "Contrôle post-opératoire",
    "Ctl post blanchiment": "Contrôle post-blanchiment",
    "Ctl pre empreinte": "Contrôle pré-empreinte",
    "Ctl pré couronne": "Contrôle pré-couronne",
    
    # Procedures
    "Empreinte": "Prise d'empreinte",
    "Provisoire": "Couronne provisoire",
    "Essai": "Essai prothétique",
    "Scellement": "Scellement définitif",
    "Mock-up": "Mock-up esthétique",
    "Wax-up": "Wax-up prothétique",
    "Obturation": "Obturation canalaire",
    "Désinfection": "Désinfection canalaire",
    "Polissage": "Polissage final",
    "Revisser": "Revisser implant",
    "Dévisser": "Dévisser couronne sur implant",
    "Démonter": "Démonter ancienne restauration",
    
    # Time abbreviations
    "sem": "semaine",
    "mois": "mois",
    "j": "jours",
    "h": "heure",
    "min": "minutes",
    "1sem": "1 semaine",
    "2sem": "2 semaines",
    "3sem": "3 semaines",
    "1mois": "1 mois",
    "2mois": "2 mois",
    "3mois": "3 mois",
    "10j": "10 jours",
    "2j": "2 jours",
    "3j": "3 jours",
    
    # Dental surfaces
    "O": "Occlusal",
    "M": "Mésial",
    "D": "Distal",
    "L": "Lingual",
    "V": "Vestibulaire",
    "P": "Palatin",
    "MOD": "Mésio-Occluso-Distal",
    "MO": "Mésio-Occlusal",
    "DO": "Disto-Occlusal",
    "ML": "Mésio-Lingual",
    "DL": "Disto-Lingual",
    "MV": "Mésio-Vestibulaire",
    "DV": "Disto-Vestibulaire",
    
    # Specialists and locations
    "Dr": "Docteur",
    "NB": "Dr. Nacer Benbachir",
    "VR": "Dr. Virginie Rouiller",
    "sup": "supérieur",
    "inf": "inférieur",
    
    # Medical terms
    "Nm": "Newton-mètre",
    "Cone beam": "Cone beam CT",
    "Radio panoramique": "Radiographie panoramique",
    "Anesthésie": "Anesthésie locale",
    "Ordonnance": "Prescription médicale",
    "Curasept": "Bain de bouche antiseptique",
    "Teflon": "Teflon d'étanchéité",
    "Bio oss": "Substitut osseux",
    "Etkon": "Laboratoire de prothèse",
    
    # Dental numbering (FDI)
    "11": "Incisive centrale supérieure droite",
    "12": "Incisive latérale supérieure droite",
    "13": "Canine supérieure droite",
    "14": "Première prémolaire supérieure droite",
    "15": "Deuxième prémolaire supérieure droite",
    "16": "Première molaire supérieure droite",
    "17": "Deuxième molaire supérieure droite",
    "18": "Troisième molaire supérieure droite",
    "21": "Incisive centrale supérieure gauche",
    "22": "Incisive latérale supérieure gauche",
    "23": "Canine supérieure gauche",
    "24": "Première prémolaire supérieure gauche",
    "25": "Deuxième prémolaire supérieure gauche",
    "26": "Première molaire supérieure gauche",
    "27": "Deuxième molaire supérieure gauche",
    "28": "Troisième molaire supérieure gauche",
    "31": "Incisive centrale inférieure gauche",
    "32": "Incisive latérale inférieure gauche",
    "33": "Canine inférieure gauche",
    "34": "Première prémolaire inférieure gauche",
    "35": "Deuxième prémolaire inférieure gauche",
    "36": "Première molaire inférieure gauche",
    "37": "Deuxième molaire inférieure gauche",
    "38": "Troisième molaire inférieure gauche",
    "41": "Incisive centrale inférieure droite",
    "42": "Incisive latérale inférieure droite",
    "43": "Canine inférieure droite",
    "44": "Première prémolaire inférieure droite",
    "45": "Deuxième prémolaire inférieure droite",
    "46": "Première molaire inférieure droite",
    "47": "Deuxième molaire inférieure droite",
    "48": "Troisième molaire inférieure droite",
}

# Treatment categories for better organization
TREATMENT_CATEGORIES = {
    "Composite": ["Cpr O", "Cpr OM", "Cpr MOD", "Cpr M", "Cpr D", "Cpr collet", "Cpr angle", "Cpr bord libre"],
    "Endodontie": ["TR", "Traitement de racine", "Désobturation", "Désinfection", "Obturation"],
    "Prothèse": ["CC", "CPR", "Couronne", "Facette", "Onlay", "Inlay", "Pont collé"],
    "Chirurgie": ["AV", "Ext", "Extraction", "Implant", "GBR", "GC", "SL", "Résection apicale"],
    "Prévention": ["Det", "HD", "SF", "Scellement de fissure", "Détartrage"],
    "Esthétique": ["F", "Facette", "Blanchiment", "BNV", "Mock-up", "Wax-up"],
    "Parodontie": ["Curetage", "Greffe conjonctif", "Mesure de poche"],
    "Implantologie": ["Implant", "Couronne sur implant", "Prothèse complète sur implant", "Sinus lift"],
    "Contrôles": ["Ctl", "Ctl post op", "Ctl post blanchiment", "Essai", "Scellement"]
}

def expand_abbreviations(text):
    """Expand dental abbreviations in text"""
    expanded_text = text
    
    # Sort by length (longest first) to avoid partial replacements
    sorted_abbrevs = sorted(DENTAL_ABBREVIATIONS.items(), key=lambda x: len(x[0]), reverse=True)
    
    for abbrev, full_form in sorted_abbrevs:
        # Use word boundaries to avoid partial matches
        pattern = r'\b' + re.escape(abbrev) + r'\b'
        expanded_text = re.sub(pattern, full_form, expanded_text, flags=re.IGNORECASE)
    
    return expanded_text

def categorize_treatment(text):
    """Categorize treatment based on content"""
    text_lower = text.lower()
    categories = []
    
    for category, keywords in TREATMENT_CATEGORIES.items():
        for keyword in keywords:
            if keyword.lower() in text_lower:
                categories.append(category)
                break
    
    return categories if categories else ["Général"]

def enhance_treatment_data(treatment_data):
    """Enhance treatment data with expanded abbreviations and categories"""
    enhanced_data = treatment_data.copy()
    
    # Expand abbreviations in key fields
    if 'consultation_text' in enhanced_data:
        enhanced_data['consultation_text_expanded'] = expand_abbreviations(enhanced_data['consultation_text'])
    
    if 'content' in enhanced_data:
        enhanced_data['content_expanded'] = expand_abbreviations(enhanced_data['content'])
    
    # Enhance treatment sequence
    if 'treatment_sequence' in enhanced_data:
        enhanced_sequence = []
        for appointment in enhanced_data['treatment_sequence']:
            enhanced_appointment = appointment.copy()
            
            # Expand abbreviations in treatment description
            if 'traitement' in enhanced_appointment:
                enhanced_appointment['traitement_expanded'] = expand_abbreviations(enhanced_appointment['traitement'])
                enhanced_appointment['categories'] = categorize_treatment(enhanced_appointment['traitement'])
            
            # Expand abbreviations in remarks
            if 'remarque' in enhanced_appointment:
                enhanced_appointment['remarque_expanded'] = expand_abbreviations(enhanced_appointment['remarque'])
            
            # Expand abbreviations in doctor field
            if 'dr' in enhanced_appointment:
                enhanced_appointment['dr_expanded'] = expand_abbreviations(enhanced_appointment['dr'])
            
            # Expand abbreviations in delay
            if 'delai' in enhanced_appointment:
                enhanced_appointment['delai_expanded'] = expand_abbreviations(enhanced_appointment['delai'])
            
            enhanced_sequence.append(enhanced_appointment)
        
        enhanced_data['treatment_sequence_enhanced'] = enhanced_sequence
    
    return enhanced_data

def create_searchable_content(treatment_data):
    """Create searchable content from treatment data"""
    searchable_parts = []
    
    # Add consultation text
    if 'consultation_text' in treatment_data:
        searchable_parts.append(f"Consultation: {treatment_data['consultation_text']}")
        if 'consultation_text_expanded' in treatment_data:
            searchable_parts.append(f"Consultation étendue: {treatment_data['consultation_text_expanded']}")
    
    # Add content
    if 'content' in treatment_data:
        searchable_parts.append(f"Contenu: {treatment_data['content']}")
        if 'content_expanded' in treatment_data:
            searchable_parts.append(f"Contenu étendu: {treatment_data['content_expanded']}")
    
    # Add treatment sequence information
    if 'treatment_sequence' in treatment_data:
        treatments = []
        for appointment in treatment_data['treatment_sequence']:
            if 'traitement' in appointment:
                treatments.append(appointment['traitement'])
        
        if treatments:
            searchable_parts.append(f"Traitements: {', '.join(treatments)}")
    
    # Add enhanced treatment sequence
    if 'treatment_sequence_enhanced' in treatment_data:
        enhanced_treatments = []
        categories = set()
        for appointment in treatment_data['treatment_sequence_enhanced']:
            if 'traitement_expanded' in appointment:
                enhanced_treatments.append(appointment['traitement_expanded'])
            if 'categories' in appointment:
                categories.update(appointment['categories'])
        
        if enhanced_treatments:
            searchable_parts.append(f"Traitements étendus: {', '.join(enhanced_treatments)}")
        if categories:
            searchable_parts.append(f"Catégories: {', '.join(categories)}")
    
    return "\n".join(searchable_parts)

def save_abbreviations_dict():
    """Save the abbreviations dictionary to a JSON file"""
    output_path = Path("DATA/IDEAL_SEQUENCES")
    output_path.mkdir(exist_ok=True)
    
    abbreviations_file = output_path / "dental_abbreviations.json"
    with open(abbreviations_file, 'w', encoding='utf-8') as f:
        json.dump({
            "abbreviations": DENTAL_ABBREVIATIONS,
            "categories": TREATMENT_CATEGORIES
        }, f, indent=2, ensure_ascii=False)
    
    print(f"Saved abbreviations dictionary to {abbreviations_file}")

if __name__ == "__main__":
    # Save abbreviations dictionary
    save_abbreviations_dict()
    
    # Test abbreviation expansion
    test_text = "Plan de ttt pour la 26: 26 dém. CC + TR 3 canaux + MA + CC"
    expanded = expand_abbreviations(test_text)
    print(f"Original: {test_text}")
    print(f"Expanded: {expanded}")
    
    # Test categorization
    categories = categorize_treatment("Cpr MOD + TR 3 canaux")
    print(f"Categories: {categories}")