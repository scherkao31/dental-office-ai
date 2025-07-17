from flask import Blueprint, request, jsonify, send_file

ai_bp = Blueprint('ai', __name__)

@ai_bp.route('/chat', methods=['POST'])
def chat():
    """Process chat message with AI"""
    from app.services import ai_service
    
    if ai_service is None:
        return jsonify({
            'status': 'error',
            'message': 'AI service not initialized'
        }), 500
    
    try:
        data = request.json
        tab_name = data.get('tab', 'dental-brain')
        message = data.get('message', '')
        
        if not message:
            return jsonify({
                'status': 'error',
                'message': 'Message requis'
            }), 400
        
        # Process message with AI
        result = ai_service.process_chat_message(message, tab_name)
        
        response_data = {
            'status': 'success',
            'response': result['response'],
            'references': result['references']
        }
        
        # Add treatment plan data if available
        if result.get('is_treatment_plan') and result.get('treatment_plan'):
            response_data['treatment_plan'] = result['treatment_plan']
            response_data['is_treatment_plan'] = True
        
        return jsonify(response_data)
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@ai_bp.route('/schedule-treatment-plan', methods=['POST'])
def schedule_treatment_plan():
    """Schedule a treatment plan by creating appointments"""
    from app.services import ai_service
    
    if ai_service is None:
        return jsonify({
            'status': 'error',
            'message': 'AI service not initialized'
        }), 500
    
    try:
        data = request.json
        treatment_plan = data.get('treatment_plan', {})
        patient_id = data.get('patient_id')
        
        if not treatment_plan:
            return jsonify({
                'status': 'error',
                'message': 'Plan de traitement requis'
            }), 400
        
        result = ai_service.schedule_treatment_plan(treatment_plan, patient_id)
        
        if result['success']:
            return jsonify({
                'status': 'success',
                'scheduled_appointments': result['scheduled_appointments'],
                'message': result['message']
            })
        else:
            return jsonify({
                'status': 'error',
                'message': result['error']
            }), 500
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@ai_bp.route('/generate-treatment-plan', methods=['POST'])
def generate_treatment_plan():
    """Generate treatment plan using AI"""
    from app.services import ai_service
    
    if ai_service is None:
        return jsonify({
            'status': 'error',
            'message': 'AI service not initialized'
        }), 500
    
    try:
        data = request.json
        patient_data = data.get('patient', {})
        symptoms = data.get('symptoms', '')
        
        if not symptoms:
            return jsonify({
                'status': 'error',
                'message': 'Symptômes requis'
            }), 400
        
        result = ai_service.generate_treatment_plan(patient_data, symptoms)
        
        return jsonify({
            'status': 'success',
            'treatment_plan': result
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@ai_bp.route('/generate-patient-education', methods=['POST'])
def generate_patient_education():
    """Generate patient education content"""
    from app.services import ai_service
    
    if ai_service is None:
        return jsonify({
            'status': 'error',
            'message': 'AI service not initialized'
        }), 500
    
    try:
        data = request.json
        topic = data.get('topic', '')
        patient_context = data.get('patient_context')
        
        if not topic:
            return jsonify({
                'status': 'error',
                'message': 'Sujet requis'
            }), 400
        
        content = ai_service.generate_patient_education(topic, patient_context)
        
        return jsonify({
            'status': 'success',
            'content': content
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@ai_bp.route('/analyze-schedule', methods=['POST'])
def analyze_schedule_request():
    """Analyze scheduling request with AI"""
    from app.services import ai_service
    
    if ai_service is None:
        return jsonify({
            'status': 'error',
            'message': 'AI service not initialized'
        }), 500
    
    try:
        data = request.json
        request_text = data.get('request', '')
        current_schedule = data.get('schedule', {})
        
        if not request_text:
            return jsonify({
                'status': 'error',
                'message': 'Demande requise'
            }), 400
        
        result = ai_service.analyze_schedule_request(request_text, current_schedule)
        
        return jsonify({
            'status': 'success',
            'analysis': result
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@ai_bp.route('/search', methods=['POST'])
def search_knowledge():
    """Search knowledge base"""
    try:
        data = request.json
        query = data.get('query', '')
        search_type = data.get('type', 'combined')  # 'cases', 'knowledge', or 'combined'
        
        if not query:
            return jsonify({
                'status': 'error',
                'message': 'Requête de recherche requise'
            }), 400
        
        # Use RAG service directly for search
        from app.services import rag_service
        
        if search_type == 'cases':
            results = {'cases': rag_service.search_cases(query), 'knowledge': []}
        elif search_type == 'knowledge':
            results = {'cases': [], 'knowledge': rag_service.search_knowledge(query)}
        else:
            results = rag_service.search_combined(query)
        
        return jsonify({
            'status': 'success',
            'results': results
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@ai_bp.route('/reference/<reference_id>', methods=['GET'])
def get_reference_details(reference_id):
    """Get detailed information about a specific reference"""
    from app.services import rag_service
    
    if rag_service is None:
        return jsonify({
            'status': 'error',
            'message': 'RAG service not initialized'
        }), 500
    
    try:
        # Get detailed reference information
        reference_details = rag_service.get_detailed_reference(reference_id)
        
        if reference_details:
            return jsonify({
                'status': 'success',
                'reference': reference_details
            })
        else:
            return jsonify({
                'status': 'error',
                'message': 'Reference not found'
            }), 404
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500