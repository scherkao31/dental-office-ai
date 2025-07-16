from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, send_file
from app.services import financial_service, pdf_service

financial_bp = Blueprint('financial', __name__)

@financial_bp.route('/invoices', methods=['GET', 'POST'])
def manage_invoices():
    """Manage invoices"""
    if request.method == 'GET':
        # TODO: Add filters for patient_id, date range, status
        return jsonify({
            'status': 'success',
            'message': 'Invoice list endpoint - to be implemented'
        })
    
    elif request.method == 'POST':
        try:
            data = request.json
            invoice = financial_service.create_invoice(
                patient_id=data['patient_id'],
                items=data['items'],
                notes=data.get('notes')
            )
            
            return jsonify({
                'status': 'success',
                'message': 'Facture créée avec succès',
                'invoice': invoice.to_dict()
            }), 201
            
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': str(e)
            }), 400

@financial_bp.route('/invoices/<invoice_id>', methods=['GET', 'DELETE'])
def manage_invoice(invoice_id):
    """Manage specific invoice"""
    # TODO: Implement GET and DELETE methods
    return jsonify({
        'status': 'success',
        'message': 'Invoice detail endpoint - to be implemented'
    })

@financial_bp.route('/invoices/<invoice_id>/download', methods=['GET'])
def download_invoice_pdf(invoice_id):
    """Download invoice as PDF"""
    try:
        # TODO: Get invoice from database
        # For now, using mock data
        invoice_data = {
            'invoice_number': 'INV-2024-001',
            'issue_date': datetime.now().strftime('%d/%m/%Y'),
            'due_date': (datetime.now() + timedelta(days=30)).strftime('%d/%m/%Y'),
            'patient_name': 'John Doe',
            'items': [],
            'subtotal': 0,
            'tax_amount': 0,
            'total_amount': 0,
            'paid_amount': 0,
            'balance_due': 0
        }
        
        pdf_path = pdf_service.generate_invoice_pdf(invoice_data)
        
        return send_file(
            pdf_path,
            as_attachment=True,
            download_name=f"facture_{invoice_data['invoice_number']}.pdf",
            mimetype='application/pdf'
        )
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@financial_bp.route('/devis', methods=['GET', 'POST'])
def manage_devis():
    """Manage devis (quotes)"""
    if request.method == 'GET':
        # TODO: Add filters
        return jsonify({
            'status': 'success',
            'message': 'Devis list endpoint - to be implemented'
        })
    
    elif request.method == 'POST':
        try:
            data = request.json
            devis = financial_service.create_devis(
                patient_id=data['patient_id'],
                items=data['items'],
                treatment_plan_id=data.get('treatment_plan_id'),
                notes=data.get('notes')
            )
            
            return jsonify({
                'status': 'success',
                'message': 'Devis créé avec succès',
                'devis': devis.to_dict()
            }), 201
            
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': str(e)
            }), 400

@financial_bp.route('/devis/<devis_id>/approve', methods=['POST'])
def approve_devis(devis_id):
    """Approve a devis"""
    try:
        devis = financial_service.approve_devis(devis_id)
        
        return jsonify({
            'status': 'success',
            'message': 'Devis approuvé avec succès',
            'devis': devis.to_dict()
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400

@financial_bp.route('/devis/<devis_id>/create-invoice', methods=['POST'])
def create_invoice_from_devis(devis_id):
    """Create invoice from approved devis"""
    try:
        invoice = financial_service.create_invoice_from_devis(devis_id)
        
        return jsonify({
            'status': 'success',
            'message': 'Facture créée depuis le devis',
            'invoice': invoice.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400

@financial_bp.route('/payments', methods=['POST'])
def add_payment():
    """Add payment to invoice"""
    try:
        data = request.json
        payment = financial_service.add_payment(
            invoice_id=data['invoice_id'],
            amount=data['amount'],
            payment_method=data.get('payment_method', 'cash'),
            reference_number=data.get('reference_number'),
            notes=data.get('notes')
        )
        
        return jsonify({
            'status': 'success',
            'message': 'Paiement enregistré avec succès',
            'payment': payment.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400

@financial_bp.route('/payment-plans', methods=['GET', 'POST'])
def manage_payment_plans():
    """Manage payment plans"""
    if request.method == 'GET':
        # TODO: Implement list payment plans
        return jsonify({
            'status': 'success',
            'message': 'Payment plans endpoint - to be implemented'
        })
    
    elif request.method == 'POST':
        try:
            data = request.json
            payment_plan = financial_service.create_payment_plan(
                patient_id=data['patient_id'],
                invoice_id=data['invoice_id'],
                installments=data['installments'],
                notes=data.get('notes')
            )
            
            return jsonify({
                'status': 'success',
                'message': 'Plan de paiement créé avec succès',
                'payment_plan': payment_plan.to_dict()
            }), 201
            
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': str(e)
            }), 400

@financial_bp.route('/dashboard', methods=['GET'])
def get_financial_dashboard():
    """Get financial dashboard data"""
    from app.services import financial_service
    if financial_service is None:
        return jsonify({'status': 'error', 'message': 'Service not initialized'}), 500
    
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if not start_date:
            # Default to current month
            start_date = datetime.now().replace(day=1).date()
        else:
            start_date = datetime.fromisoformat(start_date).date()
        
        if not end_date:
            # Default to end of current month
            next_month = start_date.replace(day=28) + timedelta(days=4)
            end_date = next_month - timedelta(days=next_month.day)
        else:
            end_date = datetime.fromisoformat(end_date).date()
        
        dashboard_data = financial_service.get_financial_dashboard(start_date, end_date)
        
        return jsonify({
            'status': 'success',
            'dashboard': dashboard_data
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400

@financial_bp.route('/revenue-forecast', methods=['GET'])
def get_revenue_forecast():
    """Get revenue forecast"""
    try:
        months = int(request.args.get('months', 6))
        forecast = financial_service.get_revenue_forecast(months)
        
        return jsonify({
            'status': 'success',
            'forecast': forecast
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400

@financial_bp.route('/pricing', methods=['GET'])
def get_pricing():
    """Get dental pricing data"""
    try:
        search_query = request.args.get('search')
        
        if search_query:
            pricing_list = financial_service.search_pricing(search_query)
        else:
            # TODO: Get all pricing with pagination
            pricing_list = []
        
        return jsonify({
            'status': 'success',
            'pricing': [p.to_dict() for p in pricing_list]
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400

@financial_bp.route('/pricing/<tarmed_code>', methods=['GET'])
def get_pricing_by_code(tarmed_code):
    """Get specific pricing by TARMED code"""
    pricing = financial_service.get_pricing_by_code(tarmed_code)
    
    if not pricing:
        return jsonify({
            'status': 'error',
            'message': 'Code TARMED non trouvé'
        }), 404
    
    return jsonify({
        'status': 'success',
        'pricing': pricing.to_dict()
    })