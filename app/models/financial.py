from datetime import datetime
from app import db

class Invoice(db.Model):
    __tablename__ = 'invoices'
    
    id = db.Column(db.String(36), primary_key=True)
    invoice_number = db.Column(db.String(50), unique=True, nullable=False)
    patient_id = db.Column(db.String(36), db.ForeignKey('patients.id'))
    issue_date = db.Column(db.Date, nullable=False)
    due_date = db.Column(db.Date)
    subtotal = db.Column(db.Float, default=0.0)
    tax_amount = db.Column(db.Float, default=0.0)
    total_amount = db.Column(db.Float, default=0.0)
    paid_amount = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(50), default='pending')
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    items = db.relationship('InvoiceItem', backref='invoice', lazy='dynamic', cascade='all, delete-orphan')
    payments = db.relationship('Payment', backref='invoice', lazy='dynamic', cascade='all, delete-orphan')
    
    @property
    def balance_due(self):
        return self.total_amount - self.paid_amount
    
    def to_dict(self):
        return {
            'id': self.id,
            'invoice_number': self.invoice_number,
            'patient_id': self.patient_id,
            'patient_name': self.patient.full_name if self.patient else None,
            'issue_date': self.issue_date.isoformat() if self.issue_date else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'subtotal': self.subtotal,
            'tax_amount': self.tax_amount,
            'total_amount': self.total_amount,
            'paid_amount': self.paid_amount,
            'balance_due': self.balance_due,
            'status': self.status,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class InvoiceItem(db.Model):
    __tablename__ = 'invoice_items'
    
    id = db.Column(db.String(36), primary_key=True)
    invoice_id = db.Column(db.String(36), db.ForeignKey('invoices.id'))
    description = db.Column(db.Text, nullable=False)
    tarmed_code = db.Column(db.String(20))
    quantity = db.Column(db.Float, default=1.0)
    unit_price = db.Column(db.Float, nullable=False)
    total_price = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'invoice_id': self.invoice_id,
            'description': self.description,
            'tarmed_code': self.tarmed_code,
            'quantity': self.quantity,
            'unit_price': self.unit_price,
            'total_price': self.total_price
        }

class Payment(db.Model):
    __tablename__ = 'payments'
    
    id = db.Column(db.String(36), primary_key=True)
    invoice_id = db.Column(db.String(36), db.ForeignKey('invoices.id'))
    payment_date = db.Column(db.Date, nullable=False)
    amount = db.Column(db.Float, nullable=False)
    payment_method = db.Column(db.String(50))
    reference_number = db.Column(db.String(100))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'invoice_id': self.invoice_id,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'amount': self.amount,
            'payment_method': self.payment_method,
            'reference_number': self.reference_number,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Devis(db.Model):
    __tablename__ = 'devis'
    
    id = db.Column(db.String(36), primary_key=True)
    devis_number = db.Column(db.String(50), unique=True, nullable=False)
    patient_id = db.Column(db.String(36), db.ForeignKey('patients.id'))
    issue_date = db.Column(db.Date, nullable=False)
    validity_date = db.Column(db.Date)
    subtotal = db.Column(db.Float, default=0.0)
    tax_amount = db.Column(db.Float, default=0.0)
    total_amount = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(50), default='draft')
    treatment_plan_id = db.Column(db.String(36), db.ForeignKey('treatment_plans.id'))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    items = db.relationship('DevisItem', backref='devis', lazy='dynamic', cascade='all, delete-orphan')
    treatment_plan = db.relationship('TreatmentPlan', backref='devis')
    
    def to_dict(self):
        return {
            'id': self.id,
            'devis_number': self.devis_number,
            'patient_id': self.patient_id,
            'patient_name': self.patient.full_name if self.patient else None,
            'issue_date': self.issue_date.isoformat() if self.issue_date else None,
            'validity_date': self.validity_date.isoformat() if self.validity_date else None,
            'subtotal': self.subtotal,
            'tax_amount': self.tax_amount,
            'total_amount': self.total_amount,
            'status': self.status,
            'treatment_plan_id': self.treatment_plan_id,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class DevisItem(db.Model):
    __tablename__ = 'devis_items'
    
    id = db.Column(db.String(36), primary_key=True)
    devis_id = db.Column(db.String(36), db.ForeignKey('devis.id'))
    description = db.Column(db.Text, nullable=False)
    tarmed_code = db.Column(db.String(20))
    quantity = db.Column(db.Float, default=1.0)
    unit_price = db.Column(db.Float, nullable=False)
    total_price = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'devis_id': self.devis_id,
            'description': self.description,
            'tarmed_code': self.tarmed_code,
            'quantity': self.quantity,
            'unit_price': self.unit_price,
            'total_price': self.total_price
        }

class PaymentPlan(db.Model):
    __tablename__ = 'payment_plans'
    
    id = db.Column(db.String(36), primary_key=True)
    patient_id = db.Column(db.String(36), db.ForeignKey('patients.id'))
    invoice_id = db.Column(db.String(36), db.ForeignKey('invoices.id'))
    total_amount = db.Column(db.Float, nullable=False)
    installments = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(50), default='active')
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    scheduled_payments = db.relationship('ScheduledPayment', backref='payment_plan', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'patient_name': self.patient.full_name if self.patient else None,
            'invoice_id': self.invoice_id,
            'total_amount': self.total_amount,
            'installments': self.installments,
            'status': self.status,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class ScheduledPayment(db.Model):
    __tablename__ = 'scheduled_payments'
    
    id = db.Column(db.String(36), primary_key=True)
    payment_plan_id = db.Column(db.String(36), db.ForeignKey('payment_plans.id'))
    due_date = db.Column(db.Date, nullable=False)
    amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(50), default='pending')
    payment_id = db.Column(db.String(36), db.ForeignKey('payments.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    payment = db.relationship('Payment', backref='scheduled_payment')
    
    def to_dict(self):
        return {
            'id': self.id,
            'payment_plan_id': self.payment_plan_id,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'amount': self.amount,
            'status': self.status,
            'payment_id': self.payment_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }