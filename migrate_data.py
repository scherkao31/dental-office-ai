#!/usr/bin/env python
"""
Migration script to move data from old database structure to new SQLAlchemy models
"""
import os
import sys
import json
import sqlite3
from datetime import datetime
from app import create_app, db
from app.models import Patient, Appointment, TreatmentPlan, Invoice, InvoiceItem, Devis, DevisItem, DentalPricing

def migrate_from_old_database(old_db_path='practice.db'):
    """Migrate data from old database to new structure"""
    
    # Create app context
    app = create_app('development')
    
    with app.app_context():
        # Create all tables
        db.create_all()
        
        # Connect to old database
        old_conn = sqlite3.connect(old_db_path)
        old_conn.row_factory = sqlite3.Row
        cursor = old_conn.cursor()
        
        print("Starting migration...")
        
        # Migrate patients
        print("Migrating patients...")
        cursor.execute("SELECT * FROM patients")
        patients = cursor.fetchall()
        
        for p in patients:
            patient = Patient(
                id=p['id'],
                first_name=p['first_name'],
                last_name=p['last_name'],
                email=p['email'],
                phone=p['phone'],
                birth_date=datetime.fromisoformat(p['birth_date']) if p['birth_date'] else None,
                address=p['address'],
                medical_history=p['medical_history'],
                allergies=p['allergies'],
                emergency_contact=p['emergency_contact'],
                insurance_info=p['insurance_info'],
                notes=p['notes'],
                created_at=datetime.fromisoformat(p['created_at']) if p['created_at'] else None,
                updated_at=datetime.fromisoformat(p['updated_at']) if p['updated_at'] else None
            )
            db.session.add(patient)
        
        print(f"  Migrated {len(patients)} patients")
        
        # Migrate appointments
        print("Migrating appointments...")
        cursor.execute("SELECT * FROM appointments")
        appointments = cursor.fetchall()
        
        for a in appointments:
            appointment = Appointment(
                id=a['id'],
                patient_id=a['patient_id'],
                appointment_date=datetime.fromisoformat(a['appointment_date']).date(),
                appointment_time=datetime.fromisoformat(a['appointment_time']).time(),
                duration_minutes=a['duration_minutes'],
                treatment_type=a['treatment_type'],
                status=a['status'],
                doctor=a['doctor'],
                room=a['room'],
                notes=a['notes'],
                treatment_plan_id=a['treatment_plan_id'],
                created_at=datetime.fromisoformat(a['created_at']) if a['created_at'] else None,
                updated_at=datetime.fromisoformat(a['updated_at']) if a['updated_at'] else None
            )
            db.session.add(appointment)
        
        print(f"  Migrated {len(appointments)} appointments")
        
        # Migrate treatment plans
        print("Migrating treatment plans...")
        cursor.execute("SELECT * FROM treatment_plans")
        treatment_plans = cursor.fetchall()
        
        for t in treatment_plans:
            treatment_plan = TreatmentPlan(
                id=t['id'],
                patient_id=t['patient_id'],
                plan_data=t['plan_data'],
                consultation_text=t['consultation_text'],
                status=t['status'],
                created_at=datetime.fromisoformat(t['created_at']) if t['created_at'] else None,
                updated_at=datetime.fromisoformat(t['updated_at']) if t['updated_at'] else None
            )
            db.session.add(treatment_plan)
        
        print(f"  Migrated {len(treatment_plans)} treatment plans")
        
        # Migrate dental pricing
        print("Migrating dental pricing...")
        cursor.execute("SELECT * FROM dental_pricing")
        pricing_items = cursor.fetchall()
        
        for p in pricing_items:
            pricing = DentalPricing(
                id=p['id'],
                tarmed_code=p['tarmed_code'],
                description_fr=p['description_fr'],
                description_de=p['description_de'],
                category=p['category'],
                base_price=p['base_price'],
                unit=p['unit'],
                active=bool(p['active']) if 'active' in p.keys() else True,
                created_at=datetime.fromisoformat(p['created_at']) if p['created_at'] else None,
                updated_at=datetime.fromisoformat(p['updated_at']) if p['updated_at'] else None
            )
            db.session.add(pricing)
        
        print(f"  Migrated {len(pricing_items)} pricing items")
        
        # Check if financial tables exist
        tables = cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()
        table_names = [t['name'] for t in tables]
        
        # Migrate invoices if table exists
        if 'invoices' in table_names:
            print("Migrating invoices...")
            cursor.execute("SELECT * FROM invoices")
            invoices = cursor.fetchall()
            
            for i in invoices:
                invoice = Invoice(
                    id=i['id'],
                    invoice_number=i['invoice_number'],
                    patient_id=i['patient_id'],
                    issue_date=datetime.fromisoformat(i['issue_date']).date(),
                    due_date=datetime.fromisoformat(i['due_date']).date() if i['due_date'] else None,
                    subtotal=i['subtotal'],
                    tax_amount=i['tax_amount'],
                    total_amount=i['total_amount'],
                    paid_amount=i.get('paid_amount', 0),
                    status=i['status'],
                    notes=i['notes'],
                    created_at=datetime.fromisoformat(i['created_at']) if i['created_at'] else None,
                    updated_at=datetime.fromisoformat(i['updated_at']) if i['updated_at'] else None
                )
                db.session.add(invoice)
            
            print(f"  Migrated {len(invoices)} invoices")
        
        # Commit all changes
        try:
            db.session.commit()
            print("\nMigration completed successfully!")
        except Exception as e:
            db.session.rollback()
            print(f"\nError during migration: {str(e)}")
            raise
        finally:
            old_conn.close()

def backup_old_database(db_path='practice.db'):
    """Create a backup of the old database"""
    import shutil
    from datetime import datetime
    
    if os.path.exists(db_path):
        backup_name = f"{db_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        shutil.copy2(db_path, backup_name)
        print(f"Created backup: {backup_name}")
        return backup_name
    return None

if __name__ == '__main__':
    # Check if old database exists
    old_db_path = 'practice.db'
    
    if not os.path.exists(old_db_path):
        print("No existing database found. Creating fresh database...")
        app = create_app('development')
        with app.app_context():
            db.create_all()
            print("Database created successfully!")
    else:
        # Backup existing database
        print("Found existing database. Creating backup...")
        backup_path = backup_old_database(old_db_path)
        
        if backup_path:
            # Perform migration
            try:
                migrate_from_old_database(old_db_path)
            except Exception as e:
                print(f"Migration failed: {str(e)}")
                print("You can restore from backup:", backup_path)
                sys.exit(1)
        else:
            print("Could not create backup. Migration aborted.")
            sys.exit(1)