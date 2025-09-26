// API endpoint to check user payment/subscription status
// Path: /api/check-payment-status.js

import { getUser, checkUserStatus } from '../lib/database.js';

export default async function handler(req, res) {
  // Set CORS headers for extension requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user identifier from query params or body
    const userIdentifier = req.query.user || req.query.email || req.body?.user || req.body?.email;

    if (!userIdentifier) {
      return res.status(400).json({
        error: 'User identifier required',
        message: 'Please provide user email or ID'
      });
    }

    console.log(`🔍 Checking payment status for: ${userIdentifier}`);

    // Check user status
    const status = await checkUserStatus(userIdentifier);
    const user = await getUser(userIdentifier);

    // Return comprehensive status
    const response = {
      success: true,
      userExists: !!user,
      isPro: status.isPro || false,
      status: status.status || 'free',
      subscriptionStatus: status.subscriptionStatus || 'free',
      message: status.message || 'Status checked successfully',
      data: user ? {
        email: user.email || userIdentifier,
        userId: user.userId || userIdentifier,
        planType: (user.isPro || status.isPro) ? 'pro' : 'free',
        activatedAt: user.proActivatedAt || user.createdAt,
        currentPeriodEnd: user.currentPeriodEnd,
        lastPaymentDate: user.lastPaymentDate || user.lastPaymentAt,
        stripeCustomerId: user.stripeCustomerId,
        stripeSubscriptionId: user.stripeSubscriptionId
      } : {
        email: userIdentifier,
        userId: userIdentifier,
        planType: 'free',
        activatedAt: null,
        currentPeriodEnd: null,
        lastPaymentDate: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null
      },
      timestamp: new Date().toISOString()
    };

    console.log(`✅ Status check result:`, {
      user: userIdentifier,
      isPro: response.isPro,
      status: response.status
    });

    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error checking payment status:', error);
    console.error('Error details:', error.stack);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: `Failed to check payment status: ${error.message}`,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
}