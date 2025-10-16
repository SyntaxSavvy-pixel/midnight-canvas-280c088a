// Enhanced email detection for Chrome extension
// This helps ensure user email is captured for Stripe integration

class EmailDetector {
    constructor() {
        this.detectedEmail = null;
        this.detectionMethods = [
            this.getFromGoogleAccount.bind(this),
            this.getFromChromeIdentity.bind(this),
            this.getFromLocalStorage.bind(this),
            this.getFromGmailPage.bind(this),
            this.promptUserForEmail.bind(this)
        ];
    }

    // Main detection method - tries all methods in order
    async detectUserEmail() {
        // Check if we already have a cached email
        const cached = await this.getCachedEmail();
        if (cached) {
            return cached;
        }

        // Try each detection method
        for (const method of this.detectionMethods) {
            try {
                const email = await method();
                if (email && this.isValidEmail(email)) {
                    await this.cacheEmail(email);
                    return email;
                }
            } catch (error) {
                // Silent failure - continue to next method
            }
        }

        return null;
    }

    // Method 1: Google Account via Chrome Identity API
    async getFromGoogleAccount() {
        return new Promise((resolve, reject) => {
            chrome.identity.getProfileUserInfo({ accountStatus: 'ANY' }, (userInfo) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }

                if (userInfo && userInfo.email) {
                    resolve(userInfo.email);
                } else {
                    reject(new Error('No Google account email found'));
                }
            });
        });
    }

    // Method 2: Chrome Identity API with OAuth
    async getFromChromeIdentity() {
        return new Promise((resolve, reject) => {
            chrome.identity.getAuthToken({
                interactive: false,
                scopes: ['email', 'profile']
            }, (token) => {
                if (chrome.runtime.lastError) {
                    reject(new Error('No auth token available'));
                    return;
                }

                if (token) {
                    // Use the token to get user info
                    fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=' + token)
                        .then(response => response.json())
                        .then(data => {
                            if (data.email) {
                                resolve(data.email);
                            } else {
                                reject(new Error('No email in user info'));
                            }
                        })
                        .catch(reject);
                } else {
                    reject(new Error('No token received'));
                }
            });
        });
    }

    // Method 3: Check local storage for previously saved email
    async getFromLocalStorage() {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(['userEmail', 'detectedEmail'], (result) => {
                if (result.userEmail) {
                    resolve(result.userEmail);
                } else if (result.detectedEmail) {
                    resolve(result.detectedEmail);
                } else {
                    reject(new Error('No email in local storage'));
                }
            });
        });
    }

    // Method 4: Extract from Gmail page if user is on Gmail
    async getFromGmailPage() {
        return new Promise((resolve, reject) => {
            chrome.tabs.query({ url: '*://mail.google.com/*' }, (tabs) => {
                if (tabs.length === 0) {
                    reject(new Error('Gmail not open'));
                    return;
                }

                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: () => {
                        // Try to get email from Gmail page
                        function getGmailEmail() {
                            // Method 1: Account switcher
                            const accountSwitcher = document.querySelector('[data-email]');
                            if (accountSwitcher) {
                                return accountSwitcher.getAttribute('data-email');
                            }

                            // Method 2: Profile button
                            const profileBtn = document.querySelector('a[aria-label*="Google Account"]');
                            if (profileBtn && profileBtn.href) {
                                const match = profileBtn.href.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                                if (match) return match[0];
                            }

                            // Method 3: Check for email in page content
                            const bodyText = document.body.textContent;
                            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
                            const emails = bodyText.match(emailRegex);
                            if (emails && emails.length > 0) {
                                // Return the first valid email found (works for ALL email providers)
                                return emails[0];
                            }

                            return null;
                        }

                        return getGmailEmail();
                    }
                }).then((result) => {
                    if (result && result[0] && result[0].result) {
                        resolve(result[0].result);
                    } else {
                        reject(new Error('No email found on Gmail page'));
                    }
                }).catch((error) => {
                    reject(new Error('Script injection failed: ' + error.message));
                });
            });
        });
    }

    // Method 5: Prompt user to enter email
    async promptUserForEmail() {
        return new Promise((resolve) => {
            const email = prompt(
                'To activate Pro features, please enter your email address:\n' +
                '(This will be used for your subscription and billing)'
            );

            if (email && this.isValidEmail(email)) {
                resolve(email);
            } else {
                resolve(null);
            }
        });
    }

    // Utility: Validate email format
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Cache email for future use
    async cacheEmail(email) {
        return new Promise((resolve) => {
            chrome.storage.local.set({
                userEmail: email,
                detectedEmail: email,
                emailDetectedAt: new Date().toISOString()
            }, resolve);
        });
    }

    // Get cached email
    async getCachedEmail() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['userEmail', 'detectedEmail'], (result) => {
                resolve(result.userEmail || result.detectedEmail || null);
            });
        });
    }

    // Clear cached email (for testing)
    async clearCachedEmail() {
        return new Promise((resolve) => {
            chrome.storage.local.remove(['userEmail', 'detectedEmail', 'emailDetectedAt'], resolve);
        });
    }
}

// Export for use in popup.js
if (typeof window !== 'undefined') {
    window.EmailDetector = EmailDetector;
}

// Export for Node.js (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmailDetector;
}