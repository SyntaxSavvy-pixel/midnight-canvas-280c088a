// Test script to verify Stripe integration is working
// Run this in browser console on your extension popup

class StripeIntegrationTester {
    constructor() {
        this.API_BASE = 'https://tabmangment.netlify.app/api';
        this.testEmail = 'test@example.com';
        this.results = {};
    }

    async runAllTests() {
        console.log('🧪 Starting Stripe Integration Tests...');
        console.log('=====================================');

        await this.testAPIEndpoints();
        await this.testEmailDetection();
        await this.testDatabaseConnection();
        await this.testCheckoutFlow();
        await this.testBillingPortal();

        this.showResults();
        return this.results;
    }

    // Test 1: API Endpoints
    async testAPIEndpoints() {
        console.log('\n📡 Testing API Endpoints...');

        const endpoints = [
            { name: 'Debug Status', url: `${this.API_BASE}/debug-status` },
            { name: 'Check Status', url: `${this.API_BASE}/check-status?email=${this.testEmail}` },
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint.url);
                const data = await response.json();

                this.results[endpoint.name] = {
                    success: response.ok,
                    status: response.status,
                    data: data
                };

                console.log(`✅ ${endpoint.name}: ${response.status} ${response.ok ? 'OK' : 'FAILED'}`);

                if (endpoint.name === 'Debug Status') {
                    console.log('   Environment:', data.environment);
                    console.log('   Database:', data.database);
                }

            } catch (error) {
                this.results[endpoint.name] = {
                    success: false,
                    error: error.message
                };
                console.log(`❌ ${endpoint.name}: ${error.message}`);
            }
        }
    }

    // Test 2: Email Detection
    async testEmailDetection() {
        console.log('\n📧 Testing Email Detection...');

        try {
            if (typeof EmailDetector !== 'undefined') {
                const detector = new EmailDetector();
                const email = await detector.detectUserEmail();

                this.results['Email Detection'] = {
                    success: !!email,
                    email: email
                };

                if (email) {
                    console.log(`✅ Email Detected: ${email}`);
                } else {
                    console.log('❌ No email detected');
                }
            } else {
                console.log('❌ EmailDetector class not available');
                this.results['Email Detection'] = {
                    success: false,
                    error: 'EmailDetector not loaded'
                };
            }
        } catch (error) {
            console.log(`❌ Email Detection Error: ${error.message}`);
            this.results['Email Detection'] = {
                success: false,
                error: error.message
            };
        }
    }

    // Test 3: Database Connection
    async testDatabaseConnection() {
        console.log('\n🗄️ Testing Database Connection...');

        try {
            const response = await fetch(`${this.API_BASE}/debug-status`);
            const data = await response.json();

            const dbConnected = data.database && data.database.connected;

            this.results['Database Connection'] = {
                success: dbConnected,
                type: data.database?.type || 'Unknown',
                userCount: data.database?.userCount || 0
            };

            if (dbConnected) {
                console.log(`✅ Database Connected: ${data.database.type} (${data.database.userCount} users)`);
            } else {
                console.log(`❌ Database Not Connected: ${data.database?.error || 'Unknown error'}`);
            }

        } catch (error) {
            console.log(`❌ Database Test Failed: ${error.message}`);
            this.results['Database Connection'] = {
                success: false,
                error: error.message
            };
        }
    }

    // Test 4: Checkout Flow
    async testCheckoutFlow() {
        console.log('\n💳 Testing Checkout Flow...');

        try {
            const response = await fetch(`${this.API_BASE}/create-checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: this.testEmail
                })
            });

            const data = await response.json();

            this.results['Checkout Creation'] = {
                success: response.ok && !!data.url,
                status: response.status,
                hasUrl: !!data.url,
                url: data.url?.substring(0, 50) + '...' || null
            };

            if (response.ok && data.url) {
                console.log('✅ Checkout Session Created');
                console.log(`   URL: ${data.url.substring(0, 50)}...`);
            } else {
                console.log(`❌ Checkout Creation Failed: ${data.error || 'Unknown error'}`);
            }

        } catch (error) {
            console.log(`❌ Checkout Test Failed: ${error.message}`);
            this.results['Checkout Creation'] = {
                success: false,
                error: error.message
            };
        }
    }

    // Test 5: Billing Portal
    async testBillingPortal() {
        console.log('\n🏛️ Testing Billing Portal...');

        try {
            // First create a test user by attempting checkout
            const checkoutResponse = await fetch(`${this.API_BASE}/create-checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: this.testEmail
                })
            });

            // Then try to access billing portal
            const portalResponse = await fetch(`${this.API_BASE}/billing-portal`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: this.testEmail
                })
            });

            const portalData = await portalResponse.json();

            this.results['Billing Portal'] = {
                success: portalResponse.ok || portalResponse.status === 404,
                status: portalResponse.status,
                error: portalData.error || null
            };

            if (portalResponse.ok) {
                console.log('✅ Billing Portal Access OK');
            } else if (portalResponse.status === 404) {
                console.log('✅ Billing Portal responds correctly (no customer found)');
            } else {
                console.log(`❌ Billing Portal Error: ${portalData.error}`);
            }

        } catch (error) {
            console.log(`❌ Billing Portal Test Failed: ${error.message}`);
            this.results['Billing Portal'] = {
                success: false,
                error: error.message
            };
        }
    }

    // Show comprehensive results
    showResults() {
        console.log('\n📊 TEST RESULTS SUMMARY');
        console.log('========================');

        let passCount = 0;
        let totalTests = 0;

        for (const [testName, result] of Object.entries(this.results)) {
            totalTests++;
            if (result.success) {
                passCount++;
                console.log(`✅ ${testName}: PASSED`);
            } else {
                console.log(`❌ ${testName}: FAILED - ${result.error || 'See details above'}`);
            }
        }

        console.log(`\n📈 Overall: ${passCount}/${totalTests} tests passed`);

        if (passCount === totalTests) {
            console.log('🎉 All tests passed! Your Stripe integration appears to be working correctly.');
        } else {
            console.log('⚠️ Some tests failed. Check the STRIPE_FIX_GUIDE.md for troubleshooting steps.');
        }

        return {
            passed: passCount,
            total: totalTests,
            success: passCount === totalTests,
            details: this.results
        };
    }
}

// Auto-run if in browser console
if (typeof window !== 'undefined') {
    console.log('🧪 Stripe Integration Tester Loaded');
    console.log('Run: const tester = new StripeIntegrationTester(); tester.runAllTests();');

    // Make it globally available
    window.StripeIntegrationTester = StripeIntegrationTester;
}

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StripeIntegrationTester;
}