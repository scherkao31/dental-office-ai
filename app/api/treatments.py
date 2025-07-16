from flask import Blueprint, request, jsonify, send_file
from app.services import treatment_service, pdf_service, powerpoint_service

treatments_bp = Blueprint('treatments', __name__)

@treatments_bp.route('/', methods=['GET', 'POST'])
def manage_treatment_plans():
    """Manage treatment plans"""
    if request.method == 'GET':
        patient_id = request.args.get('patient_id')
        
        if patient_id:
            plans = treatment_service.get_patient_treatment_plans(patient_id)
        else:
            plans = treatment_service.get_active_treatment_plans()
        
        return jsonify({
            'status': 'success',
            'treatment_plans': [p.to_dict() for p in plans]
        })
    
    elif request.method == 'POST':
        try:
            data = request.json
            plan = treatment_service.create_treatment_plan(
                patient_id=data['patient_id'],
                plan_data=data['plan_data'],
                consultation_text=data.get('consultation_text')
            )
            
            return jsonify({
                'status': 'success',
                'message': 'Plan de traitement créé avec succès',
                'treatment_plan': plan.to_dict()
            }), 201
            
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': str(e)
            }), 400

@treatments_bp.route('/<plan_id>', methods=['GET', 'PUT', 'DELETE'])
def manage_treatment_plan(plan_id):
    """Manage specific treatment plan"""
    if request.method == 'GET':
        plan = treatment_service.get_treatment_plan(plan_id)
        if not plan:
            return jsonify({
                'status': 'error',
                'message': 'Plan de traitement non trouvé'
            }), 404
        
        plan_dict = plan.to_dict()
        plan_dict['parsed_data'] = treatment_service.parse_treatment_plan(plan_id)
        
        return jsonify({
            'status': 'success',
            'treatment_plan': plan_dict
        })
    
    elif request.method == 'PUT':
        try:
            data = request.json
            plan = treatment_service.update_treatment_plan(
                plan_id,
                plan_data=data.get('plan_data'),
                consultation_text=data.get('consultation_text'),
                status=data.get('status')
            )
            
            if not plan:
                return jsonify({
                    'status': 'error',
                    'message': 'Plan de traitement non trouvé'
                }), 404
            
            return jsonify({
                'status': 'success',
                'message': 'Plan de traitement mis à jour avec succès',
                'treatment_plan': plan.to_dict()
            })
            
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': str(e)
            }), 400
    
    elif request.method == 'DELETE':
        success = treatment_service.delete_treatment_plan(plan_id)
        
        if not success:
            return jsonify({
                'status': 'error',
                'message': 'Plan de traitement non trouvé'
            }), 404
        
        return jsonify({
            'status': 'success',
            'message': 'Plan de traitement supprimé avec succès'
        })

@treatments_bp.route('/<plan_id>/cost', methods=['GET'])
def get_treatment_cost(plan_id):
    """Calculate treatment plan cost"""
    cost_data = treatment_service.calculate_treatment_cost(plan_id)
    
    if not cost_data:
        return jsonify({
            'status': 'error',
            'message': 'Plan de traitement non trouvé'
        }), 404
    
    return jsonify({
        'status': 'success',
        'cost': cost_data
    })

@treatments_bp.route('/<plan_id>/progress', methods=['GET'])
def get_treatment_progress(plan_id):
    """Get treatment plan progress"""
    progress = treatment_service.get_treatment_progress(plan_id)
    
    if not progress:
        return jsonify({
            'status': 'error',
            'message': 'Plan de traitement non trouvé'
        }), 404
    
    return jsonify({
        'status': 'success',
        'progress': progress
    })

@treatments_bp.route('/<plan_id>/clone', methods=['POST'])
def clone_treatment_plan(plan_id):
    """Clone a treatment plan for another patient"""
    try:
        data = request.json
        new_plan = treatment_service.clone_treatment_plan(
            plan_id,
            data['new_patient_id']
        )
        
        if not new_plan:
            return jsonify({
                'status': 'error',
                'message': 'Plan de traitement non trouvé'
            }), 404
        
        return jsonify({
            'status': 'success',
            'message': 'Plan de traitement cloné avec succès',
            'treatment_plan': new_plan.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400

@treatments_bp.route('/generate-sequence', methods=['POST'])
def generate_treatment_sequence():
    """Generate optimized treatment sequence"""
    try:
        data = request.json
        treatments = data.get('treatments', [])
        
        sequences = treatment_service.generate_treatment_sequence(treatments)
        
        return jsonify({
            'status': 'success',
            'sequences': sequences
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400

@treatments_bp.route('/<plan_id>/export-pdf', methods=['POST'])
def export_treatment_pdf(plan_id):
    """Export treatment plan as PDF"""
    try:
        plan = treatment_service.get_treatment_plan(plan_id)
        if not plan:
            return jsonify({
                'status': 'error',
                'message': 'Plan de traitement non trouvé'
            }), 404
        
        plan_data = treatment_service.parse_treatment_plan(plan_id)
        cost_data = treatment_service.calculate_treatment_cost(plan_id)
        
        treatment_data = {
            'patient_name': plan.patient.full_name,
            'sequences': plan_data.get('sequences', []),
            'total_cost': cost_data['total_cost']
        }
        
        pdf_path = pdf_service.generate_treatment_plan_pdf(treatment_data)
        
        return send_file(
            pdf_path,
            as_attachment=True,
            download_name=f"plan_traitement_{plan.patient.full_name.replace(' ', '_')}.pdf",
            mimetype='application/pdf'
        )
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@treatments_bp.route('/<plan_id>/export-pptx', methods=['POST'])
def export_treatment_pptx(plan_id):
    """Export treatment plan as PowerPoint"""
    try:
        plan = treatment_service.get_treatment_plan(plan_id)
        if not plan:
            return jsonify({
                'status': 'error',
                'message': 'Plan de traitement non trouvé'
            }), 404
        
        plan_data = treatment_service.parse_treatment_plan(plan_id)
        cost_data = treatment_service.calculate_treatment_cost(plan_id)
        
        treatment_data = {
            'patient_name': plan.patient.full_name,
            'sequences': plan_data.get('sequences', []),
            'total_cost': cost_data['total_cost']
        }
        
        # Add dental schema if provided in request
        data = request.json or {}
        if 'dental_schema' in data:
            treatment_data['dental_schema'] = data['dental_schema']
        
        pptx_path = powerpoint_service.generate_treatment_presentation(treatment_data)
        
        return send_file(
            pptx_path,
            as_attachment=True,
            download_name=f"plan_traitement_{plan.patient.full_name.replace(' ', '_')}.pptx",
            mimetype='application/vnd.openxmlformats-officedocument.presentationml.presentation'
        )
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500