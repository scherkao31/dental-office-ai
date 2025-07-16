from flask import Blueprint, request, jsonify

patients_bp = Blueprint('patients', __name__)

@patients_bp.route('/', methods=['GET', 'POST'])
def manage_patients():
    """Manage patients - GET to retrieve, POST to create"""
    from app.services import patient_service
    
    if patient_service is None:
        return jsonify({
            'status': 'error',
            'message': 'Patient service not initialized'
        }), 500
    
    if request.method == 'GET':
        # Search functionality
        search_query = request.args.get('search')
        if search_query:
            patients = patient_service.search_patients(search_query)
        else:
            patients = patient_service.get_all_patients()
        
        return jsonify({
            'status': 'success',
            'patients': [p.to_dict() for p in patients]
        })
    
    elif request.method == 'POST':
        try:
            data = request.json
            patient = patient_service.create_patient(data)
            
            return jsonify({
                'status': 'success',
                'message': 'Patient créé avec succès',
                'patient': patient.to_dict()
            }), 201
            
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': str(e)
            }), 400

@patients_bp.route('/<patient_id>', methods=['GET', 'PUT', 'DELETE'])
def manage_patient(patient_id):
    """Manage individual patient - GET to view, PUT to update, DELETE to remove"""
    from app.services import patient_service
    
    if patient_service is None:
        return jsonify({
            'status': 'error',
            'message': 'Patient service not initialized'
        }), 500
    
    if request.method == 'GET':
        patient = patient_service.get_patient(patient_id)
        if not patient:
            return jsonify({
                'status': 'error',
                'message': 'Patient non trouvé'
            }), 404
        
        return jsonify({
            'status': 'success',
            'patient': patient.to_dict()
        })
    
    elif request.method == 'PUT':
        try:
            data = request.json
            patient = patient_service.update_patient(patient_id, data)
            
            if not patient:
                return jsonify({
                    'status': 'error',
                    'message': 'Patient non trouvé'
                }), 404
            
            return jsonify({
                'status': 'success',
                'message': 'Patient mis à jour avec succès',
                'patient': patient.to_dict()
            })
            
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': str(e)
            }), 400
    
    elif request.method == 'DELETE':
        success = patient_service.delete_patient(patient_id)
        
        if not success:
            return jsonify({
                'status': 'error',
                'message': 'Patient non trouvé'
            }), 404
        
        return jsonify({
            'status': 'success',
            'message': 'Patient supprimé avec succès'
        })

@patients_bp.route('/<patient_id>/statistics', methods=['GET'])
def get_patient_statistics(patient_id):
    """Get statistics for a patient"""
    from app.services import patient_service
    
    if patient_service is None:
        return jsonify({
            'status': 'error',
            'message': 'Patient service not initialized'
        }), 500
    
    stats = patient_service.get_patient_statistics(patient_id)
    
    if not stats:
        return jsonify({
            'status': 'error',
            'message': 'Patient non trouvé'
        }), 404
    
    return jsonify({
        'status': 'success',
        'statistics': stats
    })