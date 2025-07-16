from datetime import datetime
from app import db

class TreatmentPlan(db.Model):
    __tablename__ = 'treatment_plans'
    
    id = db.Column(db.String(36), primary_key=True)
    patient_id = db.Column(db.String(36), db.ForeignKey('patients.id'))
    plan_data = db.Column(db.Text, nullable=False)  # JSON data
    consultation_text = db.Column(db.Text)
    status = db.Column(db.String(50), default='active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'patient_name': self.patient.full_name if self.patient else None,
            'plan_data': self.plan_data,
            'consultation_text': self.consultation_text,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<TreatmentPlan {self.id} - {self.patient.full_name if self.patient else "No Patient"}>'