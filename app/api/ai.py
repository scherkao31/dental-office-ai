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
        
        return jsonify({
            'status': 'success',
            'response': result['response'],
            'references': result['references']
        })
        
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

@ai_bp.route('/download-patient-education', methods=['POST'])
def download_patient_education():
    """Generate and download patient education PDF"""
    from app.services import pdf_service
    
    if pdf_service is None:
        return jsonify({
            'status': 'error',
            'message': 'PDF service not initialized'
        }), 500
    
    try:
        data = request.json
        content = data.get('content', '')
        title = data.get('title', 'Information Patient')
        patient_name = data.get('patient_name', 'Patient')
        
        if not content:
            return jsonify({
                'status': 'error',
                'message': 'Contenu requis'
            }), 400
        
        pdf_path = pdf_service.generate_patient_education_pdf(content, title, patient_name)
        
        return send_file(
            pdf_path,
            as_attachment=True,
            download_name=f"education_{patient_name.replace(' ', '_')}.pdf",
            mimetype='application/pdf'
        )
        
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
    """Get detailed information about a reference"""
    try:
        # Parse reference type from ID
        if reference_id.startswith('case_'):
            ref_type = 'case'
        elif reference_id.startswith('knowledge_'):
            ref_type = 'knowledge'
        else:
            return jsonify({
                'status': 'error',
                'message': 'Type de référence invalide'
            }), 400
        
        # TODO: Implement retrieval of specific reference
        # For now, return a placeholder
        return jsonify({
            'status': 'success',
            'reference': {
                'id': reference_id,
                'type': ref_type,
                'title': 'Reference Title',
                'content': 'Reference content would be retrieved here',
                'metadata': {}
            }
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500