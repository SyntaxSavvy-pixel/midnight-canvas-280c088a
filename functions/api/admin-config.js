// Admin Configuration
// SECURITY: This file is server-side only and cannot be modified by clients

const ADMIN_EMAILS = [
  'selfshios@gmail.com'
];

/**
 * Check if an email belongs to an admin user
 * @param {string} email - Email to check
 * @returns {boolean} - True if admin, false otherwise
 */
export function isAdmin(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // Case-insensitive comparison
  const normalizedEmail = email.toLowerCase().trim();
  return ADMIN_EMAILS.some(adminEmail =>
    adminEmail.toLowerCase() === normalizedEmail
  );
}

/**
 * Get admin privileges for a user
 * @param {string} email - User email
 * @returns {object} - Admin privileges
 */
export function getAdminPrivileges(email) {
  if (!isAdmin(email)) {
    return {
      isAdmin: false,
      isPro: false,
      maxDevices: 2,
      planType: 'free'
    };
  }

  return {
    isAdmin: true,
    isPro: true,
    maxDevices: 999, // Unlimited devices for admin
    planType: 'admin',
    features: {
      unlimitedSearches: true,
      unlimitedDevices: true,
      prioritySupport: true,
      allProFeatures: true
    }
  };
}
