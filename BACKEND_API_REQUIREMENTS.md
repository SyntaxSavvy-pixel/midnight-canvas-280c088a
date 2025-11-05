# Backend API Implementation Guide - Cloudflare + Supabase

## 🔒 CRITICAL: Server-Side Search Tracking Implementation

### Overview
This guide will help you implement server-side search tracking using **Cloudflare Workers/Pages** and **Supabase** to prevent users from exploiting the 5 free searches limit.

### Stack
- ✅ Cloudflare Workers/Pages Functions
- ✅ Supabase (PostgreSQL database)
- ✅ Environment Variables for secrets

---

## 1. Check Search Usage Endpoint

**Endpoint:** `POST https://tabmangment.com/api/check-search-usage`

**Purpose:** Check how many searches a user has performed in the last 24 hours

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "searchCount": 3,
  "canSearch": true,
  "resetsAt": "2025-11-05T20:00:00Z"
}
```

**Logic:**
1. Query Supabase `search_usage` table for the user's email
2. Count searches from the last 24 hours (rolling window)
3. Return count and whether user can search (count < 5)
4. Pro users should always return `canSearch: true` regardless of count

**Supabase Table Schema:**
```sql
CREATE TABLE IF NOT EXISTS search_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email TEXT NOT NULL,
  searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_search_usage_email_time ON search_usage(user_email, searched_at DESC);

-- Auto-cleanup old records (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_searches()
RETURNS void AS $$
BEGIN
  DELETE FROM search_usage WHERE searched_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
```

---

## 2. Increment Search Endpoint

**Endpoint:** `POST https://tabmangment.com/api/increment-search`

**Purpose:** Record a new search and increment the user's search count

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "searchCount": 4,
  "remaining": 1,
  "message": "Search recorded successfully"
}
```

**Logic:**
1. Insert new record into `search_usage` table with user email and current timestamp
2. Count total searches in last 24 hours
3. Return updated count and remaining searches (5 - count)
4. If count >= 5 and user is not Pro, return warning

**Error Handling:**
- If user is not found: Still allow search but log warning
- If database error: Return 500 but don't block search (extension will use local fallback)

---

## 3. Implementation Notes

### Security
- **Rate limiting:** Limit API calls to 100 requests per minute per IP
- **Authentication:** Verify user email matches a valid account in your users table
- **Validation:** Sanitize email input to prevent SQL injection

### Performance
- **Caching:** Cache search counts for 30 seconds to reduce database load
- **Indexes:** Ensure proper indexes on `user_email` and `searched_at` columns
- **Cleanup:** Run daily cron job to delete searches older than 30 days

### Pro Users
- Pro users should have unlimited searches
- Check user's `isPro` or `isPremium` status before counting
- Return `canSearch: true` immediately for Pro users

### Example Implementation (Node.js + Supabase)

```javascript
// /api/check-search-usage
export async function POST(req) {
  const { email } = await req.json();

  // Check if user is Pro
  const { data: user } = await supabase
    .from('users')
    .select('isPro, isPremium')
    .eq('email', email)
    .single();

  if (user?.isPro || user?.isPremium) {
    return Response.json({
      success: true,
      searchCount: 0,
      canSearch: true
    });
  }

  // Count searches in last 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const { data: searches, error } = await supabase
    .from('search_usage')
    .select('id')
    .eq('user_email', email)
    .gte('searched_at', twentyFourHoursAgo.toISOString());

  if (error) {
    console.error('Database error:', error);
    return Response.json({ success: false }, { status: 500 });
  }

  const searchCount = searches?.length || 0;
  const canSearch = searchCount < 5;

  return Response.json({
    success: true,
    searchCount,
    canSearch
  });
}

// /api/increment-search
export async function POST(req) {
  const { email } = await req.json();

  // Insert new search record
  const { error } = await supabase
    .from('search_usage')
    .insert([
      { user_email: email, searched_at: new Date().toISOString() }
    ]);

  if (error) {
    console.error('Insert error:', error);
    return Response.json({ success: false }, { status: 500 });
  }

  // Return updated count
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { data: searches } = await supabase
    .from('search_usage')
    .select('id')
    .eq('user_email', email)
    .gte('searched_at', twentyFourHoursAgo.toISOString());

  const searchCount = searches?.length || 0;
  const remaining = Math.max(0, 5 - searchCount);

  return Response.json({
    success: true,
    searchCount,
    remaining,
    message: 'Search recorded successfully'
  });
}
```

---

## 4. Testing

Test cases to verify:
1. ✅ User performs 5 searches - 6th should be blocked
2. ✅ User logs out and back in - search count persists
3. ✅ User uninstalls and reinstalls extension - search count persists
4. ✅ Pro users can search unlimited times
5. ✅ Search count resets after 24 hours (rolling window)
6. ✅ API fallback works when backend is down

---

## Priority: CRITICAL
This must be implemented ASAP to prevent users from exploiting unlimited free searches.

Extension changes are already deployed and waiting for these backend endpoints.
