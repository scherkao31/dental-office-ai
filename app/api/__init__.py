from app.api.main import main_bp
from app.api.patients import patients_bp
from app.api.appointments import appointments_bp
from app.api.treatments import treatments_bp
from app.api.financial import financial_bp
from app.api.ai import ai_bp

__all__ = ['main_bp', 'patients_bp', 'appointments_bp', 'treatments_bp', 'financial_bp', 'ai_bp']