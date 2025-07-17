/**
 * Finance Manager Module
 * Handles financial dashboard, invoicing, and pricing management
 */
class FinanceManager {
    constructor() {
        this.charts = {};
        this.dashboardData = null;
        this.invoices = [];
        this.pricing = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Dashboard refresh
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadDashboard());
        }

        // Pricing search
        const pricingSearch = document.getElementById('pricing-search');
        if (pricingSearch) {
            pricingSearch.addEventListener('input', (e) => this.searchPricing(e.target.value));
        }

        // Pricing category filter
        const pricingFilter = document.getElementById('pricing-category-filter');
        if (pricingFilter) {
            pricingFilter.addEventListener('change', (e) => this.filterPricingByCategory(e.target.value));
        }

        // Invoice search
        const invoiceSearch = document.getElementById('invoice-search');
        if (invoiceSearch) {
            invoiceSearch.addEventListener('input', (e) => this.searchInvoices(e.target.value));
        }

        // Invoice status filter
        const invoiceFilter = document.getElementById('invoice-status-filter');
        if (invoiceFilter) {
            invoiceFilter.addEventListener('change', (e) => this.filterInvoicesByStatus(e.target.value));
        }

        // Create invoice button
        const createInvoiceBtn = document.getElementById('create-invoice-btn');
        if (createInvoiceBtn) {
            createInvoiceBtn.addEventListener('click', () => this.showCreateInvoiceModal());
        }
    }

    handleTabSwitch(tabId) {
        switch (tabId) {
            case 'finance-dashboard':
                this.loadDashboard();
                break;
            case 'invoices':
                this.loadInvoices();
                break;
            case 'pricing':
                this.loadPricing();
                break;
        }
    }

    async loadDashboard() {
        try {
            const response = await fetch('/api/financial/dashboard');
            const data = await response.json();
            
            if (data.status === 'success') {
                this.dashboardData = data.dashboard;
                this.renderDashboard();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.showNotification('Erreur lors du chargement du tableau de bord', 'error');
        }
    }

    renderDashboard() {
        if (!this.dashboardData) return;

        // Calculate summary from the data
        const revenue = this.dashboardData.revenue;
        const collectionRate = revenue.total > 0 ? (revenue.paid / revenue.total) * 100 : 0;
        
        // Update metrics
        document.getElementById('current-month-revenue').textContent = `${revenue.total.toFixed(2)} CHF`;
        document.getElementById('pending-payments').textContent = `${revenue.pending.toFixed(2)} CHF`;
        document.getElementById('collection-rate').textContent = `${collectionRate.toFixed(1)}%`;
        
        // Update revenue change (set to 0 for now as we don't have previous month data)
        const revenueChange = document.getElementById('revenue-change');
        revenueChange.textContent = '0%';
        revenueChange.style.color = '#6c757d';
        // Update top patient (set placeholder for now)
        const topPatientValue = document.getElementById('top-patient-value');
        topPatientValue.textContent = '0.00 CHF';
        
        // Create revenue chart
        this.createRevenueChart();
        
        // Create payment status chart
        this.createPaymentStatusChart();
    }

    createRevenueChart() {
        const ctx = document.getElementById('revenue-chart');
        if (!ctx) return;

        // Destroy existing chart if any
        if (this.charts.revenue) {
            this.charts.revenue.destroy();
        }

        // Generate sample data for last 30 days
        const labels = [];
        const data = [];
        const today = new Date();
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }));
            
            // Use actual data if available, otherwise 0
            data.push(0);
        }

        this.charts.revenue = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Revenus (CHF)',
                    data: data,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(0) + ' CHF';
                            }
                        }
                    }
                }
            }
        });
    }

    createPaymentStatusChart() {
        const ctx = document.getElementById('payment-status-chart');
        if (!ctx) return;

        // Destroy existing chart if any
        if (this.charts.paymentStatus) {
            this.charts.paymentStatus.destroy();
        }

        const revenue = this.dashboardData.revenue;

        this.charts.paymentStatus = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Payé', 'En attente'],
                datasets: [{
                    data: [revenue.paid, revenue.pending],
                    backgroundColor: ['#28a745', '#ffc107']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    async loadPricing() {
        try {
            const response = await fetch('/api/pricing');
            const data = await response.json();
            
            if (data.status === 'success') {
                this.pricing = data.pricing;
                this.renderPricing();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error loading pricing:', error);
            this.showNotification('Erreur lors du chargement des tarifs', 'error');
        }
    }

    renderPricing(pricingList = null) {
        const container = document.getElementById('pricing-list');
        if (!container) return;

        const pricing = pricingList || this.pricing;

        if (pricing.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tags"></i>
                    <p>Aucun tarif trouvé</p>
                </div>
            `;
            return;
        }

        container.innerHTML = pricing.map(item => `
            <div class="pricing-card">
                <div class="pricing-card-header">
                    <h3 class="pricing-name">${item.name}</h3>
                    <div class="pricing-price">${item.price.toFixed(2)} CHF</div>
                </div>
                <div class="pricing-details">
                    <div class="pricing-code">Code: ${item.code}</div>
                    <div class="pricing-category">${item.category}</div>
                </div>
                ${item.description ? `<div class="pricing-description">${item.description}</div>` : ''}
                <div class="pricing-actions">
                    <button class="btn btn-sm btn-secondary" onclick="financeManager.editPricing('${item.id}')">
                        <i class="fas fa-edit"></i> Modifier
                    </button>
                </div>
            </div>
        `).join('');
    }

    searchPricing(searchTerm) {
        const filtered = this.pricing.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        this.renderPricing(filtered);
    }

    filterPricingByCategory(category) {
        if (category === 'all') {
            this.renderPricing();
        } else {
            const filtered = this.pricing.filter(item => item.category === category);
            this.renderPricing(filtered);
        }
    }

    editPricing(pricingId) {
        // TODO: Implement pricing edit modal
        console.log('Edit pricing:', pricingId);
        this.showNotification('Fonction de modification en cours de développement', 'info');
    }

    async loadInvoices() {
        try {
            const response = await fetch('/api/invoices');
            const data = await response.json();
            
            if (data.status === 'success') {
                this.invoices = data.invoices;
                this.renderInvoices();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error loading invoices:', error);
            this.showNotification('Erreur lors du chargement des factures', 'error');
        }
    }

    renderInvoices(invoiceList = null) {
        const container = document.getElementById('invoices-list');
        if (!container) return;

        const invoices = invoiceList || this.invoices;

        if (invoices.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-invoice"></i>
                    <p>Aucune facture trouvée</p>
                </div>
            `;
            return;
        }

        container.innerHTML = invoices.map(invoice => {
            const statusClass = invoice.status === 'paid' ? 'status-paid' : 
                               invoice.status === 'pending' ? 'status-pending' : 
                               'status-overdue';
            const statusText = invoice.status === 'paid' ? 'Payée' : 
                              invoice.status === 'pending' ? 'En attente' : 
                              'En retard';

            return `
                <div class="invoice-card">
                    <div class="invoice-card-header">
                        <div>
                            <h3 class="invoice-number">#${invoice.number}</h3>
                            <div class="invoice-patient">${invoice.patient_name}</div>
                        </div>
                        <div class="invoice-amount">${invoice.total.toFixed(2)} CHF</div>
                    </div>
                    <div class="invoice-details">
                        <div class="invoice-date">
                            <i class="fas fa-calendar"></i> ${this.formatDate(invoice.date)}
                        </div>
                        <div class="invoice-status ${statusClass}">${statusText}</div>
                    </div>
                    <div class="invoice-actions">
                        <button class="btn btn-sm btn-primary" onclick="financeManager.viewInvoice('${invoice.id}')">
                            <i class="fas fa-eye"></i> Voir
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="financeManager.downloadInvoice('${invoice.id}')">
                            <i class="fas fa-download"></i> PDF
                        </button>
                        ${invoice.status !== 'paid' ? `
                            <button class="btn btn-sm btn-success" onclick="financeManager.markInvoiceAsPaid('${invoice.id}')">
                                <i class="fas fa-check"></i> Marquer payée
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    searchInvoices(searchTerm) {
        const filtered = this.invoices.filter(invoice => 
            invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            invoice.patient_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        this.renderInvoices(filtered);
    }

    filterInvoicesByStatus(status) {
        if (status === 'all') {
            this.renderInvoices();
        } else {
            const filtered = this.invoices.filter(invoice => invoice.status === status);
            this.renderInvoices(filtered);
        }
    }

    showCreateInvoiceModal() {
        // TODO: Implement invoice creation modal
        console.log('Create new invoice');
        this.showNotification('Fonction de création de facture en cours de développement', 'info');
    }

    viewInvoice(invoiceId) {
        const invoice = this.invoices.find(inv => inv.id === invoiceId);
        if (!invoice) return;

        // TODO: Implement invoice view modal
        console.log('View invoice:', invoice);
        this.showNotification('Fonction de visualisation en cours de développement', 'info');
    }

    async downloadInvoice(invoiceId) {
        try {
            const response = await fetch(`/api/invoices/${invoiceId}/download`);
            
            if (!response.ok) {
                throw new Error('Erreur lors du téléchargement');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `facture-${invoiceId}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            this.showNotification('Facture téléchargée avec succès', 'success');
        } catch (error) {
            console.error('Error downloading invoice:', error);
            this.showNotification('Erreur lors du téléchargement de la facture', 'error');
        }
    }

    async markInvoiceAsPaid(invoiceId) {
        try {
            const response = await fetch(`/api/invoices/${invoiceId}/mark-paid`, {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                this.loadInvoices();
                this.showNotification('Facture marquée comme payée', 'success');
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error marking invoice as paid:', error);
            this.showNotification('Erreur lors de la mise à jour de la facture', 'error');
        }
    }

    async deleteInvoice(invoiceId) {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette facture?')) return;

        try {
            const response = await fetch(`/api/invoices/${invoiceId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                this.loadInvoices();
                this.showNotification('Facture supprimée avec succès', 'success');
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error deleting invoice:', error);
            this.showNotification('Erreur lors de la suppression de la facture', 'error');
        }
    }

    formatDate(date) {
        if (!date) return '';
        return new Date(date).toLocaleDateString('fr-FR', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
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
}

// Export the class
window.FinanceManager = FinanceManager;