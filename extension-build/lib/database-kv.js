// Database operations using Vercel KV
// Path: /lib/database.js

import { kv } from '@vercel/kv';

// User data structure
const USER_SCHEMA = {
  email: '',
  userId: '',
  isPro: false,
  subscriptionStatus: 'free', // free, active, past_due, cancelled
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
    const key = `user:${userId}`;

    // Get existing user data or create new
    const existingUser = await kv.get(key) || {};

    const user = {
      ...USER_SCHEMA,
      ...existingUser,
      ...userData,
      userId: userId,
      updatedAt: new Date().toISOString()
    };

    await kv.set(key, user);

    // Also index by email if different from userId
    if (userData.email && userData.email !== userId) {
      await kv.set(`user:${userData.email}`, user);
    }

    return user;

  } catch (error) {
    throw error;
  }
}

// Get user by ID or email
export async function getUser(identifier) {
  try {
    const key = `user:${identifier}`;
    const user = await kv.get(key);

    if (!user) {
      return null;
    }

    return user;

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

    await kv.set(`user:${identifier}`, updatedUser);

    // Update email index if it exists
    if (existingUser.email && existingUser.email !== identifier) {
      await kv.set(`user:${existingUser.email}`, updatedUser);
    }

    return updatedUser;

  } catch (error) {
    throw error;
  }
}

// Get all Pro users (for analytics)
export async function getProUsers() {
  try {
    // Note: KV doesn't have great querying. For analytics, consider using Supabase
    const keys = await kv.keys('user:*');
    const users = await Promise.all(
      keys.map(key => kv.get(key))
    );

    return users.filter(user => user && user.isPro);

  } catch (error) {
    return [];
  }
}

// Delete user (GDPR compliance)
export async function deleteUser(identifier) {
  try {
    const user = await getUser(identifier);

    if (user) {
      await kv.del(`user:${identifier}`);

      // Delete email index if different
      if (user.email && user.email !== identifier) {
        await kv.del(`user:${user.email}`);
      }

    }

  } catch (error) {
    throw error;
  }
}