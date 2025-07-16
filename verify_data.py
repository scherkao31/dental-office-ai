#!/usr/bin/env python3
"""
Verify that all data is properly loaded in the database
"""
from app import create_app, db
from app.models.patient import Patient
from app.models.appointment import Appointment
from app.models.treatment import TreatmentPlan
from app.models.financial import Invoice, Devis, Payment
from app.models.pricing import DentalPricing
from app.models.schedule import ScheduleBlock
from app.models.education import PatientEducation
from datetime import date, timedelta
from sqlalchemy import func

def verify_data():
    app = create_app()
    
    with app.app_context():
        print("🔍 DATABASE VERIFICATION REPORT")
        print("=" * 50)
        
        # Count records
        patient_count = Patient.query.count()
        appointment_count = Appointment.query.count()
        treatment_count = TreatmentPlan.query.count()
        invoice_count = Invoice.query.count()
        devis_count = Devis.query.count()
        payment_count = Payment.query.count()
        pricing_count = DentalPricing.query.count()
        schedule_count = ScheduleBlock.query.count()
        education_count = PatientEducation.query.count()
        
        print(f"\n📊 RECORD COUNTS:")
        print(f"  ✓ Patients: {patient_count}")
        print(f"  ✓ Appointments: {appointment_count}")
        print(f"  ✓ Treatment Plans: {treatment_count}")
        print(f"  ✓ Invoices: {invoice_count}")
        print(f"  ✓ Devis (Quotes): {devis_count}")
        print(f"  ✓ Payments: {payment_count}")
        print(f"  ✓ Pricing Entries: {pricing_count}")
        print(f"  ✓ Schedule Blocks: {schedule_count}")
        print(f"  ✓ Education Documents: {education_count}")
        
        # Sample patients
        print(f"\n👥 SAMPLE PATIENTS:")
        patients = Patient.query.limit(5).all()
        for p in patients:
            print(f"  - {p.first_name} {p.last_name} ({p.email})")
        
        # Today's appointments
        today = date.today()
        today_appointments = Appointment.query.filter(
            Appointment.appointment_date == today
        ).all()
        print(f"\n📅 TODAY'S APPOINTMENTS ({today}):")
        if today_appointments:
            for apt in today_appointments:
                patient = Patient.query.get(apt.patient_id)
                print(f"  - {apt.appointment_time.strftime('%H:%M')} - {patient.first_name} {patient.last_name} - {apt.treatment_type}")
        else:
            print("  No appointments today")
        
        # Upcoming appointments
        upcoming = Appointment.query.filter(
            Appointment.appointment_date > today,
            Appointment.appointment_date <= today + timedelta(days=7)
        ).order_by(Appointment.appointment_date, Appointment.appointment_time).limit(5).all()
        print(f"\n📆 UPCOMING APPOINTMENTS (Next 7 days):")
        for apt in upcoming:
            patient = Patient.query.get(apt.patient_id)
            print(f"  - {apt.appointment_date} {apt.appointment_time.strftime('%H:%M')} - {patient.first_name} {patient.last_name}")
        
        # Financial summary
        total_revenue = db.session.query(func.sum(Invoice.total_amount)).scalar() or 0
        paid_revenue = db.session.query(func.sum(Invoice.paid_amount)).scalar() or 0
        pending_revenue = total_revenue - paid_revenue
        
        print(f"\n💰 FINANCIAL SUMMARY:")
        print(f"  Total Revenue: {total_revenue:,.2f} CHF")
        print(f"  Paid: {paid_revenue:,.2f} CHF")
        print(f"  Pending: {pending_revenue:,.2f} CHF")
        
        # Pricing categories
        categories = db.session.query(DentalPricing.category, func.count()).group_by(DentalPricing.category).all()
        print(f"\n🏷️  PRICING CATEGORIES:")
        for cat, count in categories:
            print(f"  - {cat}: {count} items")
        
        # API endpoints to test
        print(f"\n🌐 API ENDPOINTS TO TEST:")
        print("  Dashboard: http://localhost:5001")
        print("  Patients API: http://localhost:5001/api/patients/")
        print("  Financial Dashboard: http://localhost:5001/api/financial/dashboard")
        print("  Appointments API: http://localhost:5001/api/appointments/")
        print("  Pricing API: http://localhost:5001/api/financial/pricing")
        
        print("\n✅ Database verification complete!")

if __name__ == "__main__":
    verify_data()