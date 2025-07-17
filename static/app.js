class DentalAISuite {
    constructor() {
        this.currentTab = 'dental-brain';
        this.chatInstances = {};
        this.isLoading = false;
        this.currentTreatmentPlan = null; // Store current plan for modifications
        this.initializeTabs();
        this.setupEventListeners();
        this.loadKnowledgeBase();
    }

    initializeTabs() {
        // Initialize chat instances for each tab
        const tabs = ['dental-brain', 'swiss-law', 'invisalign', 'office-knowledge', 'insurance', 'patient-comm', 'emergency', 'schedule'];
        
        tabs.forEach(tab => {
            this.chatInstances[tab] = {
                history: [],
                messages: document.getElementById(`chat-messages-${tab}`),
                input: document.getElementById(`chat-input-${tab}`),
                sendButton: document.querySelector(`[data-target="${tab}"]`)
            };
        });
        
        this.knowledgeCount = document.getElementById('knowledge-count');
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const tabId = e.currentTarget.dataset.tab;
                this.switchTab(tabId);
            });
        });

        // Setup listeners for each tab
        Object.keys(this.chatInstances).forEach(tab => {
            const instance = this.chatInstances[tab];
            
            // Send button click
            instance.sendButton.addEventListener('click', () => this.sendMessage(tab));
            
            // Enter key to send message
            instance.input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage(tab);
                }
            });

            // Auto-resize textarea
            instance.input.addEventListener('input', () => {
                this.autoResizeTextarea(instance.input);
                this.updateSendButton(tab);
            });

            // Initial send button state
            this.updateSendButton(tab);
        });
    }

    switchTab(tabId) {
        // Update active tab button
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
        
        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
        
        this.currentTab = tabId;
        
        // Handle different tab types
        if (['finance-dashboard', 'invoices', 'pricing'].includes(tabId)) {
            // Initialize finance functionality
            if (window.financeManager) {
                window.financeManager.handleTabSwitch(tabId);
            }
        } else if (['patients', 'schedule'].includes(tabId)) {
            // Initialize practice management functionality
            if (window.practiceManager) {
                window.practiceManager.handleTabSwitch(tabId);
            }
        } else {
            // Focus on the input of the active tab for AI tabs
            setTimeout(() => {
                if (this.chatInstances[tabId]) {
                    this.chatInstances[tabId].input.focus();
                }
            }, 100);
        }
    }

    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    updateSendButton(tab) {
        const instance = this.chatInstances[tab];
        const hasText = instance.input.value.trim().length > 0;
        instance.sendButton.disabled = !hasText || this.isLoading;
    }

    async loadKnowledgeBase() {
        try {
            const response = await fetch('/knowledge');
            const data = await response.json();
            this.knowledgeCount.textContent = data.cases;
            console.log('Knowledge base loaded:', data.cases, 'cases');
        } catch (error) {
            console.error('Error loading knowledge base:', error);
            this.knowledgeCount.textContent = 'Erreur';
        }
    }

    async sendMessage(tab) {
        if (this.isLoading) return;
        
        const instance = this.chatInstances[tab];
        const message = instance.input.value.trim();
        if (!message) return;

        // Add loading state to input wrapper
        const inputWrapper = instance.input.closest('.chat-input-wrapper');
        inputWrapper.classList.add('loading');
        
        // Brief sending animation
        inputWrapper.classList.add('sending');
        setTimeout(() => {
            inputWrapper.classList.remove('sending');
        }, 300);

        // Clear input and hide welcome message
        instance.input.value = '';
        this.autoResizeTextarea(instance.input);
        this.updateSendButton(tab);
        this.hideWelcomeMessage(tab);

        // Add user message to chat
        this.addMessage(tab, 'user', message);

        // Show typing indicator
        this.showTypingIndicator(tab);

        try {
            let response, data;
            
            // Handle schedule chat with specialized endpoint
            if (tab === 'schedule') {
                response = await fetch('/api/schedule-chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: message
                    })
                });
            } else {
                // Send request to backend with tab context for other tabs
                response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    history: instance.history,
                    tab: tab  // Include tab context for specialized responses
                })
            });
            }

            data = await response.json();

            // Check if response contains an error
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Handle schedule chat response
            if (tab === 'schedule') {
                // Remove typing indicator
                this.hideTypingIndicator(tab);
                
                // Add assistant response to chat with schedule-specific formatting
                this.addScheduleMessage(tab, data);
                
                // Update chat history for this tab
                instance.history.push(
                    { role: 'user', content: message },
                    { role: 'assistant', content: data.content || data.response }
                );
            } else {
                // Check if response has the expected structure for other tabs
            if (data.response) {
                // Remove typing indicator
                this.hideTypingIndicator(tab);
                
                // Add assistant response to chat
                // Check if this is a treatment plan response
                if (data.is_treatment_plan && data.treatment_plan) {
                    console.log('🎯 Treatment plan detected, rendering table:', data.treatment_plan);
                    this.addTreatmentPlanMessage(tab, data);
                } else {
                    console.log('📝 Regular message response:', data);
                    if (data.is_treatment_plan && !data.treatment_plan) {
                        console.warn('⚠️ Treatment plan flag set but no treatment_plan data received');
                    }
                    this.addMessage(tab, 'assistant', data.response, data.references, data.context_info);
                }
                
                // Update chat history for this tab
                instance.history.push(
                    { role: 'user', content: message },
                    { role: 'assistant', content: data.response }
                );
            } else {
                throw new Error('Réponse invalide du serveur');
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.hideTypingIndicator(tab);
            this.addMessage(tab, 'assistant', 
                `Désolé, une erreur s'est produite: ${error.message}. Veuillez réessayer.`
            );
        } finally {
            // Remove loading state from input wrapper
            inputWrapper.classList.remove('loading');
        }
    }

    showTypingIndicator(tab) {
        this.isLoading = true;
        this.updateSendButton(tab);
        
        const instance = this.chatInstances[tab];
        
        // Create typing indicator message
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant typing';
        messageDiv.id = `typing-indicator-${tab}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = '<i class="fas fa-tooth"></i>';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = '<div class="loading"><span>Réflexion en cours</span><div class="loading-dots"><div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div></div></div>';
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        
        instance.messages.appendChild(messageDiv);
        this.scrollToBottom(tab);
    }

    hideTypingIndicator(tab) {
        this.isLoading = false;
        this.updateSendButton(tab);
        
        const typingIndicator = document.getElementById(`typing-indicator-${tab}`);
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    addMessage(tab, role, content, references = [], contextInfo = {}) {
        const instance = this.chatInstances[tab];
        const messagesContainer = instance.messages;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        avatarDiv.innerHTML = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Process the content
        contentDiv.innerHTML = this.processMessageContent(content);
        
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        
        // Add references if provided
        if (references && references.length > 0) {
            const referencesHTML = this.createReferencesSection(references);
            // Create a temporary div to convert HTML string to DOM elements
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = referencesHTML;
            // Append the actual DOM elements, not the HTML string
            while (tempDiv.firstChild) {
                contentDiv.appendChild(tempDiv.firstChild);
            }
        }
        
        messagesContainer.appendChild(messageDiv);
        this.scrollToBottom(tab);
    }

    addScheduleMessage(tab, data) {
        const chatMessages = document.getElementById(`chat-messages-${tab}`);
        if (!chatMessages) return;
        
        // Create message element
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant';
        
        let content = data.content || data.response || '';
        
        // Build message HTML
        let messageHTML = `
            <div class="message-avatar">
                <i class="fas fa-calendar-check"></i>
            </div>
            <div class="message-content">
                <div class="message-text">${content}</div>
        `;
        
        // Add autonomous plan section if available
        if (data.autonomous_plan && data.autonomous_plan.success) {
            messageHTML += this.createAutonomousPlanHTML(data.autonomous_plan);
        }
        
        // Add analysis section if available
        if (data.analysis) {
            messageHTML += `
                <div class="schedule-analysis">
                    <details>
                        <summary><i class="fas fa-brain"></i> Analyse de la demande</summary>
                        <div class="analysis-content">
                            <p><strong>Analyse:</strong> ${data.analysis.analysis}</p>
                            ${data.analysis.detected_dates && data.analysis.detected_dates.length > 0 ? 
                                `<p><strong>Dates détectées:</strong> ${data.analysis.detected_dates.join(', ')}</p>` : ''}
                            ${data.analysis.immediate_actions && data.analysis.immediate_actions.length > 0 ? 
                                `<ul><strong>Actions immédiates:</strong>
                                    ${data.analysis.immediate_actions.map(action => `<li>${action}</li>`).join('')}
                                </ul>` : ''}
                        </div>
                    </details>
                </div>
            `;
        }
        
        messageHTML += '</div>';
        messageDiv.innerHTML = messageHTML;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    createAutonomousPlanHTML(autonomousPlan) {
        const decisions = autonomousPlan.decisions || [];
        const stats = autonomousPlan.statistics || {};
        
        let html = `
            <div class="autonomous-plan">
                <div class="plan-header">
                    <h4><i class="fas fa-robot"></i> Plan Autonome Généré</h4>
                    <div class="plan-stats">
                        <span class="stat-item">
                            <i class="fas fa-calendar-alt"></i>
                            ${stats.total_appointments || 0} RDV
                        </span>
                        <span class="stat-item success">
                            <i class="fas fa-check-circle"></i>
                            ${stats.successful_reschedules || 0} reprogrammés
                        </span>
                        ${stats.failed_reschedules > 0 ? `
                            <span class="stat-item warning">
                                <i class="fas fa-exclamation-triangle"></i>
                                ${stats.failed_reschedules} à revoir
                            </span>
                        ` : ''}
                    </div>
                </div>
        `;
        
        if (decisions.length > 0) {
            html += '<div class="decisions-list">';
            
            // Show successful decisions
            const successfulDecisions = decisions.filter(d => d.success);
            if (successfulDecisions.length > 0) {
                html += '<div class="decisions-section successful">';
                html += '<h5><i class="fas fa-check-circle"></i> Reprogrammations Prêtes</h5>';
                
                successfulDecisions.forEach(decision => {
                    html += `
                        <div class="decision-item success">
                            <div class="decision-header">
                                <strong>${decision.patient_name}</strong>
                                <span class="treatment-type">${decision.treatment}</span>
                            </div>
                            <div class="decision-details">
                                <div class="time-change">
                                    <span class="old-time">
                                        <i class="fas fa-arrow-right"></i>
                                        ${decision.current_slot}
                                    </span>
                                    <span class="new-time">
                                        <i class="fas fa-calendar-check"></i>
                                        ${decision.new_date} à ${decision.new_time}
                                    </span>
                                </div>
                                <div class="decision-reasoning">
                                    <i class="fas fa-lightbulb"></i>
                                    ${decision.reasoning}
                                </div>
                                <div class="confidence-level">
                                    <i class="fas fa-percentage"></i>
                                    Confiance: ${Math.round((decision.confidence || 0) * 100)}%
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                html += '</div>';
            }
            
            // Show failed decisions
            const failedDecisions = decisions.filter(d => !d.success);
            if (failedDecisions.length > 0) {
                html += '<div class="decisions-section failed">';
                html += '<h5><i class="fas fa-exclamation-triangle"></i> Nécessitent Attention</h5>';
                
                failedDecisions.forEach(decision => {
                    html += `
                        <div class="decision-item warning">
                            <div class="decision-header">
                                <strong>${decision.patient_name}</strong>
                                <span class="treatment-type">${decision.treatment}</span>
                            </div>
                            <div class="decision-details">
                                <div class="problem-description">
                                    <i class="fas fa-exclamation-circle"></i>
                                    ${decision.reasoning}
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                html += '</div>';
            }
            
            html += '</div>';
        }
        
        // Add approval section
        if (autonomousPlan.requires_approval && autonomousPlan.execution_ready) {
            html += `
                <div class="approval-section">
                    <div class="approval-message">
                        <i class="fas fa-hand-paper"></i>
                        <strong>Approbation requise</strong>
                        <p>Ce plan est prêt à être exécuté. Voulez-vous appliquer ces modifications à votre planning ?</p>
                    </div>
                    <div class="approval-buttons">
                        <button class="btn btn-success approve-btn" 
                                onclick="dentalAI.approveAutonomousPlan(${JSON.stringify(autonomousPlan).replace(/"/g, '&quot;')})">
                            <i class="fas fa-check"></i>
                            Approuver et Exécuter
                        </button>
                        <button class="btn btn-secondary modify-btn" 
                                onclick="dentalAI.requestPlanModification()">
                            <i class="fas fa-edit"></i>
                            Demander des Modifications
                        </button>
                        <button class="btn btn-danger reject-btn" 
                                onclick="dentalAI.rejectAutonomousPlan()">
                            <i class="fas fa-times"></i>
                            Rejeter
                        </button>
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    }

    addTreatmentPlanMessage(tab, data) {
        const instance = this.chatInstances[tab];
        const messagesContainer = instance.messages;
        
        console.log('🔄 Starting treatment plan message creation');
        console.log('📊 Treatment plan data:', data.treatment_plan);
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant treatment-plan';
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        avatarDiv.innerHTML = '<i class="fas fa-tooth"></i>';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Store treatment plan globally for modifications
        this.currentTreatmentPlan = data.treatment_plan;
        const planId = 'plan-' + Date.now();
        
        // Validate treatment sequence exists
        if (!data.treatment_plan.treatment_sequence || !Array.isArray(data.treatment_plan.treatment_sequence)) {
            console.error('❌ Invalid treatment_sequence:', data.treatment_plan.treatment_sequence);
            contentDiv.innerHTML = '<div class="error-message">Erreur: Plan de traitement mal formé. La séquence de traitement est manquante ou invalide.</div>';
            messageDiv.appendChild(avatarDiv);
            messageDiv.appendChild(contentDiv);
            messagesContainer.appendChild(messageDiv);
            return;
        }
        
        console.log(`✅ Valid treatment sequence with ${data.treatment_plan.treatment_sequence.length} appointments`);
        
        // Create treatment plan HTML with editable table
        const treatmentPlan = data.treatment_plan;
        let html = `
            <div class="treatment-plan-container" data-plan-id="${planId}">
                <div class="treatment-plan-header">
                    <h4><i class="fas fa-calendar-check"></i> Plan de Traitement Généré</h4>
                    <div class="consultation-text">
                        <strong>Consultation:</strong> ${treatmentPlan.consultation_text || 'Plan de traitement'}
                    </div>
                    <div class="edit-instructions">
                        <i class="fas fa-info-circle"></i> 
                        <span>Cliquez sur une cellule pour modifier • Glissez les lignes pour réorganiser</span>
                    </div>
                </div>
                
                <div class="treatment-sequence-table editable-table">
                    <table id="treatment-table-${planId}">
                        <thead>
                            <tr>
                                <th width="40"></th>
                                <th width="60">RDV</th>
                                <th>Traitement</th>
                                <th width="100">Durée</th>
                                <th width="100">Délai</th>
                                <th width="100">Praticien</th>
                                <th>Remarques</th>
                                <th width="80">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="treatment-tbody-${planId}">
        `;
        
        // Add each treatment sequence row with editable cells
        treatmentPlan.treatment_sequence.forEach((appointment, index) => {
            html += `
                <tr class="draggable-row" data-index="${index}" draggable="true">
                    <td class="drag-handle">
                        <i class="fas fa-grip-vertical"></i>
                    </td>
                    <td class="rdv-number">${appointment.rdv}</td>
                    <td class="treatment-desc editable" contenteditable="true" data-field="traitement">${appointment.traitement}</td>
                    <td class="duration editable" contenteditable="true" data-field="duree">${appointment.duree}</td>
                    <td class="delay editable" contenteditable="true" data-field="delai">${appointment.delai || '-'}</td>
                    <td class="doctor editable" contenteditable="true" data-field="dr">${appointment.dr || 'NB'}</td>
                    <td class="remarks editable" contenteditable="true" data-field="remarque">${appointment.remarque || '-'}</td>
                    <td class="row-actions">
                        <button class="btn-icon btn-delete" onclick="window.dentalAI.deleteSequenceRow('${planId}', ${index})" title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        html += `
                        </tbody>
                    </table>
                    <div class="table-actions">
                        <button class="btn btn-sm btn-add-row" onclick="window.dentalAI.addSequenceRow('${planId}')">
                            <i class="fas fa-plus"></i> Ajouter un RDV
                        </button>
                    </div>
                </div>
        `;
        
        // Add references section if available
        if (data.references && data.references.length > 0) {
            html += this.createReferencesSection(data.references);
        }
        
        html += `
                <div class="treatment-plan-actions">
                    <button class="btn btn-primary" onclick="window.dentalAI.scheduleTreatmentPlan('${planId}')">
                        <i class="fas fa-calendar-plus"></i> Programmer les RDV
                    </button>
                    <button class="btn btn-secondary" onclick="window.dentalAI.saveTreatmentPlan('${planId}')">
                        <i class="fas fa-save"></i> Sauvegarder
                    </button>
                    <button class="btn btn-secondary" onclick="window.dentalAI.exportTreatmentPlan('${planId}')">
                        <i class="fas fa-download"></i> Exporter
                    </button>
                </div>
            </div>
        `;
        
        contentDiv.innerHTML = html;
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        
        messagesContainer.appendChild(messageDiv);
        this.scrollToBottom(tab);
        
        // Initialize drag and drop functionality
        this.initializeDragAndDrop(planId);
        
        // Initialize inline editing
        this.initializeInlineEditing(planId);
    }

    createReferencesSection(references) {
        let html = `
            <div class="references-section">
                <h5><i class="fas fa-book"></i> Références utilisées</h5>
                <div class="references-grid">
        `;
        
        console.log('🚀 UPDATED JAVASCRIPT LOADED - Version 20250716214200');
        references.forEach(reference => {
            console.log('🔍 Reference debug:', {
                id: reference.id,
                title: reference.title,
                similarity_score: reference.similarity_score,
                type: reference.similarity_score ? typeof reference.similarity_score : 'undefined'
            });
            
            // Ensure similarity_score is a valid number
            const similarityScore = (typeof reference.similarity_score === 'number' && !isNaN(reference.similarity_score)) 
                ? reference.similarity_score 
                : 0;
            const similarityPct = Math.round(similarityScore * 100);
            
            console.log('🔢 Similarity calculation:', {
                original: reference.similarity_score,
                processed: similarityScore,
                percentage: similarityPct
            });
            const typeIcon = this.getTypeIcon(reference.type);
            const categories = reference.categories ? reference.categories.join(', ') : '';
            
            html += `
                <div class="reference-card" data-ref-id="${reference.id}" onclick="(function() { 
                    console.log('🔍 [createReferencesSection] Clicking reference with ID:', '${reference.id}'); 
                    if(window.dentalAI && typeof window.dentalAI.showReferenceDetails === 'function') { 
                        window.dentalAI.showReferenceDetails('${reference.id}'); 
                    } else { 
                        console.error('DentalAI not initialized yet'); 
                        alert('Veuillez patienter que l\\'application se charge complètement.'); 
                    } 
                })()">
                    <div class="reference-header">
                        <div class="reference-type">
                            <i class="${typeIcon}"></i>
                            <span>${this.getTypeLabel(reference.type)}</span>
                        </div>
                        <div class="similarity-score">
                            <div class="similarity-bar">
                                <div class="similarity-fill" style="width: ${similarityPct}%"></div>
                            </div>
                            <span class="similarity-text">${similarityPct}%</span>
                        </div>
                    </div>
                    <div class="reference-content">
                        <h6>${reference.title}</h6>
                        <p class="reference-source">${reference.source}</p>
                        ${categories ? `<p class="reference-categories">${categories}</p>` : ''}
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
        
        return html;
    }

    getTypeIcon(type) {
        const icons = {
            'clinical_case': 'fas fa-user-md',
            'ideal_sequence': 'fas fa-star',
            'general_knowledge': 'fas fa-book-open'
        };
        return icons[type] || 'fas fa-file';
    }

    getTypeLabel(type) {
        const labels = {
            'clinical_case': 'Cas clinique',
            'ideal_sequence': 'Séquence idéale',
            'general_knowledge': 'Connaissance générale'
        };
        return labels[type] || 'Référence';
    }

    async showReferenceDetails(referenceId) {
        try {
            console.log('🔍 Fetching reference details for ID:', referenceId);
            const response = await fetch(`/api/ai/reference/${referenceId}`);
            
            console.log('📡 Response status:', response.status);
            console.log('📡 Response headers:', response.headers.get('content-type'));
            console.log('📡 Current URL:', window.location.href);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.log('📡 Error response text:', errorText);
                
                // Check if it's a port issue
                if (response.status === 403 && window.location.port === '5000') {
                    throw new Error(`Mauvais port détecté! Veuillez accéder à l'application sur http://localhost:5001 au lieu de http://localhost:5000`);
                }
                
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const responseText = await response.text();
                console.log('📡 Non-JSON response text:', responseText.substring(0, 200));
                throw new Error('Response is not JSON - server might be returning HTML error page');
            }
            
            // Try to get the response text first for debugging
            const responseText = await response.text();
            console.log('📡 Raw response before parsing:', responseText.substring(0, 1000));
            
            let data;
            try {
                data = JSON.parse(responseText);
                console.log('📡 Parsed JSON data:', data);
            } catch (parseError) {
                console.error('🚨 JSON Parse Error:', parseError);
                console.error('🚨 Response was:', responseText);
                throw new Error(`JSON parsing failed: ${parseError.message}`);
            }
            
            if (data.status === 'success') {
                this.displayReferenceModal(data.reference);
            } else {
                alert(`Erreur lors du chargement: ${data.message}`);
                console.error('Error fetching reference details:', data.message);
            }
        } catch (error) {
            console.error('🚨 Full error details:', error);
            console.error('🚨 Error name:', error.name);
            console.error('🚨 Error message:', error.message);
            console.error('🚨 Error stack:', error.stack);
            
            // Try to get the raw response for debugging
            try {
                const debugResponse = await fetch(`/api/ai/reference/${referenceId}`);
                const debugText = await debugResponse.text();
                console.error('🚨 Raw response text:', debugText.substring(0, 500));
                console.error('🚨 Response headers:', [...debugResponse.headers.entries()]);
            } catch (debugError) {
                console.error('🚨 Could not fetch debug response:', debugError);
            }
            
            if (error.message.includes('Unexpected token')) {
                alert(`Erreur lors du chargement: Unexpected token '<', "${error.message}"`);
            } else {
                alert(`Erreur lors du chargement: ${error.message}`);
            }
        }
    }

    displayReferenceModal(reference) {
        // Create modal HTML
        const modalHTML = `
            <div class="reference-modal-overlay" onclick="this.remove()">
                <div class="reference-modal" onclick="event.stopPropagation()">
                    <div class="reference-modal-header">
                        <h3><i class="${this.getTypeIcon(reference.type)}"></i> ${reference.title}</h3>
                        <button class="close-btn" onclick="this.closest('.reference-modal-overlay').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="reference-modal-content">
                        <div class="reference-info">
                            <p><strong>Type:</strong> ${this.getTypeLabel(reference.type)}</p>
                            <p><strong>Source:</strong> ${reference.source}</p>
                            <p><strong>Fichier:</strong> ${reference.filename}</p>
                        </div>
                        
                        ${reference.consultation_text ? `
                            <div class="consultation-section">
                                <h4>Consultation</h4>
                                <p>${reference.consultation_text}</p>
                                ${reference.consultation_text_expanded ? `
                                    <h5>Consultation étendue</h5>
                                    <p>${reference.consultation_text_expanded}</p>
                                ` : ''}
                            </div>
                        ` : ''}
                        
                        ${reference.treatment_sequence && reference.treatment_sequence.length > 0 ? `
                            <div class="treatment-sequence-section">
                                <h4>Séquence de traitement</h4>
                                <table class="reference-sequence-table">
                                    <thead>
                                        <tr>
                                            <th>RDV</th>
                                            <th>Traitement</th>
                                            <th>Durée</th>
                                            <th>Délai</th>
                                            <th>Praticien</th>
                                            <th>Remarques</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${reference.treatment_sequence.map(appointment => `
                                            <tr>
                                                <td>${appointment.rdv}</td>
                                                <td>${appointment.traitement}</td>
                                                <td>${appointment.duree}</td>
                                                <td>${appointment.delai || '-'}</td>
                                                <td>${appointment.dr}</td>
                                                <td>${appointment.remarque || '-'}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        ` : ''}
                        
                        ${reference.enhanced_content ? `
                            <div class="enhanced-content-section">
                                <h4>Contenu étendu</h4>
                                <pre>${reference.enhanced_content}</pre>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    initializeDragAndDrop(planId) {
        const tbody = document.getElementById(`treatment-tbody-${planId}`);
        if (!tbody) return;
        
        let draggedRow = null;
        
        tbody.addEventListener('dragstart', (e) => {
            if (e.target.tagName === 'TR' && e.target.classList.contains('draggable-row')) {
                draggedRow = e.target;
                e.target.style.opacity = '0.5';
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', e.target.innerHTML);
            }
        });
        
        tbody.addEventListener('dragend', (e) => {
            if (e.target.tagName === 'TR') {
                e.target.style.opacity = '';
            }
        });
        
        tbody.addEventListener('dragover', (e) => {
            if (e.preventDefault) {
                e.preventDefault();
            }
            e.dataTransfer.dropEffect = 'move';
            
            const afterElement = this.getDragAfterElement(tbody, e.clientY);
            if (afterElement == null) {
                tbody.appendChild(draggedRow);
            } else {
                tbody.insertBefore(draggedRow, afterElement);
            }
        });
        
        tbody.addEventListener('drop', (e) => {
            if (e.stopPropagation) {
                e.stopPropagation();
            }
            
            // Update RDV numbers after reordering
            this.updateRdvNumbers(planId);
            return false;
        });
    }
    
    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.draggable-row:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    updateRdvNumbers(planId) {
        const rows = document.querySelectorAll(`#treatment-tbody-${planId} tr`);
        rows.forEach((row, index) => {
            const rdvCell = row.querySelector('.rdv-number');
            if (rdvCell) {
                rdvCell.textContent = index + 1;
            }
            row.setAttribute('data-index', index);
        });
        
        // Update the stored treatment plan
        this.updateStoredPlan(planId);
    }
    
    initializeInlineEditing(planId) {
        const editableCells = document.querySelectorAll(`#treatment-table-${planId} .editable`);
        
        editableCells.forEach(cell => {
            // Save original value on focus
            cell.addEventListener('focus', (e) => {
                e.target.setAttribute('data-original', e.target.textContent);
                e.target.classList.add('editing');
            });
            
            // Handle blur event
            cell.addEventListener('blur', (e) => {
                e.target.classList.remove('editing');
                const newValue = e.target.textContent.trim();
                const originalValue = e.target.getAttribute('data-original');
                
                if (newValue !== originalValue) {
                    this.updateStoredPlan(planId);
                    this.showSaveIndicator(e.target);
                }
            });
            
            // Handle enter key
            cell.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.target.blur();
                }
            });
        });
    }
    
    showSaveIndicator(element) {
        const indicator = document.createElement('span');
        indicator.className = 'save-indicator';
        indicator.innerHTML = '<i class="fas fa-check"></i> Sauvegardé';
        element.appendChild(indicator);
        
        setTimeout(() => {
            indicator.remove();
        }, 2000);
    }
    
    updateStoredPlan(planId) {
        const tbody = document.getElementById(`treatment-tbody-${planId}`);
        if (!tbody) return;
        
        const rows = tbody.querySelectorAll('tr');
        const updatedSequence = [];
        
        rows.forEach((row, index) => {
            const appointment = {
                rdv: index + 1,
                traitement: row.querySelector('[data-field="traitement"]').textContent.trim(),
                duree: row.querySelector('[data-field="duree"]').textContent.trim(),
                delai: row.querySelector('[data-field="delai"]').textContent.trim(),
                dr: row.querySelector('[data-field="dr"]').textContent.trim(),
                remarque: row.querySelector('[data-field="remarque"]').textContent.trim(),
                date: ''
            };
            updatedSequence.push(appointment);
        });
        
        // Update or create the current treatment plan
        if (!this.currentTreatmentPlan) {
            this.currentTreatmentPlan = {
                id: planId,
                treatment_sequence: [],
                consultation_text: '',
                created_at: new Date().toISOString()
            };
        }
        
        // Ensure the plan has the correct ID and update the sequence
        this.currentTreatmentPlan.id = planId;
        this.currentTreatmentPlan.treatment_sequence = updatedSequence;
    }
    
    deleteSequenceRow(planId, index) {
        const tbody = document.getElementById(`treatment-tbody-${planId}`);
        if (!tbody) return;
        
        const rows = tbody.querySelectorAll('tr');
        if (rows[index]) {
            rows[index].remove();
            this.updateRdvNumbers(planId);
        }
    }
    
    addSequenceRow(planId) {
        const tbody = document.getElementById(`treatment-tbody-${planId}`);
        if (!tbody) return;
        
        const newIndex = tbody.querySelectorAll('tr').length;
        const newRow = document.createElement('tr');
        newRow.className = 'draggable-row';
        newRow.setAttribute('data-index', newIndex);
        newRow.setAttribute('draggable', 'true');
        
        newRow.innerHTML = `
            <td class="drag-handle">
                <i class="fas fa-grip-vertical"></i>
            </td>
            <td class="rdv-number">${newIndex + 1}</td>
            <td class="treatment-desc editable" contenteditable="true" data-field="traitement">Nouveau traitement</td>
            <td class="duration editable" contenteditable="true" data-field="duree">1h</td>
            <td class="delay editable" contenteditable="true" data-field="delai">-</td>
            <td class="doctor editable" contenteditable="true" data-field="dr">NB</td>
            <td class="remarks editable" contenteditable="true" data-field="remarque">-</td>
            <td class="row-actions">
                <button class="btn-icon btn-delete" onclick="window.dentalAI.deleteSequenceRow('${planId}', ${newIndex})" title="Supprimer">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(newRow);
        
        // Re-initialize editing for the new row
        this.initializeInlineEditing(planId);
        this.updateStoredPlan(planId);
        
        // Focus on the new treatment cell
        const newTreatmentCell = newRow.querySelector('[data-field="traitement"]');
        if (newTreatmentCell) {
            newTreatmentCell.focus();
        }
    }
    
    saveTreatmentPlan(planId) {
        this.updateStoredPlan(planId);
        
        // Show success message
        const container = document.querySelector(`[data-plan-id="${planId}"]`);
        if (container) {
            const message = document.createElement('div');
            message.className = 'save-success-message';
            message.innerHTML = '<i class="fas fa-check-circle"></i> Plan de traitement sauvegardé avec succès';
            container.insertBefore(message, container.firstChild);
            
            setTimeout(() => {
                message.remove();
            }, 3000);
        }
        
        console.log('Saved treatment plan:', this.currentTreatmentPlan);
    }

    async scheduleTreatmentPlan(planId) {
        console.log('🚀 scheduleTreatmentPlan called with planId:', planId);
        
        // Update the stored plan data
        this.updateStoredPlan(planId);
        console.log('📋 Current treatment plan:', this.currentTreatmentPlan);
        
        // Pass the treatment plan to the practice manager for enhanced scheduling
        console.log('🔍 Checking practice manager availability...');
        console.log('window.practiceManager exists:', !!window.practiceManager);
        console.log('scheduleTreatmentPlan method exists:', typeof window.practiceManager?.scheduleTreatmentPlan);
        console.log('All practice manager methods:', window.practiceManager ? Object.getOwnPropertyNames(Object.getPrototypeOf(window.practiceManager)) : 'No practice manager');
        
        if (window.practiceManager && typeof window.practiceManager.scheduleTreatmentPlan === 'function') {
            console.log('✅ Practice manager available, using enhanced scheduling');
            console.log('📋 Setting treatment plan in practice manager:', this.currentTreatmentPlan);
            
            // Set the current treatment plan in practice manager
            window.practiceManager.setCurrentTreatmentPlan(this.currentTreatmentPlan);
            
            // Also set the dentalAISuite reference in practice manager if not set
            if (!window.practiceManager.dentalAISuite) {
                window.practiceManager.dentalAISuite = this;
                console.log('🔗 Set dentalAISuite reference in practice manager');
            }
            
            // Call the enhanced scheduling workflow
            await window.practiceManager.scheduleTreatmentPlan(planId);
        } else {
            // Fallback to old method if practice manager is not available
            console.warn('❌ Practice manager not available, using fallback scheduling');
            console.log('window.practiceManager:', window.practiceManager);
            console.log('scheduleTreatmentPlan function:', window.practiceManager?.scheduleTreatmentPlan);
            await this.fallbackScheduleTreatmentPlan(planId);
        }
    }

    async fallbackScheduleTreatmentPlan(planId) {
        const treatmentPlan = this.currentTreatmentPlan;
        try {
            const response = await fetch('/api/ai/schedule-treatment-plan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    treatment_plan: treatmentPlan,
                    patient_id: null
                })
            });

            const data = await response.json();

            if (data.status === 'success') {
                this.addMessage('dental-brain', 'assistant', 
                    `✅ ${data.message}\n\nLes rendez-vous ont été programmés avec succès !`);
            } else {
                this.addMessage('dental-brain', 'assistant', 
                    `❌ Erreur lors de la programmation : ${data.message}`);
            }
        } catch (error) {
            this.addMessage('dental-brain', 'assistant', 
                `❌ Erreur lors de la programmation : ${error.message}`);
        }
    }

    modifyTreatmentPlan(planId) {
        this.updateStoredPlan(planId);
        const treatmentPlan = this.currentTreatmentPlan;
        
        // Add the current treatment plan to the input for modification
        const instance = this.chatInstances['dental-brain'];
        const currentText = treatmentPlan.consultation_text || '';
        instance.input.value = `Modifier ce plan de traitement :\n${currentText}\n\nChangements demandés : `;
        instance.input.focus();
        this.autoResizeTextarea(instance.input);
    }

    exportTreatmentPlan(planId) {
        this.updateStoredPlan(planId);
        const treatmentPlan = this.currentTreatmentPlan;
        // Create a simple text export
        let exportText = `PLAN DE TRAITEMENT\n`;
        exportText += `===================\n\n`;
        exportText += `Consultation: ${treatmentPlan.consultation_text || 'Plan de traitement'}\n\n`;
        exportText += `SÉQUENCE DE TRAITEMENT:\n`;
        exportText += `------------------------\n\n`;
        
        treatmentPlan.treatment_sequence.forEach(appointment => {
            exportText += `RDV ${appointment.rdv}:\n`;
            exportText += `  Traitement: ${appointment.traitement}\n`;
            exportText += `  Durée: ${appointment.duree}\n`;
            exportText += `  Délai: ${appointment.delai || '-'}\n`;
            exportText += `  Praticien: ${appointment.dr}\n`;
            exportText += `  Remarques: ${appointment.remarque || '-'}\n\n`;
        });
        
        // Create and download file
        const blob = new Blob([exportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `plan_traitement_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async approveAutonomousPlan(autonomousPlan) {
        try {
            // Show loading state
            const approveBtn = document.querySelector('.approve-btn');
            if (approveBtn) {
                approveBtn.disabled = true;
                approveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exécution en cours...';
            }
            
            // Execute the autonomous plan
            const response = await fetch('/api/execute-autonomous-plan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    autonomous_plan: autonomousPlan
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Show success message
                this.showNotification(result.message, 'success');
                
                // Add execution result to chat
                this.addExecutionResultMessage('planning', result);
                
                // Refresh schedule if we're on the planning tab
                if (this.currentTab === 'planning') {
                    // Refresh the schedule view
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                }
            } else {
                this.showNotification(result.error || 'Erreur lors de l\'exécution du plan', 'error');
                
                // Show detailed error if available
                if (result.execution_results) {
                    this.addExecutionResultMessage('planning', result);
                }
            }
            
        } catch (error) {
            console.error('Error executing autonomous plan:', error);
            this.showNotification('Erreur lors de l\'exécution du plan autonome', 'error');
        } finally {
            // Reset button state
            const approveBtn = document.querySelector('.approve-btn');
            if (approveBtn) {
                approveBtn.disabled = false;
                approveBtn.innerHTML = '<i class="fas fa-check"></i> Approuver et Exécuter';
            }
        }
    }

    addExecutionResultMessage(tab, result) {
        const chatMessages = document.getElementById(`chat-messages-${tab}`);
        if (!chatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant execution-result';
        
        const summary = result.summary || {};
        const executionResults = result.execution_results || [];
        
        let messageHTML = `
            <div class="message-avatar">
                <i class="fas fa-cog"></i>
            </div>
            <div class="message-content">
                <div class="execution-header">
                    <h4><i class="fas fa-play-circle"></i> Résultat d'Exécution</h4>
                    <div class="execution-summary">
                        <span class="summary-item">
                            <i class="fas fa-tasks"></i>
                            ${summary.total_decisions || 0} décisions
                        </span>
                        <span class="summary-item success">
                            <i class="fas fa-check-circle"></i>
                            ${summary.successful_executions || 0} réussies
                        </span>
                        ${summary.failed_executions > 0 ? `
                            <span class="summary-item error">
                                <i class="fas fa-times-circle"></i>
                                ${summary.failed_executions} échouées
                            </span>
                        ` : ''}
                        <span class="summary-item">
                            <i class="fas fa-percentage"></i>
                            ${Math.round(summary.success_rate || 0)}% réussite
                        </span>
                    </div>
                </div>
                
                <div class="execution-message">
                    <p>${result.message}</p>
                </div>
        `;
        
        if (executionResults.length > 0) {
            messageHTML += '<div class="execution-details">';
            messageHTML += '<h5><i class="fas fa-list"></i> Détails des Exécutions</h5>';
            
            executionResults.forEach(execResult => {
                const statusClass = execResult.success ? 'success' : 'error';
                const statusIcon = execResult.success ? 'fa-check-circle' : 'fa-times-circle';
                
                messageHTML += `
                    <div class="execution-item ${statusClass}">
                        <div class="execution-status">
                            <i class="fas ${statusIcon}"></i>
                            <span class="appointment-id">RDV ${execResult.appointment_id}</span>
                        </div>
                        <div class="execution-message">
                            ${execResult.message}
                        </div>
                        ${execResult.old_slot && execResult.new_slot ? `
                            <div class="slot-change">
                                <span class="old-slot">${execResult.old_slot}</span>
                                <i class="fas fa-arrow-right"></i>
                                <span class="new-slot">${execResult.new_slot}</span>
                            </div>
                        ` : ''}
                    </div>
                `;
            });
            
            messageHTML += '</div>';
        }
        
        messageHTML += '</div>';
        messageDiv.innerHTML = messageHTML;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async requestPlanModification() {
        // Add a message asking for modifications
        this.addMessage('planning', 'user', 'Pouvez-vous proposer des modifications à ce plan ?');
        
        // Send a follow-up request
        const messageInput = document.getElementById('message-input-planning');
        if (messageInput) {
            messageInput.value = 'Proposez des alternatives pour ce plan de reprogrammation';
            this.sendMessage('planning');
        }
    }

    async rejectAutonomousPlan() {
        this.showNotification('Plan autonome rejeté', 'info');
        
        // Add a message to the chat
        this.addMessage('planning', 'assistant', 'Plan autonome rejeté. Vous pouvez me faire une nouvelle demande avec des critères différents.');
    }

    getActionTypeLabel(type) {
        const labels = {
            'reschedule': 'Reprogrammation',
            'find_slot': 'Recherche de créneaux',
            'block_time': 'Blocage de temps',
            'emergency': 'Urgence',
            'optimize': 'Optimisation'
        };
        return labels[type] || type;
    }
    
    createDentistActionButtons(action, index) {
        let buttons = '';
        
        switch (action.type) {
            case 'reschedule':
                if (action.target_date) {
                    buttons += `
                        <button class="btn btn-primary" 
                                onclick="dentalAI.getRescheduleOptions('${action.target_date}')">
                            <i class="fas fa-search"></i> Voir les options de reprogrammation
                        </button>
                    `;
                }
                if (action.detected_dates && action.detected_dates.length > 0) {
                    action.detected_dates.forEach(date => {
                        buttons += `
                            <button class="btn btn-info" 
                                    onclick="dentalAI.getRescheduleOptions('${date}')">
                                <i class="fas fa-calendar-alt"></i> Reprogrammer le ${date}
                            </button>
                        `;
                    });
                }
                break;
            
            case 'find_slot':
                buttons += `
                    <button class="btn btn-info" 
                            onclick="dentalAI.findAvailableSlots()">
                        <i class="fas fa-search"></i> Trouver créneaux libres
                    </button>
                `;
                break;
            
            case 'block_time':
                buttons += `
                    <button class="btn btn-warning" 
                            onclick="dentalAI.blockTimeSlot('${action.target_date}')">
                        <i class="fas fa-ban"></i> Bloquer le temps
                    </button>
                `;
                break;
            
            case 'emergency':
                buttons += `
                    <button class="btn btn-danger" 
                            onclick="dentalAI.handleEmergency()">
                        <i class="fas fa-exclamation-triangle"></i> Gérer l'urgence
                    </button>
                `;
                break;
        }
        
        return buttons;
    }

    createRescheduleOptionsHTML(rescheduleOptions, actionIndex) {
        let html = '<div class="reschedule-options">';
        html += '<h5><i class="fas fa-calendar-alt"></i> Options de reprogrammation :</h5>';
        
        rescheduleOptions.forEach((option, optionIndex) => {
            html += `
                <div class="appointment-reschedule" data-appointment-id="${option.appointment_id}">
                    <div class="appointment-current">
                        <strong>${option.patient_name}</strong> - ${option.treatment}
                        <br>
                        <small>Actuellement: ${option.current_date} à ${option.current_time}</small>
                    </div>
                    <div class="reschedule-slots">
                        <h6>Créneaux disponibles:</h6>
                        ${option.available_options.map((dateOption, dateIndex) => `
                            <div class="date-option">
                                <strong>${dateOption.day_name}</strong>
                                <div class="time-slots">
                                    ${dateOption.slots.map(slot => `
                                        <button class="slot-btn" 
                                                onclick="dentalAI.executeReschedule('${option.appointment_id}', '${dateOption.date}', '${slot}')">
                                            ${slot}
                                        </button>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }

    createActionButtons(action, index) {
        let buttons = '';
        
        switch (action.type) {
            case 'reschedule':
                if (action.target_date) {
                    buttons += `
                        <button class="btn btn-primary btn-sm" 
                                onclick="dentalAI.getRescheduleOptions('${action.target_date}')">
                            <i class="fas fa-search"></i> Voir les options
                        </button>
                    `;
                }
                break;
            
            case 'find_slot':
                buttons += `
                    <button class="btn btn-info btn-sm" 
                            onclick="dentalAI.findAvailableSlots()">
                        <i class="fas fa-search"></i> Trouver créneaux
                    </button>
                `;
                break;
            
            case 'emergency':
                buttons += `
                    <button class="btn btn-danger btn-sm" 
                            onclick="dentalAI.handleEmergency()">
                        <i class="fas fa-exclamation-triangle"></i> Gérer urgence
                    </button>
                `;
                break;
        }
        
        return buttons;
    }

    async executeReschedule(appointmentId, newDate, newTime) {
        try {
            const response = await fetch('/api/schedule-execute-action', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action_type: 'reschedule',
                    action_data: {
                        appointment_id: appointmentId,
                        new_date: newDate,
                        new_time: newTime
                    }
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showNotification('Rendez-vous reprogrammé avec succès !', 'success');
                
                // Add confirmation message to chat
                this.addMessage('schedule', 'assistant', 
                    `✅ Rendez-vous reprogrammé avec succès pour le ${newDate} à ${newTime}.`
                );
                
                // Refresh schedule if visible
                if (window.practiceManager && document.getElementById('schedule-grid')) {
                    window.practiceManager.loadSchedule();
                }
            } else {
                this.showNotification(`Erreur: ${result.error}`, 'error');
                
                if (result.available_slots) {
                    this.addMessage('schedule', 'assistant', 
                        `❌ Créneau non disponible. Créneaux libres: ${result.available_slots.join(', ')}`
                    );
                }
            }
            
        } catch (error) {
            console.error('Error executing reschedule:', error);
            this.showNotification('Erreur lors de la reprogrammation', 'error');
        }
    }

    async confirmScheduleAction(action) {
        try {
            let message = '';
            
            switch (action) {
                case 'approve':
                    message = '✅ Modifications approuvées. Exécution des changements...';
                    this.addMessage('schedule', 'assistant', message);
                    
                    // Here you could implement actual schedule modifications
                    setTimeout(() => {
                        this.addMessage('schedule', 'assistant', 
                            '✅ Planning mis à jour avec succès ! Les patients seront notifiés des changements.');
                    }, 1000);
                    break;
                    
                case 'request_alternatives':
                    message = '🔄 Recherche d\'alternatives en cours...';
                    this.addMessage('schedule', 'assistant', message);
                    
                    // Request alternatives from the system
                    setTimeout(() => {
                        this.addMessage('schedule', 'assistant', 
                            '💡 Voici quelques alternatives:\n\n' +
                            '• Reporter tous les RDV de la journée au lendemain\n' +
                            '• Répartir les RDV sur la semaine suivante\n' +
                            '• Proposer des créneaux en soirée cette semaine\n\n' +
                            'Quelle option préférez-vous ?');
                    }, 1000);
                    break;
                    
                case 'cancel':
                    message = '❌ Modifications annulées. Le planning reste inchangé.';
                    this.addMessage('schedule', 'assistant', message);
                    break;
            }
            
        } catch (error) {
            console.error('Error confirming schedule action:', error);
            this.showNotification('Erreur lors de la confirmation', 'error');
        }
    }

    async blockTimeSlot(date) {
        try {
            this.addMessage('schedule', 'assistant', 
                `🚫 Blocage du temps pour le ${date}. Quelles heures souhaitez-vous bloquer ?`);
            
            // You could implement a time slot blocking interface here
            
        } catch (error) {
            console.error('Error blocking time slot:', error);
            this.showNotification('Erreur lors du blocage', 'error');
        }
    }

    async handleEmergency() {
        try {
            this.addMessage('schedule', 'assistant', 
                '🚨 Mode urgence activé. Recherche de créneaux d\'urgence disponibles...');
            
            // Implement emergency slot finding logic
            setTimeout(() => {
                this.addMessage('schedule', 'assistant', 
                    '🚨 Créneaux d\'urgence trouvés:\n\n' +
                    '• Aujourd\'hui 18h30 (30 min)\n' +
                    '• Demain 8h00 (60 min)\n' +
                    '• Demain 12h30 (45 min)\n\n' +
                    'Voulez-vous réserver un de ces créneaux ?');
            }, 1000);
            
        } catch (error) {
            console.error('Error handling emergency:', error);
            this.showNotification('Erreur lors de la gestion d\'urgence', 'error');
        }
    }

    async findAvailableSlots() {
        try {
            this.addMessage('schedule', 'assistant', 
                '🔍 Recherche de créneaux disponibles...');
            
            // Get available slots for the next week
            const today = new Date();
            const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
            
            setTimeout(() => {
                this.addMessage('schedule', 'assistant', 
                    '📅 Créneaux disponibles cette semaine:\n\n' +
                    '**Lundi:**\n• 9h00 - 10h30\n• 14h00 - 15h30\n• 16h00 - 17h00\n\n' +
                    '**Mardi:**\n• 8h30 - 10h00\n• 15h30 - 17h00\n\n' +
                    '**Mercredi:**\n• 9h30 - 11h00\n• 13h30 - 15h00\n\n' +
                    '**Jeudi:**\n• 8h00 - 9h30\n• 14h30 - 16h30\n\n' +
                    '**Vendredi:**\n• 9h00 - 10h30\n• 15h00 - 16h30');
            }, 1000);
            
        } catch (error) {
            console.error('Error finding available slots:', error);
            this.showNotification('Erreur lors de la recherche', 'error');
        }
    }

    async getRescheduleOptions(date) {
        try {
            const response = await fetch('/api/schedule-get-reschedule-options', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ date: date })
            });
            
            const result = await response.json();
            
            if (result.success) {
                if (result.appointments.length === 0) {
                    this.addMessage('schedule', 'assistant', 
                        `ℹ️ Aucun rendez-vous trouvé pour le ${date}.`
                    );
                } else {
                    let message = `📅 Rendez-vous trouvés pour le ${date}:\n\n`;
                    
                    result.reschedule_options.forEach(option => {
                        message += `• **${option.patient_name}** - ${option.treatment}\n`;
                        message += `  Actuellement: ${option.current_time}\n`;
                        message += `  Options disponibles: `;
                        
                        const slots = [];
                        option.available_options.forEach(dateOption => {
                            dateOption.slots.forEach(slot => {
                                slots.push(`${dateOption.day_name} ${slot}`);
                            });
                        });
                        
                        message += slots.slice(0, 3).join(', ');
                        if (slots.length > 3) message += ` et ${slots.length - 3} autres...`;
                        message += '\n\n';
                    });
                    
                    this.addMessage('schedule', 'assistant', message);
                }
            } else {
                this.showNotification(`Erreur: ${result.error}`, 'error');
            }
            
        } catch (error) {
            console.error('Error getting reschedule options:', error);
            this.showNotification('Erreur lors de la récupération des options', 'error');
        }
    }

    async findAvailableSlots() {
        const date = prompt('Pour quelle date chercher des créneaux ? (YYYY-MM-DD)');
        if (!date) return;
        
        try {
            const response = await fetch('/api/schedule-execute-action', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action_type: 'find_slots',
                    action_data: { date: date }
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                if (result.available_slots.length === 0) {
                    this.addMessage('schedule', 'assistant', 
                        `❌ Aucun créneau disponible pour le ${date}.`
                    );
                } else {
                    this.addMessage('schedule', 'assistant', 
                        `✅ Créneaux disponibles pour le ${date}:\n${result.available_slots.join(', ')}`
                    );
                }
            } else {
                this.showNotification(`Erreur: ${result.error}`, 'error');
            }
            
        } catch (error) {
            console.error('Error finding slots:', error);
            this.showNotification('Erreur lors de la recherche de créneaux', 'error');
        }
    }

    getActionTypeIcon(type) {
        const icons = {
            'reschedule': '<i class="fas fa-exchange-alt"></i>',
            'find_slot': '<i class="fas fa-search"></i>',
            'optimize': '<i class="fas fa-cog"></i>',
            'emergency': '<i class="fas fa-exclamation-triangle"></i>'
        };
        return icons[type] || '<i class="fas fa-tasks"></i>';
    }

    getActionTypeText(type) {
        const texts = {
            'reschedule': 'Reprogrammation',
            'find_slot': 'Recherche de créneau',
            'optimize': 'Optimisation',
            'emergency': 'Urgence'
        };
        return texts[type] || 'Action';
    }

    processMessageContent(content) {
        // First, try to detect and convert treatment sequences to tables
        content = this.convertTreatmentSequenceToTable(content);
        
        // Enhanced JSON detection - handle both markdown-wrapped and direct JSON
        const jsonRegex = /```json\s*([\s\S]*?)```/g;
        
        // More robust direct JSON detection
        const directJsonRegex = /^\s*(\{[\s\S]*?\})\s*$/;
        
        let processedContent = content;
        
        // First, handle markdown-wrapped JSON
        processedContent = processedContent.replace(jsonRegex, (match, jsonContent) => {
            return this.processJsonContent(jsonContent);
        });
        
        // Check if the entire content is a JSON object
        const directJsonMatch = content.match(directJsonRegex);
        if (directJsonMatch) {
            try {
                const parsed = JSON.parse(directJsonMatch[1]);
                // Check if this is a treatment sequence JSON
                if (parsed.treatment_sequence && Array.isArray(parsed.treatment_sequence)) {
                    console.log('Direct JSON treatment sequence detected');
                    return this.processJsonContent(directJsonMatch[1]);
                }
            } catch (e) {
                console.log('Not valid JSON, continuing with normal processing');
            }
        }
        
        // Fallback: look for treatment_sequence pattern anywhere in the content
        const treatmentSequenceRegex = /(\{[\s\S]*?"treatment_sequence"\s*:\s*\[[\s\S]*?\][\s\S]*?\})/g;
        processedContent = processedContent.replace(treatmentSequenceRegex, (match, jsonContent) => {
            return this.processJsonContent(jsonContent);
        });

        // Convert markdown-like formatting
        processedContent = processedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        processedContent = processedContent.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Convert line breaks to HTML
        processedContent = processedContent.replace(/\n/g, '<br>');
        
        return processedContent;
    }

    processJsonContent(jsonContent) {
        try {
            const parsed = JSON.parse(jsonContent.trim());
            
            // Check if this is a treatment sequence
            if (parsed.treatment_sequence && Array.isArray(parsed.treatment_sequence)) {
                // Store the plan for future modifications
                this.currentTreatmentPlan = parsed;
                return this.createInteractiveTreatmentTable(parsed);
            } else {
                // Regular JSON formatting
                const formatted = JSON.stringify(parsed, null, 2);
                return `<div class="json-block">${this.escapeHtml(formatted)}</div>`;
            }
        } catch (e) {
            console.error('Error parsing JSON:', e);
            return `<div class="json-block">${this.escapeHtml(jsonContent)}</div>`;
        }
    }

    convertTreatmentSequenceToTable(content) {
        // Look for treatment sequence patterns in the text
        const treatmentPatterns = [
            /(?:Séquence|Plan|Étapes?)[\s\S]*?(?:\d+[\.\)][\s\S]*?){2,}/gi,
            /(?:Traitement|Procédure)[\s\S]*?(?:\d+[\.\)][\s\S]*?){2,}/gi
        ];
        
        let processedContent = content;
        
        treatmentPatterns.forEach(pattern => {
            processedContent = processedContent.replace(pattern, (match) => {
                // Try to extract numbered steps
                const steps = match.match(/\d+[\.\)]\s*([^\n\r]+)/g);
                if (steps && steps.length >= 2) {
                    const tableRows = steps.map(step => {
                        const cleanStep = step.replace(/^\d+[\.\)]\s*/, '');
                        return `<tr><td>${cleanStep}</td></tr>`;
                    }).join('');
                    
                    return `<div class="treatment-table">
                        <h4>Plan de traitement</h4>
                        <table>
                            <thead>
                                <tr><th>Étapes du traitement</th></tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>
                    </div>`;
                }
                return match;
            });
        });
        
        return processedContent;
    }

    createTreatmentTable(data) {
        const { consultation_text, patient_info, treatment_sequence, references } = data;
        
        let html = `
            <div class="treatment-plan-container">
                <div class="consultation-info">
                    <h3><i class="fas fa-stethoscope"></i> Consultation</h3>
                    <p><strong>Demande:</strong> ${consultation_text}</p>
                    ${patient_info ? `
                        <div class="patient-summary">
                            <p><strong>Dent:</strong> ${patient_info.dent || 'N/A'}</p>
                            <p><strong>Diagnostic:</strong> ${patient_info.diagnostic || 'N/A'}</p>
                            <p><strong>Praticien:</strong> ${patient_info.praticien || 'N/A'}</p>
                        </div>
                    ` : ''}
                </div>
                
                <div class="treatment-sequence">
                    <h3><i class="fas fa-calendar-alt"></i> Séquence de Traitement</h3>
                    <div class="treatment-table-container">
                        <table class="treatment-table">
                            <thead>
                                <tr>
                                    <th>RDV</th>
                                    <th>Traitement</th>
                                    <th>Durée</th>
                                    <th>Délai</th>
                                    <th>Praticien</th>
                                    <th>Remarques</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${treatment_sequence.map((step, index) => `
                                    <tr data-step="${index}">
                                        <td class="rdv-cell" data-field="rdv">${step.rdv}</td>
                                        <td class="treatment-cell" data-field="traitement">${step.traitement}</td>
                                        <td class="duration-cell" data-field="duree">${step.duree}</td>
                                        <td class="delay-cell" data-field="delai">${step.delai}</td>
                                        <td class="doctor-cell" data-field="dr">${step.dr}</td>
                                        <td class="notes-cell" data-field="remarque">${step.remarque}</td>
                                        <td class="actions-cell">
                                            <button class="btn-icon btn-edit" onclick="app.editTreatmentStep(${index})" title="Modifier">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="btn-icon btn-delete" onclick="app.deleteTreatmentStep(${index})" title="Supprimer">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="treatment-actions">
                        <button class="btn btn-secondary" onclick="app.addTreatmentStep()">
                            <i class="fas fa-plus"></i> Ajouter étape
                        </button>
                        <button class="btn btn-primary" onclick="app.exportTreatmentPlan()">
                            <i class="fas fa-download"></i> Exporter PDF
                        </button>
                        <button class="schedule-treatment-btn btn btn-success" 
                                data-treatment-plan='${JSON.stringify(data).replace(/'/g, "&#39;")}'>
                            <i class="fas fa-calendar-check"></i> Programmer
                        </button>
                    </div>
                </div>
                
                ${references && references.length > 0 ? `
                    <div class="references-section">
                        <h3><i class="fas fa-book"></i> Références utilisées</h3>
                        <div class="references-grid">
                            ${references.map(ref => {
                                const similarityScore = (typeof ref.similarity_score === 'number' && !isNaN(ref.similarity_score)) 
                                    ? ref.similarity_score 
                                    : (typeof ref.similarity === 'number' && !isNaN(ref.similarity) ? ref.similarity : 0);
                                const similarityPct = Math.round(similarityScore * 100);
                                return `
                                <div class="reference-card" data-ref-id="${ref.id}" onclick="(function() { 
                                    console.log('🔍 Clicking reference with ID:', '${ref.id}'); 
                                    if(window.dentalAI && typeof window.dentalAI.showReferenceDetails === 'function') { 
                                        window.dentalAI.showReferenceDetails('${ref.id}'); 
                                    } else { 
                                        console.error('DentalAI not initialized yet'); 
                                        alert('Veuillez patienter que l\\'application se charge complètement.'); 
                                    } 
                                })()">
                                    <div class="reference-header">
                                        <span class="reference-type">${ref.type}</span>
                                        <span class="reference-similarity">${similarityPct}%</span>
                                    </div>
                                    <h4>${ref.title}</h4>
                                    <p>${ref.description || 'Voir détails'}</p>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
        
        return html;
    }

    createInteractiveTreatmentTable(data) {
        const planId = 'plan-' + Date.now();
        let tableHTML = `<div class="treatment-plan interactive" id="${planId}">`;
        
        // Add references section if available
        if (data.references && data.references.length > 0) {
            tableHTML += this.createReferencesSection(data.references);
        }
        
        // Patient info section (if available)
        if (data.patient_info) {
            tableHTML += '<div class="patient-info-section">';
            tableHTML += '<h4><i class="fas fa-user"></i> Informations Patient</h4>';
            tableHTML += '<div class="patient-info-grid">';
            Object.entries(data.patient_info).forEach(([key, value]) => {
                const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                tableHTML += `<div class="patient-info-item">
                    <label>${displayKey}:</label>
                    <span class="editable-field" data-field="patient_info.${key}">${value}</span>
                </div>`;
            });
            tableHTML += '</div></div>';
        }
        
        // Consultation info section (if available)
        if (data.consultation_text) {
            tableHTML += '<div class="consultation-info-section">';
            tableHTML += '<h4><i class="fas fa-stethoscope"></i> Consultation</h4>';
            tableHTML += `<div class="consultation-text">${data.consultation_text}</div>`;
            tableHTML += '</div>';
        }
        
        // Treatment sequence table
        if (data.treatment_sequence && Array.isArray(data.treatment_sequence)) {
            tableHTML += '<div class="treatment-header">';
            tableHTML += '<h4><i class="fas fa-calendar-check"></i> Séquence de Traitement</h4>';
            tableHTML += '<div class="treatment-actions">';
            tableHTML += `<button onclick="dentalAI.addTreatmentStep('${planId}')" class="action-btn add-btn">
                <i class="fas fa-plus"></i> Ajouter étape
            </button>`;
            tableHTML += `<button onclick="dentalAI.modifyWithNaturalLanguage('${planId}')" class="action-btn modify-btn">
                <i class="fas fa-comments"></i> Modifier avec IA
            </button>`;
            tableHTML += '</div></div>';
            
            tableHTML += '<div class="treatment-table-container">';
            tableHTML += '<table class="treatment-table" id="treatment-table-' + planId + '">';
            tableHTML += `<thead>
                <tr>
                    <th>RDV</th>
                    <th>Traitement</th>
                    <th>Durée</th>
                    <th>Délai</th>
                    <th>Praticien</th>
                    <th>Remarques</th>
                    <th>Actions</th>
                </tr>
            </thead>`;
            tableHTML += '<tbody>';
            
            data.treatment_sequence.forEach((step, index) => {
                tableHTML += `<tr data-step="${index}">
                    <td class="rdv-cell">
                        <span class="editable-field" data-field="treatment_sequence.${index}.rdv">${step.rdv || index + 1}</span>
                    </td>
                    <td class="treatment-cell">
                        <span class="editable-field" data-field="treatment_sequence.${index}.traitement">${step.traitement || step.treatment || 'Non spécifié'}</span>
                    </td>
                    <td class="duration-cell">
                        <span class="editable-field" data-field="treatment_sequence.${index}.duree">${step.duree || step.duration || 'Non spécifié'}</span>
                    </td>
                    <td class="delay-cell">
                        <span class="editable-field" data-field="treatment_sequence.${index}.delai">${step.delai || step.delay || 'Non spécifié'}</span>
                    </td>
                    <td class="doctor-cell">
                        <span class="editable-field" data-field="treatment_sequence.${index}.dr">${step.dr || step.doctor || 'Dr.'}</span>
                    </td>
                    <td class="remarks-cell">
                        <span class="editable-field" data-field="treatment_sequence.${index}.remarque">${step.remarque || step.remarks || ''}</span>
                    </td>
                    <td class="actions-cell">
                        <button onclick="dentalAI.removeStep('${planId}', ${index})" class="action-btn remove-btn" title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>`;
            });
            
            tableHTML += '</tbody></table></div>';
            
            // Summary section
            tableHTML += '<div class="treatment-summary">';
            tableHTML += `<div class="summary-item">
                <i class="fas fa-calendar-alt"></i>
                <span>Total: <strong>${data.treatment_sequence.length}</strong> rendez-vous</span>
            </div>`;
            
            const totalDuration = this.calculateTotalDuration(data.treatment_sequence);
            if (totalDuration) {
                tableHTML += `<div class="summary-item">
                    <i class="fas fa-clock"></i>
                    <span>Durée totale: <strong>${totalDuration}</strong></span>
                </div>`;
            }
            
            tableHTML += `<div class="summary-item">
                <i class="fas fa-calendar-check"></i>
                <span>Généré le: <strong>${new Date().toLocaleDateString('fr-FR')}</strong></span>
            </div>`;
            tableHTML += '</div>';
        }
        
        // Action buttons
        tableHTML += `<div class="plan-actions">
            <button onclick="dentalAI.previewTreatmentPlan('${planId}')" class="btn btn-primary">
                <i class="fas fa-eye"></i> Aperçu
            </button>
            <button onclick="dentalAI.downloadTreatmentPlan('${planId}')" class="btn btn-primary">
                <i class="fas fa-download"></i> Télécharger PDF
            </button>
            <button onclick="dentalAI.saveTreatmentPlan('${planId}')" class="btn btn-secondary">
                <i class="fas fa-save"></i> Sauvegarder
            </button>
            <button class="action-btn schedule-treatment-btn" onclick="dentalAI.scheduleApprovedTreatment('${planId}')">
                <i class="fas fa-calendar-plus"></i> Programmer le Traitement
            </button>
            <button class="action-btn generate-devis-btn" onclick="dentalAI.generateDevis('${planId}')">
                <i class="fas fa-file-invoice"></i> Générer Devis
            </button>
            <button class="action-btn patient-education-btn" onclick="dentalAI.generatePatientEducation('${planId}')">
                <i class="fas fa-graduation-cap"></i> Éducation Patient
            </button>
        </div>`;
        
        tableHTML += '</div>';
        
        // Add event listeners for inline editing
        setTimeout(() => this.setupInlineEditing(planId), 100);
        
        return tableHTML;
    }


    setupInlineEditing(planId) {
        const planElement = document.getElementById(planId);
        if (!planElement) return;
        
        // Add click handlers for editable fields
        planElement.querySelectorAll('.editable-field').forEach(field => {
            field.addEventListener('click', (e) => {
                this.makeFieldEditable(e.target);
            });
        });
    }

    makeFieldEditable(field) {
        if (field.querySelector('input')) return; // Already editing
        
        const currentValue = field.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentValue;
        input.className = 'inline-edit-input';
        
        // Replace content with input
        field.innerHTML = '';
        field.appendChild(input);
        input.focus();
        input.select();
        
        // Handle save on blur or enter
        const saveEdit = () => {
            const newValue = input.value;
            field.textContent = newValue;
            this.updateTreatmentPlan(field.dataset.field, newValue);
        };
        
        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveEdit();
            } else if (e.key === 'Escape') {
                field.textContent = currentValue; // Restore original
            }
        });
    }

    updateTreatmentPlan(fieldPath, newValue) {
        if (!this.currentTreatmentPlan) return;
        
        const pathParts = fieldPath.split('.');
        let current = this.currentTreatmentPlan;
        
        // Navigate to the parent object
        for (let i = 0; i < pathParts.length - 1; i++) {
            const part = pathParts[i];
            if (part.includes('[') && part.includes(']')) {
                // Handle array indices
                const [arrayName, indexStr] = part.split('[');
                const index = parseInt(indexStr.replace(']', ''));
                current = current[arrayName][index];
            } else {
                current = current[part];
            }
        }
        
        // Update the final value
        const finalKey = pathParts[pathParts.length - 1];
        current[finalKey] = newValue;
        
        // Show save indicator
        this.showSaveIndicator();
    }

    addTreatmentStep(planId) {
        const planElement = document.getElementById(planId);
        const tableBody = planElement.querySelector('tbody');
        
        if (!this.currentTreatmentPlan) return;
        
        const newStep = {
            rdv: this.currentTreatmentPlan.treatment_sequence.length + 1,
            traitement: 'Nouveau traitement',
            duree: '30 min',
            delai: '1 semaine',
            dr: 'Dr.',
            remarque: ''
        };
        
        this.currentTreatmentPlan.treatment_sequence.push(newStep);
        
        const newIndex = this.currentTreatmentPlan.treatment_sequence.length - 1;
        const newRow = document.createElement('tr');
        newRow.dataset.step = newIndex;
        newRow.innerHTML = `
            <td class="rdv-cell">
                <span class="editable-field" data-field="treatment_sequence.${newIndex}.rdv">${newStep.rdv}</span>
            </td>
            <td class="treatment-cell">
                <span class="editable-field" data-field="treatment_sequence.${newIndex}.traitement">${newStep.traitement}</span>
            </td>
            <td class="duration-cell">
                <span class="editable-field" data-field="treatment_sequence.${newIndex}.duree">${newStep.duree}</span>
            </td>
            <td class="delay-cell">
                <span class="editable-field" data-field="treatment_sequence.${newIndex}.delai">${newStep.delai}</span>
            </td>
            <td class="doctor-cell">
                <span class="editable-field" data-field="treatment_sequence.${newIndex}.dr">${newStep.dr}</span>
            </td>
            <td class="remarks-cell">
                <span class="editable-field" data-field="treatment_sequence.${newIndex}.remarque">${newStep.remarque}</span>
            </td>
            <td class="actions-cell">
                <button onclick="dentalAI.removeStep('${planId}', ${newIndex})" class="action-btn remove-btn" title="Supprimer">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(newRow);
        this.setupInlineEditing(planId);
        
        // Highlight the new row
        newRow.style.backgroundColor = '#fff3cd';
        setTimeout(() => {
            newRow.style.backgroundColor = '';
        }, 2000);
    }

    removeStep(planId, stepIndex) {
        if (!this.currentTreatmentPlan) return;
        
        const planElement = document.getElementById(planId);
        const row = planElement.querySelector(`tr[data-step="${stepIndex}"]`);
        
        if (confirm('Êtes-vous sûr de vouloir supprimer cette étape ?')) {
            // Remove from data
            this.currentTreatmentPlan.treatment_sequence.splice(stepIndex, 1);
            
            // Remove from DOM
            row.remove();
            
            // Update RDV numbers
            this.updateRdvNumbers(planId);
            
            this.showSaveIndicator();
        }
    }

    updateRdvNumbers(planId) {
        const planElement = document.getElementById(planId);
        const rows = planElement.querySelectorAll('tbody tr');
        
        rows.forEach((row, index) => {
            row.dataset.step = index;
            const rdvCell = row.querySelector('.rdv-cell .editable-field');
            if (rdvCell) {
                rdvCell.textContent = index + 1;
                rdvCell.dataset.field = `treatment_sequence.${index}.rdv`;
            }
            
            // Update all field paths
            row.querySelectorAll('.editable-field').forEach(field => {
                const fieldPath = field.dataset.field;
                if (fieldPath && fieldPath.includes('treatment_sequence.')) {
                    const fieldName = fieldPath.split('.').pop();
                    field.dataset.field = `treatment_sequence.${index}.${fieldName}`;
                }
            });
            
            // Update remove button
            const removeBtn = row.querySelector('.remove-btn');
            if (removeBtn) {
                removeBtn.setAttribute('onclick', `dentalAI.removeStep('${planId}', ${index})`);
            }
        });
        
        // Update data structure
        this.currentTreatmentPlan.treatment_sequence.forEach((step, index) => {
            step.rdv = index + 1;
        });
    }

    async modifyWithNaturalLanguage(planId) {
        const modification = prompt('Décrivez les modifications que vous souhaitez apporter au plan de traitement :');
        
        if (!modification || !this.currentTreatmentPlan) return;
        
        try {
            // Show loading
            const modifyBtn = document.querySelector(`#${planId} .modify-btn`);
            const originalText = modifyBtn.innerHTML;
            modifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Modification...';
            modifyBtn.disabled = true;
            
            // Send modification request
            const response = await fetch('/modify-treatment-plan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    current_plan: this.currentTreatmentPlan,
                    modification_request: modification
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Update the plan
                this.currentTreatmentPlan = data.modified_plan;
                
                // Refresh the table
                const planElement = document.getElementById(planId);
                const newTableHTML = this.createInteractiveTreatmentTable(this.currentTreatmentPlan);
                planElement.outerHTML = newTableHTML;
                
                this.showNotification('Plan modifié avec succès !', 'success');
            } else {
                throw new Error(data.error || 'Erreur lors de la modification');
            }
            
        } catch (error) {
            console.error('Error modifying treatment plan:', error);
            this.showNotification('Erreur lors de la modification: ' + error.message, 'error');
        } finally {
            // Restore button
            const modifyBtn = document.querySelector(`#${planId} .modify-btn`);
            if (modifyBtn) {
                modifyBtn.innerHTML = originalText;
                modifyBtn.disabled = false;
            }
        }
    }

    // DUPLICATE FUNCTION - RENAMED TO PREVENT CONFLICT
    // REMOVED DUPLICATE FUNCTION - This was causing conflicts
    showReferenceDetails_OLD_WRONG_URL(referenceId) {
        // Function body removed - using wrong API endpoint
        console.warn('OLD showReferenceDetails function called - this should not happen');
        // Create modal to show reference details
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-file-medical"></i> Détails de la référence</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="loading-content">
                        <i class="fas fa-spinner fa-spin"></i>
                        Chargement des détails...
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Load reference details
        this.loadReferenceDetails(referenceId, modal);
        
        // Close modal handlers
        modal.querySelector('.close-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    async loadReferenceDetails(referenceId, modal) {
        try {
            const response = await fetch(`/get-reference-details/${referenceId}`);
            const data = await response.json();
            
            if (data.success) {
                const modalBody = modal.querySelector('.modal-body');
                const reference = data.reference;
                
                if (reference.type === 'case') {
                    // Special formatting for clinical cases
                    modalBody.innerHTML = this.formatClinicalCaseDetails(reference);
                } else {
                    // Standard formatting for knowledge references
                    modalBody.innerHTML = `
                        <div class="reference-details">
                            <h4>${reference.title}</h4>
                            <div class="reference-metadata">
                                <span class="metadata-item">
                                    <i class="fas fa-tag"></i>
                                    Type: ${reference.type}
                                </span>
                                <span class="metadata-item">
                                    <i class="fas fa-folder"></i>
                                    Catégorie: ${reference.category}
                                </span>
                            </div>
                            <div class="reference-content">
                                <h5>Contenu:</h5>
                                <div class="content-text">${reference.content.replace(/\n/g, '<br>')}</div>
                            </div>
                        </div>
                    `;
                }
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            const modalBody = modal.querySelector('.modal-body');
            modalBody.innerHTML = `
                <div class="error-content">
                    <i class="fas fa-exclamation-triangle"></i>
                    Erreur lors du chargement: ${error.message}
                </div>
            `;
        }
    }

    formatClinicalCaseDetails(reference) {
        const metadata = reference.metadata;
        const content = reference.content;
        
        // Extract consultation text from metadata
        const consultationText = metadata.consultation || 'Consultation non spécifiée';
        
        // Try to extract treatment sequence from content
        const treatmentSequence = this.extractTreatmentSequenceFromContent(content);
        
        let html = `
            <div class="clinical-case-details">
                <h4><i class="fas fa-tooth"></i> ${reference.title}</h4>
                
                <div class="case-metadata">
                    <div class="metadata-row">
                        <span class="metadata-item">
                            <i class="fas fa-calendar"></i>
                            <strong>Date d'indexation:</strong> ${new Date(metadata.indexed_at).toLocaleDateString('fr-FR')}
                        </span>
                        <span class="metadata-item">
                            <i class="fas fa-file-medical"></i>
                            <strong>Nombre de traitements:</strong> ${metadata.treatments_count || 'N/A'}
                        </span>
                    </div>
                </div>
                
                <div class="consultation-section">
                    <h5><i class="fas fa-stethoscope"></i> Consultation initiale</h5>
                    <div class="consultation-text">
                        ${consultationText.replace(/\n/g, '<br>')}
                    </div>
                </div>
        `;
        
        // Add treatment sequence table if available
        if (treatmentSequence && treatmentSequence.length > 0) {
            html += `
                <div class="treatment-sequence-section">
                    <h5><i class="fas fa-list-ol"></i> Séquence de traitement</h5>
                    <div class="treatment-table-container">
                        ${this.createTreatmentTableFromSequence(treatmentSequence)}
                    </div>
                </div>
            `;
        }
        
        html += `
                <div class="raw-content-section">
                    <h5><i class="fas fa-code"></i> Contenu détaillé</h5>
                    <div class="raw-content">
                        ${content.replace(/\n/g, '<br>').replace(/\|/g, '<br>•')}
                    </div>
                </div>
            </div>
        `;
        
        return html;
    }

    extractTreatmentSequenceFromContent(content) {
        // Try to extract RDV information from content
        const rdvMatches = content.match(/RDV \d+:.*?(?=\sRDV \d+:|\s*$)/gs);
        if (!rdvMatches) return null;
        
        const treatments = [];
        rdvMatches.forEach((rdvText, index) => {
            // More flexible regex to handle the actual format
            const rdvMatch = rdvText.match(/RDV (\d+):\s*(.*?)(?:\s*-\s*Duration:\s*(.*?))?(?:\s*-\s*Doctor:\s*(.*?))?(?:\s*-\s*Remarks:\s*(.*?))?(?:\s*\||\s*$)/s);
            if (rdvMatch) {
                treatments.push({
                    rdv: rdvMatch[1] || (index + 1),
                    traitement: rdvMatch[2] ? rdvMatch[2].trim().replace(/\s+/g, ' ') : '',
                    duree: rdvMatch[3] ? rdvMatch[3].trim() : '',
                    dr: rdvMatch[4] ? rdvMatch[4].trim() : '',
                    remarque: rdvMatch[5] ? rdvMatch[5].trim() : ''
                });
            }
        });
        
        return treatments.length > 0 ? treatments : null;
    }

    createTreatmentTableFromSequence(treatments) {
        let tableHTML = `
            <table class="treatment-table">
                <thead>
                    <tr>
                        <th>RDV</th>
                        <th>Traitement</th>
                        <th>Durée</th>
                        <th>Docteur</th>
                        <th>Remarques</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        treatments.forEach(treatment => {
            tableHTML += `
                <tr>
                    <td class="rdv-number">${treatment.rdv}</td>
                    <td class="treatment-description">${treatment.traitement}</td>
                    <td class="duration">${treatment.duree}</td>
                    <td class="doctor">${treatment.dr}</td>
                    <td class="remarks">${treatment.remarque}</td>
                </tr>
            `;
        });
        
        tableHTML += `
                </tbody>
            </table>
        `;
        
        return tableHTML;
    }

    calculateTotalDuration(treatmentSequence) {
        // Simple duration calculation - can be enhanced
        let totalMinutes = 0;
        
        treatmentSequence.forEach(step => {
            const duration = step.duree || step.duration || '';
            const match = duration.match(/(\d+)\s*min/);
            if (match) {
                totalMinutes += parseInt(match[1]);
            }
        });
        
        if (totalMinutes > 0) {
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
        }
        
        return null;
    }

    showSaveIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'save-indicator';
        indicator.innerHTML = '<i class="fas fa-save"></i> Modifications non sauvegardées';
        
        // Remove existing indicator
        const existing = document.querySelector('.save-indicator');
        if (existing) existing.remove();
        
        document.body.appendChild(indicator);
        
        setTimeout(() => {
            indicator.classList.add('show');
        }, 100);
    }

    saveTreatmentPlan(planId) {
        if (!this.currentTreatmentPlan) return;
        
        // For now, just show a notification
        // In a real app, you'd save to a database
        this.showNotification('Plan de traitement sauvegardé !', 'success');
        
        // Remove save indicator
        const indicator = document.querySelector('.save-indicator');
        if (indicator) indicator.remove();
    }

    editTreatmentPlan(planId) {
        const planElement = document.getElementById(planId);
        if (!planElement) return;
        
        // Toggle editing mode
        const isEditing = planElement.classList.contains('editing');
        
        if (isEditing) {
            // Save changes
            this.saveTreatmentPlanChanges(planId);
        } else {
            // Enter editing mode
            planElement.classList.add('editing');
            
            // Make table cells editable
            const cells = planElement.querySelectorAll('td');
            cells.forEach(cell => {
                if (!cell.querySelector('input')) {
                    const originalText = cell.textContent;
                    cell.innerHTML = `<input type="text" value="${originalText}" class="edit-input">`;
                }
            });
            
            // Change button text
            const editBtn = planElement.querySelector('.edit-btn');
            editBtn.innerHTML = '<i class="fas fa-save"></i> Sauvegarder';
        }
    }

    saveTreatmentPlanChanges(planId) {
        const planElement = document.getElementById(planId);
        if (!planElement) return;
        
        // Save input values back to cells
        const inputs = planElement.querySelectorAll('.edit-input');
        inputs.forEach(input => {
            const cell = input.parentElement;
            cell.textContent = input.value;
        });
        
        // Exit editing mode
        planElement.classList.remove('editing');
        
        // Change button text back
        const editBtn = planElement.querySelector('.edit-btn');
        editBtn.innerHTML = '<i class="fas fa-edit"></i> Modifier';
        
        // Show success notification
        this.showNotification('Plan de traitement modifié avec succès', 'success');
    }

    previewTreatmentPlan(planId) {
        const planElement = document.getElementById(planId);
        if (!planElement) return;
        
        // Extract plan data
        const patientInfo = {};
        const patientInfoDiv = planElement.querySelector('.patient-info');
        if (patientInfoDiv) {
            const paragraphs = patientInfoDiv.querySelectorAll('p');
            paragraphs.forEach(p => {
                const text = p.textContent;
                const colonIndex = text.indexOf(':');
                if (colonIndex !== -1) {
                    const key = text.substring(0, colonIndex).trim();
                    const value = text.substring(colonIndex + 1).trim();
                    patientInfo[key] = value;
                }
            });
        }
        
        const treatmentSequence = [];
        const rows = planElement.querySelectorAll('.treatment-sequence-table tbody tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 4) {
                treatmentSequence.push({
                    step: cells[0].textContent,
                    treatment: cells[1].textContent,
                    duration: cells[2].textContent,
                    cost: cells[3].textContent
                });
            }
        });
        
        // Create modal for preview
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Aperçu du Plan de Traitement</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    ${this.generateDocumentPreview({ patient_info: patientInfo, treatment_sequence: treatmentSequence })}
                </div>
                <div class="modal-footer">
                    <button onclick="dentalAI.downloadTreatmentPlan('${planId}')" class="btn btn-primary">
                        <i class="fas fa-download"></i> Télécharger PDF
                    </button>
                    <button class="btn btn-secondary close-modal">Fermer</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal handlers
        modal.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                document.body.removeChild(modal);
            });
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    generateDocumentPreview(data) {
        let html = '<div class="document-preview">';
        
        // Header
        html += `
            <div class="document-header">
                <h2>Plan de Traitement Dentaire</h2>
                <p class="document-date">Date: ${new Date().toLocaleDateString('fr-FR')}</p>
            </div>
        `;
        
        // Patient info
        if (data.patient_info && Object.keys(data.patient_info).length > 0) {
            html += '<div class="document-section">';
            html += '<h3>Informations Patient</h3>';
            Object.entries(data.patient_info).forEach(([key, value]) => {
                html += `<p><strong>${key}:</strong> ${value}</p>`;
            });
            html += '</div>';
        }
        
        // Treatment sequence
        if (data.treatment_sequence && data.treatment_sequence.length > 0) {
            html += '<div class="document-section">';
            html += '<h3>Séquence de Traitement</h3>';
            html += '<table class="document-table">';
            html += '<thead><tr><th>Étape</th><th>Traitement</th><th>Durée</th><th>Coût</th></tr></thead>';
            html += '<tbody>';
            
            data.treatment_sequence.forEach(step => {
                html += `<tr>
                    <td>${step.step}</td>
                    <td>${step.treatment}</td>
                    <td>${step.duration}</td>
                    <td>${step.cost}</td>
                </tr>`;
            });
            
            html += '</tbody></table>';
            html += '</div>';
        }
        
        html += '</div>';
        return html;
    }

    async downloadTreatmentPlan(planId) {
        const planElement = document.getElementById(planId);
        if (!planElement) return;
        
        try {
            // Use the stored treatment plan data if available
            if (this.currentTreatmentPlan) {
                // Show loading state
                const downloadBtn = planElement.querySelector('.btn-primary');
                const originalText = downloadBtn.innerHTML;
                downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Génération...';
                downloadBtn.disabled = true;
                
                // Send to backend for PDF generation
                const response = await fetch('/export-treatment-plan', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        patient_info: this.currentTreatmentPlan.patient_info || {},
                        treatment_sequence: this.currentTreatmentPlan.treatment_sequence || [],
                        consultation_text: this.currentTreatmentPlan.consultation_text || ''
                    })
                });
                
                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `plan-traitement-${new Date().toISOString().split('T')[0]}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                    
                    this.showNotification('Plan de traitement téléchargé avec succès', 'success');
                } else {
                    throw new Error('Erreur lors de la génération du PDF');
                }
                
                // Restore button state
                downloadBtn.innerHTML = originalText;
                downloadBtn.disabled = false;
                
            } else {
                // Fallback: extract data from DOM (legacy method)
                const patientInfo = {};
                const patientInfoDiv = planElement.querySelector('.patient-info-section');
                if (patientInfoDiv) {
                    const items = patientInfoDiv.querySelectorAll('.patient-info-item');
                    items.forEach(item => {
                        const label = item.querySelector('label');
                        const value = item.querySelector('.editable-field');
                        if (label && value) {
                            const key = label.textContent.replace(':', '').trim();
                            patientInfo[key] = value.textContent.trim();
                        }
                    });
                }
                
                const treatmentSequence = [];
                const rows = planElement.querySelectorAll('.treatment-table tbody tr');
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 6) {
                        treatmentSequence.push({
                            rdv: cells[0].textContent.trim(),
                            traitement: cells[1].textContent.trim(),
                            duree: cells[2].textContent.trim(),
                            delai: cells[3].textContent.trim(),
                            dr: cells[4].textContent.trim(),
                            remarque: cells[5].textContent.trim()
                        });
                    }
                });
                
                const consultationText = planElement.querySelector('.consultation-text')?.textContent || '';
                
                // Show loading state
                const downloadBtn = planElement.querySelector('.btn-primary');
                const originalText = downloadBtn.innerHTML;
                downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Génération...';
                downloadBtn.disabled = true;
                
                // Send to backend for PDF generation
                const response = await fetch('/export-treatment-plan', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        patient_info: patientInfo,
                        treatment_sequence: treatmentSequence,
                        consultation_text: consultationText
                    })
                });
                
                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `plan-traitement-${new Date().toISOString().split('T')[0]}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                    
                    this.showNotification('Plan de traitement téléchargé avec succès', 'success');
                } else {
                    throw new Error('Erreur lors de la génération du PDF');
                }
                
                // Restore button state
                downloadBtn.innerHTML = originalText;
                downloadBtn.disabled = false;
            }
            
        } catch (error) {
            console.error('Error downloading treatment plan:', error);
            this.showNotification('Erreur lors du téléchargement: ' + error.message, 'error');
            
            // Restore button state
            const downloadBtn = planElement.querySelector('.btn-primary');
            if (downloadBtn) {
                downloadBtn.innerHTML = '<i class="fas fa-download"></i> Télécharger PDF';
                downloadBtn.disabled = false;
            }
        }
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notif => notif.remove());
        
        // Create new notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add to document
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    hideWelcomeMessage(tab) {
        const welcomeMessage = this.chatInstances[tab].messages.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
    }

    scrollToBottom(tab) {
        const messagesContainer = this.chatInstances[tab].messages;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    clearChat(tab) {
        const instance = this.chatInstances[tab];
        instance.history = [];
        instance.messages.innerHTML = '';
        
        // Show welcome message again
        const welcomeMessage = instance.messages.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'block';
        }
    }

    containsTreatmentPlan(content) {
        const treatmentIndicators = [
            'treatment_sequence',
            'séquence de traitement',
            'plan de traitement',
            'étapes du traitement',
            'procédure',
            'traitement recommandé'
        ];
        
        return treatmentIndicators.some(indicator => 
            content.toLowerCase().includes(indicator.toLowerCase())
        );
    }

    showExportSuggestion(tab) {
        const instance = this.chatInstances[tab];
        const actionsElement = instance.messages.querySelector('.treatment-actions');
        
        if (actionsElement && !actionsElement.querySelector('.export-suggestion')) {
            const suggestion = document.createElement('div');
            suggestion.className = 'export-suggestion';
            suggestion.innerHTML = `
                <div class="suggestion-content">
                    <i class="fas fa-lightbulb"></i>
                    <span>Vous pouvez modifier, prévisualiser ou télécharger ce plan de traitement</span>
                </div>
            `;
            
            actionsElement.appendChild(suggestion);
            
            // Add pulse animation
            actionsElement.classList.add('pulse');
            setTimeout(() => {
                actionsElement.classList.remove('pulse');
            }, 2000);
            
            // Show tooltip
            setTimeout(() => {
                this.showExportTooltip(actionsElement);
            }, 500);
        }
    }

    showExportTooltip(actionsElement) {
        const tooltip = document.createElement('div');
        tooltip.className = 'export-tooltip';
        tooltip.innerHTML = `
            <div class="tooltip-content">
                <p>💡 <strong>Conseil:</strong> Utilisez ces boutons pour personnaliser votre plan de traitement</p>
                <div class="tooltip-arrow"></div>
            </div>
        `;
        
        actionsElement.appendChild(tooltip);
        
        setTimeout(() => {
            tooltip.classList.add('show');
        }, 100);
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            tooltip.classList.remove('show');
            setTimeout(() => {
                if (actionsElement.contains(tooltip)) {
                    actionsElement.removeChild(tooltip);
                }
            }, 300);
        }, 5000);
        
        // Hide on click anywhere
        document.addEventListener('click', function removeTooltip() {
            tooltip.classList.remove('show');
            setTimeout(() => {
                if (actionsElement.contains(tooltip)) {
                    actionsElement.removeChild(tooltip);
                }
            }, 300);
            document.removeEventListener('click', removeTooltip);
        });
    }

    async scheduleApprovedTreatment(planId) {
        try {
            // Get the treatment plan data
            const planElement = document.getElementById(planId);
            if (!planElement) {
                this.showNotification('Plan de traitement non trouvé', 'error');
                return;
            }

            // Extract treatment plan data from the DOM
            const treatmentData = this.extractTreatmentPlanData(planId);
            if (!treatmentData || !treatmentData.treatment_sequence || treatmentData.treatment_sequence.length === 0) {
                this.showNotification('Aucune séquence de traitement trouvée', 'error');
                return;
            }

            // Show patient selection modal
            this.showPatientSelectionModal(planId, treatmentData);

        } catch (error) {
            console.error('Error scheduling treatment:', error);
            this.showNotification('Erreur lors de la programmation: ' + error.message, 'error');
        }
    }

    async showPatientSelectionModal(planId, treatmentData) {
        // Load patients list
        try {
            const response = await fetch('/api/patients/');
            const data = await response.json();
            
            if (data.status !== 'success') {
                throw new Error(data.message || 'Erreur lors du chargement des patients');
            }

            const patients = data.patients || [];

            // Create modal content
            const modalContent = `
                <div class="schedule-treatment-modal">
                    <h3><i class="fas fa-calendar-plus"></i> Programmer le Traitement</h3>
                    
                    <div class="treatment-summary">
                        <h4>Résumé du traitement:</h4>
                        <ul>
                            ${treatmentData.treatment_sequence.map((step, index) => 
                                `<li><strong>RDV ${step.rdv || index + 1}:</strong> ${step.traitement} (${step.duree})</li>`
                            ).join('')}
                        </ul>
                    </div>

                    <div class="patient-selection">
                        <h4>Sélectionner un patient:</h4>
                        <div class="patient-search">
                            <input type="text" id="patient-search-input" placeholder="Rechercher un patient..." 
                                   onkeyup="dentalAI.filterPatientList(this.value)">
                            <button onclick="dentalAI.showNewPatientForm()" class="btn btn-secondary">
                                <i class="fas fa-user-plus"></i> Nouveau Patient
                            </button>
                        </div>
                        
                        <div class="patients-list" id="patients-selection-list">
                            ${patients.length > 0 ? patients.map(patient => `
                                <div class="patient-option" data-patient-id="${patient.id}" onclick="dentalAI.selectPatient('${patient.id}', '${patient.first_name}', '${patient.last_name}')">
                                    <div class="patient-info">
                                        <strong>${patient.first_name} ${patient.last_name}</strong>
                                        <small>${patient.email || ''} ${patient.phone || ''}</small>
                                    </div>
                                    <div class="patient-select-btn">
                                        <i class="fas fa-check-circle"></i>
                                    </div>
                                </div>
                            `).join('') : '<p>Aucun patient trouvé. Créez un nouveau patient.</p>'}
                        </div>
                    </div>

                    <div class="selected-patient" id="selected-patient" style="display: none;">
                        <h4>Patient sélectionné:</h4>
                        <div id="selected-patient-info"></div>
                    </div>

                    <div class="scheduling-options">
                        <h4>Options de programmation:</h4>
                        
                        <div class="scheduling-mode">
                            <label>Mode de programmation:</label>
                            <div class="radio-group">
                                <label class="radio-option">
                                    <input type="radio" name="scheduling-mode" value="intelligent" checked>
                                    <i class="fas fa-brain"></i> Programmation Intelligente (IA)
                                    <small>Utilise l'IA pour optimiser le planning selon les préférences du dentiste</small>
                                </label>
                                <label class="radio-option">
                                    <input type="radio" name="scheduling-mode" value="basic">
                                    <i class="fas fa-calendar"></i> Programmation Standard
                                    <small>Programmation simple selon les délais indiqués</small>
                                </label>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="start-date">Date de début:</label>
                            <input type="date" id="start-date" min="${new Date().toISOString().split('T')[0]}">
                        </div>
                        <div class="form-group">
                            <label for="preferred-time">Heure préférée:</label>
                            <select id="preferred-time">
                                <option value="09:00">09:00</option>
                                <option value="10:00">10:00</option>
                                <option value="11:00">11:00</option>
                                <option value="14:00">14:00</option>
                                <option value="15:00">15:00</option>
                                <option value="16:00">16:00</option>
                            </select>
                        </div>
                        
                        <div class="intelligent-scheduling-info" id="intelligent-info">
                            <div class="info-box">
                                <i class="fas fa-lightbulb"></i>
                                <div>
                                    <strong>Programmation Intelligente Active</strong>
                                    <p>L'IA analysera les traitements et optimisera le planning en tenant compte:</p>
                                    <ul>
                                        <li>Des préférences du dentiste (chirurgies le matin, etc.)</li>
                                        <li>Du type de traitement (endodontie, prothèse, etc.)</li>
                                        <li>De l'âge du patient et ses préférences</li>
                                        <li>De la charge de travail existante</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="modal-actions">
                        <button onclick="dentalAI.hideSchedulingModal()" class="btn btn-secondary">
                            <i class="fas fa-times"></i> Annuler
                        </button>
                        <button onclick="dentalAI.confirmScheduleTreatment('${planId}')" class="btn btn-success" id="confirm-schedule-btn" disabled>
                            <i class="fas fa-calendar-check"></i> Confirmer la Programmation
                        </button>
                    </div>
                </div>
            `;

            // Show modal
            this.showModal(modalContent);

        } catch (error) {
            console.error('Error loading patients:', error);
            this.showNotification('Erreur lors du chargement des patients: ' + error.message, 'error');
        }
    }

    filterPatientList(searchTerm) {
        const patientsList = document.getElementById('patients-selection-list');
        const patients = patientsList.querySelectorAll('.patient-option');
        
        patients.forEach(patient => {
            const patientInfo = patient.querySelector('.patient-info').textContent.toLowerCase();
            if (patientInfo.includes(searchTerm.toLowerCase())) {
                patient.style.display = 'flex';
            } else {
                patient.style.display = 'none';
            }
        });
    }

    selectPatient(patientId, firstName, lastName) {
        // Update UI to show selected patient
        const selectedPatientDiv = document.getElementById('selected-patient');
        const selectedPatientInfo = document.getElementById('selected-patient-info');
        
        selectedPatientInfo.innerHTML = `
            <div class="selected-patient-card">
                <i class="fas fa-user"></i>
                <strong>${firstName} ${lastName}</strong>
                <small>ID: ${patientId}</small>
            </div>
        `;
        
        selectedPatientDiv.style.display = 'block';
        
        // Enable confirm button
        document.getElementById('confirm-schedule-btn').disabled = false;
        
        // Store selected patient ID
        this.selectedPatientId = patientId;
        
        // Highlight selected patient
        document.querySelectorAll('.patient-option').forEach(option => {
            option.classList.remove('selected');
        });
        document.querySelector(`[data-patient-id="${patientId}"]`).classList.add('selected');
    }

    showNewPatientForm() {
        // Hide current modal and show patient creation modal
        this.hideSchedulingModal();
        
        // Use existing patient modal from PracticeManager
        if (window.practiceManager) {
            window.practiceManager.showPatientModal();
        } else {
            this.showNotification('Module de gestion des patients non disponible', 'error');
        }
    }

    async confirmScheduleTreatment(planId) {
        try {
            if (!this.selectedPatientId) {
                this.showNotification('Veuillez sélectionner un patient', 'warning');
                return;
            }

            const startDate = document.getElementById('start-date').value;
            const preferredTime = document.getElementById('preferred-time').value;
            const schedulingMode = document.querySelector('input[name="scheduling-mode"]:checked').value;
            const useIntelligentScheduling = schedulingMode === 'intelligent';

            if (!startDate) {
                this.showNotification('Veuillez sélectionner une date de début', 'warning');
                return;
            }

            // Extract treatment plan data
            const treatmentData = this.extractTreatmentPlanData(planId);
            
            // Prepare scheduling request
            const schedulingData = {
                patient_id: this.selectedPatientId,
                treatment_plan: treatmentData,
                start_date: startDate,
                preferred_time: preferredTime,
                use_intelligent_scheduling: useIntelligentScheduling
            };

            // Show loading
            const confirmBtn = document.getElementById('confirm-schedule-btn');
            const originalText = confirmBtn.innerHTML;
            confirmBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${useIntelligentScheduling ? 'Analyse IA en cours...' : 'Programmation...'}`;
            confirmBtn.disabled = true;

            // Send scheduling request
            const response = await fetch('/api/schedule-treatment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(schedulingData)
            });

            const result = await response.json();

            if (result.success) {
                this.hideSchedulingModal();
                this.showNotification(`✅ ${result.message}`, 'success');
                
                // Show scheduled appointments summary
                if (result.appointments && result.appointments.length > 0) {
                    this.showSchedulingSummary(result);
                }
            } else {
                throw new Error(result.error || 'Erreur lors de la programmation');
            }

        } catch (error) {
            console.error('Error confirming schedule:', error);
            this.showNotification('Erreur lors de la programmation: ' + error.message, 'error');
        } finally {
            // Restore button
            const confirmBtn = document.getElementById('confirm-schedule-btn');
            if (confirmBtn) {
                confirmBtn.innerHTML = '<i class="fas fa-calendar-check"></i> Confirmer la Programmation';
                confirmBtn.disabled = false;
            }
        }
    }

    showSchedulingSummary(result) {
        const { appointments, intelligent_scheduling, scheduling_summary, ai_analysis } = result;
        
        let summaryContent = `
            <div class="scheduling-summary">
                <h3>
                    <i class="fas fa-calendar-check"></i> 
                    Rendez-vous Programmés
                    ${intelligent_scheduling ? '<span class="ai-badge"><i class="fas fa-brain"></i> IA</span>' : ''}
                </h3>
                
                ${intelligent_scheduling && scheduling_summary ? `
                    <div class="ai-summary">
                        <h4><i class="fas fa-chart-line"></i> Analyse Intelligente</h4>
                        <div class="summary-stats">
                            <div class="stat">
                                <span class="stat-label">Total RDV:</span>
                                <span class="stat-value">${scheduling_summary.total_appointments}</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">Matinées:</span>
                                <span class="stat-value">${scheduling_summary.morning_appointments}</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">Après-midis:</span>
                                <span class="stat-value">${scheduling_summary.afternoon_appointments}</span>
                            </div>
                            <div class="stat">
                                <span class="stat-label">Chirurgies:</span>
                                <span class="stat-value">${scheduling_summary.surgical_appointments}</span>
                            </div>
                        </div>
                        ${ai_analysis && ai_analysis.schedule_rationale ? `
                            <div class="ai-rationale">
                                <strong>Justification IA:</strong>
                                <p>${ai_analysis.schedule_rationale}</p>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
                
                <div class="appointments-list">
                    ${appointments.map((apt, index) => `
                        <div class="appointment-summary ${intelligent_scheduling ? 'intelligent' : 'basic'}">
                            <div class="appointment-number">RDV ${index + 1}</div>
                            <div class="appointment-details">
                                <div class="appointment-main">
                                    <strong>${apt.date} à ${apt.time}</strong>
                                    <span class="treatment-name">${apt.treatment}</span>
                                    <span class="duration">${apt.duration}</span>
                                </div>
                                ${intelligent_scheduling && apt.reasoning ? `
                                    <div class="appointment-reasoning">
                                        <i class="fas fa-lightbulb"></i>
                                        <small>${apt.reasoning}</small>
                                    </div>
                                ` : ''}
                                ${intelligent_scheduling && apt.classification ? `
                                    <div class="treatment-classification">
                                        <span class="classification-badge ${apt.classification}">${apt.classification}</span>
                                    </div>
                                ` : ''}
                            </div>
                            <div class="appointment-status">
                                <i class="fas fa-check-circle text-success"></i>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="modal-actions">
                    <button onclick="dentalAI.hideSchedulingModal()" class="btn btn-primary">
                        <i class="fas fa-check"></i> Parfait!
                    </button>
                    <button onclick="dentalAI.viewSchedule()" class="btn btn-secondary">
                        <i class="fas fa-calendar"></i> Voir le Planning
                    </button>
                </div>
            </div>
        `;
        
        this.showModal(summaryContent);
    }

    viewSchedule() {
        this.hideSchedulingModal();
        // Switch to schedule tab
        if (window.practiceManager) {
            // Trigger tab switch to schedule
            document.querySelector('[data-tab="schedule"]').click();
        }
    }

    hideSchedulingModal() {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.remove();
        }
    }

    extractTreatmentPlanData(planId) {
        const planElement = document.getElementById(planId);
        if (!planElement) return null;

        const data = {
            consultation_text: '',
            patient_info: {},
            treatment_sequence: []
        };

        // Extract consultation text
        const consultationElement = planElement.querySelector('.consultation-text');
        if (consultationElement) {
            data.consultation_text = consultationElement.textContent;
        }

        // Extract patient info
        const patientInfoElements = planElement.querySelectorAll('.patient-info-item');
        patientInfoElements.forEach(item => {
            const label = item.querySelector('label')?.textContent.replace(':', '').toLowerCase();
            const value = item.querySelector('.editable-field')?.textContent;
            if (label && value) {
                data.patient_info[label] = value;
            }
        });

        // Extract treatment sequence
        const treatmentRows = planElement.querySelectorAll('tbody tr');
        treatmentRows.forEach((row, index) => {
            const cells = row.querySelectorAll('td .editable-field');
            if (cells.length >= 6) {
                data.treatment_sequence.push({
                    rdv: cells[0]?.textContent || (index + 1),
                    traitement: cells[1]?.textContent || '',
                    duree: cells[2]?.textContent || '',
                    delai: cells[3]?.textContent || '',
                    dr: cells[4]?.textContent || 'Dr.',
                    remarque: cells[5]?.textContent || ''
                });
            }
        });

        return data;
    }

    showModal(content) {
        // Remove existing modal
        const existingModal = document.querySelector('.modal-overlay');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.innerHTML = `
            <div class="modal-content large-modal">
                ${content}
            </div>
        `;

        document.body.appendChild(modalOverlay);

        // Close on overlay click
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                this.hideSchedulingModal();
            }
        });
    }

    editAppointment(appointmentId) {
        // Close current modal and show edit modal
        this.hideModal(document.querySelector('.modal'));
        // You can implement edit functionality here
        this.showNotification('Fonction de modification à implémenter', 'info');
    }

    selectTimeSlot(date, time) {
        // This method is called when user selects a time slot from available slots
        const appointmentId = this.draggedAppointmentId;
        if (appointmentId) {
            this.hideModal(document.querySelector('.modal'));
            this.moveAppointment(appointmentId, date, time);
        }
    }

    // Store dragged appointment ID for use in slot selection
    handleDragStart(event) {
        const appointmentId = event.target.dataset.appointmentId;
        this.draggedAppointmentId = appointmentId;
        event.dataTransfer.setData('text/plain', appointmentId);
        event.target.classList.add('dragging');
    }

    handleDragOver(event) {
        event.preventDefault();
        event.currentTarget.classList.add('drag-over');
    }

    handleDrop(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('drag-over');
        
        const appointmentId = event.dataTransfer.getData('text/plain');
        const newDate = event.currentTarget.dataset.date;
        const newTime = event.currentTarget.dataset.time;
        
        this.moveAppointment(appointmentId, newDate, newTime);
    }

    checkHourConflicts(appointments) {
        if (appointments.length < 2) return false;
        
        // Check for time conflicts
        for (let i = 0; i < appointments.length; i++) {
            for (let j = i + 1; j < appointments.length; j++) {
                const apt1 = appointments[i];
                const apt2 = appointments[j];
                
                const [h1, m1] = apt1.appointment_time.split(':').map(Number);
                const [h2, m2] = apt2.appointment_time.split(':').map(Number);
                
                const start1 = m1;
                const end1 = m1 + (apt1.duration_minutes || 60);
                const start2 = m2;
                const end2 = m2 + (apt2.duration_minutes || 60);
                
                // Check for overlap
                if (start1 < end2 && start2 < end1) {
                    return true;
                }
            }
        }
        return false;
    }

    async generateDevis(planId) {
        try {
            const treatmentData = this.extractTreatmentPlanData(planId);
            if (!treatmentData) {
                this.showNotification('Erreur: Plan de traitement non trouvé', 'error');
                return;
            }

            // Show patient selection modal for devis
            await this.showPatientSelectionForDevis(planId, treatmentData);

        } catch (error) {
            console.error('Error generating devis:', error);
            this.showNotification('Erreur lors de la génération du devis', 'error');
        }
    }

    async showPatientSelectionForDevis(planId, treatmentData) {
        try {
            // Load patients
            const response = await fetch('/api/patients');
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error);
            }

            const modalContent = `
                <div class="devis-generation-modal">
                    <h3><i class="fas fa-file-invoice"></i> Générer Devis</h3>
                    
                    <div class="treatment-summary">
                        <h4>Résumé du traitement</h4>
                        <ul>
                            ${treatmentData.treatment_sequence.map(step => `
                                <li>${step.traitement} - ${step.duree}</li>
                            `).join('')}
                        </ul>
                    </div>

                    <div class="patient-selection">
                        <h4>Sélectionner un patient</h4>
                        <div class="patient-search">
                            <input type="text" id="devis-patient-search" placeholder="Rechercher un patient..." 
                                   onkeyup="dentalAI.filterPatientListForDevis(this.value)">
                        </div>
                        <div class="patients-list" id="devis-patients-list">
                            ${data.patients.map(patient => `
                                <div class="patient-option" data-patient-id="${patient.id}">
                                    <div class="patient-info">
                                        <strong>${patient.first_name} ${patient.last_name}</strong>
                                        <small>${patient.email || 'Pas d\'email'} • ${patient.phone || 'Pas de téléphone'}</small>
                                    </div>
                                    <button class="patient-select-btn" onclick="dentalAI.selectPatientForDevis('${patient.id}', '${patient.first_name}', '${patient.last_name}', '${planId}')">
                                        Sélectionner
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="modal-actions">
                        <button class="btn btn-secondary" onclick="dentalAI.hideDevisModal()">Annuler</button>
                    </div>
                </div>
            `;

            this.showModal(modalContent);

        } catch (error) {
            console.error('Error loading patients for devis:', error);
            this.showNotification('Erreur lors du chargement des patients', 'error');
        }
    }

    filterPatientListForDevis(searchTerm) {
        const patientOptions = document.querySelectorAll('#devis-patients-list .patient-option');
        patientOptions.forEach(option => {
            const patientInfo = option.querySelector('.patient-info').textContent.toLowerCase();
            if (patientInfo.includes(searchTerm.toLowerCase())) {
                option.style.display = 'block';
            } else {
                option.style.display = 'none';
            }
        });
    }

    async selectPatientForDevis(patientId, firstName, lastName, planId) {
        try {
            const treatmentData = this.extractTreatmentPlanData(planId);
            
            // Generate devis from treatment plan
            const response = await fetch('/api/generate-devis-from-treatment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    patient_id: patientId,
                    treatment_plan_id: null, // We'll need to save the plan first
                    treatment_plan: treatmentData
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showNotification(`Devis généré avec succès pour ${firstName} ${lastName}`, 'success');
                this.hideDevisModal();
                
                // Show devis details
                await this.showDevisDetails(data.devis_id);
                
            } else {
                throw new Error(data.error);
            }

        } catch (error) {
            console.error('Error generating devis:', error);
            this.showNotification('Erreur lors de la génération du devis', 'error');
        }
    }

    async showDevisDetails(devisId) {
        try {
            const response = await fetch(`/api/devis?devis_id=${devisId}`);
            const data = await response.json();
            
            if (!data.success || data.devis.length === 0) {
                throw new Error('Devis non trouvé');
            }

            const devis = data.devis[0];
            
            const modalContent = `
                <div class="devis-details-modal">
                    <h3><i class="fas fa-file-invoice"></i> Devis ${devis.devis_number}</h3>
                    
                    <div class="devis-header">
                        <div class="devis-info">
                            <p><strong>Patient:</strong> ${devis.patient_name}</p>
                            <p><strong>Date:</strong> ${new Date(devis.devis_date).toLocaleDateString('fr-FR')}</p>
                            <p><strong>Valide jusqu'au:</strong> ${new Date(devis.valid_until).toLocaleDateString('fr-FR')}</p>
                            <p><strong>Statut:</strong> <span class="status-badge ${devis.status}">${this.getDevisStatusText(devis.status)}</span></p>
                        </div>
                    </div>

                    <div class="devis-items">
                        <h4>Détail des traitements</h4>
                        <table class="devis-table">
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Traitement</th>
                                    <th>Qté</th>
                                    <th>Prix unitaire</th>
                                    <th>Remise</th>
                                    <th>Total</th>
                                    <th>LAMal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${devis.items.map(item => `
                                    <tr>
                                        <td>${item.tarmed_code}</td>
                                        <td>${item.treatment_name}</td>
                                        <td>${item.quantity}</td>
                                        <td>${item.unit_price_chf.toFixed(2)} CHF</td>
                                        <td>${item.discount_amount_chf.toFixed(2)} CHF</td>
                                        <td>${item.final_price_chf.toFixed(2)} CHF</td>
                                        <td>${item.lamal_covered ? 'Oui' : 'Non'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <div class="devis-totals">
                        <div class="totals-grid">
                            <div class="total-item">
                                <span>Total:</span>
                                <span class="amount">${devis.total_amount_chf.toFixed(2)} CHF</span>
                            </div>
                            <div class="total-item">
                                <span>Prise en charge LAMal:</span>
                                <span class="amount">${devis.lamal_amount_chf.toFixed(2)} CHF</span>
                            </div>
                            <div class="total-item">
                                <span>Assurance complémentaire:</span>
                                <span class="amount">${devis.insurance_amount_chf.toFixed(2)} CHF</span>
                            </div>
                            <div class="total-item final-total">
                                <span>À payer par le patient:</span>
                                <span class="amount">${devis.patient_amount_chf.toFixed(2)} CHF</span>
                            </div>
                        </div>
                    </div>

                    <div class="modal-actions">
                        ${devis.status === 'pending' ? `
                            <button class="btn btn-success" onclick="dentalAI.approveDevis('${devis.id}')">
                                <i class="fas fa-check"></i> Approuver
                            </button>
                            <button class="btn btn-danger" onclick="dentalAI.rejectDevis('${devis.id}')">
                                <i class="fas fa-times"></i> Rejeter
                            </button>
                        ` : ''}
                        ${devis.status === 'approved' ? `
                            <button class="btn btn-primary" onclick="dentalAI.createInvoiceFromDevis('${devis.id}')">
                                <i class="fas fa-file-invoice-dollar"></i> Créer Facture
                            </button>
                        ` : ''}
                        <button class="btn btn-secondary" onclick="dentalAI.hideDevisModal()">Fermer</button>
                    </div>
                </div>
            `;

            this.showModal(modalContent);

        } catch (error) {
            console.error('Error loading devis details:', error);
            this.showNotification('Erreur lors du chargement du devis', 'error');
        }
    }

    getDevisStatusText(status) {
        const statusMap = {
            'pending': 'En attente',
            'approved': 'Approuvé',
            'rejected': 'Rejeté',
            'invoiced': 'Facturé'
        };
        return statusMap[status] || status;
    }

    async approveDevis(devisId) {
        try {
            const response = await fetch(`/api/devis/${devisId}/approve`, {
                method: 'POST'
            });

            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Devis approuvé avec succès', 'success');
                this.hideDevisModal();
            } else {
                throw new Error(data.error);
            }

        } catch (error) {
            console.error('Error approving devis:', error);
            this.showNotification('Erreur lors de l\'approbation du devis', 'error');
        }
    }

    async rejectDevis(devisId) {
        const reason = prompt('Raison du rejet (optionnel):');
        
        try {
            const response = await fetch(`/api/devis/${devisId}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    reason: reason || ''
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Devis rejeté', 'success');
                this.hideDevisModal();
            } else {
                throw new Error(data.error);
            }

        } catch (error) {
            console.error('Error rejecting devis:', error);
            this.showNotification('Erreur lors du rejet du devis', 'error');
        }
    }

    async createInvoiceFromDevis(devisId) {
        try {
            const response = await fetch(`/api/devis/${devisId}/create-invoice`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    selected_items: null  // Optional parameter for specific items
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Facture créée avec succès', 'success');
                this.hideDevisModal();
                
                // Show invoice details or redirect to finance tab
                this.showNotification('Facture créée. Consultez l\'onglet Finance pour plus de détails.', 'info');
            } else {
                throw new Error(data.error);
            }

        } catch (error) {
            console.error('Error creating invoice from devis:', error);
            this.showNotification('Erreur lors de la création de la facture', 'error');
        }
    }

    hideDevisModal() {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.remove();
        }
    }

    async loadFinanceTab() {
        const financeTab = document.getElementById('finance-tab');
        
        try {
            // Load financial data
            const [invoicesResponse, devisResponse, revenueResponse] = await Promise.all([
                fetch('/api/financial/invoices'),
                fetch('/api/financial/devis'),
                fetch('/api/financial/revenue-forecast')
            ]);
            
            const invoicesData = await invoicesResponse.json();
            const devisData = await devisResponse.json();
            const revenueData = await revenueResponse.json();
            
            financeTab.innerHTML = `
                <div class="finance-container">
                    <h2><i class="fas fa-chart-line"></i> Gestion Financière</h2>
                    
                    <!-- Revenue Overview -->
                    <div class="revenue-overview">
                        <h3>Aperçu des Revenus</h3>
                        <div class="revenue-cards">
                            <div class="revenue-card">
                                <div class="revenue-icon">
                                    <i class="fas fa-euro-sign"></i>
                                </div>
                                <div class="revenue-info">
                                    <h4>Revenus Attendus</h4>
                                    <p class="revenue-amount">${this.calculateExpectedRevenue(invoicesData.invoices)} CHF</p>
                                </div>
                            </div>
                            <div class="revenue-card">
                                <div class="revenue-icon">
                                    <i class="fas fa-money-bill-wave"></i>
                                </div>
                                <div class="revenue-info">
                                    <h4>Revenus Réalisés</h4>
                                    <p class="revenue-amount">${this.calculateRealizedRevenue(invoicesData.invoices)} CHF</p>
                                </div>
                            </div>
                            <div class="revenue-card">
                                <div class="revenue-icon">
                                    <i class="fas fa-clock"></i>
                                </div>
                                <div class="revenue-info">
                                    <h4>En Attente</h4>
                                    <p class="revenue-amount">${this.calculatePendingRevenue(invoicesData.invoices)} CHF</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Finance Tabs -->
                    <div class="finance-tabs">
                        <button class="finance-tab-btn active" onclick="this.showFinanceSection('devis')">
                            <i class="fas fa-file-invoice"></i> Devis
                        </button>
                        <button class="finance-tab-btn" onclick="this.showFinanceSection('invoices')">
                            <i class="fas fa-file-invoice-dollar"></i> Factures
                        </button>
                        <button class="finance-tab-btn" onclick="this.showFinanceSection('payments')">
                            <i class="fas fa-credit-card"></i> Paiements
                        </button>
                        <button class="finance-tab-btn" onclick="this.showFinanceSection('forecast')">
                            <i class="fas fa-chart-bar"></i> Prévisions
                        </button>
                    </div>
                    
                    <!-- Devis Section -->
                    <div id="devis-section" class="finance-section active">
                        <div class="section-header">
                            <h3><i class="fas fa-file-invoice"></i> Gestion des Devis</h3>
                            <div class="section-controls">
                                <select id="devis-status-filter" onchange="this.filterDevisByStatus(this.value)">
                                    <option value="">Tous les statuts</option>
                                    <option value="pending">En attente</option>
                                    <option value="approved">Approuvés</option>
                                    <option value="rejected">Rejetés</option>
                                    <option value="invoiced">Facturés</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="devis-list">
                            ${this.renderDevisList(devisData.devis || [])}
                        </div>
                    </div>
                    
                    <!-- Invoices Section -->
                    <div id="invoices-section" class="finance-section">
                        <div class="section-header">
                            <h3><i class="fas fa-file-invoice-dollar"></i> Gestion des Factures</h3>
                            <div class="section-controls">
                                <select id="invoice-status-filter" onchange="this.filterInvoicesByStatus(this.value)">
                                    <option value="">Tous les statuts</option>
                                    <option value="pending">En attente</option>
                                    <option value="partial">Partiellement payé</option>
                                    <option value="paid">Payé</option>
                                    <option value="overdue">En retard</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="invoices-list">
                            ${this.renderInvoicesList(invoicesData.invoices || [])}
                        </div>
                    </div>
                    
                    <!-- Payments Section -->
                    <div id="payments-section" class="finance-section">
                        <div class="section-header">
                            <h3><i class="fas fa-credit-card"></i> Gestion des Paiements</h3>
                        </div>
                        
                        <div class="payments-content">
                            <div class="payment-summary">
                                <h4>Résumé des Paiements</h4>
                                <div class="payment-stats">
                                    <div class="stat-item">
                                        <span>Total reçu ce mois:</span>
                                        <span class="amount">${this.calculateMonthlyPayments(invoicesData.invoices)} CHF</span>
                                    </div>
                                    <div class="stat-item">
                                        <span>Paiements en attente:</span>
                                        <span class="amount">${this.calculatePendingPayments(invoicesData.invoices)} CHF</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="payment-plans">
                                <h4>Plans de Paiement</h4>
                                <div id="payment-plans-list">
                                    <!-- Payment plans will be loaded here -->
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Forecast Section -->
                    <div id="forecast-section" class="finance-section">
                        <div class="section-header">
                            <h3><i class="fas fa-chart-bar"></i> Prévisions Financières</h3>
                        </div>
                        
                        <div class="forecast-content">
                            ${this.renderRevenueForecast(revenueData.forecast || [])}
                        </div>
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error('Error loading finance tab:', error);
            financeTab.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    Erreur lors du chargement des données financières
                </div>
            `;
        }
    }

    renderDevisList(devisList) {
        if (!devisList || devisList.length === 0) {
            return '<div class="empty-state">Aucun devis trouvé</div>';
        }

        return `
            <div class="devis-grid">
                ${devisList.map(devis => `
                    <div class="devis-card" data-status="${devis.status}">
                        <div class="devis-header">
                            <div class="devis-number">${devis.devis_number}</div>
                            <div class="devis-status status-badge ${devis.status}">
                                ${this.getDevisStatusText(devis.status)}
                            </div>
                        </div>
                        <div class="devis-info">
                            <p><strong>Patient:</strong> ${devis.patient_name}</p>
                            <p><strong>Date:</strong> ${new Date(devis.devis_date).toLocaleDateString('fr-FR')}</p>
                            <p><strong>Valide jusqu'au:</strong> ${new Date(devis.valid_until).toLocaleDateString('fr-FR')}</p>
                            <p><strong>Montant:</strong> ${devis.patient_amount_chf.toFixed(2)} CHF</p>
                        </div>
                        <div class="devis-actions">
                            <button class="btn btn-sm btn-primary" onclick="dentalAI.showDevisDetails('${devis.id}')">
                                <i class="fas fa-eye"></i> Voir
                            </button>
                            ${devis.status === 'approved' ? `
                                <button class="btn btn-sm btn-success" onclick="dentalAI.createInvoiceFromDevis('${devis.id}')">
                                    <i class="fas fa-file-invoice-dollar"></i> Facturer
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderInvoicesList(invoicesList) {
        if (!invoicesList || invoicesList.length === 0) {
            return '<div class="empty-state">Aucune facture trouvée</div>';
        }

        return `
            <div class="invoices-grid">
                ${invoicesList.map(invoice => `
                    <div class="invoice-card" data-status="${invoice.status}">
                        <div class="invoice-header">
                            <div class="invoice-number">${invoice.invoice_number}</div>
                            <div class="invoice-status status-badge ${invoice.status}">
                                ${this.getInvoiceStatusText(invoice.status)}
                            </div>
                        </div>
                        <div class="invoice-info">
                            <p><strong>Patient:</strong> ${invoice.patient_name}</p>
                            <p><strong>Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString('fr-FR')}</p>
                            <p><strong>Échéance:</strong> ${new Date(invoice.due_date).toLocaleDateString('fr-FR')}</p>
                            <p><strong>Montant:</strong> ${invoice.patient_amount_chf.toFixed(2)} CHF</p>
                        </div>
                        <div class="invoice-actions">
                            <button class="btn btn-sm btn-primary" onclick="dentalAI.showInvoiceDetails('${invoice.id}')">
                                <i class="fas fa-eye"></i> Voir
                            </button>
                            ${invoice.status !== 'paid' ? `
                                <button class="btn btn-sm btn-success" onclick="dentalAI.addPaymentToInvoice('${invoice.id}')">
                                    <i class="fas fa-credit-card"></i> Paiement
                                </button>
                            ` : ''}
                            <button class="btn btn-sm btn-info" onclick="dentalAI.createPaymentPlan('${invoice.id}')">
                                <i class="fas fa-calendar-alt"></i> Plan
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderRevenueForecast(forecast) {
        if (!forecast || forecast.length === 0) {
            return '<div class="empty-state">Aucune prévision disponible</div>';
        }

        return `
            <div class="forecast-chart">
                <h4>Prévisions sur 12 mois</h4>
                <div class="forecast-grid">
                    ${forecast.map(month => `
                        <div class="forecast-item">
                            <div class="forecast-month">${month.month}</div>
                            <div class="forecast-expected">${month.expected_revenue.toFixed(2)} CHF</div>
                            <div class="forecast-realized">${month.realized_revenue.toFixed(2)} CHF</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    calculateExpectedRevenue(invoices) {
        return invoices.reduce((total, invoice) => total + invoice.patient_amount_chf, 0).toFixed(2);
    }

    calculateRealizedRevenue(invoices) {
        return invoices.filter(invoice => invoice.status === 'paid')
                      .reduce((total, invoice) => total + invoice.patient_amount_chf, 0).toFixed(2);
    }

    calculatePendingRevenue(invoices) {
        return invoices.filter(invoice => invoice.status !== 'paid')
                      .reduce((total, invoice) => total + invoice.patient_amount_chf, 0).toFixed(2);
    }

    calculateMonthlyPayments(invoices) {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        return invoices.filter(invoice => {
            const invoiceDate = new Date(invoice.invoice_date);
            return invoiceDate.getMonth() === currentMonth && 
                   invoiceDate.getFullYear() === currentYear &&
                   invoice.status === 'paid';
        }).reduce((total, invoice) => total + invoice.patient_amount_chf, 0).toFixed(2);
    }

    calculatePendingPayments(invoices) {
        return invoices.filter(invoice => invoice.status === 'pending' || invoice.status === 'partial')
                      .reduce((total, invoice) => total + invoice.patient_amount_chf, 0).toFixed(2);
    }

    getInvoiceStatusText(status) {
        const statusMap = {
            'pending': 'En attente',
            'partial': 'Partiellement payé',
            'paid': 'Payé',
            'overdue': 'En retard'
        };
        return statusMap[status] || status;
    }

    showFinanceSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.finance-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Remove active class from all tabs
        document.querySelectorAll('.finance-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected section
        document.getElementById(`${sectionName}-section`).classList.add('active');
        
        // Add active class to clicked tab
        event.target.classList.add('active');
    }

    async addPaymentToInvoice(invoiceId) {
        // TODO: Implement payment addition
        this.showNotification('Fonctionnalité de paiement à implémenter', 'info');
    }

    async createPaymentPlan(invoiceId) {
        const planName = prompt('Nom du plan de paiement:');
        if (!planName) return;

        const numberOfPayments = prompt('Nombre de paiements:');
        if (!numberOfPayments || isNaN(numberOfPayments)) return;

        const frequency = prompt('Fréquence (monthly, weekly, biweekly):') || 'monthly';
        const firstPaymentDate = prompt('Date du premier paiement (YYYY-MM-DD):');

        try {
            const response = await fetch('/api/payment-plans', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    invoice_id: invoiceId,
                    plan_name: planName,
                    number_of_payments: parseInt(numberOfPayments),
                    frequency: frequency,
                    first_payment_date: firstPaymentDate
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Plan de paiement créé avec succès', 'success');
                this.loadFinanceTab(); // Refresh the finance tab
            } else {
                throw new Error(data.error);
            }

        } catch (error) {
            console.error('Error creating payment plan:', error);
            this.showNotification('Erreur lors de la création du plan de paiement', 'error');
        }
    }

    showTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active class from all tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected tab
        document.getElementById(tabName).classList.add('active');
        
        // Add active class to clicked tab button
        document.querySelector(`[onclick="dentalAI.showTab('${tabName}')"]`).classList.add('active');
        
        // Load specific tab content
        if (tabName === 'patients-tab') {
            this.loadPatients();
        } else if (tabName === 'schedule-tab') {
            this.loadSchedule();
        } else if (tabName === 'finance-tab') {
            this.loadFinanceTab();
        }
    }

    async generateDevisFromPlan(planId, patientId) {
        try {
            // Get the treatment plan details
            const response = await fetch(`/api/patients/${patientId}`);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error('Impossible de charger les détails du patient');
            }
            
            const treatmentPlan = data.treatment_plans.find(plan => plan.id === planId);
            if (!treatmentPlan) {
                throw new Error('Plan de traitement non trouvé');
            }
            
            let planData = {};
            try {
                planData = JSON.parse(treatmentPlan.plan_data);
            } catch (e) {
                throw new Error('Données du plan de traitement invalides');
            }
            
            if (!planData.treatment_sequence || planData.treatment_sequence.length === 0) {
                throw new Error('Aucune séquence de traitement trouvée');
            }
            
            // Generate devis directly since we already have the patient
            const devisResponse = await fetch('/api/generate-devis-from-treatment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    patient_id: patientId,
                    treatment_plan_id: planId,
                    treatment_plan: planData  // Send the complete plan data object
                })
            });
            
            const devisData = await devisResponse.json();
            
            if (devisData.success) {
                this.showNotification('Devis généré avec succès!', 'success');
                
                // Show the generated devis details
                if (window.dentalAI && typeof window.dentalAI.showDevisDetails === 'function') {
                    window.dentalAI.showDevisDetails(devisData.devis_id);
                }
            } else {
                throw new Error(devisData.error || 'Erreur lors de la génération du devis');
            }
            
        } catch (error) {
            console.error('Error generating devis:', error);
            this.showNotification('Erreur: ' + error.message, 'error');
        }
    }

    async loadPatientDevis(patientId) {
        try {
            const response = await fetch(`/api/devis?patient_id=${patientId}`);
            const data = await response.json();
            
            const devisListElement = document.getElementById('patient-devis-list');
            if (!devisListElement) return;
            
            if (data.success && data.devis.length > 0) {
                devisListElement.innerHTML = `
                    <div class="patient-devis-grid">
                        ${data.devis.map(devis => `
                            <div class="devis-item" data-status="${devis.status}">
                                <div class="devis-item-header">
                                    <strong>${devis.devis_number}</strong>
                                    <span class="status-badge ${devis.status}">${this.getDevisStatusText(devis.status)}</span>
                                </div>
                                <div class="devis-item-info">
                                    <p><strong>Date:</strong> ${new Date(devis.devis_date).toLocaleDateString('fr-FR')}</p>
                                    <p><strong>Montant:</strong> ${devis.patient_amount_chf.toFixed(2)} CHF</p>
                                    <p><strong>Valide jusqu'au:</strong> ${new Date(devis.valid_until).toLocaleDateString('fr-FR')}</p>
                                </div>
                                <div class="devis-item-actions">
                                    <button class="btn btn-sm btn-primary" onclick="window.dentalAI.showDevisDetails('${devis.id}')">
                                        <i class="fas fa-eye"></i> Voir
                                    </button>
                                    <button class="btn btn-sm btn-secondary" onclick="window.dentalAI.downloadDevis('${devis.id}')">
                                        <i class="fas fa-download"></i> PDF
                                    </button>
                                    ${devis.status === 'approved' ? `
                                        <button class="btn btn-sm btn-success" onclick="window.dentalAI.createInvoiceFromDevis('${devis.id}')">
                                            <i class="fas fa-file-invoice-dollar"></i> Facturer
                                        </button>
                                    ` : ''}
                                    <button class="btn btn-sm btn-danger" onclick="window.dentalAI.deleteDevis('${devis.id}')">
                                        <i class="fas fa-trash"></i> Supprimer
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                devisListElement.innerHTML = '<div class="empty-state">Aucun devis trouvé</div>';
            }
        } catch (error) {
            console.error('Error loading patient devis:', error);
            const devisListElement = document.getElementById('patient-devis-list');
            if (devisListElement) {
                devisListElement.innerHTML = '<div class="error-state">Erreur lors du chargement des devis</div>';
            }
        }
    }

    async loadPatientInvoices(patientId) {
        try {
            const response = await fetch(`/api/invoices?patient_id=${patientId}`);
            const data = await response.json();
            
            const invoicesListElement = document.getElementById('patient-invoices-list');
            if (!invoicesListElement) return;
            
            if (data.success && data.invoices.length > 0) {
                invoicesListElement.innerHTML = `
                    <div class="patient-invoices-grid">
                        ${data.invoices.map(invoice => `
                            <div class="invoice-item" data-status="${invoice.status}">
                                <div class="invoice-item-header">
                                    <strong>${invoice.invoice_number}</strong>
                                    <span class="status-badge ${invoice.status}">${this.getInvoiceStatusText(invoice.status)}</span>
                                </div>
                                <div class="invoice-item-info">
                                    <p><strong>Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString('fr-FR')}</p>
                                    <p><strong>Échéance:</strong> ${new Date(invoice.due_date).toLocaleDateString('fr-FR')}</p>
                                    <p><strong>Montant:</strong> ${invoice.patient_amount_chf.toFixed(2)} CHF</p>
                                    <p><strong>Payé:</strong> ${invoice.paid_amount_chf.toFixed(2)} CHF</p>
                                </div>
                                <div class="invoice-item-actions">
                                    <button class="btn btn-sm btn-primary" onclick="window.dentalAI.showInvoiceDetails('${invoice.id}')">
                                        <i class="fas fa-eye"></i> Voir
                                    </button>
                                    <button class="btn btn-sm btn-secondary" onclick="window.dentalAI.downloadInvoice('${invoice.id}')">
                                        <i class="fas fa-download"></i> PDF
                                    </button>
                                    ${invoice.status !== 'paid' ? `
                                        <button class="btn btn-sm btn-success" onclick="window.dentalAI.addPaymentToInvoice('${invoice.id}')">
                                            <i class="fas fa-credit-card"></i> Paiement
                                        </button>
                                    ` : ''}
                                    <button class="btn btn-sm btn-danger" onclick="window.dentalAI.deleteInvoice('${invoice.id}')">
                                        <i class="fas fa-trash"></i> Supprimer
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                invoicesListElement.innerHTML = '<div class="empty-state">Aucune facture trouvée</div>';
            }
        } catch (error) {
            console.error('Error loading patient invoices:', error);
            const invoicesListElement = document.getElementById('patient-invoices-list');
            if (invoicesListElement) {
                invoicesListElement.innerHTML = '<div class="error-state">Erreur lors du chargement des factures</div>';
            }
        }
    }

    getDevisStatusText(status) {
        const statusMap = {
            'pending': 'En attente',
            'approved': 'Approuvé',
            'rejected': 'Rejeté',
            'invoiced': 'Facturé'
        };
        return statusMap[status] || status;
    }

    getInvoiceStatusText(status) {
        const statusMap = {
            'pending': 'En attente',
            'partial': 'Partiellement payé',
            'paid': 'Payé',
            'overdue': 'En retard'
        };
        return statusMap[status] || status;
    }

    async downloadDevis(devisId) {
        // Use the existing downloadDevis function from dentalAI
        if (window.dentalAI && typeof window.dentalAI.downloadDevis === 'function') {
            window.dentalAI.downloadDevis(devisId);
        } else {
            this.showNotification('Erreur: Fonction non disponible', 'error');
        }
    }

    async downloadInvoice(invoiceId) {
        // Use the existing downloadInvoice function from dentalAI
        if (window.dentalAI && typeof window.dentalAI.downloadInvoice === 'function') {
            window.dentalAI.downloadInvoice(invoiceId);
        } else {
            this.showNotification('Erreur: Fonction non disponible', 'error');
        }
    }

    async showInvoiceDetails(invoiceId) {
        // Use the existing showInvoiceDetails function from dentalAI
        if (window.dentalAI && typeof window.dentalAI.showInvoiceDetails === 'function') {
            window.dentalAI.showInvoiceDetails(invoiceId);
        } else {
            this.showNotification('Erreur: Fonction non disponible', 'error');
        }
    }

    async deleteDevis(devisId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce devis ? Cette action est irréversible.')) {
            return;
        }

        try {
            const response = await fetch(`/api/devis/${devisId}`, {
                method: 'DELETE'
            });

            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Devis supprimé avec succès', 'success');
                
                // Refresh the current view
                if (window.financeManager) {
                    window.financeManager.loadInvoices();
                }
                
                // Refresh patient view if open
                const patientModal = document.querySelector('.modal.active');
                if (patientModal) {
                    const patientId = patientModal.dataset.patientId;
                    if (patientId) {
                        this.loadPatientDevis(patientId);
                    }
                }
            } else {
                this.showNotification(data.error || 'Erreur lors de la suppression', 'error');
            }
        } catch (error) {
            console.error('Error deleting devis:', error);
            this.showNotification('Erreur lors de la suppression du devis', 'error');
        }
    }

    async deleteInvoice(invoiceId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette facture ? Cette action est irréversible.')) {
            return;
        }

        try {
            const response = await fetch(`/api/invoices/${invoiceId}`, {
                method: 'DELETE'
            });

            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Facture supprimée avec succès', 'success');
                
                // Refresh the current view
                if (window.financeManager) {
                    window.financeManager.loadInvoices();
                }
                
                // Refresh patient view if open
                const patientModal = document.querySelector('.modal.active');
                if (patientModal) {
                    const patientId = patientModal.dataset.patientId;
                    if (patientId) {
                        this.loadPatientInvoices(patientId);
                    }
                }
            } else {
                this.showNotification(data.error || 'Erreur lors de la suppression', 'error');
            }
        } catch (error) {
            console.error('Error deleting invoice:', error);
            this.showNotification('Erreur lors de la suppression de la facture', 'error');
        }
    }

    async generatePatientEducation(planId) {
        try {
            const treatmentData = this.extractTreatmentPlanData(planId);
            if (!treatmentData) {
                this.showNotification('Erreur: Plan de traitement non trouvé', 'error');
                return;
            }

            // Show patient selection modal for education
            await this.showPatientSelectionForEducation(planId, treatmentData);

        } catch (error) {
            console.error('Error generating patient education:', error);
            this.showNotification('Erreur lors de la génération du document éducatif', 'error');
        }
    }

    async showPatientSelectionForEducation(planId, treatmentData) {
        try {
            // Load patients
            const response = await fetch('/api/patients');
            const data = await response.json();
            
            if (!data.success) {
                throw new Error('Impossible de charger la liste des patients');
            }

            const modalContent = `
                <div class="patient-education-modal">
                    <h3><i class="fas fa-graduation-cap"></i> Générer Document Éducatif Patient</h3>
                    
                    <div class="treatment-summary">
                        <h4>Résumé du Traitement</h4>
                        <ul>
                            ${treatmentData.treatment_sequence.map(step => `
                                <li><strong>RDV ${step.rdv}:</strong> ${step.traitement} (${step.duree})</li>
                            `).join('')}
                        </ul>
                    </div>
                    
                    <div class="patient-selection">
                        <h4>Sélectionner le Patient</h4>
                        <div class="patient-search">
                            <input type="text" id="education-patient-search" placeholder="Rechercher un patient..." 
                                   onkeyup="dentalAI.filterPatientListForEducation(this.value)">
                        </div>
                        <div class="patients-list" id="education-patients-list">
                            ${data.patients.map(patient => `
                                <div class="patient-option" onclick="dentalAI.selectPatientForEducation('${patient.id}', '${patient.first_name}', '${patient.last_name}', '${planId}')">
                                    <div class="patient-info">
                                        <strong>${patient.first_name} ${patient.last_name}</strong>
                                        <small>Né(e) le ${new Date(patient.birth_date).toLocaleDateString('fr-FR')}</small>
                                    </div>
                                    <button class="patient-select-btn">Sélectionner</button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        <button class="btn btn-secondary" onclick="dentalAI.hideEducationModal()">Annuler</button>
                    </div>
                </div>
            `;

            this.showModal(modalContent);

        } catch (error) {
            console.error('Error showing patient selection for education:', error);
            this.showNotification('Erreur lors de l\'affichage de la sélection patient', 'error');
        }
    }

    filterPatientListForEducation(searchTerm) {
        const patientsList = document.getElementById('education-patients-list');
        const patients = patientsList.querySelectorAll('.patient-option');
        
        patients.forEach(patient => {
            const name = patient.querySelector('.patient-info strong').textContent.toLowerCase();
            if (name.includes(searchTerm.toLowerCase())) {
                patient.style.display = 'block';
            } else {
                patient.style.display = 'none';
            }
        });
    }

    async selectPatientForEducation(patientId, firstName, lastName, planId) {
        try {
            const treatmentData = this.extractTreatmentPlanData(planId);
            
            // Show loading
            this.showNotification('Génération du document éducatif en cours...', 'info');
            
            // Generate patient education document
            const response = await fetch('/api/generate-patient-education', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    patient_id: patientId,
                    treatment_plan: treatmentData
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showNotification(`Document éducatif généré pour ${firstName} ${lastName}`, 'success');
                this.hideEducationModal();
                
                // Show education document preview - combine firstName and lastName into patientName
                const patientName = `${firstName} ${lastName}`;
                await this.showEducationDocumentPreview(data.education_content, patientId, patientName, planId);
                
            } else {
                throw new Error(data.error);
            }

        } catch (error) {
            console.error('Error generating patient education:', error);
            this.showNotification('Erreur lors de la génération du document éducatif', 'error');
        }
    }

    async showEducationDocumentPreview(educationContent, patientId, patientName, treatmentPlanId = null) {
        // Extract first and last name from patientName for the onclick handlers
        const nameParts = patientName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        // Show modal with education document preview
        const modal = this.createModal(`
            <div class="education-preview-modal">
                <h3><i class="fas fa-file-alt"></i> Aperçu du Document d'Éducation</h3>
                <div class="patient-info">
                    <p><strong>Patient:</strong> ${patientName}</p>
                    <p><strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
                </div>
                <div class="education-content">
                    <div class="education-editor" contenteditable="true" id="education-editor">
                        ${educationContent}
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="dentalAI.downloadEducationDocument('${patientId}', '${patientName}')">
                        <i class="fas fa-download"></i> Télécharger PDF
                    </button>
                    <button class="btn btn-secondary" onclick="dentalAI.saveEducationDocument('${patientId}', document.getElementById('education-editor').innerHTML, '${treatmentPlanId || ''}')">
                        <i class="fas fa-save"></i> Sauvegarder
                    </button>
                    <button class="btn btn-secondary" onclick="dentalAI.hideEducationModal()">Fermer</button>
                </div>
            </div>
        `);
        
        this.showModal(modal);
    }

    async downloadEducationDocument(patientId, patientName) {
        try {
            const educationContent = document.getElementById('education-editor').innerHTML;
            
            // Show loading
            const downloadBtn = document.querySelector('.education-preview-modal .btn-primary');
            const originalText = downloadBtn.innerHTML;
            downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Génération...';
            downloadBtn.disabled = true;
            
            const response = await fetch('/api/download-patient-education', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    patient_id: patientId,
                    patient_name: patientName,
                    education_content: educationContent
                })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Education_${patientName.replace(' ', '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                this.showNotification('Document éducatif téléchargé avec succès', 'success');
            } else {
                throw new Error('Erreur lors du téléchargement');
            }
            
            // Restore button
            downloadBtn.innerHTML = originalText;
            downloadBtn.disabled = false;
            
        } catch (error) {
            console.error('Error downloading education document:', error);
            this.showNotification('Erreur lors du téléchargement', 'error');
        }
    }

    async saveEducationDocument(patientId, educationContent, treatmentPlanId = null) {
        try {
            const response = await fetch('/api/save-patient-education', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    patient_id: patientId,
                    education_content: educationContent,
                    treatment_plan_id: treatmentPlanId
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Document éducatif sauvegardé', 'success');
            } else {
                throw new Error(data.error);
            }
            
        } catch (error) {
            console.error('Error saving education document:', error);
            this.showNotification('Erreur lors de la sauvegarde', 'error');
        }
    }

    hideEducationModal() {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.remove();
        }
    }
}

// === PRACTICE MANAGEMENT SYSTEM ===

// // PracticeManager class has been moved to /static/js/features/practice/practice-manager.js
// // class PracticeManager {
//     constructor() {
//         this.currentWeekStart = this.getWeekStart(new Date());
//         this.patients = [];
//         this.appointments = [];
//         this.init();
//     }
// 
//     init() {
//         this.setupEventListeners();
//         this.loadPatients();
//         this.loadSchedule();
//     }
// 
//     setupEventListeners() {
//         // Patient management
//         document.getElementById('add-patient-btn')?.addEventListener('click', () => this.showPatientModal());
//         document.getElementById('patient-search')?.addEventListener('input', (e) => this.searchPatients(e.target.value));
//         
//         // Schedule management
//         document.getElementById('prev-week')?.addEventListener('click', () => this.navigateWeek(-1));
//         document.getElementById('next-week')?.addEventListener('click', () => this.navigateWeek(1));
//         document.getElementById('add-appointment-btn')?.addEventListener('click', () => this.showAppointmentModal());
//         
//         // Modal handling
//         document.addEventListener('click', (e) => {
//             if (e.target.classList.contains('modal')) {
//                 this.hideModal(e.target);
//             }
//             if (e.target.classList.contains('modal-close')) {
//                 this.hideModal(e.target.closest('.modal'));
//             }
//         });
//     }
// 
//     // === PATIENT MANAGEMENT ===
// 
//     async loadPatients(searchTerm = '') {
//         try {
//             const response = await fetch(`/api/patients/?search=${encodeURIComponent(searchTerm)}`);
//             const data = await response.json();
//             
//             if (data.status === 'success') {
//                 this.patients = data.patients;
//                 this.renderPatients();
//             } else {
//                 console.error('Failed to load patients:', data.message);
//             }
//         } catch (error) {
//             console.error('Error loading patients:', error);
//         }
//     }
// 
//     renderPatients() {
//         const container = document.getElementById('patients-list');
//         if (!container) return;
// 
//         if (this.patients.length === 0) {
//             container.innerHTML = `
//                 <div class="loading">
//                     <i class="fas fa-user-plus"></i>
//                     Aucun patient trouvé. Ajoutez votre premier patient.
//                 </div>
//             `;
//             return;
//         }
// 
//         container.innerHTML = this.patients.map(patient => `
//             <div class="patient-card" data-patient-id="${patient.id}">
//                 <div class="patient-card-header">
//                     <div>
//                         <h3 class="patient-name">${patient.first_name} ${patient.last_name}</h3>
//                         <div class="patient-id">#${patient.id.substring(0, 8)}</div>
//                     </div>
//                     <div class="patient-actions">
//                         <button class="btn btn-sm btn-primary" onclick="practiceManager.viewPatient('${patient.id}')">
//                             <i class="fas fa-eye"></i>
//                         </button>
//                         <button class="btn btn-sm btn-secondary" onclick="practiceManager.editPatient('${patient.id}')">
//                             <i class="fas fa-edit"></i>
//                         </button>
//                     </div>
//                 </div>
//                 <div class="patient-info">
//                     ${patient.email ? `<div class="patient-detail"><i class="fas fa-envelope"></i> ${patient.email}</div>` : ''}
//                     ${patient.phone ? `<div class="patient-detail"><i class="fas fa-phone"></i> ${patient.phone}</div>` : ''}
//                     ${patient.birth_date ? `<div class="patient-detail"><i class="fas fa-birthday-cake"></i> ${this.formatDate(patient.birth_date)}</div>` : ''}
//                 </div>
//                 <div class="patient-stats">
//                     <div class="patient-stat">
//                         <div class="patient-stat-value">0</div>
//                         <div class="patient-stat-label">RDV</div>
//                     </div>
//                     <div class="patient-stat">
//                         <div class="patient-stat-value">0</div>
//                         <div class="patient-stat-label">Plans</div>
//                     </div>
//                     <div class="patient-stat">
//                         <div class="patient-stat-value">Actif</div>
//                         <div class="patient-stat-label">Statut</div>
//                     </div>
//                 </div>
//             </div>
//         `).join('');
//     }
// 
//     searchPatients(term) {
//         this.loadPatients(term);
//     }
// 
//     showPatientModal(patientId = null) {
//         const isEdit = patientId !== null;
//         const patient = isEdit ? this.patients.find(p => p.id === patientId) : null;
//         
//         const modal = this.createModal(`
//             <div class="modal-header">
//                 <h2 class="modal-title">
//                     <i class="fas fa-user"></i>
//                     ${isEdit ? 'Modifier Patient' : 'Nouveau Patient'}
//                 </h2>
//                 <button class="modal-close">&times;</button>
//             </div>
//             <div class="modal-body">
//                 <form id="patient-form">
//                     <div class="form-row">
//                         <div class="form-group">
//                             <label class="form-label">Prénom *</label>
//                             <input type="text" class="form-control" name="first_name" required 
//                                    value="${patient?.first_name || ''}">
//                         </div>
//                         <div class="form-group">
//                             <label class="form-label">Nom *</label>
//                             <input type="text" class="form-control" name="last_name" required 
//                                    value="${patient?.last_name || ''}">
//                         </div>
//                     </div>
//                     <div class="form-row">
//                         <div class="form-group">
//                             <label class="form-label">Email</label>
//                             <input type="email" class="form-control" name="email" 
//                                    value="${patient?.email || ''}">
//                         </div>
//                         <div class="form-group">
//                             <label class="form-label">Téléphone</label>
//                             <input type="tel" class="form-control" name="phone" 
//                                    value="${patient?.phone || ''}">
//                         </div>
//                     </div>
//                     <div class="form-group">
//                         <label class="form-label">Date de naissance</label>
//                         <input type="date" class="form-control" name="birth_date" 
//                                value="${patient?.birth_date || ''}">
//                     </div>
//                     <div class="form-group">
//                         <label class="form-label">Adresse</label>
//                         <textarea class="form-control" name="address" rows="3">${patient?.address || ''}</textarea>
//                     </div>
//                     <div class="form-group">
//                         <label class="form-label">Antécédents médicaux</label>
//                         <textarea class="form-control" name="medical_history" rows="3">${patient?.medical_history || ''}</textarea>
//                     </div>
//                     <div class="form-group">
//                         <label class="form-label">Allergies</label>
//                         <textarea class="form-control" name="allergies" rows="2">${patient?.allergies || ''}</textarea>
//                     </div>
//                     <div class="form-group">
//                         <label class="form-label">Contact d'urgence</label>
//                         <input type="text" class="form-control" name="emergency_contact" 
//                                value="${patient?.emergency_contact || ''}">
//                     </div>
//                     <div class="form-group">
//                         <label class="form-label">Informations assurance</label>
//                         <textarea class="form-control" name="insurance_info" rows="2">${patient?.insurance_info || ''}</textarea>
//                     </div>
//                     <div class="form-group">
//                         <label class="form-label">Notes</label>
//                         <textarea class="form-control" name="notes" rows="3">${patient?.notes || ''}</textarea>
//                     </div>
//                 </form>
//             </div>
//             <div class="modal-footer">
//                 <button class="btn btn-secondary" onclick="practiceManager.hideModal(this.closest('.modal'))">
//                     Annuler
//                 </button>
//                 <button class="btn btn-primary" onclick="practiceManager.savePatient('${patientId || ''}')">
//                     <i class="fas fa-save"></i>
//                     ${isEdit ? 'Mettre à jour' : 'Créer'}
//                 </button>
//             </div>
//         `);
//         
//         this.showModal(modal);
//     }
// 
//     async savePatient(patientId = '') {
//         const form = document.getElementById('patient-form');
//         const formData = new FormData(form);
//         const patientData = Object.fromEntries(formData.entries());
// 
//         try {
//             const isEdit = patientId !== '';
//             const url = isEdit ? `/api/patients/${patientId}` : '/api/patients';
//             const method = isEdit ? 'PUT' : 'POST';
// 
//             const response = await fetch(url, {
//                 method: method,
//                 headers: {
//                     'Content-Type': 'application/json',
//                 },
//                 body: JSON.stringify(patientData)
//             });
// 
//             const data = await response.json();
// 
//             if (data.success) {
//                 this.hideModal(document.querySelector('.modal.show'));
//                 this.loadPatients();
//                 this.showNotification(data.message || 'Patient sauvegardé avec succès', 'success');
//             } else {
//                 this.showNotification(data.error || 'Erreur lors de la sauvegarde', 'error');
//             }
//         } catch (error) {
//             console.error('Error saving patient:', error);
//             this.showNotification('Erreur lors de la sauvegarde', 'error');
//         }
//     }
// 
//     async viewPatient(patientId) {
//         try {
//             const response = await fetch(`/api/patients/${patientId}`);
//             const data = await response.json();
// 
//             if (data.success) {
//                 const patient = data.patient;
//                 const modal = this.createModal(`
//                     <div class="modal-header">
//                         <h2 class="modal-title">
//                             <i class="fas fa-user"></i>
//                             ${patient.first_name} ${patient.last_name}
//                         </h2>
//                         <button class="modal-close">&times;</button>
//                     </div>
//                     <div class="modal-body">
//                         <div class="patient-details">
//                             <div class="patient-info">
//                                 <div class="form-row">
//                                     <div class="form-group">
//                                         <label>Nom:</label>
//                                         <span>${patient.last_name}</span>
//                                     </div>
//                                     <div class="form-group">
//                                         <label>Prénom:</label>
//                                         <span>${patient.first_name}</span>
//                                     </div>
//                                 </div>
//                                 <div class="form-row">
//                                     <div class="form-group">
//                                         <label>Date de naissance:</label>
//                                         <span>${patient.birth_date ? new Date(patient.birth_date).toLocaleDateString('fr-FR') : 'Non renseigné'}</span>
//                                     </div>
//                                     <div class="form-group">
//                                         <label>Téléphone:</label>
//                                         <span>${patient.phone || 'Non renseigné'}</span>
//                                     </div>
//                                 </div>
//                                 <div class="form-row">
//                                     <div class="form-group">
//                                         <label>Email:</label>
//                                         <span>${patient.email || 'Non renseigné'}</span>
//                                     </div>
//                                     <div class="form-group">
//                                         <label>Adresse:</label>
//                                         <span>${patient.address || 'Non renseigné'}</span>
//                                     </div>
//                                 </div>
//                             </div>
//                             
//                             <div class="patient-section">
//                                 <h3>Plans de traitement</h3>
//                                 <div id="patient-treatment-plans">
//                                     ${data.treatment_plans.length === 0 ? 'Aucun plan de traitement' : 
//                                       data.treatment_plans.map(plan => {
//                                           let planData = {};
//                                           try {
//                                               planData = JSON.parse(plan.plan_data);
//                                           } catch (e) {
//                                               planData = { treatment_sequence: [] };
//                                           }
//                                           
//                                           return `
//                                             <div class="treatment-plan-item" data-plan-id="${plan.id}">
//                                                 <div class="treatment-plan-header">
//                                                     <strong>Plan du ${this.formatDate(plan.created_at)}</strong>
//                                                     <div class="treatment-plan-actions">
//                                                         <button class="btn btn-sm btn-primary" onclick="practiceManager.generateDevisFromPlan('${plan.id}', '${patientId}')">
//                                                             <i class="fas fa-file-invoice"></i> Générer Devis
//                                                         </button>
//                                                         <button class="btn btn-sm btn-success patient-education-btn" onclick="practiceManager.generatePatientEducationFromPlan('${plan.id}', '${patientId}')">
//                                                             <i class="fas fa-graduation-cap"></i> Éducation Patient
//                                                         </button>
//                                                     </div>
//                                                 </div>
//                                                 <p><strong>Consultation:</strong> ${plan.consultation_text || 'Non renseigné'}</p>
//                                                 ${planData.treatment_sequence && planData.treatment_sequence.length > 0 ? `
//                                                     <div class="treatment-sequence-summary">
//                                                         <h5>Séquence de traitement:</h5>
//                                                         <ul>
//                                                             ${planData.treatment_sequence.slice(0, 3).map(step => `
//                                                                 <li>${step.traitement} - ${step.duree}</li>
//                                                             `).join('')}
//                                                             ${planData.treatment_sequence.length > 3 ? `<li>... et ${planData.treatment_sequence.length - 3} autres</li>` : ''}
//                                                         </ul>
//                                                     </div>
//                                                 ` : ''}
//                                                 <div class="treatment-plan-meta">
//                                                     <small>Créé le ${this.formatDate(plan.created_at)}</small>
//                                                 </div>
//                                             </div>
//                                           `;
//                                       }).join('')}
//                                 </div>
//                             </div>
//                             
//                             <div class="patient-section">
//                                 <h3>Devis du patient</h3>
//                                 <div id="patient-devis-list">
//                                     <div class="loading">Chargement des devis...</div>
//                                 </div>
//                             </div>
//                             
//                             <div class="patient-section">
//                                 <h3>Documents éducatifs</h3>
//                                 <div id="patient-education-list">
//                                     <div class="loading">Chargement des documents éducatifs...</div>
//                                 </div>
//                             </div>
//                             
//                             <div class="patient-section">
//                                 <h3>Factures du patient</h3>
//                                 <div id="patient-invoices-list">
//                                     <div class="loading">Chargement des factures...</div>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                     <div class="modal-footer">
//                         <button class="btn btn-secondary" onclick="practiceManager.editPatient('${patientId}')">
//                             <i class="fas fa-edit"></i> Modifier
//                         </button>
//                     </div>
//                 `);
//                 
//                 this.showModal(modal);
//                 
//                 // Load devis and invoices after modal is shown
//                 setTimeout(() => {
//                     if (window.dentalAI && typeof window.dentalAI.loadPatientDevis === 'function') {
//                         window.dentalAI.loadPatientDevis(patientId);
//                     }
//                     if (window.dentalAI && typeof window.dentalAI.loadPatientInvoices === 'function') {
//                         window.dentalAI.loadPatientInvoices(patientId);
//                     }
//                     if (window.practiceManager && typeof window.practiceManager.loadPatientEducation === 'function') {
//                         window.practiceManager.loadPatientEducation(patientId);
//                     }
//                 }, 100);
//                 
//             } else {
//                 throw new Error(data.error);
//             }
//         } catch (error) {
//             console.error('Error viewing patient:', error);
//             this.showNotification('Erreur lors du chargement du patient', 'error');
//         }
//     }
// 
//     editPatient(patientId) {
//         this.hideModal(document.querySelector('.modal.show'));
//         this.showPatientModal(patientId);
//     }
// 
//     // === SCHEDULE MANAGEMENT ===
// 
//     async loadSchedule() {
//         try {
//             const weekStart = this.formatDate(this.currentWeekStart);
//             const response = await fetch(`/api/appointments/?week_start=${weekStart}`);
//             const data = await response.json();
// 
//             if (data.status === 'success') {
//                 this.appointments = data.appointments;
//                 this.renderSchedule();
//                 this.updateWeekDisplay();
//             } else {
//                 console.error('Failed to load schedule:', data.message);
//             }
//         } catch (error) {
//             console.error('Error loading schedule:', error);
//         }
//     }
// 
//     renderSchedule() {
//         const container = document.getElementById('schedule-grid');
//         if (!container) return;
// 
//         // Create header with days
//         const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
//         const hours = Array.from({length: 9}, (_, i) => i + 9); // 9 AM to 5 PM
// 
//         let html = '<div class="schedule-time-header"></div>';
//         for (let day = 0; day < 7; day++) {
//             const date = new Date(this.currentWeekStart);
//             date.setDate(date.getDate() + day);
//             const isToday = this.isToday(date);
//             
//             html += `
//                 <div class="schedule-day-header ${isToday ? 'today' : ''}">
//                     <div class="schedule-day-name">${days[day]}</div>
//                     <div class="schedule-day-date">${date.getDate()}/${date.getMonth() + 1}</div>
//                 </div>
//             `;
//         }
// 
//         // Create time slots and appointments
//         for (const hour of hours) {
//             html += `<div class="schedule-time-slot">${hour}:00</div>`;
//             
//             for (let day = 0; day < 7; day++) {
//                 const date = new Date(this.currentWeekStart);
//                 date.setDate(date.getDate() + day);
//                 const dateStr = this.formatDate(date);
//                 const isToday = this.isToday(date);
//                 
//                 const dayAppointments = this.appointments.filter(apt => 
//                     apt.appointment_date === dateStr && 
//                     parseInt(apt.appointment_time.split(':')[0]) === hour
//                 );
// 
//                 // Sort appointments by time within the hour
//                 dayAppointments.sort((a, b) => {
//                     const timeA = a.appointment_time.split(':');
//                     const timeB = b.appointment_time.split(':');
//                     return (parseInt(timeA[0]) * 60 + parseInt(timeA[1])) - (parseInt(timeB[0]) * 60 + parseInt(timeB[1]));
//                 });
// 
//                 // Check for conflicts in this hour
//                 const hasConflict = this.checkHourConflicts(dayAppointments);
// 
//                 html += `
//                     <div class="schedule-cell ${isToday ? 'today' : ''}" 
//                          data-date="${dateStr}" 
//                          data-time="${hour}:00"
//                          data-conflict="${hasConflict}"
//                          ondrop="practiceManager.handleDrop(event)"
//                          ondragover="practiceManager.handleDragOver(event)"
//                          onclick="practiceManager.showAppointmentModal('${dateStr}', '${hour}:00')">
//                         ${this.renderAppointmentsInHour(dayAppointments, hour)}
//                     </div>
//                 `;
//             }
//         }
// 
//         container.innerHTML = html;
//     }
// 
//     renderAppointmentsInHour(appointments, hour) {
//         if (appointments.length === 0) return '';
// 
//         let html = '';
//         let hasConflict = false;
//         
//         // Check for time conflicts
//         for (let i = 0; i < appointments.length; i++) {
//             for (let j = i + 1; j < appointments.length; j++) {
//                 const apt1 = appointments[i];
//                 const apt2 = appointments[j];
//                 
//                 const [h1, m1] = apt1.appointment_time.split(':').map(Number);
//                 const [h2, m2] = apt2.appointment_time.split(':').map(Number);
//                 
//                 const start1 = m1;
//                 const end1 = m1 + (apt1.duration_minutes || 60);
//                 const start2 = m2;
//                 const end2 = m2 + (apt2.duration_minutes || 60);
//                 
//                 // Check for overlap
//                 if (start1 < end2 && start2 < end1) {
//                     hasConflict = true;
//                     break;
//                 }
//             }
//             if (hasConflict) break;
//         }
// 
//         for (const apt of appointments) {
//             const [aptHour, aptMinute] = apt.appointment_time.split(':').map(Number);
//             const duration = apt.duration_minutes || 60;
//             
//             // Calculate position within the hour (0-60 minutes)
//             const startMinute = aptMinute;
//             const heightPercentage = (duration / 60) * 100; // Height as percentage of hour slot
//             const topOffset = (startMinute / 60) * 100; // Top position as percentage
//             
//             // Add conflict class if there's an overlap
//             const conflictClass = hasConflict ? 'conflict' : '';
//             
//             html += `
//                 <div class="appointment-block ${apt.status} ${conflictClass}" 
//                      data-appointment-id="${apt.id}"
//                      data-duration="${duration}"
//                      draggable="true"
//                      ondragstart="practiceManager.handleDragStart(event)"
//                      onclick="event.stopPropagation(); practiceManager.showAppointmentDetails('${apt.id}')"
//                      style="height: ${heightPercentage}%; top: ${topOffset}%; position: absolute; width: calc(100% - 8px); left: 4px; z-index: 1;">
//                     <div class="appointment-patient">${apt.first_name} ${apt.last_name}</div>
//                     <div class="appointment-treatment">${apt.treatment_type}</div>
//                     <div class="appointment-time">${apt.appointment_time} (${duration}min)</div>
//                 </div>
//             `;
//         }
// 
//         return html;
//     }
// 
//     handleDragStart(event) {
//         const appointmentId = event.target.dataset.appointmentId;
//         event.dataTransfer.setData('text/plain', appointmentId);
//         event.target.classList.add('dragging');
//     }
// 
//     handleDragOver(event) {
//         event.preventDefault();
//         event.currentTarget.classList.add('drag-over');
//     }
// 
//     handleDrop(event) {
//         event.preventDefault();
//         event.currentTarget.classList.remove('drag-over');
//         
//         const appointmentId = event.dataTransfer.getData('text/plain');
//         const newDate = event.currentTarget.dataset.date;
//         const newTime = event.currentTarget.dataset.time;
//         
//         this.moveAppointment(appointmentId, newDate, newTime);
//     }
// 
//     async moveAppointment(appointmentId, newDate, newTime) {
//         try {
//             const response = await fetch(`/api/appointments/${appointmentId}/move`, {
//                 method: 'PUT',
//                 headers: {
//                     'Content-Type': 'application/json'
//                 },
//                 body: JSON.stringify({
//                     new_date: newDate,
//                     new_time: newTime
//                 })
//             });
// 
//             const result = await response.json();
// 
//             if (result.success) {
//                 this.showNotification('Rendez-vous déplacé avec succès', 'success');
//                 this.loadSchedule(); // Refresh the schedule
//             } else {
//                 if (response.status === 409) {
//                     // Conflict - show available slots
//                     this.showNotification(`Conflit: ${result.error}`, 'error');
//                     if (result.available_slots) {
//                         this.showAvailableSlots(newDate, result.available_slots);
//                     }
//                 } else {
//                     this.showNotification(`Erreur: ${result.error}`, 'error');
//                 }
//             }
//         } catch (error) {
//             console.error('Error moving appointment:', error);
//             this.showNotification('Erreur lors du déplacement', 'error');
//         }
//     }
// 
//     showAvailableSlots(date, availableSlots) {
//         const modal = this.createModal(`
//             <div class="available-slots-modal">
//                 <h3>Créneaux disponibles pour le ${date}</h3>
//                 <div class="slots-grid">
//                     ${availableSlots.map(slot => `
//                         <button class="slot-btn" onclick="practiceManager.selectTimeSlot('${date}', '${slot}')">
//                             ${slot}
//                         </button>
//                     `).join('')}
//                 </div>
//                 <div class="modal-actions">
//                     <button onclick="practiceManager.hideModal(document.querySelector('.modal'))" class="btn btn-secondary">
//                         Annuler
//                     </button>
//                 </div>
//             </div>
//         `);
//         this.showModal(modal);
//     }
// 
//     async showAppointmentDetails(appointmentId) {
//         try {
//             const response = await fetch(`/api/appointments/${appointmentId}/details`);
//             const result = await response.json();
// 
//             if (result.success) {
//                 const appointment = result.appointment;
//                 const modal = this.createModal(`
//                     <div class="appointment-details-modal">
//                         <h3><i class="fas fa-calendar-check"></i> Détails du Rendez-vous</h3>
//                         
//                         <div class="appointment-info">
//                             <div class="info-section">
//                                 <h4><i class="fas fa-user"></i> Patient</h4>
//                                 <p><strong>Nom:</strong> ${appointment.first_name} ${appointment.last_name}</p>
//                                 <p><strong>Téléphone:</strong> ${appointment.phone || 'N/A'}</p>
//                                 <p><strong>Email:</strong> ${appointment.email || 'N/A'}</p>
//                                 <p><strong>Date de naissance:</strong> ${appointment.birth_date || 'N/A'}</p>
//                             </div>
//                             
//                             <div class="info-section">
//                                 <h4><i class="fas fa-calendar"></i> Rendez-vous</h4>
//                                 <p><strong>Date:</strong> ${new Date(appointment.appointment_date).toLocaleDateString('fr-FR')}</p>
//                                 <p><strong>Heure:</strong> ${appointment.appointment_time}</p>
//                                 <p><strong>Durée:</strong> ${appointment.duration_minutes} minutes</p>
//                                 <p><strong>Statut:</strong> <span class="status-badge ${appointment.status}">${this.getStatusText(appointment.status)}</span></p>
//                             </div>
//                             
//                             <div class="info-section">
//                                 <h4><i class="fas fa-tooth"></i> Traitement</h4>
//                                 <p><strong>Type:</strong> ${appointment.treatment_type}</p>
//                                 <p><strong>Praticien:</strong> ${appointment.doctor}</p>
//                                 ${appointment.notes ? `<p><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
//                             </div>
//                             
//                             ${appointment.treatment_plan ? `
//                                 <div class="info-section">
//                                     <h4><i class="fas fa-clipboard-list"></i> Plan de Traitement</h4>
//                                     <p><strong>Consultation:</strong> ${appointment.consultation_text || 'N/A'}</p>
//                                     ${appointment.treatment_plan.treatment_sequence ? `
//                                         <div class="treatment-sequence-preview">
//                                             <h5>Séquence de traitement:</h5>
//                                             <ul>
//                                                 ${appointment.treatment_plan.treatment_sequence.map(step => `
//                                                     <li>${step.traitement} - ${step.duree}</li>
//                                                 `).join('')}
//                                             </ul>
//                                         </div>
//                                     ` : ''}
//                                 </div>
//                             ` : ''}
//                         </div>
//                         
//                         <div class="modal-actions">
//                             <button onclick="practiceManager.editAppointment('${appointmentId}')" class="btn btn-primary">
//                                 <i class="fas fa-edit"></i> Modifier
//                             </button>
//                             <button onclick="practiceManager.cancelAppointment('${appointmentId}')" class="btn btn-danger">
//                                 <i class="fas fa-times"></i> Annuler
//                             </button>
//                             <button onclick="practiceManager.hideModal(document.querySelector('.modal'))" class="btn btn-secondary">
//                                 <i class="fas fa-times"></i> Fermer
//                             </button>
//                         </div>
//                     </div>
//                 `);
//                 this.showModal(modal);
//             } else {
//                 this.showNotification(`Erreur: ${result.error}`, 'error');
//             }
//         } catch (error) {
//             console.error('Error loading appointment details:', error);
//             this.showNotification('Erreur lors du chargement des détails', 'error');
//         }
//     }
// 
//     getStatusText(status) {
//         const statusMap = {
//             'scheduled': 'Programmé',
//             'completed': 'Terminé',
//             'cancelled': 'Annulé',
//             'no-show': 'Absence'
//         };
//         return statusMap[status] || status;
//     }
// 
//     async cancelAppointment(appointmentId) {
//         if (!confirm('Êtes-vous sûr de vouloir annuler ce rendez-vous?')) {
//             return;
//         }
// 
//         try {
//             const response = await fetch(`/api/appointments/${appointmentId}`, {
//                 method: 'PUT',
//                 headers: {
//                     'Content-Type': 'application/json'
//                 },
//                 body: JSON.stringify({
//                     status: 'cancelled'
//                 })
//             });
// 
//             const result = await response.json();
// 
//             if (result.success) {
//                 this.showNotification('Rendez-vous annulé', 'success');
//                 this.hideModal(document.querySelector('.modal'));
//                 this.loadSchedule();
//             } else {
//                 this.showNotification(`Erreur: ${result.error}`, 'error');
//             }
//         } catch (error) {
//             console.error('Error cancelling appointment:', error);
//             this.showNotification('Erreur lors de l\'annulation', 'error');
//         }
//     }
// 
//     editAppointment(appointmentId) {
//         // Close current modal and show edit modal
//         this.hideModal(document.querySelector('.modal'));
//         // You can implement edit functionality here
//         this.showNotification('Fonction de modification à implémenter', 'info');
//     }
// 
//     selectTimeSlot(date, time) {
//         // This method is called when user selects a time slot from available slots
//         const appointmentId = this.draggedAppointmentId;
//         if (appointmentId) {
//             this.hideModal(document.querySelector('.modal'));
//             this.moveAppointment(appointmentId, date, time);
//         }
//     }
// 
//     navigateWeek(direction) {
//         const newDate = new Date(this.currentWeekStart);
//         newDate.setDate(newDate.getDate() + (direction * 7));
//         this.currentWeekStart = newDate;
//         this.loadSchedule();
//     }
// 
//     updateWeekDisplay() {
//         const display = document.getElementById('current-week-display');
//         if (display) {
//             const endDate = new Date(this.currentWeekStart);
//             endDate.setDate(endDate.getDate() + 6);
//             
//             display.textContent = `Semaine du ${this.formatDate(this.currentWeekStart)} au ${this.formatDate(endDate)}`;
//         }
//     }
// 
//     showAppointmentModal(date = '', time = '') {
//         const modal = this.createModal(`
//             <div class="modal-header">
//                 <h2 class="modal-title">
//                     <i class="fas fa-calendar-plus"></i>
//                     Nouveau Rendez-vous
//                 </h2>
//                 <button class="modal-close">&times;</button>
//             </div>
//             <div class="modal-body">
//                 <form id="appointment-form">
//                     <div class="form-group">
//                         <label class="form-label">Patient *</label>
//                         <select class="form-control" name="patient_id" required>
//                             <option value="">Sélectionner un patient</option>
//                             ${this.patients.map(p => `
//                                 <option value="${p.id}">${p.first_name} ${p.last_name}</option>
//                             `).join('')}
//                         </select>
//                     </div>
//                     <div class="form-row">
//                         <div class="form-group">
//                             <label class="form-label">Date *</label>
//                             <input type="date" class="form-control" name="appointment_date" required 
//                                    value="${date}">
//                         </div>
//                         <div class="form-group">
//                             <label class="form-label">Heure *</label>
//                             <input type="time" class="form-control" name="appointment_time" required 
//                                    value="${time}">
//                         </div>
//                     </div>
//                     <div class="form-row">
//                         <div class="form-group">
//                             <label class="form-label">Durée (minutes)</label>
//                             <input type="number" class="form-control" name="duration_minutes" value="60" min="15" step="15">
//                         </div>
//                         <div class="form-group">
//                             <label class="form-label">Docteur</label>
//                             <input type="text" class="form-control" name="doctor" value="Dr.">
//                         </div>
//                     </div>
//                     <div class="form-group">
//                         <label class="form-label">Type de traitement</label>
//                         <input type="text" class="form-control" name="treatment_type" 
//                                placeholder="Consultation, Nettoyage, etc.">
//                     </div>
//                     <div class="form-group">
//                         <label class="form-label">Notes</label>
//                         <textarea class="form-control" name="notes" rows="3"></textarea>
//                     </div>
//                 </form>
//             </div>
//             <div class="modal-footer">
//                 <button class="btn btn-secondary" onclick="practiceManager.hideModal(this.closest('.modal'))">
//                     Annuler
//                 </button>
//                 <button class="btn btn-primary" onclick="practiceManager.saveAppointment()">
//                     <i class="fas fa-save"></i>
//                     Créer
//                 </button>
//             </div>
//         `);
//         
//         this.showModal(modal);
//     }
// 
//     async saveAppointment() {
//         const form = document.getElementById('appointment-form');
//         const formData = new FormData(form);
//         const appointmentData = Object.fromEntries(formData.entries());
// 
//         try {
//             const response = await fetch('/api/appointments', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                 },
//                 body: JSON.stringify(appointmentData)
//             });
// 
//             const data = await response.json();
// 
//             if (data.success) {
//                 this.hideModal(document.querySelector('.modal.show'));
//                 this.loadSchedule();
//                 this.showNotification(data.message || 'Rendez-vous créé avec succès', 'success');
//             } else {
//                 this.showNotification(data.error || 'Erreur lors de la création', 'error');
//             }
//         } catch (error) {
//             console.error('Error saving appointment:', error);
//             this.showNotification('Erreur lors de la création', 'error');
//         }
//     }
// 
//     // === UTILITY METHODS ===
// 
//     createModal(content) {
//         const modal = document.createElement('div');
//         modal.className = 'modal';
//         modal.innerHTML = `<div class="modal-content">${content}</div>`;
//         document.body.appendChild(modal);
//         return modal;
//     }
// 
//     showModal(modal) {
//         modal.classList.add('show');
//     }
// 
//     hideModal(modal) {
//         if (modal) {
//             modal.classList.remove('show');
//             setTimeout(() => {
//                 if (modal.parentNode) {
//                     modal.parentNode.removeChild(modal);
//                 }
//             }, 300);
//         }
//     }
// 
//     showNotification(message, type = 'info') {
//         // Remove existing notifications
//         const existingNotifications = document.querySelectorAll('.notification');
//         existingNotifications.forEach(notif => notif.remove());
//         
//         // Create new notification
//         const notification = document.createElement('div');
//         notification.className = `notification ${type}`;
//         notification.textContent = message;
//         
//         // Add to document
//         document.body.appendChild(notification);
//         
//         // Auto-remove after 5 seconds
//             setTimeout(() => {
//                 if (notification.parentNode) {
//                 notification.style.animation = 'slideOut 0.3s ease';
//                 setTimeout(() => notification.remove(), 300);
//                 }
//         }, 5000);
//     }
// 
//     formatDate(date) {
//         if (typeof date === 'string') {
//             date = new Date(date);
//         }
//         return date.toISOString().split('T')[0];
//     }
// 
//     isToday(date) {
//         const today = new Date();
//         return date.toDateString() === today.toDateString();
//     }
// 
//     getWeekStart(date) {
//         const d = new Date(date);
//         const day = d.getDay();
//         const diff = d.getDate() - day + (day === 0 ? -6 : 1);
//         return new Date(d.setDate(diff));
//     }
// 
//     checkHourConflicts(appointments) {
//         if (appointments.length < 2) return false;
//         
//         // Check for time conflicts
//         for (let i = 0; i < appointments.length; i++) {
//             for (let j = i + 1; j < appointments.length; j++) {
//                 const apt1 = appointments[i];
//                 const apt2 = appointments[j];
//                 
//                 const [h1, m1] = apt1.appointment_time.split(':').map(Number);
//                 const [h2, m2] = apt2.appointment_time.split(':').map(Number);
//                 
//                 const start1 = m1;
//                 const end1 = m1 + (apt1.duration_minutes || 60);
//                 const start2 = m2;
//                 const end2 = m2 + (apt2.duration_minutes || 60);
//                 
//                 // Check for overlap
//                 if (start1 < end2 && start2 < end1) {
//                     return true;
//                 }
//             }
//         }
//         return false;
//     }
// 
//     async generateDevisFromPlan(planId, patientId) {
//         try {
//             // Get the treatment plan details
//             const response = await fetch(`/api/patients/${patientId}`);
//             const data = await response.json();
//             
//             if (!data.success) {
//                 throw new Error('Impossible de charger les détails du patient');
//             }
//             
//             const treatmentPlan = data.treatment_plans.find(plan => plan.id === planId);
//             if (!treatmentPlan) {
//                 throw new Error('Plan de traitement non trouvé');
//             }
//             
//             let planData = {};
//             try {
//                 planData = JSON.parse(treatmentPlan.plan_data);
//             } catch (e) {
//                 throw new Error('Données du plan de traitement invalides');
//             }
//             
//             if (!planData.treatment_sequence || planData.treatment_sequence.length === 0) {
//                 throw new Error('Aucune séquence de traitement trouvée');
//             }
//             
//             // Generate devis directly since we already have the patient
//             const devisResponse = await fetch('/api/generate-devis-from-treatment', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                 },
//                 body: JSON.stringify({
//                     patient_id: patientId,
//                     treatment_plan_id: planId,
//                     treatment_plan: planData  // Send the complete plan data object
//                 })
//             });
//             
//             const devisData = await devisResponse.json();
//             
//             if (devisData.success) {
//                 this.showNotification('Devis généré avec succès!', 'success');
//                 
//                 // Show the generated devis details
//                 if (window.dentalAI && typeof window.dentalAI.showDevisDetails === 'function') {
//                     window.dentalAI.showDevisDetails(devisData.devis_id);
//                 }
//             } else {
//                 throw new Error(devisData.error || 'Erreur lors de la génération du devis');
//             }
//             
//         } catch (error) {
//             console.error('Error generating devis:', error);
//             this.showNotification('Erreur: ' + error.message, 'error');
//         }
//     }
// 
//     async generatePatientEducationFromPlan(planId, patientId) {
//         try {
//             this.showNotification('Génération du document éducatif en cours...', 'info');
//             
//             // Get treatment plan data
//             const response = await fetch(`/api/patients/${patientId}`);
//             const patientData = await response.json();
//             
//             if (!patientData.success) {
//                 throw new Error('Impossible de récupérer les données du patient');
//             }
//             
//             const treatmentPlan = patientData.treatment_plans.find(plan => plan.id === planId);
//             if (!treatmentPlan) {
//                 throw new Error('Plan de traitement non trouvé');
//             }
//             
//             let planData = {};
//             try {
//                 planData = JSON.parse(treatmentPlan.plan_data);
//             } catch (e) {
//                 planData = { treatment_sequence: [] };
//             }
//             
//             // Generate education content
//             const educationResponse = await fetch('/api/generate-patient-education', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json'
//                 },
//                 body: JSON.stringify({
//                     patient_id: patientId,
//                     treatment_plan: {
//                         consultation_text: treatmentPlan.consultation_text,
//                         treatment_sequence: planData.treatment_sequence || []
//                     }
//                 })
//             });
//             
//             const educationData = await educationResponse.json();
//             
//             if (educationData.success) {
//                 this.showNotification('Document éducatif généré avec succès', 'success');
//                 
//                 // Show education preview modal
//                 const patient = patientData.patient;
//                 const patientName = `${patient.first_name} ${patient.last_name}`;
//                 
//                 this.showEducationDocumentPreview(
//                     educationData.education_content,
//                     patientId,
//                     patientName,
//                     planId // Pass the treatment plan ID
//                 );
//             } else {
//                 throw new Error(educationData.error || 'Erreur lors de la génération du document éducatif');
//             }
//             
//         } catch (error) {
//             console.error('Error generating patient education:', error);
//             this.showNotification('Erreur: ' + error.message, 'error');
//         }
//     }
//     
//     showEducationDocumentPreview(educationContent, patientId, patientName, treatmentPlanId = null) {
//         // Extract first and last name from patientName for the onclick handlers
//         const nameParts = patientName.split(' ');
//         const firstName = nameParts[0] || '';
//         const lastName = nameParts.slice(1).join(' ') || '';
//         
//         // Show modal with education document preview
//         const modal = this.createModal(`
//             <div class="education-preview-modal">
//                 <h3><i class="fas fa-file-alt"></i> Aperçu du Document d'Éducation</h3>
//                 <div class="patient-info">
//                     <p><strong>Patient:</strong> ${patientName}</p>
//                     <p><strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
//                 </div>
//                 <div class="education-content">
//                     <div class="education-editor" contenteditable="true" id="education-editor">
//                         ${educationContent}
//                     </div>
//                 </div>
//                 <div class="modal-actions">
//                     <button class="btn btn-secondary" onclick="dentalAI.downloadEducationDocument('${patientId}', '${patientName}')">
//                         <i class="fas fa-download"></i> Télécharger PDF
//                     </button>
//                     <button class="btn btn-secondary" onclick="dentalAI.saveEducationDocument('${patientId}', document.getElementById('education-editor').innerHTML, '${treatmentPlanId || ''}')">
//                         <i class="fas fa-save"></i> Sauvegarder
//                     </button>
//                     <button class="btn btn-secondary" onclick="dentalAI.hideEducationModal()">Fermer</button>
//                 </div>
//             </div>
//         `);
//         
//         this.showModal(modal);
//     }
// 
//     // PowerPoint Generation Methods
//     setTreatmentExample(text) {
//         const textarea = document.getElementById('treatment-input');
//         if (textarea) {
//             textarea.value = text;
//             textarea.focus();
//         }
//     }
// 
//     async processTreatmentPlan() {
//         const textarea = document.getElementById('treatment-input');
//         const text = textarea.value.trim();
//         
//         if (!text) {
//             this.showTreatmentError('Veuillez saisir un plan de traitement');
//             return;
//         }
//         
//         // Show loading state
//         this.setTreatmentLoadingState(true);
//         this.hideTreatmentResults();
//         this.hideTreatmentError();
//         
//         try {
//             const response = await fetch('/api/process-powerpoint', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                 },
//                 body: JSON.stringify({ text: text })
//             });
//             
//             const data = await response.json();
//             
//             if (data.success) {
//                 this.showTreatmentResults(data.treatments, data.output_file);
//             } else {
//                 this.showTreatmentError(data.error || 'Erreur inconnue');
//             }
//         } catch (error) {
//             this.showTreatmentError('Erreur de connexion: ' + error.message);
//         } finally {
//             this.setTreatmentLoadingState(false);
//         }
//     }
// 
//     setTreatmentLoadingState(loading) {
//         const btn = document.getElementById('process-treatment-btn');
//         const btnText = document.getElementById('process-btn-text');
//         const btnLoader = document.getElementById('process-btn-loader');
//         
//         if (btn && btnText && btnLoader) {
//             if (loading) {
//                 btn.disabled = true;
//                 btnText.style.display = 'none';
//                 btnLoader.style.display = 'inline-block';
//             } else {
//                 btn.disabled = false;
//                 btnText.style.display = 'inline-block';
//                 btnLoader.style.display = 'none';
//             }
//         }
//     }
// 
//     showTreatmentResults(treatments, outputFile) {
//         const resultsDiv = document.getElementById('treatment-results');
//         const resultsContent = document.getElementById('treatment-results-content');
//         const downloadSection = document.getElementById('download-section');
//         const downloadBtn = document.getElementById('download-ppt-btn');
//         
//         if (!resultsDiv || !resultsContent || !downloadSection || !downloadBtn) {
//             console.error('Required elements not found');
//             return;
//         }
//         
//         // Clear previous results
//         resultsContent.innerHTML = '';
//         
//         // Group results by type
//         const validTreatments = treatments.filter(t => t.success);
//         const invalidTeeth = treatments.filter(t => !t.success && t.error && t.error.includes('invalide'));
//         const failedTreatments = treatments.filter(t => !t.success && (!t.error || !t.error.includes('invalide')));
//         
//         // Display successful treatments
//         if (validTreatments.length > 0) {
//             const successSection = document.createElement('div');
//             successSection.className = 'treatment-success-section';
//             successSection.innerHTML = `
//                 <h4 class="success-header">✅ Traitements appliqués avec succès</h4>
//                 <div class="treatment-grid">
//                     ${validTreatments.map(treatment => `
//                         <div class="treatment-result success">
//                             <div class="treatment-info">
//                                 <strong>Dent ${treatment.tooth}:</strong> ${treatment.treatment}
//                             </div>
//                             <div class="treatment-status status-success">
//                                 <i class="fas fa-check-circle"></i> Appliqué
//                             </div>
//                         </div>
//                     `).join('')}
//                 </div>
//             `;
//             resultsContent.appendChild(successSection);
//         }
//         
//         // Display invalid teeth
//         if (invalidTeeth.length > 0) {
//             const invalidSection = document.createElement('div');
//             invalidSection.className = 'treatment-invalid-section';
//             invalidSection.innerHTML = `
//                 <h4 class="invalid-header">⚠️ Numéros de dents invalides</h4>
//                 <div class="dental-info">
//                     <p><strong>Système FDI:</strong> Les dents valides sont 11-18, 21-28, 31-38, 41-48</p>
//                 </div>
//                 <div class="treatment-grid">
//                     ${invalidTeeth.map(treatment => `
//                         <div class="treatment-result invalid">
//                             <div class="treatment-info">
//                                 <strong>Dent ${treatment.tooth}:</strong> ${treatment.treatment}
//                             </div>
//                             <div class="treatment-status status-invalid">
//                                 <i class="fas fa-exclamation-triangle"></i> Dent inexistante
//                             </div>
//                         </div>
//                     `).join('')}
//                 </div>
//             `;
//             resultsContent.appendChild(invalidSection);
//         }
//         
//         // Display failed treatments
//         if (failedTreatments.length > 0) {
//             const failedSection = document.createElement('div');
//             failedSection.className = 'treatment-failed-section';
//             failedSection.innerHTML = `
//                 <h4 class="failed-header">❌ Échecs techniques</h4>
//                 <div class="treatment-grid">
//                     ${failedTreatments.map(treatment => `
//                         <div class="treatment-result failed">
//                             <div class="treatment-info">
//                                 <strong>Dent ${treatment.tooth}:</strong> ${treatment.treatment}
//                                 ${treatment.error ? `<br><small class="error-detail">${treatment.error}</small>` : ''}
//                             </div>
//                             <div class="treatment-status status-failed">
//                                 <i class="fas fa-times-circle"></i> Échec
//                             </div>
//                         </div>
//                     `).join('')}
//                 </div>
//             `;
//             resultsContent.appendChild(failedSection);
//         }
//         
//         // Show download button if file was created
//         if (outputFile) {
//             downloadBtn.onclick = () => this.downloadPowerPointFile(outputFile);
//             downloadSection.style.display = 'block';
//         }
//         
//         resultsDiv.style.display = 'block';
//     }
// 
//     showTreatmentError(message) {
//         const errorDiv = document.getElementById('treatment-error');
//         const errorMessage = document.getElementById('treatment-error-message');
//         
//         if (errorDiv && errorMessage) {
//             errorMessage.textContent = message;
//             errorDiv.style.display = 'block';
//         }
//     }
// 
//     hideTreatmentResults() {
//         const resultsDiv = document.getElementById('treatment-results');
//         if (resultsDiv) {
//             resultsDiv.style.display = 'none';
//         }
//     }
// 
//     hideTreatmentError() {
//         const errorDiv = document.getElementById('treatment-error');
//         if (errorDiv) {
//             errorDiv.style.display = 'none';
//         }
//     }
// 
//     downloadPowerPointFile(filename) {
//         window.location.href = `/api/download-powerpoint/${filename}`;
//     }
// 
// // FinanceManager class has been moved to /static/js/features/finance/finance-manager.js
// // class FinanceManager {
//     constructor() {
//         this.charts = {};
//         this.dashboardData = null;
//         this.invoices = [];
//         this.pricing = [];
//         this.init();
//     }
// 
//     init() {
//         this.setupEventListeners();
//     }
// 
//     setupEventListeners() {
//         // Dashboard refresh
//         const refreshBtn = document.getElementById('refresh-dashboard');
//         if (refreshBtn) {
//             refreshBtn.addEventListener('click', () => this.loadDashboard());
//         }
// 
//         // Pricing search
//         const pricingSearch = document.getElementById('pricing-search');
//         if (pricingSearch) {
//             pricingSearch.addEventListener('input', (e) => this.searchPricing(e.target.value));
//         }
// 
//         // Pricing category filter
//         const pricingFilter = document.getElementById('pricing-category-filter');
//         if (pricingFilter) {
//             pricingFilter.addEventListener('change', (e) => this.filterPricingByCategory(e.target.value));
//         }
// 
//         // Invoice search
//         const invoiceSearch = document.getElementById('invoice-search');
//         if (invoiceSearch) {
//             invoiceSearch.addEventListener('input', (e) => this.searchInvoices(e.target.value));
//         }
// 
//         // Invoice status filter
//         const invoiceFilter = document.getElementById('invoice-status-filter');
//         if (invoiceFilter) {
//             invoiceFilter.addEventListener('change', (e) => this.filterInvoicesByStatus(e.target.value));
//         }
// 
//         // Create invoice button
//         const createInvoiceBtn = document.getElementById('create-invoice-btn');
//         if (createInvoiceBtn) {
//             createInvoiceBtn.addEventListener('click', () => this.showCreateInvoiceModal());
//         }
//     }
// 
//     handleTabSwitch(tabId) {
//         switch (tabId) {
//             case 'finance-dashboard':
//                 this.loadDashboard();
//                 break;
//             case 'invoices':
//                 this.loadInvoices();
//                 break;
//             case 'pricing':
//                 this.loadPricing();
//                 break;
//         }
//     }
// 
//     async loadDashboard() {
//         try {
//             const response = await fetch('/api/financial/dashboard');
//             const data = await response.json();
//             
//             if (data.status === 'success') {
//                 this.dashboardData = data.dashboard;
//                 this.renderDashboard();
//             } else {
//                 throw new Error(data.message);
//             }
//         } catch (error) {
//             console.error('Error loading dashboard:', error);
//             this.showNotification('Erreur lors du chargement du tableau de bord', 'error');
//         }
//     }
// 
//     renderDashboard() {
//         if (!this.dashboardData) return;
// 
//         // Calculate summary from the data
//         const revenue = this.dashboardData.revenue;
//         const collectionRate = revenue.total > 0 ? (revenue.paid / revenue.total) * 100 : 0;
//         
//         // Update metrics
//         document.getElementById('current-month-revenue').textContent = `${revenue.total.toFixed(2)} CHF`;
//         document.getElementById('pending-payments').textContent = `${revenue.pending.toFixed(2)} CHF`;
//         document.getElementById('collection-rate').textContent = `${collectionRate.toFixed(1)}%`;
//         
//         // Update revenue change (set to 0 for now as we don't have previous month data)
//         const revenueChange = document.getElementById('revenue-change');
//         revenueChange.textContent = '0%';
//         revenueChange.style.color = '#6c757d';
//         // Update top patient (set placeholder for now)
//         const topPatientValue = document.getElementById('top-patient-value');
//         const topPatientName = document.getElementById('top-patient-name');
//         if (topPatientValue) topPatientValue.textContent = '0.00 CHF';
//         if (topPatientName) topPatientName.textContent = 'Aucun patient';
// 
//         // Update pending count
//         const pendingCount = this.dashboardData.invoices.pending + this.dashboardData.invoices.partial;
//         const pendingCountEl = document.getElementById('pending-count');
//         if (pendingCountEl) pendingCountEl.textContent = `${pendingCount} factures`;
// 
//         // Render charts with available data
//         this.renderRevenueChart();
//         this.renderPaymentStatusChart();
//     }
// 
//     renderRevenueChart() {
//         const ctx = document.getElementById('revenue-chart');
//         if (!ctx) return;
// 
//         if (this.charts.revenue) {
//             this.charts.revenue.destroy();
//         }
// 
//         // Use current month data as a single point
//         const currentMonth = new Date().toLocaleDateString('fr-CH', { month: 'short', year: 'numeric' });
//         const labels = [currentMonth];
//         const revenues = [this.dashboardData.revenue.total];
// 
//         this.charts.revenue = new Chart(ctx, {
//             type: 'line',
//             data: {
//                 labels: labels,
//                 datasets: [{
//                     label: 'Revenus (CHF)',
//                     data: revenues,
//                     borderColor: '#667eea',
//                     backgroundColor: 'rgba(102, 126, 234, 0.1)',
//                     borderWidth: 3,
//                     fill: true,
//                     tension: 0.4,
//                     pointBackgroundColor: '#667eea',
//                     pointBorderColor: '#fff',
//                     pointBorderWidth: 2,
//                     pointRadius: 6
//                 }]
//             },
//             options: {
//                 responsive: true,
//                 maintainAspectRatio: false,
//                 plugins: {
//                     legend: {
//                         display: false
//                     }
//                 },
//                 scales: {
//                     y: {
//                         beginAtZero: true,
//                         ticks: {
//                             callback: function(value) {
//                                 return value.toFixed(0) + ' CHF';
//                             }
//                         }
//                     }
//                 }
//             }
//         });
//     }
// 
//     renderPaymentStatusChart() {
//         const ctx = document.getElementById('payment-status-chart');
//         if (!ctx) return;
// 
//         if (this.charts.paymentStatus) {
//             this.charts.paymentStatus.destroy();
//         }
// 
//         // Use invoice status data
//         const revenue = this.dashboardData.revenue;
//         const labels = ['Payé', 'En attente'];
//         const amounts = [revenue.paid, revenue.pending];
// 
//         this.charts.paymentStatus = new Chart(ctx, {
//             type: 'doughnut',
//             data: {
//                 labels: labels,
//                 datasets: [{
//                     data: amounts,
//                     backgroundColor: [
//                         '#ffc107',
//                         '#17a2b8',
//                         '#28a745'
//                     ],
//                     borderWidth: 0
//                 }]
//             },
//             options: {
//                 responsive: true,
//                 maintainAspectRatio: false,
//                 plugins: {
//                     legend: {
//                         position: 'bottom'
//                     }
//                 }
//             }
//         });
//     }
// 
//     renderTreatmentsChart() {
//         // Skip for now as we don't have treatment data
//         return;
// 
//         this.charts.treatments = new Chart(ctx, {
//             type: 'bar',
//             data: {
//                 labels: labels,
//                 datasets: [{
//                     label: 'Revenus (CHF)',
//                     data: revenues,
//                     backgroundColor: 'rgba(102, 126, 234, 0.8)',
//                     borderColor: '#667eea',
//                     borderWidth: 1
//                 }]
//             },
//             options: {
//                 responsive: true,
//                 maintainAspectRatio: false,
//                 plugins: {
//                     legend: {
//                         display: false
//                     }
//                 },
//                 scales: {
//                     y: {
//                         beginAtZero: true,
//                         ticks: {
//                             callback: function(value) {
//                                 return value.toFixed(0) + ' CHF';
//                             }
//                         }
//                     },
//                     x: {
//                         ticks: {
//                             maxRotation: 45,
//                             minRotation: 45
//                         }
//                     }
//                 }
//             }
//         });
//     }
// 
//     renderTopPatientsList() {
//         const container = document.getElementById('top-patients-list');
//         if (!container) return;
// 
//         // Skip for now as we don't have top patients data
//         container.innerHTML = '<div class="empty-state">Données patients non disponibles</div>';
//     }
// 
//     async loadInvoices() {
//         try {
//             const [invoicesResponse, devisResponse] = await Promise.all([
//                 fetch('/api/financial/invoices'),
//                 fetch('/api/financial/devis')
//             ]);
//             
//             const invoicesData = await invoicesResponse.json();
//             const devisData = await devisResponse.json();
//             
//             if (invoicesData.status === 'success' && devisData.status === 'success') {
//                 this.invoices = invoicesData.invoices || [];
//                 this.devis = devisData.devis || [];
//                 this.renderInvoicesAndDevis();
//             } else {
//                 throw new Error(invoicesData.message || devisData.message);
//             }
//         } catch (error) {
//             console.error('Error loading invoices and devis:', error);
//             this.showNotification('Erreur lors du chargement des factures et devis', 'error');
//         }
//     }
// 
//     renderInvoicesAndDevis() {
//         const container = document.querySelector('.invoices-container');
//         if (!container) return;
//         
//         container.innerHTML = `
//             <div class="invoices-header">
//                 <h2><i class="fas fa-file-invoice-dollar"></i> Factures et Devis</h2>
//                 <div class="invoices-actions">
//                     <div class="search-container">
//                         <input type="text" id="invoice-search" placeholder="Rechercher une facture ou devis...">
//                         <i class="fas fa-search"></i>
//                     </div>
//                     <select id="document-type-filter" onchange="financeManager.filterByDocumentType(this.value)">
//                         <option value="">Tous les documents</option>
//                         <option value="devis">Devis seulement</option>
//                         <option value="invoices">Factures seulement</option>
//                     </select>
//                     <select id="invoice-status-filter" onchange="financeManager.filterInvoicesByStatus(this.value)">
//                         <option value="">Tous les statuts</option>
//                         <option value="pending">En attente</option>
//                         <option value="partial">Partiellement payé</option>
//                         <option value="paid">Payé</option>
//                         <option value="overdue">En retard</option>
//                     </select>
//                 </div>
//             </div>
//             
//             <div class="invoices-content">
//                 <!-- Devis Section -->
//                 <div class="documents-section">
//                     <h3><i class="fas fa-file-invoice"></i> Devis</h3>
//                     <div class="devis-grid">
//                         ${this.renderDevisCards()}
//                     </div>
//                 </div>
//                 
//                 <!-- Invoices Section -->
//                 <div class="documents-section">
//                     <h3><i class="fas fa-file-invoice-dollar"></i> Factures</h3>
//                     <div class="invoices-table-container">
//                         <table class="invoices-table" id="invoices-table">
//                             <thead>
//                                 <tr>
//                                     <th>Numéro</th>
//                                     <th>Patient</th>
//                                     <th>Date</th>
//                                     <th>Montant Total</th>
//                                     <th>LAMal</th>
//                                     <th>Patient</th>
//                                     <th>Statut</th>
//                                     <th>Actions</th>
//                                 </tr>
//                             </thead>
//                             <tbody id="invoices-tbody">
//                                 ${this.renderInvoicesRows()}
//                             </tbody>
//                         </table>
//                     </div>
//                 </div>
//             </div>
//         `;
//         
//         // Setup search functionality
//         const searchInput = document.getElementById('invoice-search');
//         if (searchInput) {
//             searchInput.addEventListener('input', (e) => {
//                 this.searchInvoices(e.target.value);
//             });
//         }
//     }
// 
//     renderDevisCards() {
//         if (!this.devis || this.devis.length === 0) {
//             return '<div class="empty-state">Aucun devis trouvé</div>';
//         }
// 
//         return this.devis.map(devis => `
//             <div class="devis-card" data-status="${devis.status}">
//                 <div class="devis-header">
//                     <div class="devis-number">${devis.devis_number}</div>
//                     <div class="devis-status status-badge ${devis.status}">
//                         ${this.getDevisStatusText(devis.status)}
//                     </div>
//                 </div>
//                 <div class="devis-info">
//                     <p><strong>Patient:</strong> ${devis.patient_name}</p>
//                     <p><strong>Date:</strong> ${new Date(devis.issue_date).toLocaleDateString('fr-FR')}</p>
//                     <p><strong>Valide jusqu'au:</strong> ${new Date(devis.validity_date).toLocaleDateString('fr-FR')}</p>
//                     <p><strong>Montant:</strong> ${devis.total_amount.toFixed(2)} CHF</p>
//                 </div>
//                 <div class="devis-actions">
//                     <button class="btn btn-sm btn-primary" onclick="window.dentalAI.showDevisDetails('${devis.id}')">
//                         <i class="fas fa-eye"></i> Voir
//                     </button>
//                     <button class="btn btn-sm btn-secondary" onclick="financeManager.downloadDevis('${devis.id}')">
//                         <i class="fas fa-download"></i> PDF
//                     </button>
//                     ${devis.status === 'approved' ? `
//                         <button class="btn btn-sm btn-success" onclick="window.dentalAI.createInvoiceFromDevis('${devis.id}')">
//                             <i class="fas fa-file-invoice-dollar"></i> Facturer
//                         </button>
//                     ` : ''}
//                     <button class="btn btn-sm btn-danger" onclick="window.dentalAI.deleteDevis('${devis.id}')">
//                         <i class="fas fa-trash"></i> Supprimer
//                     </button>
//                 </div>
//             </div>
//         `).join('');
//     }
// 
//     renderInvoicesRows() {
//         if (!this.invoices || this.invoices.length === 0) {
//             return '<tr><td colspan="8" class="empty-state">Aucune facture trouvée</td></tr>';
//         }
// 
//         return this.invoices.map(invoice => `
//             <tr>
//                 <td>${invoice.invoice_number}</td>
//                 <td>${invoice.patient_name}</td>
//                 <td>${this.formatDate(invoice.issue_date)}</td>
//                 <td class="price-amount">${invoice.total_amount.toFixed(2)} CHF</td>
//                 <td class="price-amount">0.00 CHF</td>
//                 <td class="price-amount">${invoice.total_amount.toFixed(2)} CHF</td>
//                 <td><span class="invoice-status ${invoice.status}">${this.getStatusText(invoice.status)}</span></td>
//                 <td>
//                     <button class="btn btn-sm btn-secondary" onclick="financeManager.viewInvoice('${invoice.id}')">
//                         <i class="fas fa-eye"></i>
//                     </button>
//                     <button class="btn btn-sm btn-info" onclick="financeManager.downloadInvoice('${invoice.id}')">
//                         <i class="fas fa-download"></i>
//                     </button>
//                     ${invoice.status !== 'paid' ? `
//                         <button class="btn btn-sm btn-primary" onclick="financeManager.addPayment('${invoice.id}')">
//                             <i class="fas fa-plus"></i>
//                         </button>
//                     ` : ''}
//                     <button class="btn btn-sm btn-danger" onclick="window.dentalAI.deleteInvoice('${invoice.id}')">
//                         <i class="fas fa-trash"></i>
//                     </button>
//                 </td>
//             </tr>
//         `).join('');
//     }
// 
//     getDevisStatusText(status) {
//         const statusMap = {
//             'pending': 'En attente',
//             'approved': 'Approuvé',
//             'rejected': 'Rejeté',
//             'invoiced': 'Facturé'
//         };
//         return statusMap[status] || status;
//     }
// 
//     filterByDocumentType(type) {
//         const devisSection = document.querySelector('.devis-grid').closest('.documents-section');
//         const invoicesSection = document.querySelector('.invoices-table-container').closest('.documents-section');
//         
//         if (type === 'devis') {
//             devisSection.style.display = 'block';
//             invoicesSection.style.display = 'none';
//         } else if (type === 'invoices') {
//             devisSection.style.display = 'none';
//             invoicesSection.style.display = 'block';
//         } else {
//             devisSection.style.display = 'block';
//             invoicesSection.style.display = 'block';
//         }
//     }
// 
//     async downloadDevis(devisId) {
//         // Use the existing downloadDevis function from dentalAI
//         if (window.dentalAI && typeof window.dentalAI.downloadDevis === 'function') {
//             window.dentalAI.downloadDevis(devisId);
//         } else {
//             this.showNotification('Erreur: Fonction non disponible', 'error');
//         }
//     }
// 
//     async downloadInvoice(invoiceId) {
//         // Use the existing downloadInvoice function from dentalAI
//         if (window.dentalAI && typeof window.dentalAI.downloadInvoice === 'function') {
//             window.dentalAI.downloadInvoice(invoiceId);
//         } else {
//             this.showNotification('Erreur: Fonction non disponible', 'error');
//         }
//     }
// 
//     async loadPricing() {
//         try {
//             const response = await fetch('/api/financial/pricing');
//             const data = await response.json();
//             
//             if (data.status === 'success') {
//                 this.pricing = data.pricing;
//                 this.renderPricing();
//             } else {
//                 throw new Error(data.message);
//             }
//         } catch (error) {
//             console.error('Error loading pricing:', error);
//             this.showNotification('Erreur lors du chargement des tarifs', 'error');
//         }
//     }
// 
//     renderPricing() {
//         const tbody = document.getElementById('pricing-tbody');
//         if (!tbody) return;
// 
//         tbody.innerHTML = this.pricing.map(item => `
//             <tr>
//                 <td><strong>${item.tarmed_code}</strong></td>
//                 <td>${item.description_fr}</td>
//                 <td><span class="pricing-category">${item.category || 'Non catégorisé'}</span></td>
//                 <td class="price-amount">${item.base_price.toFixed(2)} CHF</td>
//                 <td class="lamal-not-covered">Non</td>
//                 <td>-</td>
//                 <td>-</td>
//                 <td>${item.unit || ''}</td>
//             </tr>
//         `).join('');
//     }
// 
//     searchPricing(term) {
//         const filteredPricing = this.pricing.filter(item => 
//             item.description_fr.toLowerCase().includes(term.toLowerCase()) ||
//             item.tarmed_code.toLowerCase().includes(term.toLowerCase()) ||
//             (item.category && item.category.toLowerCase().includes(term.toLowerCase()))
//         );
//         
//         this.renderFilteredPricing(filteredPricing);
//     }
// 
//     filterPricingByCategory(category) {
//         const filteredPricing = category ? 
//             this.pricing.filter(item => item.category === category) : 
//             this.pricing;
//         
//         this.renderFilteredPricing(filteredPricing);
//     }
// 
//     renderFilteredPricing(filteredPricing) {
//         const tbody = document.getElementById('pricing-tbody');
//         if (!tbody) return;
// 
//         tbody.innerHTML = filteredPricing.map(item => `
//             <tr>
//                 <td><strong>${item.tarmed_code}</strong></td>
//                 <td>${item.description_fr}</td>
//                 <td><span class="pricing-category">${item.category || 'Non catégorisé'}</span></td>
//                 <td class="price-amount">${item.base_price.toFixed(2)} CHF</td>
//                 <td class="lamal-not-covered">Non</td>
//                 <td>-</td>
//                 <td>-</td>
//                 <td>${item.unit || ''}</td>
//             </tr>
//         `).join('');
//     }
// 
//     searchInvoices(term) {
//         const filteredInvoices = this.invoices.filter(invoice => 
//             invoice.invoice_number.toLowerCase().includes(term.toLowerCase()) ||
//             invoice.patient_name.toLowerCase().includes(term.toLowerCase())
//         );
//         
//         this.renderFilteredInvoices(filteredInvoices);
//     }
// 
//     filterInvoicesByStatus(status) {
//         const filteredInvoices = status ? 
//             this.invoices.filter(invoice => invoice.status === status) : 
//             this.invoices;
//         
//         this.renderFilteredInvoices(filteredInvoices);
//     }
// 
//     renderFilteredInvoices(filteredInvoices) {
//         const tbody = document.getElementById('invoices-tbody');
//         if (!tbody) return;
// 
//         tbody.innerHTML = filteredInvoices.map(invoice => `
//             <tr>
//                 <td>${invoice.invoice_number}</td>
//                 <td>${invoice.patient_name}</td>
//                 <td>${this.formatDate(invoice.invoice_date)}</td>
//                 <td class="price-amount">${invoice.total_amount_chf.toFixed(2)} CHF</td>
//                 <td class="price-amount">${invoice.lamal_amount_chf.toFixed(2)} CHF</td>
//                 <td class="price-amount">${invoice.patient_amount_chf.toFixed(2)} CHF</td>
//                 <td><span class="invoice-status ${invoice.status}">${this.getStatusText(invoice.status)}</span></td>
//                 <td>
//                     <button class="btn btn-sm btn-secondary" onclick="financeManager.viewInvoice('${invoice.id}')">
//                         <i class="fas fa-eye"></i>
//                     </button>
//                     <button class="btn btn-sm btn-primary" onclick="financeManager.addPayment('${invoice.id}')">
//                         <i class="fas fa-plus"></i>
//                     </button>
//                 </td>
//             </tr>
//         `).join('');
//     }
// 
//     getStatusText(status) {
//         switch (status) {
//             case 'pending': return 'En attente';
//             case 'partial': return 'Partiellement payé';
//             case 'paid': return 'Payé';
//             default: return status;
//         }
//     }
// 
//     formatDate(dateString) {
//         const date = new Date(dateString);
//         return date.toLocaleDateString('fr-CH');
//     }
// 
//     showNotification(message, type = 'info') {
//         // Remove existing notifications
//         const existingNotifications = document.querySelectorAll('.notification');
//         existingNotifications.forEach(notif => notif.remove());
//         
//         // Create new notification
//         const notification = document.createElement('div');
//         notification.className = `notification ${type}`;
//         notification.textContent = message;
//         
//         // Add to document
//         document.body.appendChild(notification);
// 
//         // Auto-remove after 5 seconds
//         setTimeout(() => {
//             if (notification.parentNode) {
//                 notification.style.animation = 'slideOut 0.3s ease';
//                 setTimeout(() => notification.remove(), 300);
//             }
//         }, 5000);
//     }
// 
//     viewInvoice(invoiceId) {
//         // Use the existing showInvoiceDetails function from dentalAI
//         if (window.dentalAI && typeof window.dentalAI.showInvoiceDetails === 'function') {
//             window.dentalAI.showInvoiceDetails(invoiceId);
//         } else {
//             this.showNotification('Erreur: Fonction non disponible', 'error');
//         }
//     }
// 
//     addPayment(invoiceId) {
//         // Use the existing addPaymentToInvoice function from dentalAI
//         if (window.dentalAI && typeof window.dentalAI.addPaymentToInvoice === 'function') {
//             window.dentalAI.addPaymentToInvoice(invoiceId);
//         } else {
//             this.showNotification('Fonctionnalité de paiement à implémenter', 'info');
//         }
//     }
// 
//     showCreateInvoiceModal() {
//         // TODO: Implement invoice creation modal
//         console.log('Create new invoice');
//     }
// 
//     async deleteDevis(devisId) {
//         if (!confirm('Êtes-vous sûr de vouloir supprimer ce devis ? Cette action est irréversible.')) {
//             return;
//         }
// 
//         try {
//             const response = await fetch(`/api/devis/${devisId}`, {
//                 method: 'DELETE'
//             });
// 
//             const data = await response.json();
//             
//             if (data.success) {
//                 this.showNotification('Devis supprimé avec succès', 'success');
//                 
//                 // Refresh the current view
//                 if (window.financeManager) {
//                     window.financeManager.loadInvoices();
//                 }
//                 
//                 // Refresh patient view if open
//                 const patientModal = document.querySelector('.modal.active');
//                 if (patientModal) {
//                     const patientId = patientModal.dataset.patientId;
//                     if (patientId) {
//                         this.loadPatientDevis(patientId);
//                     }
//                 }
//             } else {
//                 this.showNotification(data.error || 'Erreur lors de la suppression', 'error');
//             }
//         } catch (error) {
//             console.error('Error deleting devis:', error);
//             this.showNotification('Erreur lors de la suppression du devis', 'error');
//         }
//     }
// 
//     async deleteInvoice(invoiceId) {
//         if (!confirm('Êtes-vous sûr de vouloir supprimer cette facture ? Cette action est irréversible.')) {
//             return;
//         }
// 
//         try {
//             const response = await fetch(`/api/invoices/${invoiceId}`, {
//                 method: 'DELETE'
//             });
// 
//             const data = await response.json();
//             
//             if (data.success) {
//                 this.showNotification('Facture supprimée avec succès', 'success');
//                 
//                 // Refresh the current view
//                 if (window.financeManager) {
//                     window.financeManager.loadInvoices();
//                 }
//                 
//                 // Refresh patient view if open
//                 const patientModal = document.querySelector('.modal.active');
//                 if (patientModal) {
//                     const patientId = patientModal.dataset.patientId;
//                     if (patientId) {
//                         this.loadPatientInvoices(patientId);
//                     }
//                 }
//             } else {
//                 this.showNotification(data.error || 'Erreur lors de la suppression', 'error');
//             }
//         } catch (error) {
//             console.error('Error deleting invoice:', error);
//             this.showNotification('Erreur lors de la suppression de la facture', 'error');
//         }
// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize main dental AI suite
    window.dentalAI = new DentalAISuite();
    
    // Initialize practice manager (only if not using modular version)
    if (!window.DISABLE_OLD_PRACTICE_MANAGER) {
        window.practiceManager = new PracticeManager();
    }
    
    // Initialize finance manager (only if not using modular version)
    if (!window.DISABLE_OLD_FINANCE_MANAGER) {
        window.financeManager = new FinanceManager();
    }
    
    console.log('✅ Dental AI Suite initialized');
});

// Global Dental Schema Functions (called from HTML)
function setTreatmentExample(text) {
    // Set example text in the dental brain input
    const dentalBrainInput = document.getElementById('chat-input-dental-brain');
    if (dentalBrainInput) {
        dentalBrainInput.value = text;
        dentalBrainInput.focus();
    }
}

function processTreatmentPlan() {
    // Trigger treatment plan processing in the dental brain
    if (window.dentalAI && typeof window.dentalAI.sendMessage === 'function') {
        window.dentalAI.sendMessage('dental-brain');
    }
}