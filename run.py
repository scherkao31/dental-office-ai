import os
from app import create_app

# Create the Flask app
app = create_app(os.environ.get('FLASK_CONFIG', 'development'))

if __name__ == '__main__':
    # This is only for local development
    # In production, Gunicorn will import this file and use the 'app' object
    app.run(host='0.0.0.0', port=5001, debug=False)