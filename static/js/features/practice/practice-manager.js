/**
 * Practice Manager Module
 * Handles patient management and appointment scheduling
 */
class PracticeManager {
    constructor(dentalAISuite = null) {
        this.dentalAISuite = dentalAISuite || window.dentalAI;
        this.currentWeekStart = this.getWeekStart(new Date());
        this.patients = [];
        this.appointments = [];
        this.currentTreatmentPlan = null; // Local storage for treatment plans
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadPatients();
        this.loadSchedule();
    }

    setupEventListeners() {
        // Patient management
        document.getElementById('add-patient-btn')?.addEventListener('click', () => this.showPatientModal());
        document.getElementById('patient-search')?.addEventListener('input', (e) => this.searchPatients(e.target.value));
        
        // Schedule management
        document.getElementById('prev-week')?.addEventListener('click', () => this.navigateWeek(-1));
        document.getElementById('next-week')?.addEventListener('click', () => this.navigateWeek(1));
        document.getElementById('add-appointment-btn')?.addEventListener('click', () => this.showAppointmentModal());
        
        // Modal handling
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal(e.target);
            }
            if (e.target.classList.contains('modal-close')) {
                this.hideModal(e.target.closest('.modal'));
            }
        });
    }

    // === PATIENT MANAGEMENT ===

    async loadPatients(searchTerm = '') {
        try {
            const response = await fetch(`/api/patients/?search=${encodeURIComponent(searchTerm)}`);
            const data = await response.json();
            
            if (data.status === 'success') {
                this.patients = data.patients;
                this.renderPatients();
            } else {
                console.error('Failed to load patients:', data.message);
            }
        } catch (error) {
            console.error('Error loading patients:', error);
        }
    }

    renderPatients() {
        const container = document.getElementById('patients-list');
        if (!container) return;

        if (this.patients.length === 0) {
            container.innerHTML = `
                <div class="loading">
                    <i class="fas fa-user-plus"></i>
                    Aucun patient trouvé. Ajoutez votre premier patient.
                </div>
            `;
            return;
        }

        container.innerHTML = this.patients.map(patient => `
            <div class="patient-card" data-patient-id="${patient.id}">
                <div class="patient-card-header">
                    <div>
                        <h3 class="patient-name">${patient.first_name} ${patient.last_name}</h3>
                        <div class="patient-id">#${patient.id.substring(0, 8)}</div>
                    </div>
                    <div class="patient-actions">
                        <button class="btn btn-sm btn-primary" onclick="practiceManager.viewPatient('${patient.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="practiceManager.editPatient('${patient.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>
                <div class="patient-info">
                    ${patient.email ? `<div class="patient-detail"><i class="fas fa-envelope"></i> ${patient.email}</div>` : ''}
                    ${patient.phone ? `<div class="patient-detail"><i class="fas fa-phone"></i> ${patient.phone}</div>` : ''}
                    ${patient.birth_date ? `<div class="patient-detail"><i class="fas fa-birthday-cake"></i> ${this.formatDate(patient.birth_date)}</div>` : ''}
                </div>
                <div class="patient-stats">
                    <div class="patient-stat">
                        <div class="patient-stat-value">0</div>
                        <div class="patient-stat-label">RDV</div>
                    </div>
                    <div class="patient-stat">
                        <div class="patient-stat-value">0</div>
                        <div class="patient-stat-label">Plans</div>
                    </div>
                    <div class="patient-stat">
                        <div class="patient-stat-value">Actif</div>
                        <div class="patient-stat-label">Statut</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    searchPatients(searchTerm) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.loadPatients(searchTerm);
        }, 300);
    }

    showPatientModal(patient = null) {
        const modal = document.getElementById('patient-modal');
        const form = document.getElementById('patient-form');
        
        if (patient) {
            document.getElementById('modal-patient-title').textContent = 'Modifier le patient';
            form.elements['patient-id'].value = patient.id;
            form.elements['first-name'].value = patient.first_name;
            form.elements['last-name'].value = patient.last_name;
            form.elements['email'].value = patient.email || '';
            form.elements['phone'].value = patient.phone || '';
            form.elements['birth-date'].value = patient.birth_date || '';
            form.elements['address'].value = patient.address || '';
            form.elements['insurance'].value = patient.insurance || '';
        } else {
            document.getElementById('modal-patient-title').textContent = 'Ajouter un patient';
            form.reset();
            form.elements['patient-id'].value = '';
        }
        
        modal.style.display = 'block';
        form.onsubmit = (e) => this.savePatient(e);
    }

    async savePatient(e) {
        e.preventDefault();
        const form = e.target;
        const patientId = form.elements['patient-id'].value;
        
        const patientData = {
            first_name: form.elements['first-name'].value,
            last_name: form.elements['last-name'].value,
            email: form.elements['email'].value,
            phone: form.elements['phone'].value,
            birth_date: form.elements['birth-date'].value,
            address: form.elements['address'].value,
            insurance: form.elements['insurance'].value
        };
        
        try {
            const url = patientId ? `/api/patients/${patientId}` : '/api/patients/';
            const method = patientId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patientData)
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                this.hideModal(document.getElementById('patient-modal'));
                this.loadPatients();
                this.showNotification('Patient sauvegardé avec succès', 'success');
            } else {
                this.showNotification(data.message || 'Erreur lors de la sauvegarde', 'error');
            }
        } catch (error) {
            console.error('Error saving patient:', error);
            this.showNotification('Erreur lors de la sauvegarde', 'error');
        }
    }

    viewPatient(patientId) {
        const patient = this.patients.find(p => p.id === patientId);
        if (!patient) return;
        
        const modal = document.getElementById('patient-view-modal');
        const content = document.getElementById('patient-view-content');
        
        content.innerHTML = `
            <div class="patient-view">
                <div class="patient-view-header">
                    <h2>${patient.first_name} ${patient.last_name}</h2>
                    <div class="patient-id">#${patient.id}</div>
                </div>
                <div class="patient-view-body">
                    <div class="patient-section">
                        <h3>Informations personnelles</h3>
                        <div class="patient-info-grid">
                            <div class="patient-info-item">
                                <label>Email</label>
                                <p>${patient.email || 'Non renseigné'}</p>
                            </div>
                            <div class="patient-info-item">
                                <label>Téléphone</label>
                                <p>${patient.phone || 'Non renseigné'}</p>
                            </div>
                            <div class="patient-info-item">
                                <label>Date de naissance</label>
                                <p>${patient.birth_date ? this.formatDate(patient.birth_date) : 'Non renseigné'}</p>
                            </div>
                            <div class="patient-info-item">
                                <label>Adresse</label>
                                <p>${patient.address || 'Non renseigné'}</p>
                            </div>
                            <div class="patient-info-item">
                                <label>Assurance</label>
                                <p>${patient.insurance || 'Non renseigné'}</p>
                            </div>
                        </div>
                    </div>
                    <div class="patient-section">
                        <h3>Historique médical</h3>
                        <div class="empty-state">
                            <i class="fas fa-notes-medical"></i>
                            <p>Aucun historique médical enregistré</p>
                        </div>
                    </div>
                    <div class="patient-section">
                        <h3>Prochains rendez-vous</h3>
                        <div class="empty-state">
                            <i class="fas fa-calendar-alt"></i>
                            <p>Aucun rendez-vous programmé</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
    }

    editPatient(patientId) {
        const patient = this.patients.find(p => p.id === patientId);
        if (patient) {
            this.showPatientModal(patient);
        }
    }

    // === SCHEDULE MANAGEMENT ===

    async loadSchedule() {
        try {
            const startDate = this.formatDateForApi(this.currentWeekStart);
            const endDate = this.formatDateForApi(this.getWeekEnd(this.currentWeekStart));
            
            console.log(`📅 Loading schedule for week: ${startDate} to ${endDate}`);
            console.log(`📅 Current week start: ${this.currentWeekStart}`);
            
            const response = await fetch(`/api/appointments/?start_date=${startDate}&end_date=${endDate}`);
            const data = await response.json();
            
            console.log(`📅 Schedule API response:`, data);
            
            if (data.status === 'success') {
                this.appointments = data.appointments;
                console.log(`📅 Loaded ${this.appointments.length} appointments:`, this.appointments);
                this.renderSchedule();
            } else {
                console.error('Failed to load schedule:', data.message);
            }
        } catch (error) {
            console.error('Error loading schedule:', error);
        }
    }

    renderSchedule() {
        const container = document.getElementById('schedule-grid');
        if (!container) return;

        // Add enhanced class for modern styling
        container.classList.add('enhanced');

        // Create time slots (30-minute intervals like working version)
        const timeSlots = this.generateTimeSlots();
        const weekDays = this.getWeekDays(this.currentWeekStart);
        
        // Update week display
        const weekDisplay = document.getElementById('current-week');
        if (weekDisplay) {
            const startStr = this.formatDate(this.currentWeekStart);
            const endStr = this.formatDate(this.getWeekEnd(this.currentWeekStart));
            weekDisplay.textContent = `${startStr} - ${endStr}`;
        }
        
        // Build enhanced schedule grid with proportional appointments
        let html = '<div class="schedule-header">';
        html += '<div class="time-header">Heure</div>';
        
        // Day headers
        weekDays.forEach(day => {
            const isToday = this.isToday(day.date);
            html += `
                <div class="day-header ${isToday ? 'today' : ''}">
                    <div class="day-name">${day.name}</div>
                    <div class="day-date">${day.dayNumber}</div>
                </div>
            `;
        });
        html += '</div>';
        
        // Time slots and appointments
        html += '<div class="schedule-body">';
        
        timeSlots.forEach(hourSlot => {
            html += '<div class="schedule-row">';
            html += `<div class="time-slot">${hourSlot}</div>`;
            
            weekDays.forEach(day => {
                const isToday = this.isToday(day.date);
                const hourAppointments = this.getAppointmentsForHour(day.date, hourSlot);
                
                html += `<div class="appointment-cell hour-cell ${isToday ? 'today' : ''}" 
                             data-date="${this.formatDateForApi(day.date)}" 
                             data-hour="${hourSlot}">`;
                
                // Container for multiple appointments in this hour
                const appointmentCount = hourAppointments.length;
                let containerClass = 'appointments-container';
                if (appointmentCount > 1) {
                    containerClass += ` multiple-appointments count-${appointmentCount}`;
                }
                html += `<div class="${containerClass}">`;
                
                hourAppointments.forEach((apt, index) => {
                    const durationMinutes = apt.duration_minutes || 60;
                    
                    // Use proportional heights: 1px per minute (60px = 1 hour)
                    // This makes visual sense: 15min = 1/4 hour, 30min = 1/2 hour, etc.
                    const heightPx = durationMinutes;
                    
                    // Extract time for display
                    let displayTime = '';
                    if (apt.appointment_time) {
                        if (apt.appointment_time.includes('T')) {
                            displayTime = apt.appointment_time.substring(11, 16);
                        } else {
                            displayTime = apt.appointment_time.substring(0, 5);
                        }
                    }
                    
                    console.log(`📐 Appointment ${apt.id}: ${durationMinutes}min = ${heightPx}px height in hour ${hourSlot}`);
                    
                    // Determine appointment type/status
                    let appointmentClass = 'treatment';
                    if (apt.treatment_type) {
                        if (apt.treatment_type.toLowerCase().includes('consultation')) {
                            appointmentClass = 'consultation';
                        } else if (apt.treatment_type.toLowerCase().includes('urgence')) {
                            appointmentClass = 'emergency';
                        }
                    }
                    
                    html += `
                        <div class="appointment ${appointmentClass} confirmed proportional" 
                             data-appointment-id="${apt.id}"
                             data-duration="${durationMinutes}"
                             draggable="true"
                             style="height: ${heightPx}px;"
                             onclick="practiceManager.showAppointmentDetails('${apt.id}')">
                            <div class="appointment-time">${displayTime}</div>
                            <div class="appointment-patient">${apt.patient_name || 'Patient'}</div>
                            <div class="appointment-type">${apt.treatment_type}</div>
                            <div class="appointment-duration">${durationMinutes}min</div>
                        </div>
                    `;
                });
                
                html += '</div>'; // Close appointments-container
                html += '</div>'; // Close appointment-cell
            });
            
            html += '</div>';
        });
        
        html += '</div>';
        container.innerHTML = html;
        
        // Setup drag and drop functionality
        this.setupDragAndDrop();
    }


    getAppointmentsForDay(date) {
        const dateStr = this.formatDateForApi(date);
        return this.appointments.filter(apt => apt.appointment_date === dateStr);
    }

    getAppointmentsForHour(date, hourSlot) {
        const dateStr = this.formatDateForApi(date);
        const hour = parseInt(hourSlot.split(':')[0]);
        
        return this.appointments.filter(apt => {
            if (apt.appointment_date !== dateStr) return false;
            if (!apt.appointment_time) return false;
            
            let aptTime;
            if (apt.appointment_time.includes('T')) {
                aptTime = apt.appointment_time.substring(11, 16);
            } else {
                aptTime = apt.appointment_time.substring(0, 5);
            }
            
            const aptHour = parseInt(aptTime.split(':')[0]);
            return aptHour === hour;
        });
    }

    generateTimeSlots() {
        const slots = [];
        for (let hour = 8; hour <= 18; hour++) {
            slots.push(`${hour.toString().padStart(2, '0')}:00`);
        }
        return slots;
    }

    getWeekDays(weekStart) {
        const days = [];
        const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(date.getDate() + i);
            
            days.push({
                date: date,
                name: dayNames[date.getDay()],
                dayNumber: date.getDate()
            });
        }
        
        return days;
    }

    getAppointmentsForSlot(date, timeSlot) {
        const dateStr = this.formatDateForApi(date);
        console.log(`🔍 Looking for appointments on ${dateStr} at ${timeSlot}`);
        
        const matchingApts = this.appointments.filter(apt => {
            console.log(`📋 Checking appointment:`, apt);
            const aptDate = apt.appointment_date;
            
            // Handle time extraction - appointment_time could be 'HH:MM:SS' or 'YYYY-MM-DDTHH:MM:SS'
            let aptTime = null;
            if (apt.appointment_time) {
                if (apt.appointment_time.includes('T')) {
                    // Full datetime format: '2025-07-17T09:00:00'
                    aptTime = apt.appointment_time.substring(11, 16);
                } else {
                    // Time only format: '09:00:00'
                    aptTime = apt.appointment_time.substring(0, 5);
                }
            }
            
            console.log(`📅 Appointment date: ${aptDate}, time: ${aptTime}`);
            console.log(`📅 Looking for date: ${dateStr}, time: ${timeSlot}`);
            
            const dateMatch = aptDate === dateStr;
            const timeMatch = aptTime === timeSlot;
            
            console.log(`📅 Date match: ${dateMatch}, Time match: ${timeMatch}`);
            
            return dateMatch && timeMatch;
        });
        
        console.log(`✅ Found ${matchingApts.length} matching appointments`);
        return matchingApts;
    }

    calculateDuration(startTime, endTime) {
        const start = new Date(`2000-01-01T${startTime.substring(11)}`);
        const end = new Date(`2000-01-01T${endTime.substring(11)}`);
        return (end - start) / (1000 * 60); // Duration in minutes
    }

    showAppointmentModal(appointment = null) {
        const modal = document.getElementById('appointment-modal');
        const form = document.getElementById('appointment-form');
        
        if (appointment) {
            document.getElementById('modal-appointment-title').textContent = 'Modifier le rendez-vous';
            form.elements['appointment-id'].value = appointment.id;
            form.elements['patient-select'].value = appointment.patient_id;
            form.elements['appointment-date'].value = appointment.date;
            form.elements['start-time'].value = appointment.start_time.substring(11, 16);
            form.elements['end-time'].value = appointment.end_time.substring(11, 16);
            form.elements['appointment-type'].value = appointment.appointment_type;
            form.elements['treatment-type'].value = appointment.treatment_type || '';
            form.elements['notes'].value = appointment.notes || '';
        } else {
            document.getElementById('modal-appointment-title').textContent = 'Ajouter un rendez-vous';
            form.reset();
            form.elements['appointment-id'].value = '';
        }
        
        // Load patients for select
        this.loadPatientsForSelect();
        
        modal.style.display = 'block';
        form.onsubmit = (e) => this.saveAppointment(e);
    }

    async loadPatientsForSelect() {
        const select = document.getElementById('patient-select');
        if (!select) return;
        
        // Load patients if not already loaded
        if (this.patients.length === 0) {
            await this.loadPatients();
        }
        
        select.innerHTML = '<option value="">Sélectionner un patient</option>';
        this.patients.forEach(patient => {
            select.innerHTML += `
                <option value="${patient.id}">
                    ${patient.first_name} ${patient.last_name}
                </option>
            `;
        });
    }

    async saveAppointment(e) {
        e.preventDefault();
        const form = e.target;
        const appointmentId = form.elements['appointment-id'].value;
        
        const appointmentData = {
            patient_id: form.elements['patient-select'].value,
            date: form.elements['appointment-date'].value,
            start_time: `${form.elements['appointment-date'].value}T${form.elements['start-time'].value}:00`,
            end_time: `${form.elements['appointment-date'].value}T${form.elements['end-time'].value}:00`,
            appointment_type: form.elements['appointment-type'].value,
            treatment_type: form.elements['treatment-type'].value,
            notes: form.elements['notes'].value
        };
        
        try {
            const url = appointmentId ? `/api/appointments/${appointmentId}` : '/api/appointments/';
            const method = appointmentId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(appointmentData)
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                this.hideModal(document.getElementById('appointment-modal'));
                this.loadSchedule();
                this.showNotification('Rendez-vous sauvegardé avec succès', 'success');
            } else {
                this.showNotification(data.message || 'Erreur lors de la sauvegarde', 'error');
            }
        } catch (error) {
            console.error('Error saving appointment:', error);
            this.showNotification('Erreur lors de la sauvegarde', 'error');
        }
    }

    showAppointmentDetails(appointmentId) {
        const appointment = this.appointments.find(a => a.id === appointmentId);
        if (!appointment) return;
        
        const modal = document.getElementById('appointment-details-modal');
        const content = document.getElementById('appointment-details-content');
        
        content.innerHTML = `
            <div class="appointment-details">
                <div class="appointment-details-header">
                    <h3>${appointment.patient_name}</h3>
                    <div class="appointment-actions">
                        <button class="btn btn-sm btn-primary" onclick="practiceManager.editAppointment('${appointment.id}')">
                            <i class="fas fa-edit"></i> Modifier
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="practiceManager.deleteAppointment('${appointment.id}')">
                            <i class="fas fa-trash"></i> Supprimer
                        </button>
                    </div>
                </div>
                <div class="appointment-details-body">
                    <div class="detail-row">
                        <label>Date</label>
                        <p>${this.formatDate(appointment.date)}</p>
                    </div>
                    <div class="detail-row">
                        <label>Heure</label>
                        <p>${appointment.start_time.substring(11, 16)} - ${appointment.end_time.substring(11, 16)}</p>
                    </div>
                    <div class="detail-row">
                        <label>Type</label>
                        <p>${appointment.appointment_type}</p>
                    </div>
                    ${appointment.treatment_type ? `
                        <div class="detail-row">
                            <label>Traitement</label>
                            <p>${appointment.treatment_type}</p>
                        </div>
                    ` : ''}
                    ${appointment.notes ? `
                        <div class="detail-row">
                            <label>Notes</label>
                            <p>${appointment.notes}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
    }

    editAppointment(appointmentId) {
        const appointment = this.appointments.find(a => a.id === appointmentId);
        if (appointment) {
            this.hideModal(document.getElementById('appointment-details-modal'));
            this.showAppointmentModal(appointment);
        }
    }

    async deleteAppointment(appointmentId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce rendez-vous?')) return;
        
        try {
            const response = await fetch(`/api/appointments/${appointmentId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                this.hideModal(document.getElementById('appointment-details-modal'));
                this.loadSchedule();
                this.showNotification('Rendez-vous supprimé avec succès', 'success');
            } else {
                this.showNotification(data.message || 'Erreur lors de la suppression', 'error');
            }
        } catch (error) {
            console.error('Error deleting appointment:', error);
            this.showNotification('Erreur lors de la suppression', 'error');
        }
    }

    navigateWeek(direction) {
        this.currentWeekStart.setDate(this.currentWeekStart.getDate() + (direction * 7));
        this.loadSchedule();
    }

    navigateToWeek(targetDate) {
        console.log('📅 Navigating to week containing:', targetDate);
        this.currentWeekStart = this.getWeekStart(targetDate);
        console.log('📅 New currentWeekStart:', this.currentWeekStart);
        // Don't load schedule here, it will be loaded by the caller
    }

    // === UTILITY METHODS ===

    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    }

    getWeekEnd(weekStart) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + 6);
        return d;
    }

    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('fr-FR', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
    }

    formatDateForApi(date) {
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    }

    isToday(date) {
        const today = new Date();
        const d = new Date(date);
        return d.toDateString() === today.toDateString();
    }

    hideModal(modal) {
        if (modal) {
            modal.style.display = 'none';
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    handleTabSwitch(tabId) {
        if (tabId === 'patients') {
            this.loadPatients();
        } else if (tabId === 'schedule') {
            this.loadSchedule();
        } else if (tabId === 'schedule-constraints') {
            this.loadConstraints();
        }
    }

    // === TREATMENT PLAN INTEGRATION ===

    setCurrentTreatmentPlan(plan) {
        this.currentTreatmentPlan = plan;
    }

    async scheduleTreatmentPlan(planId) {
        console.log('🎯 PracticeManager.scheduleTreatmentPlan called with:', planId);
        console.log('💾 Current treatment plan:', this.currentTreatmentPlan);
        
        // First check local storage, then check dentalAISuite
        if (!this.currentTreatmentPlan || this.currentTreatmentPlan.id !== planId) {
            console.log('🔍 Searching for treatment plan...');
            if (this.dentalAISuite && this.dentalAISuite.currentTreatmentPlan && this.dentalAISuite.currentTreatmentPlan.id === planId) {
                this.currentTreatmentPlan = this.dentalAISuite.currentTreatmentPlan;
                console.log('✅ Found treatment plan from dentalAISuite');
            } else {
                console.error('❌ No treatment plan found with ID:', planId);
                console.log('dentalAISuite:', this.dentalAISuite);
                console.log('dentalAISuite.currentTreatmentPlan:', this.dentalAISuite?.currentTreatmentPlan);
                return;
            }
        }

        console.log('🚀 Starting enhanced scheduling modal...');

        // Enhanced patient selection popup with schedule preview
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content large-modal">
                <div class="modal-header">
                    <h2><i class="fas fa-calendar-plus"></i> Planifier le Plan de Traitement</h2>
                    <span class="modal-close">&times;</span>
                </div>
                <div class="modal-body">
                    <!-- Patient Selection Section -->
                    <div class="scheduling-section">
                        <h3><i class="fas fa-user"></i> Sélection du Patient</h3>
                        <div class="form-group">
                            <label>Patient:</label>
                            <select id="schedule-patient-select" class="form-control" required>
                                <option value="">Sélectionner un patient</option>
                            </select>
                            <button class="btn btn-sm btn-secondary" id="add-patient-quick-btn">
                                <i class="fas fa-plus"></i> Ajouter un nouveau patient
                            </button>
                        </div>
                    </div>

                    <!-- Scheduling Parameters -->
                    <div class="scheduling-section">
                        <h3><i class="fas fa-cog"></i> Paramètres de Planification</h3>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Date de début:</label>
                                <input type="date" id="schedule-start-date" class="form-control" required 
                                       value="${new Date().toISOString().split('T')[0]}">
                            </div>
                            <div class="form-group">
                                <label>Heure préférée:</label>
                                <input type="time" id="schedule-default-time" class="form-control" value="09:00">
                            </div>
                            <div class="form-group">
                                <label>Praticien par défaut:</label>
                                <select id="schedule-default-doctor" class="form-control">
                                    <option value="">Selon le plan</option>
                                    <option value="Dr. Martin">Dr. Martin</option>
                                    <option value="Dr. Dubois">Dr. Dubois</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Treatment Plan Summary -->
                    <div class="scheduling-section">
                        <h3><i class="fas fa-list"></i> Résumé du Plan de Traitement</h3>
                        <div class="treatment-summary">
                            <div class="summary-stats">
                                <div class="stat-item">
                                    <span class="stat-number">${this.currentTreatmentPlan.treatment_sequence.length}</span>
                                    <span class="stat-label">Rendez-vous</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-number">${this.calculateTotalDuration()} min</span>
                                    <span class="stat-label">Durée totale</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-number">${this.calculateTotalWeeks()}</span>
                                    <span class="stat-label">Semaines</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Smart Scheduling Preview -->
                    <div class="scheduling-section">
                        <h3><i class="fas fa-calendar-alt"></i> Aperçu Intelligent des Rendez-vous</h3>
                        <div class="scheduling-options">
                            <label class="checkbox-container">
                                <input type="checkbox" id="respect-delays" checked>
                                <span class="checkmark"></span>
                                Respecter les délais entre traitements
                            </label>
                            <label class="checkbox-container">
                                <input type="checkbox" id="avoid-weekends" checked>
                                <span class="checkmark"></span>
                                Éviter les week-ends
                            </label>
                            <label class="checkbox-container">
                                <input type="checkbox" id="check-holidays" checked>
                                <span class="checkmark"></span>
                                Vérifier les jours fériés
                            </label>
                        </div>
                        <div id="appointments-preview-list" class="appointments-preview">
                            <!-- Appointments will be generated here -->
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i> Annuler
                    </button>
                    <button class="btn btn-primary" id="preview-schedule-btn">
                        <i class="fas fa-eye"></i> Aperçu Détaillé
                    </button>
                    <button class="btn btn-success" id="confirm-schedule-btn">
                        <i class="fas fa-check"></i> Programmer les RDV
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Load patients and setup
        await this.loadPatientsForScheduling();
        this.setupSchedulingEventListeners(modal, planId);
        
        // Initial preview
        this.updateSmartAppointmentsPreview();
    }

    async loadPatientsForScheduling() {
        const select = document.getElementById('schedule-patient-select');
        if (!select) return;
        
        if (this.patients.length === 0) {
            await this.loadPatients();
        }
        
        select.innerHTML = '<option value="">Sélectionner un patient</option>';
        this.patients.forEach(patient => {
            select.innerHTML += `
                <option value="${patient.id}">
                    ${patient.first_name} ${patient.last_name}
                </option>
            `;
        });
    }

    updateAppointmentsPreview(startDate, defaultTime) {
        const container = document.getElementById('appointments-preview-list');
        if (!container || !this.currentTreatmentPlan) return;
        
        let currentDate = new Date(startDate);
        let html = '';
        
        this.currentTreatmentPlan.treatment_sequence.forEach((step, index) => {
            // Add delay days if specified
            if (step.delay_days && index > 0) {
                currentDate.setDate(currentDate.getDate() + step.delay_days);
            }
            
            const appointmentDate = new Date(currentDate);
            
            html += `
                <div class="appointment-preview-item">
                    <div class="appointment-number">RDV ${step.appointment_number}</div>
                    <div class="appointment-info">
                        <div class="appointment-date">${this.formatDate(appointmentDate)}</div>
                        <div class="appointment-time">${defaultTime} - ${this.addMinutesToTime(defaultTime, step.duration_minutes)}</div>
                        <div class="appointment-treatment">${step.treatment}</div>
                        ${step.practitioner ? `<div class="appointment-practitioner">Dr. ${step.practitioner}</div>` : ''}
                    </div>
                </div>
            `;
            
            // Move to next appointment (minimum 1 day between appointments)
            currentDate.setDate(currentDate.getDate() + 1);
        });
        
        container.innerHTML = html;
    }

    addMinutesToTime(time, minutes) {
        const [hours, mins] = time.split(':').map(Number);
        const totalMinutes = hours * 60 + mins + minutes;
        const newHours = Math.floor(totalMinutes / 60);
        const newMins = totalMinutes % 60;
        return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
    }

    async confirmScheduleTreatmentPlan(patientId, startDate, defaultTime) {
        if (!patientId || !startDate || !this.currentTreatmentPlan) {
            this.showNotification('Veuillez remplir tous les champs', 'error');
            return;
        }
        
        try {
            const appointments = [];
            let currentDate = new Date(startDate);
            
            for (let i = 0; i < this.currentTreatmentPlan.treatment_sequence.length; i++) {
                const step = this.currentTreatmentPlan.treatment_sequence[i];
                
                // Add delay days if specified
                if (step.delay_days && i > 0) {
                    currentDate.setDate(currentDate.getDate() + step.delay_days);
                }
                
                const appointmentDate = new Date(currentDate);
                const endTime = this.addMinutesToTime(defaultTime, step.duration_minutes);
                
                appointments.push({
                    patient_id: patientId,
                    date: this.formatDateForApi(appointmentDate),
                    start_time: `${this.formatDateForApi(appointmentDate)}T${defaultTime}:00`,
                    end_time: `${this.formatDateForApi(appointmentDate)}T${endTime}:00`,
                    appointment_type: 'treatment',
                    treatment_type: step.treatment,
                    notes: `Plan de traitement - RDV ${step.appointment_number}${step.remarks ? ': ' + step.remarks : ''}`,
                    practitioner: step.practitioner,
                    treatment_plan_id: this.currentTreatmentPlan.id,
                    sequence_number: step.appointment_number
                });
                
                // Move to next appointment (minimum 1 day between appointments)
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            // Create all appointments
            const response = await fetch('/api/appointments/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointments })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                this.showNotification(`${appointments.length} rendez-vous créés avec succès`, 'success');
                this.loadSchedule(); // Refresh schedule if on schedule tab
                
                // Update treatment plan status
                this.currentTreatmentPlan.status = 'scheduled';
                this.currentTreatmentPlan.scheduled_appointments = appointments.length;
                
                // Add confirmation message to chat
                const currentTab = this.dentalAISuite ? this.dentalAISuite.currentTab : 'dental-brain';
                const chatMessages = document.querySelector(`#chat-messages-${currentTab}`);
                if (chatMessages) {
                    const confirmationDiv = document.createElement('div');
                    confirmationDiv.className = 'message assistant';
                    confirmationDiv.innerHTML = `
                        <div class="message-content">
                            <div class="scheduling-confirmation">
                                <i class="fas fa-check-circle"></i>
                                <h4>Rendez-vous planifiés avec succès!</h4>
                                <p>${appointments.length} rendez-vous ont été créés pour ${this.patients.find(p => p.id === patientId)?.first_name} ${this.patients.find(p => p.id === patientId)?.last_name}</p>
                                <p>Premier rendez-vous: ${this.formatDate(appointments[0].date)} à ${defaultTime}</p>
                                <button class="btn btn-sm btn-primary" onclick="dentalAISuite.switchTab('schedule')">
                                    Voir le planning
                                </button>
                            </div>
                        </div>
                    `;
                    chatMessages.appendChild(confirmationDiv);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            } else {
                this.showNotification(data.message || 'Erreur lors de la création des rendez-vous', 'error');
            }
        } catch (error) {
            console.error('Error scheduling appointments:', error);
            this.showNotification('Erreur lors de la planification', 'error');
        }
    }

    modifyTreatmentPlan(planId) {
        // First check local storage, then check dentalAISuite
        if (!this.currentTreatmentPlan || this.currentTreatmentPlan.id !== planId) {
            if (this.dentalAISuite && this.dentalAISuite.currentTreatmentPlan && this.dentalAISuite.currentTreatmentPlan.id === planId) {
                this.currentTreatmentPlan = this.dentalAISuite.currentTreatmentPlan;
            } else {
                console.error('No treatment plan found with ID:', planId);
                return;
            }
        }

        const currentTab = this.dentalAISuite ? this.dentalAISuite.currentTab : 'dental-brain';
        const chatInput = document.querySelector(`#chat-input-${currentTab}`);
        if (chatInput) {
            chatInput.value = 'Veuillez modifier le plan de traitement précédent. ';
            chatInput.focus();
            chatInput.setSelectionRange(chatInput.value.length, chatInput.value.length);
        }
    }

    exportTreatmentPlan(planId) {
        // First check local storage, then check dentalAISuite
        if (!this.currentTreatmentPlan || this.currentTreatmentPlan.id !== planId) {
            if (this.dentalAISuite && this.dentalAISuite.currentTreatmentPlan && this.dentalAISuite.currentTreatmentPlan.id === planId) {
                this.currentTreatmentPlan = this.dentalAISuite.currentTreatmentPlan;
            } else {
                console.error('No treatment plan found with ID:', planId);
                return;
            }
        }

        // Create export data
        const exportData = {
            plan_id: this.currentTreatmentPlan.id,
            created_at: new Date().toISOString(),
            patient_info: this.currentTreatmentPlan.patient_info || {},
            treatment_sequence: this.currentTreatmentPlan.treatment_sequence,
            total_appointments: this.currentTreatmentPlan.treatment_sequence.length,
            estimated_duration: this.currentTreatmentPlan.treatment_sequence.reduce((sum, step) => sum + step.duration_minutes, 0),
            notes: this.currentTreatmentPlan.notes || ''
        };

        // Convert to JSON and download
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `treatment-plan-${planId}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showNotification('Plan de traitement exporté avec succès', 'success');
    }

    generateTreatmentPowerPoint(treatment) {
        const loadingDiv = document.getElementById('treatment-loading');
        const errorDiv = document.getElementById('treatment-error');
        const currentTab = this.dentalAISuite ? this.dentalAISuite.currentTab : 'dental-brain';
        const chatMessages = document.querySelector(`#chat-messages-${currentTab}`);
        
        if (loadingDiv) loadingDiv.style.display = 'block';
        if (errorDiv) errorDiv.style.display = 'none';

        fetch('/api/generate-treatment-powerpoint', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ treatment: treatment })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message assistant';
                messageDiv.innerHTML = `
                    <div class="message-content">
                        <div class="powerpoint-success">
                            <i class="fas fa-check-circle"></i>
                            <p>PowerPoint généré avec succès!</p>
                            <button class="btn btn-primary" onclick="practiceManager.downloadPowerPointFile('${data.filename}')">
                                <i class="fas fa-download"></i> Télécharger
                            </button>
                        </div>
                    </div>
                `;
                chatMessages.appendChild(messageDiv);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            } else {
                throw new Error(data.error || 'Erreur lors de la génération');
            }
        })
        .catch(error => {
            console.error('Error generating PowerPoint:', error);
            if (errorDiv) {
                errorDiv.textContent = `Erreur: ${error.message}`;
                errorDiv.style.display = 'block';
            }
        })
        .finally(() => {
            if (loadingDiv) loadingDiv.style.display = 'none';
        });
    }

    hideTreatmentError() {
        const errorDiv = document.getElementById('treatment-error');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }

    downloadPowerPointFile(filename) {
        window.location.href = `/api/download-powerpoint/${filename}`;
    }

    // === SCHEDULE CONSTRAINTS MANAGEMENT ===

    loadConstraints() {
        this.setupConstraintsEventListeners();
        this.loadExistingConstraints();
    }

    setupConstraintsEventListeners() {
        // Add vacation period
        document.getElementById('add-vacation-btn')?.addEventListener('click', () => {
            this.addVacationPeriod();
        });

        // Add holiday
        document.getElementById('add-holiday-btn')?.addEventListener('click', () => {
            this.addHoliday();
        });

        // Load holidays
        document.getElementById('load-holidays-btn')?.addEventListener('click', () => {
            this.loadHolidays();
        });

        // Add doctor
        document.getElementById('add-doctor-btn')?.addEventListener('click', () => {
            this.addDoctor();
        });

        // Save constraints
        document.getElementById('save-constraints-btn')?.addEventListener('click', () => {
            this.saveConstraints();
        });

        // Reset constraints
        document.getElementById('reset-constraints-btn')?.addEventListener('click', () => {
            this.resetConstraints();
        });
    }

    async loadExistingConstraints() {
        try {
            const response = await fetch('/api/schedule/constraints');
            const data = await response.json();
            
            if (data.status === 'success') {
                this.populateConstraints(data.constraints);
            }
        } catch (error) {
            console.error('Error loading constraints:', error);
            // Use default constraints if none exist
            this.populateDefaultConstraints();
        }
    }

    populateConstraints(constraints) {
        // Populate working hours
        if (constraints.working_hours) {
            Object.keys(constraints.working_hours).forEach(day => {
                const schedule = constraints.working_hours[day];
                const startInput = document.getElementById(`${day}-start`);
                const endInput = document.getElementById(`${day}-end`);
                const enabledInput = document.getElementById(`${day}-enabled`);
                
                if (startInput) startInput.value = schedule.start;
                if (endInput) endInput.value = schedule.end;
                if (enabledInput) enabledInput.checked = schedule.enabled;
            });
        }

        // Populate vacations
        if (constraints.vacations) {
            constraints.vacations.forEach(vacation => {
                this.renderVacationItem(vacation);
            });
        }

        // Populate holidays
        if (constraints.holidays) {
            constraints.holidays.forEach(holiday => {
                this.renderHolidayItem(holiday);
            });
        }

        // Populate doctors
        if (constraints.doctors) {
            constraints.doctors.forEach(doctor => {
                this.renderDoctorItem(doctor);
            });
        }
    }

    populateDefaultConstraints() {
        // Default working hours are already set in HTML
        // Just ensure weekend days are disabled by default
        document.getElementById('saturday-enabled').checked = false;
        document.getElementById('sunday-enabled').checked = false;
    }

    addVacationPeriod() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Ajouter une Période de Vacances</h3>
                    <span class="modal-close">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Titre:</label>
                        <input type="text" id="vacation-title" class="form-control" placeholder="Ex: Vacances d'été">
                    </div>
                    <div class="form-group">
                        <label>Date de début:</label>
                        <input type="date" id="vacation-start" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>Date de fin:</label>
                        <input type="date" id="vacation-end" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>Description (optionnelle):</label>
                        <textarea id="vacation-description" class="form-control" rows="3"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Annuler</button>
                    <button class="btn btn-primary" id="save-vacation-btn">Ajouter</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle save
        document.getElementById('save-vacation-btn').addEventListener('click', () => {
            const vacation = {
                id: Date.now().toString(),
                title: document.getElementById('vacation-title').value,
                start_date: document.getElementById('vacation-start').value,
                end_date: document.getElementById('vacation-end').value,
                description: document.getElementById('vacation-description').value
            };

            if (vacation.title && vacation.start_date && vacation.end_date) {
                this.renderVacationItem(vacation);
                modal.remove();
            } else {
                this.showNotification('Veuillez remplir tous les champs obligatoires', 'error');
            }
        });

        // Handle close
        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    renderVacationItem(vacation) {
        const vacationList = document.getElementById('vacation-list');
        const item = document.createElement('div');
        item.className = 'list-item new-item';
        item.dataset.id = vacation.id;

        item.innerHTML = `
            <div class="list-item-content">
                <div class="list-item-title">${vacation.title}</div>
                <div class="list-item-details">
                    ${this.formatDate(vacation.start_date)} - ${this.formatDate(vacation.end_date)}
                    ${vacation.description ? `<br>${vacation.description}` : ''}
                </div>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-sm btn-secondary" onclick="practiceManager.editVacation('${vacation.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="practiceManager.deleteVacation('${vacation.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        vacationList.appendChild(item);
    }

    addHoliday() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Ajouter un Jour Férié</h3>
                    <span class="modal-close">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Nom du jour férié:</label>
                        <input type="text" id="holiday-name" class="form-control" placeholder="Ex: Noël">
                    </div>
                    <div class="form-group">
                        <label>Date:</label>
                        <input type="date" id="holiday-date" class="form-control">
                    </div>
                    <div class="form-group">
                        <label class="checkbox-container">
                            <input type="checkbox" id="holiday-recurring">
                            <span class="checkmark"></span>
                            Récurrent chaque année
                        </label>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Annuler</button>
                    <button class="btn btn-primary" id="save-holiday-btn">Ajouter</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle save
        document.getElementById('save-holiday-btn').addEventListener('click', () => {
            const holiday = {
                id: Date.now().toString(),
                name: document.getElementById('holiday-name').value,
                date: document.getElementById('holiday-date').value,
                recurring: document.getElementById('holiday-recurring').checked
            };

            if (holiday.name && holiday.date) {
                this.renderHolidayItem(holiday);
                modal.remove();
            } else {
                this.showNotification('Veuillez remplir tous les champs obligatoires', 'error');
            }
        });

        // Handle close
        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    renderHolidayItem(holiday) {
        const holidayList = document.getElementById('holiday-list');
        const item = document.createElement('div');
        item.className = 'list-item new-item';
        item.dataset.id = holiday.id;

        item.innerHTML = `
            <div class="list-item-content">
                <div class="list-item-title">${holiday.name}</div>
                <div class="list-item-details">
                    ${this.formatDate(holiday.date)}
                    ${holiday.recurring ? '<br>Récurrent chaque année' : ''}
                </div>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-sm btn-secondary" onclick="practiceManager.editHoliday('${holiday.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="practiceManager.deleteHoliday('${holiday.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        holidayList.appendChild(item);
    }

    loadHolidays() {
        const country = document.getElementById('holiday-country').value;
        
        // Common Swiss holidays
        const swissHolidays = [
            { name: 'Nouvel An', date: '2024-01-01', recurring: true },
            { name: 'Épiphanie', date: '2024-01-06', recurring: true },
            { name: 'Vendredi Saint', date: '2024-03-29', recurring: false },
            { name: 'Lundi de Pâques', date: '2024-04-01', recurring: false },
            { name: 'Fête du Travail', date: '2024-05-01', recurring: true },
            { name: 'Ascension', date: '2024-05-09', recurring: false },
            { name: 'Lundi de Pentecôte', date: '2024-05-20', recurring: false },
            { name: 'Fête Nationale Suisse', date: '2024-08-01', recurring: true },
            { name: 'Assomption', date: '2024-08-15', recurring: true },
            { name: 'Jeûne Fédéral', date: '2024-09-16', recurring: false },
            { name: 'Toussaint', date: '2024-11-01', recurring: true },
            { name: 'Immaculée Conception', date: '2024-12-08', recurring: true },
            { name: 'Noël', date: '2024-12-25', recurring: true },
            { name: 'Saint-Étienne', date: '2024-12-26', recurring: true }
        ];

        if (country === 'CH') {
            // Clear existing holidays and add Swiss holidays
            document.getElementById('holiday-list').innerHTML = '';
            swissHolidays.forEach(holiday => {
                holiday.id = Date.now().toString() + Math.random();
                this.renderHolidayItem(holiday);
            });
            this.showNotification('Jours fériés suisses ajoutés', 'success');
        } else {
            this.showNotification('Fonction en cours de développement pour ce pays', 'info');
        }
    }

    addDoctor() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Ajouter un Praticien</h3>
                    <span class="modal-close">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Nom du praticien:</label>
                        <input type="text" id="doctor-name" class="form-control" placeholder="Dr. Martin">
                    </div>
                    <div class="form-group">
                        <label>Spécialité:</label>
                        <input type="text" id="doctor-specialty" class="form-control" placeholder="Chirurgie orale">
                    </div>
                    <div class="form-group">
                        <label>Jours de travail:</label>
                        <div class="checkbox-grid">
                            ${['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map(day => `
                                <label class="checkbox-container">
                                    <input type="checkbox" name="doctor-days" value="${day.toLowerCase()}">
                                    <span class="checkmark"></span>
                                    ${day}
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Annuler</button>
                    <button class="btn btn-primary" id="save-doctor-btn">Ajouter</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle save
        document.getElementById('save-doctor-btn').addEventListener('click', () => {
            const selectedDays = Array.from(modal.querySelectorAll('input[name="doctor-days"]:checked'))
                .map(cb => cb.value);

            const doctor = {
                id: Date.now().toString(),
                name: document.getElementById('doctor-name').value,
                specialty: document.getElementById('doctor-specialty').value,
                working_days: selectedDays
            };

            if (doctor.name && selectedDays.length > 0) {
                this.renderDoctorItem(doctor);
                modal.remove();
            } else {
                this.showNotification('Veuillez remplir le nom et sélectionner au moins un jour', 'error');
            }
        });

        // Handle close
        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    renderDoctorItem(doctor) {
        const doctorList = document.getElementById('doctor-list');
        const item = document.createElement('div');
        item.className = 'list-item new-item';
        item.dataset.id = doctor.id;

        item.innerHTML = `
            <div class="list-item-content">
                <div class="list-item-title">${doctor.name}</div>
                <div class="list-item-details">
                    ${doctor.specialty}<br>
                    Jours: ${doctor.working_days.join(', ')}
                </div>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-sm btn-secondary" onclick="practiceManager.editDoctor('${doctor.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="practiceManager.deleteDoctor('${doctor.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        doctorList.appendChild(item);
    }

    async saveConstraints() {
        try {
            const constraints = this.collectConstraints();
            
            const response = await fetch('/api/schedule/constraints', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(constraints)
            });

            const data = await response.json();

            if (data.status === 'success') {
                this.showNotification('Configuration sauvegardée avec succès', 'success');
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error saving constraints:', error);
            this.showNotification('Erreur lors de la sauvegarde', 'error');
        }
    }

    collectConstraints() {
        // Collect working hours
        const workingHours = {};
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
            workingHours[day] = {
                start: document.getElementById(`${day}-start`)?.value || '08:00',
                end: document.getElementById(`${day}-end`)?.value || '18:00',
                enabled: document.getElementById(`${day}-enabled`)?.checked || false
            };
        });

        // Collect vacations
        const vacations = Array.from(document.querySelectorAll('#vacation-list .list-item')).map(item => ({
            id: item.dataset.id,
            title: item.querySelector('.list-item-title').textContent,
            // Extract dates from rendered text (simplified for now)
        }));

        // Collect holidays
        const holidays = Array.from(document.querySelectorAll('#holiday-list .list-item')).map(item => ({
            id: item.dataset.id,
            name: item.querySelector('.list-item-title').textContent,
        }));

        // Collect doctors
        const doctors = Array.from(document.querySelectorAll('#doctor-list .list-item')).map(item => ({
            id: item.dataset.id,
            name: item.querySelector('.list-item-title').textContent,
        }));

        return {
            working_hours: workingHours,
            vacations,
            holidays,
            doctors
        };
    }

    resetConstraints() {
        if (confirm('Êtes-vous sûr de vouloir réinitialiser toute la configuration?')) {
            this.populateDefaultConstraints();
            document.getElementById('vacation-list').innerHTML = '';
            document.getElementById('holiday-list').innerHTML = '';
            document.getElementById('doctor-list').innerHTML = '';
            this.showNotification('Configuration réinitialisée', 'info');
        }
    }

    // === ENHANCED SCHEDULING HELPER METHODS ===

    calculateTotalDuration() {
        if (!this.currentTreatmentPlan || !this.currentTreatmentPlan.treatment_sequence) {
            return 0;
        }
        return this.currentTreatmentPlan.treatment_sequence.reduce((total, step) => {
            return total + (step.duration_minutes || 60);
        }, 0);
    }

    calculateTotalWeeks() {
        if (!this.currentTreatmentPlan || !this.currentTreatmentPlan.treatment_sequence) {
            return 0;
        }
        let totalDays = 0;
        this.currentTreatmentPlan.treatment_sequence.forEach((step, index) => {
            if (index > 0 && step.delay_days) {
                totalDays += step.delay_days;
            }
        });
        return Math.ceil(totalDays / 7) || 1;
    }

    setupSchedulingEventListeners(modal, planId) {
        // Patient selection change
        document.getElementById('schedule-patient-select')?.addEventListener('change', () => {
            this.updateSmartAppointmentsPreview();
        });

        // Parameter changes
        ['schedule-start-date', 'schedule-default-time', 'schedule-default-doctor'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => {
                this.updateSmartAppointmentsPreview();
            });
        });

        // Constraint checkboxes
        ['respect-delays', 'avoid-weekends', 'check-holidays'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => {
                this.updateSmartAppointmentsPreview();
            });
        });

        // Quick add patient
        document.getElementById('add-patient-quick-btn')?.addEventListener('click', () => {
            this.showQuickPatientModal();
        });

        // Preview detailed schedule
        document.getElementById('preview-schedule-btn')?.addEventListener('click', () => {
            this.showDetailedSchedulePreview();
        });

        // Confirm scheduling
        document.getElementById('confirm-schedule-btn')?.addEventListener('click', async () => {
            await this.confirmEnhancedScheduling(planId);
            modal.remove();
        });

        // Modal close handlers
        modal.querySelector('.modal-close')?.addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    updateSmartAppointmentsPreview() {
        const container = document.getElementById('appointments-preview-list');
        if (!container || !this.currentTreatmentPlan) return;

        const startDate = document.getElementById('schedule-start-date')?.value;
        const defaultTime = document.getElementById('schedule-default-time')?.value || '09:00';
        const respectDelays = document.getElementById('respect-delays')?.checked;
        const avoidWeekends = document.getElementById('avoid-weekends')?.checked;

        if (!startDate) {
            container.innerHTML = '<p class="text-muted">Sélectionnez une date de début pour voir l\'aperçu</p>';
            return;
        }

        let currentDate = new Date(startDate);
        let html = '<div class="appointments-grid">';

        this.currentTreatmentPlan.treatment_sequence.forEach((step, index) => {
            // Apply delay if specified and respect delays is checked
            if (respectDelays && step.delay_days && index > 0) {
                currentDate.setDate(currentDate.getDate() + step.delay_days);
            }

            // Skip weekends if option is checked
            if (avoidWeekends) {
                while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            }

            const appointmentDate = new Date(currentDate);
            const endTime = this.addMinutesToTime(defaultTime, step.duration_minutes || 60);

            const statusClass = this.checkDateAvailability(appointmentDate) ? 'available' : 'conflict';

            html += `
                <div class="appointment-preview-card ${statusClass}">
                    <div class="appointment-preview-header">
                        <span class="appointment-number">RDV ${step.appointment_number || index + 1}</span>
                        <span class="appointment-status-icon">
                            ${statusClass === 'available' ? '<i class="fas fa-check-circle text-success"></i>' : '<i class="fas fa-exclamation-triangle text-warning"></i>'}
                        </span>
                    </div>
                    <div class="appointment-preview-content">
                        <div class="appointment-date">
                            <i class="fas fa-calendar"></i>
                            ${this.formatDate(appointmentDate)}
                        </div>
                        <div class="appointment-time">
                            <i class="fas fa-clock"></i>
                            ${defaultTime} - ${endTime}
                        </div>
                        <div class="appointment-treatment">
                            <i class="fas fa-tooth"></i>
                            ${step.treatment}
                        </div>
                        ${step.practitioner ? `
                            <div class="appointment-doctor">
                                <i class="fas fa-user-md"></i>
                                ${step.practitioner}
                            </div>
                        ` : ''}
                        ${step.duration_minutes ? `
                            <div class="appointment-duration">
                                <i class="fas fa-hourglass-half"></i>
                                ${step.duration_minutes} min
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;

            // Move to next working day (minimum 1 day between appointments)
            currentDate.setDate(currentDate.getDate() + 1);
        });

        html += '</div>';
        container.innerHTML = html;
    }

    checkDateAvailability(date) {
        // Simplified availability check - in real implementation,
        // this would check against actual appointments and constraints
        const dayOfWeek = date.getDay();
        return !(dayOfWeek === 0 || dayOfWeek === 6); // Not weekend
    }

    showQuickPatientModal() {
        // TODO: Implement quick patient addition
        this.showNotification('Fonction d\'ajout rapide en cours de développement', 'info');
    }

    showDetailedSchedulePreview() {
        console.log('🚀 STEP 1: showDetailedSchedulePreview called');
        
        const patientId = document.getElementById('schedule-patient-select')?.value;
        const startDate = document.getElementById('schedule-start-date')?.value;
        const defaultTime = document.getElementById('schedule-default-time')?.value || '09:00';
        
        console.log('📋 Modal values - Patient:', patientId, 'Start Date:', startDate, 'Default Time:', defaultTime);
        
        if (!patientId || !startDate) {
            this.showNotification('Veuillez sélectionner un patient et une date de début', 'error');
            return;
        }

        // Store the default time for appointment generation
        this.defaultAppointmentTime = defaultTime;

        console.log('🚀 STEP 2: Creating modal element');
        // Create detailed schedule modal
        const scheduleModal = document.createElement('div');
        scheduleModal.className = 'modal schedule-preview-modal';
        scheduleModal.style.display = 'block';
        
        console.log('🚀 STEP 3: Setting modal innerHTML');
        console.log('🚀 Modal element before innerHTML:', scheduleModal);
        scheduleModal.innerHTML = `
            <div class="modal-content extra-large-modal">
                <div class="modal-header">
                    <h2><i class="fas fa-calendar-week"></i> Planification Détaillée - Patient ${patientId}</h2>
                    <span class="modal-close">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="schedule-controls">
                        <div class="schedule-nav">
                            <button class="btn btn-sm" id="prev-week"><i class="fas fa-chevron-left"></i></button>
                            <span id="current-week-display">Semaine du ${new Date(startDate).toLocaleDateString('fr-FR')}</span>
                            <button class="btn btn-sm" id="next-week"><i class="fas fa-chevron-right"></i></button>
                        </div>
                        <div class="schedule-legend">
                            <span class="legend-item"><div class="legend-color provisional"></div> Rendez-vous provisoires</span>
                            <span class="legend-item"><div class="legend-color existing"></div> Rendez-vous existants</span>
                        </div>
                    </div>
                    <div class="schedule-container">
                        <div class="schedule-grid" id="modal-schedule-grid">
                            <!-- Schedule will be generated here -->
                        </div>
                    </div>
                    <div class="appointment-details" id="appointment-details" style="display: none;">
                        <h4>Détails du Rendez-vous</h4>
                        <div id="appointment-details-content"></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Retour</button>
                    <button class="btn btn-success" id="confirm-final-schedule">
                        <i class="fas fa-check"></i> Confirmer la Planification
                    </button>
                </div>
            </div>
        `;

        console.log('🚀 STEP 4: Modal innerHTML set, now appending to body');
        console.log('🚀 Modal element after innerHTML:', scheduleModal);
        console.log('🚀 Body before appendChild:', document.body.children.length, 'children');
        
        document.body.appendChild(scheduleModal);
        
        console.log('🚀 STEP 5: Modal appended to body');
        console.log('🚀 Body after appendChild:', document.body.children.length, 'children');
        console.log('🚀 Modal in DOM:', document.contains(scheduleModal));
        console.log('🚀 Schedule grid exists immediately:', document.getElementById('modal-schedule-grid'));
        
        // Wait for DOM to update before trying to render
        setTimeout(() => {
            console.log('🚀 STEP 6: Timeout callback executing');
            console.log('⏰ Delayed check - Schedule grid exists:', document.getElementById('modal-schedule-grid'));
            
            const gridElement = document.getElementById('modal-schedule-grid');
            if (gridElement) {
                console.log('🚀 STEP 7: Grid element found, proceeding with appointments');
                
                // Initialize the schedule view
                this.currentScheduleWeek = new Date(startDate);
                this.provisionalAppointments = this.generateProvisionalAppointments(patientId, startDate);
                
                // Debug logging
                console.log('🗓️ Generated appointments:', this.provisionalAppointments);
                console.log('📅 Current week:', this.currentScheduleWeek);
                
                console.log('🚀 STEP 8: About to call renderScheduleGrid');
                this.renderScheduleGrid();
                this.setupScheduleEventListeners(scheduleModal);
            } else {
                console.error('❌ FAILURE: Grid element not found in timeout callback');
                console.log('❌ All elements with id in document:', [...document.querySelectorAll('[id]')].map(el => el.id));
            }
        }, 100);
    }

    getPatientName(patientId) {
        const patient = this.patients.find(p => p.id == patientId);
        return patient ? `${patient.first_name} ${patient.last_name}` : 'Patient';
    }

    formatDate(date) {
        // Ensure we have a valid Date object
        if (!date) return 'Date invalide';
        
        // Convert to Date if it's a string
        if (typeof date === 'string') {
            date = new Date(date);
        }
        
        // Check if it's a valid Date
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            return 'Date invalide';
        }
        
        return date.toLocaleDateString('fr-FR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    generateProvisionalAppointments(patientId, startDate) {
        console.log('🏗️ Generating appointments for patient:', patientId, 'startDate:', startDate);
        console.log('📋 Treatment plan:', this.currentTreatmentPlan);
        
        if (!this.currentTreatmentPlan || !this.currentTreatmentPlan.treatment_sequence) {
            console.error('❌ No treatment plan or sequence found');
            return [];
        }

        const appointments = [];
        const start = new Date(startDate);
        let currentDate = new Date(start);

        this.currentTreatmentPlan.treatment_sequence.forEach((treatment, index) => {
            console.log(`📅 Processing treatment ${index + 1}:`, treatment);
            
            // Calculate appointment date based on delays
            if (index > 0) {
                const delayText = treatment.delai || '1 semaine';
                const delayDays = this.parseDelayToDays(delayText);
                currentDate = this.addBusinessDays(new Date(currentDate), delayDays);
            }

            const appointmentTime = this.defaultAppointmentTime || '09:00';
            console.log(`⏰ Using appointment time: ${appointmentTime}`);

            const appointment = {
                id: `provisional-${index}`,
                treatmentIndex: index,
                title: treatment.traitement || `Traitement ${index + 1}`,
                date: new Date(currentDate),
                time: appointmentTime,
                duration: parseInt(treatment.duree) || 60,
                doctor: treatment.dr || 'Dr. Martin',
                patientId: patientId,
                status: 'provisional',
                remarks: treatment.remarque || ''
            };
            
            console.log(`✅ Created appointment:`, appointment);
            appointments.push(appointment);
        });

        console.log(`🎯 Generated ${appointments.length} total appointments`);
        return appointments;
    }

    parseDelayToDays(delayText) {
        if (delayText.includes('jour')) return parseInt(delayText) || 1;
        if (delayText.includes('semaine')) return (parseInt(delayText) || 1) * 7;
        if (delayText.includes('mois')) return (parseInt(delayText) || 1) * 30;
        return 7; // Default to 1 week
    }

    addBusinessDays(date, days) {
        const result = new Date(date);
        let addedDays = 0;
        
        while (addedDays < days) {
            result.setDate(result.getDate() + 1);
            if (result.getDay() !== 0 && result.getDay() !== 6) { // Skip weekends
                addedDays++;
            }
        }
        
        return result;
    }

    renderScheduleGrid() {
        console.log('🚀 STEP 9: renderScheduleGrid called - copying existing schedule + adding appointments');
        const modalGrid = document.getElementById('modal-schedule-grid');
        if (!modalGrid) {
            console.error('❌ Modal schedule grid not found');
            return;
        }
        
        // Get the existing schedule from the planning tab
        const planningGrid = document.querySelector('#schedule .schedule-grid');
        if (!planningGrid) {
            console.error('❌ Planning schedule grid not found');
            return;
        }
        
        console.log('✅ Found both grids - copying planning schedule to modal');
        
        // Copy the existing schedule HTML to the modal
        modalGrid.innerHTML = planningGrid.innerHTML;
        
        console.log('✅ Schedule copied, now adding provisional appointments');
        
        // Add provisional appointments to the copied schedule
        this.addProvisionalAppointmentsToSchedule(modalGrid);
        
        console.log('✅ Provisional appointments added to schedule');
    }

    addProvisionalAppointmentsToSchedule(scheduleGrid) {
        console.log('📅 Adding provisional appointments to schedule');
        console.log('📅 Schedule grid structure:', scheduleGrid.innerHTML.substring(0, 500));
        console.log('📅 Number of provisional appointments:', this.provisionalAppointments.length);
        
        // Create a dedicated section for provisional appointments if the grid is too complex
        let provisionalContainer = scheduleGrid.querySelector('.provisional-appointments-container');
        if (!provisionalContainer) {
            provisionalContainer = document.createElement('div');
            provisionalContainer.className = 'provisional-appointments-container';
            provisionalContainer.style.cssText = `
                background: #f8f9fa;
                border: 2px solid #ffc107;
                border-radius: 8px;
                padding: 15px;
                margin: 10px 0;
                min-height: 100px;
            `;
            provisionalContainer.innerHTML = `
                <h4 style="margin: 0 0 10px 0; color: #856404; font-size: 14px;">
                    <i class="fas fa-calendar-plus"></i> Rendez-vous Provisoires
                </h4>
                <div class="appointments-list"></div>
            `;
            scheduleGrid.insertBefore(provisionalContainer, scheduleGrid.firstChild);
        }
        
        const appointmentsList = provisionalContainer.querySelector('.appointments-list');
        appointmentsList.innerHTML = ''; // Clear existing
        
        // Add each provisional appointment
        this.provisionalAppointments.forEach((appointment, index) => {
            console.log(`📍 Adding appointment ${index + 1}: ${appointment.title}`);
            
            const appointmentElement = document.createElement('div');
            appointmentElement.className = 'appointment provisional';
            appointmentElement.setAttribute('data-appointment-id', appointment.id);
            appointmentElement.setAttribute('draggable', 'true');
            appointmentElement.style.cssText = `
                background: #fff3cd !important;
                border: 2px solid #ffc107 !important;
                border-radius: 6px;
                padding: 8px 10px;
                margin: 5px 0;
                cursor: pointer;
                font-size: 12px;
                color: #856404 !important;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;
            
            const dateStr = this.formatDate(appointment.date);
            
            appointmentElement.innerHTML = `
                <div class="appointment-content">
                    <div class="appointment-title" style="font-weight: bold; margin-bottom: 3px;">
                        ${appointment.title}
                    </div>
                    <div class="appointment-info" style="font-size: 11px; opacity: 0.8;">
                        📅 ${dateStr} • ⏰ ${appointment.time} • ⏱️ ${appointment.duration}min • 👨‍⚕️ ${appointment.doctor}
                    </div>
                </div>
                <div class="appointment-actions" style="display: flex; gap: 5px;">
                    <button class="btn btn-sm btn-outline-warning" style="padding: 2px 6px; font-size: 10px;" onclick="practiceManager.editAppointment('${appointment.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" style="padding: 2px 6px; font-size: 10px;" onclick="practiceManager.removeAppointment('${appointment.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            appointmentsList.appendChild(appointmentElement);
            console.log(`✅ Added appointment to provisional container`);
        });
        
        // Make appointments draggable
        this.makeAppointmentsDraggable();
    }

    findScheduleCellForDateTime(scheduleGrid, dateStr, timeStr) {
        console.log(`🔍 Looking for cell: ${dateStr} ${timeStr}`);
        
        // First, try to find by data attributes
        let cell = scheduleGrid.querySelector(`[data-date="${dateStr}"][data-time="${timeStr}"]`);
        console.log('🔍 Found by data attributes:', cell);
        
        if (!cell) {
            // Try to find cells that might contain appointments
            const allCells = scheduleGrid.querySelectorAll('.day-slot, .time-slot, .appointment-slot, .schedule-cell, div[class*="slot"], div[class*="cell"]');
            console.log(`🔍 Found ${allCells.length} potential cells:`, [...allCells].map(c => c.className));
            
            if (allCells.length > 0) {
                // For debugging, let's use the first few cells to see if appointments appear
                const targetIndex = Math.min(allCells.length - 1, Math.floor(Math.random() * Math.min(5, allCells.length)));
                cell = allCells[targetIndex];
                console.log(`📍 Using cell ${targetIndex} as fallback:`, cell.className);
            }
        }
        
        // If still no cell found, create a test container
        if (!cell) {
            console.log('🚨 No suitable cell found, creating test container');
            cell = document.createElement('div');
            cell.style.cssText = 'border: 2px solid red; padding: 10px; margin: 5px; background: #f0f0f0;';
            scheduleGrid.appendChild(cell);
        }
        
        return cell;
    }

    makeAppointmentsDraggable() {
        const appointments = document.querySelectorAll('#modal-schedule-grid .appointment[draggable="true"]');
        
        appointments.forEach(apt => {
            apt.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', apt.dataset.appointmentId);
                apt.classList.add('dragging');
            });

            apt.addEventListener('dragend', () => {
                apt.classList.remove('dragging');
            });

            apt.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showAppointmentDetails(apt.dataset.appointmentId);
            });
        });

        // Enable drop on schedule cells
        const cells = document.querySelectorAll('#modal-schedule-grid .schedule-cell, #modal-schedule-grid .day-cell');
        cells.forEach(cell => {
            cell.addEventListener('dragover', (e) => {
                e.preventDefault();
                cell.classList.add('drag-over');
            });

            cell.addEventListener('dragleave', () => {
                cell.classList.remove('drag-over');
            });

            cell.addEventListener('drop', (e) => {
                e.preventDefault();
                cell.classList.remove('drag-over');
                
                const appointmentId = e.dataTransfer.getData('text/plain');
                console.log(`Dropped appointment ${appointmentId} on cell`);
                // Handle the drop - move appointment to new cell
                this.moveAppointmentToCell(appointmentId, cell);
            });
        });
    }

    moveAppointmentToCell(appointmentId, targetCell) {
        console.log(`Moving appointment ${appointmentId} to new cell`);
        
        // Find the appointment element
        const appointmentElement = document.querySelector(`[data-appointment-id="${appointmentId}"]`);
        if (!appointmentElement) {
            console.error('Appointment element not found');
            return;
        }
        
        // Move the element to the target cell
        targetCell.appendChild(appointmentElement);
        
        // Update the appointment data
        const appointment = this.provisionalAppointments.find(apt => apt.id === appointmentId);
        if (appointment) {
            // Here you would update the appointment's date/time based on the target cell
            // For now, just show a notification
            this.showNotification(`Rendez-vous "${appointment.title}" déplacé`, 'success');
        }
    }

    setupScheduleEventListeners(modal) {
        console.log('🎯 Setting up schedule event listeners for modal');
        
        // Week navigation - use querySelector to make sure we get the elements from the modal
        const prevWeekBtn = modal.querySelector('#prev-week');
        const nextWeekBtn = modal.querySelector('#next-week');
        const weekDisplay = modal.querySelector('#current-week-display');
        
        console.log('🎯 Navigation elements:', { 
            prevWeekBtn: prevWeekBtn ? 'Found' : 'Missing', 
            nextWeekBtn: nextWeekBtn ? 'Found' : 'Missing', 
            weekDisplay: weekDisplay ? 'Found' : 'Missing' 
        });
        
        if (prevWeekBtn) {
            prevWeekBtn.addEventListener('click', () => {
                console.log('◀️ Previous week clicked in modal');
                this.currentScheduleWeek.setDate(this.currentScheduleWeek.getDate() - 7);
                if (weekDisplay) {
                    weekDisplay.textContent = `Semaine du ${this.formatDate(this.currentScheduleWeek)}`;
                }
                this.renderScheduleGrid();
            });
        }

        if (nextWeekBtn) {
            nextWeekBtn.addEventListener('click', () => {
                console.log('▶️ Next week clicked in modal');
                this.currentScheduleWeek.setDate(this.currentScheduleWeek.getDate() + 7);
                if (weekDisplay) {
                    weekDisplay.textContent = `Semaine du ${this.formatDate(this.currentScheduleWeek)}`;
                }
                this.renderScheduleGrid();
            });
        }

        // Modal close handlers
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => modal.remove());
        }
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });

        // Confirm final schedule
        const confirmBtn = modal.querySelector('#confirm-final-schedule');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.confirmFinalSchedule();
                modal.remove();
            });
        }
    }

    async confirmFinalSchedule() {
        console.log('🚀 Confirming final schedule with appointments:', this.provisionalAppointments);
        
        if (!this.provisionalAppointments || this.provisionalAppointments.length === 0) {
            this.showNotification('Aucun rendez-vous à confirmer', 'warning');
            return;
        }

        try {
            // Show loading state
            this.showNotification('Sauvegarde des rendez-vous...', 'info');
            
            // Convert provisional appointments to the format expected by the backend
            const appointmentsToSave = this.provisionalAppointments.map(apt => {
                const appointmentDate = apt.date.toISOString().split('T')[0];
                const appointmentDateTime = `${appointmentDate}T${apt.time}:00`;
                
                return {
                    patient_id: apt.patientId,
                    appointment_date: appointmentDate,
                    appointment_time: appointmentDateTime,
                    duration_minutes: apt.duration,
                    treatment_type: apt.title,
                    status: 'scheduled',
                    doctor: apt.doctor,
                    room: null,
                    notes: apt.remarks || '',
                    treatment_plan_id: this.currentTreatmentPlan?.id || null
                };
            });

            console.log('📋 Appointments to save:', appointmentsToSave);

            // Save each appointment to the backend
            const savePromises = appointmentsToSave.map(async (appointment) => {
                console.log('💾 Saving appointment:', appointment);
                
                const response = await fetch('/api/appointments/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(appointment)
                });

                if (!response.ok) {
                    throw new Error(`Failed to save appointment: ${response.statusText}`);
                }

                return response.json();
            });

            // Wait for all appointments to be saved
            const savedAppointments = await Promise.all(savePromises);
            console.log('✅ All appointments saved:', savedAppointments);

            // Update the treatment plan status
            if (this.currentTreatmentPlan) {
                this.currentTreatmentPlan.status = 'scheduled';
                this.currentTreatmentPlan.scheduled_appointments = savedAppointments.length;
                this.currentTreatmentPlan.scheduled_date = new Date().toISOString();
            }

            // Store first appointment date before clearing provisional appointments
            const firstAppointmentDate = this.provisionalAppointments[0]?.date || new Date();

            // Clear provisional appointments
            this.provisionalAppointments = [];

            // Always switch to the schedule tab to show the updated schedule
            console.log('📍 Switching to schedule tab to show confirmed appointments');
            console.log('📍 Current tab before switch:', window.dentalAI?.currentTab);
            
            if (window.dentalAI) {
                window.dentalAI.switchTab('schedule');
                console.log('📍 Current tab after switch:', window.dentalAI.currentTab);
                
                // Navigate to the week containing the first appointment
                if (savedAppointments.length > 0) {
                    console.log('📅 First appointment date:', firstAppointmentDate);
                    this.navigateToWeek(firstAppointmentDate);
                }
                
                // Force a reload of the schedule after a short delay
                setTimeout(async () => {
                    console.log('🔄 Force reloading schedule after tab switch...');
                    await this.loadSchedule();
                    
                    // Also trigger the practice manager to handle the tab switch
                    this.handleTabSwitch('schedule');
                }, 500);
            }

            // Show success message
            this.showNotification(
                `${savedAppointments.length} rendez-vous confirmés avec succès!`, 
                'success'
            );

        } catch (error) {
            console.error('❌ Error confirming schedule:', error);
            this.showNotification(
                'Erreur lors de la confirmation des rendez-vous: ' + error.message, 
                'error'
            );
        }
    }

    editAppointment(appointmentId) {
        console.log('📝 Editing appointment:', appointmentId);
        const appointment = this.provisionalAppointments.find(apt => apt.id === appointmentId);
        if (!appointment) {
            console.error('❌ Appointment not found:', appointmentId);
            return;
        }

        // Create simple edit modal
        const editModal = document.createElement('div');
        editModal.className = 'modal';
        editModal.style.display = 'block';
        editModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Modifier le Rendez-vous</h3>
                    <span class="modal-close">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Date:</label>
                        <input type="date" id="edit-date" value="${appointment.date.toISOString().split('T')[0]}">
                    </div>
                    <div class="form-group">
                        <label>Heure:</label>
                        <input type="time" id="edit-time" value="${appointment.time}">
                    </div>
                    <div class="form-group">
                        <label>Durée (minutes):</label>
                        <input type="number" id="edit-duration" value="${appointment.duration}" min="15" max="240" step="15">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Annuler</button>
                    <button class="btn btn-primary" id="save-appointment">Sauvegarder</button>
                </div>
            </div>
        `;

        document.body.appendChild(editModal);

        // Setup save handler
        editModal.querySelector('#save-appointment').addEventListener('click', () => {
            const newDate = editModal.querySelector('#edit-date').value;
            const newTime = editModal.querySelector('#edit-time').value;
            const newDuration = parseInt(editModal.querySelector('#edit-duration').value);

            appointment.date = new Date(newDate);
            appointment.time = newTime;
            appointment.duration = newDuration;

            this.renderScheduleGrid(); // Refresh the display
            editModal.remove();
            this.showNotification('Rendez-vous modifié', 'success');
        });

        // Setup close handler
        editModal.querySelector('.modal-close').addEventListener('click', () => editModal.remove());
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) editModal.remove();
        });
    }

    removeAppointment(appointmentId) {
        console.log('🗑️ Removing appointment:', appointmentId);
        const index = this.provisionalAppointments.findIndex(apt => apt.id === appointmentId);
        if (index !== -1) {
            this.provisionalAppointments.splice(index, 1);
            this.renderScheduleGrid(); // Refresh the display
            this.showNotification('Rendez-vous supprimé', 'info');
        } else {
            console.error('❌ Appointment not found for removal:', appointmentId);
        }
    }

    // === ENHANCED SCHEDULE UI FUNCTIONALITY ===

    setupDragAndDrop() {
        console.log('🎯 Setting up drag and drop functionality');
        
        // Setup drag events for appointments
        const appointments = document.querySelectorAll('#schedule-grid.enhanced .appointment[draggable="true"]');
        appointments.forEach(appointment => {
            appointment.addEventListener('dragstart', (e) => this.handleDragStart(e));
            appointment.addEventListener('dragend', (e) => this.handleDragEnd(e));
        });

        // Setup drop events for hour cells  
        const cells = document.querySelectorAll('#schedule-grid.enhanced .hour-cell');
        cells.forEach(cell => {
            cell.addEventListener('dragover', (e) => this.handleDragOver(e));
            cell.addEventListener('drop', (e) => this.handleDrop(e));
            cell.addEventListener('dragenter', (e) => this.handleDragEnter(e));
            cell.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        });
    }

    handleDragStart(e) {
        const appointment = e.target.closest('.appointment');
        if (!appointment) return;

        appointment.classList.add('dragging');
        e.dataTransfer.setData('text/plain', appointment.dataset.appointmentId);
        e.dataTransfer.effectAllowed = 'move';
        
        console.log('🎯 Drag started for appointment:', appointment.dataset.appointmentId);
    }

    handleDragEnd(e) {
        const appointment = e.target.closest('.appointment');
        if (!appointment) return;

        appointment.classList.remove('dragging');
        
        // Remove drag-over classes from all cells
        document.querySelectorAll('#schedule-grid.enhanced .appointment-cell').forEach(cell => {
            cell.classList.remove('drag-over', 'drop-target');
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    handleDragEnter(e) {
        e.preventDefault();
        const cell = e.target.closest('.appointment-cell');
        if (cell) {
            cell.classList.add('drag-over');
        }
    }

    handleDragLeave(e) {
        const cell = e.target.closest('.appointment-cell');
        if (cell && !cell.contains(e.relatedTarget)) {
            cell.classList.remove('drag-over');
        }
    }

    async handleDrop(e) {
        e.preventDefault();
        
        const appointmentId = e.dataTransfer.getData('text/plain');
        const targetCell = e.target.closest('.hour-cell');
        
        if (!targetCell || !appointmentId) return;

        const newDate = targetCell.dataset.date;
        const newHour = targetCell.dataset.hour;
        
        // For hour-based drops, default to the start of the hour
        const newTime = newHour;
        
        console.log(`🎯 Dropping appointment ${appointmentId} to ${newDate} ${newTime}`);
        
        targetCell.classList.remove('drag-over', 'drop-target');
        
        try {
            await this.moveAppointment(appointmentId, newDate, newTime);
        } catch (error) {
            console.error('❌ Error moving appointment:', error);
            this.showNotification('Erreur lors du déplacement du rendez-vous', 'error');
        }
    }

    async moveAppointment(appointmentId, newDate, newTime) {
        console.log(`📅 Moving appointment ${appointmentId} to ${newDate} ${newTime}`);
        
        try {
            // Format the data correctly for the API
            const updateData = {
                appointment_date: newDate,
                appointment_time: `${newDate}T${newTime}:00`  // Full datetime format
            };
            
            console.log(`📋 Sending update data:`, updateData);
            
            const response = await fetch(`/api/appointments/${appointmentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData)
            });

            console.log(`📡 API response status:`, response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ API error response:`, errorText);
                throw new Error(`API Error: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            console.log(`📋 API result:`, result);
            
            if (result.status === 'success') {
                this.showNotification('Rendez-vous déplacé avec succès', 'success');
                await this.loadSchedule(); // Refresh the schedule
            } else {
                throw new Error(result.message || 'Erreur lors du déplacement');
            }
        } catch (error) {
            console.error('❌ Error in moveAppointment:', error);
            
            // Provide more specific error information
            if (error.message.includes('404')) {
                this.showNotification('Rendez-vous non trouvé', 'error');
            } else if (error.message.includes('400')) {
                this.showNotification('Données invalides pour le déplacement', 'error');
            } else {
                this.showNotification('Erreur lors du déplacement du rendez-vous', 'error');
            }
            
            throw error;
        }
    }

    async showAppointmentDetails(appointmentId) {
        console.log('📋 Showing details for appointment:', appointmentId);
        
        try {
            // Find appointment in current appointments array
            const appointment = this.appointments.find(apt => apt.id === appointmentId);
            
            if (!appointment) {
                console.error('❌ Appointment not found:', appointmentId);
                return;
            }

            // Get patient details
            const patient = this.patients.find(p => p.id === appointment.patient_id);
            
            // Create appointment details modal
            const modal = document.createElement('div');
            modal.className = 'modal appointment-details-modal';
            modal.style.display = 'block';
            
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-calendar-check"></i> Détails du Rendez-vous</h3>
                        <span class="modal-close">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="appointment-details-grid">
                            <div class="detail-section">
                                <h4><i class="fas fa-user"></i> Patient</h4>
                                <div class="detail-content">
                                    <p><strong>Nom:</strong> ${patient?.first_name || ''} ${patient?.last_name || 'Patient'}</p>
                                    <p><strong>Email:</strong> ${patient?.email || 'Non renseigné'}</p>
                                    <p><strong>Téléphone:</strong> ${patient?.phone || 'Non renseigné'}</p>
                                </div>
                            </div>
                            
                            <div class="detail-section">
                                <h4><i class="fas fa-tooth"></i> Traitement</h4>
                                <div class="detail-content">
                                    <p><strong>Type:</strong> ${appointment.treatment_type || 'Non spécifié'}</p>
                                    <p><strong>Durée:</strong> ${appointment.duration_minutes || 60} minutes</p>
                                    <p><strong>Praticien:</strong> ${appointment.doctor || 'Dr.'}</p>
                                </div>
                            </div>
                            
                            <div class="detail-section">
                                <h4><i class="fas fa-clock"></i> Horaires</h4>
                                <div class="detail-content">
                                    <p><strong>Date:</strong> ${this.formatDate(new Date(appointment.appointment_date))}</p>
                                    <p><strong>Heure:</strong> ${appointment.appointment_time.substring(0, 5)}</p>
                                    <p><strong>Statut:</strong> <span class="status-badge ${appointment.status}">${appointment.status}</span></p>
                                </div>
                            </div>
                            
                            ${appointment.notes ? `
                                <div class="detail-section">
                                    <h4><i class="fas fa-sticky-note"></i> Notes</h4>
                                    <div class="detail-content">
                                        <p>${appointment.notes}</p>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Fermer</button>
                        <button class="btn btn-warning" onclick="practiceManager.editAppointmentInline('${appointmentId}')">
                            <i class="fas fa-edit"></i> Modifier
                        </button>
                        <button class="btn btn-danger" onclick="practiceManager.deleteAppointment('${appointmentId}')">
                            <i class="fas fa-trash"></i> Supprimer
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Setup close handlers
            modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });

        } catch (error) {
            console.error('❌ Error showing appointment details:', error);
            this.showNotification('Erreur lors de l\'affichage des détails', 'error');
        }
    }

    async editAppointmentInline(appointmentId) {
        // Close the details modal first
        document.querySelector('.appointment-details-modal')?.remove();
        
        // Find appointment
        const appointment = this.appointments.find(apt => apt.id === appointmentId);
        if (!appointment) return;

        // Create edit modal
        const modal = document.createElement('div');
        modal.className = 'modal appointment-edit-modal';
        modal.style.display = 'block';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-edit"></i> Modifier le Rendez-vous</h3>
                    <span class="modal-close">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Date:</label>
                            <input type="date" id="edit-appointment-date" value="${appointment.appointment_date}">
                        </div>
                        <div class="form-group">
                            <label>Heure:</label>
                            <input type="time" id="edit-appointment-time" value="${appointment.appointment_time.substring(0, 5)}">
                        </div>
                        <div class="form-group">
                            <label>Durée (minutes):</label>
                            <input type="number" id="edit-appointment-duration" value="${appointment.duration_minutes}" min="15" max="240" step="15">
                        </div>
                        <div class="form-group">
                            <label>Traitement:</label>
                            <input type="text" id="edit-appointment-treatment" value="${appointment.treatment_type}">
                        </div>
                        <div class="form-group">
                            <label>Praticien:</label>
                            <input type="text" id="edit-appointment-doctor" value="${appointment.doctor}">
                        </div>
                        <div class="form-group full-width">
                            <label>Notes:</label>
                            <textarea id="edit-appointment-notes">${appointment.notes || ''}</textarea>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Annuler</button>
                    <button class="btn btn-primary" id="save-appointment-changes">Sauvegarder</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Setup save handler
        modal.querySelector('#save-appointment-changes').addEventListener('click', async () => {
            await this.saveAppointmentChanges(appointmentId, modal);
        });

        // Setup close handlers
        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    async saveAppointmentChanges(appointmentId, modal) {
        try {
            const updatedData = {
                appointment_date: modal.querySelector('#edit-appointment-date').value,
                appointment_time: modal.querySelector('#edit-appointment-time').value + ':00',
                duration_minutes: parseInt(modal.querySelector('#edit-appointment-duration').value),
                treatment_type: modal.querySelector('#edit-appointment-treatment').value,
                doctor: modal.querySelector('#edit-appointment-doctor').value,
                notes: modal.querySelector('#edit-appointment-notes').value
            };

            const response = await fetch(`/api/appointments/${appointmentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedData)
            });

            const result = await response.json();
            
            if (result.status === 'success') {
                this.showNotification('Rendez-vous modifié avec succès', 'success');
                modal.remove();
                await this.loadSchedule(); // Refresh the schedule
            } else {
                throw new Error(result.message || 'Erreur lors de la modification');
            }
        } catch (error) {
            console.error('❌ Error saving appointment changes:', error);
            this.showNotification('Erreur lors de la sauvegarde', 'error');
        }
    }

    async deleteAppointment(appointmentId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce rendez-vous ?')) {
            return;
        }

        try {
            const response = await fetch(`/api/appointments/${appointmentId}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            
            if (result.status === 'success') {
                this.showNotification('Rendez-vous supprimé avec succès', 'success');
                document.querySelector('.appointment-details-modal')?.remove();
                await this.loadSchedule(); // Refresh the schedule
            } else {
                throw new Error(result.message || 'Erreur lors de la suppression');
            }
        } catch (error) {
            console.error('❌ Error deleting appointment:', error);
            this.showNotification('Erreur lors de la suppression', 'error');
        }
    }

}

// Export the class
window.PracticeManager = PracticeManager;
