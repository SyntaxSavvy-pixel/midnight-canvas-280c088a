# 🔒 Device Fingerprinting & Anti-Sharing System

## Overview

This system prevents Pro plan sharing by tracking and limiting the number of devices that can access an account. Each device gets a unique fingerprint, and users are limited based on their plan.

## Features

- ✅ **Unique Device Fingerprinting**: Combines browser, OS, hardware, Canvas, and WebGL data
- ✅ **Device Limits**: Free (2 devices) | Pro (3 devices)
- ✅ **Automatic Device Registration**: Tracks device metadata (browser, OS, screen, language)
- ✅ **Device Verification**: Checks device authorization on every dashboard load
- ✅ **Auto-Remove Oldest**: When limit reached, oldest inactive device is removed
- ✅ **Beautiful Block Screen**: Shows upgrade prompt for free users
- ✅ **Supabase Integration**: All device data stored securely with RLS

## Device Limits

| Plan | Max Devices |
|------|-------------|
| Free | 2 devices   |
| Pro  | 3 devices   |

## How It Works

### 1. Device Fingerprinting

When a user visits the dashboard, the system generates a unique device fingerprint using:

- **Browser Info**: User agent, language, platform
- **Screen**: Resolution, color depth
- **Hardware**: CPU cores (if available)
- **Canvas Fingerprint**: Unique GPU/browser rendering signature
- **WebGL Fingerprint**: Graphics card vendor and renderer
- **Timezone Offset**: User's local timezone

All components are combined and hashed with SHA-256 to create a 64-character hex fingerprint.

### 2. Device ID Generation

```javascript
Device ID = [First 16 chars of fingerprint] + "-" + [Timestamp]
Example: a1b2c3d4e5f6g7h8-1705934567890
```

This ensures each device has a unique, reproducible ID that persists across sessions.

### 3. Device Registration Flow

```
1. User logs in
2. System generates device fingerprint
3. System checks Supabase for existing devices
4. If device exists → Update lastSeen timestamp
5. If device is new:
   a. Check if device limit reached
   b. If limit reached → Remove oldest device
   c. Add new device to list
6. Save to Supabase user_devices table
```

### 4. Device Verification Flow

```
1. Dashboard loads
2. Get device ID from localStorage
3. Fetch user's device list from Supabase
4. Check if current device is authorized
5. If NOT authorized:
   → Show "Device Limit Reached" modal
   → Block dashboard access
   → Offer logout or upgrade
6. If authorized:
   → Allow dashboard access
   → Update device lastSeen timestamp
```

## Supabase Setup

### Step 1: Run Migration

Go to your Supabase Dashboard → SQL Editor → New Query

Copy and paste the contents of `supabase-migration-user-devices.sql` and run it.

This creates:
- `user_devices` table
- Indexes for performance
- Row Level Security (RLS) policies
- Auto-update triggers for updated_at

### Step 2: Verify Table Created

Run this query to check:

```sql
SELECT * FROM public.user_devices LIMIT 10;
```

### Step 3: Test Device Registration

After deploying the updated dashboard, log in and check:

```sql
SELECT user_id, jsonb_array_length(devices) as device_count, updated_at
FROM public.user_devices
ORDER BY updated_at DESC;
```

## Database Schema

### user_devices Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (auto-generated) |
| user_id | TEXT | User UUID or email (unique) |
| devices | JSONB | Array of device objects |
| created_at | TIMESTAMPTZ | When first device registered |
| updated_at | TIMESTAMPTZ | Last device list modification |

### Device JSONB Structure

```json
{
  "device_id": "a1b2c3d4e5f6g7h8-1705934567890",
  "browser": "Chrome/120.0.0.0",
  "os": "MacIntel",
  "screenResolution": "1920x1080",
  "language": "en-US",
  "lastSeen": "2025-01-15T10:30:00.000Z",
  "registeredAt": "2025-01-10T08:00:00.000Z"
}
```

## Configuration

Edit device limits in `user-dashboard.html`:

```javascript
const DEVICE_CONFIG = {
    MAX_DEVICES_FREE: 2,      // Free users: 2 devices
    MAX_DEVICES_PRO: 3,       // Pro users: 3 devices
    FINGERPRINT_VERSION: '1.0'
};
```

## Security Considerations

### ✅ What This Prevents:
- Pro plan sharing among multiple people
- Using same account on unlimited devices
- Password sharing for Pro features

### ⚠️ Limitations:
- **Same computer, different browsers** = Different devices (intended behavior)
- **Incognito mode** = New device ID each session (localStorage cleared)
- **Browser reset/data clear** = New device ID (fingerprint regenerated)
- **VPN/Proxy changes** = No effect (fingerprint doesn't use IP)

### 🔒 Privacy:
- No personal data collected
- Only browser/hardware metadata
- All data hashed (irreversible)
- RLS policies protect user privacy

## User Experience

### Scenario 1: Normal User (Within Limit)
1. User logs in on Device A → Registered
2. User logs in on Device B → Registered (2/2 for free)
3. Everything works normally ✅

### Scenario 2: Device Limit Reached (Free User)
1. User logs in on Device A → Registered
2. User logs in on Device B → Registered (2/2 for free)
3. User logs in on Device C → **BLOCKED**
4. Modal appears: "Device Limit Reached"
5. Options:
   - Upgrade to Pro (3 devices)
   - Log out and return to login

### Scenario 3: Auto-Removal (Inactive Device)
1. User has 2 devices registered
2. Device A last seen: 30 days ago
3. Device B last seen: Today
4. User logs in on Device C
5. System removes Device A (oldest)
6. Device C gets registered ✅

### Scenario 4: Pro User
1. User upgrades to Pro
2. Device limit increases to 3
3. Can register 1 more device ✅

## Testing

### Manual Test

1. Log in on Browser 1 (Chrome) → Device 1 registered
2. Log in on Browser 2 (Firefox) → Device 2 registered
3. Log in on Browser 3 (Safari) → Device 3 should be blocked (if free)

### Check Supabase

```sql
-- View all registered devices
SELECT
    user_id,
    jsonb_pretty(devices) as devices,
    updated_at
FROM user_devices
WHERE user_id = 'your-email@example.com';

-- Count devices per user
SELECT
    user_id,
    jsonb_array_length(devices) as device_count
FROM user_devices
ORDER BY device_count DESC;
```

### Clear Devices (Testing)

```sql
-- Remove all devices for a user (for testing)
DELETE FROM user_devices WHERE user_id = 'test@example.com';

-- Or reset device count
UPDATE user_devices
SET devices = '[]'::jsonb
WHERE user_id = 'test@example.com';
```

## Troubleshooting

### Issue: User can't log in on any device

**Cause**: Device limit reached and all devices show as "in use"

**Solution**:
```sql
-- Clear devices for this user
DELETE FROM user_devices WHERE user_id = 'user@example.com';
```

### Issue: Same browser registers as different device

**Cause**: localStorage was cleared or user in incognito mode

**Solution**: Expected behavior. Device ID is stored in localStorage. Clearing storage = new device.

### Issue: RLS policies blocking access

**Cause**: Supabase user_id doesn't match auth.uid() or auth.email()

**Solution**: Check that user_id column uses either:
- Supabase auth UUID: `auth.uid()::text`
- User email: `auth.email()`

## Version History

- **v1.0** (2025-01-15): Initial implementation
  - Device fingerprinting
  - Supabase integration
  - Device limits (Free: 2, Pro: 3)
  - Auto-removal of oldest devices

## Support

For issues or questions about the anti-sharing system:
1. Check Supabase logs for errors
2. Verify user_devices table exists
3. Check RLS policies are enabled
4. Test with different browsers

## License

This anti-sharing system is part of the TabMangment Pro subscription enforcement.
