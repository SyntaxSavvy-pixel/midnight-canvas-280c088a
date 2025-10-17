// Simple database operations for production
// This version works without external dependencies

// In-memory storage for development
// In production, replace with Vercel KV or Supabase
let memoryDB = new Map();

// User data structure
const USER_SCHEMA = {
  email: '',
  userId: '',
  isPro: false,
  subscriptionStatus: 'free',
  stripeCustomerId: '',
  stripeSubscriptionId: '',
  currentPeriodEnd: null,
  createdAt: '',
  updatedAt: '',
  lastPaymentAt: null,
  lastFailedPaymentAt: null
};

// Save or create user
export async function saveUser(userData) {
  try {
    const userId = userData.userId || userData.email;

    // For production with Vercel KV:
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const { kv } = await import('@vercel/kv');
      const user = { ...USER_SCHEMA, ...userData, userId, updatedAt: new Date().toISOString() };
      await kv.set(`user:${userId}`, user);
      if (userData.email && userData.email !== userId) {
        await kv.set(`user:${userData.email}`, user);
      }
      return user;
    }

    // Fallback to memory storage (development)
    const user = {
      ...USER_SCHEMA,
      ...userData,
      userId: userId,
      updatedAt: new Date().toISOString()
    };

    memoryDB.set(`user:${userId}`, user);
    if (userData.email && userData.email !== userId) {
      memoryDB.set(`user:${userData.email}`, user);
    }

    return user;

  } catch (error) {
    throw error;
  }
}

// Get user by ID or email
export async function getUser(identifier) {
  try {
    // For production with Vercel KV:
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const { kv } = await import('@vercel/kv');
      const user = await kv.get(`user:${identifier}`);
      if (user) {
        return user;
      }
      return null;
    }

    // Fallback to memory storage (development)
    const user = memoryDB.get(`user:${identifier}`);
    if (user) {
      return user;
    }

    return null;

  } catch (error) {
    throw error;
  }
}

// Update user data
export async function updateUser(identifier, updates) {
  try {
    const existingUser = await getUser(identifier);

    if (!existingUser) {
      throw new Error(`User not found: ${identifier}`);
    }

    const updatedUser = {
      ...existingUser,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // For production with Vercel KV:
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const { kv } = await import('@vercel/kv');
      await kv.set(`user:${identifier}`, updatedUser);
      if (existingUser.email && existingUser.email !== identifier) {
        await kv.set(`user:${existingUser.email}`, updatedUser);
      }
      return updatedUser;
    }

    // Fallback to memory storage (development)
    memoryDB.set(`user:${identifier}`, updatedUser);
    if (existingUser.email && existingUser.email !== identifier) {
      memoryDB.set(`user:${existingUser.email}`, updatedUser);
    }

    return updatedUser;

  } catch (error) {
    throw error;
  }
}

// Delete user (GDPR compliance)
export async function deleteUser(identifier) {
  try {
    const user = await getUser(identifier);

    if (user) {
      // For production with Vercel KV:
      if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        const { kv } = await import('@vercel/kv');
        await kv.del(`user:${identifier}`);
        if (user.email && user.email !== identifier) {
          await kv.del(`user:${user.email}`);
        }
        return;
      }

      // Fallback to memory storage (development)
      memoryDB.delete(`user:${identifier}`);
      if (user.email && user.email !== identifier) {
        memoryDB.delete(`user:${user.email}`);
      }

    }

  } catch (error) {
    throw error;
  }
}

// Get all users (admin function)
export async function getAllUsers() {
  try {
    // For production with Vercel KV:
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const { kv } = await import('@vercel/kv');
      const keys = await kv.keys('user:*');
      const users = [];

      for (const key of keys) {
        const userData = await kv.get(key);
        if (userData && userData.email) {
          // Avoid duplicates (since we store by both email and userId)
          const exists = users.find(u => u.email === userData.email);
          if (!exists) {
            users.push(userData);
          }
        }
      }

      return users;
    }

    // Fallback to memory storage (development)
    const users = [];
    for (const [key, userData] of memoryDB) {
      if (key.startsWith('user:') && userData.email) {
        // Avoid duplicates
        const exists = users.find(u => u.email === userData.email);
        if (!exists) {
          users.push(userData);
        }
      }
    }

    return users;

  } catch (error) {
    return [];
  }
}

// Track user activity
export async function trackActivity(email, activityType, data = {}) {
  try {
    // For production with Vercel KV:
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const { kv } = await import('@vercel/kv');
      const activityKey = `activity:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const activity = {
        email,
        type: activityType,
        data,
        timestamp: new Date().toISOString(),
        id: activityKey
      };

      await kv.set(activityKey, activity);

      // Also update user's last activity
      const user = await getUser(email);
      if (user) {
        await updateUser(email, {
          lastActiveAt: new Date().toISOString(),
          lastActivity: activityType
        });
      }
    }

  } catch (error) {
  }
}

// Check user subscription status
export async function checkUserStatus(userIdentifier) {
  try {
    const user = await getUser(userIdentifier);

    if (!user) {
      return {
        isPro: false,
        status: 'free',
        subscriptionStatus: 'free',
        message: 'User not found'
      };
    }

    // Check if subscription is still valid
    if (user.isPro && user.currentPeriodEnd) {
      const now = new Date();
      const periodEnd = new Date(user.currentPeriodEnd);

      if (now > periodEnd && user.subscriptionStatus !== 'active') {
        // Subscription expired
        await updateUser(userIdentifier, {
          isPro: false,
          status: 'expired'
        });

        return {
          isPro: false,
          status: 'expired',
          subscriptionStatus: 'expired',
          message: 'Subscription expired'
        };
      }
    }

    return {
      isPro: user.isPro || false,
      status: user.status || 'free',
      subscriptionStatus: user.subscriptionStatus || 'free',
      currentPeriodEnd: user.currentPeriodEnd,
      message: user.isPro ? 'Pro subscription active' : 'Free plan'
    };

  } catch (error) {
    return {
      isPro: false,
      status: 'error',
      subscriptionStatus: 'error',
      message: 'Error checking status'
    };
  }
}

// Get recent activities (admin function)
export async function getRecentActivities(limit = 50) {
  try {
    // For production with Vercel KV:
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const { kv } = await import('@vercel/kv');
      const keys = await kv.keys('activity:*');
      const activities = [];

      for (const key of keys) {
        const activity = await kv.get(key);
        if (activity) {
          activities.push(activity);
        }
      }

      // Sort by timestamp (newest first)
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return activities.slice(0, limit);
    }

    return [];

  } catch (error) {
    return [];
  }
}