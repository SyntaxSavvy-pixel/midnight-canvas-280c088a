// Universal billing portal for all users
import Stripe from 'stripe';
import { getUser } from '../lib/database.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log('🏛️ Creating billing portal for:', email);

    // Get user from database
    const user = await getUser(email);

    if (!user || !user.stripeCustomerId) {
      return res.status(404).json({
        error: 'No subscription found for this email',
        message: 'Please ensure you have an active subscription'
      });
    }

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${req.headers.origin || process.env.VERCEL_URL || 'https://tabmangment-extension-g0fzfah7b-kavon-hicks-projects.vercel.app'}/portal-return`,
    });

    console.log('✅ Billing portal created for customer:', user.stripeCustomerId);

    return res.status(200).json({
      url: session.url,
      customerId: user.stripeCustomerId,
      email: email
    });

  } catch (error) {
    console.error('❌ Billing portal error:', error);
    return res.status(500).json({
      error: 'Failed to create billing portal',
      message: error.message
    });
  }
}