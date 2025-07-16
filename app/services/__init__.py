from app.services.patient_service import PatientService
from app.services.appointment_service import AppointmentService
from app.services.treatment_service import TreatmentService
from app.services.financial_service import FinancialService
from app.services.ai_service import AIService
from app.services.rag_service import RAGService
from app.services.pdf_service import PDFService
from app.services.powerpoint_service import PowerPointService

# Service instances
patient_service = None
appointment_service = None
treatment_service = None
financial_service = None
ai_service = None
rag_service = None
pdf_service = None
powerpoint_service = None

def init_services(app):
    """Initialize all services with app context"""
    global patient_service, appointment_service, treatment_service
    global financial_service, ai_service, rag_service
    global pdf_service, powerpoint_service
    
    # Initialize RAG system first as others depend on it
    rag_service = RAGService()
    rag_service.initialize()
    
    # Initialize AI service with RAG
    ai_service = AIService(rag_service)
    
    # Initialize other services
    patient_service = PatientService()
    appointment_service = AppointmentService()
    treatment_service = TreatmentService()
    financial_service = FinancialService()
    pdf_service = PDFService()
    powerpoint_service = PowerPointService()
    
    app.logger.info("All services initialized successfully")

__all__ = [
    'PatientService', 'AppointmentService', 'TreatmentService',
    'FinancialService', 'AIService', 'RAGService',
    'PDFService', 'PowerPointService',
    'init_services',
    'patient_service', 'appointment_service', 'treatment_service',
    'financial_service', 'ai_service', 'rag_service',
    'pdf_service', 'powerpoint_service'
]