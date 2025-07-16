from datetime import datetime
from app import db

class Patient(db.Model):
    __tablename__ = 'patients'
    
    id = db.Column(db.String(36), primary_key=True)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120))
    phone = db.Column(db.String(20))
    birth_date = db.Column(db.Date)
    address = db.Column(db.Text)
    medical_history = db.Column(db.Text)
    allergies = db.Column(db.Text)
    emergency_contact = db.Column(db.Text)
    insurance_info = db.Column(db.Text)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    appointments = db.relationship('Appointment', backref='patient', lazy='dynamic', cascade='all, delete-orphan')
    treatment_plans = db.relationship('TreatmentPlan', backref='patient', lazy='dynamic', cascade='all, delete-orphan')
    invoices = db.relationship('Invoice', backref='patient', lazy='dynamic', cascade='all, delete-orphan')
    devis = db.relationship('Devis', backref='patient', lazy='dynamic', cascade='all, delete-orphan')
    education_documents = db.relationship('PatientEducation', backref='patient', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'email': self.email,
            'phone': self.phone,
            'birth_date': self.birth_date.isoformat() if self.birth_date else None,
            'address': self.address,
            'medical_history': self.medical_history,
            'allergies': self.allergies,
            'emergency_contact': self.emergency_contact,
            'insurance_info': self.insurance_info,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    def __repr__(self):
        return f'<Patient {self.full_name}>'