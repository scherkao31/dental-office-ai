import uuid
from datetime import datetime
from typing import List, Dict, Optional
from app import db
from app.models import Patient

class PatientService:
    """Service for managing patient operations"""
    
    def create_patient(self, data: Dict) -> Patient:
        """Create a new patient"""
        patient = Patient(
            id=str(uuid.uuid4()),
            first_name=data['first_name'],
            last_name=data['last_name'],
            email=data.get('email'),
            phone=data.get('phone'),
            birth_date=datetime.fromisoformat(data['birth_date']) if data.get('birth_date') else None,
            address=data.get('address'),
            medical_history=data.get('medical_history'),
            allergies=data.get('allergies'),
            emergency_contact=data.get('emergency_contact'),
            insurance_info=data.get('insurance_info'),
            notes=data.get('notes')
        )
        
        db.session.add(patient)
        db.session.commit()
        return patient
    
    def get_patient(self, patient_id: str) -> Optional[Patient]:
        """Get a patient by ID"""
        return Patient.query.get(patient_id)
    
    def get_all_patients(self) -> List[Patient]:
        """Get all patients"""
        return Patient.query.order_by(Patient.last_name, Patient.first_name).all()
    
    def update_patient(self, patient_id: str, data: Dict) -> Optional[Patient]:
        """Update a patient"""
        patient = self.get_patient(patient_id)
        if not patient:
            return None
        
        # Update fields
        for field in ['first_name', 'last_name', 'email', 'phone', 'address',
                      'medical_history', 'allergies', 'emergency_contact', 
                      'insurance_info', 'notes']:
            if field in data:
                setattr(patient, field, data[field])
        
        if 'birth_date' in data:
            patient.birth_date = datetime.fromisoformat(data['birth_date']) if data['birth_date'] else None
        
        patient.updated_at = datetime.utcnow()
        db.session.commit()
        return patient
    
    def delete_patient(self, patient_id: str) -> bool:
        """Delete a patient"""
        patient = self.get_patient(patient_id)
        if not patient:
            return False
        
        db.session.delete(patient)
        db.session.commit()
        return True
    
    def search_patients(self, query: str) -> List[Patient]:
        """Search patients by name"""
        search_term = f"%{query}%"
        return Patient.query.filter(
            db.or_(
                Patient.first_name.ilike(search_term),
                Patient.last_name.ilike(search_term),
                Patient.email.ilike(search_term),
                Patient.phone.ilike(search_term)
            )
        ).order_by(Patient.last_name, Patient.first_name).all()
    
    def get_patient_statistics(self, patient_id: str) -> Dict:
        """Get statistics for a patient"""
        patient = self.get_patient(patient_id)
        if not patient:
            return {}
        
        return {
            'total_appointments': patient.appointments.count(),
            'completed_appointments': patient.appointments.filter_by(status='completed').count(),
            'active_treatment_plans': patient.treatment_plans.filter_by(status='active').count(),
            'total_invoices': patient.invoices.count(),
            'unpaid_invoices': patient.invoices.filter_by(status='pending').count(),
            'total_revenue': sum(invoice.total_amount for invoice in patient.invoices)
        }