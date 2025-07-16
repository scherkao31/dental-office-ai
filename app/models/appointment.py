from datetime import datetime
from app import db

class Appointment(db.Model):
    __tablename__ = 'appointments'
    
    id = db.Column(db.String(36), primary_key=True)
    patient_id = db.Column(db.String(36), db.ForeignKey('patients.id'))
    appointment_date = db.Column(db.Date, nullable=False)
    appointment_time = db.Column(db.Time, nullable=False)
    duration_minutes = db.Column(db.Integer, default=60)
    treatment_type = db.Column(db.String(200))
    status = db.Column(db.String(50), default='scheduled')
    doctor = db.Column(db.String(100), default='Dr.')
    room = db.Column(db.String(50))
    notes = db.Column(db.Text)
    treatment_plan_id = db.Column(db.String(36), db.ForeignKey('treatment_plans.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    treatment_plan = db.relationship('TreatmentPlan', backref='appointments')
    
    def to_dict(self):
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'patient_name': self.patient.full_name if self.patient else None,
            'appointment_date': self.appointment_date.isoformat() if self.appointment_date else None,
            'appointment_time': self.appointment_time.isoformat() if self.appointment_time else None,
            'duration_minutes': self.duration_minutes,
            'treatment_type': self.treatment_type,
            'status': self.status,
            'doctor': self.doctor,
            'room': self.room,
            'notes': self.notes,
            'treatment_plan_id': self.treatment_plan_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    @property
    def datetime(self):
        if self.appointment_date and self.appointment_time:
            return datetime.combine(self.appointment_date, self.appointment_time)
        return None
    
    def __repr__(self):
        return f'<Appointment {self.id} - {self.patient.full_name if self.patient else "No Patient"}>'