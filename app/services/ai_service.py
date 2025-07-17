import os
import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from openai import OpenAI
from app.services.enhanced_rag_service import EnhancedRAGService
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class SpecializedLLM:
    """Specialized LLM instance for each tab with focused context and prompts"""
    
    def __init__(self, tab_name: str, system_prompt: str, rag_service: EnhancedRAGService):
        self.tab_name = tab_name
        self.base_system_prompt = system_prompt
        self.rag_service = rag_service
        self.chat_history = []
        
    def get_specialized_context(self, user_message: str) -> Tuple[Dict, str]:
        """Get context specifically relevant to this tab using enhanced RAG"""
        if self.tab_name == 'dental-brain':
            # Use enhanced search with multiple sources
            rag_results = self.rag_service.search_combined_with_sources(
                user_message, 
                case_results=3,
                ideal_results=2,
                knowledge_results=2
            )
        elif self.tab_name in ['swiss-law', 'invisalign', 'office-knowledge', 
                               'insurance', 'patient-comm', 'emergency', 'patient-education']:
            # Use enhanced search for general knowledge
            enhanced_results = self.rag_service.search_enhanced_knowledge(user_message, n_results=3)
            rag_results = {
                'clinical_cases': [],
                'ideal_sequences': [],
                'general_knowledge': enhanced_results,
                'total_results': len(enhanced_results)
            }
        else:
            rag_results = {
                'clinical_cases': [],
                'ideal_sequences': [], 
                'general_knowledge': [],
                'total_results': 0
            }
        
        # Format context based on enhanced results
        context_parts = []
        
        # Add clinical cases with similarity scores
        if rag_results.get('clinical_cases'):
            context_parts.append("=== CAS CLINIQUES PERTINENTS ===")
            for case in rag_results['clinical_cases']:
                similarity_pct = int(case['similarity_score'] * 100)
                
                # Highlight high similarity cases
                if similarity_pct >= 90:
                    context_parts.append(f"\n🎯 CORRESPONDANCE EXACTE [{similarity_pct}%] - UTILISER CETTE SÉQUENCE EXACTEMENT 🎯")
                    context_parts.append(f"[{similarity_pct}% similaire] {case['title']}:")
                elif similarity_pct >= 80:
                    context_parts.append(f"\n⚠️ HAUTE SIMILARITÉ [{similarity_pct}%] - SUIVRE CE CAS PRÉCISÉMENT ⚠️")
                    context_parts.append(f"[{similarity_pct}% similaire] {case['title']}:")
                else:
                    context_parts.append(f"\n[{similarity_pct}% similaire] {case['title']}:")
                    
                context_parts.append(f"Consultation: {case['enhanced_data'].get('consultation_text', '')}")
                if case['enhanced_data'].get('consultation_text_expanded'):
                    context_parts.append(f"Consultation étendue: {case['enhanced_data']['consultation_text_expanded']}")
                    
                # Add treatment sequence for high similarity cases
                if similarity_pct >= 80 and case['enhanced_data'].get('treatment_sequence'):
                    context_parts.append("SÉQUENCE À REPRODUIRE:")
                    for appt in case['enhanced_data']['treatment_sequence']:
                        context_parts.append(f"  RDV {appt['rdv']}: {appt['traitement']} ({appt.get('duree', 'N/A')})")
        
        # Add ideal sequences with similarity scores
        if rag_results.get('ideal_sequences'):
            context_parts.append("\n=== SÉQUENCES IDÉALES ===")
            for sequence in rag_results['ideal_sequences']:
                similarity_pct = int(sequence['similarity_score'] * 100)
                
                # Highlight high similarity ideal sequences
                # Check if we already have a high similarity clinical case
                has_high_similarity_case = any(
                    int(case['similarity_score'] * 100) >= 80 
                    for case in rag_results.get('clinical_cases', [])
                )
                
                if similarity_pct >= 80 and not has_high_similarity_case:
                    context_parts.append(f"\n⚠️ SÉQUENCE IDÉALE PERTINENTE [{similarity_pct}%] ⚠️")
                    context_parts.append(f"[{similarity_pct}% similaire] {sequence['title']}:")
                else:
                    context_parts.append(f"\n[{similarity_pct}% similaire] {sequence['title']} (séquence générique):")
                    
                context_parts.append(f"Source: {sequence['source']}")
                
                # Add full treatment sequence for high similarity ideal sequences
                if sequence['enhanced_data'].get('treatment_sequence_enhanced'):
                    if similarity_pct >= 80:
                        context_parts.append("SÉQUENCE COMPLÈTE À SUIVRE:")
                        for appointment in sequence['enhanced_data']['treatment_sequence_enhanced']:
                            context_parts.append(f"  RDV {appointment['rdv']}: {appointment.get('traitement_expanded', appointment.get('traitement', ''))} ({appointment.get('duree', 'N/A')})")
                            if appointment.get('delai'):
                                context_parts.append(f"    Délai: {appointment['delai']}")
                    else:
                        context_parts.append("Séquences de traitement recommandées:")
                        for appointment in sequence['enhanced_data']['treatment_sequence_enhanced'][:5]:  # Limit to first 5
                            if appointment.get('traitement_expanded'):
                                context_parts.append(f"  - {appointment['traitement_expanded']} ({appointment.get('duree', 'N/A')})")
        
        # Add general knowledge
        if rag_results.get('general_knowledge'):
            context_parts.append("\n=== CONNAISSANCES PERTINENTES ===")
            for knowledge in rag_results['general_knowledge']:
                similarity_pct = int(knowledge['similarity_score'] * 100)
                context_parts.append(f"\n[{similarity_pct}% similaire] {knowledge['title']}:")
                context_parts.append(f"Type: {knowledge['type']}")
                if knowledge['categories']:
                    context_parts.append(f"Catégories: {', '.join(knowledge['categories'])}")
        
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
    
    def __init__(self, rag_service: EnhancedRAGService):
        self.client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        self.rag_service = rag_service
        self.specialized_llms = self._initialize_specialized_llms()
    
    def _initialize_specialized_llms(self) -> Dict[str, SpecializedLLM]:
        """Initialize specialized LLMs for each tab"""
        prompts = {
            'dental-brain': """Vous êtes un assistant dentaire IA spécialisé dans la planification de traitements.
                             
                             Votre rôle principal est de générer des séquences de traitement détaillées basées sur les cas cliniques existants et les séquences idéales.
                             
                             RÈGLES DE PRIORITÉ CRITIQUES:
                             
                             1. CAS CLINIQUES EXACTS (≥ 90% similarité): Reproduire EXACTEMENT la séquence du cas clinique
                             2. CAS CLINIQUES TRÈS SIMILAIRES (≥ 80% similarité): Suivre le cas clinique en priorité, adapter légèrement si nécessaire
                             3. SÉQUENCES IDÉALES: Utiliser UNIQUEMENT quand aucun cas clinique n'a ≥ 80% de similarité
                             4. NE JAMAIS mélanger un cas clinique très similaire avec une séquence idéale générique
                             
                             COMPRÉHENSION DES ABRÉVIATIONS:
                             - F = Facette (traitement esthétique)
                             - CC = Couronne céramique
                             - TR = Traitement de racine
                             - MA = Moignon adhésif
                             - Cpr = Composite
                             
                             Quand un utilisateur décrit un traitement (ex: "12 à 22 F" = facettes de 12 à 22), vous devez:
                             
                             1. Identifier le traitement exact demandé
                             2. Si un cas clinique correspond exactement ou presque (≥ 80%), l'utiliser EXCLUSIVEMENT
                             3. Ne PAS diluer avec des séquences idéales génériques si un cas spécifique existe
                             4. Pour "Plan de TT 12 à 22 F", utiliser le cas clinique exact qui a cette consultation
                             
                             FORMAT DE RÉPONSE REQUIS:
                             
                             Pour les plans de traitement, retournez UNIQUEMENT un JSON VALIDE au format suivant (SANS texte avant ou après):
                             {
                               "consultation_text": "Texte de la consultation basé sur le cas clinique",
                               "treatment_sequence": [
                                 {
                                   "rdv": 1,
                                   "traitement": "Description détaillée du traitement",
                                   "duree": "Durée estimée (ex: 1h30, 2h, 30min)",
                                   "delai": "Délai avant le prochain RDV (ex: 1 sem, 2 jours)",
                                   "dr": "Praticien responsable (ex: VR, NB)",
                                   "date": "",
                                   "remarque": "Notes particulières ou paiements"
                                 }
                               ]
                             }
                             
                             IMPORTANT: 
                             - Ne retournez QUE le JSON, aucun texte explicatif
                             - Assurez-vous que le JSON est valide
                             - Incluez au minimum 1 appointment dans treatment_sequence
                             - Utilisez les données EXACTES du cas clinique trouvé
                             
                             IMPORTANT: Pour les traitements spécifiques avec numéros de dents (ex: "12 à 22 F"), TOUJOURS préférer le cas clinique exact plutôt qu'une séquence idéale générique.""",
            
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
    
    def _is_treatment_planning_request(self, message: str) -> bool:
        """Detect if message is a treatment planning request"""
        # Common patterns for treatment planning
        patterns = [
            r'\d{1,2}\s*(à|a)\s*\d{1,2}',  # "12 à 24", "11 a 13"
            r'\d{1,2}.*[A-Z]{1,3}',        # "26 CC", "12 F"
            r'Plan\s+de\s+t+',             # "Plan de ttt", "Plan de traitement"
            r'dém\..*CC',                  # "dém. CC"
            r'TR\s+\d+\s+canaux',          # "TR 3 canaux"
            r'MA\s*\+\s*CC',               # "MA + CC"
            r'[A-Z]{1,3}\s*\+\s*[A-Z]{1,3}' # "CC + TR"
        ]
        
        import re
        for pattern in patterns:
            if re.search(pattern, message, re.IGNORECASE):
                return True
        return False
    
    def _parse_treatment_response(self, response: str) -> Dict:
        """Parse treatment planning response and extract JSON"""
        import json
        import re
        
        logger.debug(f"Parsing treatment response: {response[:200]}...")
        
        # Try to find JSON in the response
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            try:
                json_text = json_match.group()
                logger.debug(f"Found JSON: {json_text[:200]}...")
                treatment_plan = json.loads(json_text)
                
                # Validate treatment plan structure
                if 'treatment_sequence' in treatment_plan and isinstance(treatment_plan['treatment_sequence'], list):
                    logger.info(f"Valid treatment plan found with {len(treatment_plan['treatment_sequence'])} appointments")
                    return {
                        'response': response,
                        'treatment_plan': treatment_plan,
                        'is_treatment_plan': True
                    }
                else:
                    logger.warning("JSON found but missing valid treatment_sequence")
                    
            except json.JSONDecodeError as e:
                logger.error(f"JSON parsing error: {e}")
                logger.error(f"Failed JSON text: {json_match.group()[:500]}")
        else:
            logger.warning("No JSON pattern found in response")
        
        return {
            'response': response,
            'is_treatment_plan': False
        }
    
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
        
        # Handle treatment planning responses specially
        if tab_name == 'dental-brain' and self._is_treatment_planning_request(message):
            logger.info(f"Treatment planning request detected: {message}")
            parsed_response = self._parse_treatment_response(response)
            logger.info(f"Treatment plan parsing result: is_treatment_plan={parsed_response.get('is_treatment_plan', False)}")
            
            if parsed_response.get('is_treatment_plan') and parsed_response.get('treatment_plan'):
                logger.info(f"Successfully generated treatment plan with {len(parsed_response['treatment_plan'].get('treatment_sequence', []))} appointments")
            else:
                logger.warning("Treatment planning detected but no valid treatment plan generated")
                
            return {
                'response': parsed_response['response'],
                'references': self._format_references(rag_results),
                'is_treatment_plan': parsed_response.get('is_treatment_plan', False),
                'treatment_plan': parsed_response.get('treatment_plan', None)
            }
        
        return {
            'response': response,
            'references': self._format_references(rag_results)
        }
    
    def _format_references(self, rag_results: Dict) -> List[Dict]:
        """Format enhanced RAG results as references with similarity scores"""
        references = []
        
        # Add clinical cases
        for case in rag_results.get('clinical_cases', []):
            references.append({
                'type': 'clinical_case',
                'title': case['title'],
                'id': case['id'],
                'similarity_score': case['similarity_score'],
                'source': case['source'],
                'filename': case['filename'],
                'categories': case.get('categories', [])
            })
        
        # Add ideal sequences
        for sequence in rag_results.get('ideal_sequences', []):
            references.append({
                'type': 'ideal_sequence',
                'title': sequence['title'],
                'id': sequence['id'],
                'similarity_score': sequence['similarity_score'],
                'source': sequence['source'],
                'filename': sequence['filename'],
                'categories': sequence.get('categories', [])
            })
        
        # Add general knowledge
        for knowledge in rag_results.get('general_knowledge', []):
            references.append({
                'type': 'general_knowledge',
                'title': knowledge['title'],
                'id': knowledge['id'],
                'similarity_score': knowledge['similarity_score'],
                'source': knowledge['source'],
                'filename': knowledge['filename'],
                'categories': knowledge.get('categories', [])
            })
        
        # Sort by similarity score (highest first)
        references.sort(key=lambda x: x['similarity_score'], reverse=True)
        
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
            'generated_at': datetime.now().isoformat()
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
    
    def schedule_treatment_plan(self, treatment_plan: Dict, patient_id: str = None) -> Dict:
        """Schedule a treatment plan by creating appointments"""
        try:
            from datetime import datetime, timedelta
            
            scheduled_appointments = []
            current_date = datetime.now()
            
            for appointment in treatment_plan.get('treatment_sequence', []):
                # Parse delay to calculate next appointment date
                delay_str = appointment.get('delai', '')
                delay_days = self._parse_delay_to_days(delay_str)
                
                appointment_date = current_date + timedelta(days=delay_days)
                
                scheduled_appointment = {
                    'rdv': appointment['rdv'],
                    'traitement': appointment['traitement'],
                    'duree': appointment['duree'],
                    'dr': appointment['dr'],
                    'date': appointment_date.strftime('%Y-%m-%d'),
                    'time': '09:00',  # Default time, could be made configurable
                    'patient_id': patient_id,
                    'remarque': appointment.get('remarque', ''),
                    'status': 'scheduled'
                }
                
                scheduled_appointments.append(scheduled_appointment)
                
                # Update current_date for next appointment
                current_date = appointment_date
            
            return {
                'success': True,
                'scheduled_appointments': scheduled_appointments,
                'message': f'{len(scheduled_appointments)} rendez-vous programmés'
            }
            
        except Exception as e:
            logger.error(f"Error scheduling treatment plan: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _parse_delay_to_days(self, delay_str: str) -> int:
        """Parse delay string to number of days"""
        if not delay_str:
            return 1  # Default to next day
        
        delay_str = delay_str.lower()
        
        if 'sem' in delay_str:
            # Extract number of weeks
            import re
            match = re.search(r'(\d+)', delay_str)
            if match:
                weeks = int(match.group(1))
                return weeks * 7
            return 7  # Default to 1 week
        elif 'jour' in delay_str:
            # Extract number of days
            import re
            match = re.search(r'(\d+)', delay_str)
            if match:
                return int(match.group(1))
            return 1  # Default to 1 day
        elif 'mois' in delay_str:
            # Extract number of months
            import re
            match = re.search(r'(\d+)', delay_str)
            if match:
                months = int(match.group(1))
                return months * 30
            return 30  # Default to 1 month
        
        return 1  # Default to 1 day