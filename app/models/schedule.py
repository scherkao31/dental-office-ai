from datetime import datetime
from app import db

class ScheduleBlock(db.Model):
    __tablename__ = 'schedule_blocks'
    
    id = db.Column(db.String(36), primary_key=True)
    block_date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    block_type = db.Column(db.String(50), nullable=False)  # 'unavailable', 'vacation', 'meeting', etc.
    reason = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'block_date': self.block_date.isoformat() if self.block_date else None,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'block_type': self.block_type,
            'reason': self.reason,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<ScheduleBlock {self.block_type} on {self.block_date}>'