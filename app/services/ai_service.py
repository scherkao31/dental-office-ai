import os
import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from openai import OpenAI
from app.services.rag_service import RAGService

logger = logging.getLogger(__name__)

class SpecializedLLM:
    """Specialized LLM instance for each tab with focused context and prompts"""
    
    def __init__(self, tab_name: str, system_prompt: str, rag_service: RAGService):
        self.tab_name = tab_name
        self.base_system_prompt = system_prompt
        self.rag_service = rag_service
        self.chat_history = []
        
    def get_specialized_context(self, user_message: str) -> Tuple[Dict, str]:
        """Get context specifically relevant to this tab"""
        if self.tab_name == 'dental-brain':
            rag_results = self.rag_service.search_combined(
                user_message, 
                case_results=3,
                knowledge_results=2
            )
        elif self.tab_name in ['swiss-law', 'invisalign', 'office-knowledge', 
                               'insurance', 'patient-comm', 'emergency', 'patient-education']:
            rag_results = self.rag_service.search_knowledge(user_message, n_results=2)
            rag_results = {'cases': [], 'knowledge': rag_results, 'total_results': len(rag_results)}
        else:
            rag_results = {'cases': [], 'knowledge': [], 'total_results': 0}
        
        # Format context based on results
        context_parts = []
        
        if rag_results.get('cases'):
            context_parts.append("=== CAS CLINIQUES PERTINENTS ===")
            for case in rag_results['cases']:
                context_parts.append(f"\n{case['title']}:\n{case['content']}")
        
        if rag_results.get('knowledge'):
            context_parts.append("\n=== CONNAISSANCES PERTINENTES ===")
            for knowledge in rag_results['knowledge']:
                context_parts.append(f"\n{knowledge['title']}:\n{knowledge['content']}")
        
        context = "\n".join(context_parts) if context_parts else ""
        return rag_results, context
    
    def format_prompt(self, user_message: str, context: str) -> str:
        """Format the complete prompt with context"""
        prompt_parts = [self.base_system_prompt]
        
        if context:
            prompt_parts.append(f"\n\n--- CONTEXTE SPÉCIFIQUE ---\n{context}")
        
        # Add recent chat history for context
        if self.chat_history:
            prompt_parts.append("\n\n--- HISTORIQUE RÉCENT ---")
            for h in self.chat_history[-3:]:  # Last 3 exchanges
                prompt_parts.append(f"User: {h['user']}")
                prompt_parts.append(f"Assistant: {h['assistant']}")
        
        return "\n".join(prompt_parts)

class AIService:
    """Service for managing AI/LLM operations"""
    
    def __init__(self, rag_service: RAGService):
        self.client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        self.rag_service = rag_service
        self.specialized_llms = self._initialize_specialized_llms()
    
    def _initialize_specialized_llms(self) -> Dict[str, SpecializedLLM]:
        """Initialize specialized LLMs for each tab"""
        prompts = {
            'dental-brain': """Vous êtes un assistant dentaire IA spécialisé dans la planification de traitements.
                             Fournissez des plans de traitement détaillés, des séquences cliniques et des conseils basés sur les meilleures pratiques.""",
            
            'swiss-law': """Vous êtes un expert en droit dentaire suisse.
                           Fournissez des conseils précis sur les lois, réglementations et obligations légales pour les dentistes en Suisse.""",
            
            'invisalign': """Vous êtes un spécialiste Invisalign certifié.
                            Aidez avec la sélection de cas, la planification de traitement et les protocoles Invisalign.""",
            
            'patient-education': """Vous êtes un éducateur patient expert.
                                  Créez du contenu éducatif clair et accessible pour les patients dentaires.""",
            
            'schedule': """Vous êtes un assistant de planification dentaire intelligent.
                         Aidez à reprogrammer les rendez-vous de manière autonome et efficace."""
        }
        
        llms = {}
        for tab_name, prompt in prompts.items():
            llms[tab_name] = SpecializedLLM(tab_name, prompt, self.rag_service)
        
        return llms
    
    def get_completion(self, messages: List[Dict], tab_name: str = None, 
                      temperature: float = 0.7, max_tokens: int = 2000) -> str:
        """Get completion from OpenAI"""
        try:
            response = self.client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Error getting AI completion: {str(e)}")
            raise
    
    def process_chat_message(self, message: str, tab_name: str) -> Dict:
        """Process a chat message with specialized context"""
        if tab_name not in self.specialized_llms:
            return {
                'response': "Tab non reconnu",
                'references': []
            }
        
        llm = self.specialized_llms[tab_name]
        
        # Get specialized context
        rag_results, context = llm.get_specialized_context(message)
        
        # Format prompt
        system_prompt = llm.format_prompt(message, context)
        
        # Get AI response
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message}
        ]
        
        response = self.get_completion(messages, tab_name)
        
        # Update chat history
        llm.chat_history.append({
            'user': message,
            'assistant': response
        })
        
        # Keep history limited
        if len(llm.chat_history) > 10:
            llm.chat_history = llm.chat_history[-10:]
        
        return {
            'response': response,
            'references': self._format_references(rag_results)
        }
    
    def _format_references(self, rag_results: Dict) -> List[Dict]:
        """Format RAG results as references"""
        references = []
        
        for case in rag_results.get('cases', []):
            references.append({
                'type': 'case',
                'title': case['title'],
                'id': case['id']
            })
        
        for knowledge in rag_results.get('knowledge', []):
            references.append({
                'type': 'knowledge',
                'title': knowledge['title'],
                'id': knowledge['id']
            })
        
        return references
    
    def generate_treatment_plan(self, patient_data: Dict, symptoms: str) -> Dict:
        """Generate a treatment plan using AI"""
        prompt = f"""
        Patient: {patient_data.get('first_name')} {patient_data.get('last_name')}
        Âge: {patient_data.get('age')}
        Symptômes/Besoins: {symptoms}
        
        Générez un plan de traitement détaillé incluant:
        1. Diagnostic
        2. Séquence de traitement
        3. Estimation des coûts
        4. Durée estimée
        """
        
        messages = [
            {"role": "system", "content": self.specialized_llms['dental-brain'].base_system_prompt},
            {"role": "user", "content": prompt}
        ]
        
        response = self.get_completion(messages, 'dental-brain')
        
        return {
            'plan': response,
            'generated_at': datetime.utcnow().isoformat()
        }
    
    def generate_patient_education(self, topic: str, patient_context: Optional[str] = None) -> str:
        """Generate patient education content"""
        prompt = f"Créez un document éducatif sur: {topic}"
        if patient_context:
            prompt += f"\n\nContexte patient: {patient_context}"
        
        messages = [
            {"role": "system", "content": self.specialized_llms['patient-education'].base_system_prompt},
            {"role": "user", "content": prompt}
        ]
        
        return self.get_completion(messages, 'patient-education')
    
    def analyze_schedule_request(self, request: str, current_schedule: Dict) -> Dict:
        """Analyze a scheduling request and propose changes"""
        prompt = f"""
        Demande: {request}
        
        Planning actuel:
        {current_schedule}
        
        Analysez cette demande et proposez les changements nécessaires.
        """
        
        messages = [
            {"role": "system", "content": self.specialized_llms['schedule'].base_system_prompt},
            {"role": "user", "content": prompt}
        ]
        
        response = self.get_completion(messages, 'schedule')
        
        # Parse response to extract structured actions
        # This would need more sophisticated parsing in production
        return {
            'analysis': response,
            'proposed_actions': []  # Would be parsed from response
        }