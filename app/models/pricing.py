from datetime import datetime
from app import db

class DentalPricing(db.Model):
    __tablename__ = 'dental_pricing'
    
    id = db.Column(db.String(36), primary_key=True)
    tarmed_code = db.Column(db.String(20), unique=True, nullable=False)
    description_fr = db.Column(db.Text, nullable=False)
    description_de = db.Column(db.Text)
    category = db.Column(db.String(100))
    base_price = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(50))
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'tarmed_code': self.tarmed_code,
            'description_fr': self.description_fr,
            'description_de': self.description_de,
            'category': self.category,
            'base_price': self.base_price,
            'unit': self.unit,
            'active': self.active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<DentalPricing {self.tarmed_code} - {self.base_price} CHF>'