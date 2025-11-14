
let memoryDB = new Map();

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

export async function saveUser(userData) {
  try {
    const userId = userData.userId || userData.email;

    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const { kv } = await import('@vercel/kv');
      const user = { ...USER_SCHEMA, ...userData, userId, updatedAt: new Date().toISOString() };
      await kv.set(`user:${userId}`, user);
      if (userData.email && userData.email !== userId) {
        await kv.set(`user:${userData.email}`, user);
      }
      return user;
    }

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

export async function getUser(identifier) {
  try {
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const { kv } = await import('@vercel/kv');
      const user = await kv.get(`user:${identifier}`);
      if (user) {
        return user;
      }
      return null;
    }

    const user = memoryDB.get(`user:${identifier}`);
    if (user) {
      return user;
    }

    return null;

  } catch (error) {
    throw error;
  }
}

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

    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const { kv } = await import('@vercel/kv');
      await kv.set(`user:${identifier}`, updatedUser);
      if (existingUser.email && existingUser.email !== identifier) {
        await kv.set(`user:${existingUser.email}`, updatedUser);
      }
      return updatedUser;
    }

    memoryDB.set(`user:${identifier}`, updatedUser);
    if (existingUser.email && existingUser.email !== identifier) {
      memoryDB.set(`user:${existingUser.email}`, updatedUser);
    }

    return updatedUser;

  } catch (error) {
    throw error;
  }
}

export async function deleteUser(identifier) {
  try {
    const user = await getUser(identifier);

    if (user) {
      if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        const { kv } = await import('@vercel/kv');
        await kv.del(`user:${identifier}`);
        if (user.email && user.email !== identifier) {
          await kv.del(`user:${user.email}`);
        }
        return;
      }

      memoryDB.delete(`user:${identifier}`);
      if (user.email && user.email !== identifier) {
        memoryDB.delete(`user:${user.email}`);
      }

    }

  } catch (error) {
    throw error;
  }
}

export async function getAllUsers() {
  try {
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const { kv } = await import('@vercel/kv');
      const keys = await kv.keys('user:*');
      const users = [];

      for (const key of keys) {
        const userData = await kv.get(key);
        if (userData && userData.email) {
          const exists = users.find(u => u.email === userData.email);
          if (!exists) {
            users.push(userData);
          }
        }
      }

      return users;
    }

    const users = [];
    for (const [key, userData] of memoryDB) {
      if (key.startsWith('user:') && userData.email) {
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

export async function trackActivity(email, activityType, data = {}) {
  try {
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

    if (user.isPro && user.currentPeriodEnd) {
      const now = new Date();
      const periodEnd = new Date(user.currentPeriodEnd);

      if (now > periodEnd && user.subscriptionStatus !== 'active') {
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

export async function getRecentActivities(limit = 50) {
  try {
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

      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return activities.slice(0, limit);
    }

    return [];

  } catch (error) {
    return [];
  }
}