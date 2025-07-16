import uuid
import json
from datetime import datetime
from typing import List, Dict, Optional
from app import db
from app.models import TreatmentPlan, Patient, Appointment

class TreatmentService:
    """Service for managing treatment plans"""
    
    def create_treatment_plan(self, patient_id: str, plan_data: Dict, consultation_text: Optional[str] = None) -> TreatmentPlan:
        """Create a new treatment plan"""
        treatment_plan = TreatmentPlan(
            id=str(uuid.uuid4()),
            patient_id=patient_id,
            plan_data=json.dumps(plan_data, ensure_ascii=False),
            consultation_text=consultation_text,
            status='active'
        )
        
        db.session.add(treatment_plan)
        db.session.commit()
        return treatment_plan
    
    def get_treatment_plan(self, plan_id: str) -> Optional[TreatmentPlan]:
        """Get a treatment plan by ID"""
        return TreatmentPlan.query.get(plan_id)
    
    def get_patient_treatment_plans(self, patient_id: str) -> List[TreatmentPlan]:
        """Get all treatment plans for a patient"""
        return TreatmentPlan.query.filter_by(patient_id=patient_id).order_by(
            TreatmentPlan.created_at.desc()
        ).all()
    
    def get_active_treatment_plans(self) -> List[TreatmentPlan]:
        """Get all active treatment plans"""
        return TreatmentPlan.query.filter_by(status='active').order_by(
            TreatmentPlan.created_at.desc()
        ).all()
    
    def update_treatment_plan(self, plan_id: str, plan_data: Optional[Dict] = None, 
                            consultation_text: Optional[str] = None, status: Optional[str] = None) -> Optional[TreatmentPlan]:
        """Update a treatment plan"""
        treatment_plan = self.get_treatment_plan(plan_id)
        if not treatment_plan:
            return None
        
        if plan_data is not None:
            treatment_plan.plan_data = json.dumps(plan_data, ensure_ascii=False)
        
        if consultation_text is not None:
            treatment_plan.consultation_text = consultation_text
        
        if status is not None:
            treatment_plan.status = status
        
        treatment_plan.updated_at = datetime.utcnow()
        db.session.commit()
        return treatment_plan
    
    def delete_treatment_plan(self, plan_id: str) -> bool:
        """Delete a treatment plan"""
        treatment_plan = self.get_treatment_plan(plan_id)
        if not treatment_plan:
            return False
        
        db.session.delete(treatment_plan)
        db.session.commit()
        return True
    
    def parse_treatment_plan(self, plan_id: str) -> Dict:
        """Parse treatment plan data from JSON"""
        treatment_plan = self.get_treatment_plan(plan_id)
        if not treatment_plan:
            return {}
        
        try:
            return json.loads(treatment_plan.plan_data)
        except:
            return {}
    
    def calculate_treatment_cost(self, plan_id: str) -> Dict:
        """Calculate total cost of a treatment plan"""
        plan_data = self.parse_treatment_plan(plan_id)
        
        total_cost = 0
        items = []
        
        for sequence in plan_data.get('sequences', []):
            for treatment in sequence.get('treatments', []):
                cost = treatment.get('cost', 0)
                total_cost += cost
                items.append({
                    'description': treatment.get('description', ''),
                    'code': treatment.get('code', ''),
                    'cost': cost
                })
        
        return {
            'total_cost': total_cost,
            'items': items,
            'currency': 'CHF'
        }
    
    def get_treatment_progress(self, plan_id: str) -> Dict:
        """Get progress of a treatment plan"""
        treatment_plan = self.get_treatment_plan(plan_id)
        if not treatment_plan:
            return {}
        
        # Get completed appointments for this plan
        completed_appointments = Appointment.query.filter_by(
            treatment_plan_id=plan_id,
            status='completed'
        ).count()
        
        # Parse plan to get total treatments
        plan_data = self.parse_treatment_plan(plan_id)
        total_treatments = sum(
            len(seq.get('treatments', [])) 
            for seq in plan_data.get('sequences', [])
        )
        
        progress_percentage = (completed_appointments / total_treatments * 100) if total_treatments > 0 else 0
        
        return {
            'completed_treatments': completed_appointments,
            'total_treatments': total_treatments,
            'progress_percentage': round(progress_percentage, 2),
            'status': treatment_plan.status
        }
    
    def generate_treatment_sequence(self, treatments: List[Dict]) -> List[Dict]:
        """Generate an optimized treatment sequence"""
        # Group treatments by priority and dependencies
        sequences = []
        
        # Priority 1: Urgent treatments
        urgent = [t for t in treatments if t.get('priority') == 'urgent']
        if urgent:
            sequences.append({
                'sequence': 1,
                'title': 'Traitements urgents',
                'treatments': urgent
            })
        
        # Priority 2: Preparatory treatments
        prep = [t for t in treatments if t.get('priority') == 'preparatory']
        if prep:
            sequences.append({
                'sequence': 2,
                'title': 'Préparation',
                'treatments': prep
            })
        
        # Priority 3: Main treatments
        main = [t for t in treatments if t.get('priority') == 'main']
        if main:
            sequences.append({
                'sequence': 3,
                'title': 'Traitements principaux',
                'treatments': main
            })
        
        # Priority 4: Finishing treatments
        finishing = [t for t in treatments if t.get('priority') == 'finishing']
        if finishing:
            sequences.append({
                'sequence': 4,
                'title': 'Finitions',
                'treatments': finishing
            })
        
        return sequences
    
    def clone_treatment_plan(self, plan_id: str, new_patient_id: str) -> Optional[TreatmentPlan]:
        """Clone a treatment plan for another patient"""
        original = self.get_treatment_plan(plan_id)
        if not original:
            return None
        
        plan_data = self.parse_treatment_plan(plan_id)
        
        return self.create_treatment_plan(
            patient_id=new_patient_id,
            plan_data=plan_data,
            consultation_text=f"Plan cloné depuis le plan {plan_id}"
        )