/**
 * App Loader - Gradual migration from monolithic to modular architecture
 * This file loads new modular components while keeping old functionality intact
 */

// Flag to enable/disable new modular features
const USE_MODULAR_FEATURES = {
    dentalBrain: false, // Set to true to use new modular dental-brain
    api: true,          // Use new API client
    utils: true         // Use new utilities
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
    
    // Log migration status
    console.log('📊 Migration Status:', {
        'API Client': USE_MODULAR_FEATURES.api ? '✅ New' : '⚠️ Old',
        'Utilities': USE_MODULAR_FEATURES.utils ? '✅ New' : '⚠️ Old',
        'Dental Brain': USE_MODULAR_FEATURES.dentalBrain ? '✅ New' : '⚠️ Old'
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