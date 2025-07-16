import os
import logging
from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

from app.config import config

db = SQLAlchemy()
migrate = Migrate()

def create_app(config_name=None):
    if config_name is None:
        config_name = os.environ.get('FLASK_CONFIG', 'development')
    
    app = Flask(__name__, 
                template_folder='../templates',
                static_folder='../static')
    
    app.config.from_object(config[config_name])
    config[config_name].init_app(app)
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app)
    
    # Configure logging
    if not app.debug and not app.testing:
        logging.basicConfig(
            level=getattr(logging, app.config['LOG_LEVEL']),
            format='%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        if app.config.get('LOG_FILE'):
            file_handler = logging.FileHandler(app.config['LOG_FILE'])
            file_handler.setLevel(logging.INFO)
            file_handler.setFormatter(logging.Formatter(
                '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
            ))
            app.logger.addHandler(file_handler)
        
        app.logger.info('Dental AI Suite startup')
    
    # Register blueprints
    from app.api import (
        main_bp, patients_bp, appointments_bp, 
        treatments_bp, financial_bp, ai_bp
    )
    
    app.register_blueprint(main_bp)
    app.register_blueprint(patients_bp, url_prefix='/api/patients')
    app.register_blueprint(appointments_bp, url_prefix='/api/appointments')
    app.register_blueprint(treatments_bp, url_prefix='/api/treatments')
    app.register_blueprint(financial_bp, url_prefix='/api/financial')
    app.register_blueprint(ai_bp, url_prefix='/api/ai')
    
    # Initialize services
    with app.app_context():
        from app.services import init_services
        init_services(app)
        
        # Initialize database
        db.create_all()
    
    return app