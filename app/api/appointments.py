from datetime import datetime
from flask import Blueprint, request, jsonify

appointments_bp = Blueprint('appointments', __name__)

@appointments_bp.route('/', methods=['GET', 'POST'])
def manage_appointments():
    """Manage appointments - GET to retrieve, POST to create"""
    from app.services import appointment_service
    
    if appointment_service is None:
        return jsonify({
            'status': 'error',
            'message': 'Appointment service not initialized'
        }), 500
    
    if request.method == 'GET':
        # Get appointments by date range or patient
        patient_id = request.args.get('patient_id')
        date = request.args.get('date')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if patient_id:
            appointments = appointment_service.get_appointments_by_patient(patient_id)
        elif date:
            date_obj = datetime.fromisoformat(date).date()
            appointments = appointment_service.get_appointments_by_date(date_obj)
        elif start_date and end_date:
            start = datetime.fromisoformat(start_date).date()
            end = datetime.fromisoformat(end_date).date()
            appointments = appointment_service.get_appointments_range(start, end)
        else:
            # Default to today's appointments
            appointments = appointment_service.get_appointments_by_date(datetime.now().date())
        
        return jsonify({
            'status': 'success',
            'appointments': [a.to_dict() for a in appointments]
        })
    
    elif request.method == 'POST':
        try:
            data = request.json
            appointment = appointment_service.create_appointment(data)
            
            return jsonify({
                'status': 'success',
                'message': 'Rendez-vous créé avec succès',
                'appointment': appointment.to_dict()
            }), 201
            
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': str(e)
            }), 400

@appointments_bp.route('/<appointment_id>', methods=['GET', 'PUT', 'DELETE'])
def manage_appointment(appointment_id):
    """Manage specific appointment"""
    from app.services import appointment_service
    
    if appointment_service is None:
        return jsonify({
            'status': 'error',
            'message': 'Appointment service not initialized'
        }), 500
    
    if request.method == 'GET':
        appointment = appointment_service.get_appointment(appointment_id)
        if not appointment:
            return jsonify({
                'status': 'error',
                'message': 'Rendez-vous non trouvé'
            }), 404
        
        return jsonify({
            'status': 'success',
            'appointment': appointment.to_dict()
        })
    
    elif request.method == 'PUT':
        try:
            data = request.json
            appointment = appointment_service.update_appointment(appointment_id, data)
            
            if not appointment:
                return jsonify({
                    'status': 'error',
                    'message': 'Rendez-vous non trouvé'
                }), 404
            
            return jsonify({
                'status': 'success',
                'message': 'Rendez-vous mis à jour avec succès',
                'appointment': appointment.to_dict()
            })
            
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': str(e)
            }), 400
    
    elif request.method == 'DELETE':
        success = appointment_service.delete_appointment(appointment_id)
        
        if not success:
            return jsonify({
                'status': 'error',
                'message': 'Rendez-vous non trouvé'
            }), 404
        
        return jsonify({
            'status': 'success',
            'message': 'Rendez-vous supprimé avec succès'
        })

@appointments_bp.route('/<appointment_id>/move', methods=['PUT'])
def move_appointment(appointment_id):
    """Move an appointment to a new date/time"""
    from app.services import appointment_service
    
    if appointment_service is None:
        return jsonify({
            'status': 'error',
            'message': 'Appointment service not initialized'
        }), 500
    
    try:
        data = request.json
        new_date = datetime.fromisoformat(data['new_date']).date()
        new_time = datetime.fromisoformat(data['new_time']).time()
        
        appointment = appointment_service.reschedule_appointment(
            appointment_id, new_date, new_time
        )
        
        if not appointment:
            return jsonify({
                'status': 'error',
                'message': 'Impossible de déplacer le rendez-vous - créneau non disponible'
            }), 400
        
        return jsonify({
            'status': 'success',
            'message': 'Rendez-vous déplacé avec succès',
            'appointment': appointment.to_dict()
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400

@appointments_bp.route('/available-slots', methods=['GET'])
def get_available_slots():
    """Get available appointment slots for a date"""
    from app.services import appointment_service
    
    if appointment_service is None:
        return jsonify({
            'status': 'error',
            'message': 'Appointment service not initialized'
        }), 500
    
    try:
        date = request.args.get('date')
        duration = int(request.args.get('duration', 60))
        
        if not date:
            return jsonify({
                'status': 'error',
                'message': 'Date requise'
            }), 400
        
        date_obj = datetime.fromisoformat(date).date()
        slots = appointment_service.find_available_slots(date_obj, duration)
        
        return jsonify({
            'status': 'success',
            'slots': slots
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400

@appointments_bp.route('/bulk-reschedule', methods=['POST'])
def bulk_reschedule():
    """Reschedule multiple appointments"""
    from app.services import appointment_service
    
    if appointment_service is None:
        return jsonify({
            'status': 'error',
            'message': 'Appointment service not initialized'
        }), 500
    
    try:
        data = request.json
        appointments = data.get('appointments', [])
        
        result = appointment_service.bulk_reschedule(appointments)
        
        return jsonify({
            'status': 'success',
            'result': result
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400

@appointments_bp.route('/statistics/<date>', methods=['GET'])
def get_daily_statistics(date):
    """Get statistics for a specific day"""
    from app.services import appointment_service
    
    if appointment_service is None:
        return jsonify({
            'status': 'error',
            'message': 'Appointment service not initialized'
        }), 500
    
    try:
        date_obj = datetime.fromisoformat(date).date()
        stats = appointment_service.get_daily_statistics(date_obj)
        
        return jsonify({
            'status': 'success',
            'statistics': stats
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 400