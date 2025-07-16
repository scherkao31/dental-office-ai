from datetime import datetime
from app import db

class PatientEducation(db.Model):
    __tablename__ = 'patient_education'
    
    id = db.Column(db.String(36), primary_key=True)
    patient_id = db.Column(db.String(36), db.ForeignKey('patients.id'))
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(100))
    language = db.Column(db.String(10), default='fr')
    pdf_path = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'patient_name': self.patient.full_name if self.patient else None,
            'title': self.title,
            'content': self.content,
            'category': self.category,
            'language': self.language,
            'pdf_path': self.pdf_path,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<PatientEducation {self.title} for {self.patient.full_name if self.patient else "No Patient"}>'