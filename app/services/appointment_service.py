import uuid
from datetime import datetime, timedelta, time
from typing import List, Dict, Optional
from app import db
from app.models import Appointment, Patient, ScheduleBlock

class AppointmentService:
    """Service for managing appointment operations"""
    
    def create_appointment(self, data: Dict) -> Appointment:
        """Create a new appointment"""
        appointment = Appointment(
            id=str(uuid.uuid4()),
            patient_id=data['patient_id'],
            appointment_date=datetime.fromisoformat(data['appointment_date']).date(),
            appointment_time=datetime.fromisoformat(data['appointment_time']).time(),
            duration_minutes=data.get('duration_minutes', 60),
            treatment_type=data.get('treatment_type'),
            status=data.get('status', 'scheduled'),
            doctor=data.get('doctor', 'Dr.'),
            room=data.get('room'),
            notes=data.get('notes'),
            treatment_plan_id=data.get('treatment_plan_id')
        )
        
        db.session.add(appointment)
        db.session.commit()
        return appointment
    
    def get_appointment(self, appointment_id: str) -> Optional[Appointment]:
        """Get an appointment by ID"""
        return Appointment.query.get(appointment_id)
    
    def get_appointments_by_date(self, date: datetime.date) -> List[Appointment]:
        """Get all appointments for a specific date"""
        return Appointment.query.filter_by(appointment_date=date).order_by(Appointment.appointment_time).all()
    
    def get_appointments_by_patient(self, patient_id: str) -> List[Appointment]:
        """Get all appointments for a patient"""
        return Appointment.query.filter_by(patient_id=patient_id).order_by(
            Appointment.appointment_date.desc(), 
            Appointment.appointment_time.desc()
        ).all()
    
    def get_appointments_range(self, start_date: datetime.date, end_date: datetime.date) -> List[Appointment]:
        """Get appointments within a date range"""
        return Appointment.query.filter(
            Appointment.appointment_date >= start_date,
            Appointment.appointment_date <= end_date
        ).order_by(Appointment.appointment_date, Appointment.appointment_time).all()
    
    def update_appointment(self, appointment_id: str, data: Dict) -> Optional[Appointment]:
        """Update an appointment"""
        appointment = self.get_appointment(appointment_id)
        if not appointment:
            return None
        
        # Update fields
        if 'appointment_date' in data:
            appointment.appointment_date = datetime.fromisoformat(data['appointment_date']).date()
        if 'appointment_time' in data:
            appointment.appointment_time = datetime.fromisoformat(data['appointment_time']).time()
        
        for field in ['duration_minutes', 'treatment_type', 'status', 'doctor', 'room', 'notes']:
            if field in data:
                setattr(appointment, field, data[field])
        
        appointment.updated_at = datetime.utcnow()
        db.session.commit()
        return appointment
    
    def delete_appointment(self, appointment_id: str) -> bool:
        """Delete an appointment"""
        appointment = self.get_appointment(appointment_id)
        if not appointment:
            return False
        
        db.session.delete(appointment)
        db.session.commit()
        return True
    
    def reschedule_appointment(self, appointment_id: str, new_date: datetime.date, new_time: time) -> Optional[Appointment]:
        """Reschedule an appointment"""
        appointment = self.get_appointment(appointment_id)
        if not appointment:
            return None
        
        # Check if new slot is available
        if not self.is_slot_available(new_date, new_time, appointment.duration_minutes, appointment_id):
            return None
        
        appointment.appointment_date = new_date
        appointment.appointment_time = new_time
        appointment.updated_at = datetime.utcnow()
        
        db.session.commit()
        return appointment
    
    def is_slot_available(self, date: datetime.date, start_time: time, duration_minutes: int, 
                         exclude_appointment_id: Optional[str] = None) -> bool:
        """Check if a time slot is available"""
        end_time = (datetime.combine(date, start_time) + timedelta(minutes=duration_minutes)).time()
        
        # Check for schedule blocks
        blocks = ScheduleBlock.query.filter_by(block_date=date).all()
        for block in blocks:
            if self._times_overlap(start_time, end_time, block.start_time, block.end_time):
                return False
        
        # Check for existing appointments
        appointments = self.get_appointments_by_date(date)
        for apt in appointments:
            if exclude_appointment_id and apt.id == exclude_appointment_id:
                continue
            
            apt_end_time = (datetime.combine(date, apt.appointment_time) + 
                           timedelta(minutes=apt.duration_minutes)).time()
            
            if self._times_overlap(start_time, end_time, apt.appointment_time, apt_end_time):
                return False
        
        return True
    
    def find_available_slots(self, date: datetime.date, duration_minutes: int = 60) -> List[Dict]:
        """Find available time slots for a given date"""
        available_slots = []
        
        # Office hours (customize as needed)
        office_start = time(8, 0)
        office_end = time(18, 0)
        slot_interval = 30  # minutes
        
        current_time = datetime.combine(date, office_start)
        end_time = datetime.combine(date, office_end)
        
        while current_time + timedelta(minutes=duration_minutes) <= end_time:
            if self.is_slot_available(date, current_time.time(), duration_minutes):
                available_slots.append({
                    'time': current_time.time().isoformat(),
                    'duration': duration_minutes
                })
            
            current_time += timedelta(minutes=slot_interval)
        
        return available_slots
    
    def bulk_reschedule(self, appointments: List[Dict]) -> Dict:
        """Reschedule multiple appointments"""
        success = []
        failed = []
        
        for apt_data in appointments:
            appointment_id = apt_data['id']
            new_date = datetime.fromisoformat(apt_data['new_date']).date()
            new_time = datetime.fromisoformat(apt_data['new_time']).time()
            
            result = self.reschedule_appointment(appointment_id, new_date, new_time)
            if result:
                success.append(appointment_id)
            else:
                failed.append({
                    'id': appointment_id,
                    'reason': 'Slot not available or appointment not found'
                })
        
        return {
            'success': success,
            'failed': failed,
            'total': len(appointments)
        }
    
    def get_daily_statistics(self, date: datetime.date) -> Dict:
        """Get statistics for a specific day"""
        appointments = self.get_appointments_by_date(date)
        
        return {
            'total_appointments': len(appointments),
            'scheduled': len([a for a in appointments if a.status == 'scheduled']),
            'completed': len([a for a in appointments if a.status == 'completed']),
            'cancelled': len([a for a in appointments if a.status == 'cancelled']),
            'no_show': len([a for a in appointments if a.status == 'no_show']),
            'total_duration_minutes': sum(a.duration_minutes for a in appointments)
        }
    
    def _times_overlap(self, start1: time, end1: time, start2: time, end2: time) -> bool:
        """Check if two time ranges overlap"""
        return not (end1 <= start2 or end2 <= start1)