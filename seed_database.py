#!/usr/bin/env python3
"""
Database Seeder - Populates the database with realistic sample data
"""
import random
import json
from datetime import datetime, timedelta, date, time
from uuid import uuid4
from app import create_app, db
from app.models.patient import Patient
from app.models.appointment import Appointment
from app.models.treatment import TreatmentPlan
from app.models.financial import Invoice, InvoiceItem, Payment, Devis, DevisItem, PaymentPlan, ScheduledPayment
from app.models.pricing import DentalPricing
from app.models.schedule import ScheduleBlock
from app.models.education import PatientEducation

# Swiss sample data
SWISS_FIRST_NAMES = [
    "Jean", "Marie", "Pierre", "Sophie", "Luc", "Anne", "François", "Catherine",
    "Michel", "Isabelle", "Daniel", "Nathalie", "Philippe", "Sylvie", "Laurent",
    "Véronique", "Thomas", "Christine", "Nicolas", "Sandrine", "Marc", "Céline",
    "Alexandre", "Emma", "Lucas", "Léa", "Gabriel", "Chloé", "Louis", "Sarah"
]

SWISS_LAST_NAMES = [
    "Favre", "Rochat", "Muller", "Schneider", "Weber", "Meyer", "Schmid",
    "Keller", "Huber", "Gerber", "Brunner", "Baumann", "Zimmermann", "Moser",
    "Widmer", "Fischer", "Roth", "Bühler", "Steiner", "Wagner", "Hofer",
    "Lehmann", "Meier", "Berger", "Frei", "Gasser", "Sutter", "Graf"
]

SWISS_CITIES = [
    ("Genève", "1200"), ("Lausanne", "1000"), ("Zurich", "8000"), 
    ("Bâle", "4000"), ("Berne", "3000"), ("Winterthur", "8400"),
    ("Lucerne", "6000"), ("St-Gall", "9000"), ("Lugano", "6900"),
    ("Bienne", "2500"), ("Neuchâtel", "2000"), ("Fribourg", "1700")
]

TREATMENT_TYPES = [
    "Consultation", "Détartrage", "Carie simple", "Carie complexe",
    "Traitement de racine", "Couronne", "Bridge", "Implant",
    "Extraction", "Orthodontie", "Blanchiment", "Urgence",
    "Contrôle annuel", "Radiographie", "Prothèse", "Chirurgie"
]

def create_patients(num_patients=50):
    """Create sample patients with Swiss data"""
    patients = []
    
    for i in range(num_patients):
        first_name = random.choice(SWISS_FIRST_NAMES)
        last_name = random.choice(SWISS_LAST_NAMES)
        city, postal_code = random.choice(SWISS_CITIES)
        
        # Generate birth date (age between 5 and 85)
        age = random.randint(5, 85)
        birth_date = date.today() - timedelta(days=age*365 + random.randint(0, 364))
        
        patient = Patient(
            id=str(uuid4()),
            first_name=first_name,
            last_name=last_name,
            email=f"{first_name.lower()}.{last_name.lower()}@email.ch",
            phone=f"07{random.randint(6,9)} {random.randint(100,999)} {random.randint(10,99)} {random.randint(10,99)}",
            birth_date=birth_date,
            address=f"Rue du Lac {random.randint(1,100)}, {postal_code} {city}",
            medical_history=random.choice([
                "RAS", 
                "Allergie pénicilline", 
                "Diabète type 2", 
                "Hypertension", 
                "Asthme léger",
                "Allergie aux anesthésiques locaux"
            ]),
            allergies=random.choice(["Aucune", "Pénicilline", "Latex", "Iode", "Aucune connue"]),
            emergency_contact=f"{random.choice(SWISS_FIRST_NAMES)} {random.choice(SWISS_LAST_NAMES)} - 07{random.randint(6,9)} {random.randint(100,999)} {random.randint(10,99)} {random.randint(10,99)}",
            insurance_info=random.choice([
                "CSS - Base + Complémentaire dentaire",
                "Swica - Completa TOP",
                "Helsana - TOP + SANA",
                "Assura - Base uniquement",
                "Groupe Mutuel - Global Classic",
                "Sanitas - Compact Basic + Dental"
            ]),
            notes=random.choice([
                "Patient régulier, très ponctuel",
                "Anxieux, prévoir plus de temps",
                "Excellent patient",
                "Tendance à annuler les RDV",
                "Préfère les RDV en matinée",
                ""
            ]),
            created_at=datetime.now() - timedelta(days=random.randint(0, 730))
        )
        
        patients.append(patient)
        db.session.add(patient)
    
    db.session.commit()
    print(f"✅ Created {len(patients)} patients")
    return patients

def create_pricing():
    """Create dental pricing with TARMED codes"""
    pricing_data = [
        # Consultations et examens
        ("4.0010", "Consultation, examen buccal", "Consultation", 65.00, "séance"),
        ("4.0020", "Consultation urgence", "Consultation", 120.00, "séance"),
        ("4.0030", "Bilan complet avec radiographies", "Consultation", 180.00, "séance"),
        
        # Radiographies
        ("4.0110", "Radiographie intra-orale", "Radiographie", 25.00, "cliché"),
        ("4.0120", "Radiographie panoramique", "Radiographie", 120.00, "cliché"),
        ("4.0130", "Cone Beam CT", "Radiographie", 350.00, "examen"),
        
        # Prophylaxie
        ("4.0210", "Détartrage simple", "Prophylaxie", 120.00, "séance"),
        ("4.0220", "Détartrage avec polissage", "Prophylaxie", 160.00, "séance"),
        ("4.0230", "Fluoration", "Prophylaxie", 40.00, "arcade"),
        
        # Obturations (Caries)
        ("4.0310", "Obturation composite 1 face", "Restauration", 180.00, "dent"),
        ("4.0320", "Obturation composite 2 faces", "Restauration", 220.00, "dent"),
        ("4.0330", "Obturation composite 3 faces", "Restauration", 280.00, "dent"),
        ("4.0340", "Reconstruction coronaire", "Restauration", 350.00, "dent"),
        
        # Endodontie
        ("4.0410", "Traitement de racine monoradiculaire", "Endodontie", 600.00, "dent"),
        ("4.0420", "Traitement de racine biradiculaire", "Endodontie", 800.00, "dent"),
        ("4.0430", "Traitement de racine triradiculaire", "Endodontie", 1000.00, "dent"),
        ("4.0440", "Retraitement endodontique", "Endodontie", 1200.00, "dent"),
        
        # Prothèses fixes
        ("4.0510", "Couronne céramo-métallique", "Prothèse", 1200.00, "élément"),
        ("4.0520", "Couronne tout céramique", "Prothèse", 1500.00, "élément"),
        ("4.0530", "Bridge 3 éléments", "Prothèse", 3600.00, "bridge"),
        ("4.0540", "Inlay/Onlay céramique", "Prothèse", 900.00, "élément"),
        
        # Chirurgie
        ("4.0610", "Extraction simple", "Chirurgie", 180.00, "dent"),
        ("4.0620", "Extraction chirurgicale", "Chirurgie", 350.00, "dent"),
        ("4.0630", "Extraction dent de sagesse", "Chirurgie", 500.00, "dent"),
        ("4.0640", "Résection apicale", "Chirurgie", 600.00, "dent"),
        
        # Implantologie
        ("4.0710", "Pose implant", "Implantologie", 1800.00, "implant"),
        ("4.0720", "Pilier implantaire", "Implantologie", 400.00, "pilier"),
        ("4.0730", "Couronne sur implant", "Implantologie", 1200.00, "couronne"),
        ("4.0740", "Greffe osseuse", "Implantologie", 800.00, "site"),
        
        # Parodontologie
        ("4.0810", "Traitement parodontal par quadrant", "Parodontologie", 300.00, "quadrant"),
        ("4.0820", "Chirurgie parodontale", "Parodontologie", 600.00, "quadrant"),
        ("4.0830", "Greffe gingivale", "Parodontologie", 800.00, "site"),
        
        # Orthodontie
        ("4.0910", "Consultation orthodontique", "Orthodontie", 150.00, "séance"),
        ("4.0920", "Appareil fixe complet", "Orthodontie", 6000.00, "traitement"),
        ("4.0930", "Appareil amovible", "Orthodontie", 1200.00, "appareil"),
        ("4.0940", "Contention", "Orthodontie", 300.00, "arcade"),
        
        # Esthétique
        ("4.1010", "Blanchiment au fauteuil", "Esthétique", 600.00, "traitement"),
        ("4.1020", "Facette céramique", "Esthétique", 1200.00, "dent"),
        ("4.1030", "Composite esthétique", "Esthétique", 250.00, "dent")
    ]
    
    pricing_objects = []
    for code, desc, category, price, unit in pricing_data:
        pricing = DentalPricing(
            id=str(uuid4()),
            tarmed_code=code,
            description_fr=desc,
            description_de=desc,  # In real app, would translate
            category=category,
            base_price=price,
            unit=unit,
            active=True
        )
        pricing_objects.append(pricing)
        db.session.add(pricing)
    
    db.session.commit()
    print(f"✅ Created {len(pricing_objects)} pricing entries")
    return pricing_objects

def create_appointments(patients, num_per_patient=3):
    """Create appointments for patients"""
    appointments = []
    
    for patient in patients:
        # Create past and future appointments
        for i in range(num_per_patient):
            # Mix of past and future appointments
            if i < num_per_patient // 2:
                # Past appointments
                days_ago = random.randint(1, 365)
                appointment_date = date.today() - timedelta(days=days_ago)
                status = random.choice(['completed', 'completed', 'no-show'])
            else:
                # Future appointments
                days_ahead = random.randint(1, 90)
                appointment_date = date.today() + timedelta(days=days_ahead)
                status = 'scheduled'
            
            # Generate time between 8:00 and 17:00
            hour = random.randint(8, 16)
            minute = random.choice([0, 15, 30, 45])
            appointment_time = time(hour, minute)
            
            appointment = Appointment(
                id=str(uuid4()),
                patient_id=patient.id,
                appointment_date=appointment_date,
                appointment_time=appointment_time,
                duration_minutes=random.choice([30, 45, 60, 90]),
                treatment_type=random.choice(TREATMENT_TYPES),
                status=status,
                doctor="Dr. Morard",
                room=random.choice(["Salle 1", "Salle 2", "Salle 3"]),
                notes=random.choice([
                    "", 
                    "Prévoir anesthésie", 
                    "Patient anxieux",
                    "Contrôle post-opératoire",
                    "Suite du traitement précédent"
                ]),
                created_at=datetime.now() - timedelta(days=random.randint(0, 30))
            )
            
            appointments.append(appointment)
            db.session.add(appointment)
    
    db.session.commit()
    print(f"✅ Created {len(appointments)} appointments")
    return appointments

def create_treatment_plans(patients):
    """Create treatment plans for some patients"""
    treatment_plans = []
    
    # Create plans for 30% of patients
    selected_patients = random.sample(patients, len(patients) // 3)
    
    for patient in selected_patients:
        plan_data = {
            "patient_name": f"{patient.first_name} {patient.last_name}",
            "treatments": [
                {
                    "description": random.choice([
                        "Couronne sur 16",
                        "Bridge 24-26",
                        "Implant 36",
                        "Traitement de racine 21",
                        "Composite 15 et 16"
                    ]),
                    "tooth_number": random.randint(11, 48),
                    "cost": random.randint(500, 3000),
                    "duration": f"{random.randint(1, 4)} séances",
                    "priority": random.choice(["Urgent", "Normal", "Préventif"])
                }
                for _ in range(random.randint(1, 4))
            ],
            "total_cost": 0,
            "notes": "Plan de traitement généré automatiquement"
        }
        
        # Calculate total
        plan_data["total_cost"] = sum(t["cost"] for t in plan_data["treatments"])
        
        treatment_plan = TreatmentPlan(
            id=str(uuid4()),
            patient_id=patient.id,
            plan_data=json.dumps(plan_data, ensure_ascii=False),
            consultation_text=f"Consultation du {date.today().strftime('%d/%m/%Y')}. {random.choice(['État bucco-dentaire satisfaisant.', 'Plusieurs caries à traiter.', 'Problème parodontal à surveiller.'])}",
            status='active',
            created_at=datetime.now() - timedelta(days=random.randint(0, 60))
        )
        
        treatment_plans.append(treatment_plan)
        db.session.add(treatment_plan)
    
    db.session.commit()
    print(f"✅ Created {len(treatment_plans)} treatment plans")
    return treatment_plans

def create_financial_data(patients, pricing):
    """Create invoices, payments, and quotes"""
    invoices = []
    devis_list = []
    payments = []
    
    # Create invoices for 40% of patients
    selected_patients = random.sample(patients, len(patients) * 2 // 5)
    
    for idx, patient in enumerate(selected_patients):
        # Create invoice
        invoice = Invoice(
            id=str(uuid4()),
            invoice_number=f"FAC-2024-{str(idx+1).zfill(4)}",
            patient_id=patient.id,
            issue_date=date.today() - timedelta(days=random.randint(0, 90)),
            due_date=date.today() + timedelta(days=30),
            subtotal=0,
            tax_amount=0,
            total_amount=0,
            paid_amount=0,
            status=random.choice(['pending', 'paid', 'partial', 'overdue']),
            notes=""
        )
        
        # Add invoice items
        num_items = random.randint(1, 4)
        invoice_total = 0
        
        for _ in range(num_items):
            pricing_item = random.choice(pricing)
            quantity = random.randint(1, 2)
            
            item = InvoiceItem(
                id=str(uuid4()),
                invoice_id=invoice.id,
                description=pricing_item.description_fr,
                tarmed_code=pricing_item.tarmed_code,
                quantity=quantity,
                unit_price=pricing_item.base_price,
                total_price=pricing_item.base_price * quantity
            )
            
            invoice_total += item.total_price
            db.session.add(item)
        
        invoice.subtotal = invoice_total
        invoice.total_amount = invoice_total
        
        # Create payments based on status
        if invoice.status == 'paid':
            invoice.paid_amount = invoice.total_amount
            payment = Payment(
                id=str(uuid4()),
                invoice_id=invoice.id,
                payment_date=invoice.issue_date + timedelta(days=random.randint(1, 30)),
                amount=invoice.total_amount,
                payment_method=random.choice(['Carte', 'Virement', 'Espèces', 'TWINT']),
                reference_number=f"PAY-{random.randint(10000, 99999)}",
                notes=""
            )
            payments.append(payment)
            db.session.add(payment)
            
        elif invoice.status == 'partial':
            paid = invoice.total_amount * random.uniform(0.3, 0.7)
            invoice.paid_amount = round(paid, 2)
            payment = Payment(
                id=str(uuid4()),
                invoice_id=invoice.id,
                payment_date=invoice.issue_date + timedelta(days=random.randint(1, 30)),
                amount=invoice.paid_amount,
                payment_method=random.choice(['Carte', 'Virement', 'Espèces', 'TWINT']),
                reference_number=f"PAY-{random.randint(10000, 99999)}",
                notes="Paiement partiel"
            )
            payments.append(payment)
            db.session.add(payment)
        
        invoices.append(invoice)
        db.session.add(invoice)
        
        # Create devis (quote) for some patients
        if random.random() < 0.5:
            devis = Devis(
                id=str(uuid4()),
                devis_number=f"DEV-2024-{str(len(devis_list)+1).zfill(4)}",
                patient_id=patient.id,
                issue_date=date.today() - timedelta(days=random.randint(0, 30)),
                validity_date=date.today() + timedelta(days=90),
                subtotal=0,
                tax_amount=0,
                total_amount=0,
                status=random.choice(['draft', 'sent', 'accepted', 'rejected']),
                notes=""
            )
            
            # Add devis items
            devis_total = 0
            for _ in range(random.randint(1, 5)):
                pricing_item = random.choice(pricing)
                quantity = random.randint(1, 3)
                
                item = DevisItem(
                    id=str(uuid4()),
                    devis_id=devis.id,
                    description=pricing_item.description_fr,
                    tarmed_code=pricing_item.tarmed_code,
                    quantity=quantity,
                    unit_price=pricing_item.base_price,
                    total_price=pricing_item.base_price * quantity
                )
                
                devis_total += item.total_price
                db.session.add(item)
            
            devis.subtotal = devis_total
            devis.total_amount = devis_total
            
            devis_list.append(devis)
            db.session.add(devis)
    
    # Create payment plans for some large invoices
    large_invoices = [inv for inv in invoices if inv.total_amount > 1000 and inv.status != 'paid']
    
    for invoice in random.sample(large_invoices, min(5, len(large_invoices))):
        payment_plan = PaymentPlan(
            id=str(uuid4()),
            patient_id=invoice.patient_id,
            invoice_id=invoice.id,
            total_amount=invoice.total_amount - invoice.paid_amount,
            installments=random.choice([3, 6, 12]),
            status='active'
        )
        db.session.add(payment_plan)
        
        # Create scheduled payments
        monthly_amount = payment_plan.total_amount / payment_plan.installments
        for i in range(payment_plan.installments):
            scheduled = ScheduledPayment(
                id=str(uuid4()),
                payment_plan_id=payment_plan.id,
                due_date=date.today() + timedelta(days=30 * (i + 1)),
                amount=round(monthly_amount, 2),
                status='pending' if i > 0 else 'paid'
            )
            db.session.add(scheduled)
    
    db.session.commit()
    print(f"✅ Created {len(invoices)} invoices, {len(devis_list)} quotes, {len(payments)} payments")
    return invoices, devis_list

def create_schedule_blocks():
    """Create schedule blocks for vacation and meetings"""
    blocks = []
    
    # Add some vacation blocks
    vacation_start = date.today() + timedelta(days=60)
    for i in range(5):
        block = ScheduleBlock(
            id=str(uuid4()),
            block_date=vacation_start + timedelta(days=i),
            start_time=time(8, 0),
            end_time=time(18, 0),
            block_type='vacation',
            reason='Vacances d\'été'
        )
        blocks.append(block)
        db.session.add(block)
    
    # Add regular meeting blocks
    for week in range(8):
        meeting_date = date.today() + timedelta(weeks=week, days=3)  # Every Thursday
        block = ScheduleBlock(
            id=str(uuid4()),
            block_date=meeting_date,
            start_time=time(12, 0),
            end_time=time(13, 30),
            block_type='meeting',
            reason='Réunion d\'équipe hebdomadaire'
        )
        blocks.append(block)
        db.session.add(block)
    
    # Add some training blocks
    for i in range(3):
        training_date = date.today() + timedelta(days=random.randint(10, 90))
        block = ScheduleBlock(
            id=str(uuid4()),
            block_date=training_date,
            start_time=time(14, 0),
            end_time=time(17, 0),
            block_type='training',
            reason='Formation continue'
        )
        blocks.append(block)
        db.session.add(block)
    
    db.session.commit()
    print(f"✅ Created {len(blocks)} schedule blocks")
    return blocks

def create_patient_education(patients):
    """Create educational content for patients"""
    education_content = [
        {
            "title": "Comment bien se brosser les dents",
            "content": "Le brossage des dents est essentiel pour maintenir une bonne hygiène bucco-dentaire...",
            "category": "Hygiène"
        },
        {
            "title": "Après une extraction dentaire",
            "content": "Voici les consignes importantes à suivre après une extraction dentaire...",
            "category": "Post-opératoire"
        },
        {
            "title": "L'importance du fil dentaire",
            "content": "Le fil dentaire permet d'éliminer la plaque dans les espaces interdentaires...",
            "category": "Hygiène"
        },
        {
            "title": "Alimentation et santé dentaire",
            "content": "Une alimentation équilibrée est importante pour la santé de vos dents...",
            "category": "Prévention"
        },
        {
            "title": "Les signes d'alerte en santé bucco-dentaire",
            "content": "Certains symptômes doivent vous alerter et vous amener à consulter...",
            "category": "Prévention"
        }
    ]
    
    docs = []
    selected_patients = random.sample(patients, len(patients) // 4)
    
    for patient in selected_patients:
        for _ in range(random.randint(1, 3)):
            content = random.choice(education_content)
            doc = PatientEducation(
                id=str(uuid4()),
                patient_id=patient.id,
                title=content["title"],
                content=content["content"],
                category=content["category"],
                language='fr',
                created_at=datetime.now() - timedelta(days=random.randint(0, 180))
            )
            docs.append(doc)
            db.session.add(doc)
    
    db.session.commit()
    print(f"✅ Created {len(docs)} patient education documents")
    return docs

def seed_all():
    """Main seeding function"""
    app = create_app()
    
    with app.app_context():
        # Clear existing data
        print("🗑️  Clearing existing data...")
        db.drop_all()
        db.create_all()
        
        print("\n🌱 Starting database seeding...\n")
        
        # Create data in order
        pricing = create_pricing()
        patients = create_patients(50)
        appointments = create_appointments(patients)
        treatment_plans = create_treatment_plans(patients)
        invoices, devis = create_financial_data(patients, pricing)
        schedule_blocks = create_schedule_blocks()
        education_docs = create_patient_education(patients)
        
        print("\n✨ Database seeding completed successfully!")
        print(f"""
📊 Summary:
- {len(patients)} patients
- {len(pricing)} pricing entries
- {len(appointments)} appointments
- {len(treatment_plans)} treatment plans
- {len(invoices)} invoices
- {len(devis)} quotes
- {len(schedule_blocks)} schedule blocks
- {len(education_docs)} education documents
        """)

if __name__ == "__main__":
    seed_all()