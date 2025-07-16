#!/usr/bin/env python
"""
Dental AI Suite - Main entry point
"""
import os
import sys
from app import create_app

# Get configuration from environment
config_name = os.environ.get('FLASK_CONFIG', 'development')

# Create Flask app
app = create_app(config_name)

if __name__ == '__main__':
    # Get port from environment or default
    port = int(os.environ.get('PORT', 5001))
    
    # Run the application
    app.run(
        host='0.0.0.0',
        port=port,
        debug=app.config['DEBUG']
    )