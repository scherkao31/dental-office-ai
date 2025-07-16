import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from app import db
from sqlalchemy import or_
from app.models import (
    Invoice, InvoiceItem, Payment, Devis, DevisItem, 
    PaymentPlan, ScheduledPayment, DentalPricing
)

class FinancialService:
    """Service for managing financial operations"""
    
    def create_invoice(self, patient_id: str, items: List[Dict], notes: Optional[str] = None) -> Invoice:
        """Create a new invoice with items"""
        # Generate invoice number
        invoice_number = self._generate_invoice_number()
        
        # Calculate totals
        subtotal = sum(item['quantity'] * item['unit_price'] for item in items)
        tax_amount = subtotal * 0.077  # Swiss VAT 7.7%
        total_amount = subtotal + tax_amount
        
        # Create invoice
        invoice = Invoice(
            id=str(uuid.uuid4()),
            invoice_number=invoice_number,
            patient_id=patient_id,
            issue_date=datetime.utcnow().date(),
            due_date=(datetime.utcnow() + timedelta(days=30)).date(),
            subtotal=subtotal,
            tax_amount=tax_amount,
            total_amount=total_amount,
            status='pending',
            notes=notes
        )
        
        db.session.add(invoice)
        
        # Add invoice items
        for item in items:
            invoice_item = InvoiceItem(
                id=str(uuid.uuid4()),
                invoice_id=invoice.id,
                description=item['description'],
                tarmed_code=item.get('tarmed_code'),
                quantity=item['quantity'],
                unit_price=item['unit_price'],
                total_price=item['quantity'] * item['unit_price']
            )
            db.session.add(invoice_item)
        
        db.session.commit()
        return invoice
    
    def create_devis(self, patient_id: str, items: List[Dict], 
                    treatment_plan_id: Optional[str] = None, notes: Optional[str] = None) -> Devis:
        """Create a new devis (quote)"""
        # Generate devis number
        devis_number = self._generate_devis_number()
        
        # Calculate totals
        subtotal = sum(item['quantity'] * item['unit_price'] for item in items)
        tax_amount = subtotal * 0.077  # Swiss VAT 7.7%
        total_amount = subtotal + tax_amount
        
        # Create devis
        devis = Devis(
            id=str(uuid.uuid4()),
            devis_number=devis_number,
            patient_id=patient_id,
            issue_date=datetime.utcnow().date(),
            validity_date=(datetime.utcnow() + timedelta(days=30)).date(),
            subtotal=subtotal,
            tax_amount=tax_amount,
            total_amount=total_amount,
            status='draft',
            treatment_plan_id=treatment_plan_id,
            notes=notes
        )
        
        db.session.add(devis)
        
        # Add devis items
        for item in items:
            devis_item = DevisItem(
                id=str(uuid.uuid4()),
                devis_id=devis.id,
                description=item['description'],
                tarmed_code=item.get('tarmed_code'),
                quantity=item['quantity'],
                unit_price=item['unit_price'],
                total_price=item['quantity'] * item['unit_price']
            )
            db.session.add(devis_item)
        
        db.session.commit()
        return devis
    
    def add_payment(self, invoice_id: str, amount: float, payment_method: str = 'cash',
                   reference_number: Optional[str] = None, notes: Optional[str] = None) -> Payment:
        """Add a payment to an invoice"""
        invoice = Invoice.query.get(invoice_id)
        if not invoice:
            raise ValueError("Invoice not found")
        
        payment = Payment(
            id=str(uuid.uuid4()),
            invoice_id=invoice_id,
            payment_date=datetime.utcnow().date(),
            amount=amount,
            payment_method=payment_method,
            reference_number=reference_number,
            notes=notes
        )
        
        db.session.add(payment)
        
        # Update invoice paid amount
        invoice.paid_amount += amount
        
        # Update invoice status if fully paid
        if invoice.paid_amount >= invoice.total_amount:
            invoice.status = 'paid'
        elif invoice.paid_amount > 0:
            invoice.status = 'partial'
        
        db.session.commit()
        return payment
    
    def create_payment_plan(self, patient_id: str, invoice_id: str, 
                           installments: int, notes: Optional[str] = None) -> PaymentPlan:
        """Create a payment plan for an invoice"""
        invoice = Invoice.query.get(invoice_id)
        if not invoice:
            raise ValueError("Invoice not found")
        
        remaining_balance = invoice.balance_due
        installment_amount = remaining_balance / installments
        
        # Create payment plan
        payment_plan = PaymentPlan(
            id=str(uuid.uuid4()),
            patient_id=patient_id,
            invoice_id=invoice_id,
            total_amount=remaining_balance,
            installments=installments,
            status='active',
            notes=notes
        )
        
        db.session.add(payment_plan)
        
        # Create scheduled payments
        for i in range(installments):
            due_date = datetime.utcnow().date() + timedelta(days=30 * (i + 1))
            scheduled_payment = ScheduledPayment(
                id=str(uuid.uuid4()),
                payment_plan_id=payment_plan.id,
                due_date=due_date,
                amount=installment_amount,
                status='pending'
            )
            db.session.add(scheduled_payment)
        
        db.session.commit()
        return payment_plan
    
    def get_financial_dashboard(self, start_date: datetime.date, end_date: datetime.date) -> Dict:
        """Get financial dashboard data"""
        # Get invoices in date range
        invoices = Invoice.query.filter(
            Invoice.issue_date >= start_date,
            Invoice.issue_date <= end_date
        ).all()
        
        # Calculate metrics
        total_revenue = sum(inv.total_amount for inv in invoices)
        paid_revenue = sum(inv.paid_amount for inv in invoices)
        pending_revenue = total_revenue - paid_revenue
        
        # Get payments in date range
        payments = Payment.query.filter(
            Payment.payment_date >= start_date,
            Payment.payment_date <= end_date
        ).all()
        
        return {
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            },
            'revenue': {
                'total': total_revenue,
                'paid': paid_revenue,
                'pending': pending_revenue
            },
            'invoices': {
                'total': len(invoices),
                'paid': len([inv for inv in invoices if inv.status == 'paid']),
                'pending': len([inv for inv in invoices if inv.status == 'pending']),
                'partial': len([inv for inv in invoices if inv.status == 'partial'])
            },
            'payments': {
                'total': len(payments),
                'total_amount': sum(p.amount for p in payments),
                'by_method': self._group_payments_by_method(payments)
            }
        }
    
    def get_revenue_forecast(self, months: int = 6) -> List[Dict]:
        """Get revenue forecast based on scheduled payments"""
        forecast = []
        
        for i in range(months):
            month_start = datetime.utcnow().date().replace(day=1) + timedelta(days=30 * i)
            month_end = (month_start + timedelta(days=31)).replace(day=1) - timedelta(days=1)
            
            # Get scheduled payments for the month
            scheduled = ScheduledPayment.query.filter(
                ScheduledPayment.due_date >= month_start,
                ScheduledPayment.due_date <= month_end,
                ScheduledPayment.status == 'pending'
            ).all()
            
            expected_revenue = sum(sp.amount for sp in scheduled)
            
            forecast.append({
                'month': month_start.strftime('%Y-%m'),
                'expected_revenue': expected_revenue,
                'scheduled_payments': len(scheduled)
            })
        
        return forecast
    
    def approve_devis(self, devis_id: str) -> Devis:
        """Approve a devis"""
        devis = Devis.query.get(devis_id)
        if not devis:
            raise ValueError("Devis not found")
        
        devis.status = 'approved'
        devis.updated_at = datetime.utcnow()
        db.session.commit()
        
        return devis
    
    def create_invoice_from_devis(self, devis_id: str) -> Invoice:
        """Create an invoice from an approved devis"""
        devis = Devis.query.get(devis_id)
        if not devis:
            raise ValueError("Devis not found")
        
        if devis.status != 'approved':
            raise ValueError("Devis must be approved first")
        
        # Get devis items
        items = []
        for item in devis.items:
            items.append({
                'description': item.description,
                'tarmed_code': item.tarmed_code,
                'quantity': item.quantity,
                'unit_price': item.unit_price
            })
        
        # Create invoice
        invoice = self.create_invoice(
            patient_id=devis.patient_id,
            items=items,
            notes=f"Facture créée depuis le devis {devis.devis_number}"
        )
        
        return invoice
    
    def get_pricing_by_code(self, tarmed_code: str) -> Optional[DentalPricing]:
        """Get pricing information by TARMED code"""
        return DentalPricing.query.filter_by(tarmed_code=tarmed_code, active=True).first()
    
    def search_pricing(self, query: str) -> List[DentalPricing]:
        """Search pricing by code or description"""
        search_term = f"%{query}%"
        return DentalPricing.query.filter(
            db.or_(
                DentalPricing.tarmed_code.ilike(search_term),
                DentalPricing.description_fr.ilike(search_term),
                DentalPricing.description_de.ilike(search_term)
            ),
            DentalPricing.active == True
        ).all()
    
    def _generate_invoice_number(self) -> str:
        """Generate unique invoice number"""
        year = datetime.utcnow().year
        count = Invoice.query.filter(
            Invoice.invoice_number.like(f"{year}-%")
        ).count() + 1
        return f"{year}-{count:04d}"
    
    def _generate_devis_number(self) -> str:
        """Generate unique devis number"""
        year = datetime.utcnow().year
        count = Devis.query.filter(
            Devis.devis_number.like(f"D{year}-%")
        ).count() + 1
        return f"D{year}-{count:04d}"
    
    def _group_payments_by_method(self, payments: List[Payment]) -> Dict:
        """Group payments by method"""
        by_method = {}
        for payment in payments:
            method = payment.payment_method or 'unknown'
            if method not in by_method:
                by_method[method] = {'count': 0, 'amount': 0}
            
            by_method[method]['count'] += 1
            by_method[method]['amount'] += payment.amount
        
        return by_method
    
    def get_all_invoices(self) -> List[Invoice]:
        """Get all invoices"""
        return Invoice.query.order_by(Invoice.issue_date.desc()).all()
    
    def get_all_devis(self) -> List[Devis]:
        """Get all devis (quotes)"""
        return Devis.query.order_by(Devis.issue_date.desc()).all()
    
    def get_all_pricing(self) -> List[DentalPricing]:
        """Get all pricing entries"""
        return DentalPricing.query.filter_by(active=True).order_by(DentalPricing.tarmed_code).all()
    
    def search_pricing(self, search_query: str) -> List[DentalPricing]:
        """Search pricing by code or description"""
        search = f"%{search_query}%"
        return DentalPricing.query.filter(
            or_(
                DentalPricing.tarmed_code.like(search),
                DentalPricing.description_fr.like(search),
                DentalPricing.category.like(search)
            ),
            DentalPricing.active == True
        ).order_by(DentalPricing.tarmed_code).all()