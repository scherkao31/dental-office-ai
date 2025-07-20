#!/usr/bin/env python3
"""
Initialize database with tables and default data
Usage: python scripts/init_database.py
"""

import os
import sys

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import TreatmentTemplate

def init_database():
    """Initialize database with tables and default data"""
    # Create app with production config (will use DATABASE_URL if available)
    app = create_app(os.environ.get('FLASK_CONFIG', 'production'))
    
    with app.app_context():
        # Create all tables
        print("Creating database tables...")
        db.create_all()
        print("✓ Database tables created successfully!")
        
        # Check if we need to add default data
        if TreatmentTemplate.query.count() == 0:
            print("\nAdding default treatment templates...")
            
            default_templates = [
                {
                    'name': 'Consultation',
                    'description': 'Consultation initiale avec examen complet',
                    'default_duration': 30,
                    'default_cost': 80
                },
                {
                    'name': 'Détartrage',
                    'description': 'Nettoyage professionnel des dents',
                    'default_duration': 45,
                    'default_cost': 120
                },
                {
                    'name': 'Obturation composite',
                    'description': 'Plombage blanc esthétique',
                    'default_duration': 45,
                    'default_cost': 180
                },
                {
                    'name': 'Couronne céramique',
                    'description': 'Couronne tout céramique',
                    'default_duration': 60,
                    'default_cost': 1200
                },
                {
                    'name': 'Extraction simple',
                    'description': 'Extraction dentaire simple',
                    'default_duration': 30,
                    'default_cost': 150
                },
                {
                    'name': 'Traitement de canal',
                    'description': 'Dévitalisation et traitement endodontique',
                    'default_duration': 90,
                    'default_cost': 800
                },
                {
                    'name': 'Blanchiment',
                    'description': 'Blanchiment dentaire professionnel',
                    'default_duration': 60,
                    'default_cost': 400
                }
            ]
            
            for template_data in default_templates:
                template = TreatmentTemplate(**template_data)
                db.session.add(template)
            
            db.session.commit()
            print(f"✓ Added {len(default_templates)} default treatment templates")
        else:
            print("✓ Treatment templates already exist")
        
        print("\nDatabase initialization complete!")

if __name__ == "__main__":
    init_database()