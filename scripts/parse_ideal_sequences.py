#!/usr/bin/env python3
"""
Parse ideal sequence DOCX files and create individual JSON files for each treatment type
"""

import os
import json
from pathlib import Path
from docx import Document
import re

def clean_text(text):
    """Clean and normalize text"""
    if not text:
        return ""
    return text.strip().replace('\n', ' ').replace('\r', '')

def extract_treatment_name(text):
    """Extract treatment name from 'A faire' text"""
    # Remove 'A faire' and clean up
    text = text.replace('A faire', '').replace('à faire', '').strip()
    # Remove leading dash or hyphen
    text = re.sub(r'^[-–]\s*', '', text)
    return text

def normalize_filename(name):
    """Convert treatment name to valid filename"""
    # Remove special characters and replace spaces with underscores
    name = re.sub(r'[^\w\s-]', '', name.lower())
    name = re.sub(r'[-\s]+', '_', name)
    return f"ideal_sequence_{name}.json"

def parse_docx_table(doc_path):
    """Parse DOCX file and extract treatment sequences"""
    doc = Document(doc_path)
    
    all_treatments = []
    current_treatment = None
    
    for table_idx, table in enumerate(doc.tables):
        # Skip empty tables
        if len(table.rows) < 2:
            continue
            
        # Get headers from first row
        headers = []
        for cell in table.rows[0].cells:
            headers.append(clean_text(cell.text).lower())
        
        print(f"\nTable {table_idx + 1} headers: {headers}")
        
        # Find column indices
        rdv_idx = next((i for i, h in enumerate(headers) if 'rdv' in h), None)
        traitement_idx = next((i for i, h in enumerate(headers) if 'traitement' in h or 'intervention' in h), None)
        duree_idx = next((i for i, h in enumerate(headers) if 'durée' in h or 'duree' in h), None)
        delai_idx = next((i for i, h in enumerate(headers) if 'délai' in h or 'delai' in h), None)
        dr_idx = next((i for i, h in enumerate(headers) if 'dr' in h or 'docteur' in h or 'praticien' in h), None)
        remarque_idx = next((i for i, h in enumerate(headers) if 'remarque' in h or 'observation' in h), None)
        
        print(f"Column indices - RDV: {rdv_idx}, Traitement: {traitement_idx}, Durée: {duree_idx}")
        
        if rdv_idx is None or traitement_idx is None:
            print(f"Warning: Could not find RDV or Traitement columns in table")
            continue
        
        # Process each row
        for row_idx, row in enumerate(table.rows[1:], 1):
            cells = row.cells
            
            # Get RDV cell text
            rdv_text = clean_text(cells[rdv_idx].text) if rdv_idx < len(cells) else ""
            
            # Debug first few rows
            if row_idx <= 3:
                print(f"Row {row_idx}: RDV='{rdv_text}', Traitement='{clean_text(cells[traitement_idx].text) if traitement_idx < len(cells) else ''}'[:50]")
            
            # Also check treatment column for "A faire"
            traitement_text = clean_text(cells[traitement_idx].text) if traitement_idx < len(cells) else ""
            
            # Check if this is a new treatment (contains "A faire" or "à faire" in either column)
            if 'faire' in rdv_text.lower() or 'faire' in traitement_text.lower():
                # Save previous treatment if exists
                if current_treatment and current_treatment['treatment_sequence']:
                    all_treatments.append(current_treatment)
                
                # Start new treatment
                treatment_name = ""
                if 'faire' in rdv_text.lower():
                    treatment_name = extract_treatment_name(rdv_text)
                if not treatment_name and 'faire' in traitement_text.lower():
                    treatment_name = extract_treatment_name(traitement_text)
                if not treatment_name:
                    # Get from whichever column has content
                    treatment_name = traitement_text or rdv_text or "Unknown Treatment"
                
                current_treatment = {
                    'consultation_text': treatment_name,
                    'type': 'ideal_sequence',
                    'source': os.path.basename(doc_path),
                    'treatment_sequence': []
                }
                print(f"Found new treatment: {treatment_name}")
                continue
            
            # If we have a current treatment and this row has treatment data
            if current_treatment and traitement_text and not 'faire' in traitement_text.lower():
                # For ideal sequences, rows often don't have RDV numbers
                # We'll auto-increment based on existing sequence
                if rdv_text and rdv_text.isdigit():
                    rdv_number = int(rdv_text)
                else:
                    # Auto-increment from last RDV
                    if current_treatment['treatment_sequence']:
                        rdv_number = current_treatment['treatment_sequence'][-1]['rdv'] + 1
                    else:
                        rdv_number = 1
                
                # Extract appointment data
                appointment = {
                    'rdv': rdv_number,
                'traitement': clean_text(cells[traitement_idx].text) if traitement_idx < len(cells) else "",
                'duree': clean_text(cells[duree_idx].text) if duree_idx and duree_idx < len(cells) else "",
                'delai': clean_text(cells[delai_idx].text) if delai_idx and delai_idx < len(cells) else "",
                'dr': clean_text(cells[dr_idx].text) if dr_idx and dr_idx < len(cells) else "",
                'date': "",  # Empty as these are templates
                'remarque': clean_text(cells[remarque_idx].text) if remarque_idx and remarque_idx < len(cells) else ""
            }
            
                # Only add if there's actual treatment content
                if appointment['traitement']:
                    current_treatment['treatment_sequence'].append(appointment)
                    print(f"  Added RDV {rdv_number}: {appointment['traitement'][:50]}...")
    
    # Don't forget the last treatment
    if current_treatment and current_treatment['treatment_sequence']:
        all_treatments.append(current_treatment)
    
    return all_treatments

def main():
    # Define paths
    base_dir = Path(__file__).parent.parent
    ideal_seq_dir = base_dir / "ideal_sequences_of_treatements"
    output_dir = base_dir / "DATA" / "IDEAL_SEQUENCES_JSON"
    
    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Process each DOCX file
    all_sequences = []
    
    for docx_file in ideal_seq_dir.glob("*.docx"):
        print(f"\nProcessing: {docx_file.name}")
        
        try:
            treatments = parse_docx_table(docx_file)
            
            # Save each treatment as a separate JSON file
            for treatment in treatments:
                # Generate filename
                filename = normalize_filename(treatment['consultation_text'])
                output_path = output_dir / filename
                
                # Add metadata
                treatment['filename'] = filename
                treatment['original_docx'] = docx_file.name
                
                # Save individual JSON
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(treatment, f, ensure_ascii=False, indent=2)
                
                print(f"  Created: {filename}")
                all_sequences.append(treatment)
                
        except Exception as e:
            print(f"Error processing {docx_file.name}: {str(e)}")
            import traceback
            traceback.print_exc()
    
    # Also create a summary file
    summary_path = output_dir / "_all_ideal_sequences.json"
    with open(summary_path, 'w', encoding='utf-8') as f:
        json.dump({
            'total_sequences': len(all_sequences),
            'sequences': all_sequences
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Processed {len(all_sequences)} ideal treatment sequences")
    print(f"📁 Output directory: {output_dir}")

if __name__ == "__main__":
    main()