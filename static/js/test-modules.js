/**
 * Test script to verify modular components are loading correctly
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('🧪 Testing Modular Components...');
    
    // Test API Client
    if (window.apiClient) {
        console.log('✅ API Client loaded successfully');
        console.log('   Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.apiClient)));
    } else {
        console.error('❌ API Client not found');
    }
    
    // Test Utils
    if (window.utils) {
        console.log('✅ Utils loaded successfully');
        console.log('   Available functions:', Object.keys(window.utils));
    } else {
        console.error('❌ Utils not found');
    }
    
    // Test DentalBrainChat
    if (window.DentalBrainChat) {
        console.log('✅ DentalBrainChat class loaded successfully');
    } else {
        console.error('❌ DentalBrainChat class not found');
    }
    
    // Test if old app still works
    if (window.dentalAISuite) {
        console.log('✅ Original DentalAISuite still functional');
    }
    
    console.log('🔍 Migration status:', window.getMigrationStatus ? window.getMigrationStatus() : 'getMigrationStatus not available');
});