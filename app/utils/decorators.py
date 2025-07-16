import functools
import logging
from flask import jsonify

logger = logging.getLogger(__name__)

def handle_errors(f):
    """Decorator to handle errors in API endpoints"""
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except ValueError as e:
            logger.warning(f"Validation error in {f.__name__}: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': str(e)
            }), 400
        except KeyError as e:
            logger.warning(f"Missing required field in {f.__name__}: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': f"Champ requis manquant: {str(e)}"
            }), 400
        except Exception as e:
            logger.error(f"Unexpected error in {f.__name__}: {str(e)}", exc_info=True)
            return jsonify({
                'status': 'error',
                'message': 'Une erreur inattendue s\'est produite'
            }), 500
    
    return decorated_function