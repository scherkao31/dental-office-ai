/**
 * App Loader - Gradual migration from monolithic to modular architecture
 * This file loads new modular components while keeping old functionality intact
 */

// Flag to enable/disable new modular features
const USE_MODULAR_FEATURES = {
    dentalBrain: false, // Set to true to use new modular dental-brain
    api: true,          // Use new API client
    utils: true,        // Use new utilities
    practice: true,     // Use new practice manager (patients & schedule)
    finance: true       // Use new finance manager
};

// Load new modules
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 App Loader: Initializing modular components...');
    
    // Initialize API client globally (for backward compatibility)
    if (USE_MODULAR_FEATURES.api && window.APIClient) {
        window.apiClient = new APIClient();
        console.log('✅ API Client initialized');
    }
    
    // Initialize utilities globally
    if (USE_MODULAR_FEATURES.utils && window.utils) {
        console.log('✅ Utilities loaded');
    }
    
    // Initialize modular dental brain if enabled
    if (USE_MODULAR_FEATURES.dentalBrain && window.DentalBrainChat) {
        // Find dental-brain container
        const dentalBrainContainer = document.getElementById('dental-brain');
        
        if (dentalBrainContainer) {
            // Disable old dental brain initialization
            window.DISABLE_OLD_DENTAL_BRAIN = true;
            
            // Initialize new modular version
            window.dentalBrainModule = new DentalBrainChat(
                dentalBrainContainer,
                window.apiClient,
                window.utils
            );
            
            console.log('✅ Modular Dental Brain initialized');
        }
    }
    
    // Initialize modular practice manager if enabled
    if (USE_MODULAR_FEATURES.practice && window.PracticeManager) {
        // Disable old practice manager initialization
        window.DISABLE_OLD_PRACTICE_MANAGER = true;
        
        // Wait a bit for dentalAI to be initialized
        setTimeout(() => {
            // Initialize new modular version with reference to dentalAISuite
            window.practiceManager = new PracticeManager(window.dentalAI);
            
            console.log('✅ Modular Practice Manager initialized');
        }, 100);
    }
    
    // Initialize modular finance manager if enabled
    if (USE_MODULAR_FEATURES.finance && window.FinanceManager) {
        // Disable old finance manager initialization
        window.DISABLE_OLD_FINANCE_MANAGER = true;
        
        // Initialize new modular version
        window.financeManager = new FinanceManager();
        
        console.log('✅ Modular Finance Manager initialized');
    }
    
    // Log migration status
    console.log('📊 Migration Status:', {
        'API Client': USE_MODULAR_FEATURES.api ? '✅ New' : '⚠️ Old',
        'Utilities': USE_MODULAR_FEATURES.utils ? '✅ New' : '⚠️ Old',
        'Dental Brain': USE_MODULAR_FEATURES.dentalBrain ? '✅ New' : '⚠️ Old',
        'Practice Manager': USE_MODULAR_FEATURES.practice ? '✅ New' : '⚠️ Old',
        'Finance Manager': USE_MODULAR_FEATURES.finance ? '✅ New' : '⚠️ Old'
    });
});

// Helper function to gradually migrate features
window.enableModularFeature = function(feature) {
    if (feature in USE_MODULAR_FEATURES) {
        USE_MODULAR_FEATURES[feature] = true;
        console.log(`✅ Enabled modular ${feature}. Refresh page to apply.`);
        return true;
    }
    console.error(`❌ Unknown feature: ${feature}`);
    return false;
};

// Helper to check migration status
window.getMigrationStatus = function() {
    return USE_MODULAR_FEATURES;
};