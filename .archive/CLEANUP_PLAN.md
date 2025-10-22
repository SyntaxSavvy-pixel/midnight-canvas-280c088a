# 🧹 Cleanup Plan - Remove Unnecessary Files

## Files to DELETE (Safe to Remove)

### Documentation Files (14 files) - Just clutter now
```
CACHE_CLEAR_INSTRUCTIONS.md
CSP-TROUBLESHOOTING.md
DEVICE-ANTI-SHARING-README.md
FINAL_SETUP_INSTRUCTIONS.md
LAUNCH_STATUS.md
PASSWORD_RESET_SETUP.md
PRE_LAUNCH_CHECKLIST.md
PRODUCTION_READINESS_REPORT.md
SECURITY_AUDIT_2025.md
SECURITY-FIXES.md
SECURITY.md
STRIPE_DASHBOARD_SETUP.md
STRIPE_FIX_VERIFICATION.md
STRIPE_TESTING_GUIDE.md
SUPABASE_SETUP_CHECKLIST.md
```

### Text Files (2 files)
```
fixupgradedstripes.txt
SQLTORebuild.txt
```

### Old/Duplicate JS Files (10 files)
```
auth.js (old - using extension-simple-auth.js now)
dashboard-sync-v2.js (v2 = old version)
debug-storage.js (debug tool, not needed)
extension-auth-sync.js (old auth system)
extension-pro-system.js (old pro system)
manual-pro-activator.js (old manual activator)
payment-handler-improved.js (redundant)
payment-listener.js (redundant)
payment-status-checker.js (redundant)
payment-success-listener.js (redundant)
secure-config.js (duplicate of config.js)
session-manager.js (old)
session-security.js (old)
stripe-integration.js (redundant)
email-detector.js (not actively used)
```

## Files to KEEP (Essential)

### Core Extension Files
```
✅ background.js - Extension background script
✅ popup.js - Extension popup UI
✅ content.js - Content script injection
✅ extension-simple-auth.js - Authentication system (CURRENT)
✅ dashboard-sync.js - Dashboard communication
✅ dashboard-bridge.js - Dashboard bridge
✅ config.js - Configuration
✅ success-page-activator.js - Payment success handler
```

### Documentation (Keep These)
```
✅ README.md - Main documentation
✅ supabase-fix-permissions.sql - Database setup (needed!)
```

### HTML Pages
```
✅ popup.html - Extension popup
✅ user-dashboard.html - Main dashboard
✅ New-authentication.html - Login/signup page
✅ payment-success.html - Payment confirmation
```

## Total Cleanup
- Remove: **31 files** (16 MD/TXT + 15 JS)
- Keep: **15 core files**
- Result: **Cleaner, simpler codebase**

## Benefits
✅ Easier to navigate
✅ Less confusion about which files are used
✅ Faster git operations
✅ Clearer code structure
