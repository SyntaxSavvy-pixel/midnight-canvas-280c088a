
import { kv } from '@vercel/kv';

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
    const key = `user:${userId}`;

    const existingUser = await kv.get(key) || {};

    const user = {
      ...USER_SCHEMA,
      ...existingUser,
      ...userData,
      userId: userId,
      updatedAt: new Date().toISOString()
    };

    await kv.set(key, user);

    if (userData.email && userData.email !== userId) {
      await kv.set(`user:${userData.email}`, user);
    }

    return user;

  } catch (error) {
    throw error;
  }
}

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

    if (existingUser.email && existingUser.email !== identifier) {
      await kv.set(`user:${existingUser.email}`, updatedUser);
    }

    return updatedUser;

  } catch (error) {
    throw error;
  }
}

export async function getProUsers() {
  try {
    const keys = await kv.keys('user:*');
    const users = await Promise.all(
      keys.map(key => kv.get(key))
    );

    return users.filter(user => user && user.isPro);

  } catch (error) {
    return [];
  }
}

export async function deleteUser(identifier) {
  try {
    const user = await getUser(identifier);

    if (user) {
      await kv.del(`user:${identifier}`);

      if (user.email && user.email !== identifier) {
        await kv.del(`user:${user.email}`);
      }

    }

  } catch (error) {
    throw error;
  }
}