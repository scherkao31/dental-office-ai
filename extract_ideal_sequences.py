#!/usr/bin/env python
"""
Script to extract content from ideal treatment sequence documents
"""

import os
import json
from docx import Document
from pathlib import Path

def extract_docx_content(file_path):
    """Extract text content from a Word document"""
    try:
        doc = Document(file_path)
        text_content = []
        
        for paragraph in doc.paragraphs:
            if paragraph.text.strip():
                text_content.append(paragraph.text.strip())
        
        return "\n".join(text_content)
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return None

def main():
    """Extract content from all ideal sequence documents"""
    sequences_dir = Path("ideal_sequences_of_treatements")
    
    if not sequences_dir.exists():
        print(f"Directory {sequences_dir} not found")
        return
    
    extracted_sequences = []
    
    # Process all .docx files in the directory
    for file_path in sequences_dir.glob("*.docx"):
        print(f"Processing {file_path}...")
        
        content = extract_docx_content(file_path)
        if content:
            sequence_data = {
                "filename": file_path.name,
                "title": file_path.stem.replace("_", " ").title(),
                "content": content,
                "type": "ideal_sequence",
                "source": "dentist_guidelines"
            }
            extracted_sequences.append(sequence_data)
            print(f"Extracted {len(content)} characters from {file_path.name}")
    
    # Save extracted sequences to JSON
    output_path = Path("DATA/IDEAL_SEQUENCES")
    output_path.mkdir(exist_ok=True)
    
    output_file = output_path / "ideal_sequences.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(extracted_sequences, f, indent=2, ensure_ascii=False)
    
    print(f"\nExtracted {len(extracted_sequences)} ideal sequences")
    print(f"Saved to {output_file}")
    
    # Also save individual files for easier access
    for i, sequence in enumerate(extracted_sequences):
        individual_file = output_path / f"sequence_{i+1}.json"
        with open(individual_file, 'w', encoding='utf-8') as f:
            json.dump(sequence, f, indent=2, ensure_ascii=False)
    
    return extracted_sequences

if __name__ == "__main__":
    sequences = main()
    
    # Display preview of extracted content
    for sequence in sequences:
        print(f"\n{'='*50}")
        print(f"File: {sequence['filename']}")
        print(f"Title: {sequence['title']}")
        print(f"Content preview: {sequence['content'][:200]}...")