/**
 * Test script to verify modular components are loading correctly
 */
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for all modules to initialize
    setTimeout(() => {
        console.log('🧪 Testing Modular Components...');
        
        let passedTests = 0;
        let totalTests = 0;
        
        // Test API Client
        totalTests++;
        if (window.apiClient) {
            console.log('✅ API Client loaded successfully');
            console.log('   Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.apiClient)));
            passedTests++;
        } else {
            console.error('❌ API Client not found');
        }
        
        // Test Utils
        totalTests++;
        if (window.utils) {
            console.log('✅ Utils loaded successfully');
            console.log('   Available functions:', Object.keys(window.utils));
            passedTests++;
        } else {
            console.error('❌ Utils not found');
        }
        
        // Test DentalBrainChat
        totalTests++;
        if (window.DentalBrainChat) {
            console.log('✅ DentalBrainChat class loaded successfully');
            passedTests++;
        } else {
            console.error('❌ DentalBrainChat class not found');
        }
        
        // Test PracticeManager
        totalTests++;
        if (window.PracticeManager) {
            console.log('✅ PracticeManager class loaded successfully');
            passedTests++;
        } else {
            console.error('❌ PracticeManager class not found');
        }
        
        // Test FinanceManager
        totalTests++;
        if (window.FinanceManager) {
            console.log('✅ FinanceManager class loaded successfully');
            passedTests++;
        } else {
            console.error('❌ FinanceManager class not found');
        }
        
        // Test instances
        totalTests++;
        if (window.dentalAI) {
            console.log('✅ dentalAI instance initialized');
            passedTests++;
        } else {
            console.error('❌ dentalAI instance not found');
        }
        
        totalTests++;
        if (window.practiceManager) {
            console.log('✅ practiceManager instance initialized');
            passedTests++;
        } else {
            console.error('❌ practiceManager instance not found');
        }
        
        totalTests++;
        if (window.financeManager) {
            console.log('✅ financeManager instance initialized');
            passedTests++;
        } else {
            console.error('❌ financeManager instance not found');
        }
        
        console.log('\n📊 Test Summary:');
        console.log(`Passed: ${passedTests}/${totalTests}`);
        console.log(`Success Rate: ${(passedTests/totalTests * 100).toFixed(1)}%`);
        
        console.log('\n🔍 Migration status:', window.getMigrationStatus ? window.getMigrationStatus() : 'getMigrationStatus not available');
        
        // Additional diagnostics
        console.log('\n🔧 Module Loading Flags:');
        console.log('DISABLE_OLD_PRACTICE_MANAGER:', window.DISABLE_OLD_PRACTICE_MANAGER);
        console.log('DISABLE_OLD_FINANCE_MANAGER:', window.DISABLE_OLD_FINANCE_MANAGER);
        console.log('DISABLE_OLD_DENTAL_BRAIN:', window.DISABLE_OLD_DENTAL_BRAIN);
    }, 500);
});